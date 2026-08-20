const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    order: { type: Number, required: true }, // chapter number within the story
    title: { type: String, required: true },
    content: { type: String, required: true }, // markdown or plain text

    wordCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chapterSchema.index({ story: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Chapter', chapterSchema);
