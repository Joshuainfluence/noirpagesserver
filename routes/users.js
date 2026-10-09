const express = require("express");
const User = require("../models/User");
const Story = require("../models/Story");
const { requireAuth } = require("../middleware/auth");
const { deleteUserData } = require('../services/deleteUser');
const router = express.Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  // const user = await User.findById(req.user.id)
  //   .select('-passwordHash')
  //   .populate('bookmarks', 'title slug coverImageUrl');

  const user = await User.findById(req.user.id).populate(
    "readingHistory.story",
    "title slug coverImageUrl chapterCount",
  );
  res.json(user);
});

// POST /api/users/me/bookmarks/:storyId  (toggle bookmark)
router.post("/me/bookmarks/:storyId", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const storyId = req.params.storyId;
  const already = user.bookmarks.some((id) => id.toString() === storyId);

  if (already) {
    user.bookmarks = user.bookmarks.filter((id) => id.toString() !== storyId);
    await Story.findByIdAndUpdate(storyId, { $inc: { bookmarkCount: -1 } });
  } else {
    user.bookmarks.push(storyId);
    await Story.findByIdAndUpdate(storyId, { $inc: { bookmarkCount: 1 } });
  }

  await user.save();
  res.json({ bookmarked: !already, bookmarks: user.bookmarks });
});

// GET /api/users/me/history
router.get("/me/history", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).populate(
    "readingHistory.story",
    "title slug coverImageUrl",
  );
  res.json(user.readingHistory);
});



// DELETE /api/users/me  (used by the in-app Delete account button)
router.delete('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('role');
  if (!user) return res.status(404).json({ message: 'Account not found' });
  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Admin accounts must be removed by another admin.' });
  }
  await deleteUserData(req.user.id);
  res.json({ message: 'Account deleted' });
});

module.exports = router;
