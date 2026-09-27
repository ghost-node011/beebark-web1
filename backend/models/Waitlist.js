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
  'Build industry connections',
  'Explore projects'
];

// Questions on the /join-waitlist page (single choice each)
const ROLES = [
  'Architect',
  'Architecture Student',
  'Interior Designer',
  'Developer',
  'Builder / Contractor',
  'Real Estate Professional',
  'Other'
];
const CAREER_STAGES = ['Student', 'Fresher', '0–3 Years Experience', '3+ Years Experience', 'Business / Studio Owner'];
const PRIMARY_INTERESTS = [
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
    interests: { type: [{ type: String, enum: INTERESTS }], default: [] },
    source: { type: String, trim: true, maxlength: 100 },
    confirmationSentAt: { type: Date },
    // From the /join-waitlist page form
    role: { type: String, trim: true, enum: ROLES },
    roleOther: { type: String, trim: true, maxlength: 100 },
    careerStage: { type: String, trim: true, enum: CAREER_STAGES },
    interest: { type: String, trim: true, enum: PRIMARY_INTERESTS }
  },
  { timestamps: true }
);

const Waitlist = waitlistDb.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
module.exports.INTERESTS = INTERESTS;
module.exports.ROLES = ROLES;
module.exports.CAREER_STAGES = CAREER_STAGES;
module.exports.PRIMARY_INTERESTS = PRIMARY_INTERESTS;
