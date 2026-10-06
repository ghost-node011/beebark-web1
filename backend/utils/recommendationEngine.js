const User = require('../models/User');

const PUBLIC_FIELDS = 'name username profilePic role bio location skills industries experience careerStage connections followers isDemo';

const getConnectionSuggestions = async (userId, limit = 10) => {
  try {
    const currentUser = await User.findById(userId)
      .populate('connections', '_id')
      .lean();

    if (!currentUser) {
      return [];
    }

    const connectionIds = currentUser.connections.map(c => c._id.toString());
    const sentRequestIds = (currentUser.sentRequests || []).map(id => id.toString());
    const pendingRequestIds = (currentUser.pendingRequests || []).map(id => id.toString());
    const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
    const excludeIds = [userId.toString(), ...connectionIds, ...sentRequestIds, ...pendingRequestIds, ...blockedIds];

    // Only public profile fields leave the server (never password/OTP/token data).
    // Demo accounts only see each other, and real users never see demo accounts.
    const potentialConnections = await User.find({
      _id: { $nin: excludeIds },
      isDemo: currentUser.isDemo ? true : { $ne: true },
      accountStatus: { $ne: 'deactivated' },
      blockedUsers: { $ne: currentUser._id }
    })
    .select(PUBLIC_FIELDS)
    .populate('connections', '_id name')
    .limit(50)
    .lean();

    const scoredUsers = potentialConnections.map(user => {
      let score = 0;

      const mutualConnections = user.connections.filter(conn =>
        connectionIds.includes(conn._id.toString())
      );
      score += mutualConnections.length * 10;

      const commonSkills = (currentUser.skills || []).filter(skill =>
        (user.skills || []).includes(skill)
      );
      score += commonSkills.length * 5;

      if (user.role === currentUser.role) {
        score += 2;
      }

      const sharedIndustries = (user.industries || []).filter((i) => (currentUser.industries || []).includes(i));
      score += sharedIndustries.length * 4;

      // Follower ids never leave the server, only the count and whether you follow them
      const { followers, ...rest } = user;
      return {
        ...rest,
        isFollowing: (followers || []).some((f) => String(f) === String(userId)),
        followerCount: (followers || []).length,
        suggestionScore: score,
        mutualConnectionsCount: mutualConnections.length,
        mutualConnections: mutualConnections.slice(0, 3),
        commonSkills: commonSkills.slice(0, 5)
      };
    });

    scoredUsers.sort((a, b) => b.suggestionScore - a.suggestionScore);

    return scoredUsers.slice(0, limit);
  } catch (error) {
    console.error('Connection suggestion error:', error);
    return [];
  }
};

module.exports = { getConnectionSuggestions };