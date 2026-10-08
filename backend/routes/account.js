const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const PortfolioItem = require('../models/PortfolioItem');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Job = require('../models/Job');
const ConversationState = require('../models/ConversationState');
// Calendar was removed; deleting an account still clears any events saved before that
const CalendarEvent = require('../models/CalendarEvent');
const Listing = require('../models/Listing');

// Account settings: blocked people, deactivate (hide until next sign-in) and
// delete (permanent).
const isId = (v) => mongoose.isValidObjectId(v);

router.get('/blocked', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('blockedUsers', 'name username profilePic role');
    res.json({ blocked: (me.blockedUsers || []).filter(Boolean) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load blocked people', message: error.message });
  }
});

// Block someone: they disappear from your search, chats and requests, and the connection ends
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isId(userId) || String(userId) === String(req.userId)) return res.status(400).json({ error: 'Invalid user' });
    const other = await User.findById(userId).select('_id');
    if (!other) return res.status(404).json({ error: 'User not found' });
    await Promise.all([
      User.updateOne(
        { _id: req.userId },
        { $addToSet: { blockedUsers: other._id }, $pull: { connections: other._id, pendingRequests: other._id, sentRequests: other._id, associatedProfessionals: other._id } }
      ),
      User.updateOne(
        { _id: other._id },
        { $pull: { connections: req.userId, pendingRequests: req.userId, sentRequests: req.userId, associatedProfessionals: req.userId } }
      )
    ]);
    res.json({ message: 'Blocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block', message: error.message });
  }
});

router.delete('/block/:userId', auth, async (req, res) => {
  try {
    if (!isId(req.params.userId)) return res.status(400).json({ error: 'Invalid user' });
    await User.updateOne({ _id: req.userId }, { $pull: { blockedUsers: req.params.userId } });
    res.json({ message: 'Unblocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock', message: error.message });
  }
});

// Deactivate: hidden from everyone and signed out everywhere; signing in again reactivates
router.post('/deactivate', auth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.userId },
      { $set: { accountStatus: 'deactivated', deactivatedAt: new Date() }, $inc: { tokenVersion: 1 } }
    );
    res.json({ message: 'Account deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate', message: error.message });
  }
});

/**
 * Delete the account and everything that belongs to it. Needs { confirm: "DELETE" },
 * plus { password } for accounts that sign in with a password.
 */
router.post('/delete', auth, async (req, res) => {
  try {
    if (req.body.confirm !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm' });
    const me = await User.findById(req.userId).select('+password');
    if (!me) return res.status(404).json({ error: 'User not found' });
    if (me.password) {
      const ok = typeof req.body.password === 'string' && await me.comparePassword(req.body.password);
      if (!ok) return res.status(400).json({ error: 'Password is incorrect' });
    }
    const id = me._id;
    await Promise.all([
      User.updateMany({}, { $pull: { connections: id, pendingRequests: id, sentRequests: id, blockedUsers: id, associatedProfessionals: id } }),
      Message.deleteMany({ $or: [{ sender: id }, { receiver: id }] }),
      Notification.deleteMany({ $or: [{ recipient: id }, { actor: id }] }),
      PortfolioItem.deleteMany({ user: id }),
      Post.deleteMany({ author: id }),
      Post.updateMany({}, { $pull: { likes: id, comments: { author: id } } }),
      Story.deleteMany({ author: id }),
      Job.deleteMany({ postedBy: id }),
      Job.updateMany({ 'applicants.user': id }, { $pull: { applicants: { user: id } } }),
      ConversationState.deleteMany({ $or: [{ user: id }, { other: id }] }),
      CalendarEvent.deleteMany({ user: id }),
      Listing.deleteMany({ user: id })
    ]);
    await User.deleteOne({ _id: id });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account', message: error.message });
  }
});

module.exports = router;
