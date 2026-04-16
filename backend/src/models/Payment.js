const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  // Stripe
  stripeInvoiceId: { type: String, sparse: true },
  stripePaymentIntentId: { type: String, sparse: true },
  stripeChargeId: { type: String, sparse: true },

  amount: { type: Number, required: true }, // in cents
  currency: { type: String, default: 'eur' },
  status: { type: String, enum: ['succeeded', 'failed', 'pending', 'refunded'], required: true },

  // Invoice details
  invoiceUrl: { type: String },
  invoicePdf: { type: String },

  paidAt: { type: Date },
  failedAt: { type: Date },
  failureReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
