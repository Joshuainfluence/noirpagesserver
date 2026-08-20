require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const storyRoutes = require('./routes/stories');
const userRoutes = require('./routes/users');

const path = require('path');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' })); // chapters can be long text

// basic rate limiting to protect auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/users', userRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
