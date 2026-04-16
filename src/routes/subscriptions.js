const express = require('express');
const router = express.Router();
const { authMiddleware, requireEmailVerified } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const { cancelSubscription } = require('../services/stripeService');

// GET /api/subscriptions/active — get user's active subscription
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id, status: { $in: ['active', 'trialing', 'past_due'] } })
      .populate('planId', 'name price currency interval')
      .populate('creatorId', 'firstName lastName');
    res.json(sub || null);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/subscriptions/:id/cancel — cancel at period end
router.post('/:id/cancel', authMiddleware, requireEmailVerified, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (!sub.stripeSubscriptionId) return res.status(400).json({ error: 'No Stripe subscription found' });

    await cancelSubscription(sub.stripeSubscriptionId);
    sub.canceledAt = new Date();
    await sub.save();

    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
