require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Edit these three values before running:
const EMAIL = 'admin@example.com';
const PASSWORD = 'admin123';
const DISPLAY_NAME = 'Admin';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: EMAIL.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`Updated existing user ${EMAIL} to role: admin`);
  } else {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await User.create({
      email: EMAIL,
      passwordHash,
      displayName: DISPLAY_NAME,
      authProvider: 'password',
      role: 'admin',
    });
    console.log(`Created new admin user: ${EMAIL}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});