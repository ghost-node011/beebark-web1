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
    current: { type: Boolean, default: false }
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
    autoApplyEnabled: { type: Boolean, default: false }
  },
  portfolio: {
    theme: {
      type: String,
      enum: ['editorial', 'studio', 'grid', 'timeline', 'minimal', 'magazine', 'stack', 'mosaic', 'index', 'brutalist'],
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
    contactInfo: { type: String, default: '', maxlength: 160 }
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
    readReceipts: { type: Boolean, default: true }
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