// Labels for profile options; the backend decides which ones each person can pick.
export const AVAILABILITY_LABELS = {
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

export const PROFICIENCY = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'professional', label: 'Professional' },
  { value: 'native', label: 'Native or bilingual' }
];

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'self_employed', label: 'Self-employed' }
];

export const BUSINESS_TYPES = ['Architecture studio', 'Interior design studio', 'Construction company', 'Real estate agency', 'Developer', 'Consultancy', 'Contractor', 'Supplier', 'Other'];
export const TEAM_SIZES = ['Just me', '2-10', '11-50', '51-200', '200+'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => {
  const [y, m] = String(ym || '').split('-');
  return y && m ? `${MONTHS[Number(m) - 1]} ${y}` : '';
};

// "Jan 2022 – Present · 2 yrs 3 mos", falling back to the old free-text duration
export const experienceDates = (exp) => {
  if (!exp?.startDate) return exp?.duration || '';
  const end = exp.current ? 'Present' : monthLabel(exp.endDate);
  const [sy, sm] = exp.startDate.split('-').map(Number);
  const endDate = exp.current || !exp.endDate ? new Date() : new Date(Number(exp.endDate.split('-')[0]), Number(exp.endDate.split('-')[1]) - 1);
  const months = Math.max(0, (endDate.getFullYear() - sy) * 12 + (endDate.getMonth() - (sm - 1)) + 1);
  const y = Math.floor(months / 12);
  const m = months % 12;
  const length = [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
  return [`${monthLabel(exp.startDate)}${end ? ` – ${end}` : ''}`, length].filter(Boolean).join(' · ');
};

export const employmentTypeLabel = (v) => EMPLOYMENT_TYPES.find((t) => t.value === v)?.label || '';
export const proficiencyLabel = (v) => PROFICIENCY.find((p) => p.value === v)?.label || '';
