const express = require('express');
const router = express.Router();
const { stripe, createCheckoutSession, createPortalSession } = require('../services/stripeService');
const { authMiddleware, requireEmailVerified } = require('../middleware/auth');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const User = require('../models/User');
const TelegramAccess = require('../models/TelegramAccess');
const Referral = require('../models/Referral');
const telegramService = require('../services/telegramService');
const emailService = require('../services/emailService');
const SaasSubscription = require('../models/SaasSubscription');

// SaaS plan config (inline to avoid circular require with saas.js)
const SAAS_PLANS = {
  weekly:  { price: 3000,  commissionRate: 0.08, durationDays: 7  },
  monthly: { price: 10000, commissionRate: 0.02, durationDays: 30 },
};

// POST /api/stripe/create-checkout — create a checkout session
router.post('/create-checkout', authMiddleware, requireEmailVerified, async (req, res) => {
  try {
    const { planId, affiliateCode, returnSlug } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId required' });

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) return res.status(404).json({ error: 'Plan introuvable' });
    if (!plan.stripePriceId) return res.status(400).json({ error: 'Ce plan n\'est pas encore configuré pour le paiement' });

    // Block purchase only if vendor has an explicitly expired/canceled SaaS subscription.
    // Vendors with no SaaS record (free MVP phase) are allowed through.
    const [vendorActiveSaas, vendorExpiredSaas] = await Promise.all([
      SaasSubscription.getActiveForUser(plan.creatorId),
      SaasSubscription.findOne({ userId: plan.creatorId, status: { $in: ['canceled', 'expired'] } }),
    ]);
    const vendorCanSell = !!vendorActiveSaas || !vendorExpiredSaas;
    if (!vendorCanSell) {
      return res.status(403).json({
        error: 'Ce vendeur n\'accepte plus de nouveaux abonnements pour le moment.',
        code: 'VENDOR_SAAS_INACTIVE',
      });
    }

    const cancelSlug = returnSlug || '';
    const session = await createCheckoutSession({
      user: req.user,
      plan,
      successUrl: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancelUrl: cancelSlug
        ? `${process.env.FRONTEND_URL}/c/${cancelSlug}?payment=canceled`
        : `${process.env.FRONTEND_URL}/?payment=canceled`,
      affiliateCode,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout]', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

// POST /api/stripe/portal — billing portal
router.post('/portal', authMiddleware, async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) return res.status(400).json({ error: 'No billing account found' });
    const session = await createPortalSession(req.user.stripeCustomerId, `${process.env.FRONTEND_URL}/dashboard/billing`);
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/webhook — Stripe events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ========== WEBHOOK HANDLERS ==========

async function handleCheckoutCompleted(session) {
  // SaaS vendor subscription (vendor paying SubLaunch)
  if (session.metadata?.type === 'saas') {
    return handleSaasCheckoutCompleted(session);
  }

  const { userId, planId, affiliateCode } = session.metadata || {};
  if (!userId || !planId) return;

  const user = await User.findById(userId);
  const plan = await Plan.findById(planId);
  if (!user || !plan) return;

  // Update user stripeCustomerId
  if (!user.stripeCustomerId) {
    user.stripeCustomerId = session.customer;
    await user.save();
  }

  // Get subscription from Stripe
  const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

  // Create or update subscription in DB
  let sub = await Subscription.findOne({ stripeSubscriptionId: session.subscription });
  if (!sub) {
    sub = new Subscription({
      userId,
      creatorId: plan.creatorId,
      planId,
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      stripePriceId: plan.stripePriceId,
      status: 'active',
      stripeCurrentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      stripeCurrentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      affiliateCode,
    });

    // Track affiliate referral
    if (affiliateCode) {
      const referrer = await User.findOne({ affiliateCode });
      if (referrer) {
        sub.referredByUserId = referrer._id;
        const commissionAmount = Math.round(plan.price * (parseInt(process.env.AFFILIATE_COMMISSION_PERCENT) || 20) / 100);
        await Referral.create({
          affiliateUserId: referrer._id,
          referredUserId: userId,
          subscriptionId: sub._id,
          affiliateCode,
          commissionPercent: parseInt(process.env.AFFILIATE_COMMISSION_PERCENT) || 20,
          commissionAmount,
          commissionStatus: 'validated',
          convertedAt: new Date(),
        });
      }
    }

    await sub.save();
  }

  // Generate Telegram invite link
  const groupId = process.env.TELEGRAM_GROUP_ID;
  if (groupId && groupId !== 'REPLACE_WITH_YOUR_GROUP_ID') {
    try {
      const { inviteLink, expiresAt } = await telegramService.createInviteLink(groupId);
      sub.telegramInviteLink = inviteLink;
      sub.telegramInviteLinkExpiry = expiresAt;
      await sub.save();

      await TelegramAccess.create({
        userId,
        subscriptionId: sub._id,
        creatorId: plan.creatorId,
        inviteLink,
        inviteLinkCreatedAt: new Date(),
        inviteLinkExpiresAt: expiresAt,
      });

      // Send email with access
      await emailService.sendPaymentSuccessEmail({
        toEmail: user.email, firstName: user.firstName,
        planName: plan.name, amount: plan.price, currency: plan.currency,
        telegramLink: inviteLink, userId,
      });
    } catch (tgErr) {
      console.error('Telegram invite link error:', tgErr.message);
      await emailService.sendPaymentSuccessEmail({
        toEmail: user.email, firstName: user.firstName,
        planName: plan.name, amount: plan.price, currency: plan.currency,
        telegramLink: null, userId,
      });
    }
  } else {
    await emailService.sendPaymentSuccessEmail({
      toEmail: user.email, firstName: user.firstName,
      planName: plan.name, amount: plan.price, currency: plan.currency,
      telegramLink: null, userId,
    });
  }
}

async function handleInvoicePaid(invoice) {
  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSubId });
  if (!sub) return;

  // Record payment
  await Payment.create({
    userId: sub.userId,
    creatorId: sub.creatorId,
    subscriptionId: sub._id,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    invoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    paidAt: new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()),
  });

  // Re-activate if was past_due
  if (sub.status === 'past_due') {
    sub.status = 'active';
    sub.telegramAccessActive = true;
    await sub.save();
  }
}

