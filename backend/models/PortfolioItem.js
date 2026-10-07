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
  },
  // 'product' items make up a supplier's catalogue; everything else is a project
  kind: { type: String, enum: ['project', 'product'], default: 'project' },
  // One caption per photo, same order as `images` (may be shorter)
  captions: [{ type: String }],
  // Optional heading the item is grouped under ("Residential", "Tiles")
  section: { type: String, default: '', trim: true },
  // Guided write-up of a project
  story: {
    summary: { type: String, default: '', maxlength: 2000 },
    contribution: { type: String, default: '', maxlength: 2000 },
    process: { type: String, default: '', maxlength: 2000 },
    outcome: { type: String, default: '', maxlength: 2000 }
  },
  // Product details (kind: 'product')
  sku: { type: String, default: '', trim: true },
  specs: [{
    _id: false,
    label: { type: String, default: '' },
    value: { type: String, default: '' }
  }],
  finishes: [{ type: String }],
  sizes: [{ type: String }],
  priceFrom: { type: Number, default: null },
  priceTo: { type: Number, default: null },
  priceUnit: { type: String, enum: ['piece', 'sqft', 'sqm', 'rft', 'kg', 'bag', 'ton', 'set', ''], default: '' },
  moq: { type: String, default: '' },
  leadTime: { type: String, default: '' },
  availability: { type: String, enum: ['in_stock', 'made_to_order', 'out_of_stock', ''], default: '' },
  // Product brochure PDF (Cloudinary/https or /uploads URL)
  brochureUrl: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);
