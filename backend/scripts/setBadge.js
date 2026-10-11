// Give (or take away) a badge by email.
// Usage: node scripts/setBadge.js <verified|top50|pro> [--remove] email1 email2 ...
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const BADGES = ['verified', 'top50', 'pro'];
const [badge, ...rest] = process.argv.slice(2);
const remove = rest.includes('--remove');
const emails = rest.filter((a) => a !== '--remove').map((e) => e.trim().toLowerCase());
if (!BADGES.includes(badge) || !emails.length) {
  console.error(`Usage: node scripts/setBadge.js <${BADGES.join('|')}> [--remove] email ...`);
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URL, { dbName: (process.env.DB_NAME || 'social_network_db').trim() });
  for (const email of emails) {
    const user = await User.findOneAndUpdate({ email }, { $set: { [`badges.${badge}`]: !remove } }, { new: true }).select('name email badges').lean();
    console.log(user ? `${user.email} (${user.name}): ${badge}=${user.badges[badge]}` : `${email}: no account found`);
  }
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
