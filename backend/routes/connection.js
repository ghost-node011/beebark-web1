const express = require('express');
const { searchPeople } = require('../utils/peopleSearch');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { PERSON_FIELDS, isBlockedBetween, uniqueIds } = require('../utils/userRelations');

// Get connection suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { getConnectionSuggestions } = require('../utils/recommendationEngine');
    const suggestions = await getConnectionSuggestions(req.userId, 10);
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions', message: error.message });
  }
});

// Search users by name, username, or email
// Same ranked, word-by-word search as /api/people/search; kept for older callers
router.get('/search', auth, async (req, res) => {
  try {
    const query = String(req.query.query || req.query.q || '');
    if (query.trim().length < 1) return res.json({ users: [] });
    const { people } = await searchPeople(req.userId, { q: query, limit: 30 });
    res.json({ users: people });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// Connect two people both ways and clear any requests between them. $addToSet
// keeps it idempotent, so crossing requests never create duplicate connections.
async function connect(aId, bId) {
  await Promise.all([
    User.updateOne({ _id: aId }, { $addToSet: { connections: bId }, $pull: { pendingRequests: bId, sentRequests: bId } }),
    User.updateOne({ _id: bId }, { $addToSet: { connections: aId }, $pull: { pendingRequests: aId, sentRequests: aId } })
  ]);
}

// Send connection request
router.post('/send-request/:targetUserId', auth, async (req, res) => {
  try {
    const { targetUserId } = req.params;

    if (req.userId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser || targetUser.accountStatus === 'deactivated') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (isBlockedBetween(currentUser, targetUser)) {
      return res.status(403).json({ error: 'You can\'t connect with this person' });
    }

    if (currentUser.connections.map(String).includes(targetUserId)) {
      return res.status(400).json({ error: 'Already connected' });
    }

    // They already asked to connect with you: accept instead of sending a second request
    if (currentUser.pendingRequests.map(String).includes(targetUserId)) {
      await connect(currentUser._id, targetUser._id);
      await Notification.create({ recipient: targetUserId, actor: req.userId, type: 'connection_accepted' });
      return res.json({ message: 'You are now connected', connected: true });
    }

    if (targetUser.pendingRequests.map(String).includes(String(req.userId))) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    await Promise.all([
      User.updateOne({ _id: targetUser._id }, { $addToSet: { pendingRequests: currentUser._id } }),
      User.updateOne({ _id: currentUser._id }, { $addToSet: { sentRequests: targetUser._id } })
    ]);
    await Notification.create({ recipient: targetUserId, actor: req.userId, type: 'connection_request' });

    res.json({ message: 'Connection request sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send request', message: error.message });
  }
});

// Accept connection request
router.post('/accept-request/:requesterId', auth, async (req, res) => {
  try {
    const { requesterId } = req.params;

    const currentUser = await User.findById(req.userId);
    const requester = await User.findById(requesterId);

    if (!requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.connections.map(String).includes(requesterId)) {
      await connect(currentUser._id, requester._id); // clears any leftover requests
      return res.json({ message: 'Already connected' });
    }

    if (!currentUser.pendingRequests.map(String).includes(requesterId)) {
      return res.status(400).json({ error: 'No pending request from this user' });
    }

    await connect(currentUser._id, requester._id);
    await Notification.create({ recipient: requesterId, actor: req.userId, type: 'connection_accepted' });

    res.json({ message: 'Connection request accepted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept request', message: error.message });
  }
});

// Reject connection request
router.post('/reject-request/:requesterId', auth, async (req, res) => {
  try {
    const { requesterId } = req.params;

    const currentUser = await User.findById(req.userId);
    const requester = await User.findById(requesterId);

    if (!requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    currentUser.pendingRequests = currentUser.pendingRequests.filter(
      id => id.toString() !== requesterId
    );
    requester.sentRequests = requester.sentRequests.filter(
      id => id.toString() !== req.userId.toString()
    );

    await currentUser.save();
    await requester.save();

    res.json({ message: 'Connection request rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request', message: error.message });
  }
});

// When each connection request was sent, from its notification (requests
// themselves are bare ids). Returns a Map of other-person id -> Date.
async function requestTimes({ recipient, actor }) {
  const notes = await Notification.find({ type: 'connection_request', ...(recipient ? { recipient } : {}), ...(actor ? { actor } : {}) })
    .select('recipient actor createdAt')
    .lean();
  const times = new Map();
  notes.forEach((n) => {
    const key = String(recipient ? n.actor : n.recipient);
    if (!times.has(key) || times.get(key) < n.createdAt) times.set(key, n.createdAt);
  });
  return times;
}

// Get pending requests
router.get('/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('pendingRequests', `${PERSON_FIELDS} accountStatus coverPhoto`);

    const people = uniqueIds(user.pendingRequests).filter((u) => u && u.accountStatus !== 'deactivated');
    const times = await requestTimes({ recipient: user._id });
    res.json({ requests: people.map((p) => ({ ...p.toObject(), requestedAt: times.get(String(p._id)) || null })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests', message: error.message });
  }
});

// Get requests the current user has sent and that are still waiting
router.get('/sent', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('sentRequests', `${PERSON_FIELDS} accountStatus coverPhoto`);

    const people = uniqueIds(user.sentRequests).filter((u) => u && u.accountStatus !== 'deactivated');
    const times = await requestTimes({ actor: user._id });
    res.json({ sent: people.map((p) => ({ ...p.toObject(), requestedAt: times.get(String(p._id)) || null })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sent requests', message: error.message });
  }
});

// Get connections list
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('connections', `${PERSON_FIELDS} accountStatus coverPhoto`);

    // Heal duplicates left by crossing requests (one person, one chat)
    const unique = uniqueIds(user.connections);
    if (unique.length !== user.connections.length) {
      await User.updateOne({ _id: user._id }, { $set: { connections: unique.map((c) => c._id) } });
    }

    res.json({ connections: unique.filter((c) => c && c.accountStatus !== 'deactivated') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch connections', message: error.message });
  }
});

// Withdraw a connection request you sent
router.delete('/cancel-request/:targetUserId', auth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user' });
    }

    await Promise.all([
      User.updateOne({ _id: req.userId }, { $pull: { sentRequests: targetUserId } }),
      User.updateOne({ _id: targetUserId }, { $pull: { pendingRequests: req.userId } }),
      Notification.deleteMany({ recipient: targetUserId, actor: req.userId, type: 'connection_request' })
    ]);

    res.json({ message: 'Request withdrawn' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to withdraw request', message: error.message });
  }
});

// Remove connection
router.delete('/remove/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;

    const currentUser = await User.findById(req.userId);
    const connectionUser = await User.findById(connectionId);

    if (!connectionUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Promise.all([
      User.updateOne({ _id: currentUser._id }, { $pull: { connections: connectionUser._id } }),
      User.updateOne({ _id: connectionUser._id }, { $pull: { connections: currentUser._id } })
    ]);

    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove connection', message: error.message });
  }
});

module.exports = router;
