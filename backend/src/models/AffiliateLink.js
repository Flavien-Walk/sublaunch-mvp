const mongoose = require('mongoose');

const affiliateLinkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  code: { type: String, required: true, unique: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  totalClicks: { type: Number, default: 0 },
  totalSignups: { type: Number, default: 0 },
  totalConversions: { type: Number, default: 0 },
  totalCommissionsEarned: { type: Number, default: 0 }, // in cents
  totalCommissionsPaid: { type: Number, default: 0 }, // in cents

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('AffiliateLink', affiliateLinkSchema);
