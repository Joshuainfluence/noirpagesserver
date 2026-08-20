const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    bookmarks: user.bookmarks,
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Email, password, and display name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, displayName, authProvider: 'password' });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// POST /api/auth/google  { idToken }
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        email: payload.email,
        displayName: payload.name || payload.email.split('@')[0],
        authProvider: 'google',
        providerId: payload.sub,
      });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(401).json({ message: 'Google sign-in failed', error: err.message });
  }
});


// POST /api/auth/admin-signup   { email, password, displayName, inviteCode }
router.post('/admin-signup', async (req, res) => {
  try {
    const { email, password, displayName, inviteCode } = req.body;

    if (inviteCode !== '9999') {
      return res.status(403).json({ message: 'Invalid invite code' });
    }
    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Email, password, and display name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email, passwordHash, displayName, authProvider: 'password', role: 'admin',
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Admin signup failed', error: err.message });
  }
});

module.exports = router;
