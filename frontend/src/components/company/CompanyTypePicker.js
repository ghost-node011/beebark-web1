import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';
import { PAGE_TYPE_LABELS } from '../../context/PagesContext';

// Extra words each type is found by, so "studio", "builder" or "tiles" work
const KEYWORDS = {
  architecture_firm: 'architect architects studio design practice urban planning landscape',
  interior_firm: 'interiors interior designer decor decorator furniture fit out turnkey',
  real_estate: 'developer builder broker agent property realty housing projects leasing',
  supplier: 'materials manufacturer dealer distributor tiles stone marble cement steel lighting hardware sanitary',
  construction: 'contractor builder civil engineering construction company epc mep',
  consultancy: 'consultant structural engineer project management cost advisory',
  education: 'college school university institute academy training courses',
  other: 'other something else'
};

/**
 * Searchable "Type of company" list. Choosing Other asks what kind of company
 * it is (`otherText`), which is shown on the page instead of "Other".
 */
const CompanyTypePicker = ({ value, otherText = '', onChange, onOtherText, invalid = false }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef(null);
  const search = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    const t = setTimeout(() => search.current?.focus(), 30);
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const term = q.trim().toLowerCase();
  const options = useMemo(() => Object.entries(PAGE_TYPE_LABELS)
    .filter(([v, label]) => !term || `${label} ${KEYWORDS[v] || ''}`.toLowerCase().includes(term))
    // "Other" always stays at the end, so there's a way forward when nothing matches
    .sort(([a], [b]) => (a === 'other') - (b === 'other')), [term]);
  const withOther = options.some(([v]) => v === 'other') ? options : [...options, ['other', PAGE_TYPE_LABELS.other]];

  const choose = (v) => {
    onChange(v);
    if (v === 'other' && !otherText && term) onOtherText(q.trim().slice(0, 60));
    setOpen(false);
  };
  const shown = value === 'other' && otherText ? `Other: ${otherText}` : PAGE_TYPE_LABELS[value];

  return (
    <div ref={box} className="relative mt-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} data-testid="page-type"
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm ${invalid ? 'border-red-400' : 'border-input'}`}>
        <span className={shown ? 'truncate text-black' : 'text-gray-500'}>{shown || 'Choose…'}</span>
        <FiChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. builder, studio, tiles" data-testid="page-type-search"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (withOther[0]) choose(withOther[0][0]); } }}
              className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-2 text-sm outline-none focus:border-[#E0B93C]" />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {withOther.map(([v, label]) => (
              <li key={v}>
                <button type="button" role="option" aria-selected={value === v} onClick={() => choose(v)} data-testid={`page-type-${v}`}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-yellow-50 ${value === v ? 'font-semibold text-[#32281F]' : 'text-slate-700'}`}>
                  <span>{v === 'other' && term && options.length === 1 ? `Other: "${q.trim()}"` : label}</span>
                  {value === v && <FiCheck className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {value === 'other' && (
        <input value={otherText} onChange={(e) => onOtherText(e.target.value.slice(0, 60))} maxLength={60} placeholder="What kind of company is it? e.g. Landscape nursery"
          className={`mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-[#E0B93C] ${invalid && !otherText.trim() ? 'border-red-400' : 'border-input'}`} data-testid="page-type-other" />
      )}
    </div>
  );
};

export default CompanyTypePicker;
