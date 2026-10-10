import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiX } from 'react-icons/fi';
import { Input } from '../ui/input';
import { API_URL } from '../../config/api';
import CompanyLogo from './CompanyLogo';

/**
 * Company name for Experience. Suggests BeeBark company Pages first (with logo),
 * then names other members typed. Picking a Page links the entry to it.
 * `value` is the name, `pageId` the linked Page (or null).
 */
const CompanyInput = ({ value, pageId, onChange, placeholder = 'e.g. Studio Lotus', testId = 'exp-company', canCreatePage = true }) => {
  const [pages, setPages] = useState([]);
  const [names, setNames] = useState([]);
  const [open, setOpen] = useState(false);
  const [linked, setLinked] = useState(null); // the picked Page, for the chip
  const typed = useRef(false);
  const box = useRef(null);

  // Show the linked Page when editing an existing entry
  useEffect(() => {
    if (!pageId || linked?._id === pageId) return;
    axios.get(`${API_URL}/api/companies/search`, { params: { q: value }, silent: true })
      .then((res) => setLinked((res.data.pages || []).find((p) => p._id === pageId) || { _id: pageId, name: value }))
      .catch(() => {});
  }, [pageId, value, linked]);

  useEffect(() => {
    if (!typed.current) return undefined;
    const q = (value || '').trim();
    if (!q) { setPages([]); setNames([]); setOpen(false); return undefined; }
    let cancelled = false;
    const t = setTimeout(() => {
      Promise.all([
        axios.get(`${API_URL}/api/companies/search`, { params: { q }, silent: true }).then((r) => r.data.pages || []).catch(() => []),
        axios.get(`${API_URL}/api/profile/suggest`, { params: { field: 'company', q }, silent: true }).then((r) => r.data.suggestions || []).catch(() => [])
      ]).then(([p, n]) => {
        if (cancelled) return;
        const pageNames = new Set(p.map((x) => x.name.toLowerCase()));
        setPages(p.slice(0, 5));
        setNames(n.filter((x) => !pageNames.has(x.toLowerCase()) && x.toLowerCase() !== q.toLowerCase()).slice(0, 5));
        setOpen(p.length > 0 || n.length > 0);
      });
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pickPage = (p) => { typed.current = false; setLinked(p); onChange(p.name, p._id); setOpen(false); };
  const pickName = (n) => { typed.current = false; setLinked(null); onChange(n, null); setOpen(false); };

  return (
    <div className="relative" ref={box}>
      {pageId && linked ? (
        <div className="flex items-center gap-2 rounded-md border border-input bg-white px-2 py-1.5" data-testid={`${testId}-linked`}>
          <CompanyLogo page={linked} className="w-7 h-7" rounded="rounded-md" text="text-[10px]" />
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{linked.name}</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-green-700"><FiCheckCircle />Company page</span>
          <button type="button" onClick={() => { setLinked(null); onChange(value, null); }} className="p-1 text-gray-400 hover:text-black" aria-label="Unlink company page"><FiX /></button>
        </div>
      ) : (
        <Input value={value} onChange={(e) => { typed.current = true; onChange(e.target.value, null); }} onFocus={() => (pages.length || names.length) && setOpen(true)}
          placeholder={placeholder} autoComplete="off" spellCheck data-testid={testId} />
      )}
      {open && !pageId && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1 max-h-72 overflow-y-auto" role="listbox">
          {pages.map((p) => (
            <button key={p._id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickPage(p)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-yellow-50" data-testid={`company-option-${p.slug}`}>
              <CompanyLogo page={p} className="w-8 h-8" rounded="rounded-md" text="text-[11px]" />
              <span className="min-w-0"><span className="block text-sm font-medium truncate">{p.name}</span><span className="block text-xs text-gray-500 truncate">Company page{p.locations?.[0] ? ` · ${p.locations[0]}` : ''}</span></span>
            </button>
          ))}
          {names.map((n) => (
            <button key={n} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickName(n)} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{n}</button>
          ))}
        </div>
      )}
      {!pageId && (
        <p className="mt-1 text-xs text-gray-400">Pick the company page if it has one.{canCreatePage && <> <Link to="/company/new" className="underline hover:text-black">Create a page</Link></>}</p>
      )}
    </div>
  );
};

export default CompanyInput;
