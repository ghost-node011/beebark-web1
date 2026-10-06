const mongoose = require('mongoose');

// A report about a person or something they posted (chat, profile, job,
// portfolio project, listing, post), reviewed by the team
const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, enum: ['spam', 'harassment', 'fake_profile', 'inappropriate', 'scam', 'misleading', 'copyright', 'other'], required: true },
  details: { type: String, default: '', maxlength: 1000 },
  context: { type: String, enum: ['chat', 'profile', 'post', 'job', 'portfolio', 'listing', 'other'], default: 'other' },
  // The reported item when it isn't the person themselves
  itemId: { type: mongoose.Schema.Types.ObjectId },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  status: { type: String, enum: ['open', 'reviewed', 'actioned'], default: 'open', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
