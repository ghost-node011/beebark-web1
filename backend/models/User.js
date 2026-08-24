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
    duration: String,
    description: String
  }],
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
    // AI resume score (Gemini) — recomputed on every new upload
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
      enum: ['grid', 'timeline', 'minimal', 'magazine', 'stack', 'mosaic', 'index', 'brutalist'],
      default: 'grid'
    },
    headline: { type: String, default: '' },
    font: {
      type: String,
      enum: ['playfair', 'space', 'mono', 'classic', 'inter', 'dmserif', 'cormorant', 'bodoni', 'fraunces', 'archivo', 'bigshoulders', 'oswald', 'bebas', 'plexmono', 'plexsans', 'poppins', 'manrope', 'syne', 'unbounded', 'spectral'],
      default: 'playfair'
    },
    accentColor: { type: String, default: '#D4F547' }
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