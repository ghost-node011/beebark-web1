// Shared form checks (the backend applies the same rules)

// Indian numbers: exactly 10 digits, optionally written with +91 / 91 / 0 in front.
// Returns { value, error }: value is "+91 98765 43210" style, error is a message or ''.
export const checkPhone = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return { value: '', error: '' };
  if (/[^\d+\-\s().]/.test(text)) return { value: text, error: 'Use digits only' };
  let digits = text.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10) return { value: text, error: `Enter a 10-digit number (you entered ${digits.length})` };
  return { value: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, error: '' };
};

// A four-digit year between 1950 and next year (or empty)
export const checkYear = (raw, { allowFuture = 1 } = {}) => {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (!/^\d{4}$/.test(text)) return 'Enter a 4-digit year, e.g. 2024';
  const y = Number(text);
  const max = new Date().getFullYear() + allowFuture;
  if (y < 1950 || y > max) return `Enter a year between 1950 and ${max}`;
  return '';
};

// Keep only digits while typing (for year boxes)
export const digitsOnly = (v, max = 4) => String(v || '').replace(/\D/g, '').slice(0, max);

// Salary text such as "₹6–8 LPA", "40,000/month", "₹25k - 35k per month".
// It must contain a number, and nothing but numbers and salary words.
const SALARY_WORDS = /(?<![a-z])(lpa|lakhs?|lacs?|l|k|cr|crores?|per|month|monthly|months|year|yearly|annum|pa|pm|ctc|rs|inr|to|and|upto|up|stipend|fixed|plus|incentives?|negotiable)(?![a-z])/gi;
export const checkSalary = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (!/\d/.test(text)) return 'Enter the salary as a number, e.g. ₹40,000/month or ₹6–8 LPA';
  const rest = text.replace(SALARY_WORDS, ' ').replace(/[\d₹$.,/\-–—+()\s]/g, '');
  if (rest) return 'Use numbers for the salary, e.g. ₹40,000/month or ₹6–8 LPA';
  return '';
};
