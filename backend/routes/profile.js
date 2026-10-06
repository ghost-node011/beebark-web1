const express = require('express');
const path = require('path');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadDocument, uploadToCloudinary } = require('../config/cloudinary');
const { parseResume } = require('../utils/resumeParser');
const { getDashboardInsights, computeProfileCompletion } = require('../utils/dashboardInsights');
const { analyzeResumeForProfile } = require('../utils/resumeVerifier');
const { rateProfile } = require('../utils/profileRating');
const PortfolioItem = require('../models/PortfolioItem');
const Post = require('../models/Post');
const { availabilityOptionsFor, PROFICIENCY, EMPLOYMENT_TYPES, SOCIAL_PLATFORMS, yearsOfExperience } = require('../utils/profileOptions');
const Listing = require('../models/Listing');
const Job = require('../models/Job');
const { isBlockedBetween } = require('../utils/userRelations');

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function cleanExperience(list) {
  return list.slice(0, 30).map((e) => {
    const startDate = MONTH.test(e?.startDate) ? e.startDate : '';
    const current = e?.current === true;
    const endDate = !current && MONTH.test(e?.endDate) ? e.endDate : '';
    return {
      title: clip(e?.title, 120),
      company: clip(e?.company, 120),
      duration: clip(e?.duration, 60),
      description: clip(e?.description, 2000),
      employmentType: EMPLOYMENT_TYPES.includes(e?.employmentType) ? e.employmentType : '',
      location: clip(e?.location, 120),
      startDate,
      endDate,
      current
    };
  }).filter((e) => e.title || e.company);
}

function cleanEducation(list) {
  return list.slice(0, 20).map((e) => ({
    school: clip(e?.school, 160),
    degree: clip(e?.degree, 120),
    field: clip(e?.field, 120),
    duration: clip(e?.duration, 60),
    description: clip(e?.description, 2000)
  })).filter((e) => e.school || e.degree);
}

function cleanLanguages(list) {
  const seen = new Set();
  const out = [];
  for (const l of list.slice(0, 20)) {
    const name = clip(l?.name, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, proficiency: PROFICIENCY.includes(l?.proficiency) ? l.proficiency : '' });
  }
  return out;
}

function cleanBusiness(b) {
  let website = clip(b?.website, 200);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  return {
    name: clip(b?.name, 120),
    type: clip(b?.type, 60),
    website,
    founded: clip(b?.founded, 4).replace(/\D/g, ''),
    teamSize: clip(b?.teamSize, 20),
    services: (Array.isArray(b?.services) ? b.services : []).map((s) => clip(s, 60)).filter(Boolean).slice(0, 20),
    address: clip(b?.address, 240),
    about: clip(b?.about, 2000)
  };
}

const withHttps = (v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);
const validUrl = (v) => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes('.'); } catch { return false; } };

function cleanContact(c) {
  const email = clip(c?.email, 120).toLowerCase();
  const website = withHttps(clip(c?.website, 200));
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
    phone: clip(c?.phone, 20).replace(/[^\d+\-\s()]/g, ''),
    whatsapp: clip(c?.whatsapp, 20).replace(/[^\d+]/g, ''),
    website: validUrl(website) ? website : '',
    address: clip(c?.address, 240),
    visibility: ['everyone', 'connections', 'only_me'].includes(c?.visibility) ? c.visibility : 'connections'
  };
}

function cleanSocialLinks(list) {
  const seen = new Set();
  const out = [];
  for (const l of (Array.isArray(list) ? list : []).slice(0, 12)) {
    const platform = SOCIAL_PLATFORMS.includes(l?.platform) ? l.platform : null;
    const url = withHttps(clip(l?.url, 300));
    if (!platform || !validUrl(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ platform, url });
  }
  return out;
}

