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

module.exports = { cleanName, nameError, NAME_ERROR };
