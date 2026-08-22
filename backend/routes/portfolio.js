const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PortfolioItem = require('../models/PortfolioItem');
const auth = require('../middleware/auth');
const { analyzePortfolioItem } = require('../utils/portfolioAdvisor');

// Build one-time "starter" suggestions from resume/experience data, without
// saving anything — used only when the user's portfolio is still empty.
const buildStarterSuggestions = (user) => {
  const suggestions = [];
  const experience = user.experience || [];
  experience.forEach((exp) => {
    if (!exp?.title) return;
    suggestions.push({
      title: exp.title,
      description: [exp.company, exp.duration, exp.description].filter(Boolean).join(' — '),
      tags: (user.resume?.parsedData?.skills || user.skills || []).slice(0, 4)
    });
  });
  return suggestions.slice(0, 5);
};

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const items = await PortfolioItem.find({ user: req.userId }).sort({ createdAt: -1 });

    const starterSuggestions = items.length === 0 ? buildStarterSuggestions(user) : [];

    res.json({
      items,
      theme: user.portfolio?.theme || 'grid',
      headline: user.portfolio?.headline || '',
      starterSuggestions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load portfolio', message: error.message });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('name username profilePic bio portfolio');
    if (!user) return res.status(404).json({ error: 'Portfolio not found' });

    const items = await PortfolioItem.find({ user: user._id }).sort({ createdAt: -1 });

    res.json({
      user: { name: user.name, username: user.username, profilePic: user.profilePic, bio: user.bio },
      items,
      theme: user.portfolio?.theme || 'grid',
      headline: user.portfolio?.headline || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load portfolio', message: error.message });
  }
});

router.post('/items', auth, async (req, res) => {
  try {
    const { title, description, images, tags } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const review = await analyzePortfolioItem(title, description);

    const item = new PortfolioItem({
      user: req.userId,
      title: title.trim(),
      description: description || '',
      images: Array.isArray(images) ? images : [],
      tags: Array.isArray(tags) && tags.length > 0 ? tags : (review?.suggestedTags || []),
      aiFeedback: review?.feedback || ''
    });
    await item.save();

    res.status(201).json({ message: 'Added to portfolio', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add portfolio item', message: error.message });
  }
});

router.put('/items/:id', auth, async (req, res) => {
  try {
    const item = await PortfolioItem.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });

    const { title, description, images, tags } = req.body;
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    if (images !== undefined) item.images = images;
    if (tags !== undefined) item.tags = tags;
    await item.save();

    res.json({ message: 'Updated', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio item', message: error.message });
  }
});

router.delete('/items/:id', auth, async (req, res) => {
  try {
    const result = await PortfolioItem.deleteOne({ _id: req.params.id, user: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Portfolio item not found' });

    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove portfolio item', message: error.message });
  }
});

router.put('/theme', auth, async (req, res) => {
  try {
    const { theme, headline } = req.body;
    const validThemes = ['grid', 'timeline', 'minimal', 'magazine'];
    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    const update = {};
    if (theme) update['portfolio.theme'] = theme;
    if (headline !== undefined) update['portfolio.headline'] = headline;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({ message: 'Portfolio settings updated', portfolio: user.portfolio });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio settings', message: error.message });
  }
});

module.exports = router;
