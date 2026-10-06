import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiSearch, FiClock, FiX, FiArrowRight } from 'react-icons/fi';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { API_URL } from '../config/api';
import { personHeadline } from '../utils/personHeadline';
import Highlight, { searchWords } from './Highlight';

const RECENT_KEY = 'beebark.recentSearches';
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch { return []; } };
const saveRecent = (q) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6))); } catch {}
};

export const STATUS_LABEL = { connected: '1st', sent: 'Pending', received: 'Wants to connect' };

/**
 * Top-bar people search: results appear as you type (name, role, company,
 * skills, place), arrow keys move, Enter opens, "See all results" goes to
 * the full search page.
 */
const PeopleSearchBox = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(readRecent);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); setTotal(0); return undefined; }
    setLoading(true);
    const t = setTimeout(() => {
      axios.get(`${API_URL}/api/people/search`, { params: { q: term, limit: 7 }, silent: true })
        .then((res) => { setResults(res.data.people || []); setTotal(res.data.total || 0); setActive(-1); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const goAll = (term = q.trim()) => {
    if (!term) return;
    saveRecent(term);
    setRecent(readRecent());
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };
  const goPerson = (p) => {
    if (q.trim()) saveRecent(q.trim());
    setRecent(readRecent());
    setOpen(false);
    setQ('');
    navigate(`/profile/${p.username}`);
  };

  const rows = q.trim() ? results : [];
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && active < rows.length) goPerson(rows[active]); else goAll(); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };
  const words = searchWords(q);

  return (
    <div className="relative w-full max-w-xl" ref={boxRef}>
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search people, roles, skills, companies"
        className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        role="combobox"
        aria-expanded={open}
        aria-controls="people-search-list"
        aria-autocomplete="list"
        data-testid="search-input"
      />
      {q && (
        <button type="button" onClick={() => { setQ(''); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-black" aria-label="Clear search"><FiX className="w-4 h-4" /></button>
      )}

      {open && (q.trim() || recent.length > 0) && (
        <div id="people-search-list" role="listbox" className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50 w-[min(36rem,calc(100vw-1.5rem))]" data-testid="search-dropdown">
          {!q.trim() ? (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent</p>
                <button type="button" onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch {} setRecent([]); }} className="text-xs text-slate-500 hover:text-black">Clear</button>
              </div>
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => { setQ(r); goAll(r); }} className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50">
                  <FiClock className="w-4 h-4 text-slate-400" />{r}
                </button>
              ))}
            </div>
          ) : (
            <>
              {rows.map((p, i) => (
                <button
                  key={p._id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => goPerson(p)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                  data-testid={`search-suggestion-${p.username}`}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={p.profilePic} />
                    <AvatarFallback className="bg-yellow-400 text-black font-semibold">{p.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm text-slate-700">
                      <span className="truncate"><Highlight text={p.name} words={words} /></span>
                      {STATUS_LABEL[p.status] && <span className="shrink-0 text-[11px] text-slate-400">· {STATUS_LABEL[p.status]}</span>}
                    </span>
                    <span className="block truncate text-xs text-slate-500"><Highlight text={p.headline || personHeadline(p)} words={words} /></span>
                    {(p.matchedOn || p.location) && (
                      <span className="block truncate text-[11px] text-slate-400">
                        {p.matchedOn ? <Highlight text={p.matchedOn} words={words} /> : <Highlight text={p.location} words={words} />}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {!loading && rows.length === 0 && <p className="px-4 py-4 text-sm text-slate-500">No people match “{q.trim()}”.</p>}
              <button
                type="button"
                onClick={() => goAll()}
                onMouseEnter={() => setActive(rows.length)}
                className={`w-full flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-black ${active === rows.length ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                data-testid="search-see-all"
              >
                <span className="truncate">See all results for “{q.trim()}”{total > rows.length ? ` (${total})` : ''}</span>
                <FiArrowRight className="shrink-0" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PeopleSearchBox;
