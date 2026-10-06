import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiMapPin } from 'react-icons/fi';
import { Input } from './ui/input';
import { API_URL } from '../config/api';

// Text input with a suggestion list underneath. `fetchSuggestions(q)` returns
// a promise of strings; typing is debounced and spell checking stays on.
const SuggestingInput = ({ value, onChange, fetchSuggestions, minChars = 1, icon: Icon, onPick, wrapperClassName = '', ...props }) => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return undefined;
    const q = (value || '').trim();
    if (q.length < minChars) { setItems([]); return undefined; }
    let cancelled = false;
    const t = setTimeout(() => {
      fetchSuggestions(q)
        .then((list) => {
          if (cancelled) return;
          const filtered = list.filter((s) => s.toLowerCase() !== q.toLowerCase());
          setItems(filtered);
          setOpen(filtered.length > 0);
          setActive(-1);
        })
        .catch(() => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, fetchSuggestions, minChars]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (s) => {
    typed.current = false;
    onChange(s);
    onPick?.(s);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (open && items.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % items.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); return; }
      if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
    }
    props.onKeyDown?.(e);
  };

  return (
    <div className={`relative ${wrapperClassName}`} ref={boxRef}>
      <Input
        {...props}
        value={value}
        spellCheck
        autoComplete="off"
        onChange={(e) => { typed.current = true; onChange(e.target.value); }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1" role="listbox">
          {items.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm ${i === active ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="truncate">{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Suggestions from what other members have entered: field is one of
// school, degree, field, company, title, language, skill
export const AutocompleteInput = ({ field, ...props }) => {
  const fetcher = React.useCallback(
    (q) => axios.get(`${API_URL}/api/profile/suggest`, { params: { field, q } }).then((r) => r.data.suggestions || []),
    [field]
  );
  return <SuggestingInput {...props} fetchSuggestions={fetcher} />;
};

// City / area search (OpenStreetMap data via Photon, no key needed)
const placeName = (p) => {
  const parts = [p.name, p.city !== p.name ? p.city : '', p.state, p.country].filter(Boolean);
  return [...new Set(parts)].join(', ');
};

export const LocationInput = (props) => {
  const fetcher = React.useCallback(
    (q) => fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&layer=city&layer=district&layer=locality&layer=state`)
      .then((r) => r.json())
      .then((d) => [...new Set((d.features || []).map((f) => placeName(f.properties)).filter(Boolean))]),
    []
  );
  return <SuggestingInput {...props} minChars={2} icon={FiMapPin} fetchSuggestions={fetcher} />;
};

export default AutocompleteInput;
