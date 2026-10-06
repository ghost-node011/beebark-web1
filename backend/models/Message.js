const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional when the message carries attachments
  text: {
    type: String,
    default: ''
  },
  attachments: [{
    _id: false,
    url: { type: String, required: true },
    name: { type: String, default: '' },
    mime: { type: String, default: '' },
    size: { type: Number, default: 0 },
    kind: { type: String, enum: ['image', 'file'], default: 'file' }
  }],
  read: {
    type: Boolean,
    default: false
  },
  // Receipts: when it reached the receiver's device and when they opened it.
  // readAt stays empty when the reader has read receipts turned off.
  deliveredAt: Date,
  readAt: Date
}, {
  timestamps: true
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, deliveredAt: 1 });

module.exports = mongoose.model('Message', messageSchema);