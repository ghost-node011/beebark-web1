const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { suggestCorrection } = require('../utils/textSuggest');

// Shared "did you mean X" endpoint — used anywhere in the app that takes a
// short free-text professional term (skills, custom domain, tags, ...).
router.post('/suggest', auth, async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const suggestion = await suggestCorrection(text, context);
    if (!suggestion) {
      return res.status(503).json({ error: 'Suggestions are unavailable right now' });
    }
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate suggestion', message: error.message });
  }
});

module.exports = router;
