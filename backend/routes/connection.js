const express = require('express');
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
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const currentUser = await User.findById(req.userId);
    const connectionIds = currentUser.connections.map(id => id.toString());
    const sentRequestIds = (currentUser.sentRequests || []).map(id => id.toString());

    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId, $nin: currentUser.blockedUsers || [] } },
        { isDemo: currentUser.isDemo ? true : { $ne: true } },
        { accountStatus: { $ne: 'deactivated' } },
        { blockedUsers: { $ne: currentUser._id } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select(PERSON_FIELDS)
    .limit(20);

    // Add connection status to each user
    const usersWithStatus = users.map(user => ({
      ...user.toObject(),
      isConnected: connectionIds.includes(user._id.toString()),
      requestSent: sentRequestIds.includes(user._id.toString())
    }));

    res.json({ users: usersWithStatus });
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

// Get pending requests
router.get('/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('pendingRequests', `${PERSON_FIELDS} accountStatus`);

    res.json({ requests: uniqueIds(user.pendingRequests).filter((u) => u && u.accountStatus !== 'deactivated') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests', message: error.message });
  }
});

// Get connections list
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('connections', `${PERSON_FIELDS} accountStatus`);

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
