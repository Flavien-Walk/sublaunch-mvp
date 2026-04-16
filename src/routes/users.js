const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');

// GET /api/users/me/subscriptions
router.get('/me/subscriptions', authMiddleware, async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.user._id })
      .populate('planId', 'name price currency interval')
      .populate('creatorId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/me/payments
router.get('/me/payments', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('subscriptionId', 'planId')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/me/become-creator — upgrade client account to creator
router.patch('/me/become-creator', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'creator') return res.json({ role: 'creator' });
    const user = await User.findByIdAndUpdate(req.user._id, { role: 'creator' }, { new: true }).select('-password');
    res.json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isEmailVerified: user.isEmailVerified });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/me — update profile
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, telegramUserId, telegramUsername } = req.body;
    const update = {};
    if (firstName !== undefined) update.firstName = firstName;
    if (lastName !== undefined) update.lastName = lastName;
    if (telegramUserId !== undefined) update.telegramUserId = telegramUserId;
    if (telegramUsername !== undefined) update.telegramUsername = telegramUsername;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, telegramUserId: user.telegramUserId, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
