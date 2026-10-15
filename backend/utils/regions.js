// States BeeBark hasn't opened in yet. People there can't finish onboarding;
// they're put on the waitlist for their city instead. Keep in step with
// frontend/src/config/cities.js. Every state is open for now (it was Kerala and
// Tamil Nadu; add them back here to waitlist them again).
const WAITLISTED_STATES = [];
// Main cities of Kerala and Tamil Nadu, to catch a location typed without its state
const WAITLISTED_CITIES = [
  'Thiruvananthapuram', 'Trivandrum', 'Kochi', 'Cochin', 'Ernakulam', 'Kozhikode', 'Calicut', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha',
  'Palakkad', 'Kottayam', 'Malappuram', 'Kasaragod', 'Pathanamthitta',
  'Chennai', 'Madras', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Trichy', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Tirunelveli',
  'Thoothukudi', 'Tuticorin', 'Thanjavur', 'Hosur', 'Kanchipuram', 'Nagercoil', 'Ooty'
];
const words = (s) => String(s || '').toLowerCase();

// The waitlisted state a location is in, or ''
function waitlistedStateOf(location) {
  const text = words(location);
  if (!text || !WAITLISTED_STATES.length) return '';
  const state = WAITLISTED_STATES.find((s) => text.includes(s.toLowerCase()));
  if (state) return state;
  const first = text.split(',')[0].trim();
  return WAITLISTED_CITIES.some((c) => c.toLowerCase() === first) ? 'a waitlisted region' : '';
}

module.exports = { WAITLISTED_STATES, waitlistedStateOf };
