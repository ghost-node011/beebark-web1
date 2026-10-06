const mongoose = require('mongoose');

// A report about a person (from a chat or their profile), reviewed by the team
const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, enum: ['spam', 'harassment', 'fake_profile', 'inappropriate', 'scam', 'other'], required: true },
  details: { type: String, default: '', maxlength: 1000 },
  context: { type: String, enum: ['chat', 'profile', 'post', 'other'], default: 'other' },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  status: { type: String, enum: ['open', 'reviewed', 'actioned'], default: 'open', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
