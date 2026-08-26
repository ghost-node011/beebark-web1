const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', auth, async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('actor', 'name username profilePic'),
      Notification.countDocuments({ recipient: req.userId, read: false })
    ]);
    res.json({ notifications, unreadCount });
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

module.exports = router;
