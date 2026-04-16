const express = require('express');
const router = express.Router();
const { authMiddleware, requireEmailVerified } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const TelegramAccess = require('../models/TelegramAccess');
const User = require('../models/User');
const telegramService = require('../services/telegramService');
const emailService = require('../services/emailService');
const { scheduleExpiration } = require('../services/cronService');

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

module.exports = router;
