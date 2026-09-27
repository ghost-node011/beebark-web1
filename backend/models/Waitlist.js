const mongoose = require('mongoose');

// Pre-launch waitlist lives in its own database (WAITLIST_DB_NAME) on the same
// cluster, so sign-ups stay separate from the main app's DB_NAME data.
const waitlistDbName = (process.env.WAITLIST_DB_NAME || 'beebark_prelaunch').trim();
const waitlistDb = mongoose.connection.useDb(waitlistDbName, { useCache: true });

const ROLES = [
  'Architect',
  'Architecture Student',
  'Interior Designer',
  'Developer',
  'Builder / Contractor',
  'Real Estate Professional',
  'Other'
];

const CAREER_STAGES = [
  'Student',
  'Fresher',
  '0–3 Years Experience',
  '3+ Years Experience',
  'Business / Studio Owner'
];

const INTERESTS = [
  'Showcase my work',
  'Find jobs / opportunities',
  'Connect with professionals',
  'Get discovered',
  'Find collaborators',
  'Explore projects'
];

const waitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    role: { type: String, required: true, enum: ROLES },
    roleOther: { type: String, trim: true, maxlength: 100 },
    careerStage: { type: String, required: true, enum: CAREER_STAGES },
    interest: { type: String, required: true, enum: INTERESTS },
    source: { type: String, trim: true, maxlength: 100 },
    confirmationSentAt: { type: Date }
  },
  { timestamps: true }
);

const Waitlist = waitlistDb.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
module.exports.ROLES = ROLES;
module.exports.CAREER_STAGES = CAREER_STAGES;
module.exports.INTERESTS = INTERESTS;
