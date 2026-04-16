const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['creator', 'client'], default: 'client' },
  isEmailVerified: { type: Boolean, default: false },

  // Profile
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  avatarUrl: { type: String },

  // Stripe
  stripeCustomerId: { type: String, sparse: true },

  // Telegram
  telegramUserId: { type: String, sparse: true },
  telegramUsername: { type: String },

  // Affiliate
  affiliateCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Status
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generate affiliate code
userSchema.methods.generateAffiliateCode = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  this.affiliateCode = code;
  return code;
};

module.exports = mongoose.model('User', userSchema);
