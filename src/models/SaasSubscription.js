/**
 * SaasSubscription — tracks a vendor's subscription to our SubLaunch SaaS platform.
 * Distinct from Subscription (end-user buying from a vendor).
 *
 * Plans:
 *  - weekly:  30€/week  + 8% commission
 *  - monthly: 100€/month + 2% commission
 */
const mongoose = require('mongoose');

const saasSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Plan tier
  plan: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true,
  },

  // Commission rate stored at subscription time (never recomputed retroactively)
  commissionRate: {
    type: Number,
    required: true,
    // 0.08 for weekly, 0.02 for monthly
  },

  // Price paid in cents
  pricePaid: { type: Number, required: true }, // 3000 or 10000

  // Stripe
  stripeSubscriptionId: { type: String, sparse: true },
  stripeCustomerId:     { type: String },
  stripePriceId:        { type: String },

  // Status
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'expired', 'trialing', 'restricted'],
    default: 'active',
    index: true,
  },

  // Billing cycle
  currentPeriodStart: { type: Date },
  currentPeriodEnd:   { type: Date, index: true },

  // Lifecycle
  activatedAt:  { type: Date, default: Date.now },
  canceledAt:   { type: Date },
  expiredAt:    { type: Date },
}, { timestamps: true });

// Virtual: is the subscription currently active?
saasSubscriptionSchema.virtual('isActive').get(function () {
  return (
    this.status === 'active' &&
    (!this.currentPeriodEnd || this.currentPeriodEnd > new Date())
  );
});

// Statics
saasSubscriptionSchema.statics.getActiveForUser = function (userId) {
  return this.findOne({
    userId,
    status: 'active',
    $or: [
      { currentPeriodEnd: { $gt: new Date() } },
      { currentPeriodEnd: null },
    ],
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('SaasSubscription', saasSubscriptionSchema);
