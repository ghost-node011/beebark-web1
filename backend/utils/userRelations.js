const mongoose = require('mongoose');

// Fields shown wherever another person appears in a list (connections,
// requests, search), enough to build a "title @ company" headline.
const PERSON_FIELDS = 'name username email profilePic bio role careerStage specialization industries location experience';

// True when either person has blocked the other
const isBlockedBetween = (a, b) => {
  const ids = (u) => (u?.blockedUsers || []).map(String);
  return ids(a).includes(String(b._id)) || ids(b).includes(String(a._id));
};

// Ids unique and in order; used to heal duplicate connections
const uniqueIds = (list) => {
  const seen = new Set();
  return (list || []).filter((id) => {
    const key = String(id && id._id ? id._id : id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toId = (id) => new mongoose.Types.ObjectId(String(id));

module.exports = { PERSON_FIELDS, isBlockedBetween, uniqueIds, toId };
