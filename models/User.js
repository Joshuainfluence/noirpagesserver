const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String }, // absent for social-only accounts
    displayName: { type: String, required: true, trim: true },
    authProvider: { type: String, enum: ['password', 'google', 'apple'], default: 'password' },
    providerId: { type: String }, // sub/id from Google or Apple

    role: { type: String, enum: ['reader', 'admin'], default: 'reader' },
        coins: { type: Number, default: 0, min: 0 },
    lifetimeCoins: { type: Number, default: 0 },

    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
    readingHistory: [
      {
        story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
        chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
        chapterOrder: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
