const User = require('../models/User');
const Story = require('../models/Story');
const CoinTransaction = require('../models/CoinTransaction');
const ChapterUnlock = require('../models/ChapterUnlock');

async function deleteUserData(userId) {
  const user = await User.findById(userId);
  if (!user) return false;
  if (user.bookmarks?.length) {
    await Story.updateMany({ _id: { $in: user.bookmarks } }, { $inc: { bookmarkCount: -1 } });
  }
  await Promise.all([
    CoinTransaction.deleteMany({ user: userId }),
    ChapterUnlock.deleteMany({ user: userId }),
  ]);
  await User.deleteOne({ _id: userId });
  return true;
}

module.exports = { deleteUserData };