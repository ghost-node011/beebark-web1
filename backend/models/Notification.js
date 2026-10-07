const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Who caused the notification (e.g. who sent/accepted the request)
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Only connection events for now — more types can be added later without
  // a schema change since this is a plain string, not an enum.
  type: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  // Extra details for some types (e.g. quote_request: { itemTitle, message })
  meta: {
    type: Object,
    default: undefined
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
