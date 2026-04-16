/**
 * TelegramToken — one-time token for associating a website account with
 * a Telegram user_id via the bot deep-link flow.
 *
 * Flow:
 *   1. User buys/accesses → server creates TelegramToken with unique `token`
 *   2. User sees "Connect Telegram" button → opens t.me/BOT?start=TOKEN
 *   3. Bot receives /start TOKEN → calls POST /api/telegram/link-account
 *   4. Server validates token, stores telegramUserId on User, marks token used
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const telegramTokenSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  token: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(20).toString('hex'),
  },

  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    index: { expireAfterSeconds: 0 }, // MongoDB TTL
  },

  usedAt:         { type: Date },
  telegramUserId: { type: String },  // filled after successful link

  isUsed: { type: Boolean, default: false },
}, { timestamps: true });

telegramTokenSchema.methods.markUsed = function (telegramUserId) {
  this.isUsed = true;
  this.usedAt = new Date();
  this.telegramUserId = String(telegramUserId);
  return this.save();
};

module.exports = mongoose.model('TelegramToken', telegramTokenSchema);
