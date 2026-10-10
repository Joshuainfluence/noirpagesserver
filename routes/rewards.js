const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const AppSettings = require('../models/AppSettings');
const CoinTransaction = require('../models/CoinTransaction');
const ChapterUnlock = require('../models/ChapterUnlock');
const Chapter = require('../models/Chapter');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { creditCoins, withSession } = require('../services/coins');
const { isPremiumChapter } = require('../services/premium');

const router = express.Router();

// ---- AdMob server-side verification -------------------------------------
const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
let keyCache = { keys: null, at: 0 };

async function getKeys(force = false) {
  if (!force && keyCache.keys && Date.now() - keyCache.at < 6 * 3600 * 1000) return keyCache.keys;
  const res = await fetch(KEYS_URL);
  if (!res.ok) throw new Error('Could not fetch AdMob verifier keys');
  const json = await res.json();
  keyCache = { keys: json.keys, at: Date.now() };
  return keyCache.keys;
}

async function isValidSignature(rawQuery, signature, keyId) {
  let keys = await getKeys();
  let key = keys.find((k) => String(k.keyId) === String(keyId));
  if (!key) {
    keys = await getKeys(true); // keys rotate, so refresh once
    key = keys.find((k) => String(k.keyId) === String(keyId));
  }
  if (!key) return false;

  const cut = rawQuery.indexOf('&signature=');
  if (cut === -1) return false;
  const signedPart = rawQuery.substring(0, cut); // everything before signature and key_id
  const sig = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  const verifier = crypto.createVerify('SHA256');
  verifier.update(signedPart);
  return verifier.verify(key.pem, sig);
}

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// GET /api/rewards/ssv  (called by Google's servers, not by the app)
router.get('/ssv', async (req, res) => {
  try {
        console.log('SSV callback', {
      user_id: req.query.user_id,
      custom_data: req.query.custom_data,
      transaction_id: req.query.transaction_id,
    });
    const rawQuery = req.originalUrl.split('?')[1] || '';
    const { signature, key_id, user_id, transaction_id, custom_data } = req.query;
    if (!signature || !key_id || !transaction_id) return res.status(400).send('bad request');
    if (!(await isValidSignature(rawQuery, signature, key_id))) 
              console.log('SSV signature check failed');
        return res.status(403).send('invalid signature');

    // Only the "Watch & earn" button pays coins. Other rewarded ads are ignored here.
    if (custom_data !== 'earn' || !mongoose.isValidObjectId(user_id)) return res.status(200).send('ignored');

    const settings = await AppSettings.current();
    if (!settings.rewardsEnabled || settings.coinsPerRewardedAd <= 0) return res.status(200).send('rewards off');

    const watchedToday = await CoinTransaction.countDocuments({
      user: user_id, type: 'ad_reward', createdAt: { $gte: startOfTodayUtc() },
    });
    if (watchedToday >= settings.dailyRewardedAdLimit) return res.status(200).send('daily limit');

    const last = await CoinTransaction.findOne({ user: user_id, type: 'ad_reward' }).sort({ createdAt: -1 }).select('createdAt');
    if (last && Date.now() - last.createdAt.getTime() < settings.minSecondsBetweenAds * 1000) {
      return res.status(200).send('too soon');
    }

    try {
      await creditCoins({
        userId: user_id,
        amount: settings.coinsPerRewardedAd, // the admin's value, never a value sent by the app
        type: 'ad_reward',
        reference: transaction_id,
      });
    } catch (err) {
      if (err.code !== 11000) throw err; // duplicate transaction id = already credited
    }
    res.status(200).send('ok');
  } catch (err) {
    console.error('SSV error', err);
    res.status(500).send('error');
  }
});

