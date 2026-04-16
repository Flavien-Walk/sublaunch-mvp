const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const TelegramAccess = require('../models/TelegramAccess');
const TelegramToken = require('../models/TelegramToken');
const User = require('../models/User');
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
      telegramLinked: !!req.user.telegramUserId,
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

    await emailService.sendTelegramLinkEmail({
      toEmail: req.user.email,
      firstName: req.user.firstName,
      telegramLink: inviteLink,
      userId: req.user._id,
    });

    res.json({ inviteLink, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/generate-link-token — generate a deep-link token for account linking
// Called after purchase; returns a URL like t.me/BOT?start=TOKEN
router.post('/generate-link-token', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    // Invalidate any existing unused tokens for this user
    await TelegramToken.updateMany(
      { userId: req.user._id, isUsed: false },
      { isUsed: true, usedAt: new Date() }
    );

    const tgToken = await TelegramToken.create({
      userId: req.user._id,
      subscriptionId: subscriptionId || undefined,
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=${tgToken.token}`
      : null;

    res.json({
      token: tgToken.token,
      deepLink,
      expiresAt: tgToken.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/link-account — called by the bot when user sends /start TOKEN
// This is an internal endpoint; secured by a shared bot secret
router.post('/link-account', async (req, res) => {
  const botSecret = req.headers['x-bot-secret'];
  if (!botSecret || botSecret !== process.env.TELEGRAM_BOT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { token, telegramUserId, telegramUsername } = req.body;
  if (!token || !telegramUserId) {
    return res.status(400).json({ error: 'token and telegramUserId required' });
  }

  try {
    const tgToken = await TelegramToken.findOne({ token, isUsed: false });
    if (!tgToken) return res.status(404).json({ error: 'Token invalid or already used' });
    if (tgToken.expiresAt < new Date()) return res.status(410).json({ error: 'Token expired' });

    // Check if this telegramUserId is already linked to another account
    const existingUser = await User.findOne({ telegramUserId: String(telegramUserId) });
    if (existingUser && String(existingUser._id) !== String(tgToken.userId)) {
      return res.status(409).json({ error: 'This Telegram account is already linked to another user' });
    }

    // Link the accounts
    await User.findByIdAndUpdate(tgToken.userId, {
      telegramUserId: String(telegramUserId),
      telegramUsername: telegramUsername || undefined,
    });

    await tgToken.markUsed(telegramUserId);

    // If there's a subscription, trigger Telegram invite link now
    if (tgToken.subscriptionId) {
      const sub = await Subscription.findById(tgToken.subscriptionId);
      const groupId = process.env.TELEGRAM_GROUP_ID;
      if (sub && sub.status === 'active' && groupId) {
        try {
          const { inviteLink, expiresAt } = await telegramService.createInviteLink(groupId);
          sub.telegramInviteLink = inviteLink;
          sub.telegramInviteLinkExpiry = expiresAt;
          sub.telegramAccessActive = true;
          await sub.save();

          // Notify user by Telegram message via bot
          const bot = telegramService.getBot?.();
          if (bot) {
            await bot.sendMessage(
              telegramUserId,
              `✅ Compte lié avec succès !\n\n🔗 Voici votre lien d'accès au groupe :\n${inviteLink}\n\n⚠️ Ce lien est personnel et à usage unique.`
            );
          }
        } catch (tgErr) {
          console.error('[link-account] Telegram invite error:', tgErr.message);
        }
      }
    }

    res.json({ success: true, message: 'Account linked successfully' });
  } catch (err) {
    console.error('[link-account] error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/telegram/link-status — check if user has linked Telegram
router.get('/link-status', authMiddleware, async (req, res) => {
  res.json({
    linked: !!req.user.telegramUserId,
    telegramUsername: req.user.telegramUsername || null,
  });
});

// PATCH /api/telegram/save-userid — legacy endpoint (kept for compatibility)
router.patch('/save-userid', authMiddleware, async (req, res) => {
  try {
    const { telegramUserId, telegramUsername } = req.body;
    if (!telegramUserId) return res.status(400).json({ error: 'telegramUserId required' });

    req.user.telegramUserId = String(telegramUserId);
    req.user.telegramUsername = telegramUsername;
    await req.user.save();

    res.json({ message: 'Telegram info saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
