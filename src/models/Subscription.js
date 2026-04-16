const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },

  // Stripe
  stripeSubscriptionId: { type: String, unique: true, sparse: true },
  stripeCustomerId: { type: String },
  stripePriceId: { type: String },
  stripeCurrentPeriodEnd: { type: Date },
  stripeCurrentPeriodStart: { type: Date },

  // Status: active | past_due | canceled | unpaid | trialing | incomplete
  status: { type: String, enum: ['active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'pending'], default: 'pending' },

  // Telegram access
  telegramInviteLink: { type: String },
  telegramInviteLinkExpiry: { type: Date },
  telegramAccessActive: { type: Boolean, default: false },
  telegramJoinedAt: { type: Date },
  telegramRemovedAt: { type: Date },

  // Affiliate tracking
  referredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  affiliateCode: { type: String },

  // Dates
  subscribedAt: { type: Date, default: Date.now },
  canceledAt: { type: Date },
  expiredAt: { type: Date },

  // CRM notes
  notes: { type: String },
}, { timestamps: true });

subscriptionSchema.index({ userId: 1, creatorId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