async function handleInvoicePaymentFailed(invoice) {
  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSubId }).populate('userId');
  if (!sub) return;

  sub.status = 'past_due';
  await sub.save();

  await Payment.create({
    userId: sub.userId,
    creatorId: sub.creatorId,
    subscriptionId: sub._id,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    failedAt: new Date(),
  });

  const user = await User.findById(sub.userId);
  if (user) {
    const plan = await Plan.findById(sub.planId);
    await emailService.sendPaymentFailedEmail({ toEmail: user.email, firstName: user.firstName, planName: plan?.name || 'votre abonnement', userId: user._id });
  }
}

async function handleSubscriptionUpdated(stripeSub) {
  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!sub) return;

  sub.status = stripeSub.status;
  sub.stripeCurrentPeriodStart = new Date(stripeSub.current_period_start * 1000);
  sub.stripeCurrentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

  if (stripeSub.cancel_at_period_end) {
    sub.canceledAt = new Date();
  }

  await sub.save();
}

async function handleSubscriptionDeleted(stripeSub) {
  const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
  if (!sub) return;

  sub.status = 'canceled';
  sub.expiredAt = new Date();
  sub.telegramAccessActive = false;
  await sub.save();

  const user = await User.findById(sub.userId);
  const plan = await Plan.findById(sub.planId);

  // Remove from Telegram group
  if (user?.telegramUserId) {
    const groupId = process.env.TELEGRAM_GROUP_ID;
    if (groupId && groupId !== 'REPLACE_WITH_YOUR_GROUP_ID') {
      await telegramService.removeUserFromGroup(groupId, user.telegramUserId);
      await TelegramAccess.updateMany({ subscriptionId: sub._id }, { isActive: false, removedAt: new Date(), removalReason: 'subscription_canceled' });
    }
  }

  if (user) {
    await emailService.sendSubscriptionCanceledEmail({ toEmail: user.email, firstName: user.firstName, planName: plan?.name || 'votre abonnement', userId: user._id });
  }
}

async function handleSaasCheckoutCompleted(session) {
  const { userId, saasPlan } = session.metadata || {};
  if (!userId || !saasPlan) return;

  const config = SAAS_PLANS[saasPlan];
  if (!config) return;

  try {
    const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
    const now = new Date();

    // Cancel any existing active SaaS sub for this vendor
    await SaasSubscription.updateMany(
      { userId, status: 'active' },
      { status: 'canceled', canceledAt: now }
    );

    await SaasSubscription.create({
      userId,
      plan: saasPlan,
      commissionRate: config.commissionRate,
      pricePaid: config.price,
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      status: 'active',
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      activatedAt: now,
    });

    console.log(`[saas] Activated ${saasPlan} subscription for user ${userId}`);
  } catch (err) {
    console.error('[saas] handleSaasCheckoutCompleted error:', err.message);
  }
}

module.exports = router;
