const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { getAdmin } = require('../config/firebaseAdmin');
const {
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  generateOtp,
  hashOtp,
  verifyOtp
} = require('../utils/otp');
const {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetOtpEmail
} = require('../utils/email');

// Roles a user may self-select at signup (others are reserved/legacy)
// Firms aren't an account type any more: people create company Pages instead
const SELECTABLE_ROLES = ['student', 'professional'];

const signToken = (user) =>
  jwt.sign(
    { userId: user._id, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  phone: user.phone || '',
  role: user.role,
  intent: user.intent || [],
  industries: user.industries || [],
  careerStage: user.careerStage || '',
  isDemo: !!user.isDemo,
  location: user.location || '',
  bio: user.bio || '',
  skills: user.skills || [],
  isVerified: user.isVerified,
  onboardingCompleted: user.onboardingCompleted,
  profilePic: user.profilePic
});

// Strong password (PDF Day 3): min 8 chars, upper + lower + number + special
const strongPassword = (value) =>
  typeof value === 'string' &&
  value.length >= 8 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

const PASSWORD_MESSAGE =
  'Password must be 8+ characters and include uppercase, lowercase, a number, and a special character';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array(), error: errors.array()[0].msg });
    return false;
  }
  return true;
};

const generateUniqueUsername = async (email) => {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  let username = base;
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${base}${counter}`;
    counter += 1;
  }
  return username;
};

// Rate limiters (per IP)
const registerLimiter = rateLimit({ bucket: 'register', windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sign-up attempts. Please try again later.' });
const loginLimiter = rateLimit({ bucket: 'login', windowMs: 15 * 60 * 1000, max: 15, message: 'Too many login attempts. Please try again later.' });
const otpLimiter = rateLimit({ bucket: 'otp', windowMs: 15 * 60 * 1000, max: 20, message: 'Too many verification attempts. Please try again later.' });

/**
 * STEP 1 — Register: create an unverified account and email an OTP.
 * Does NOT return an auth token; the user must verify first.
 */
router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').custom(strongPassword).withMessage(PASSWORD_MESSAGE),
    body('role').optional().isIn(SELECTABLE_ROLES).withMessage('Please choose a valid account type')
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const { name, email, password } = req.body;
      const role = SELECTABLE_ROLES.includes(req.body.role) ? req.body.role : 'professional';

      const existing = await User.findOne({ email });
      if (existing && existing.isVerified) {
        return res.status(400).json({ error: 'Email already registered. Please log in.' });
      }

      // Avoid OTP churn: if an unverified user re-submits within the cooldown and
      // their last code is still valid, keep that code (don't invalidate the one
      // we just emailed). They can use the latest email or hit "Resend".
      if (existing && !existing.isVerified) {
        const ev = existing.emailVerification || {};
        const stillValid = ev.expiresAt && Date.now() < new Date(ev.expiresAt).getTime();
        const recentlySent =
          ev.lastSentAt && Date.now() - new Date(ev.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS;
        if (stillValid && recentlySent && ev.otpHash) {
          existing.name = name;
          existing.password = password;
          existing.role = role;
          await existing.save();
          return res.status(201).json({
            message: 'A verification code was already sent. Please check your email.',
            requiresVerification: true,
            email: existing.email
          });
        }
      }

      const otp = generateOtp();
      const verification = {
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
        lastSentAt: new Date()
      };

      let user;
      if (existing && !existing.isVerified) {
        // Re-registration of an unverified account: refresh details + OTP
        existing.name = name;
        existing.password = password; // re-hashed by pre-save hook
        existing.role = role;
        existing.authProvider = 'local';
        existing.emailVerification = verification;
        user = await existing.save();
      } else {
        user = new User({
          name,
          username: await generateUniqueUsername(email),
          email,
          password,
          role,
          authProvider: 'local',
          isVerified: false,
          emailVerification: verification
        });
        await user.save();
      }

      try {
        await sendOtpEmail(user.email, user.name, otp);
      } catch (mailErr) {
        console.error('❌ Failed to send OTP email:', mailErr.message);
        return res.status(502).json({
          error: 'Could not send verification email. Please try again.',
          detail: mailErr.message
        });
      }

      res.status(201).json({
        message: 'Verification code sent to your email',
        requiresVerification: true,
        email: user.email
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({ error: 'Registration failed', detail: error.message });
    }
  }
);

/**
 * STEP 2 — Verify OTP: confirm the code, mark verified, send welcome email,
 * and return an auth token.
 */
router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code').isNumeric().withMessage('Code must be numeric')
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const { email, otp } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: 'Account not found' });
      if (user.isVerified) return res.status(400).json({ error: 'Email is already verified. Please log in.' });

      const ev = user.emailVerification || {};
      if (!ev.otpHash || !ev.expiresAt) {
        return res.status(400).json({ error: 'No active code. Please request a new one.' });
      }
      if (Date.now() > new Date(ev.expiresAt).getTime()) {
        return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
      }
      if (ev.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      }

      if (!verifyOtp(otp, ev.otpHash)) {
        user.emailVerification.attempts = (ev.attempts || 0) + 1;
        await user.save();
        const left = Math.max(0, OTP_MAX_ATTEMPTS - user.emailVerification.attempts);
        return res.status(400).json({ error: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.` });
      }

      user.isVerified = true;
      user.emailVerification = undefined;
      await user.save();

      // Welcome email is best-effort; don't block verification on it
      sendWelcomeEmail(user.email, user.name).catch((e) =>
        console.error('Failed to send welcome email:', e.message)
      );

      res.json({
        message: 'Email verified successfully',
        token: signToken(user),
        user: publicUser(user)
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }
);

