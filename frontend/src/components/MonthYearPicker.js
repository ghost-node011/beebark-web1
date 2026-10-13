import React from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Month + year as two plain dropdowns, with the chosen date written out below
 * ("Selected: April 2021"). Value is "YYYY-MM" ('' when empty), like a month input.
 * `min` / `max` ("YYYY-MM") limit the choices; `disabled` greys it out.
 */
const MonthYearPicker = ({ label, value = '', onChange, min = '', max = '', disabled = false, required = false, testId, placeholder = 'Not set' }) => {
  const [year, month] = /^\d{4}-\d{2}$/.test(value) ? value.split('-') : ['', ''];
  const now = new Date();
  const maxYear = Number((max || '').slice(0, 4)) || now.getFullYear() + 5;
  const minYear = Number((min || '').slice(0, 4)) || 1960;
  const years = [];
  for (let y = maxYear; y >= minYear; y -= 1) years.push(String(y));

  const monthAllowed = (m) => {
    if (!year) return true;
    const v = `${year}-${m}`;
    return (!min || v >= min) && (!max || v <= max);
  };
  const emit = (y, m) => {
    if (!y && !m) return onChange('');
    // Keep a half-filled choice until both parts are picked
    if (!y || !m) return onChange(`${y || ''}-${m || ''}`);
    let v = `${y}-${m}`;
    if (min && v < min) v = min;
    if (max && v > max) v = max;
    onChange(v);
  };
  // A half-filled value ("2021-" or "-04") from the parent
  const [py, pm] = !year && /^\d{0,4}-\d{0,2}$/.test(value) ? value.split('-') : [year, month];

  const select = 'h-10 w-full rounded-lg border border-[#D8D2CA] bg-white px-3 text-sm text-[#1C1712] outline-none focus:border-[#E0B93C] focus:ring-2 focus:ring-[#F4C430]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400';
  const full = py && pm ? `${MONTHS[Number(pm) - 1]} ${py}` : '';

  return (
    <fieldset className="space-y-1.5" disabled={disabled} data-testid={testId}>
      <legend className="mb-1.5 text-sm font-medium text-[#1C1712]">{label}{required && <span className="text-red-500"> *</span>}</legend>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <select aria-label={`${label}: month`} value={pm || ''} onChange={(e) => emit(py, e.target.value)} className={select} data-testid={testId && `${testId}-month`}>
          <option value="">Month</option>
          {MONTHS.map((name, i) => {
            const m = String(i + 1).padStart(2, '0');
            return <option key={m} value={m} disabled={!monthAllowed(m)}>{name}</option>;
          })}
        </select>
        <select aria-label={`${label}: year`} value={py || ''} onChange={(e) => emit(e.target.value, pm)} className={select} data-testid={testId && `${testId}-year`}>
          <option value="">Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <p className={`text-xs ${full ? 'text-[#6B625A]' : 'text-[#A39A90]'}`}>{disabled ? '' : full ? `Selected: ${full}` : placeholder}</p>
    </fieldset>
  );
};

export default MonthYearPicker;
