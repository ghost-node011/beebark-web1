import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { LocationInput } from '../components/AutocompleteInput';
import { toast } from 'sonner';
import { FiSearch, FiX, FiMapPin, FiUserPlus, FiMessageCircle, FiUserCheck, FiClock, FiSliders } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { API_URL } from '../config/api';
import { INDUSTRIES } from '../config/onboarding';
import { AVAILABILITY_LABELS } from '../config/profileOptions';
import { personHeadline } from '../utils/personHeadline';
import Highlight, { searchWords } from '../components/Highlight';
import { useAuth } from '../context/AuthContext';
import FollowButton, { followersLabel } from '../components/FollowButton';

const FILTERS = {
  network: [{ v: '', l: 'Anyone' }, { v: 'connected', l: 'My connections' }, { v: 'not', l: 'Not connected' }],
  role: [{ v: '', l: 'Any role' }, { v: 'professional', l: 'Professionals' }, { v: 'student', l: 'Students' }],
  open: [{ v: '', l: 'Open to anything' }, ...['hiring', 'open_to_work', 'internship', 'freelance', 'new_clients', 'collaboration'].map((v) => ({ v, l: AVAILABILITY_LABELS[v] }))]
};
const KEYS = ['q', 'network', 'role', 'industry', 'location', 'open'];

const Chip = ({ active, children, onClick, testId }) => (
  <button type="button" onClick={onClick} data-testid={testId}
    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? 'border-[#32281F] bg-[#32281F] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
    {children}
  </button>
);

