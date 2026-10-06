const mongoose = require('mongoose');

// One person's view of a conversation: starred, archived, or deleted (cleared).
// Deleting hides earlier messages for this person only.
const conversationStateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  other: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  starred: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  // "Mark as unread": shown as unread until you open it again
  markedUnread: { type: Boolean, default: false },
  clearedAt: Date
}, { timestamps: true });

conversationStateSchema.index({ user: 1, other: 1 }, { unique: true });

module.exports = mongoose.model('ConversationState', conversationStateSchema);
