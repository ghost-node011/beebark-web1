const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Reject tokens issued before a "log out everywhere" action
    if (typeof decoded.tokenVersion === 'number' && decoded.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // Signing in again after deactivating brings the account back
    if (user.accountStatus === 'deactivated') {
      await User.updateOne({ _id: user._id }, { $set: { accountStatus: 'active' }, $unset: { deactivatedAt: 1 } });
      user.accountStatus = 'active';
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

module.exports = auth;