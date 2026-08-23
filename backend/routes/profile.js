const express = require('express');
const path = require('path');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadDocument, uploadToCloudinary } = require('../config/cloudinary');
const { parseResume } = require('../utils/resumeParser');
const { getDashboardInsights, computeProfileCompletion } = require('../utils/dashboardInsights');
const { analyzeResumeForProfile } = require('../utils/resumeVerifier');

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('connections', 'name email profilePic bio');
    
    // Transform user object to include 'id' (consistent with login response)
    const userResponse = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      intent: user.intent || [],
      industries: user.industries || [],
      industriesOther: user.industriesOther || '',
      location: user.location || '',
      onboardingCompleted: user.onboardingCompleted,
      isVerified: user.isVerified,
      profilePic: user.profilePic,
      bio: user.bio,
      skills: user.skills,
      experience: user.experience,
      connections: user.connections,
      pendingRequests: user.pendingRequests,
      sentRequests: user.sentRequests,
      resume: user.resume ? {
        url: user.resume.url,
        fileName: user.resume.fileName,
        skills: user.resume.parsedData?.skills || [],
        uploadedAt: user.resume.uploadedAt,
        score: user.resume.score,
        scoreBreakdown: user.resume.scoreBreakdown,
        strengths: user.resume.strengths,
        improvements: user.resume.improvements,
        suggestedRoles: user.resume.suggestedRoles,
        scoredAt: user.resume.scoredAt
      } : null,
      jobPreferences: user.jobPreferences
    };
    
    res.json({ user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
  }
});

// IMPORTANT: /insights and /completion must be registered BEFORE /:userId to avoid route collision
router.get('/insights', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const insights = await getDashboardInsights(user);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load insights', message: error.message });
  }
});

// Cheap, no-AI-call endpoint for the persistent completion badge shown on
// every page (TopBar) — /insights is intentionally not used there since it
// also runs a full Gemini analysis on every call.
router.get('/completion', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(computeProfileCompletion(user));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profile completion', message: error.message });
  }
});

router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('connections', 'name email profilePic');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
  }
});

router.put('/update', auth, async (req, res) => {
  try {
    const { name, bio, profilePic, skills, experience, location, intent, industries } = req.body;
    const VALID_INTENT = ['learn', 'network', 'hire', 'get_hired'];
    const VALID_INDUSTRY = ['architecture', 'interiors', 'construction', 'real_estate', 'related'];

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = String(location).slice(0, 120);
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (skills) updateData.skills = skills;
    if (experience) updateData.experience = experience;
    if (Array.isArray(intent)) updateData.intent = intent.filter((i) => VALID_INTENT.includes(i));
    if (Array.isArray(industries)) updateData.industries = industries.filter((i) => VALID_INDUSTRY.includes(i));

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

// Onboarding: save intent / industries / basic profile and mark complete.
// Partial saves are allowed (per-step), completion is set on the final step.
router.put('/onboarding', auth, async (req, res) => {
  try {
    const { role, intent, industries, industriesOther, bio, location, skills, profilePic, complete } = req.body;

    const VALID_ROLES = ['student', 'professional', 'firm'];
    const VALID_INTENT = ['learn', 'network', 'hire', 'get_hired'];
    const VALID_INDUSTRY = ['architecture', 'interiors', 'construction', 'real_estate', 'related'];

    const update = {};
    if (VALID_ROLES.includes(role)) update.role = role;
    if (Array.isArray(intent)) {
      update.intent = intent.filter((i) => VALID_INTENT.includes(i));
    }
    if (Array.isArray(industries)) {
      update.industries = industries.filter((i) => VALID_INDUSTRY.includes(i));
    }
    if (industriesOther !== undefined) update.industriesOther = String(industriesOther).slice(0, 100);
    if (bio !== undefined) update.bio = String(bio).slice(0, 500);
    if (location !== undefined) update.location = String(location).slice(0, 120);
    if (Array.isArray(skills)) update.skills = skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
    if (profilePic !== undefined) update.profilePic = profilePic;
    if (complete === true) update.onboardingCompleted = true;

    const user = await User.findByIdAndUpdate(
      req.userId,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Onboarding saved', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save onboarding', message: error.message });
  }
});

// Import a résumé/CV (PDF/DOCX): parse it, merge extracted skills into the
// profile, and store the file + parsed data so users don't have to refill.
router.post('/import-resume', auth, (req, res) => {
  uploadDocument.single('resume')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No résumé file provided' });

    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileType = ext === '.pdf' ? 'pdf' : 'docx';
      const parsed = await parseResume(req.file.path, fileType);

      const user = await User.findById(req.userId);

      // AI check: is this actually a résumé? Skip (don't block) if Gemini is unavailable.
      const analysis = await analyzeResumeForProfile(parsed.rawText, user.name);
      if (analysis && analysis.isResume === false) {
        return res.status(400).json({
          error: "This doesn't look like a résumé",
          reason: analysis.reason
        });
      }

      // Merge extracted skills into existing (case-insensitive dedupe, cap 30)
      const merged = [...(user.skills || [])];
      const seen = new Set(merged.map((s) => s.toLowerCase()));
      for (const s of parsed.skills || []) {
        if (s && !seen.has(s.toLowerCase())) {
          merged.push(s);
          seen.add(s.toLowerCase());
        }
      }
      user.skills = merged.slice(0, 30);

      // Auto-fill intent/industries from the résumé — only where the user
      // hasn't already made an explicit choice, never overwriting one.
      if (analysis) {
        if ((user.intent || []).length === 0 && analysis.suggestedIntent.length > 0) {
          user.intent = analysis.suggestedIntent;
        }
        if ((user.industries || []).length === 0 && analysis.suggestedIndustries.length > 0) {
          user.industries = analysis.suggestedIndustries;
        }
      }

      // Best-effort: store the original file in Cloudinary (also frees the temp file)
      let resumeUrl = '';
      try {
        const uploaded = await uploadToCloudinary(req.file.path, 'resumes');
        resumeUrl = uploaded.url;
      } catch (_) {
        /* cloudinary not configured — skip storing the file */
      }

      user.resume = {
        url: resumeUrl,
        fileName: req.file.originalname,
        parsedData: {
          skills: parsed.skills || [],
          experience: parsed.experience,
          education: parsed.education || [],
          email: parsed.email,
          phone: parsed.phone,
          rawText: parsed.rawText
        },
        uploadedAt: new Date()
      };
      await user.save();

      res.json({
        message: 'Résumé imported',
        skills: user.skills,
        intent: user.intent,
        industries: user.industries,
        parsed: {
          skills: parsed.skills || [],
          education: parsed.education || [],
          experience: parsed.experience,
          phone: parsed.phone
        },
        nameMismatch: analysis?.nameMismatch || false,
        detectedName: analysis?.detectedName || null,
        currentName: user.name,
        bios: analysis?.bios || []
      });
    } catch (e) {
      console.error('Resume import error:', e);
      res.status(500).json({ error: 'Failed to import résumé', message: e.message });
    }
  });
});

router.get('/search/users', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { bio: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email profilePic bio role')
    .limit(20);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;