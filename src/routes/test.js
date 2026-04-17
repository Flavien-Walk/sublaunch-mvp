const express = require('express');
const router = express.Router();
const { authMiddleware, requireEmailVerified } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const TelegramAccess = require('../models/TelegramAccess');
const User = require('../models/User');
const telegramService = require('../services/telegramService');
const emailService = require('../services/emailService');
const { scheduleExpiration } = require('../services/cronService');
const CreatorProfile = require('../models/CreatorProfile');
const Plan = require('../models/Plan');
const { stripe } = require('../services/stripeService');

/**
 * POST /api/test/free-access
 * Creates a free 1-minute subscription for testing the full Telegram flow.
 * Uses cronService for reliable expiration (not setTimeout).
 */
router.post('/free-access', authMiddleware, requireEmailVerified, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Cancel any existing test subscriptions for this user
    await Subscription.updateMany(
      { userId: user._id, planId: null },
      { status: 'canceled', expiredAt: new Date() }
    );

    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

    const sub = await Subscription.create({
      userId: user._id,
      creatorId: user._id,
      planId: new (require('mongoose').Types.ObjectId)(),
      status: 'active',
      stripeCurrentPeriodStart: new Date(),
      stripeCurrentPeriodEnd: expiresAt,
      subscribedAt: new Date(),
    });

    const groupId = process.env.TELEGRAM_GROUP_ID;
    let inviteLink = null;

    if (groupId && groupId !== 'REPLACE_WITH_YOUR_GROUP_ID') {
      try {
        const result = await telegramService.createInviteLink(groupId);
        inviteLink = result.inviteLink;

        sub.telegramInviteLink = inviteLink;
        sub.telegramInviteLinkExpiry = result.expiresAt;
        sub.telegramAccessActive = true;
        await sub.save();

        await TelegramAccess.create({
          userId: user._id,
          subscriptionId: sub._id,
          creatorId: user._id,
          inviteLink,
          inviteLinkCreatedAt: new Date(),
          inviteLinkExpiresAt: result.expiresAt,
          isActive: true,
        });

        await emailService.sendPaymentSuccessEmail({
          toEmail: user.email,
          firstName: user.firstName,
          planName: 'Pack Test Gratuit (1 min)',
          amount: 0,
          currency: 'eur',
          telegramLink: inviteLink,
          userId: user._id,
        });

        // Schedule expiration via cron service (reliable across restarts)
        scheduleExpiration({
          subscriptionId: sub._id.toString(),
          userId: user._id.toString(),
          groupId,
          expiresAt,
          userEmail: user.email,
          userFirstName: user.firstName,
        });

      } catch (tgErr) {
        console.error('[TEST] Telegram error:', tgErr.message);
      }
    } else {
      console.log('[TEST] Telegram not configured — skipping invite link generation');
    }

    res.json({
      success: true,
      message: 'Accès test créé. Expiration dans 60 secondes.',
      subscription: {
        id: sub._id,
        status: sub.status,
        expiresAt,
      },
      telegramLink: inviteLink,
      telegramConfigured: !!(groupId && groupId !== 'REPLACE_WITH_YOUR_GROUP_ID'),
    });

  } catch (err) {
    console.error('[TEST] free-access error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      userId: req.user._id,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!sub) return res.json({ active: false });

    const secondsLeft = Math.max(0, Math.round((new Date(sub.stripeCurrentPeriodEnd) - Date.now()) / 1000));

    res.json({
      active: secondsLeft > 0,
      telegramLink: sub.telegramInviteLink,
      expiresAt: sub.stripeCurrentPeriodEnd,
      secondsLeft,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test/setup-coccibet
 * One-click setup: creates Coccibet profile + 0€ Stripe plan (2 min access) for the logged-in user.
 * Safe to call multiple times (idempotent).
 */
router.post('/setup-coccibet', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const groupId = process.env.TELEGRAM_GROUP_ID;

    // 1. Upgrade user to creator role
    await User.findByIdAndUpdate(userId, { role: 'creator' });

    // 2. Create / update creator profile
    await CreatorProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        displayName: 'Coccibet',
        slug: 'coccibet',
        bio: 'Groupe privé de pronostics sportifs premium. Accès Telegram immédiat après paiement.',
        serviceName: 'Alertes sportives premium',
        serviceDescription: 'Recevez des alertes en temps réel dans notre groupe Telegram privé.',
        benefits: ['Alertes en temps réel', 'Analyses exclusives', 'Support privé'],
        telegramGroupId: groupId || '',
        telegramGroupName: 'Coccibet Premium',
        isPublished: true,
      },
      { new: true, upsert: true }
    );

    // 3. Reuse existing Stripe price if plan already set up
    let stripePriceId;
    const existingPlan = await Plan.findOne({ creatorId: userId, name: 'Test 2 min — Gratuit' });
    if (existingPlan?.stripePriceId) {
      stripePriceId = existingPlan.stripePriceId;
      console.log('[setup-coccibet] Reusing existing Stripe price:', stripePriceId);
    } else {
      // Create a 0€ Stripe product + recurring price in TEST mode
      const product = await stripe.products.create({
        name: 'Coccibet — Test accès 2 min',
        description: 'Pack test 0€ — accès Telegram 2 minutes',
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 0,
        currency: 'eur',
        recurring: { interval: 'month' },
      });
      stripePriceId = price.id;
      console.log('[setup-coccibet] Created Stripe price:', stripePriceId);
    }

    // 4. Create / update the test plan
    const plan = await Plan.findOneAndUpdate(
      { creatorId: userId, name: 'Test 2 min — Gratuit' },
      {
        creatorId: userId,
        name: 'Test 2 min — Gratuit',
        description: 'Pack test — accès Telegram pendant 2 minutes, puis exclusion automatique par le bot.',
        price: 0,
        currency: 'eur',
        interval: 'month',
        stripePriceId,
        accessDurationValue: 2,
        accessDurationUnit: 'minutes',
        isActive: true,
        isPopular: true,
        features: [
          'Accès Telegram immédiat',
          'Expiration automatique en 2 min',
          'Bot kick automatique à l\'expiration',
        ],
        sortOrder: 0,
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: '✅ Coccibet configuré ! Rendez-vous sur /marketplace pour tester le flow complet.',
      urls: {
        marketplace: `${process.env.FRONTEND_URL}/marketplace`,
        vendorPage:   `${process.env.FRONTEND_URL}/c/coccibet`,
      },
      plan: {
        name:           plan.name,
        price:          '0€',
        stripePriceId:  plan.stripePriceId,
        accessDuration: '2 minutes',
      },
      telegramGroup: groupId || '⚠️ TELEGRAM_GROUP_ID non configuré',
    });

  } catch (err) {
    console.error('[setup-coccibet]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
