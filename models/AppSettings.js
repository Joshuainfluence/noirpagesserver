const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    rewardsEnabled: { type: Boolean, default: true },
    coinsPerRewardedAd: { type: Number, default: 10, min: 0 },
    dailyRewardedAdLimit: { type: Number, default: 10, min: 1 },
    minSecondsBetweenAds: { type: Number, default: 30, min: 0 },
  },
  { timestamps: true }
);

// One settings document for the whole app, created on first use.
appSettingsSchema.statics.current = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) {
    try {
      doc = await this.create({ key: 'main' });
    } catch (err) {
      doc = await this.findOne({ key: 'main' }); // created by a parallel request
    }
  }
  return doc;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);