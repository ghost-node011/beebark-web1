const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const PortfolioItem = require('../models/PortfolioItem');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const { isBlockedBetween } = require('../utils/userRelations');
const { sendQuoteRequestEmail } = require('../utils/email');
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

const ITEM_ORDER = { order: 1, createdAt: -1 };

// --- Extra item fields (captions, story, product details) -------------------
const PRICE_UNITS = ['piece', 'sqft', 'sqm', 'rft', 'kg', 'bag', 'ton', 'set', ''];
const AVAILABILITY = ['in_stock', 'made_to_order', 'out_of_stock', ''];
const STORY_KEYS = ['summary', 'contribution', 'process', 'outcome'];
const text = (value, max) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '');
const textList = (value, maxItems, maxLen) => (Array.isArray(value) ? value : [])
  .map((v) => text(v, maxLen)).filter(Boolean).slice(0, maxItems);
const price = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 100) / 100, 1e10) : null;
};
const isFileUrl = (url) => /^https:\/\/\S+$/i.test(url) || /^\/uploads\/[\w.\-]+$/.test(url);
// Captions follow the photos: never more captions than photos, trailing blanks dropped
const captionsFor = (captions, images) => {
  const list = (Array.isArray(captions) ? captions : []).slice(0, (images || []).length).map((c) => text(c, 200));
  while (list.length && !list[list.length - 1]) list.pop();
  return list;
};

// Picks the extra fields present in `body`, validated and clamped.
// Returns { fields } or { error }. `images` is the item's final photo list.
const extraFields = (body, images) => {
  const fields = {};
  if (body.kind !== undefined) fields.kind = body.kind === 'product' ? 'product' : 'project';
  if (body.captions !== undefined) fields.captions = captionsFor(body.captions, images);
  if (body.section !== undefined) fields.section = text(body.section, 80);
  if (body.story !== undefined) {
    const story = body.story && typeof body.story === 'object' ? body.story : {};
    fields.story = Object.fromEntries(STORY_KEYS.map((k) => [k, text(story[k], 2000)]));
  }
  if (body.sku !== undefined) fields.sku = text(body.sku, 60);
  if (body.specs !== undefined) {
    fields.specs = (Array.isArray(body.specs) ? body.specs : [])
      .map((s) => ({ label: text(s?.label, 80), value: text(s?.value, 80) }))
      .filter((s) => s.label || s.value)
      .slice(0, 20);
  }
  if (body.finishes !== undefined) fields.finishes = textList(body.finishes, 30, 60);
  if (body.sizes !== undefined) fields.sizes = textList(body.sizes, 30, 60);
  if (body.priceFrom !== undefined) fields.priceFrom = price(body.priceFrom);
  if (body.priceTo !== undefined) fields.priceTo = price(body.priceTo);
  if (fields.priceFrom != null && fields.priceTo != null && fields.priceTo < fields.priceFrom) {
    [fields.priceFrom, fields.priceTo] = [fields.priceTo, fields.priceFrom];
  }
  if (body.priceUnit !== undefined) {
    if (!PRICE_UNITS.includes(body.priceUnit || '')) return { error: 'Invalid price unit' };
    fields.priceUnit = body.priceUnit || '';
  }
  if (body.moq !== undefined) fields.moq = text(body.moq, 60);
  if (body.leadTime !== undefined) fields.leadTime = text(body.leadTime, 60);
  if (body.availability !== undefined) {
    if (!AVAILABILITY.includes(body.availability || '')) return { error: 'Invalid availability' };
    fields.availability = body.availability || '';
  }
  if (body.brochureUrl !== undefined) {
    const url = text(body.brochureUrl, 1000);
    if (url && !isFileUrl(url)) return { error: 'Brochure must be an uploaded file link' };
    fields.brochureUrl = url;
  }
  return { fields };
};
const imageList = (images) => (Array.isArray(images) ? images.filter((u) => typeof u === 'string' && u) : []);

