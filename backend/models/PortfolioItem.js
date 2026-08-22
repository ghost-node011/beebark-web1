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
  // Short AI-generated take on the item (Gemini) — informational, never blocks saving
  aiFeedback: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);
