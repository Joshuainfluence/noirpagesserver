require("dotenv").config();
const mongoose = require("mongoose");
const Story = require("../models/Story");
const Chapter = require("../models/Chapter");

const stories = [
  {
    title: "Twisted Obsession",
    slug: "twisted-obsession",
    synopsis:
      "She was his weakness. He was her darkest secret. A ruthless CEO and the one woman he was never supposed to want.",
    authorPenName: "Nina Vale",
    tags: ["dark romance", "obsession", "billionaire"],
    spiceLevel: 4,
    status: "ongoing",
    coverImageUrl:
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&h=900&fit=crop",
  },
  {
    title: "Ruthless Vows",
    slug: "ruthless-vows",
    synopsis:
      "He promised to protect her. He never promised to be gentle. A marriage of convenience with a mafia heir turns into something neither of them can control.",
    authorPenName: "Bella J.",
    tags: ["dark romance", "mafia", "arranged marriage"],
    spiceLevel: 5,
    status: "ongoing",
    coverImageUrl:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&h=900&fit=crop",
  },
  {
    title: "Behind Closed Doors",
    slug: "behind-closed-doors",
    synopsis:
      "A masquerade, a stranger, and a secret that unravels everyone in the room.",
    authorPenName: "L. Monroe",
    tags: ["dark romance", "suspense"],
    spiceLevel: 3,
    status: "completed",
    coverImageUrl:
      "https://images.unsplash.com/photo-1487222444179-3f224cbf1d78?w=600&h=900&fit=crop",
  },
  {
    title: "Hidden Truths",
    slug: "hidden-truths",
    synopsis:
      "Everyone at the masquerade wore a mask. Only one of them was hiding a murder.",
    authorPenName: "K. Raven",
    tags: ["dark romance", "thriller"],
    spiceLevel: 3,
    status: "ongoing",
    coverImageUrl:
      "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=600&h=900&fit=crop",
  },
  {
    title: "Beautiful Liar",
    slug: "beautiful-liar",
    synopsis:
      "Every word out of his mouth was a lie. She fell for every single one.",
    authorPenName: "A. Knight",
    tags: ["dark romance", "enemies to lovers"],
    spiceLevel: 4,
    status: "ongoing",
    coverImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=900&fit=crop",
  },
  {
    title: "Sinners' Playground",
    slug: "sinners-playground",
    synopsis:
      "They said stay away from the Kingston brothers. She never listened.",
    authorPenName: "D. Ash",
    tags: ["dark romance", "bad boy"],
    spiceLevel: 5,
    status: "ongoing",
    coverImageUrl:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=600&h=900&fit=crop",
  },
];

const sampleChapters = [
  {
    order: 1,
    title: "The First Sin",
        rating: 4.7,
    content:
      "The room went silent the moment he walked in...\n\n" +
      "She had heard the rumors, but nothing prepared her for the way his gaze found hers across the crowded room, dark and unreadable, like he already knew every secret she was trying to keep.".repeat(
        6,
         
      ),
  },
  {
    order: 2,
    title: "No Turning Back",
        rating: 4.7,
    content:
      '"You shouldn\'t be here," he said, low enough that only she could hear.\n\n' +
      "But it was too late for warnings. It had been too late since the moment she said yes.".repeat(
        6,
           
      ),
  },
  {
    order: 3,
    title: "What We Hide",
        rating: 4.7,
    content:
      "Some secrets were meant to stay buried. Hers had just clawed its way to the surface.\n\n" +
      "And judging by the look on his face, so had his.".repeat(6),
          
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const s of stories) {
    let story = await Story.findOne({ slug: s.slug });
    if (!story) {
      story = await Story.create({
        ...s,
        isPublished: true,
        chapterCount: sampleChapters.length,
      });
      for (const ch of sampleChapters) {
        await Chapter.create({
          ...ch,
          story: story._id,
          wordCount: ch.content.split(/\s+/).length,
        });
      }
      console.log(`Created: ${s.title}`);
    } else {
      console.log(`Skipped (already exists): ${s.title}`);
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
