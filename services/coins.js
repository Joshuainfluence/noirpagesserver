const mongoose = require('mongoose');
const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');

// Runs fn inside a MongoDB transaction (Atlas supports these).
async function withSession(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

// The balance change and its log entry succeed or fail together. A duplicate
// AdMob transaction id throws (code 11000) and rolls the balance change back.
async function creditCoins({ userId, amount, type, reference, note }) {
  return withSession(async (session) => {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { coins: amount, lifetimeCoins: amount } },
      { new: true, session }
    );
    if (!user) return null;
    await CoinTransaction.create(
      [{ user: userId, type, amount, balanceAfter: user.coins, reference, note }],
      { session }
    );
    return user.coins;
  });
}

module.exports = { withSession, creditCoins };