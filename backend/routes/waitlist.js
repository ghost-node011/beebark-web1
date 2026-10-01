const express = require('express');
const { body, validationResult } = require('express-validator');

const Waitlist = require('../models/Waitlist');
const { INTERESTS, ROLES, CAREER_STAGES, PRIMARY_INTERESTS } = require('../models/Waitlist');
const rateLimit = require('../middleware/rateLimit');
const { sendWaitlistEmail } = require('../utils/email');

const router = express.Router();

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  bucket: 'waitlist-join',
  message: 'Too many attempts. Please try again in a few minutes.'
});

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

router.post(
  '/',
  joinLimiter,
  [
    body('name').trim().notEmpty().withMessage('Enter your full name.').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false }),
    body('interests').optional().isArray({ max: INTERESTS.length }).withMessage('Choose from the listed options.'),
    body('interests.*').isIn(INTERESTS).withMessage('Choose from the listed options.'),
    // Optional profile questions (sent by the /join-waitlist page)
    body('role').optional({ values: 'falsy' }).isIn(ROLES).withMessage('Choose from the listed options.'),
    body('roleOther').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
    body('careerStage').optional({ values: 'falsy' }).isIn(CAREER_STAGES).withMessage('Choose from the listed options.'),
    body('interest').optional({ values: 'falsy' }).isIn(PRIMARY_INTERESTS).withMessage('Choose from the listed options.'),
    body('source').optional().trim().isLength({ max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, interests = [], role, roleOther, careerStage, interest, source } = req.body;

    try {
      const entry = await Waitlist.create({
        name,
        email,
        interests: [...new Set(interests)],
        role: role || undefined,
        roleOther: role === 'Other' ? roleOther : undefined,
        careerStage: careerStage || undefined,
        interest: interest || undefined,
        source
      });
      res.status(201).json({ message: "You're on the waitlist." });

      // Confirmation email is sent after responding so a slow mail server never
      // delays the sign-up; failures are logged and recorded on the entry.
      sendWaitlistEmail(entry.email, entry.name)
        .then(() => Waitlist.updateOne({ _id: entry._id }, { confirmationSentAt: new Date() }))
        .catch((err) => console.error('Waitlist email error:', err.message));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ code: 'ALREADY_REGISTERED', error: "This email is already on the waitlist. You're all set." });
      }
      console.error('Waitlist join error:', error.message);
      res.status(500).json({ error: "We couldn't save your details. Please try again." });
    }
  }
);

module.exports = router;
