const Job = require('../models/Job');
const User = require('../models/User');
const { getJobRecommendationsLLM } = require('./llmJobMatcher');

// Fixed threshold — no UI control per the "just one toggle" scope. Tune here if needed.
const AUTO_APPLY_MIN_SCORE = 75;

const applyIfNotAlready = async (job, userId) => {
  const alreadyApplied = job.applicants.some((app) => app.user.toString() === userId.toString());
  if (alreadyApplied) return false;
  job.applicants.push({ user: userId, source: 'auto' });
  await job.save();
  return true;
};

// New/updated resume for this user → check them against all active jobs.
const evaluateAutoApplyForUser = async (user) => {
  if (!user?.jobPreferences?.autoApplyEnabled) return;
  try {
    const activeJobs = await Job.find({ status: 'active' });
    const scoredJobs = await getJobRecommendationsLLM(user, activeJobs);
    const strongMatches = scoredJobs.filter((j) => j.matchScore >= AUTO_APPLY_MIN_SCORE);

    for (const scored of strongMatches) {
      const job = await Job.findById(scored._id);
      if (job && job.status === 'active') await applyIfNotAlready(job, user._id);
    }
  } catch (error) {
    console.error('Auto-apply (per-user) error:', error.message);
  }
};

// A new job was just posted → check it against every user who has the toggle on.
const evaluateAutoApplyForJob = async (job) => {
  try {
    const candidates = await User.find({ 'jobPreferences.autoApplyEnabled': true });
    if (!candidates.length) return;

    for (const candidate of candidates) {
      const scoredJobs = await getJobRecommendationsLLM(candidate, [job]);
      const match = scoredJobs.find((j) => String(j._id) === String(job._id));
      if (match && match.matchScore >= AUTO_APPLY_MIN_SCORE) {
        const freshJob = await Job.findById(job._id);
        if (freshJob && freshJob.status === 'active') await applyIfNotAlready(freshJob, candidate._id);
      }
    }
  } catch (error) {
    console.error('Auto-apply (per-job) error:', error.message);
  }
};

module.exports = { evaluateAutoApplyForUser, evaluateAutoApplyForJob, AUTO_APPLY_MIN_SCORE };
