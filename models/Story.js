const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    synopsis: { type: String, required: true },
    coverImageUrl: { type: String },

    authorPenName: { type: String, required: true },
        categories: [{ type: String, lowercase: true, trim: true }],
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String, lowercase: true, trim: true }], // e.g. mafia, enemies-to-lovers
    // spiceLevel: { type: Number, min: 1, max: 5, default: 3 },
        premiumFromChapter: { type: Number, default: 0, min: 0 }, // 0 = every chapter is free
    chapterCoinPrice: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ['ongoing', 'completed', 'hiatus'], default: 'ongoing' },
    isPublished: { type: Boolean, default: false },

    chapterCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
        rating: { type: Number, min: 0, max: 5, default: 4.5 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin who uploaded it
  },
  { timestamps: true }
);

storySchema.index({ title: 'text', synopsis: 'text', tags: 'text' });

module.exports = mongoose.model('Story', storySchema);
