const express = require('express');
const auth = require('../middleware/auth');
const { searchPeople } = require('../utils/peopleSearch');
const { withCovers } = require('../utils/covers');

const router = express.Router();

// ?q&role&industry&location&network&open&page&limit — instant people search
router.get('/search', auth, async (req, res) => {
  try {
    const result = await searchPeople(req.userId, req.query);
    // Cards on the Connections page show a photo of the person's work
    if (req.query.covers === '1') result.people = await withCovers(result.people || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
