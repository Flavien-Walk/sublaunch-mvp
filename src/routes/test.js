const express = require('express');
const router = express.Router();
const { authMiddleware, requireEmailVerified } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const TelegramAccess = require('../models/TelegramAccess');
const User = require('../models/User');
const telegramService = require('../services/telegramService');
const emailService = require('../services/emailService');

/**
 * POST /api/test/free-access
 * Creates a free 1-minute subscription for testing purposes.
 * - Generates a real Telegram invite link
 * - Removes the user from the group after 60 seconds
 * - No Stripe payment required
 */
router.post('/free-access', authMiddleware, requireEmailVerified, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Cancel any existing test subscription for this user
    await Subscription.updateMany(
      { userId: user._id, planId: null },
      { status: 'canceled', expiredAt: new Date() }
    );

    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

    // Create subscription directly in DB (no Stripe)
    const sub = await Subscription.create({
      userId: user._id,
      creatorId: user._id, // self for test
      planId: new (require('mongoose').Types.ObjectId)(), // fake planId
      status: 'active',
      stripeCurrentPeriodStart: new Date(),
      stripeCurrentPeriodEnd: expiresAt,
      subscribedAt: new Date(),
    });

    // Generate Telegram invite link
    const groupId = process.env.TELEGRAM_GROUP_ID;
    let inviteLink = null;
    let telegramAccess = null;

    if (groupId && groupId !== 'REPLACE_WITH_YOUR_GROUP_ID') {
      try {
        const result = await telegramService.createInviteLink(groupId);
        inviteLink = result.inviteLink;

        sub.telegramInviteLink = inviteLink;
        sub.telegramInviteLinkExpiry = result.expiresAt;
        sub.telegramAccessActive = true;
        await sub.save();

        telegramAccess = await TelegramAccess.create({
          userId: user._id,
          subscriptionId: sub._id,
          creatorId: user._id,
          inviteLink,
          inviteLinkCreatedAt: new Date(),
          inviteLinkExpiresAt: result.expiresAt,
          isActive: true,
        });

        // Send email with the link
        await emailService.sendPaymentSuccessEmail({
          toEmail: user.email,
          firstName: user.firstName,
          planName: 'Pack Test Gratuit (1 min)',
          amount: 0,
          currency: 'eur',
          telegramLink: inviteLink,
          userId: user._id,
        });

        // ⏱ Schedule removal after 60 seconds
        setTimeout(async () => {
          try {
            console.log(`[TEST] Removing user ${user._id} from Telegram after 1 min...`);

            // Update subscription status
            await Subscription.findByIdAndUpdate(sub._id, {
              status: 'canceled',
              expiredAt: new Date(),
              telegramAccessActive: false,
            });

            // Remove from Telegram if we have their user ID
            const freshUser = await User.findById(user._id);
            if (freshUser?.telegramUserId) {
              await telegramService.removeUserFromGroup(groupId, freshUser.telegramUserId);
              console.log(`[TEST] User ${freshUser.telegramUserId} removed from Telegram group`);
            }

            // Update TelegramAccess record
            await TelegramAccess.updateMany(
              { subscriptionId: sub._id },
              { isActive: false, removedAt: new Date(), removalReason: 'expired' }
            );

            // Send suspension email
            await emailService.sendAccessSuspendedEmail({
              toEmail: user.email,
              firstName: user.firstName,
              userId: user._id,
            });

            console.log(`[TEST] Access expired for user ${user._id}`);
          } catch (err) {
            console.error('[TEST] Error during scheduled removal:', err.message);
          }
        }, 60 * 1000);

      } catch (tgErr) {
        console.error('[TEST] Telegram error:', tgErr.message);
        // Continue without Telegram link
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
 * Check the status of the test subscription
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      userId: req.user._id,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!sub) {
      return res.json({ active: false });
    }

    const secondsLeft = Math.max(0, Math.round((new Date(sub.stripeCurrentPeriodEnd) - Date.now()) / 1000));

    res.json({
      active: true,
      telegramLink: sub.telegramInviteLink,
      expiresAt: sub.stripeCurrentPeriodEnd,
      secondsLeft,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
