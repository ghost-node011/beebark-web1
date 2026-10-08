const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Counts for the dots in the sidebar: unread chats, connection invitations,
// job applications waiting for your answers, unread notifications
router.get('/badges', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const Message = require('../models/Message');
    const PendingApplication = require('../models/PendingApplication');
    const me = await User.findById(req.userId).select('connections pendingRequests blockedUsers').lean();
    if (!me) return res.status(404).json({ error: 'Not found' });
    const blocked = new Set((me.blockedUsers || []).map(String));
    const connections = (me.connections || []).filter((id) => !blocked.has(String(id)));
    const [chatSenders, jobs, notifications] = await Promise.all([
      connections.length ? Message.distinct('sender', { receiver: me._id, read: false, sender: { $in: connections } }) : [],
      PendingApplication.countDocuments({ user: me._id, status: 'needs_answers' }),
      Notification.countDocuments({ recipient: me._id, read: false })
    ]);
    res.json({
      messages: chatSenders.length,
      connections: (me.pendingRequests || []).length,
      jobs,
      notifications
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load counts' });
  }
});

// ?page&limit&filter=unread — the bell shows the first 30, the Notifications page pages through all
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter = { recipient: req.userId };
    if (req.query.filter === 'unread') filter.read = false;
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actor', 'name username profilePic'),
      Notification.countDocuments({ recipient: req.userId, read: false }),
      Notification.countDocuments(filter)
    ]);
    res.json({ notifications, unreadCount, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications', message: error.message });
  }
});

// Mark every unread notification as read — called when the bell dropdown is opened
router.put('/mark-read', auth, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId, read: false }, { $set: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read', message: error.message });
  }
});

// Mark one notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    await Notification.updateOne({ _id: req.params.id, recipient: req.userId }, { $set: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read', message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    await Notification.deleteOne({ _id: req.params.id, recipient: req.userId });
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove', message: error.message });
  }
});

module.exports = router;