// ---- Wallet --------------------------------------------------------------
// GET /api/rewards/wallet
router.get('/wallet', requireAuth, async (req, res) => {
  const [user, settings] = await Promise.all([
    User.findById(req.user.id).select('coins lifetimeCoins'),
    AppSettings.current(),
  ]);
  if (!user) return res.status(404).json({ message: 'Account not found' });

  const watchedToday = await CoinTransaction.countDocuments({
    user: req.user.id, type: 'ad_reward', createdAt: { $gte: startOfTodayUtc() },
  });
  const last = await CoinTransaction.findOne({ user: req.user.id, type: 'ad_reward' }).sort({ createdAt: -1 }).select('createdAt');
  const history = await CoinTransaction.find({ user: req.user.id })
    .sort({ createdAt: -1 }).limit(30).select('type amount balanceAfter note createdAt');

  res.json({
    coins: user.coins,
    lifetimeCoins: user.lifetimeCoins,
    rewardsEnabled: settings.rewardsEnabled,
    coinsPerAd: settings.coinsPerRewardedAd,
    dailyLimit: settings.dailyRewardedAdLimit,
    adsLeftToday: Math.max(0, settings.dailyRewardedAdLimit - watchedToday),
    nextAdAt: last ? new Date(last.createdAt.getTime() + settings.minSecondsBetweenAds * 1000) : null,
    history,
  });
});

// POST /api/rewards/unlock/:chapterId
router.post('/unlock/:chapterId', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.chapterId)) return res.status(400).json({ message: 'Bad chapter id' });
  const chapter = await Chapter.findById(req.params.chapterId).populate('story');
  if (!chapter || !chapter.isPublished || !chapter.story || !chapter.story.isPublished) {
    return res.status(404).json({ message: 'Chapter not found' });
  }
  const story = chapter.story;
  if (!isPremiumChapter(story, chapter)) return res.json({ unlocked: true });
  if (await ChapterUnlock.exists({ user: req.user.id, chapter: chapter._id })) return res.json({ unlocked: true });

  const price = story.chapterCoinPrice;
  try {
    const coins = await withSession(async (session) => {
      const user = await User.findOneAndUpdate(
        { _id: req.user.id, coins: { $gte: price } },
        { $inc: { coins: -price } },
        { new: true, session }
      );
      if (!user) {
        const err = new Error('Not enough coins');
        err.insufficient = true;
        throw err;
      }
      await ChapterUnlock.create([{ user: req.user.id, chapter: chapter._id, story: story._id, coins: price }], { session });
      await CoinTransaction.create([{
        user: req.user.id, type: 'chapter_unlock', amount: -price, balanceAfter: user.coins,
        reference: String(chapter._id), note: `${story.title}, chapter ${chapter.order}`,
      }], { session });
      return user.coins;
    });
    res.json({ unlocked: true, coins });
  } catch (err) {
    if (err.insufficient) return res.status(402).json({ message: 'Not enough coins', needed: price });
    if (err.code === 11000) return res.json({ unlocked: true });
    throw err;
  }
});

// POST /api/rewards/dev-credit
// TESTING ONLY: Google's sample ads never trigger the verification callback.
// Disabled unless ALLOW_DEV_REWARDS=true is set on the server.
router.post('/dev-credit', requireAuth, async (req, res) => {
  if (process.env.ALLOW_DEV_REWARDS !== 'true') return res.status(404).json({ message: 'Not found' });

  const settings = await AppSettings.current();
  if (!settings.rewardsEnabled || settings.coinsPerRewardedAd <= 0) {
    return res.status(400).json({ message: 'Video rewards are turned off in the admin settings' });
  }
  const watchedToday = await CoinTransaction.countDocuments({
    user: req.user.id, type: 'ad_reward', createdAt: { $gte: startOfTodayUtc() },
  });
  if (watchedToday >= settings.dailyRewardedAdLimit) {
    return res.status(429).json({ message: 'Daily video limit reached' });
  }
  const last = await CoinTransaction.findOne({ user: req.user.id, type: 'ad_reward' }).sort({ createdAt: -1 }).select('createdAt');
  if (last && Date.now() - last.createdAt.getTime() < settings.minSecondsBetweenAds * 1000) {
    return res.status(429).json({ message: 'Please wait a moment before the next video' });
  }

  const coins = await creditCoins({
    userId: req.user.id,
    amount: settings.coinsPerRewardedAd,
    type: 'ad_reward',
    reference: `dev-${req.user.id}-${Date.now()}`,
  });
  res.json({ coins });
});

module.exports = router;