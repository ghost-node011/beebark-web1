const mongoose = require('mongoose');

// Pre-launch waitlist lives in its own database (WAITLIST_DB_NAME) on the same
// cluster, so sign-ups stay separate from the main app's DB_NAME data.
const waitlistDbName = (process.env.WAITLIST_DB_NAME || 'beebark_prelaunch').trim();
const waitlistDb = mongoose.connection.useDb(waitlistDbName, { useCache: true });

// "What brings you to BeeBark?" — optional, multiple choice
const INTERESTS = [
  'Showcase my profile and work',
  'Find a job or internship',
  'Hire for my team',
  'Build industry connections'
];

const waitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    interests: { type: [{ type: String, enum: INTERESTS }], default: [] },
    source: { type: String, trim: true, maxlength: 100 },
    confirmationSentAt: { type: Date },
    // Fields collected by the earlier version of the form; kept so existing entries stay readable
    role: { type: String, trim: true },
    roleOther: { type: String, trim: true },
    careerStage: { type: String, trim: true },
    interest: { type: String, trim: true }
  },
  { timestamps: true }
);

const Waitlist = waitlistDb.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
module.exports.INTERESTS = INTERESTS;