/**
 * Resend OTP (with cooldown).
 */
router.post(
  '/resend-otp',
  otpLimiter,
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const user = await User.findOne({ email: req.body.email });

      // Don't reveal whether the account exists / is already verified
      if (!user || user.isVerified) {
        return res.json({ message: 'If your email needs verification, a new code has been sent.' });
      }

      const lastSent = user.emailVerification?.lastSentAt;
      if (lastSent && Date.now() - new Date(lastSent).getTime() < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(lastSent).getTime())) / 1000);
        return res.status(429).json({ error: `Please wait ${wait}s before requesting another code.`, retryAfter: wait });
      }

      const otp = generateOtp();
      user.emailVerification = {
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
        lastSentAt: new Date()
      };
      await user.save();

      try {
        await sendOtpEmail(user.email, user.name, otp);
      } catch (mailErr) {
        console.error('Failed to resend OTP email:', mailErr.message);
        return res.status(502).json({ error: 'Could not send verification email. Please try again.' });
      }

      res.json({ message: 'A new verification code has been sent.' });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Could not resend code' });
    }
  }
);

/**
 * Login — blocked until the email is verified.
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      if (user.authProvider === 'google' && !user.password) {
        return res.status(400).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      if (!user.isVerified) {
        return res.status(403).json({
          error: 'Please verify your email to continue.',
          requiresVerification: true,
          email: user.email
        });
      }

      res.json({
        message: 'Login successful',
        token: signToken(user),
        user: publicUser(user)
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * Google sign-in / sign-up. Expects a Google ID token ("credential")
 * obtained client-side via Google Identity Services.
 */
