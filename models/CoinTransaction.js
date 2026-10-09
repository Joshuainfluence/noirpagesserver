const mongoose = require('mongoose');

const coinTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['ad_reward', 'chapter_unlock', 'admin_adjustment'], required: true },
    amount: { type: Number, required: true }, // positive = earned, negative = spent
    balanceAfter: { type: Number, required: true },
    reference: { type: String }, // AdMob transaction_id, or the chapter id
    note: { type: String },
  },
  { timestamps: true }
);

// One AdMob reward event can only ever be credited once.
coinTransactionSchema.index({ reference: 1 }, { unique: true, partialFilterExpression: { type: 'ad_reward' } });

module.exports = mongoose.model('CoinTransaction', coinTransactionSchema);