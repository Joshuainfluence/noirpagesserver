function isPremiumChapter(story, chapter) {
  const price = story.chapterCoinPrice || 0;
  return story.premiumFromChapter > 0 && price > 0 && chapter.order >= story.premiumFromChapter;
}

module.exports = { isPremiumChapter };