router.post(
  '/google',
  loginLimiter,
  [body('credential').notEmpty().withMessage('Missing Google credential')],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;

      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
      }

      // Verify the ID token with Google (validates signature & expiry server-side)
      let payload;
      try {
        const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
          params: { id_token: req.body.credential }
        });
        payload = data;
      } catch (e) {
        return res.status(401).json({ error: 'Invalid Google credential' });
      }

      if (payload.aud !== clientId) {
        return res.status(401).json({ error: 'Google credential was not issued for this app' });
      }
      if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        return res.status(401).json({ error: 'Your Google email is not verified' });
      }

      const email = String(payload.email).toLowerCase();
      let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
      let isNewUser = false;

      if (user) {
        // Link Google to an existing account if needed
        let changed = false;
        if (!user.googleId) { user.googleId = payload.sub; changed = true; }
        if (!user.isVerified) { user.isVerified = true; changed = true; }
        if (user.authProvider !== 'google' && !user.password) { user.authProvider = 'google'; changed = true; }
        if (changed) await user.save();
      } else {
        isNewUser = true;
        user = new User({
          name: payload.name || email.split('@')[0],
          username: await generateUniqueUsername(email),
          email,
          googleId: payload.sub,
          authProvider: 'google',
          isVerified: true,
          role: SELECTABLE_ROLES.includes(req.body.role) ? req.body.role : 'professional',
          profilePic: payload.picture || ''
        });
        await user.save();
        sendWelcomeEmail(user.email, user.name).catch((e) =>
          console.error('Failed to send welcome email:', e.message)
        );
      }

      res.json({
        message: 'Google sign-in successful',
        token: signToken(user),
        user: publicUser(user),
        isNewUser
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Google sign-in failed' });
    }
  }
);

/**
 * LinkedIn sign-in (OpenID Connect, authorization-code flow).
 * Frontend sends the `code` + `redirectUri` it received from LinkedIn; we
 * exchange it for tokens and read basic profile (name, email, picture).
 */
router.post(
  '/linkedin',
  loginLimiter,
  [body('code').notEmpty().withMessage('Missing LinkedIn code'), body('redirectUri').notEmpty()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;

      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(503).json({ error: 'LinkedIn sign-in is not configured on the server.' });
      }

      // 1) Exchange the authorization code for an access token
      let accessToken;
      try {
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          code: req.body.code,
          redirect_uri: req.body.redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        });
        const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 12000
        });
        accessToken = tokenRes.data.access_token;
      } catch (e) {
        console.error('LinkedIn token exchange failed:', e.response?.data || e.message);
        return res.status(401).json({ error: 'LinkedIn authorization failed' });
      }

      // 2) Fetch the user's basic profile (OpenID userinfo)
      let profile;
      try {
        const { data } = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 12000
        });
        profile = data; // { sub, email, email_verified, name, picture, ... }
      } catch (e) {
        console.error('LinkedIn userinfo failed:', e.response?.data || e.message);
        return res.status(401).json({ error: 'Could not read LinkedIn profile' });
      }

      if (!profile.email) {
        return res.status(401).json({ error: 'LinkedIn did not share an email for this account' });
      }

      const email = String(profile.email).toLowerCase();
      let user = await User.findOne({ $or: [{ linkedinId: profile.sub }, { email }] });
      let isNewUser = false;

      if (user) {
        let changed = false;
        if (!user.linkedinId) { user.linkedinId = profile.sub; changed = true; }
        if (!user.isVerified) { user.isVerified = true; changed = true; }
        if (changed) await user.save();
      } else {
        isNewUser = true;
        user = new User({
          name: profile.name || email.split('@')[0],
          username: await generateUniqueUsername(email),
          email,
          linkedinId: profile.sub,
          authProvider: 'linkedin',
          isVerified: true,
          role: SELECTABLE_ROLES.includes(req.body.role) ? req.body.role : 'professional',
          profilePic: profile.picture || ''
        });
        await user.save();
        sendWelcomeEmail(user.email, user.name).catch((e) =>
          console.error('Failed to send welcome email:', e.message)
        );
      }

      res.json({
        message: 'LinkedIn sign-in successful',
        token: signToken(user),
        user: publicUser(user),
        isNewUser
      });
    } catch (error) {
      console.error('LinkedIn auth error:', error);
      res.status(500).json({ error: 'LinkedIn sign-in failed' });
    }
  }
);

/**
 * Phone (mobile) sign-in via Firebase. The SMS OTP is verified client-side by
 * Firebase; the client sends the resulting Firebase ID token, which we verify
 * with the Firebase Admin SDK, then create/link a user by phone number.
 */