const PERSON_CARD = 'name username profilePic role careerStage specialization accountStatus';
const toCard = (c) => ({ _id: c._id, name: c.name, username: c.username, profilePic: c.profilePic, role: c.role, careerStage: c.careerStage, specialization: c.specialization || [] });

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
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      pronouns: user.pronouns || '',
      skills: user.skills,
      specialization: user.specialization || [],
      projectTypeFocus: user.projectTypeFocus || [],
      markets: user.markets || [],
      experience: user.experience,
      education: user.education || [],
      careerStage: user.careerStage || '',
      headline: user.headline || '',
      contact: user.contact || {},
      socialLinks: user.socialLinks || [],
      yearsOfExperience: yearsOfExperience(user.experience),
      authProvider: user.authProvider || 'local',
      languages: user.languages || [],
      availability: user.availability || [],
      availabilityOptions: availabilityOptionsFor(user),
      business: user.business || {},
      associatedProfessionals: (user.associatedProfessionals || []).map(String),
      connections: user.connections,
      pendingRequests: user.pendingRequests,
      sentRequests: user.sentRequests,
      analyticsPublic: user.settings?.analyticsPublic || false,
      galleryPublic: user.settings?.galleryPublic ?? true,
      activityPublic: user.settings?.activityPublic || false,
      readReceipts: user.settings?.readReceipts !== false,
      profileViews: user.profileViews || 0,
      resume: user.resume?.url ? {
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
// also runs a full Groq analysis on every call.
router.get('/completion', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(computeProfileCompletion(user));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profile completion', message: error.message });
  }
});

