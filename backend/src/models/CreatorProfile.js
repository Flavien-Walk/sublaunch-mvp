const mongoose = require('mongoose');

const creatorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Public page
  displayName: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  bio: { type: String, maxlength: 500 },
  avatarUrl: { type: String },
  bannerUrl: { type: String },

  // Offer details
  serviceName: { type: String },
  serviceDescription: { type: String },
  benefits: [{ type: String }],

  // Telegram group info
  telegramGroupId: { type: String },
  telegramGroupName: { type: String },
  telegramBotToken: { type: String }, // per-creator bot (optional, uses global if not set)

  // Stats (denormalized for speed)
  totalActiveSubscribers: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },

  // Stripe account (if needed for Connect later)
  stripeAccountId: { type: String },

  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('CreatorProfile', creatorProfileSchema);