/** Full people search: instant results as you type, with filters kept in the URL. */
const Search = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || '']));
  const [text, setText] = useState(f.q);
  const [location, setLocation] = useState(f.location);
  const [data, setData] = useState({ people: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const setFilter = useCallback((key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Typing updates the URL (and so the results) after a short pause
  useEffect(() => { setText(f.q); }, [f.q]);
  useEffect(() => {
    const t = setTimeout(() => { if (text !== f.q) setFilter('q', text.trim() ? text : ''); }, 200);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => { if (location !== f.location) setFilter('location', location.trim()); }, 300);
    return () => clearTimeout(t);
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = KEYS.map((k) => f[k]).join('|');
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/people/search`, { params: { ...f, page, limit: 20 } });
      setData((d) => (page === 1 ? res.data : { ...res.data, people: [...d.people, ...res.data.people] }));
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, [load]);

  const patchPerson = (id, changes) => setData((d) => ({ ...d, people: d.people.map((p) => (p._id === id ? { ...p, ...changes } : p)) }));
  const setStatus = (id, status) => patchPerson(id, { status });
  const connect = async (p) => {
    setBusy((b) => ({ ...b, [p._id]: true }));
    try {
      if (p.status === 'received') {
        await axios.post(`${API_URL}/api/connections/accept-request/${p._id}`);
        setStatus(p._id, 'connected');
        toast.success(`You're now connected with ${p.name.split(' ')[0]}`);
      } else {
        const res = await axios.post(`${API_URL}/api/connections/send-request/${p._id}`);
        setStatus(p._id, res.data?.connected ? 'connected' : 'sent');
        toast.success(res.data?.connected ? `You're now connected with ${p.name.split(' ')[0]}` : 'Request sent');
      }
      refreshUser?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send request');
    } finally {
      setBusy((b) => ({ ...b, [p._id]: false }));
    }
  };

  const words = searchWords(f.q);
  const activeFilters = ['network', 'role', 'industry', 'location', 'open'].filter((k) => f[k]).length;
  const clearAll = () => setParams(f.q ? { q: f.q } : {}, { replace: true });

  return (
    <div className="min-h-screen bg-[#F7F6F4]" data-testid="search-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black font-serif">People</h1>
            <p className="text-gray-600 mt-1">Search by name, role, company, skill, specialisation or city — results update as you type.</p>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="e.g. interior designer pune, revit, studio lotus"
              className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white pl-12 pr-10 text-base focus:border-[#7A6450] focus:outline-none"
              data-testid="people-search-input"
            />
            {text && <button type="button" onClick={() => setText('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black" aria-label="Clear"><FiX /></button>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.network.slice(1).map((o) => (
              <Chip key={o.v} active={f.network === o.v} onClick={() => setFilter('network', f.network === o.v ? '' : o.v)} testId={`filter-network-${o.v}`}>{o.l}</Chip>
            ))}
            {FILTERS.role.slice(1).map((o) => (
              <Chip key={o.v} active={f.role === o.v} onClick={() => setFilter('role', f.role === o.v ? '' : o.v)} testId={`filter-role-${o.v}`}>{o.l}</Chip>
            ))}
            <Chip active={showFilters || activeFilters > 0} onClick={() => setShowFilters((s) => !s)} testId="filter-more">
              <span className="inline-flex items-center gap-1.5"><FiSliders className="w-3.5 h-3.5" />All filters{activeFilters ? ` (${activeFilters})` : ''}</span>
            </Chip>
            {activeFilters > 0 && <button type="button" onClick={clearAll} className="text-sm font-medium text-gray-600 hover:text-black">Reset</button>}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-black/5 bg-white p-4" data-testid="filters-panel">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700">Industry</span>
                <select value={f.industry} onChange={(e) => setFilter('industry', e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-2" data-testid="filter-industry">
                  <option value="">Any industry</option>
                  {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700">Location</span>
                <LocationInput value={location} onChange={setLocation} placeholder="Search a city" data-testid="filter-location" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700">Open to</span>
                <select value={f.open} onChange={(e) => setFilter('open', e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-2" data-testid="filter-open">
                  {FILTERS.open.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </label>
            </div>
          )}

          <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <p className="px-5 py-3 text-sm text-gray-500 border-b border-gray-100">
              {loading && data.people.length === 0 ? 'Searching…'
                : !f.q && !activeFilters ? 'Type to search, or pick a filter.'
                : `${data.total.toLocaleString('en-IN')} ${data.total === 1 ? 'person' : 'people'}`}
            </p>
            <div className="divide-y divide-gray-100">
              {data.people.map((p) => (
                <div key={p._id} className="flex items-start gap-4 px-5 py-4" data-testid={`person-${p.username}`}>
                  <Link to={`/profile/${p.username}`} className="shrink-0">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={p.profilePic} />
                      <AvatarFallback className="bg-[#32281F] text-white font-semibold">{p.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/profile/${p.username}`} className="font-semibold text-black hover:underline">
                      <Highlight text={p.name} words={words} />
                    </Link>
                    {p.status === 'connected' && <span className="ml-1.5 text-xs text-gray-400">· 1st</span>}
                    <p className="text-sm text-gray-700 break-words"><Highlight text={p.headline || personHeadline(p)} words={words} /></p>
                    <p className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {p.location && <span className="inline-flex items-center gap-1"><FiMapPin className="w-3 h-3" /><Highlight text={p.location} words={words} /></span>}
                      {p.mutualConnectionsCount > 0 && <span>{p.mutualConnectionsCount} mutual connection{p.mutualConnectionsCount > 1 ? 's' : ''}</span>}
                      {typeof p.followerCount === 'number' && <span data-testid={`follower-count-${p._id}`}>{followersLabel(p.followerCount)}</span>}
                    </p>
                    {p.matchedOn && <p className="text-xs text-gray-500 mt-1"><Highlight text={p.matchedOn} words={words} /></p>}
                    {p.availability?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.availability.slice(0, 3).map((a) => <span key={a} className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">{AVAILABILITY_LABELS[a] || a}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {p.status === 'connected' ? (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/chat?with=${p._id}`)} className="rounded-full"><FiMessageCircle className="mr-1.5" />Message</Button>
                    ) : p.status === 'sent' ? (
                      <Button variant="outline" size="sm" disabled className="rounded-full"><FiClock className="mr-1.5" />Pending</Button>
                    ) : (
                      <Button size="sm" onClick={() => connect(p)} disabled={busy[p._id]} className="rounded-full bg-[#32281F] text-white hover:bg-[#221A14]" data-testid={`person-connect-${p.username}`}>
                        {p.status === 'received' ? <><FiUserCheck className="mr-1.5" />Accept</> : <><FiUserPlus className="mr-1.5" />Connect</>}
                      </Button>
                    )}
                    <FollowButton
                      userId={p._id}
                      name={p.name}
                      isFollowing={p.isFollowing}
                      followerCount={p.followerCount || 0}
                      onChange={(changes) => patchPerson(p._id, changes)}
                    />
                  </div>
                </div>
              ))}
              {!loading && (f.q || activeFilters > 0) && data.people.length === 0 && (
                <p className="px-5 py-10 text-center text-gray-500">No people match. Try fewer words or remove a filter.</p>
              )}
            </div>
            {data.page < data.pages && (
              <div className="border-t border-gray-100 p-3 text-center">
                <Button variant="ghost" onClick={() => load(data.page + 1)} disabled={loading}>{loading ? 'Loading…' : 'Show more'}</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
