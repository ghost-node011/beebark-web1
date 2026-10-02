const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

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
        { _id: { $ne: req.userId } },
        { isDemo: currentUser.isDemo ? true : { $ne: true } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name username email profilePic bio role')
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

// Send connection request
router.post('/send-request/:targetUserId', auth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    
    if (req.userId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.connections.includes(targetUserId)) {
      return res.status(400).json({ error: 'Already connected' });
    }

    if (targetUser.pendingRequests.includes(req.userId)) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    targetUser.pendingRequests.push(req.userId);
    currentUser.sentRequests.push(targetUserId);

    await targetUser.save();
    await currentUser.save();
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

    if (!currentUser.pendingRequests.includes(requesterId)) {
      return res.status(400).json({ error: 'No pending request from this user' });
    }

    currentUser.pendingRequests = currentUser.pendingRequests.filter(
      id => id.toString() !== requesterId
    );
    requester.sentRequests = requester.sentRequests.filter(
      id => id.toString() !== req.userId.toString()
    );

    currentUser.connections.push(requesterId);
    requester.connections.push(req.userId);

    await currentUser.save();
    await requester.save();
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
      .populate('pendingRequests', 'name username email profilePic bio');
    
    res.json({ requests: user.pendingRequests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests', message: error.message });
  }
});

// Get connections list
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('connections', 'name username email profilePic bio role');
    
    res.json({ connections: user.connections });
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

    currentUser.connections = currentUser.connections.filter(
      id => id.toString() !== connectionId
    );
    connectionUser.connections = connectionUser.connections.filter(
      id => id.toString() !== req.userId.toString()
    );

    await currentUser.save();
    await connectionUser.save();

    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove connection', message: error.message });
  }
});

module.exports = router;
