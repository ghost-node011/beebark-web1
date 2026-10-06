const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Listing = require('../models/Listing');
const User = require('../models/User');

// Property listings for real-estate professionals
const router = express.Router();

const ENUMS = {
  purpose: ['sale', 'rent', 'lease'],
  propertyType: ['apartment', 'villa', 'house', 'plot', 'office', 'retail', 'warehouse', 'other'],
  priceUnit: ['total', 'per_month', 'per_sqft'],
  areaUnit: ['sqft', 'sqm', 'acre'],
  status: ['active', 'under_offer', 'sold', 'rented', 'draft']
};
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const num = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));

function clean(body) {
  const out = {};
  if (body.title !== undefined) out.title = clip(body.title, 140);
  if (body.description !== undefined) out.description = clip(body.description, 5000);
  if (body.location !== undefined) out.location = clip(body.location, 200);
  for (const k of Object.keys(ENUMS)) if (ENUMS[k].includes(body[k])) out[k] = body[k];
  for (const k of ['price', 'area', 'bedrooms', 'bathrooms']) if (body[k] !== undefined) out[k] = num(body[k]);
  if (Array.isArray(body.images)) out.images = body.images.filter((u) => typeof u === 'string' && /^(https?:\/\/|\/uploads\/)[^\s"'<>]+$/.test(u)).slice(0, 20);
  if (Array.isArray(body.amenities)) out.amenities = body.amenities.map((a) => clip(a, 40)).filter(Boolean).slice(0, 30);
  return out;
}

const validId = (id) => mongoose.isValidObjectId(id);

// ?user=<id|username|me>&purpose&propertyType&status&q
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    let owner = null;
    if (req.query.user === 'me' || !req.query.user) owner = req.userId;
    else if (validId(req.query.user)) owner = req.query.user;
    else owner = (await User.findOne({ username: String(req.query.user) }).select('_id'))?._id;
    if (!owner) return res.json({ listings: [] });
    filter.user = owner;
    const isOwner = String(owner) === String(req.userId);
    if (ENUMS.status.includes(req.query.status)) filter.status = req.query.status;
    else if (!isOwner) filter.status = { $ne: 'draft' };
    if (ENUMS.purpose.includes(req.query.purpose)) filter.purpose = req.query.purpose;
    if (ENUMS.propertyType.includes(req.query.propertyType)) filter.propertyType = req.query.propertyType;
    const q = clip(req.query.q, 60);
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: re }, { location: re }, { description: re }];
    }
    const listings = await Listing.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load listings', message: error.message });
  }
});

// One listing (drafts only for their owner), with who listed it
router.get('/:id', auth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Listing not found' });
    const listing = await Listing.findById(req.params.id)
      .populate('user', 'name username profilePic headline role accountStatus blockedUsers').lean();
    const isOwner = listing && String(listing.user?._id) === String(req.userId);
    const hidden = !listing || !listing.user || listing.user.accountStatus === 'deactivated'
      || (listing.status === 'draft' && !isOwner)
      || (listing.user.blockedUsers || []).some((id) => String(id) === String(req.userId));
    if (hidden) return res.status(404).json({ error: 'Listing not found' });
    const { blockedUsers, accountStatus, ...owner } = listing.user;
    res.json({ listing: { ...listing, user: owner }, isOwner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load listing', message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = clean(req.body || {});
    if (!data.title) return res.status(400).json({ error: 'Title is required' });
    const count = await Listing.countDocuments({ user: req.userId });
    if (count >= 500) return res.status(400).json({ error: 'Listing limit reached' });
    const listing = await Listing.create({ ...data, user: req.userId });
    res.status(201).json({ listing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create listing', message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Listing not found' });
    const data = clean(req.body || {});
    if (data.title === '') return res.status(400).json({ error: 'Title is required' });
    const listing = await Listing.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { $set: data }, { new: true, runValidators: true });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json({ listing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update listing', message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Listing not found' });
    const r = await Listing.deleteOne({ _id: req.params.id, user: req.userId });
    if (!r.deletedCount) return res.status(404).json({ error: 'Listing not found' });
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete listing', message: error.message });
  }
});

module.exports = router;
