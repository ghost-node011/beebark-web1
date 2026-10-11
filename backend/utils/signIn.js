const crypto = require('crypto');
const User = require('../models/User');
const { sendLoginAlertEmail } = require('./email');

// Remembers the devices (browser + operating system) an account signs in from,
// and emails a "New sign-in" alert the first time a new one is used. The very
// first device (sign-up) is just remembered.

const browserOf = (ua) => (
  /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
            : /Safari\//.test(ua) ? 'Safari'
              : 'a browser'
);
const osOf = (ua) => (
  /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
      : /Windows/.test(ua) ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
          : /CrOS/.test(ua) ? 'ChromeOS'
            : /Linux/.test(ua) ? 'Linux'
              : 'an unknown system'
);
const deviceLabel = (ua) => `${browserOf(ua)} on ${osOf(ua)}`;
const ipOf = (req) => String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim().replace(/^::ffff:/, '');

/**
 * Call after a successful sign-in. Never throws and never delays the response.
 * method: 'password' | 'google' | 'linkedin' | 'phone' | 'signup'
 */
function noteSignIn(req, user, method = 'password') {
  (async () => {
    const ua = String(req.get('user-agent') || '').slice(0, 400);
    if (!user?._id || !ua) return;
    const label = deviceLabel(ua);
    const key = crypto.createHash('sha256').update(label).digest('hex').slice(0, 24);
    const ip = ipOf(req);
    const now = new Date();
    const fresh = await User.findById(user._id).select('email name knownDevices').lean();
    if (!fresh) return;
    const devices = fresh.knownDevices || [];
    const known = devices.find((d) => d.key === key);
    if (known) {
      await User.updateOne({ _id: user._id, 'knownDevices.key': key }, { $set: { 'knownDevices.$.lastSeen': now, 'knownDevices.$.ip': ip } });
      return;
    }
    await User.updateOne({ _id: user._id }, { $push: { knownDevices: { $each: [{ key, label, ip, firstSeen: now, lastSeen: now }], $slice: -20 } } });
    // Alert only when the account already had a device (not on its first sign-in)
    if (devices.length > 0 && method !== 'signup' && fresh.email && !/@phone\.beebark\.local$/i.test(fresh.email)) {
      await sendLoginAlertEmail(fresh.email, fresh.name, { device: label, ip, at: now, method });
    }
  })().catch((e) => console.error('Sign-in note failed:', e.message));
}

module.exports = { noteSignIn, deviceLabel };
