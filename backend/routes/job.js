const express = require('express');
const router = express.Router();
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

router.post('/create', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    // Firms, anyone whose intent is to hire, and legacy recruiters can post jobs
    const canPost =
      user.role === 'firm' ||
      user.role === 'recruiter' ||
      user.role === 'company' ||
      (Array.isArray(user.intent) && user.intent.includes('hire'));

    if (!canPost) {
      return res.status(403).json({ error: 'Only firms or members hiring can post jobs' });
    }

    const { title, description, company, location, salary } = req.body;

    if (!title || !description || !company) {
      return res.status(400).json({ error: 'Title, description, and company are required' });
    }

    const job = new Job({
      title,
      description,
      company,
      location,
      salary,
      postedBy: req.userId
    });

    await job.save();
    await job.populate('postedBy', 'name email profilePic');

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
    const filter = { status: 'active', isDemo: viewer?.isDemo ? true : { $ne: true } };
    if (req.query.industry) filter.industry = req.query.industry;
    if (req.query.type) filter.employmentType = { $in: String(req.query.type).split(',') };

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name company profilePic')
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
    const allJobs = await Job.find({ status: 'active', isDemo: user?.isDemo ? true : { $ne: true } })
      .populate('postedBy', 'name company profilePic');

    const recommendations = await getJobRecommendationsLLM(user, allJobs);

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations', message: error.message });
  }
});

router.get('/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate('postedBy', 'name email profilePic company')
      .populate('applicants.user', 'name email profilePic bio');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job', message: error.message });
  }
});

router.post('/:jobId/apply', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'active') {
      return res.status(400).json({ error: 'Job is no longer active' });
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

router.get('/:jobId/matched-candidates', auth, async (req, res) => {
  try {
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

module.exports = router;