const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const TelegramAccess = require('../models/TelegramAccess');
const telegramService = require('../services/telegramService');
const emailService = require('../services/emailService');

// GET /api/telegram/access — get current Telegram access for user
router.get('/access', authMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id, status: { $in: ['active', 'trialing'] } });
    if (!sub) return res.json({ hasAccess: false });

    const access = await TelegramAccess.findOne({ subscriptionId: sub._id }).sort({ createdAt: -1 });
    res.json({
      hasAccess: true,
      inviteLink: sub.telegramInviteLink,
      inviteLinkExpiry: sub.telegramInviteLinkExpiry,
      telegramAccessActive: sub.telegramAccessActive,
      access,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/telegram/regenerate-link — generate a new invite link
router.post('/regenerate-link', authMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id, status: { $in: ['active', 'trialing'] } });
    if (!sub) return res.status(403).json({ error: 'No active subscription' });

    const groupId = process.env.TELEGRAM_GROUP_ID;
    if (!groupId || groupId === 'REPLACE_WITH_YOUR_GROUP_ID') {
      return res.status(503).json({ error: 'Telegram not configured' });
    }

    // Revoke previous link if exists
    if (sub.telegramInviteLink) {
      await telegramService.revokeInviteLink(groupId, sub.telegramInviteLink);
    }

    const { inviteLink, expiresAt } = await telegramService.createInviteLink(groupId);
    sub.telegramInviteLink = inviteLink;
    sub.telegramInviteLinkExpiry = expiresAt;
    await sub.save();

    await TelegramAccess.create({
      userId: req.user._id,
      subscriptionId: sub._id,
      creatorId: sub.creatorId,
      inviteLink,
      inviteLinkCreatedAt: new Date(),
      inviteLinkExpiresAt: expiresAt,
    });

    // Send by email
    await emailService.sendTelegramLinkEmail({ toEmail: req.user.email, firstName: req.user.firstName, telegramLink: inviteLink, userId: req.user._id });

    res.json({ inviteLink, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/telegram/save-userid — user saves their Telegram user ID
router.patch('/save-userid', authMiddleware, async (req, res) => {
  try {
    const { telegramUserId, telegramUsername } = req.body;
    if (!telegramUserId) return res.status(400).json({ error: 'telegramUserId required' });

    req.user.telegramUserId = telegramUserId;
    req.user.telegramUsername = telegramUsername;
    await req.user.save();

    res.json({ message: 'Telegram info saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
