// Shared constants and helpers for the Jobs page and its pieces.

export const EMPLOYMENT_TYPES = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship', contract: 'Contract', freelance: 'Freelance', graduate: 'Graduate' };
export const WORKPLACES = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' };
export const EXPERIENCE_LEVELS = { fresher: 'Fresher', junior: 'Junior', mid: 'Mid-level', senior: 'Senior' };

export const QUESTION_TYPES = {
  yes_no: 'Yes / No',
  number: 'Number',
  short_text: 'Short answer',
  long_text: 'Long answer',
  single_choice: 'Multiple choice'
};
export const MAX_QUESTIONS = 10;

export const isClosed = (job) => job?.status === 'closed';
export const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);
export const jobId = (job) => job?._id || job?.id;

// "Full-time · Hybrid · Mid-level"
export const jobChips = (job) => [
  EMPLOYMENT_TYPES[job?.employmentType],
  WORKPLACES[job?.workplace],
  EXPERIENCE_LEVELS[job?.experienceLevel]
].filter(Boolean);

export const questionCount = (job) => job?.questionCount ?? job?.questions?.length ?? 0;

export const companyInitial = (job) => (job?.company || job?.title || '?').trim().charAt(0).toUpperCase() || '?';

export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: days > 330 ? 'numeric' : undefined });
};

export const shortDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Validates one answer; returns an error message or ''
export const answerError = (question, value, required = question.required) => {
  const v = String(value ?? '').trim();
  if (!v) return required ? 'This one is required' : '';
  if (question.type === 'number' && !/^\d+(\.\d+)?$/.test(v)) return 'Enter a number';
  if (question.type === 'yes_no' && !['Yes', 'No'].includes(v)) return 'Choose Yes or No';
  if (question.type === 'single_choice' && question.options?.length && !question.options.includes(v)) return 'Choose one of the options';
  return '';
};
