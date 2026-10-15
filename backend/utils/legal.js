// Version of the User Agreement and Privacy Policy people accept at sign-up
// (the date they were last updated). Change it when either document changes.
const LEGAL_VERSION = '2026-10-15';

// What we store when someone accepts: version, time, and where it came from
const consentRecord = (req, method) => ({
  version: LEGAL_VERSION,
  acceptedAt: new Date(),
  method,
  ip: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 64),
  userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
});

// Accepted the User Agreement and Privacy Policy (any version): asked once, at sign-up
// or the first time after joining; later updates don't ask again
const hasAccepted = (user) => Boolean(user?.legalConsent?.version);

module.exports = { LEGAL_VERSION, consentRecord, hasAccepted };
