// Gives existing accounts from the pre-launch waitlist their badges: verified
// for everyone, Top 50 for the first 50 to join. New sign-ups get them
// automatically (User pre-save hook). Safe to run again.
// Usage: node scripts/grantWaitlistBadges.js [--dry-run]
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { TOP_COUNT, prelaunchEmails } = require('../utils/waitlistBadges');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await mongoose.connect(process.env.MONGO_URL, { dbName: (process.env.DB_NAME || 'social_network_db').trim() });
  const order = await prelaunchEmails();
  const top = new Set(order.slice(0, TOP_COUNT));
  const users = await User.find({ email: { $in: order } }).select('email name badges').lean();
  console.log(`${order.length} on the pre-launch waitlist, ${users.length} with an account${dryRun ? ' (dry run)' : ''}`);
  for (const u of users) {
    const set = { 'badges.verified': true, ...(top.has(u.email.toLowerCase()) ? { 'badges.top50': true } : {}) };
    if (!dryRun) await User.updateOne({ _id: u._id }, { $set: set });
    console.log(`${u.email} (${u.name}): verified${set['badges.top50'] ? ' + Top 50' : ''}`);
  }
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