const LOOK_TEXT_LIMITS = { tagline: 160, aboutText: 1200, closingLine: 120, contactInfo: 160 };
const settingsOf = (user) => ({
  mode: user.portfolio?.mode === 'catalogue' ? 'catalogue' : 'portfolio',
  showCv: user.portfolio?.showCv !== false,
  showContact: user.portfolio?.showContact !== false
});
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
    const items = await PortfolioItem.find({ user: req.userId }).sort(ITEM_ORDER);

    const starterSuggestions = items.length === 0 ? buildStarterSuggestions(user) : [];

    res.json({
      items,
      theme: user.portfolio?.theme || 'grid',
      headline: user.portfolio?.headline || '',
      font: user.portfolio?.font || 'playfair',
      accentColor: user.portfolio?.accentColor || '#D4F547',
      look: lookOf(user),
      ...settingsOf(user),
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
    const items = await PortfolioItem.find({ user: req.userId }).sort(ITEM_ORDER);
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

// Request a quote for a catalogue product. Buyers usually aren't connected to the
// supplier, so this reaches them as a notification and an email instead of a chat.
router.post('/:username/enquiry', auth, async (req, res) => {
  try {
    const owner = await User.findOne({ username: req.params.username })
      .select('name email username blockedUsers accountStatus');
    if (!owner || owner.accountStatus === 'deactivated') return res.status(404).json({ error: 'Not found' });
    if (String(owner._id) === String(req.userId)) return res.status(400).json({ error: 'This is your own catalogue' });
    const buyer = await User.findById(req.userId).select('name username email blockedUsers');
    if (!buyer || isBlockedBetween(buyer, owner)) return res.status(403).json({ error: "You can't contact this business" });

    const message = text(req.body.message, 2000);
    const quantity = text(req.body.quantity, 120);
    let item = null;
    if (req.body.itemId && mongoose.isValidObjectId(req.body.itemId)) {
      item = await PortfolioItem.findOne({ _id: req.body.itemId, user: owner._id }).select('title sku').lean();
    }
    if (!message && !item) return res.status(400).json({ error: 'Add a message' });

    // At most 5 requests a day to the same business
    const recent = await Notification.countDocuments({ recipient: owner._id, actor: buyer._id, type: 'quote_request', createdAt: { $gt: new Date(Date.now() - 86400000) } });
    if (recent >= 5) return res.status(429).json({ error: "You've sent several requests today. Please wait for a reply." });

    const product = item ? `${item.title}${item.sku ? ` (SKU ${item.sku})` : ''}` : '';
    await Notification.create({ recipient: owner._id, actor: buyer._id, type: 'quote_request', meta: { itemTitle: product, quantity, message: message.slice(0, 300) } });
    if (owner.email) {
      sendQuoteRequestEmail(owner.email, owner.name, { buyer: { name: buyer.name, username: buyer.username }, product, quantity, message, replyTo: buyer.email })
        .catch((e) => console.error('Quote request email failed:', e.message));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Could not send your request' });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('name username profilePic bio portfolio role skills experience education languages business headline contact location connections')
      .populate('connections', '_id');
    if (!user) return res.status(404).json({ error: 'Portfolio not found' });

    // Optional sign-in: lets a signed-in visitor see which projects they've saved
    let viewerId = null;
    try {
      const token = (req.get('Authorization') || '').replace('Bearer ', '');
      if (token) viewerId = String(require('jsonwebtoken').verify(token, process.env.JWT_SECRET).userId);
    } catch { /* anonymous visitor */ }
    const items = (await PortfolioItem.find({ user: user._id }).sort(ITEM_ORDER).lean()).map(({ savedBy, ...i }) => ({
      ...i, saveCount: (savedBy || []).length, isSaved: Boolean(viewerId && (savedBy || []).some((id) => String(id) === viewerId))
    }));

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
        bio: user.bio,
        role: user.role,
        location: user.location,
        skills: user.skills || [],
        experience: user.experience || [],
        headline: user.headline || '',
        education: user.education || [],
        languages: user.languages || [],
        business: user.business || {},
        // Contact details only when the owner shows them to everyone
        ...(user.contact?.visibility === 'everyone' ? {
          contact: {
            email: user.contact.email || '',
            phone: user.contact.phone || '',
            whatsapp: user.contact.whatsapp || '',
            website: user.contact.website || '',
            address: user.contact.address || ''
          }
        } : {}),
        connectionCount: user.connections?.length || 0
      },
      items,
      theme: user.portfolio?.theme || 'grid',
      headline: user.portfolio?.headline || '',
      font: user.portfolio?.font || 'playfair',
      accentColor: user.portfolio?.accentColor || '#D4F547',
      look: lookOf(user),
      ...settingsOf(user)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load portfolio', message: error.message });
  }
});

router.post('/items', auth, async (req, res) => {
  try {
    const { title, description, images, tags, category, location, projectStatus, role, year } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // AI review of new items is switched off for now (no AI in the portfolio maker)
    // const review = await analyzePortfolioItem(title, description);
    const review = null;

    // New work goes to the top of the owner's chosen order
    const first = await PortfolioItem.findOne({ user: req.userId }).sort(ITEM_ORDER).select('order');
    const photos = imageList(images);
    const extra = extraFields(req.body, photos);
    if (extra.error) return res.status(400).json({ error: extra.error });

    const item = new PortfolioItem({
      ...extra.fields,
      user: req.userId,
      order: first ? first.order - 1 : 0,
      title: title.trim(),
      description: description || '',
      images: photos,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : (review?.suggestedTags || []),
      category: category || '',
      location: location || '',
      projectStatus: projectStatus || '',
      role: String(role || '').trim().slice(0, 80),
      year: /^\d{4}$/.test(String(year || '')) ? String(year) : '',
      aiFeedback: review?.feedback || ''
    });
    await item.save();

    res.status(201).json({ message: 'Added to portfolio', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add portfolio item', message: error.message });
  }
});

// Save the owner's project order: ids listed top to bottom
// Save (bookmark) someone's project, or remove the save: { saved: true|false }
router.post('/items/:id/save', auth, async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Project not found' });
    const item = await PortfolioItem.findById(req.params.id).select('user savedBy');
    if (!item) return res.status(404).json({ error: 'Project not found' });
    if (String(item.user) === String(req.userId)) return res.status(400).json({ error: 'You can\'t save your own project' });
    const save = req.body?.saved !== false;
    await PortfolioItem.updateOne({ _id: item._id }, save ? { $addToSet: { savedBy: req.userId } } : { $pull: { savedBy: req.userId } });
    res.json({ saved: save });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save project', message: error.message });
  }
});

router.put('/order', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ error: 'ids must be a list of project ids' });
    }
    const owned = await PortfolioItem.countDocuments({ user: req.userId, _id: { $in: ids } });
    if (owned !== new Set(ids.map(String)).size) {
      return res.status(400).json({ error: 'Some projects were not found' });
    }
    await PortfolioItem.bulkWrite(ids.map((id, index) => ({
      updateOne: { filter: { _id: id, user: req.userId }, update: { $set: { order: index } } }
    })));
    res.json({ message: 'Order saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save order', message: error.message });
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
    const valid = items.filter((i) => typeof i?.title === 'string' && i.title.trim()).slice(0, 10);
    // New work goes to the top, keeping the order it was sent in
    const first = await PortfolioItem.findOne({ user: req.userId }).sort(ITEM_ORDER).select('order');
    const top = first ? first.order : 0;
    const docs = [];
    for (const [index, i] of valid.entries()) {
      const photos = imageList(i.images);
      const extra = extraFields(i, photos);
      if (extra.error) return res.status(400).json({ error: extra.error });
      docs.push({
        ...extra.fields,
        user: req.userId,
        order: top - valid.length + index,
        title: i.title.trim().slice(0, 200),
        description: typeof i.description === 'string' ? i.description : '',
        images: photos,
        tags: Array.isArray(i.tags) ? i.tags : [],
        category: i.category || '',
        location: typeof i.location === 'string' ? i.location : '',
        role: text(i.role, 80),
        year: /^\d{4}$/.test(String(i.year || '')) ? String(i.year) : ''
      });
    }
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

    const { title, description, images, tags, category, location, projectStatus, role, year } = req.body;
    if (title !== undefined) item.title = title;
    if (location !== undefined) item.location = location;
    if (projectStatus !== undefined) item.projectStatus = projectStatus;
    if (role !== undefined) item.role = String(role).trim().slice(0, 80);
    if (year !== undefined) item.year = /^\d{4}$/.test(String(year)) ? String(year) : '';
    if (description !== undefined) item.description = description;
    if (tags !== undefined) item.tags = tags;
    if (category !== undefined) item.category = category;
    if (images !== undefined) item.images = imageList(images);
    const extra = extraFields(req.body, item.images);
    if (extra.error) return res.status(400).json({ error: extra.error });
    Object.assign(item, extra.fields);
    // Removing photos also removes their captions
    if (extra.fields.captions === undefined && images !== undefined) item.captions = captionsFor(item.captions, item.images);
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
    const validThemes = ['editorial', 'studio', 'grid', 'timeline', 'minimal', 'magazine', 'stack', 'mosaic', 'index', 'brutalist',
      'noir', 'redline', 'warm', 'manual', 'cleanbook', 'creative', 'catalogue'];
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
    if (req.body.mode !== undefined && !['portfolio', 'catalogue'].includes(req.body.mode)) {
      return res.status(400).json({ error: 'mode must be portfolio or catalogue' });
    }
    for (const key of ['showCv', 'showContact']) {
      if (req.body[key] !== undefined && typeof req.body[key] !== 'boolean') {
        return res.status(400).json({ error: `${key} must be true or false` });
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
    for (const key of ['mode', 'showCv', 'showContact']) {
      if (req.body[key] !== undefined) update[`portfolio.${key}`] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({ message: 'Portfolio settings updated', portfolio: user.portfolio, look: lookOf(user), ...settingsOf(user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio settings', message: error.message });
  }
});

module.exports = router;