router.post(
  '/firebase',
  loginLimiter,
  [body('idToken').notEmpty().withMessage('Missing token')],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;

      let admin;
      try {
        admin = getAdmin();
      } catch (e) {
        console.error('Firebase admin init failed:', e.message);
        return res.status(503).json({ error: 'Phone sign-in is not configured on the server.' });
      }
      if (!admin) {
        return res.status(503).json({ error: 'Phone sign-in is not configured on the server.' });
      }

      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(req.body.idToken);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid phone verification token' });
      }

      const phone = decoded.phone_number;
      if (!phone) {
        return res.status(400).json({ error: 'This sign-in did not include a phone number' });
      }
      const uid = decoded.uid;

      let user = await User.findOne({ $or: [{ firebaseUid: uid }, { phone }] });
      let isNewUser = false;

      if (user) {
        let changed = false;
        if (!user.firebaseUid) { user.firebaseUid = uid; changed = true; }
        if (!user.phone) { user.phone = phone; changed = true; }
        if (!user.isVerified) { user.isVerified = true; changed = true; }
        if (changed) await user.save();
      } else {
        isNewUser = true;
        const digits = phone.replace(/[^0-9]/g, '');
        user = new User({
          name: decoded.name || 'New User',
          username: await generateUniqueUsername(digits || 'user'),
          // email is required + unique; phone-only users get a placeholder they
          // can replace later. Real email can be collected during onboarding.
          email: `${digits}@phone.beebark.local`,
          phone,
          firebaseUid: uid,
          authProvider: 'phone',
          isVerified: true,
          role: SELECTABLE_ROLES.includes(req.body.role) ? req.body.role : 'professional'
        });
        await user.save();
      }

      res.json({
        message: 'Phone sign-in successful',
        token: signToken(user),
        user: publicUser(user),
        isNewUser
      });
    } catch (error) {
      console.error('Firebase auth error:', error);
      res.status(500).json({ error: 'Phone sign-in failed' });
    }
  }
);

// Step 1 — request a password reset: email a 6-digit OTP code
router.post(
  '/forgot-password',
  loginLimiter,
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const user = await User.findOne({ email: req.body.email });

      // Only local accounts (with a password) can reset; respond generically either way
      if (user && user.password) {
        const last = user.passwordReset?.lastSentAt;
        const onCooldown = last && Date.now() - new Date(last).getTime() < OTP_RESEND_COOLDOWN_MS;
        if (!onCooldown) {
          const otp = generateOtp();
          user.passwordReset = {
            otpHash: hashOtp(otp),
            expiresAt: new Date(Date.now() + OTP_TTL_MS),
            attempts: 0,
            lastSentAt: new Date()
          };
          await user.save();
          try {
            await sendPasswordResetOtpEmail(user.email, user.name, otp);
          } catch (mailErr) {
            console.error('❌ Failed to send reset code:', mailErr.message);
          }
        }
      }

      res.json({ message: 'If an account exists for that email, a reset code has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

// Step 2 — verify the emailed OTP and set a new password
router.post(
  '/reset-password',
  otpLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code').isNumeric().withMessage('Code must be numeric'),
    body('password').custom(strongPassword).withMessage(PASSWORD_MESSAGE)
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const { email, otp, password } = req.body;

      const user = await User.findOne({ email });
      const pr = user && user.passwordReset;
      if (!user || !pr || !pr.otpHash) {
        return res.status(400).json({ error: 'No active reset code. Please request a new one.' });
      }
      if (Date.now() > new Date(pr.expiresAt).getTime()) {
        return res.status(400).json({ error: 'Reset code expired. Please request a new one.' });
      }
      if (pr.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      }
      if (!verifyOtp(otp, pr.otpHash)) {
        user.passwordReset.attempts = (pr.attempts || 0) + 1;
        await user.save();
        const left = Math.max(0, OTP_MAX_ATTEMPTS - user.passwordReset.attempts);
        return res.status(400).json({ error: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.` });
      }

      user.password = password; // re-hashed by pre-save hook
      user.passwordReset = undefined;
      user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate existing sessions
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

/**
 * Log out from all devices — invalidates every previously issued token by
 * bumping the user's tokenVersion.
 */
router.post('/logout-all', auth, async (req, res) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout-all error:', error);
    res.status(500).json({ error: 'Failed to log out from all devices' });
  }
});

module.exports = router;
