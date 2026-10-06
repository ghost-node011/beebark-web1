const mongoose = require('mongoose');

// A property listed for sale or rent by a real-estate professional
const listingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  purpose: { type: String, enum: ['sale', 'rent', 'lease'], default: 'sale' },
  propertyType: { type: String, enum: ['apartment', 'villa', 'house', 'plot', 'office', 'retail', 'warehouse', 'other'], default: 'apartment' },
  price: { type: Number, default: null },
  priceUnit: { type: String, enum: ['total', 'per_month', 'per_sqft'], default: 'total' },
  area: { type: Number, default: null },
  areaUnit: { type: String, enum: ['sqft', 'sqm', 'acre'], default: 'sqft' },
  bedrooms: { type: Number, default: null },
  bathrooms: { type: Number, default: null },
  location: { type: String, default: '' },
  images: [{ type: String }],
  amenities: [{ type: String }],
  // Upper end of a price range ("₹3.2 Cr – ₹8.5 Cr"); empty for a single price
  priceTo: { type: Number, default: null },
  // Short line under the title, e.g. "24 units available" or "Coming Q3 2026"
  subtitle: { type: String, default: '' },
  status: { type: String, enum: ['active', 'pre_launch', 'under_offer', 'sold', 'rented', 'draft'], default: 'active', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
