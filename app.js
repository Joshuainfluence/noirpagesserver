require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const storyRoutes = require('./routes/stories');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const legalRoutes = require('./routes/legal');
const rewardsRoutes = require('./routes/rewards');
const settingsRoutes = require('./routes/settings');


const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter);

app.use(legalRoutes);
// Ensure a DB connection exists before handling any request (serverless-safe).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // local dev only

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message });
});
module.exports = app;