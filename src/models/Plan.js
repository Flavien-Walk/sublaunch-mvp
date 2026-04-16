const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true }, // ex: "Starter", "Pro", "VIP"
  description: { type: String },
  features: [{ type: String }],

  // Pricing
  price: { type: Number, required: true }, // in cents (ex: 999 = 9.99€)
  currency: { type: String, default: 'eur' },
  interval: { type: String, enum: ['month', 'year', 'week', 'day', 'custom'], default: 'month' },

  // ── Access duration (source of truth for bot logic) ──────────────────────
  // Never infer duration from the `interval` label — always use these fields.
  accessDurationValue: { type: Number, required: true, default: 1 }, // e.g. 5
  accessDurationUnit: {                                               // e.g. 'minutes'
    type: String,
    enum: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'],
    required: true,
    default: 'months',
  },

  // Stripe
  stripePriceId: { type: String },
  stripeProductId: { type: String },

  // Display
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
