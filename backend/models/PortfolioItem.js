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
  category: {
    type: String,
    default: ''
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
