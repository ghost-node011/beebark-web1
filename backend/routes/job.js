const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadDocument, uploadToCloudinary } = require('../config/cloudinary');
const { parseResume } = require('../utils/resumeParser');
const { matchCandidatesWithJobLLM, getJobRecommendationsLLM } = require('../utils/llmJobMatcher');
const { analyzeResume } = require('../utils/resumeScorer');
const { evaluateAutoApplyForUser, evaluateAutoApplyForJob } = require('../utils/autoApply');
const path = require('path');
const fs = require('fs');

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'internship', 'contract', 'freelance', 'graduate'];
const WORKPLACES = ['onsite', 'remote', 'hybrid'];
const EXPERIENCE_LEVELS = ['fresher', 'junior', 'mid', 'senior'];
const MAX_SKILLS = 20;

const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pick = (v, allowed) => (allowed.includes(v) ? v : '');

// Accepts an array or a comma-separated string; trims, dedupes (case-insensitive) and caps
const cleanSkills = (v) => {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const s = clip(raw, 40);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
};

const cleanDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Builds the editable fields from a request body. With `partial`, only fields
// present in the body are returned (for PUT).
const jobFieldsFromBody = (body = {}, partial = false) => {
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(body, k);
  const out = {};
  if (has('title')) out.title = clip(body.title, 150);
  if (has('description')) out.description = clip(body.description, 5000);
  if (has('company')) out.company = clip(body.company, 150);
  if (has('location')) out.location = clip(body.location, 150);
  if (has('salary')) out.salary = clip(body.salary, 80);
  if (has('employmentType')) out.employmentType = pick(body.employmentType, EMPLOYMENT_TYPES);
  if (has('workplace')) out.workplace = pick(body.workplace, WORKPLACES);
  if (has('experienceLevel')) out.experienceLevel = pick(body.experienceLevel, EXPERIENCE_LEVELS);
  if (has('skills')) out.skills = cleanSkills(body.skills);
  if (has('applyBy')) out.applyBy = cleanDate(body.applyBy);
  return out;
};

// 'open' is the public name for the stored 'active' state
const normalizeStatus = (v) => (v === 'open' || v === 'active' ? 'active' : v === 'closed' ? 'closed' : null);

// Students can't post; professionals, firms, legacy recruiter/company accounts
// and anyone whose intent is to hire can
const canPostJobs = (user) =>
  !!user && user.role !== 'student' && (
    ['professional', 'firm', 'recruiter', 'company'].includes(user.role) ||
    (Array.isArray(user.intent) && user.intent.includes('hire'))
  );

router.post('/create', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!canPostJobs(user)) {
      return res.status(403).json({ error: 'Only professionals, firms or members hiring can post jobs' });
    }

    const fields = jobFieldsFromBody(req.body);

    if (!fields.title || !fields.description || !fields.company) {
      return res.status(400).json({ error: 'Title, description, and company are required' });
    }

    const job = new Job({
      ...fields,
      postedBy: req.userId
    });

    await job.save();
    await job.populate('postedBy', 'name email profilePic username');

    evaluateAutoApplyForJob(job).catch((e) => console.error('Auto-apply trigger error:', e.message));

    res.status(201).json({ message: 'Job posted successfully', job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job', message: error.message });
  }
});

router.get('/list', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const viewer = await User.findById(req.userId).select('isDemo').lean();
    const filter = { status: { $ne: 'closed' }, isDemo: viewer?.isDemo ? true : { $ne: true } };
    if (req.query.industry) filter.industry = req.query.industry;
    if (req.query.type) filter.employmentType = { $in: String(req.query.type).split(',') };

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name company profilePic username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(filter);

    res.json({ 
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs', message: error.message });
  }
});

// IMPORTANT: /recommended route moved BEFORE /:jobId to avoid route collision
router.get('/recommended', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const allJobs = await Job.find({ status: { $ne: 'closed' }, isDemo: user?.isDemo ? true : { $ne: true } })
      .populate('postedBy', 'name company profilePic username');

    const recommendations = await getJobRecommendationsLLM(user, allJobs);

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations', message: error.message });
  }
});

router.get('/my/posted', auth, async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.userId })
      .populate('applicants.user', 'name email profilePic')
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posted jobs', message: error.message });
  }
});

