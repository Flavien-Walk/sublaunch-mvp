const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requireEmailVerified } = require('../middleware/auth');
const Plan = require('../models/Plan');
const SaasSubscription = require('../models/SaasSubscription');
const { createStripeProduct } = require('../services/stripeService');

async function checkCreatorSaas(userId) {
  const [activeSaas, anySaas] = await Promise.all([
    SaasSubscription.getActiveForUser(userId),
    SaasSubscription.findOne({ userId }),
  ]);
  return !anySaas || !!activeSaas;
}

// GET /api/plans — get plans (for creator's own or all by creatorId query)
router.get('/', async (req, res) => {
  try {
    const { creatorId } = req.query;
    const filter = { isActive: true };
    if (creatorId) filter.creatorId = creatorId;
    const plans = await Plan.find(filter).sort('sortOrder');
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/plans — creator creates a plan
router.post('/', authMiddleware, requireEmailVerified, requireRole('creator'), async (req, res) => {
  try {
    const canCreate = await checkCreatorSaas(req.user._id);
    if (!canCreate) return res.status(403).json({ error: 'Votre abonnement SubLaunch est inactif. Renouvelez-le pour créer des offres.', code: 'SAAS_INACTIVE' });

    const { name, description, features, price, currency, interval, isPopular, sortOrder } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

    // Create Stripe product + price
    let stripePriceId, stripeProductId;
    try {
      const result = await createStripeProduct({ name, description, price, currency: currency || 'eur', interval: interval || 'month' });
      stripePriceId = result.priceId;
      stripeProductId = result.productId;
    } catch (err) {
      console.error('Stripe product creation failed:', err.message);
    }

    const plan = await Plan.create({
      creatorId: req.user._id,
      name, description, features: features || [],
      price, currency: currency || 'eur', interval: interval || 'month',
      stripePriceId, stripeProductId,
      isPopular: isPopular || false,
      sortOrder: sortOrder || 0,
    });

    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/plans/:id
router.patch('/:id', authMiddleware, requireRole('creator'), async (req, res) => {
  try {
    const canEdit = await checkCreatorSaas(req.user._id);
    if (!canEdit) return res.status(403).json({ error: 'Votre abonnement SubLaunch est inactif.', code: 'SAAS_INACTIVE' });

    const plan = await Plan.findOneAndUpdate(
      { _id: req.params.id, creatorId: req.user._id },
      req.body,
      { new: true }
    );
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/plans/:id — soft delete
router.delete('/:id', authMiddleware, requireRole('creator'), async (req, res) => {
  try {
    await Plan.findOneAndUpdate({ _id: req.params.id, creatorId: req.user._id }, { isActive: false });
    res.json({ message: 'Plan deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
