const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  affiliateUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  affiliateCode: { type: String, required: true },

  // Commission
  commissionPercent: { type: Number, default: 20 },
  commissionAmount: { type: Number, default: 0 }, // in cents
  commissionStatus: { type: String, enum: ['pending', 'validated', 'paid'], default: 'pending' },

  convertedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
