const express = require('express');

const Waitlist = require('../models/Waitlist');

const router = express.Router();

// Public sign-up count for the marketing site's social proof line. Cached
// briefly so page views don't each hit the database.
let countCache = { value: null, at: 0 };
router.get('/count', async (req, res) => {
  try {
    if (countCache.value === null || Date.now() - countCache.at > 60 * 1000) {
      countCache = { value: await Waitlist.estimatedDocumentCount(), at: Date.now() };
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ count: countCache.value });
  } catch (error) {
    console.error('Waitlist count error:', error.message);
    res.status(500).json({ error: "Couldn't load the waitlist count." });
  }
});

// The waitlist is closed now that BeeBark has launched: no new entries and no
// waitlist emails. Existing entries stay in the database (read through
// /api/external/waitlist by the admin portal).
const REGISTER_URL = 'https://www.thebeebark.com/register';
router.post('/', (req, res) => {
  res.status(410).json({
    code: 'WAITLIST_CLOSED',
    error: `The waitlist is closed. BeeBark is live: create your account at ${REGISTER_URL}`,
    registerUrl: REGISTER_URL
  });
});

module.exports = router;
