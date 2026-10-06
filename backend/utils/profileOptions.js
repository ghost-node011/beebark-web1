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

module.exports = { AVAILABILITY, availabilityOptionsFor, PROFICIENCY, EMPLOYMENT_TYPES };