// Full public-facing profile — hero/bio/skills/experience/portfolio preview,
// for viewing OTHER users (own profile still uses /me). Counts a real view
// (excluding self-views) instead of showing a fabricated number.
router.get('/public/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('name username profilePic coverPhoto bio pronouns headline contact socialLinks role careerStage location industries skills specialization projectTypeFocus markets experience education languages availability business associatedProfessionals connections createdAt settings accountStatus blockedUsers')
      .populate('connections', PERSON_CARD)
      .populate('associatedProfessionals', PERSON_CARD);
    if (!user) return res.status(404).json({ error: 'Profile not found' });

    const isOwnProfile = user._id.toString() === req.userId.toString();
    const viewer = isOwnProfile ? null : await User.findById(req.userId).select('connections sentRequests pendingRequests blockedUsers');
    if (!isOwnProfile && (user.accountStatus === 'deactivated' || isBlockedBetween(viewer, user))) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const has = (list) => (list || []).some((id) => String(id) === String(user._id));
    const connectionStatus = isOwnProfile ? 'self'
      : has(viewer?.connections) ? 'connected'
      : has(viewer?.sentRequests) ? 'sent'
      : has(viewer?.pendingRequests) ? 'received' : 'none';
    const active = (list) => (list || []).filter((c) => c && c.accountStatus !== 'deactivated');
    if (!isOwnProfile) {
      await User.updateOne({ _id: user._id }, { $inc: { profileViews: 1 } });
    }
    const fresh = await User.findById(user._id).select('profileViews');

    const analyticsPublic = user.settings?.analyticsPublic || false;
    const galleryPublic = user.settings?.galleryPublic ?? true;
    const activityPublic = user.settings?.activityPublic || false;
    const showAnalytics = isOwnProfile || analyticsPublic;
    const showGallery = isOwnProfile || galleryPublic;
    const showActivity = isOwnProfile || activityPublic;

    const [portfolioItems, portfolioCount, recentPosts, listings, listingCount, openJobs] = await Promise.all([
      showGallery ? PortfolioItem.find({ user: user._id }).sort({ createdAt: -1 }).limit(24) : Promise.resolve([]),
      showGallery ? PortfolioItem.countDocuments({ user: user._id }) : Promise.resolve(0),
      showActivity ? Post.find({ author: user._id }).sort({ createdAt: -1 }).limit(5).select('content mediaUrl likes comments createdAt') : Promise.resolve([]),
      Listing.find({ user: user._id, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).limit(6).lean(),
      Listing.countDocuments({ user: user._id, status: { $ne: 'draft' } }),
      Job.find({ postedBy: user._id, status: { $ne: 'closed' } }).sort({ createdAt: -1 }).limit(6)
        .select('title company location salary employmentType workplace experienceLevel createdAt applicants').lean()
    ]);

    // Contact details follow the owner's visibility choice
    const contactVisible = isOwnProfile
      || user.contact?.visibility === 'everyone'
      || ((user.contact?.visibility || 'connections') === 'connections' && connectionStatus === 'connected');
    const contact = contactVisible ? {
      email: user.contact?.email || '',
      phone: user.contact?.phone || '',
      whatsapp: user.contact?.whatsapp || '',
      website: user.contact?.website || '',
      address: user.contact?.address || '',
      visibility: user.contact?.visibility || 'connections'
    } : null;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        pronouns: user.pronouns || '',
        role: user.role,
        location: user.location,
        industries: user.industries || [],
        skills: user.skills || [],
        specialization: user.specialization || [],
        projectTypeFocus: user.projectTypeFocus || [],
        markets: user.markets || [],
        experience: user.experience || [],
        education: user.education || [],
        careerStage: user.careerStage || '',
        headline: user.headline || '',
        socialLinks: user.socialLinks || [],
        yearsOfExperience: yearsOfExperience(user.experience),
        languages: user.languages || [],
        availability: user.availability || [],
        business: user.business?.name ? user.business : null,
        connectionCount: active(user.connections).length,
        memberSince: user.createdAt,
        analyticsPublic,
        galleryPublic,
        activityPublic,
        // Omitted entirely (not just hidden client-side) unless the owner
        // has opted in, or the viewer is the owner.
        profileViews: showAnalytics ? fresh.profileViews : undefined
      },
      // Chosen by the owner when set, otherwise their first connections
      associatedProfessionals: (user.associatedProfessionals
        ? active(user.associatedProfessionals)
        : active(user.connections).slice(0, 8)).map(toCard),
      associatedChosen: Array.isArray(user.associatedProfessionals),
      connectionStatus,
      contact,
      // Tells the viewer why contact info is hidden
      contactHiddenReason: contact ? null : (user.contact?.visibility === 'only_me' ? 'private' : 'connect'),
      listings,
      listingCount,
      openJobs: openJobs.map(({ applicants, ...j }) => ({ ...j, applicantCount: (applicants || []).length })),
      portfolioPreview: portfolioItems,
      portfolioCount,
      recentActivity: recentPosts.map((p) => ({
        _id: p._id,
        content: p.content,
        mediaUrl: p.mediaUrl,
        likeCount: p.likes?.length || 0,
        commentCount: p.comments?.length || 0,
        createdAt: p.createdAt
      })),
      isOwnProfile
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profile', message: error.message });
  }
});

// Interactive AI rating of a profile, shown to the viewer (not the owner) —
// "Hey {viewer}, I think this is 8/10...".
router.get('/public/:username/rating', auth, async (req, res) => {
  try {
    const [profileUser, viewer] = await Promise.all([
      User.findOne({ username: req.params.username }),
      User.findById(req.userId)
    ]);
    if (!profileUser) return res.status(404).json({ error: 'Profile not found' });

    const portfolioCount = await PortfolioItem.countDocuments({ user: profileUser._id });
    const rating = await rateProfile(profileUser, viewer?.name?.split(' ')[0] || 'there', portfolioCount);
    if (!rating) {
      return res.status(503).json({ error: 'Rating is unavailable right now' });
    }
    res.json(rating);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate rating', message: error.message });
  }
});

