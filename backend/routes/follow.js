const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { isBlockedBetween } = require('../utils/userRelations');

// Follow someone to see their updates without connecting (and unfollow)
const router = express.Router();
const CARD = 'name username profilePic headline role careerStage specialization experience location';

router.post('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId) || String(userId) === String(req.userId)) return res.status(400).json({ error: 'Invalid user' });
    const [me, them] = await Promise.all([
      User.findById(req.userId).select('blockedUsers following').lean(),
      User.findById(userId).select('blockedUsers accountStatus').lean()
    ]);
    if (!them || them.accountStatus === 'deactivated') return res.status(404).json({ error: 'User not found' });
    if (isBlockedBetween(me, them)) return res.status(403).json({ error: 'You can\'t follow this person' });
    const already = (me.following || []).some((id) => String(id) === String(userId));
    await Promise.all([
      User.updateOne({ _id: req.userId }, { $addToSet: { following: userId } }),
      User.updateOne({ _id: userId }, { $addToSet: { followers: req.userId } })
    ]);
    if (!already) Notification.create({ recipient: userId, actor: req.userId, type: 'follow' }).catch(() => {});
    const followerCount = (await User.findById(userId).select('followers').lean()).followers.length;
    res.json({ following: true, followerCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow', message: error.message });
  }
});

router.delete('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid user' });
    await Promise.all([
      User.updateOne({ _id: req.userId }, { $pull: { following: userId } }),
      User.updateOne({ _id: userId }, { $pull: { followers: req.userId } })
    ]);
    const them = await User.findById(userId).select('followers').lean();
    res.json({ following: false, followerCount: them?.followers?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow', message: error.message });
  }
});

// ?type=followers|following — people lists for a profile
router.get('/:userId/list', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: 'Invalid user' });
    const field = req.query.type === 'following' ? 'following' : 'followers';
    const u = await User.findById(req.params.userId).select(field).populate({ path: field, select: `${CARD} accountStatus`, options: { limit: 200 } }).lean();
    res.json({ people: (u?.[field] || []).filter((p) => p.accountStatus !== 'deactivated') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load list', message: error.message });
  }
});

module.exports = router;
