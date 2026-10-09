const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  salary: {
    type: String,
    default: ''
  },
  // Posted on behalf of a company Page (the poster is one of its admins)
  companyPage: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'accepted', 'rejected'],
      default: 'pending'
    },
    // Whether the user applied themselves or auto-apply submitted it for them
    source: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual'
    },
    // Answers to the job's screening questions (question text is copied so
    // later edits to the job don't change what was answered)
    answers: [{
      _id: false,
      questionId: { type: mongoose.Schema.Types.ObjectId },
      question: { type: String, default: '' },
      answer: { type: String, default: '' },
      source: { type: String, enum: ['manual', 'saved', 'ai'], default: 'manual' }
    }]
  }],
  // Screening questions, like LinkedIn's (max 10)
  questions: [{
    text: { type: String, required: true, maxlength: 300 },
    type: { type: String, enum: ['yes_no', 'number', 'short_text', 'long_text', 'single_choice'], default: 'short_text' },
    options: [{ type: String }],
    required: { type: Boolean, default: true },
    // What the poster hopes for (e.g. "Yes", or a minimum number); never shown to applicants
    idealAnswer: { type: String, default: '' }
  }],
  industry: {
    type: String,
    enum: ['architecture', 'interiors', 'construction', 'real_estate', 'related', ''],
    default: ''
  },
  employmentType: {
    type: String,
    enum: ['internship', 'graduate', 'full_time', 'part_time', 'contract', 'freelance', ''],
    default: ''
  },
  workplace: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid', ''],
    default: ''
  },
  experienceLevel: {
    type: String,
    enum: ['fresher', 'junior', 'mid', 'senior', ''],
    default: ''
  },
  skills: [{ type: String }],
  applyBy: { type: Date, default: null },
  tags: [{ type: String }],
  imageUrl: { type: String, default: '' },
  isDemo: { type: Boolean, default: false },
  // 'active' is the open state (autoApply/dashboard query it); 'open' is accepted
  // from the API and stored as 'active' so existing queries keep working
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);