// Own recent activity (posts) — always available for the owner's own
// profile view regardless of the activityPublic setting, which only
// controls whether OTHER viewers see it (via /public/:username below).
router.get('/activity', auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('content mediaUrl likes comments createdAt');
    res.json({
      posts: posts.map((p) => ({
        _id: p._id,
        content: p.content,
        mediaUrl: p.mediaUrl,
        likeCount: p.likes?.length || 0,
        commentCount: p.comments?.length || 0,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load activity', message: error.message });
  }
});

// Autocomplete for profile forms: ?field=school|degree|field|company|title|language|skill&q=
// Suggests what other members already use (so spellings stay consistent),
// topped up with common values.
const COMMON = {
  degree: ['B.Arch', 'M.Arch', 'B.Des', 'M.Des', 'B.Tech', 'M.Tech', 'B.E.', 'Diploma', 'B.Planning', 'M.Planning', 'MBA', 'B.Sc', 'M.Sc', 'BBA', 'Ph.D'],
  field: ['Architecture', 'Interior Design', 'Civil Engineering', 'Urban Planning', 'Landscape Architecture', 'Construction Management', 'Real Estate', 'Structural Engineering', 'Product Design', 'Building Services'],
  title: ['Architect', 'Junior Architect', 'Senior Architect', 'Principal Architect', 'Interior Designer', 'Project Manager', 'Site Engineer', 'Civil Engineer', 'Structural Engineer', 'Quantity Surveyor', 'Real Estate Agent', 'Sales Manager', 'Design Intern', 'Architecture Intern', 'BIM Modeler', '3D Visualizer', 'Draftsman', 'Contractor', 'Urban Planner', 'Landscape Architect'],
  language: ['English', 'Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati', 'Urdu', 'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Konkani', 'Sanskrit', 'Arabic', 'French', 'German', 'Spanish', 'Japanese', 'Mandarin'],
  skill: ['AutoCAD', 'Revit', 'SketchUp', 'Rhino', 'Grasshopper', 'Lumion', 'V-Ray', 'Enscape', '3ds Max', 'Photoshop', 'InDesign', 'Illustrator', 'BIM', 'ArchiCAD', 'STAAD Pro', 'ETABS', 'Primavera', 'MS Project', 'Estimation', 'Site Supervision', 'Space Planning', 'Working Drawings', 'Sustainable Design', 'Sales', 'Negotiation']
};
const SUGGEST_PATH = { school: 'education.school', degree: 'education.degree', field: 'education.field', company: 'experience.company', title: 'experience.title', language: 'languages.name', skill: 'skills' };

router.get('/suggest', auth, async (req, res) => {
  try {
    const field = String(req.query.field || '');
    const path = SUGGEST_PATH[field];
    if (!path) return res.status(400).json({ error: 'Unknown field' });
    const q = String(req.query.q || '').trim().slice(0, 60);
    const re = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const rows = await User.aggregate([
      ...(path.includes('.') ? [{ $unwind: `$${path.split('.')[0]}` }] : [{ $unwind: '$skills' }]),
      { $project: { v: `$${path}` } },
      { $match: { v: re ? re : { $type: 'string', $ne: '' } } },
      { $group: { _id: { $toLower: { $trim: { input: '$v' } } }, v: { $first: { $trim: { input: '$v' } } }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 8 }
    ]);
    const out = rows.map((r) => r.v).filter(Boolean);
    const seen = new Set(out.map((v) => v.toLowerCase()));
    for (const v of COMMON[field] || []) {
      if (out.length >= 10) break;
      if ((!re || re.test(v)) && !seen.has(v.toLowerCase())) { out.push(v); seen.add(v.toLowerCase()); }
    }
    // Prefer values that start with what was typed
    const lower = q.toLowerCase();
    out.sort((a, b) => Number(b.toLowerCase().startsWith(lower)) - Number(a.toLowerCase().startsWith(lower)));
    res.json({ suggestions: out.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load suggestions', message: error.message });
  }
});

// Remove the uploaded résumé (the profile's skills stay)
router.delete('/resume', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('resume');
    if (!user?.resume?.url) return res.status(404).json({ error: 'No résumé to remove' });
    await User.updateOne({ _id: req.userId }, { $unset: { resume: 1 } });
    res.json({ message: 'Résumé removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove résumé', message: error.message });
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
    const { name, bio, pronouns, profilePic, coverPhoto, skills, experience, education, location, intent, industries, specialization, projectTypeFocus, markets, analyticsPublic, galleryPublic, activityPublic, readReceipts, careerStage, headline, contact, socialLinks, languages, availability, business, associatedProfessionals } = req.body;
    const VALID_INTENT = ['learn', 'network', 'hire', 'get_hired'];
    const VALID_INDUSTRY = ['architecture', 'interiors', 'construction', 'real_estate', 'related'];
    const asTagList = (arr) => arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (pronouns !== undefined) updateData.pronouns = String(pronouns).slice(0, 30);
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto;
    if (location !== undefined) updateData.location = String(location).slice(0, 120);
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (Array.isArray(skills)) updateData.skills = asTagList(skills).slice(0, 30);
    if (Array.isArray(experience)) updateData.experience = cleanExperience(experience);
    if (Array.isArray(education)) updateData.education = cleanEducation(education);
    if (Array.isArray(languages)) updateData.languages = cleanLanguages(languages);
    if (headline !== undefined) updateData.headline = clip(headline, 140);
    if (contact && typeof contact === 'object') updateData.contact = cleanContact(contact);
    if (Array.isArray(socialLinks)) updateData.socialLinks = cleanSocialLinks(socialLinks);
    if (business && typeof business === 'object') updateData.business = cleanBusiness(business);
    if (Array.isArray(intent)) updateData.intent = intent.filter((i) => VALID_INTENT.includes(i));
    if (Array.isArray(industries)) updateData.industries = industries.filter((i) => VALID_INDUSTRY.includes(i));
    if (Array.isArray(specialization)) updateData.specialization = asTagList(specialization);
    if (Array.isArray(projectTypeFocus)) updateData.projectTypeFocus = asTagList(projectTypeFocus);
    if (Array.isArray(markets)) updateData.markets = asTagList(markets);
    const VALID_STAGE = ['studying', 'career_prep', 'fresher', 'intern', 'employed', 'freelance', 'business_owner', ''];
    if (careerStage !== undefined && VALID_STAGE.includes(careerStage)) updateData.careerStage = careerStage;
    if (typeof analyticsPublic === 'boolean') updateData['settings.analyticsPublic'] = analyticsPublic;
    if (typeof galleryPublic === 'boolean') updateData['settings.galleryPublic'] = galleryPublic;
    if (typeof activityPublic === 'boolean') updateData['settings.activityPublic'] = activityPublic;
    if (typeof readReceipts === 'boolean') updateData['settings.readReceipts'] = readReceipts;

    if (Array.isArray(availability) || Array.isArray(associatedProfessionals)) {
      const me = await User.findById(req.userId).select('role careerStage connections');
      if (Array.isArray(availability)) {
        const allowed = availabilityOptionsFor({ role: me.role, careerStage: updateData.careerStage ?? me.careerStage });
        updateData.availability = [...new Set(availability)].filter((a) => allowed.includes(a));
      }
      if (Array.isArray(associatedProfessionals)) {
        // Only people you're connected to can be shown as associated
        const mine = new Set((me.connections || []).map(String));
        updateData.associatedProfessionals = [...new Set(associatedProfessionals.map(String))].filter((id) => mine.has(id)).slice(0, 24);
      }
    }

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
    const { role, intent, industries, industriesOther, bio, location, skills, profilePic, complete, name } = req.body;

    const VALID_ROLES = ['student', 'professional'];
    const VALID_INTENT = ['learn', 'network', 'hire', 'get_hired'];
    const VALID_INDUSTRY = ['architecture', 'interiors', 'construction', 'real_estate', 'related'];

    const update = {};
    if (VALID_ROLES.includes(role)) update.role = role;
    if (typeof name === 'string' && name.trim()) update.name = name.trim().slice(0, 100);
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

      // AI check: is this actually a résumé? Skip (don't block) if Groq is unavailable.
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
        detectedLocation: analysis?.detectedLocation || null,
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