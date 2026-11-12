const express = require('express');
const AppSettings = require('../models/AppSettings');
const CoinTransaction = require('../models/CoinTransaction');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { creditCoins } = require('../services/coins');

const router = express.Router();

router.get('/rewards', requireAuth, requireAdmin, async (req, res) => {
  res.json(await AppSettings.current());
});

// router.put('/rewards', requireAuth, requireAdmin, async (req, res) => {
//   const { rewardsEnabled, coinsPerRewardedAd, dailyRewardedAdLimit, minSecondsBetweenAds } = req.body;
//   const settings = await AppSettings.current();

//   if (typeof rewardsEnabled === 'boolean') settings.rewardsEnabled = rewardsEnabled;
//   const numbers = { coinsPerRewardedAd, dailyRewardedAdLimit, minSecondsBetweenAds };
//   for (const [field, value] of Object.entries(numbers)) {
//     if (value === undefined) continue;
//     const n = Number(value);
//     if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: `${field} must be a positive number` });
//     settings[field] = Math.floor(n);
//   }
//   await settings.save();
//   res.json(settings);
// });

router.put('/rewards', requireAuth, requireAdmin, async (req, res) => {
  const settings = await AppSettings.current();

  const flags = ['rewardsEnabled', 'adsEnabled', 'bannerAdsEnabled', 'interstitialAdsEnabled', 'chapterGateEnabled', 'smartlinkEnabled', 'testCreditEnabled'];
  for (const flag of flags) {
    if (typeof req.body[flag] === 'boolean') settings[flag] = req.body[flag];
  }

  const numbers = {
    coinsPerRewardedAd: req.body.coinsPerRewardedAd,
    dailyRewardedAdLimit: req.body.dailyRewardedAdLimit,
    minSecondsBetweenAds: req.body.minSecondsBetweenAds,
    smartlinkEveryNChapters: req.body.smartlinkEveryNChapters,
  };
  for (const [field, value] of Object.entries(numbers)) {
    if (value === undefined) continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: `${field} must be a positive number` });
    settings[field] = Math.floor(n);
  }
  if (settings.smartlinkEveryNChapters < 1) settings.smartlinkEveryNChapters = 1;

  if (req.body.smartlinkUrl !== undefined) {
    const raw = String(req.body.smartlinkUrl).trim();
    if (raw) {
      let parsed;
      try {
        parsed = new URL(raw);
      } catch (e) {
        return res.status(400).json({ message: 'The Smartlink URL is not a valid link' });
      }
      if (parsed.protocol !== 'https:') {
        return res.status(400).json({ message: 'The Smartlink URL must start with https://' });
      }
    }
    settings.smartlinkUrl = raw;
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

// POST /api/settings/rewards/grant  { email, coins, note }
router.post('/rewards/grant', requireAuth, requireAdmin, async (req, res) => {
  const { email, coins, note } = req.body;
  const amount = Math.floor(Number(coins));
  if (!email || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Enter an email and a positive number of coins' });
  }
  const user = await User.findOne({ email: email.toLowerCase() }).select('_id');
  if (!user) return res.status(404).json({ message: 'No user with that email' });
  const balance = await creditCoins({ userId: user._id, amount, type: 'admin_adjustment', note: note || 'Granted by admin' });
  res.json({ balance });
});

// GET /api/settings/public
router.get('/public', async (req, res) => {
  const s = await AppSettings.current();
  res.set('Cache-Control', 'no-store');
  res.json({
    bannerAds: s.adsEnabled && s.bannerAdsEnabled,
    interstitialAds: s.adsEnabled && s.interstitialAdsEnabled,
    chapterGate: s.adsEnabled && s.chapterGateEnabled,
    rewardedVideos: s.adsEnabled && s.rewardsEnabled,
    smartlink: s.adsEnabled && s.smartlinkEnabled && s.smartlinkUrl
      ? { url: s.smartlinkUrl, everyNChapters: s.smartlinkEveryNChapters || 1 }
      : null,
  });
});

module.exports = router;