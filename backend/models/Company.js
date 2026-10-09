const mongoose = require('mongoose');

// A company Page (like LinkedIn): created by a member, followed by anyone,
// linked from people's Experience and used to post jobs.
const PAGE_TYPES = ['architecture_firm', 'interior_firm', 'real_estate', 'supplier', 'construction', 'consultancy', 'education', 'other'];
const TEAM_SIZES = ['1', '2-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  // Public address: /company/<slug>
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: PAGE_TYPES, default: 'other' },
  tagline: { type: String, default: '', maxlength: 160 },
  about: { type: String, default: '', maxlength: 3000 },
  logo: { type: String, default: '' },
  cover: { type: String, default: '' },
  website: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  locations: [{ type: String }],
  teamSize: { type: String, enum: [...TEAM_SIZES, ''], default: '' },
  founded: { type: String, default: '' },
  // Services, product categories or specialties shown as chips
  specialties: [{ type: String }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Set by the BeeBark team only
  verified: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  // Created automatically from an old "firm" account's business details
  migratedFrom: { type: String, default: '' }
}, { timestamps: true });

companySchema.index({ name: 'text', tagline: 'text', specialties: 'text' });

module.exports = mongoose.model('Company', companySchema);
module.exports.PAGE_TYPES = PAGE_TYPES;
module.exports.TEAM_SIZES = TEAM_SIZES;
