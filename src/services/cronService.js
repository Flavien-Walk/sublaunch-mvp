/**
 * cronService — manages subscription expiration using node-cron.
 *
 * Two mechanisms:
 * 1. scheduleExpiration(opts) — schedule a one-shot expiration for a specific sub
 *    (used for short test subscriptions < 5 minutes)
 * 2. startExpirationCron() — runs every minute, picks up all expired subs from DB
 *    (robust, survives server restarts, handles all real subscriptions)
 *
 * The cron is the source of truth. One-shot scheduling is an optimistic fast path
 * for test subs only; the cron will catch anything missed.
 */
const cron = require('node-cron');
const mongoose = require('mongoose');

// Lazy requires to avoid circular deps at module load time
function getModels() {
  const Subscription = require('../models/Subscription');
  const TelegramAccess = require('../models/TelegramAccess');
  const User = require('../models/User');
  const telegramService = require('./telegramService');
  const emailService = require('./emailService');
  return { Subscription, TelegramAccess, User, telegramService, emailService };
}

// Map of subscriptionId → NodeJS.Timeout (for one-shot expiry of test subs)
const pendingTimers = new Map();

/**
 * Expire a single subscription: update DB + remove user from Telegram.
 */
async function expireSubscription(subscriptionId, userId, groupId, userEmail, userFirstName) {
  const { Subscription, TelegramAccess, User, telegramService, emailService } = getModels();

  try {
    const sub = await Subscription.findById(subscriptionId);
    if (!sub || sub.status !== 'active') return; // already handled

    await Subscription.findByIdAndUpdate(subscriptionId, {
      status: 'canceled',
      expiredAt: new Date(),
      telegramAccessActive: false,
    });

    const freshUser = await User.findById(userId);
    if (freshUser?.telegramUserId && groupId) {
      try {
        await telegramService.removeUserFromGroup(groupId, freshUser.telegramUserId);
        console.log(`[cron] Removed Telegram user ${freshUser.telegramUserId} (sub ${subscriptionId})`);
      } catch (tgErr) {
        console.error(`[cron] Telegram removal failed for sub ${subscriptionId}:`, tgErr.message);
      }
    }

    await TelegramAccess.updateMany(
      { subscriptionId },
      { isActive: false, removedAt: new Date(), removalReason: 'expired' }
    );

    if (userEmail) {
      await emailService.sendAccessSuspendedEmail({
        toEmail: userEmail,
        firstName: userFirstName,
        userId,
      }).catch(err => console.error('[cron] email error:', err.message));
    }

    console.log(`[cron] Subscription ${subscriptionId} expired successfully`);
  } catch (err) {
    console.error(`[cron] expireSubscription error for ${subscriptionId}:`, err.message);
  }
}

/**
 * Schedule a one-shot expiration for short-lived test subscriptions.
 * Falls back gracefully if the delay is too far in the future (>10 min → rely on cron).
 */
function scheduleExpiration({ subscriptionId, userId, groupId, expiresAt, userEmail, userFirstName }) {
  const delay = new Date(expiresAt) - Date.now();

  // Only use timer for short delays (≤ 10 minutes). The cron handles the rest.
  if (delay <= 0) {
    // Already expired — process immediately
    setImmediate(() => expireSubscription(subscriptionId, userId, groupId, userEmail, userFirstName));
    return;
  }

  if (delay > 10 * 60 * 1000) {
    console.log(`[cron] Sub ${subscriptionId} expires in ${Math.round(delay / 60000)}min — relying on cron sweep`);
    return;
  }

  // Cancel any previous timer for this sub
  if (pendingTimers.has(subscriptionId)) {
    clearTimeout(pendingTimers.get(subscriptionId));
  }

  const timer = setTimeout(async () => {
    pendingTimers.delete(subscriptionId);
    await expireSubscription(subscriptionId, userId, groupId, userEmail, userFirstName);
  }, delay);

  // Don't prevent Node from exiting
  if (timer.unref) timer.unref();

  pendingTimers.set(subscriptionId, timer);
  console.log(`[cron] Scheduled expiry for sub ${subscriptionId} in ${Math.round(delay / 1000)}s`);
}

/**
 * Start the recurring cron job that sweeps for expired subscriptions every minute.
 * Call once at server startup.
 */
function startExpirationCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    if (mongoose.connection.readyState !== 1) return; // not connected yet

    const { Subscription, User } = getModels();
    const groupId = process.env.TELEGRAM_GROUP_ID;

    try {
      const expired = await Subscription.find({
        status: 'active',
        stripeCurrentPeriodEnd: { $lt: new Date() },
      }).populate('userId', 'email firstName telegramUserId');

      if (expired.length === 0) return;

      console.log(`[cron] Found ${expired.length} expired subscription(s) to process`);

      for (const sub of expired) {
        const user = sub.userId; // populated
        await expireSubscription(
          sub._id.toString(),
          user?._id?.toString(),
          groupId,
          user?.email,
          user?.firstName
        );
      }
    } catch (err) {
      console.error('[cron] sweep error:', err.message);
    }
  });

  // Run every hour: expire vendor SaaS subscriptions whose period has ended
  cron.schedule('0 * * * *', async () => {
    if (mongoose.connection.readyState !== 1) return;

    try {
      const SaasSubscription = require('../models/SaasSubscription');
      const result = await SaasSubscription.updateMany(
        {
          status: 'active',
          currentPeriodEnd: { $lt: new Date() },
        },
        {
          $set: { status: 'expired', expiredAt: new Date() },
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`[cron] Expired ${result.modifiedCount} vendor SaaS subscription(s)`);
      }
    } catch (err) {
      console.error('[cron] SaaS sweep error:', err.message);
    }
  });

  console.log('[cron] Expiration cron started (runs every minute for subs, every hour for SaaS)');
}

module.exports = { scheduleExpiration, startExpirationCron, expireSubscription };
