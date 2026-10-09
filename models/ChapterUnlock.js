const mongoose = require('mongoose');

const unlockSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
    story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    coins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

unlockSchema.index({ user: 1, chapter: 1 }, { unique: true });

module.exports = mongoose.model('ChapterUnlock', unlockSchema);