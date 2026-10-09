const express = require('express');
const AppSettings = require('../models/AppSettings');
const CoinTransaction = require('../models/CoinTransaction');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/rewards', requireAuth, requireAdmin, async (req, res) => {
  res.json(await AppSettings.current());
});

router.put('/rewards', requireAuth, requireAdmin, async (req, res) => {
  const { rewardsEnabled, coinsPerRewardedAd, dailyRewardedAdLimit, minSecondsBetweenAds } = req.body;
  const settings = await AppSettings.current();

  if (typeof rewardsEnabled === 'boolean') settings.rewardsEnabled = rewardsEnabled;
  const numbers = { coinsPerRewardedAd, dailyRewardedAdLimit, minSecondsBetweenAds };
  for (const [field, value] of Object.entries(numbers)) {
    if (value === undefined) continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: `${field} must be a positive number` });
    settings[field] = Math.floor(n);
  }
  await settings.save();
  res.json(settings);
});

router.get('/rewards/stats', requireAuth, requireAdmin, async (req, res) => {
  const [earned] = await CoinTransaction.aggregate([
    { $match: { type: 'ad_reward' } },
    { $group: { _id: null, coins: { $sum: '$amount' }, views: { $sum: 1 } } },
  ]);
  const [spent] = await CoinTransaction.aggregate([
    { $match: { type: 'chapter_unlock' } },
    { $group: { _id: null, coins: { $sum: { $multiply: ['$amount', -1] } } } },
  ]);
  const [held] = await User.aggregate([{ $group: { _id: null, coins: { $sum: '$coins' } } }]);
  res.json({
    rewardedViews: earned?.views || 0,
    coinsIssued: earned?.coins || 0,
    coinsSpent: spent?.coins || 0,
    coinsHeldByUsers: held?.coins || 0,
  });
});

module.exports = router;