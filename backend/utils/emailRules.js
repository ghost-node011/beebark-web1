const fs = require('fs');
const path = require('path');

// Sign-up rules for email addresses: no temporary (disposable) mailboxes, and one
// account per mailbox however the address is written.

let disposable = null;
const disposableDomains = () => {
  if (!disposable) {
    const text = fs.readFileSync(path.join(__dirname, 'disposableEmailDomains.txt'), 'utf8');
    disposable = new Set(text.split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#')));
  }
  return disposable;
};

const domainOf = (email) => String(email || '').trim().toLowerCase().split('@')[1] || '';

/** A temporary-mail address (its domain, or a domain it's under, is on the list) */
function isDisposableEmail(email) {
  const parts = domainOf(email).split('.');
  const list = disposableDomains();
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (list.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

const DISPOSABLE_EMAIL_ERROR = "Temporary email addresses can't be used on BeeBark. Please sign up with your own email.";

/**
 * The mailbox an address delivers to, so variants count as one account:
 * "+tags" are dropped, and for Gmail dots don't matter ("A.b+x@googlemail.com" -> "ab@gmail.com").
 */
function emailKey(email) {
  const [rawLocal, rawDomain] = String(email || '').trim().toLowerCase().split('@');
  if (!rawLocal || !rawDomain) return String(email || '').trim().toLowerCase();
  let local = rawLocal.split('+')[0];
  let domain = rawDomain;
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local || rawLocal}@${domain}`;
}

module.exports = { isDisposableEmail, DISPOSABLE_EMAIL_ERROR, emailKey };
