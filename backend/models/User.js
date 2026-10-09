const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    // Password is only required for local (email/password) accounts
    required: function () {
      return this.authProvider === 'local';
    }
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'linkedin', 'phone'],
    default: 'local'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  linkedinId: {
    type: String,
    unique: true,
    sparse: true
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  profilePic: {
    type: String,
    default: ''
  },
  coverPhoto: {
    type: String,
    default: ''
  },
  profileViews: {
    type: Number,
    default: 0
  },
  // "Professional Identity" sub-fields shown on the public profile
  specialization: [{ type: String }],
  projectTypeFocus: [{ type: String }],
  markets: [{ type: String }],
  pronouns: { type: String, default: '', maxlength: 30 },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  skills: [{
    type: String
  }],
  experience: [{
    title: String,
    company: String,
    // Free text kept for older entries; new entries also fill the structured fields
    duration: String,
    description: String,
    employmentType: { type: String, default: '' }, // full_time, part_time, internship, freelance, contract
    location: { type: String, default: '' },
    startDate: { type: String, default: '' }, // "YYYY-MM"
    endDate: { type: String, default: '' }, // "YYYY-MM"; empty when current
    current: { type: Boolean, default: false },
    // Set when the company was picked from a BeeBark company Page
    companyPage: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true }
  }],
  education: [{
    school: String,
    degree: String,
    field: String,
    duration: String,
    description: String
  }],
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  languages: [{
    name: { type: String, required: true },
    proficiency: { type: String, default: '' } // basic, conversational, professional, native
  }],
  // What the person is open to; options depend on role (see profile route)
  availability: [{ type: String }],
  // Business / firm details for professionals who run a practice
  business: {
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    website: { type: String, default: '' },
    founded: { type: String, default: '' },
    teamSize: { type: String, default: '' },
    services: [{ type: String }],
    address: { type: String, default: '' },
    about: { type: String, default: '' }
  },
  // Followers see someone's updates without being connected; connecting also follows both ways
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Answers to job screening questions, reused when the same question comes up again
  answerBank: [{
    key: { type: String, required: true }, // normalised question text
    question: { type: String, required: true },
    type: { type: String, default: 'short_text' },
    answer: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  }],
  // Set by the BeeBark team only (identity checked / paid plan)
  badges: {
    verified: { type: Boolean, default: false },
    pro: { type: Boolean, default: false }
  },
  // One line under the name, e.g. "Real Estate Developer | Architect"
  headline: { type: String, default: '', trim: true, maxlength: 140 },
  // Contact details; `visibility` decides who sees them (connections by default)
  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    website: { type: String, default: '' },
    address: { type: String, default: '' },
    visibility: { type: String, enum: ['everyone', 'connections', 'only_me'], default: 'connections' }
  },
  socialLinks: [{
    _id: false,
    platform: { type: String, required: true },
    url: { type: String, required: true }
  }],
  // Chosen by the user; undefined means "not set yet" (connections are shown instead)
  associatedProfessionals: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: undefined
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Deactivated accounts are hidden everywhere and come back on the next sign-in
  accountStatus: { type: String, enum: ['active', 'deactivated'], default: 'active', index: true },
  deactivatedAt: Date,
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sentRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  role: {
    type: String,
    // Self-selectable: student/professional/firm. Others kept for backward compatibility.
    enum: ['student', 'professional', 'firm', 'recruiter', 'company', 'user', 'admin'],
    default: 'professional'
  },
  // What the user wants to do on the platform (onboarding step 2)
  intent: [{
    type: String,
    enum: ['learn', 'network', 'hire', 'get_hired']
  }],
  // Industry focus (onboarding step 3)
  industries: [{
    type: String,
    enum: ['architecture', 'interiors', 'construction', 'real_estate', 'related']
  }],
  // Free-text domain when "related" is selected — AI-confirmed at entry time
  industriesOther: { type: String, default: '' },
  // Where the person is right now; drives the dashboard's chips and wording
  careerStage: {
    type: String,
    enum: ['studying', 'career_prep', 'fresher', 'intern', 'employed', 'freelance', 'business_owner', ''],
    default: ''
  },
  // Demo accounts and their seed data are only shown to other demo accounts
  isDemo: { type: Boolean, default: false, index: true },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Bumped to invalidate all previously issued tokens ("log out everywhere")
  tokenVersion: {
    type: Number,
    default: 0
  },
  emailVerification: {
    otpHash: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
    lastSentAt: Date
  },
  passwordReset: {
    otpHash: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
    lastSentAt: Date
  },
  resume: {
    url: String,
    fileName: String,
    parsedData: {
      skills: [String],
      experience: mongoose.Schema.Types.Mixed,
      education: [String],
      email: String,
      phone: String,
      rawText: String
    },
    uploadedAt: Date,
    // AI resume score — recomputed on every new upload
    score: Number,
    scoreBreakdown: mongoose.Schema.Types.Mixed,
    strengths: [String],
    improvements: [String],
    suggestedRoles: [String],
    scoredAt: Date
  },
  jobPreferences: {
    // When true, the system auto-applies to strong job matches on the user's behalf
    autoApplyEnabled: { type: Boolean, default: false },
    // Jobs swiped left in "Jobs for you"; they aren't recommended again
    passedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }]
  },
  portfolio: {
    theme: {
      type: String,
      enum: ['editorial', 'studio', 'grid', 'timeline', 'minimal', 'magazine', 'stack', 'mosaic', 'index', 'brutalist',
        'noir', 'redline', 'warm', 'manual', 'cleanbook', 'creative', 'catalogue'],
      default: 'editorial'
    },
    headline: { type: String, default: '' },
    font: {
      type: String,
      enum: ['playfair', 'space', 'mono', 'classic', 'inter', 'dmserif', 'cormorant', 'bodoni', 'fraunces', 'archivo', 'bigshoulders', 'oswald', 'bebas', 'plexmono', 'plexsans', 'poppins', 'manrope', 'syne', 'unbounded', 'spectral'],
      default: 'playfair'
    },
    accentColor: { type: String, default: '#D4F547' },
    // Customisation for Editorial and Studio; empty means the template default
    background: { type: String, default: '' },
    textColor: { type: String, default: '' },
    bodyFont: { type: String, default: '' },
    tagline: { type: String, default: '', maxlength: 160 },
    aboutText: { type: String, default: '', maxlength: 1200 },
    closingLine: { type: String, default: '', maxlength: 120 },
    contactInfo: { type: String, default: '', maxlength: 160 },
    // 'catalogue' turns the portfolio into a product catalogue (suppliers)
    mode: { type: String, enum: ['portfolio', 'catalogue'], default: 'portfolio' },
    // Extra pages on the public portfolio
    showCv: { type: Boolean, default: true },
    showContact: { type: Boolean, default: true }
  },
  settings: {
    // Owner-controlled, per-section visibility on the public-facing profile.
    // Analytics/Activity default to owner-only since they're personal by
    // nature; Gallery defaults to public since portfolio work is meant to be
    // shown off and was always visible before this setting existed.
    analyticsPublic: { type: Boolean, default: false },
    galleryPublic: { type: Boolean, default: true },
    activityPublic: { type: Boolean, default: false },
    // Off: others don't see when you've read their messages, and you don't see theirs
    readReceipts: { type: Boolean, default: true },
    // How "Jobs for you" is shown: a swipe deck or a plain list
    jobsView: { type: String, enum: ['swipe', 'list'], default: 'swipe' },
    // Public profile at /in/:username that anyone can open without signing in
    publicProfile: { type: Boolean, default: true }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);