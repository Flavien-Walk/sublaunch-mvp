/**
 * /api/saas — vendor SaaS subscription management
 * Vendors subscribe to SubLaunch to use the platform.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireEmailVerified } = require('../middleware/auth');
const SaasSubscription = require('../models/SaasSubscription');

// SaaS plan config
const SAAS_PLANS = {
  weekly: {
    price: 3000,           // 30.00€ in cents
    commissionRate: 0.08,  // 8%
    durationDays: 7,
    label: 'Hebdomadaire — 30€/semaine + 8% commission',
  },
  monthly: {
    price: 10000,          // 100.00€ in cents
    commissionRate: 0.02,  // 2%
    durationDays: 30,
    label: 'Mensuel — 100€/mois + 2% commission',
  },
};

// GET /api/saas/plans — public, returns available SaaS plans
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(SAAS_PLANS).map(([key, p]) => ({
      id: key,
      price: p.price,
      priceDisplay: `${(p.price / 100).toFixed(0)}€`,
      commissionRate: p.commissionRate,
      commissionDisplay: `${(p.commissionRate * 100).toFixed(0)}%`,
      label: p.label,
      durationDays: p.durationDays,
    })),
  });
});

// GET /api/saas/my-subscription — get vendor's current SaaS subscription
router.get('/my-subscription', authMiddleware, async (req, res) => {
  try {
    const sub = await SaasSubscription.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 });

    if (!sub) return res.json({ hasSubscription: false });

    const isActive = sub.status === 'active' && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

    res.json({
      hasSubscription: true,
      plan: sub.plan,
      status: sub.status,
      isActive,
      commissionRate: sub.commissionRate,
      commissionDisplay: `${(sub.commissionRate * 100).toFixed(0)}%`,
      currentPeriodEnd: sub.currentPeriodEnd,
      activatedAt: sub.activatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/saas/activate — activate a SaaS subscription (manual/test, not Stripe)
// In production this would be triggered by Stripe webhook; here for testing
router.post('/activate', authMiddleware, requireEmailVerified, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!SAAS_PLANS[plan]) return res.status(400).json({ error: 'Invalid plan. Choose weekly or monthly.' });

    const config = SAAS_PLANS[plan];
    const now = new Date();
    const periodEnd = new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000);

    // Cancel any active subscription first
    await SaasSubscription.updateMany(
      { userId: req.user._id, status: 'active' },
      { status: 'canceled', canceledAt: new Date() }
    );

    const sub = await SaasSubscription.create({
      userId: req.user._id,
      plan,
      commissionRate: config.commissionRate,
      pricePaid: config.price,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      activatedAt: now,
    });

    res.json({
      success: true,
      subscription: {
        id: sub._id,
        plan: sub.plan,
        status: sub.status,
        commissionRate: sub.commissionRate,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware: check if vendor has active SaaS subscription
// Use as: router.post('/some-route', requireActiveSaas, handler)
async function requireActiveSaas(req, res, next) {
  try {
    const sub = await SaasSubscription.getActiveForUser(req.user._id);
    if (!sub) {
      return res.status(403).json({
        error: 'SaaS subscription required',
        code: 'SAAS_INACTIVE',
        message: 'Votre abonnement SubLaunch est inactif. Renouvelez-le pour continuer à vendre.',
      });
    }
    req.saasSubscription = sub;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = router;
module.exports.requireActiveSaas = requireActiveSaas;
module.exports.SAAS_PLANS = SAAS_PLANS;
