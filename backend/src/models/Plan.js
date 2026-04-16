const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true }, // ex: "Starter", "Pro", "VIP"
  description: { type: String },
  features: [{ type: String }],

  // Pricing
  price: { type: Number, required: true }, // in cents (ex: 999 = 9.99€)
  currency: { type: String, default: 'eur' },
  interval: { type: String, enum: ['month', 'year'], default: 'month' },

  // Stripe
  stripePriceId: { type: String },
  stripeProductId: { type: String },

  // Display
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
