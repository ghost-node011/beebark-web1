const crypto = require('crypto');

// Small in-memory cache for AI responses so repeat page views don't each cost
// an AI call. Entries are keyed by a fingerprint of the inputs, so a changed
// profile or changed stats produce a fresh answer. Lost on restart, which only
// means the next view regenerates the answer.
const MAX_ENTRIES = 5000;
const store = new Map();

const fingerprint = (value) => crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry;
};

const set = (key, value, ttlMs, meta = {}) => {
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value); // drop oldest
  store.set(key, { value, expiresAt: Date.now() + ttlMs, savedAt: Date.now(), ...meta });
};

module.exports = { fingerprint, get, set };
