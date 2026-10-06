const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  images: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  // Free-text bucket for filtering (e.g. "Residential", "Commercial") — kept
  // free-text rather than a fixed enum since this app spans many professions
  location: { type: String, default: '' },
  projectStatus: { type: String, default: '' },
  // What the owner did on it ("Lead Architect") and when
  role: { type: String, default: '', trim: true },
  year: { type: String, default: '' },
  // People who bookmarked it; drives "Project saves" on the owner's analytics
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category: {
    type: String,
    default: ''
  },
  // Position chosen by the owner; lower comes first. Ties fall back to newest first.
  order: {
    type: Number,
    default: 0
  },
  // Short AI-generated take on the item — informational, never blocks saving
  aiFeedback: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);
