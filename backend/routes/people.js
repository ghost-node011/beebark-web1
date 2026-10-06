const express = require('express');
const auth = require('../middleware/auth');
const { searchPeople } = require('../utils/peopleSearch');

const router = express.Router();

// ?q&role&industry&location&network&open&page&limit — instant people search
router.get('/search', auth, async (req, res) => {
  try {
    res.json(await searchPeople(req.userId, req.query));
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
