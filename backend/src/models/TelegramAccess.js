const mongoose = require('mongoose');

const telegramAccessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Invite link (one-time use)
  inviteLink: { type: String },
  inviteLinkId: { type: String }, // Telegram's invite link name for revocation
  inviteLinkCreatedAt: { type: Date },
  inviteLinkExpiresAt: { type: Date },
  inviteLinkUsed: { type: Boolean, default: false },

  // Group membership
  telegramUserId: { type: String, index: true },
  telegramUsername: { type: String },
  joinedAt: { type: Date },
  removedAt: { type: Date },
  removalReason: { type: String, enum: ['subscription_canceled', 'payment_failed', 'manual', 'expired'] },

  // Status
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('TelegramAccess', telegramAccessSchema);
