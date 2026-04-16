const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const AffiliateLink = require('../models/AffiliateLink');
const Referral = require('../models/Referral');

// GET /api/affiliate/stats — get current user's affiliate stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const link = await AffiliateLink.findOne({ userId: req.user._id });
    const referrals = await Referral.find({ affiliateUserId: req.user._id })
      .populate('referredUserId', 'email firstName lastName createdAt')
      .populate('subscriptionId', 'status planId')
      .sort({ createdAt: -1 });

    const pendingCommissions = referrals.filter(r => r.commissionStatus === 'pending').reduce((acc, r) => acc + r.commissionAmount, 0);
    const validatedCommissions = referrals.filter(r => r.commissionStatus === 'validated').reduce((acc, r) => acc + r.commissionAmount, 0);

    res.json({
      affiliateCode: req.user.affiliateCode,
      affiliateLink: `${process.env.FRONTEND_URL}?ref=${req.user.affiliateCode}`,
      stats: {
        totalClicks: link?.totalClicks || 0,
        totalSignups: link?.totalSignups || 0,
        totalConversions: link?.totalConversions || 0,
        pendingCommissions,
        validatedCommissions,
        totalEarned: link?.totalCommissionsEarned || 0,
      },
      referrals,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/affiliate/click — track a click (called from frontend on page load with ref param)
router.post('/click', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ ok: true });
    await AffiliateLink.findOneAndUpdate({ code }, { $inc: { totalClicks: 1 } });
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

module.exports = router;
