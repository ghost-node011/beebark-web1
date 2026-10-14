// A person's name: letters (any language) and single spaces only, 2-60 characters.
// Returns an error message, or '' when the name is fine.
const NAME_RE = /^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u;
const NAME_ERROR = 'Use letters and spaces only for your name (no numbers or symbols)';

const cleanName = (name) => String(name || '').trim().replace(/\s+/g, ' ');
const nameError = (name) => {
  const v = cleanName(name);
  if (v.length < 2) return 'Enter your full name';
  if (v.length > 60) return 'Keep your name under 60 characters';
  return NAME_RE.test(v) ? '' : NAME_ERROR;
};

// A name from Google, LinkedIn, the phone sign-in or an email address, made to
// follow the same rule: digits and symbols dropped ("john.doe92" -> "john doe").
// Falls back to "BeeBark Member" when nothing usable is left.
const FALLBACK_NAME = 'BeeBark Member';
const nameFromProvider = (...candidates) => {
  for (const raw of candidates) {
    const v = String(raw || '').replace(/[^\p{L}\p{M}\s]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
    if (!nameError(v)) return v;
  }
  return FALLBACK_NAME;
};

module.exports = { cleanName, nameError, nameFromProvider, NAME_ERROR };
