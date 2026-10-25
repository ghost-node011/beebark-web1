// One-time: fill users.emailKey (the mailbox an email delivers to) for accounts made
// before it existed, and list mailboxes that already have more than one account.
// Usage: node scripts/backfillEmailKeys.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { emailKey } = require('../utils/emailRules');

(async () => {
  await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'social_network_db' });
  const users = await User.find({}).select('email emailKey').lean();
  let filled = 0;
  const seen = new Map();
  for (const u of users) {
    const key = emailKey(u.email);
    if (u.emailKey !== key) { await User.updateOne({ _id: u._id }, { $set: { emailKey: key } }); filled += 1; }
    seen.set(key, [...(seen.get(key) || []), u.email]);
  }
  console.log(`${filled} of ${users.length} accounts updated`);
  for (const [key, emails] of seen) if (emails.length > 1) console.log(`Same mailbox ${key}: ${emails.join(', ')}`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
