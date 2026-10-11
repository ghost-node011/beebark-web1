const Waitlist = require('../models/Waitlist');

// People from the pre-launch waitlist get the verified badge, and the first 50
// to join it also get the Top 50 medal. Region sign-ups (Kerala, Tamil Nadu
// after launch) aren't the pre-launch waitlist and get neither.
const TOP_COUNT = 50;
const PRELAUNCH = { source: { $not: /^region:/i } };

// Pre-launch waitlist emails in join order
async function prelaunchEmails() {
  const rows = await Waitlist.find(PRELAUNCH).select('email').sort({ createdAt: 1, _id: 1 }).lean();
  return rows.map((w) => String(w.email).toLowerCase());
}

// { verified, top50 } for one email, or null when it isn't on the waitlist
async function waitlistBadgesFor(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;
  const order = await prelaunchEmails();
  const rank = order.indexOf(key);
  return rank === -1 ? null : { verified: true, top50: rank < TOP_COUNT };
}

module.exports = { TOP_COUNT, prelaunchEmails, waitlistBadgesFor };
