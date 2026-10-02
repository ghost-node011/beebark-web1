const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PortfolioItem = require('../models/PortfolioItem');
const auth = require('../middleware/auth');
const { analyzePortfolioItem, suggestPortfolioStyle } = require('../utils/portfolioAdvisor');
const { draftPortfolioFromImages } = require('../utils/portfolioAutoGenerator');

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

const LOOK_TEXT_LIMITS = { tagline: 160, aboutText: 1200, closingLine: 120, contactInfo: 160 };
const lookOf = (user) => {
  const p = user.portfolio || {};
  return {
    background: p.background || '',
    textColor: p.textColor || '',
    bodyFont: p.bodyFont || '',
    tagline: p.tagline || '',
    aboutText: p.aboutText || '',
    closingLine: p.closingLine || '',
    contactInfo: p.contactInfo || ''
  };
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
      font: user.portfolio?.font || 'playfair',
      accentColor: user.portfolio?.accentColor || '#D4F547',
      look: lookOf(user),
      starterSuggestions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load portfolio', message: error.message });
  }
});

// AI-suggested style based on the user's actual portfolio content — the user
// can accept it as-is or keep adjusting manually afterward.
// IMPORTANT: must be registered BEFORE /:username to avoid route collision.
router.get('/style-suggestion', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const items = await PortfolioItem.find({ user: req.userId }).sort({ createdAt: -1 });
    const suggestion = await suggestPortfolioStyle(items, user.role);
    if (suggestion?.error) {
      return res.status(503).json({ error: 'Style suggestions are unavailable right now', detail: suggestion.error });
    }
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate style suggestion', message: error.message });
  }
});

// AI-drafted portfolio entries from freshly-uploaded work photos (already
// uploaded via /api/upload/multiple) — the user reviews/edits each draft
// before anything is saved. IMPORTANT: must be registered BEFORE /:username.
router.post('/auto-generate', auth, async (req, res) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'At least one image URL is required' });
    }
    const user = await User.findById(req.userId);
    const drafts = await draftPortfolioFromImages(images.slice(0, 10), user);
    res.json({ drafts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate portfolio drafts', message: error.message });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('name username profilePic bio portfolio role skills experience location connections')
      .populate('connections', '_id');
    if (!user) return res.status(404).json({ error: 'Portfolio not found' });

    const items = await PortfolioItem.find({ user: user._id }).sort({ createdAt: -1 });

    res.json({
      user: {
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
        bio: user.bio,
        role: user.role,
        location: user.location,
        skills: user.skills || [],
        experience: user.experience || [],
        connectionCount: user.connections?.length || 0
      },
      items,
      theme: user.portfolio?.theme || 'grid',
      headline: user.portfolio?.headline || '',
      font: user.portfolio?.font || 'playfair',
      accentColor: user.portfolio?.accentColor || '#D4F547',
      look: lookOf(user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load portfolio', message: error.message });
  }
});

router.post('/items', auth, async (req, res) => {
  try {
    const { title, description, images, tags, category, location, projectStatus } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // AI review of new items is switched off for now (no AI in the portfolio maker)
    // const review = await analyzePortfolioItem(title, description);
    const review = null;

    const item = new PortfolioItem({
      user: req.userId,
      title: title.trim(),
      description: description || '',
      images: Array.isArray(images) ? images : [],
      tags: Array.isArray(tags) && tags.length > 0 ? tags : (review?.suggestedTags || []),
      category: category || '',
      location: location || '',
      projectStatus: projectStatus || '',
      aiFeedback: review?.feedback || ''
    });
    await item.save();

    res.status(201).json({ message: 'Added to portfolio', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add portfolio item', message: error.message });
  }
});

// Save several accepted auto-generate drafts in one call — skips the
// per-item AI feedback pass since the drafts already came from AI.
router.post('/items/bulk', auth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    const docs = items
      .filter((i) => i?.title?.trim())
      .slice(0, 10)
      .map((i) => ({
        user: req.userId,
        title: i.title.trim(),
        description: i.description || '',
        images: Array.isArray(i.images) ? i.images : [],
        tags: Array.isArray(i.tags) ? i.tags : [],
        category: i.category || ''
      }));
    const saved = await PortfolioItem.insertMany(docs);
    res.status(201).json({ message: `Added ${saved.length} to your portfolio`, items: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save portfolio items', message: error.message });
  }
});

router.put('/items/:id', auth, async (req, res) => {
  try {
    const item = await PortfolioItem.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });

    const { title, description, images, tags, category, location, projectStatus } = req.body;
    if (title !== undefined) item.title = title;
    if (location !== undefined) item.location = location;
    if (projectStatus !== undefined) item.projectStatus = projectStatus;
    if (description !== undefined) item.description = description;
    if (images !== undefined) item.images = images;
    if (tags !== undefined) item.tags = tags;
    if (category !== undefined) item.category = category;
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
    const { theme, headline, font, accentColor, background, textColor, bodyFont } = req.body;
    // Only Editorial and Studio are offered; earlier layouts remain valid for existing data
    const validThemes = ['editorial', 'studio', 'grid', 'timeline', 'minimal', 'magazine', 'stack', 'mosaic', 'index', 'brutalist'];
    const validFonts = ['playfair', 'space', 'mono', 'classic', 'inter', 'dmserif', 'cormorant', 'bodoni', 'fraunces', 'archivo', 'bigshoulders', 'oswald', 'bebas', 'plexmono', 'plexsans', 'poppins', 'manrope', 'syne', 'unbounded', 'spectral'];
    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    if (font && !validFonts.includes(font)) {
      return res.status(400).json({ error: 'Invalid font' });
    }
    if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      return res.status(400).json({ error: 'accentColor must be a hex color like #RRGGBB' });
    }

    // Colours may be cleared ('') to fall back to the template default
    for (const [key, value] of Object.entries({ background, textColor })) {
      if (value !== undefined && value !== '' && !/^#[0-9a-fA-F]{6}$/.test(value)) {
        return res.status(400).json({ error: `${key} must be a hex color like #RRGGBB` });
      }
    }
    if (bodyFont !== undefined && bodyFont !== '' && !validFonts.includes(bodyFont)) {
      return res.status(400).json({ error: 'Invalid text font' });
    }
    for (const [key, max] of Object.entries(LOOK_TEXT_LIMITS)) {
      const value = req.body[key];
      if (value !== undefined && (typeof value !== 'string' || value.length > max)) {
        return res.status(400).json({ error: `${key} must be text of up to ${max} characters` });
      }
    }

    const update = {};
    for (const key of ['background', 'textColor', 'bodyFont', ...Object.keys(LOOK_TEXT_LIMITS)]) {
      if (req.body[key] !== undefined) update[`portfolio.${key}`] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
    }
    if (theme) update['portfolio.theme'] = theme;
    if (headline !== undefined) update['portfolio.headline'] = headline;
    if (font) update['portfolio.font'] = font;
    if (accentColor) update['portfolio.accentColor'] = accentColor;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({ message: 'Portfolio settings updated', portfolio: user.portfolio, look: lookOf(user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio settings', message: error.message });
  }
});

module.exports = router;
