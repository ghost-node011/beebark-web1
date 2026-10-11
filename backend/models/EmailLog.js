const mongoose = require('mongoose');

// One row per email the app sends, updated by SES events (delivered, opened,
// clicked, bounced...) that arrive through SNS at /api/email-events.
// Rows expire after RETENTION_DAYS.
const RETENTION_DAYS = 180;

const eventSchema = new mongoose.Schema({
  type: { type: String, required: true }, // Send, Delivery, Open, Click, Bounce, Complaint, Reject, DeliveryDelay
  at: { type: Date, required: true },
  detail: { type: String, default: '' }
}, { _id: false });

const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true, lowercase: true, trim: true, index: true },
  type: { type: String, default: 'other', index: true }, // otp, welcome, password_reset, waitlist, other
  subject: { type: String, default: '' },
  via: { type: String, enum: ['ses', 'relay', 'smtp'], required: true },
  tracked: { type: Boolean, default: false }, // open/click tracking on for this email
  messageId: { type: String, index: { unique: true, sparse: true } }, // SES only
  status: {
    type: String,
    enum: ['sent', 'delivered', 'bounced', 'complained', 'rejected', 'failed'],
    default: 'sent',
    index: true
  },
  error: { type: String, default: '' },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  openedAt: Date, // first open
  openCount: { type: Number, default: 0 },
  clickedAt: Date, // first click
  clickCount: { type: Number, default: 0 },
  lastClickedUrl: { type: String, default: '' },
  bounceType: { type: String, default: '' }, // Permanent / Transient / Undetermined
  bounceReason: { type: String, default: '' },
  events: { type: [eventSchema], default: [] }
}, { timestamps: true });

// Also serves sorting by date
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60, name: 'createdAt_ttl' });

module.exports = mongoose.model('EmailLog', emailLogSchema);
