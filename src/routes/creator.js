const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requireEmailVerified } = require('../middleware/auth');
const CreatorProfile = require('../models/CreatorProfile');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Referral = require('../models/Referral');
const SaasSubscription = require('../models/SaasSubscription');
const emailService = require('../services/emailService');

const creatorOnly = [authMiddleware, requireEmailVerified, requireRole('creator')];

// GET /api/creator/profile — get own profile
router.get('/profile', ...creatorOnly, async (req, res) => {
  try {
    const profile = await CreatorProfile.findOne({ userId: req.user._id });
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/creator/profile — create/update profile
router.put('/profile', ...creatorOnly, async (req, res) => {
  try {
    const { displayName, slug, bio, serviceName, serviceDescription, benefits, telegramGroupId, telegramGroupName, isPublished } = req.body;
    if (slug) {
      const existing = await CreatorProfile.findOne({ slug, userId: { $ne: req.user._id } });
      if (existing) return res.status(409).json({ error: 'Slug already taken' });
    }
    const profile = await CreatorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { userId: req.user._id, displayName, slug, bio, serviceName, serviceDescription, benefits, telegramGroupId, telegramGroupName, isPublished },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creator/dashboard — stats overview
router.get('/dashboard', ...creatorOnly, async (req, res) => {
  try {
    const [active, paused, canceled, payments, referrals] = await Promise.all([
      Subscription.countDocuments({ creatorId: req.user._id, status: 'active' }),
      Subscription.countDocuments({ creatorId: req.user._id, status: 'past_due' }),
      Subscription.countDocuments({ creatorId: req.user._id, status: 'canceled' }),
      Payment.aggregate([
        { $match: { creatorId: req.user._id, status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Referral.countDocuments({ affiliateUserId: req.user._id }),
    ]);

    const totalRevenue = payments[0]?.total || 0;

    // MRR: sum of active subscriptions * plan price
    const activeSubs = await Subscription.find({ creatorId: req.user._id, status: 'active' }).populate('planId', 'price interval');
    const mrr = activeSubs.reduce((acc, sub) => {
      const price = sub.planId?.price || 0;
      const interval = sub.planId?.interval || 'month';
      return acc + (interval === 'year' ? Math.round(price / 12) : price);
    }, 0);

    res.json({ active, paused, canceled, totalRevenue, mrr, referrals });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/creator/subscribers — CRM list
router.get('/subscribers', ...creatorOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { creatorId: req.user._id };
    if (status) filter.status = status;

    const subs = await Subscription.find(filter)
      .populate('userId', 'email firstName lastName telegramUserId telegramUsername')
      .populate('planId', 'name price currency interval')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(filter);
    res.json({ data: subs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/creator/subscribers/:id — single subscriber
router.get('/subscribers/:id', ...creatorOnly, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, creatorId: req.user._id })
      .populate('userId', 'email firstName lastName telegramUserId telegramUsername affiliateCode')
      .populate('planId', 'name price currency interval');
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });

    const payments = await Payment.find({ subscriptionId: sub._id }).sort({ createdAt: -1 }).limit(10);
    res.json({ subscription: sub, payments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/creator/subscribers/:id/notes — add CRM note
router.patch('/subscribers/:id/notes', ...creatorOnly, async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, creatorId: req.user._id },
      { notes: req.body.notes },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/creator/subscribers/:id/email — send manual CRM email
router.post('/subscribers/:id/email', ...creatorOnly, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });

    const sub = await Subscription.findOne({ _id: req.params.id, creatorId: req.user._id }).populate('userId', 'email firstName');
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });

    await emailService.sendCrmManualEmail({ toEmail: sub.userId.email, firstName: sub.userId.firstName, subject, message, userId: sub.userId._id });
    res.json({ message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/creator/affiliates — affiliate stats
router.get('/affiliates', ...creatorOnly, async (req, res) => {
  try {
    const referrals = await Referral.find({ affiliateUserId: req.user._id })
      .populate('referredUserId', 'email firstName lastName')
      .populate('subscriptionId', 'status planId')
      .sort({ createdAt: -1 });
    const total = referrals.reduce((acc, r) => acc + r.commissionAmount, 0);
    res.json({ referrals, totalCommissions: total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/creator/public/:slug — public page data (no auth needed)
router.get('/public/:slug', async (req, res) => {
  try {
    const profile = await CreatorProfile.findOne({ slug: req.params.slug, isPublished: true });
    if (!profile) return res.status(404).json({ error: 'Page not found' });

    const plans = await Plan.find({ creatorId: profile.userId, isActive: true }).sort('sortOrder');

    // canPurchase: true unless vendor has an explicitly expired/canceled SaaS subscription.
    // Vendors with no SaaS record at all are treated as active (free MVP phase).
    const [activeSaas, expiredSaas] = await Promise.all([
      SaasSubscription.getActiveForUser(profile.userId),
      SaasSubscription.findOne({ userId: profile.userId, status: { $in: ['canceled', 'expired'] } }),
    ]);
    const canPurchase = !!activeSaas || !expiredSaas;

    res.json({ profile, plans, canPurchase });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/creator/list — list all published creators (for marketplace)
router.get('/list', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const profiles = await CreatorProfile.find({ isPublished: true })
      .select('displayName slug bio serviceName serviceDescription benefits')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // For each creator, get their active plans count + check SaaS status
    const results = await Promise.all(profiles.map(async (profile) => {
      const [plans, activeSaas, expiredSaas] = await Promise.all([
        Plan.find({ creatorId: profile.userId, isActive: true }).select('name price currency interval accessDurationValue accessDurationUnit isPopular').sort('sortOrder').limit(3),
        SaasSubscription.getActiveForUser(profile.userId),
        SaasSubscription.findOne({ userId: profile.userId, status: { $in: ['canceled', 'expired'] } }),
      ]);
      return {
        profile,
        plans,
        canPurchase: !!activeSaas || !expiredSaas,
      };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