router.post('/upload-resume', auth, uploadDocument.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file provided' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const fileType = fileExt === '.pdf' ? 'pdf' : fileExt === '.docx' ? 'docx' : null;

    if (!fileType) {
      return res.status(400).json({ error: 'Only PDF and DOCX files are supported' });
    }

    const parsedData = await parseResume(req.file.path, fileType);

    let resumeUrl = `/uploads/${req.file.filename}`;
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const result = await uploadToCloudinary(req.file.path, 'resumes');
      resumeUrl = result.url;
    }

    const review = await analyzeResume(parsedData.rawText);

    const user = await User.findByIdAndUpdate(req.userId, {
      resume: {
        url: resumeUrl,
        fileName: req.file.originalname,
        parsedData: {
          skills: parsedData.skills,
          experience: parsedData.experience,
          education: parsedData.education,
          email: parsedData.email,
          phone: parsedData.phone,
          rawText: parsedData.rawText
        },
        uploadedAt: new Date(),
        ...(review ? {
          score: review.score,
          scoreBreakdown: review.breakdown,
          strengths: review.strengths,
          improvements: review.improvements,
          suggestedRoles: review.suggestedRoles,
          scoredAt: new Date()
        } : {})
      }
    }, { new: true });

    evaluateAutoApplyForUser(user).catch((e) => console.error('Auto-apply trigger error:', e.message));

    res.json({
      message: 'Resume uploaded and parsed successfully',
      parsedData,
      review
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume', message: error.message });
  }
});

router.put('/preferences', auth, async (req, res) => {
  try {
    const { autoApplyEnabled } = req.body;
    if (typeof autoApplyEnabled !== 'boolean') {
      return res.status(400).json({ error: 'autoApplyEnabled must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { 'jobPreferences.autoApplyEnabled': autoApplyEnabled },
      { new: true }
    );

    // Turning it on should catch existing good matches immediately, not just future ones
    if (autoApplyEnabled) {
      evaluateAutoApplyForUser(user).catch((e) => console.error('Auto-apply trigger error:', e.message));
    }

    res.json({ message: 'Preferences updated', jobPreferences: user.jobPreferences });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences', message: error.message });
  }
});

router.get('/my/applications', auth, async (req, res) => {
  try {
    const jobs = await Job.find({
      'applicants.user': req.userId
    })
    .populate('postedBy', 'name company profilePic')
    .sort({ createdAt: -1 });

    const applications = jobs.map(job => {
      const application = job.applicants.find(
        app => app.user.toString() === req.userId.toString()
      );
      return {
        job: {
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          postedBy: job.postedBy
        },
        appliedAt: application.appliedAt,
        status: application.status,
        source: application.source || 'manual'
      };
    });

    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications', message: error.message });
  }
});

// Param routes live below the literal ones (/my/posted, /preferences, ...) so they don't shadow them

// Deep-linkable job detail. Only the poster sees the applicant list; everyone
// else gets a count and whether they've applied.
router.get('/:jobId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await Job.findById(req.params.jobId)
      .populate('postedBy', 'name email profilePic company username')
      .populate('applicants.user', 'name email profilePic bio');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const isOwner = job.postedBy?._id?.toString() === req.userId.toString();
    const data = job.toObject();
    data.applicantCount = job.applicants.length;
    data.hasApplied = job.applicants.some((app) => app.user?._id?.toString() === req.userId.toString());
    if (!isOwner) delete data.applicants;

    res.json({ job: data, isOwner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job', message: error.message });
  }
});

// Owner edits fields and/or opens/closes the job
router.put('/:jobId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.postedBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the job poster can edit this job' });
    }

    const fields = jobFieldsFromBody(req.body, true);
    for (const key of ['title', 'description', 'company']) {
      if (key in fields && !fields[key]) {
        return res.status(400).json({ error: 'Title, description, and company are required' });
      }
    }

    if (req.body.status !== undefined) {
      const status = normalizeStatus(req.body.status);
      if (!status) return res.status(400).json({ error: "Status must be 'open' or 'closed'" });
      fields.status = status;
    }

    const reopened = job.status === 'closed' && fields.status === 'active';
    Object.assign(job, fields);
    await job.save();
    await job.populate('postedBy', 'name email profilePic username');
    await job.populate('applicants.user', 'name email profilePic');

    if (reopened) evaluateAutoApplyForJob(job).catch((e) => console.error('Auto-apply trigger error:', e.message));

    res.json({ message: 'Job updated', job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job', message: error.message });
  }
});

router.delete('/:jobId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.postedBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the job poster can delete this job' });
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job', message: error.message });
  }
});

router.post('/:jobId/apply', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'closed') {
      return res.status(400).json({ error: 'This job is closed to new applications' });
    }

    if (job.postedBy.toString() === req.userId.toString()) {
      return res.status(400).json({ error: "You can't apply to your own job" });
    }

    const alreadyApplied = job.applicants.some(
      app => app.user.toString() === req.userId.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    job.applicants.push({
      user: req.userId
    });

    await job.save();

    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply', message: error.message });
  }
});

router.get('/:jobId/matched-candidates', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await Job.findById(req.params.jobId).populate('postedBy', 'name');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.postedBy._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only job poster can view matched candidates' });
    }

    const applicantIds = job.applicants.map(app => app.user);
    const candidates = await User.find({ _id: { $in: applicantIds } }).select('-password');

    const matchedCandidates = await matchCandidatesWithJobLLM(job, candidates);

    res.json({ matchedCandidates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get matched candidates', message: error.message });
  }
});

module.exports = router;