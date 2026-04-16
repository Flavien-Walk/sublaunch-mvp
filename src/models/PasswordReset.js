const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
