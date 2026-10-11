import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiSearch, FiChevronDown, FiX, FiCheck, FiMapPin, FiClock } from 'react-icons/fi';
import { CITIES, STATES, WAITLISTED_STATES } from '../config/cities';

/**
 * A field that opens "Select your city": search across Indian cities. Cities in
 * states BeeBark hasn't opened yet are marked "Waitlisted"; choosing one calls
 * onWaitlisted({ city, state }) instead of onChange. A city that isn't listed
 * can be added under its state.
 */
const CityPicker = ({ value, onChange, onWaitlisted, placeholder = 'Select your city', testId = 'city-picker', invalid = false }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const term = q.trim().toLowerCase();
  const list = useMemo(() => {
    if (!term) return CITIES;
    const starts = [];
    const contains = [];
    for (const c of CITIES) {
      const city = c.city.toLowerCase();
      if (city.startsWith(term)) starts.push(c);
      else if (c.label.toLowerCase().includes(term)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [term]);
  const clean = q.trim().replace(/\s+/g, ' ').slice(0, 60);
  const titleCase = (s) => s.replace(/\b\w/g, (ch) => ch.toUpperCase());

  const choose = (c) => {
    if (c.waitlisted) { setOpen(false); onWaitlisted?.(c); return; }
    onChange(c.label, c);
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={testId}
        className={`flex h-12 w-full items-center gap-3 rounded-xl border bg-white px-4 text-left text-[15px] hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7A6450]/20 ${invalid ? 'border-red-400' : 'border-gray-300'}`}>
        <FiMapPin className="h-4 w-4 shrink-0 text-[#857B71]" />
        <span className={`flex-1 truncate ${value ? 'text-[#1C1712]' : 'text-[#9A9087]'}`}>{value || placeholder}</span>
        <FiChevronDown className="h-4 w-4 shrink-0 text-[#857B71]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-label="Select your city">
          <div className="flex h-[85vh] sm:h-[75vh] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl" data-testid={`${testId}-sheet`}>
            <div className="flex items-center justify-between border-b border-[#EFEBE6] px-6 py-5">
              <p className="text-xl font-semibold text-[#1C1712]">Select your city</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-[#6B625A] hover:text-black" aria-label="Close"><FiX className="h-6 w-6" /></button>
            </div>
            <div className="px-5 pt-4 pb-2">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C9A227]" />
                <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cities..." data-testid={`${testId}-search`}
                  className="h-12 w-full rounded-full border border-[#F1DFA8] bg-[#FFFAEB] pl-12 pr-4 text-[15px] outline-none focus:border-[#E0B93C]" />
              </div>
              <p className="mt-2 px-1 text-xs text-[#857B71]">BeeBark isn't open in {WAITLISTED_STATES.join(' and ')} yet; cities there are waitlisted.</p>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
              {list.slice(0, term ? 60 : 400).map((c) => {
                const on = value === c.label;
                return (
                  <button key={c.label} type="button" onClick={() => choose(c)} data-testid={`city-${c.city.replace(/\W+/g, '-').toLowerCase()}`}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] transition ${on ? 'bg-[#FFF9E6] font-semibold text-[#9A6B00]' : c.waitlisted ? 'text-[#A39A90] hover:bg-[#FAF8F5]' : 'text-[#1C1712] hover:bg-[#F7F4F1]'}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{c.city}</span>
                      <span className="block text-xs font-normal text-[#857B71]">{c.state}</span>
                    </span>
                    {c.waitlisted && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F2EFEC] px-2 py-0.5 text-xs font-medium text-[#6B625A]" data-testid="city-waitlisted-badge"><FiClock className="h-3 w-3" />Waitlisted</span>}
                    {on && <FiCheck className="h-5 w-5 shrink-0 text-[#1C1712]" />}
                  </button>
                );
              })}
              {term && clean.length >= 2 && !list.some((c) => c.city.toLowerCase() === term) && (
                <div className="px-5 py-4 border-t border-[#EFEBE6]" data-testid="city-add">
                  <p className="text-sm text-[#6B625A]">Not listed? Add “{titleCase(clean)}” under its state:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STATES.map((s) => {
                      const waitlisted = WAITLISTED_STATES.includes(s);
                      return (
                        <button key={s} type="button" data-testid={`city-add-in-${s.replace(/\W+/g, '-').toLowerCase()}`}
                          onClick={() => choose({ city: titleCase(clean), state: s, label: `${titleCase(clean)}, ${s}`, waitlisted })}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${waitlisted ? 'border-dashed border-[#E6E1DB] text-[#A39A90]' : 'border-[#E6E1DB] bg-white text-[#1C1712] hover:border-[#E0B93C] hover:bg-[#FFF9E6]'}`}>
                          {s}{waitlisted ? ' · waitlisted' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CityPicker;
