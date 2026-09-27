const express = require('express');
const { body, validationResult } = require('express-validator');

const Waitlist = require('../models/Waitlist');
const { ROLES, CAREER_STAGES, INTERESTS } = require('../models/Waitlist');
const rateLimit = require('../middleware/rateLimit');
const { sendWaitlistEmail } = require('../utils/email');

const router = express.Router();

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  bucket: 'waitlist-join',
  message: 'Too many attempts. Please try again in a few minutes.'
});

// Public count, used for social proof on the pre-launch page
router.get('/count', async (req, res) => {
  try {
    const count = await Waitlist.estimatedDocumentCount();
    res.json({ count });
  } catch (error) {
    console.error('Waitlist count error:', error.message);
    res.status(500).json({ error: 'Could not fetch waitlist count' });
  }
});

router.post(
  '/',
  joinLimiter,
  [
    body('name').trim().notEmpty().withMessage('Please enter your name').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Please enter a valid email address').normalizeEmail({ gmail_remove_dots: false }),
    body('role').isIn(ROLES).withMessage('Please tell us what you do'),
    body('roleOther')
      .if(body('role').equals('Other'))
      .trim()
      .notEmpty()
      .withMessage('Please describe your role')
      .isLength({ max: 100 }),
    body('careerStage').isIn(CAREER_STAGES).withMessage('Please select your career stage'),
    body('interest').isIn(INTERESTS).withMessage('Please select what interests you most'),
    body('source').optional().trim().isLength({ max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, role, roleOther, careerStage, interest, source } = req.body;

    try {
      const entry = await Waitlist.create({
        name,
        email,
        role,
        roleOther: role === 'Other' ? roleOther : undefined,
        careerStage,
        interest,
        source
      });
      const position = await Waitlist.countDocuments({ createdAt: { $lte: entry.createdAt } });
      res.status(201).json({ message: "You're on the list!", position });

      // Confirmation email is sent after responding so a slow mail relay never
      // delays the sign-up; failures are logged and recorded on the entry.
      sendWaitlistEmail(entry.email, entry.name, { position })
        .then(() => Waitlist.updateOne({ _id: entry._id }, { confirmationSentAt: new Date() }))
        .catch((err) => console.error('Waitlist email error:', err.message));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "You're already on the waitlist with this email. We'll be in touch soon!" });
      }
      console.error('Waitlist join error:', error.message);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

module.exports = router;
