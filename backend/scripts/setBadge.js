// Give (or take away) a badge by email.
// Usage: node scripts/setBadge.js <verified|top50|pro|official=Title> [--remove] email1 email2 ...
// e.g. node scripts/setBadge.js official=HR suhani@thebeebark.com  (shows "BeeBark Official · HR")
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const BADGES = ['verified', 'top50', 'pro', 'official'];
const [arg, ...rest] = process.argv.slice(2);
// official takes a title ("official=HR"); the others are on/off
const [badge, title = ''] = String(arg || '').split('=');
const remove = rest.includes('--remove');
const emails = rest.filter((a) => a !== '--remove').map((e) => e.trim().toLowerCase());
if (!BADGES.includes(badge) || !emails.length) {
  console.error('Usage: node scripts/setBadge.js <verified|top50|pro|official=Title> [--remove] email ...');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URL, { dbName: (process.env.DB_NAME || 'social_network_db').trim() });
  for (const email of emails) {
    const user = await User.findOneAndUpdate({ email }, { $set: badge === 'official'
      // A BeeBark team account is verified too
      ? { 'badges.official': remove ? '' : title.trim().slice(0, 40) || 'Team', ...(remove ? {} : { 'badges.verified': true }) }
      : { [`badges.${badge}`]: !remove } }, { new: true }).select('name email badges').lean();
    console.log(user ? `${user.email} (${user.name}): ${badge}=${user.badges[badge]}` : `${email}: no account found`);
  }
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });
