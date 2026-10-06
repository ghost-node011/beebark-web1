const mongoose = require('mongoose');

// Things that happen on someone's profile, for their analytics: a profile
// view, a meeting request or a listing enquiry (project saves live on the item).
const profileEventSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['view', 'meeting', 'enquiry'], required: true },
  item: { type: mongoose.Schema.Types.ObjectId },
  day: { type: String, default: '' }, // YYYY-MM-DD, so a view counts once per viewer per day
  visitor: { type: String, default: '' } // hashed IP for visitors who aren't signed in
}, { timestamps: true });

profileEventSchema.index({ owner: 1, type: 1, createdAt: -1 });
profileEventSchema.index({ owner: 1, actor: 1, type: 1, day: 1 });

module.exports = mongoose.model('ProfileEvent', profileEventSchema);
