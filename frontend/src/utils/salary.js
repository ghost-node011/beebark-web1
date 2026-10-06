// Salaries are free text; show them in rupees. Older posts typed with "$"
// or "USD", or as a bare number, get the ₹ sign instead.
export const inrSalary = (salary) => {
  const s = String(salary || '').trim();
  if (!s) return '';
  const swapped = s.replace(/US\$|USD\s*|\$/gi, '₹').replace(/₹\s+/g, '₹');
  return /^\d/.test(swapped) ? `₹${swapped}` : swapped;
};

export default inrSalary;
