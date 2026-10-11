import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiSearch, FiChevronDown, FiChevronUp, FiX, FiCheck, FiBriefcase } from 'react-icons/fi';
import { PROFESSION_GROUPS, generalOf, groupOfProfession } from '../config/professions';

/**
 * A field that opens "Select profession": a search box over professions grouped
 * by field (open one group at a time, like an accordion). Typing something that
 * isn't listed offers to use it as typed. A bottom sheet on phones, a dialog on
 * larger screens.
 */
const ProfessionPicker = ({ value, onChange, placeholder = 'Select your profession', title = 'Select profession', testId = 'profession-picker', allowGeneral = true }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    setExpanded(groupOfProfession(value)?.id || null);
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, value]);

  const term = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return [];
    const out = [];
    for (const g of PROFESSION_GROUPS) {
      for (const item of g.items) if (item.toLowerCase().includes(term)) out.push({ item, group: g.label });
      if (g.label.toLowerCase().includes(term) && allowGeneral) out.push({ item: generalOf(g), group: g.label });
    }
    return out.slice(0, 40);
  }, [term, allowGeneral]);
  const exact = matches.some((m) => m.item.toLowerCase() === term);

  const pick = (v) => { onChange(v); setOpen(false); };

  const Row = ({ item, sub, muted }) => {
    const on = value === item;
    return (
      <button type="button" onClick={() => pick(item)} data-testid={`profession-${item.replace(/\W+/g, '-').toLowerCase()}`}
        className={`flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] transition ${on ? 'bg-[#FFF9E6] text-[#9A6B00] font-semibold' : `${muted ? 'text-[#857B71]' : 'text-[#1C1712]'} hover:bg-[#F7F4F1]`}`}>
        <span className="flex-1 min-w-0">
          <span className="block truncate">{item}</span>
          {sub && <span className="block text-xs text-[#857B71] font-normal">{sub}</span>}
        </span>
        {on && <FiCheck className="h-5 w-5 shrink-0 text-[#1C1712]" />}
      </button>
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={testId}
        className="flex h-12 w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-left text-[15px] hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7A6450]/20">
        <FiBriefcase className="h-4 w-4 shrink-0 text-[#857B71]" />
        <span className={`flex-1 truncate ${value ? 'text-[#1C1712]' : 'text-[#9A9087]'}`}>{value || placeholder}</span>
        <FiChevronDown className="h-4 w-4 shrink-0 text-[#857B71]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-label={title}>
          <div className="flex h-[85vh] sm:h-[75vh] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl" data-testid={`${testId}-sheet`}>
            <div className="flex items-center justify-between border-b border-[#EFEBE6] px-6 py-5">
              <p className="text-xl font-semibold text-[#1C1712]">{title}</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-[#6B625A] hover:text-black" aria-label="Close"><FiX className="h-6 w-6" /></button>
            </div>
            <div className="px-5 pt-4 pb-3">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C9A227]" />
                <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search professions..." data-testid={`${testId}-search`}
                  className="h-12 w-full rounded-full border border-[#F1DFA8] bg-[#FFFAEB] pl-12 pr-4 text-[15px] outline-none focus:border-[#E0B93C]" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
              {term ? (
                <>
                  {matches.map((m) => <Row key={m.item} item={m.item} sub={m.group} />)}
                  {!exact && q.trim().length > 1 && (
                    <button type="button" onClick={() => pick(q.trim().replace(/\s+/g, ' ').slice(0, 80))} data-testid={`${testId}-custom`}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#1C1712] hover:bg-[#F7F4F1]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2EFEC] text-sm">+</span>
                      Use “{q.trim()}”
                    </button>
                  )}
                  {matches.length === 0 && q.trim().length <= 1 && <p className="px-5 py-6 text-sm text-[#857B71]">Keep typing…</p>}
                </>
              ) : (
                <>
                  {PROFESSION_GROUPS.map((g) => {
                    const isOpen = expanded === g.id;
                    return (
                      <div key={g.id} className="border-b border-[#EFEBE6]">
                        <button type="button" onClick={() => setExpanded(isOpen ? null : g.id)} aria-expanded={isOpen} data-testid={`profession-group-${g.id}`}
                          className={`flex w-full items-center justify-between px-5 py-4 text-left text-[17px] ${isOpen ? 'bg-[#FFFBEF] font-semibold text-[#9A6B00]' : 'text-[#1C1712]'}`}>
                          {g.label}
                          {isOpen ? <FiChevronUp className="h-5 w-5" /> : <FiChevronDown className="h-5 w-5 text-[#857B71]" />}
                        </button>
                        {isOpen && (
                          <div className="mx-5 mb-3 border-l-[3px] border-[#F4C430] bg-[#FAF8F5]">
                            {allowGeneral && <Row item={generalOf(g)} muted />}
                            {g.items.map((item) => <Row key={item} item={item} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => { setExpanded(null); searchRef.current?.focus(); }} className="flex w-full items-center px-5 py-4 text-left text-[17px] text-[#1C1712] border-b border-[#EFEBE6]">
                    Other <span className="ml-2 text-sm text-[#857B71]">(type it in the search above)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfessionPicker;
