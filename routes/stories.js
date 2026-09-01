const express = require('express');
const Story = require('../models/Story');
const Chapter = require('../models/Chapter');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/stories  (public library, supports ?tag=&q=&status=)
router.get('/', async (req, res) => {
  const { tag, q, status } = req.query;
  const filter = { isPublished: true };
  if (tag) filter.tags = tag.toLowerCase();
  if (status) filter.status = status;
  if (q) filter.$text = { $search: q };

  const stories = await Story.find(filter)
    .sort({ createdAt: -1 })
    // .select('title slug coverImageUrl synopsis tags spiceLevel status chapterCount authorPenName');
        // .select('title slug coverImageUrl synopsis tags spiceLevel status chapterCount authorPenName views');
            .select('title slug coverImageUrl synopsis tags spiceLevel status chapterCount authorPenName views rating');

  res.json(stories);
});

// GET /api/stories/:slug  (story detail + chapter list, no chapter content)
router.get('/:slug', async (req, res) => {
  const story = await Story.findOne({ slug: req.params.slug, isPublished: true });
  if (!story) return res.status(404).json({ message: 'Story not found' });

  const chapters = await Chapter.find({ story: story._id, isPublished: true })
    .sort({ order: 1 })
    .select('order title wordCount publishedAt');

  story.views += 1;
  await story.save();

  res.json({ story, chapters });
});

// GET /api/stories/:slug/chapters/:order  (actual reading content - requires auth)
router.get('/:slug/chapters/:order', requireAuth, async (req, res) => {
  const story = await Story.findOne({ slug: req.params.slug, isPublished: true });
  if (!story) return res.status(404).json({ message: 'Story not found' });

  const chapter = await Chapter.findOne({
    story: story._id,
    order: Number(req.params.order),
    isPublished: true,
  });
  if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

  // track reading progress
  await User.updateOne(
    { _id: req.user.id },
    {
      $pull: { readingHistory: { story: story._id } },
    }
  );
  await User.updateOne(
    { _id: req.user.id },
    {
      $push: {
        readingHistory: {
          story: story._id,
          chapter: chapter._id,
          chapterOrder: chapter.order,
          updatedAt: new Date(),
        },
      },
    }
  );

  res.json(chapter);
});

// ---- Admin-only: upload/manage stories ----

// POST /api/stories  (create a story)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const story = await Story.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(story);
  } catch (err) {
    res.status(400).json({ message: 'Could not create story', error: err.message });
  }
});

// PATCH /api/stories/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const story = await Story.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!story) return res.status(404).json({ message: 'Story not found' });
  res.json(story);
});


// DELETE /api/stories/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const story = await Story.findByIdAndDelete(req.params.id);
  if (!story) return res.status(404).json({ message: 'Story not found' });
  await Chapter.deleteMany({ story: story._id });
  res.json({ message: 'Story and its chapters deleted' });
});

// PATCH /api/stories/:storyId/chapters/:chapterId
router.patch('/:storyId/chapters/:chapterId', requireAuth, requireAdmin, async (req, res) => {
  const { title, content, order, isPublished } = req.body;
  const update = { title, content, order, isPublished };
  if (content) update.wordCount = content.trim().split(/\s+/).length;

  const chapter = await Chapter.findOneAndUpdate(
    { _id: req.params.chapterId, story: req.params.storyId },
    update,
    { new: true }
  );
  if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
  res.json(chapter);
});

// DELETE /api/stories/:storyId/chapters/:chapterId
router.delete('/:storyId/chapters/:chapterId', requireAuth, requireAdmin, async (req, res) => {
  const chapter = await Chapter.findOneAndDelete({ _id: req.params.chapterId, story: req.params.storyId });
  if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
  await Story.findByIdAndUpdate(req.params.storyId, { $inc: { chapterCount: -1 } });
  res.json({ message: 'Chapter deleted' });
});

// GET /api/stories/admin/:id  (full story incl. unpublished, for the admin panel)
router.get('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ message: 'Story not found' });
  const chapters = await Chapter.find({ story: story._id }).sort({ order: 1 });
  res.json({ story, chapters });
});


// POST /api/stories/:id/chapters  (add a chapter)
router.post('/:id/chapters', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { order, title, content } = req.body;
    const wordCount = content ? content.trim().split(/\s+/).length : 0;

    const chapter = await Chapter.create({
      story: req.params.id,
      order,
      title,
      content,
      wordCount,
    });

    await Story.findByIdAndUpdate(req.params.id, { $inc: { chapterCount: 1 } });
    res.status(201).json(chapter);
  } catch (err) {
    res.status(400).json({ message: 'Could not add chapter', error: err.message });
  }
});

module.exports = router;
