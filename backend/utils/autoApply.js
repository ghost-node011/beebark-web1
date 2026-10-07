const Job = require('../models/Job');
const User = require('../models/User');
const PendingApplication = require('../models/PendingApplication');
const { getJobRecommendationsLLM } = require('./llmJobMatcher');
const { fillForStudent } = require('./screening');
const { sendNeedsAnswersEmail } = require('./email');

// Fixed threshold — no UI control per the "just one toggle" scope. Tune here if needed.
const AUTO_APPLY_MIN_SCORE = 75;
// At most one "your answers are needed" email per person in this window
const EMAIL_GAP_MS = 6 * 60 * 60 * 1000;

const alreadyApplied = (job, userId) => job.applicants.some((app) => app.user.toString() === userId.toString());

/**
 * Apply for a student. Jobs without questions are applied to straight away.
 * With questions, the AI fills what it can (saved answers first); if anything
 * needs the student, the application waits in "Needs your answers" and they're emailed.
 */
const applyFor = async (job, user) => {
  if (alreadyApplied(job, user._id)) return 'already';
  const existing = await PendingApplication.findOne({ user: user._id, job: job._id }).lean();
  if (existing) return 'pending';

  if (!job.questions?.length) {
    job.applicants.push({ user: user._id, source: 'auto' });
    await job.save();
    return 'applied';
  }

  const filled = await fillForStudent(user, job);
  if (!filled.some((f) => f.needsYou)) {
    job.applicants.push({
      user: user._id,
      source: 'auto',
      answers: filled.filter((f) => f.answer).map((f) => ({
        questionId: f.questionId,
        question: job.questions.find((q) => String(q._id) === String(f.questionId))?.text || '',
        answer: f.answer,
        source: f.source || 'ai'
      }))
    });
    await job.save();
    return 'applied';
  }

  await PendingApplication.create({ user: user._id, job: job._id, answers: filled });
  await notifyPending(user);
  return 'pending';
};

// Email the student about everything waiting on them (throttled)
const notifyPending = async (user) => {
  try {
    const recent = await PendingApplication.exists({ user: user._id, emailedAt: { $gte: new Date(Date.now() - EMAIL_GAP_MS) } });
    if (recent || !user.email) return;
    const waiting = await PendingApplication.find({ user: user._id, status: 'needs_answers' }).populate('job', 'title company status').lean();
    const jobs = waiting.filter((p) => p.job && p.job.status !== 'closed').map((p) => p.job);
    if (!jobs.length) return;
    await sendNeedsAnswersEmail(user.email, user.name, jobs);
    await PendingApplication.updateMany({ user: user._id, status: 'needs_answers' }, { $set: { emailedAt: new Date() } });
  } catch (err) {
    console.error('Needs-answers email error:', err.message);
  }
};

// New/updated resume for this user → check them against all active jobs.
const evaluateAutoApplyForUser = async (user) => {
  if (!user?.jobPreferences?.autoApplyEnabled) return;
  try {
    const activeJobs = await Job.find({ status: 'active', postedBy: { $ne: user._id } });
    const scoredJobs = await getJobRecommendationsLLM(user, activeJobs);
    const strongMatches = scoredJobs.filter((j) => j.matchScore >= AUTO_APPLY_MIN_SCORE);
    const fresh = await User.findById(user._id);

    for (const scored of strongMatches) {
      const job = await Job.findById(scored._id);
      if (job && job.status === 'active') await applyFor(job, fresh);
    }
  } catch (error) {
    console.error('Auto-apply (per-user) error:', error.message);
  }
};

// A new job was just posted → check it against every user who has the toggle on.
const evaluateAutoApplyForJob = async (job) => {
  try {
    const candidates = await User.find({ 'jobPreferences.autoApplyEnabled': true, _id: { $ne: job.postedBy } });
    if (!candidates.length) return;

    for (const candidate of candidates) {
      const scoredJobs = await getJobRecommendationsLLM(candidate, [job]);
      const match = scoredJobs.find((j) => String(j._id) === String(job._id));
      if (match && match.matchScore >= AUTO_APPLY_MIN_SCORE) {
        const freshJob = await Job.findById(job._id);
        if (freshJob && freshJob.status === 'active') await applyFor(freshJob, candidate);
      }
    }
  } catch (error) {
    console.error('Auto-apply (per-job) error:', error.message);
  }
};

module.exports = { evaluateAutoApplyForUser, evaluateAutoApplyForJob, applyFor, AUTO_APPLY_MIN_SCORE };
