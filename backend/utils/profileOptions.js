// What someone can say they're open to on their profile. Options depend on who
// they are, so a student sees internships and a firm owner sees hiring.
const AVAILABILITY = {
  hiring: 'Hiring',
  open_to_work: 'Open to work',
  internship: 'Looking for an internship',
  freelance: 'Freelance projects',
  consulting: 'Consulting',
  collaboration: 'Collaboration',
  mentoring: 'Mentoring others',
  mentorship: 'Looking for a mentor',
  new_clients: 'Taking new clients',
  partnerships: 'Partnerships',
  subcontracting: 'Subcontracting work'
};

function availabilityOptionsFor(user) {
  if (user.role === 'student') return ['internship', 'mentorship', 'freelance', 'collaboration'];
  if (user.careerStage === 'business_owner' || ['firm', 'company'].includes(user.role)) {
    return ['hiring', 'new_clients', 'partnerships', 'subcontracting', 'collaboration'];
  }
  if (['fresher', 'intern'].includes(user.careerStage)) {
    return ['open_to_work', 'internship', 'freelance', 'mentorship', 'collaboration'];
  }
  return ['open_to_work', 'hiring', 'freelance', 'consulting', 'collaboration', 'mentoring'];
}

const PROFICIENCY = ['basic', 'conversational', 'professional', 'native'];
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'internship', 'freelance', 'contract', 'self_employed'];

const SOCIAL_PLATFORMS = ['linkedin', 'instagram', 'behance', 'pinterest', 'youtube', 'x', 'facebook', 'github', 'houzz', 'dribbble', 'website'];
// Each platform's own address; a link must be on it (any site is fine for "website")
const SOCIAL_DOMAINS = {
  linkedin: ['linkedin.com', 'lnkd.in'], instagram: ['instagram.com', 'instagr.am'], behance: ['behance.net'], pinterest: ['pinterest.com', 'pinterest.in', 'pin.it'],
  youtube: ['youtube.com', 'youtu.be'], x: ['x.com', 'twitter.com'], facebook: ['facebook.com', 'fb.com', 'fb.me'], github: ['github.com'],
  houzz: ['houzz.com', 'houzz.in'], dribbble: ['dribbble.com']
};
// '' when the link is fine, otherwise a message
const socialLinkError = (platform, raw) => {
  const text = String(raw || '').trim();
  if (!text) return 'Add the link or remove this row';
  if (/\s/.test(text)) return 'A link can\'t contain spaces';
  let url;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); } catch { return 'Enter a full link, e.g. https://linkedin.com/in/yourname'; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!/^https?:$/.test(url.protocol) || !host.includes('.') || !/\.[a-z]{2,}$/.test(host)) return 'Enter a full link, e.g. https://yourstudio.com';
  const domains = SOCIAL_DOMAINS[platform];
  if (domains && !domains.some((d) => host === d || host.endsWith(`.${d}`))) return `This link should be on ${domains[0]}`;
  if (domains && url.pathname.replace(/\/+$/, '') === '') return 'Link to your own page, not the home page';
  return '';
};

// Years since the earliest dated role (only counts structured start dates)
function yearsOfExperience(experience) {
  const starts = (experience || []).map((e) => e.startDate).filter((d) => /^\d{4}-\d{2}$/.test(d || '')).sort();
  if (!starts.length) return 0;
  const [y, m] = starts[0].split('-').map(Number);
  const now = new Date();
  return Math.max(0, Math.floor(((now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)) / 12));
}

module.exports = { SOCIAL_DOMAINS, socialLinkError, AVAILABILITY, availabilityOptionsFor, PROFICIENCY, EMPLOYMENT_TYPES, SOCIAL_PLATFORMS, yearsOfExperience };
