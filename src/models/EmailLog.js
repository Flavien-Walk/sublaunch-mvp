const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  toEmail: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'verification_code', 'welcome', 'password_reset', 'password_changed',
      'payment_success', 'payment_failed', 'subscription_canceled',
      'telegram_access', 'access_suspended', 'invoice', 'crm_manual',
    ],
    required: true,
  },
  subject: { type: String },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  brevoMessageId: { type: String },
  error: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);
