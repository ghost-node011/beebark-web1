const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');
const PortfolioItem = require('../models/PortfolioItem');
const { computeProfileCompletion } = require('../utils/dashboardInsights');
const { getConnectionSuggestions } = require('../utils/recommendationEngine');

const router = express.Router();

const INDUSTRIES = ['architecture', 'interiors', 'construction', 'real_estate'];
const ENTRY_TYPES = ['internship', 'graduate'];

const jobCard = (job) => ({
  id: job._id,
  title: job.title,
  company: job.company,
  location: job.location,
  employmentType: job.employmentType,
  tags: job.tags || [],
  imageUrl: job.imageUrl || '',
  description: job.description
});

const personCard = (u) => {
  const current = (u.experience || [])[0] || {};
  return {
    id: u._id,
    name: u.name,
    username: u.username,
    profilePic: u.profilePic || '',
    headline: current.title || (u.role === 'student' ? 'Student' : 'Professional'),
    company: current.company || '',
    location: u.location || '',
    tags: (u.skills || []).slice(0, 3),
    mutualConnectionsCount: u.mutualConnectionsCount || 0,
    isFollowing: !!u.isFollowing,
    followerCount: u.followerCount || 0
  };
};

// Everything the dashboard needs, tailored to the user's industry and stage, in one call
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const industry = INDUSTRIES.find((i) => (user.industries || []).includes(i)) || 'general';
    const audience = user.role === 'student' ? 'student' : 'professional';
    const demoFilter = user.isDemo ? true : { $ne: true };

    const jobFilter = { status: 'active', isDemo: demoFilter };
    if (industry !== 'general') jobFilter.industry = industry;

    const [jobs, featuredProject, suggestions, portfolioCount] = await Promise.all([
      Job.find(jobFilter).sort({ createdAt: -1 }).limit(12).lean(),
      PortfolioItem.findOne({ user: user._id }).sort({ createdAt: -1 }).lean(),
      getConnectionSuggestions(user._id, 6),
      PortfolioItem.countDocuments({ user: user._id })
    ]);

    // Students see internships and graduate roles first; professionals see the rest first
    const isEntry = (j) => ENTRY_TYPES.includes(j.employmentType);
    const ordered = audience === 'student'
      ? [...jobs.filter(isEntry), ...jobs.filter((j) => !isEntry(j))]
      : [...jobs.filter((j) => !isEntry(j)), ...jobs.filter(isEntry)];

    res.json({
      industry,
      audience,
      careerStage: user.careerStage || '',
      completion: computeProfileCompletion(user),
      featuredJob: ordered[0] ? jobCard(ordered[0]) : null,
      jobs: ordered.slice(audience === 'student' ? 1 : 0, audience === 'student' ? 4 : 3).map(jobCard),
      featuredProject: featuredProject
        ? {
            id: featuredProject._id,
            title: featuredProject.title,
            description: featuredProject.description,
            category: featuredProject.category,
            location: featuredProject.location || '',
            projectStatus: featuredProject.projectStatus || '',
            images: featuredProject.images || [],
            tags: featuredProject.tags || []
          }
        : null,
      connections: suggestions.slice(0, 3).map(personCard),
      stats: { connectionCount: (user.connections || []).length, portfolioCount }
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({ error: "Couldn't load your dashboard. Please refresh." });
  }
});

module.exports = router;
