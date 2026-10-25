const mongoose = require('mongoose');

// A company page's own connections, separate from its owner's and admins'
// personal networks. One document per page and person.
const companyConnectionSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'connected'], default: 'pending' },
  // user: the person asked the page; page: the page invited the person
  requestedBy: { type: String, enum: ['user', 'page'], required: true },
  // The admin who sent the page's invitation
  requestedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  connectedAt: { type: Date, default: null }
}, { timestamps: true });

companyConnectionSchema.index({ page: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('CompanyConnection', companyConnectionSchema);
