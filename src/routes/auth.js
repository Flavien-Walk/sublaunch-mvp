const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const EmailVerificationCode = require('../models/EmailVerificationCode');
const PasswordReset = require('../models/PasswordReset');
const AffiliateLink = require('../models/AffiliateLink');
const emailService = require('../services/emailService');
const { authMiddleware } = require('../middleware/auth');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, affiliateCode, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const userRole = role === 'creator' ? 'creator' : 'client';
    const user = new User({ email, password, firstName, lastName, role: userRole });
    user.generateAffiliateCode();

    // Track referral
    if (affiliateCode) {
      const referrer = await User.findOne({ affiliateCode });
      if (referrer) user.referredBy = referrer._id;
    }

    await user.save();

    // Create affiliate link record
    await AffiliateLink.create({
      userId: user._id,
      code: user.affiliateCode,
      creatorId: user._id, // self for now; can be linked to a creator later
    });

    // Send verification code
    const code = generateVerificationCode();
    await EmailVerificationCode.create({
      userId: user._id,
      email: user.email,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });
    await emailService.sendVerificationCode({ toEmail: user.email, firstName, code, userId: user._id });

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, firstName, lastName, role: user.role, isEmailVerified: false },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const record = await EmailVerificationCode.findOne({
      userId: req.user._id,
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

    record.used = true;
    await record.save();
    req.user.isEmailVerified = true;
    await req.user.save();

    await emailService.sendWelcomeEmail({ toEmail: req.user.email, firstName: req.user.firstName, userId: req.user._id });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authMiddleware, async (req, res) => {
  try {
    if (req.user.isEmailVerified) return res.status(400).json({ error: 'Email already verified' });
    await EmailVerificationCode.deleteMany({ userId: req.user._id });
    const code = generateVerificationCode();
    await EmailVerificationCode.create({
      userId: req.user._id, email: req.user.email, code, expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await emailService.sendVerificationCode({ toEmail: req.user.email, firstName: req.user.firstName, code, userId: req.user._id });
    res.json({ message: 'Verification code resent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ error: 'Account disabled' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isEmailVerified: user.isEmailVerified },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    await PasswordReset.deleteMany({ userId: user._id });
    const token = PasswordReset.generateToken();
    await PasswordReset.create({ userId: user._id, token, expiresAt: new Date(Date.now() + 3600 * 1000) });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail({ toEmail: user.email, firstName: user.firstName, resetLink, userId: user._id });

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid token and password (min 8 chars) required' });
    }

    const record = await PasswordReset.findOne({ token, used: false, expiresAt: { $gt: new Date() } });
    if (!record) return res.status(400).json({ error: 'Invalid or expired token' });

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = password;
    await user.save();
    record.used = true;
    await record.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const u = req.user;
  res.json({ id: u._id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isEmailVerified: u.isEmailVerified, affiliateCode: u.affiliateCode });
});

module.exports = router;
