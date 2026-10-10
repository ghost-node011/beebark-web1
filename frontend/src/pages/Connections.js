import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ShareMenu from '../components/ShareMenu';
import ReportDialog from '../components/ReportDialog';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent } from '../components/ui/tabs';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  FiSearch, FiUserPlus, FiMessageCircle, FiX, FiUsers, FiMoreHorizontal, FiUser,
  FiShare2, FiUserMinus, FiFlag, FiSlash, FiMapPin, FiClock, FiSend, FiCheck,
  FiSliders, FiUserX, FiArrowRight, FiBriefcase,
} from 'react-icons/fi';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { personHeadline } from '../utils/personHeadline';
import { SkeletonCards } from '../components/Skeletons';
import Highlight, { searchWords } from '../components/Highlight';
import { refreshBadges } from '../hooks/useNavBadges';
import { toggleFollow, followersLabel } from '../components/FollowButton';

// "3d ago" style label for a date, or '' when there isn't one
const timeAgo = (date) => {
  if (!date) return '';
  const secs = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (Number.isNaN(secs)) return '';
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const PersonAvatar = ({ person, className = 'w-14 h-14', fallbackClass = 'bg-[#32281F] text-white' }) => (
  <Avatar className={`${className} shrink-0`}>
    <AvatarImage src={person.profilePic} alt={person.name} className="object-cover" />
    <AvatarFallback className={`${fallbackClass} font-bold`}>{person.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
  </Avatar>
);

// A photo of the person's work (first portfolio image), or a picture of their field
const FIELD_PHOTO = {
  architecture: '1600585154340-be6161a56a0c', interiors: '1618221195710-dd6b41faaea6', real_estate: '1545324418-cc1a3fa10c00',
  construction: '1541888946425-d81bb19240f5', student: '1503387762-592deb58ef4e'
};
const coverFor = (p) => p.cover || p.coverPhoto
  || `https://images.unsplash.com/photo-${FIELD_PHOTO[p.role === 'student' ? 'student' : (p.industries || [])[0]] || FIELD_PHOTO.architecture}?auto=format&fit=crop&w=800&q=60`;

const CardTop = ({ person, children }) => (
  <>
    <div className="relative h-36 bg-[#EFECE8] bg-cover bg-center" style={{ backgroundImage: `url(${coverFor(person)})` }}>
      {children}
    </div>
    <div className="px-4 -mt-9 relative">
      <Link to={`/profile/${person.username}`} className="inline-block rounded-full ring-4 ring-white">
        <PersonAvatar person={person} className="w-[72px] h-[72px]" />
      </Link>
    </div>
  </>
);

const openToCollab = (p) => (p.availability || []).some((a) => /collab|project|freelance|hiring/i.test(a));

const CardIdentity = ({ person, words }) => (
  <div className="px-4 pt-1.5 min-w-0">
    <Link to={`/profile/${person.username}`} className="block text-[17px] font-semibold text-[#1C1712] hover:underline truncate">
      <Highlight text={person.name} words={words} />
    </Link>
    <p className="text-sm text-[#6B625A] line-clamp-1"><Highlight text={person.headline || personHeadline(person)} words={words} /></p>
    {person.location && (
      <p className="mt-1 text-xs text-[#6B625A] flex items-center gap-1 truncate">
        <FiMapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate"><Highlight text={person.location} words={words} /></span>
      </p>
    )}
    <div className="mt-2 min-h-[1.5rem] flex items-center gap-2 text-xs text-[#6B625A]">
      {person.mutualConnectionsCount > 0 ? (
        <>
          <span className="flex -space-x-2">
            {(person.mutualConnections || []).slice(0, 3).map((m, idx) => (
              <PersonAvatar key={m._id || idx} person={m} className="w-6 h-6 ring-2 ring-white text-[10px]" fallbackClass="bg-[#E9E3DC] text-[#32281F]" />
            ))}
          </span>
          {person.mutualConnectionsCount} mutual connection{person.mutualConnectionsCount === 1 ? '' : 's'}
        </>
      ) : openToCollab(person) ? (
        <><FiBriefcase className="w-3.5 h-3.5" />Open to collaboration</>
      ) : person.matchedOn ? (
        <span className="truncate"><Highlight text={person.matchedOn} words={words} /></span>
      ) : typeof person.followerCount === 'number' ? (
        <span data-testid={`follower-count-${person._id}`}>{followersLabel(person.followerCount)}</span>
      ) : null}
    </div>
  </div>
);

// "View profile →" on the left, the main action on the right
const CardFooter = ({ person, children }) => (
  <div className="mt-auto px-4 pb-4 pt-3 flex items-center justify-between gap-2">
    <Link to={`/profile/${person.username}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1C1712] hover:underline whitespace-nowrap">
      View profile <FiArrowRight className="w-4 h-4" />
    </Link>
    <div className="min-w-0 flex items-center gap-2">{children}</div>
  </div>
);

const CARD = 'bg-white border border-[#E6E1DB] rounded-2xl overflow-hidden flex flex-col hover:shadow-[0_12px_30px_-18px_rgba(50,40,31,0.45)] transition-shadow';

// Field chips over Discover and search results
const FIELDS = [
  { id: 'all', label: 'All' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'interiors', label: 'Interiors' },
  { id: 'real_estate', label: 'Real estate' },
  { id: 'construction', label: 'Construction' },
  { id: 'students', label: 'Students' }
];
const inField = (p, field) => field === 'all' || (field === 'students' ? p.role === 'student' : (p.industries || []).includes(field));

const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="bg-white border border-gray-200 rounded-xl text-center py-12 px-6">
    <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
    <p className="font-semibold text-black">{title}</p>
    {text && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const pill = 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium border';

const Connections = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [field, setField] = useState('all');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [reportTarget, setReportTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/suggestions`);
      setSuggestions(response.data.suggestions || []);
    } catch {
      console.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/list`);
      setConnections(response.data.connections || []);
    } catch {
      console.error('Failed to load connections');
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/pending`);
      setPendingRequests(response.data.requests || []);
    } catch {
      console.error('Failed to load pending requests');
    }
  }, []);

  const fetchSentRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/sent`);
      setSentRequests(response.data.sent || []);
    } catch {
      console.error('Failed to load sent requests');
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
    fetchConnections();
    fetchPendingRequests();
    fetchSentRequests();
  }, [fetchSuggestions, fetchConnections, fetchPendingRequests, fetchSentRequests]);

  const refreshAll = () => {
    fetchConnections();
    fetchPendingRequests();
    fetchSentRequests();
    refreshUser?.();
  };

  // Update one person's flags wherever they appear in suggestions or search results
  const patchPerson = (id, changes) => {
    setSuggestions((list) => list.map((s) => (s._id === id ? { ...s, ...changes } : s)));
    setSearchResults((list) => list.map((s) => (s._id === id ? { ...s, ...changes } : s)));
  };

  // Follow state and count change wherever this person is listed on the page
  const patchFollow = (id, changes) => {
    const apply = (list) => list.map((p) => (p._id === id ? { ...p, ...changes } : p));
    setSuggestions(apply);
    setSearchResults(apply);
    setConnections(apply);
    setPendingRequests(apply);
    setSentRequests(apply);
  };

  // Results update as you type (name, role, company, skills, city)
  const searchSeq = useRef(0);
  const runSearch = useCallback(async (term) => {
    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/people/search`, { params: { q: term, limit: 30, covers: 1 }, silent: true });
      if (seq !== searchSeq.current) return; // a newer search has started
      setSearchResults(response.data.people || []);
      setHasSearched(true);
      setActiveTab('search');
    } catch {
      toast.error('Search failed');
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  }, []);
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) return undefined;
    const t = setTimeout(() => runSearch(term), 200);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  // Search button / Enter: search now and show the results
  const handleSearch = (e) => {
    e?.preventDefault();
    const term = searchQuery.trim();
    if (!term) return;
    runSearch(term);
    setActiveTab('search');
  };
  const openAdvanced = () => navigate(`/search${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);

  const handleConnect = async (userId) => {
    setBusyId(userId);
    try {
      const { data } = await axios.post(`${API_URL}/api/connections/send-request/${userId}`);
      if (data?.connected) {
        // They had already asked to connect with you, so this connects you both
        toast.success("You're now connected");
        patchPerson(userId, { isConnected: true, requestSent: false, requestReceived: false });
        refreshAll();
        return;
      }
      toast.success('Connection request sent!');
      patchPerson(userId, { requestSent: true });
      fetchSentRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = async (requesterId) => {
    setBusyId(requesterId);
    try {
      await axios.post(`${API_URL}/api/connections/accept-request/${requesterId}`);
      refreshBadges();
      toast.success('Request accepted!');
      patchPerson(requesterId, { isConnected: true, requestReceived: false });
      setPendingRequests((list) => list.filter((r) => r._id !== requesterId));
      fetchConnections();
      fetchPendingRequests();
      refreshUser(); // user.connections is stale in context until this refetches it
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requesterId) => {
    setBusyId(requesterId);
    try {
      await axios.post(`${API_URL}/api/connections/reject-request/${requesterId}`);
      refreshBadges();
      toast.success('Invitation ignored');
      patchPerson(requesterId, { requestReceived: false });
      setPendingRequests((list) => list.filter((r) => r._id !== requesterId));
      fetchPendingRequests();
    } catch {
      toast.error('Failed to ignore request');
    } finally {
      setBusyId(null);
    }
  };

  const handleWithdraw = async (targetId) => {
    setBusyId(targetId);
    try {
      await axios.delete(`${API_URL}/api/connections/cancel-request/${targetId}`);
      toast.success('Request withdrawn');
      setSentRequests((list) => list.filter((p) => p._id !== targetId));
      patchPerson(targetId, { requestSent: false });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to withdraw request');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveConnection = async (person) => {
    if (!window.confirm(`Remove ${person.name} from your connections? They won't be notified.`)) return;
    try {
      await axios.delete(`${API_URL}/api/connections/remove/${person._id}`);
      toast.success('Connection removed');
      setConnections((list) => list.filter((c) => c._id !== person._id));
      patchPerson(person._id, { isConnected: false });
      fetchConnections();
      refreshUser();
    } catch {
      toast.error('Failed to remove connection');
    }
  };

  const handleBlock = async (person) => {
    if (!window.confirm(`Block ${person.name}? They won't be able to message or find you, and your connection will be removed.`)) return;
    try {
      await axios.post(`${API_URL}/api/account/block/${person._id}`);
      toast.success(`Blocked ${person.name}`);
      setConnections((list) => list.filter((c) => c._id !== person._id));
      setSuggestions((list) => list.filter((s) => s._id !== person._id));
      setSearchResults((list) => list.filter((s) => s._id !== person._id));
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to block');
    }
  };

  const clearSearch = () => {
    searchSeq.current += 1;
    setSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    if (activeTab === 'search') setActiveTab('connections');
  };

  const pendingIds = useMemo(() => new Set(pendingRequests.map((r) => String(r._id))), [pendingRequests]);
  const sentIds = useMemo(() => new Set(sentRequests.map((r) => String(r._id))), [sentRequests]);

  const visibleConnections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? connections.filter((c) => [c.name, c.username, personHeadline(c), c.location]
          .some((v) => v && v.toLowerCase().includes(q)))
      : connections;
    // The API returns connections oldest first (the order they were added)
    return sortBy === 'name'
      ? [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      : [...list].reverse();
  }, [connections, filter, sortBy]);

  // Right action for a person in suggestions/search: Connected / Pending / Accept / Connect
  const relationAction = (p, testId) => {
    const id = String(p._id);
    if (p.isConnected) {
      return (
        <Button variant="outline" onClick={() => navigate(`/chat?with=${p._id}`)} className="rounded-lg border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800">
          <FiMessageCircle className="w-4 h-4 mr-1.5" />Message
        </Button>
      );
    }
    if (p.requestReceived || pendingIds.has(id)) {
      return (
        <Button
          onClick={() => handleAccept(p._id)}
          disabled={busyId === p._id}
          className="rounded-lg bg-[#32281F] hover:bg-[#221A14] text-white font-semibold"
          data-testid={`accept-search-btn-${p._id}`}
        >
          <FiCheck className="w-4 h-4 mr-1.5" />Accept
        </Button>
      );
    }
    if (p.requestSent || sentIds.has(id)) {
      return (
        <span className={`${pill} rounded-lg border-gray-200 bg-gray-50 text-gray-500`}>
          <FiClock className="w-4 h-4" />Pending
        </span>
      );
    }
    return (
      <Button
        onClick={() => handleConnect(p._id)}
        disabled={busyId === p._id}
        className="rounded-lg bg-[#F4C430] hover:bg-[#E9B824] text-[#1C1712] font-semibold shadow-none"
        data-testid={testId}
      >
        <FiUserPlus className="w-4 h-4 mr-1.5" />Connect
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F6F4]" data-testid="connections-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header (wording by role) */}
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#6B625A]">CONNECTIONS</p>
            <h1 className="mt-1 text-[30px] sm:text-[44px] font-bold leading-[1.05] tracking-tight text-[#1C1712]" data-testid="connections-heading">
              {user?.role === 'student' ? 'Find your next connection.' : 'Good work starts with a connection.'}
            </h1>
            <p className="mt-2 text-[#6B625A] sm:text-lg">
              {user?.role === 'student' ? 'Meet mentors, studios and classmates shaping the built world.' : 'Discover people shaping the built world.'}
            </p>
          </div>

          {/* Tabs */}
          <nav className="mb-5 flex gap-1 sm:gap-6 overflow-x-auto border-b border-[#E6E1DB]" role="tablist" aria-label="Connections">
            {[
              { id: 'suggestions', label: 'Discover', testId: 'tab-suggestions' },
              { id: 'connections', label: 'My connections', count: connections.length, testId: 'tab-connections' },
              { id: 'requests', label: 'Requests', count: pendingRequests.length, testId: 'tab-requests' },
              { id: 'sent', label: 'Sent', count: sentRequests.length, testId: 'tab-sent' },
              ...(hasSearched ? [{ id: 'search', label: 'Results', count: searchResults.length, testId: 'tab-search' }] : [])
            ].map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} onClick={() => setActiveTab(t.id)} data-testid={t.testId}
                className={`relative shrink-0 px-2 sm:px-0 pb-3 pt-1 text-[15px] whitespace-nowrap ${activeTab === t.id ? 'font-semibold text-[#1C1712]' : 'text-[#6B625A] hover:text-[#1C1712]'}`}>
                {t.label}
                {typeof t.count === 'number' && <span className={`ml-2 inline-flex min-w-[22px] justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${t.id === 'requests' && t.count ? 'bg-[#F4C430] text-[#1C1712]' : 'bg-[#F2EFEC] text-[#6B625A]'}`}>{t.count}</span>}
                {activeTab === t.id && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#F4C430]" />}
              </button>
            ))}
          </nav>

          {/* People search */}
          <form onSubmit={handleSearch} className="mb-4 flex gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search people, firms or skills"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10 h-12 bg-white border border-gray-200 focus-visible:ring-[#7A6450] rounded-xl"
                data-testid="connection-search-input"
              />
              {searching && <span className="absolute right-10 top-1/2 -mt-2 h-4 w-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" aria-label="Searching" />}
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <Button
                type="submit"
                className="h-12 bg-[#32281F] hover:bg-[#221A14] text-white font-semibold px-4 sm:px-6 rounded-xl shrink-0"
                data-testid="search-button"
              >
                <FiSearch className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Search</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={openAdvanced}
              className="h-12 bg-white font-semibold px-4 rounded-xl shrink-0"
              data-testid="advanced-search-button"
              title="Search with filters (role, industry, location, open to)"
            >
              <FiSliders className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Filters</span>
            </Button>
          </form>

          {(activeTab === 'suggestions' || activeTab === 'search') && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Field">
              {FIELDS.map((f) => (
                <button key={f.id} type="button" onClick={() => setField(f.id)} aria-pressed={field === f.id} data-testid={`field-${f.id}`}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${field === f.id ? 'border-[#32281F] bg-[#32281F] text-white' : 'border-[#E6E1DB] bg-white text-[#1C1712] hover:border-[#CFC6BC]'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Invitations */}
          {activeTab === 'requests' && (pendingRequests.length > 0 ? (
            <section id="invitations" className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="invitations">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
                <h2 className="font-serif font-semibold text-lg text-black">Invitations</h2>
                <span className="text-xs font-semibold bg-[#32281F] text-white rounded-full px-2 py-0.5">{pendingRequests.length}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {pendingRequests.map((request) => (
                  <li key={request._id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4" data-testid={`invitation-${request._id}`}>
                    <Link to={`/profile/${request.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                      <PersonAvatar person={request} />
                      <div className="min-w-0">
                        <p className="font-semibold text-black truncate group-hover:underline">{request.name}</p>
                        <p className="text-sm text-gray-600 truncate">{personHeadline(request)}</p>
                        {request.requestedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(request.requestedAt)}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex gap-2 shrink-0 sm:ml-auto">
                      <Button
                        variant="ghost"
                        onClick={() => handleReject(request._id)}
                        disabled={busyId === request._id}
                        className="flex-1 sm:flex-none rounded-full text-gray-600 hover:text-black"
                        data-testid={`ignore-${request._id}`}
                      >
                        Ignore
                      </Button>
                      <Button
                        onClick={() => handleAccept(request._id)}
                        disabled={busyId === request._id}
                        className="flex-1 sm:flex-none rounded-full bg-[#32281F] hover:bg-[#221A14] text-white font-semibold"
                        data-testid={`accept-${request._id}`}
                      >
                        Accept
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : <EmptyState icon={FiUsers} title="No requests right now" text="When someone asks to connect, it shows up here." />)}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* My connections */}
            <TabsContent value="connections" className="mt-0">
              {connectionsLoading ? (
                <SkeletonCards count={6} media="h-28" />
              ) : connections.length === 0 ? (
                <EmptyState
                  icon={FiUsers}
                  title="No connections yet"
                  text="Connect with classmates, colleagues and firms you work with. They'll show up here."
                  action={(
                    <Button onClick={() => setActiveTab('suggestions')} className="rounded-full bg-[#32281F] hover:bg-[#221A14] text-white">
                      See suggestions
                    </Button>
                  )}
                />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="relative flex-1 min-w-0 sm:max-w-sm">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search your connections"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-9 h-10 bg-white rounded-lg"
                        data-testid="connection-filter-input"
                      />
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-2 sm:ml-auto text-sm">
                      <span className="text-gray-500">{visibleConnections.length} {visibleConnections.length === 1 ? 'person' : 'people'}</span>
                      <label className="flex items-center gap-2 text-gray-600">
                        <span className="hidden sm:inline">Sort by</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#7A6450]"
                          data-testid="connection-sort"
                        >
                          <option value="recent">Recently added</option>
                          <option value="name">Name (A–Z)</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {visibleConnections.length === 0 ? (
                    <EmptyState icon={FiSearch} title="No matches" text={`No connections match "${filter}".`} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {visibleConnections.map((c) => (
                        <div key={c._id} className={CARD} data-testid={`connection-${c._id}`}>
                          <CardTop person={c}>
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`More options for ${c.name}`}
                                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm"
                                  data-testid={`connection-menu-${c._id}`}
                                >
                                  <FiMoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => navigate(`/profile/${c.username}`)}>
                                  <FiUser className="mr-2" />View profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/chat?with=${c._id}`)}>
                                  <FiMessageCircle className="mr-2" />Message
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleFollow({ userId: c._id, name: c.name, isFollowing: c.isFollowing, followerCount: c.followerCount || 0, onChange: (changes) => patchFollow(c._id, changes) })}
                                  data-testid={`follow-${c._id}`}
                                >
                                  {c.isFollowing
                                    ? <><FiUserX className="mr-2" />Unfollow</>
                                    : <><FiUserPlus className="mr-2" />Follow</>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleRemoveConnection(c)} data-testid={`remove-connection-${c._id}`}>
                                  <FiUserMinus className="mr-2" />Remove connection
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setReportTarget(c)} data-testid={`report-${c._id}`}>
                                  <FiFlag className="mr-2" />Report
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBlock(c)} className="text-red-600 focus:text-red-600" data-testid={`block-${c._id}`}>
                                  <FiSlash className="mr-2" />Block
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardTop>
                          <CardIdentity person={c} />
                          <div className="mt-auto px-4 pb-4 pt-3 flex items-center gap-2">
                            <Link to={`/profile/${c.username}`} className="mr-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#1C1712] hover:underline whitespace-nowrap">View profile <FiArrowRight className="w-4 h-4" /></Link>
                            <Button
                              onClick={() => navigate(`/chat?with=${c._id}`)}
                              className="rounded-lg bg-[#32281F] hover:bg-[#221A14] text-white font-semibold"
                              data-testid={`message-${c._id}`}
                            >
                              <FiMessageCircle className="w-4 h-4 mr-1.5" />Message
                            </Button>
                            <ShareMenu
                              path={`/profile/${c.username}`}
                              title={c.name}
                              testId={`share-${c._id}`}
                              trigger={(
                                <button
                                  type="button"
                                  aria-label={`Share ${c.name}'s profile`}
                                  className="w-10 h-10 shrink-0 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                                  data-testid={`share-${c._id}`}
                                >
                                  <FiShare2 className="w-4 h-4" />
                                </button>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Suggestions */}
            <TabsContent value="suggestions" className="mt-0">
              {loading ? (
                <SkeletonCards count={6} media="h-28" />
              ) : suggestions.length === 0 ? (
                <EmptyState icon={FiUsers} title="No suggestions right now" text="Try searching for people by name, username or email." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {suggestions.filter((p) => inField(p, field)).length === 0 && (
                    <div className="sm:col-span-2 xl:col-span-3"><EmptyState icon={FiUsers} title="No one here yet" text="Try another field, or search by name." /></div>
                  )}
                  {suggestions.filter((p) => inField(p, field)).map((s) => (
                    <div key={s._id} className={CARD} data-testid={`suggestion-card-${s._id}`}>
                      <CardTop person={s}>
                        <button
                          type="button"
                          aria-label="Dismiss suggestion"
                          onClick={() => setSuggestions((list) => list.filter((x) => x._id !== s._id))}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-600 flex items-center justify-center shadow-sm"
                          data-testid={`dismiss-suggestion-${s._id}`}
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </CardTop>
                      <CardIdentity person={s} />
                      <CardFooter person={s}>{relationAction(s, `connect-btn-${s._id}`)}</CardFooter>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sent */}
            <TabsContent value="sent" className="mt-0">
              {sentRequests.length === 0 ? (
                <EmptyState icon={FiSend} title="No pending requests" text="Requests you send will wait here until they're accepted." />
              ) : (
                <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {sentRequests.map((p) => (
                    <li key={p._id} className="flex items-center gap-3 px-4 sm:px-5 py-4" data-testid={`sent-${p._id}`}>
                      <Link to={`/profile/${p.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                        <PersonAvatar person={p} />
                        <div className="min-w-0">
                          <p className="font-semibold text-black truncate group-hover:underline">{p.name}</p>
                          <p className="text-sm text-gray-600 truncate">{personHeadline(p)}</p>
                          {p.requestedAt && <p className="text-xs text-gray-400 mt-0.5">Sent {timeAgo(p.requestedAt)}</p>}
                        </div>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => handleWithdraw(p._id)}
                        disabled={busyId === p._id}
                        className="shrink-0 rounded-full text-gray-700 hover:text-red-600 hover:border-red-300"
                        data-testid={`withdraw-${p._id}`}
                      >
                        Withdraw
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            {/* People search results */}
            <TabsContent value="search" className="mt-0">
              {searchResults.length === 0 ? (
                <EmptyState
                  icon={FiSearch}
                  title="No people found"
                  text={searchQuery ? 'Try a different name, username, or email.' : 'Enter a name, username, or email to search.'}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {searchResults.filter((p) => inField(p, field)).map((p) => (
                    <div key={p._id} className={CARD} data-testid={`search-result-${p._id}`}>
                      <CardTop person={p} />
                      <CardIdentity person={p} words={searchWords(searchQuery)} />
                      <CardFooter person={p}>{relationAction(p, `connect-search-btn-${p._id}`)}</CardFooter>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onOpenChange={(open) => { if (!open) setReportTarget(null); }}
          person={reportTarget}
          context="profile"
          onDone={({ blocked }) => {
            if (!blocked) return;
            setConnections((list) => list.filter((c) => c._id !== reportTarget._id));
            refreshAll();
          }}
        />
      )}
    </div>
  );
};

export default Connections;
