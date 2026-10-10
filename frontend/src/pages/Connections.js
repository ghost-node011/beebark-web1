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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  FiSearch, FiUserPlus, FiUserCheck, FiMessageCircle, FiX, FiUsers, FiMoreHorizontal, FiUser,
  FiShare2, FiUserMinus, FiFlag, FiSlash, FiMapPin, FiClock, FiSend, FiCheck,
  FiSliders, FiUserX,
} from 'react-icons/fi';
import { API_URL } from '../config/api';
import { getCopy } from '../config/roleDomainCopy';
import { useAuth } from '../context/AuthContext';
import { personHeadline } from '../utils/personHeadline';
import { SkeletonCards } from '../components/Skeletons';
import Highlight, { searchWords } from '../components/Highlight';
import { refreshBadges } from '../hooks/useNavBadges';
import FollowButton, { toggleFollow, followersLabel } from '../components/FollowButton';

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

const PersonAvatar = ({ person, className = 'w-14 h-14', fallbackClass = 'bg-[#16324F] text-white' }) => (
  <Avatar className={`${className} shrink-0`}>
    <AvatarImage src={person.profilePic} alt={person.name} className="object-cover" />
    <AvatarFallback className={`${fallbackClass} font-bold`}>{person.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
  </Avatar>
);

// Small cover band with the avatar overlapping it, shared by the card grids
const CardTop = ({ person, children }) => (
  <>
    <div
      className="relative h-16 bg-gradient-to-r from-yellow-200 via-amber-100 to-stone-200 bg-cover bg-center"
      style={person.coverPhoto ? { backgroundImage: `url(${person.coverPhoto})` } : undefined}
    >
      {children}
    </div>
    <div className="px-4 -mt-9 flex justify-center">
      <Link to={`/profile/${person.username}`} className="rounded-full ring-4 ring-white">
        <PersonAvatar person={person} className="w-[72px] h-[72px]" />
      </Link>
    </div>
  </>
);

const CardIdentity = ({ person, words }) => (
  <div className="px-4 pt-2 text-center min-w-0">
    <Link to={`/profile/${person.username}`} className="block font-semibold text-black hover:underline truncate">
      <Highlight text={person.name} words={words} />
    </Link>
    <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]"><Highlight text={personHeadline(person)} words={words} /></p>
    {typeof person.followerCount === 'number' && (
      <p className="text-xs text-gray-500" data-testid={`follower-count-${person._id}`}>{followersLabel(person.followerCount)}</p>
    )}
    {person.location && (
      <p className="mt-1 text-xs text-gray-500 flex items-center justify-center gap-1 truncate">
        <FiMapPin className="w-3 h-3 shrink-0" /><span className="truncate"><Highlight text={person.location} words={words} /></span>
      </p>
    )}
    {person.matchedOn && <p className="mt-1 text-xs text-gray-500 truncate"><Highlight text={person.matchedOn} words={words} /></p>}
    {person.mutualConnectionsCount > 0 && words && (
      <p className="mt-1 text-xs text-gray-500">{person.mutualConnectionsCount} mutual connection{person.mutualConnectionsCount > 1 ? 's' : ''}</p>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="bg-white border border-gray-200 rounded-xl text-center py-12 px-6">
    <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
    <p className="font-semibold text-black">{title}</p>
    {text && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const pill = 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium border';
const TAB_CLASS = 'flex-1 sm:flex-none rounded-full px-3 sm:px-4 py-1.5 text-sm text-gray-600 data-[state=active]:bg-[#16324F] data-[state=active]:text-white data-[state=active]:shadow-none whitespace-nowrap';

const Connections = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const copy = getCopy(user);
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
  const [activeTab, setActiveTab] = useState('connections');
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

  const followButton = (p) => (
    <FollowButton
      userId={p._id}
      name={p.name}
      isFollowing={p.isFollowing}
      followerCount={p.followerCount || 0}
      onChange={(changes) => patchFollow(p._id, changes)}
      size="default"
      className="shrink-0 px-3"
    />
  );

  // Results update as you type (name, role, company, skills, city)
  const searchSeq = useRef(0);
  const runSearch = useCallback(async (term) => {
    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/people/search`, { params: { q: term, limit: 30 }, silent: true });
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
        <Button variant="outline" onClick={() => navigate(`/chat?with=${p._id}`)} className="w-full rounded-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800">
          <FiUserCheck className="w-4 h-4 mr-1.5" /><span className="truncate">Connected · Message</span>
        </Button>
      );
    }
    if (p.requestReceived || pendingIds.has(id)) {
      return (
        <Button
          onClick={() => handleAccept(p._id)}
          disabled={busyId === p._id}
          className="w-full rounded-full bg-[#16324F] hover:bg-[#0F2439] text-white font-semibold"
          data-testid={`accept-search-btn-${p._id}`}
        >
          <FiCheck className="w-4 h-4 mr-1.5" />Accept
        </Button>
      );
    }
    if (p.requestSent || sentIds.has(id)) {
      return (
        <span className={`${pill} w-full border-gray-200 bg-gray-50 text-gray-500`}>
          <FiClock className="w-4 h-4" />Pending
        </span>
      );
    }
    return (
      <Button
        variant="outline"
        onClick={() => handleConnect(p._id)}
        disabled={busyId === p._id}
        className="w-full rounded-full border-black text-black font-semibold hover:bg-[#16324F] hover:text-white hover:border-[#16324F]"
        data-testid={testId}
      >
        <FiUserPlus className="w-4 h-4 mr-1.5" />Connect
      </Button>
    );
  };

  const counts = [
    { key: 'connections', label: copy.connectionsLabel, value: connections.length },
    { key: 'invitations', label: 'Invitations', value: pendingRequests.length },
    { key: 'sent', label: 'Sent', value: sentRequests.length }
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]" data-testid="connections-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-black">{copy.connectionsLabel}</h1>
              <p className="text-gray-600 mt-1">{copy.connectionsSubtitle}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:w-auto">
              {counts.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    if (c.key === 'invitations') document.getElementById('invitations')?.scrollIntoView({ behavior: 'smooth' });
                    else setActiveTab(c.key);
                  }}
                  className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 text-left hover:border-yellow-400 transition min-w-0"
                  data-testid={`count-${c.key}`}
                >
                  <p className="text-xl font-bold text-black leading-tight">{c.value}</p>
                  <p className="text-xs text-gray-500 truncate">{c.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* People search */}
          <form onSubmit={handleSearch} className="mb-6 flex gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0 max-w-2xl">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, role, company, skill or city"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10 h-12 bg-white border border-gray-200 focus-visible:ring-[#245EA8] rounded-xl"
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
                className="h-12 bg-[#16324F] hover:bg-[#0F2439] text-white font-semibold px-4 sm:px-6 rounded-xl shrink-0"
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
              <FiSliders className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Advanced</span>
            </Button>
          </form>

          {/* Invitations */}
          {pendingRequests.length > 0 && (
            <section id="invitations" className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="invitations">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
                <h2 className="font-serif font-semibold text-lg text-black">Invitations</h2>
                <span className="text-xs font-semibold bg-[#16324F] text-white rounded-full px-2 py-0.5">{pendingRequests.length}</span>
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
                        className="flex-1 sm:flex-none rounded-full bg-[#16324F] hover:bg-[#0F2439] text-white font-semibold"
                        data-testid={`accept-${request._id}`}
                      >
                        Accept
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full sm:w-auto sm:inline-flex h-auto justify-start overflow-x-auto mb-5 bg-white border border-gray-200 p-1 rounded-full gap-1">
              <TabsTrigger value="connections" className={TAB_CLASS} data-testid="tab-connections">
                My connections
              </TabsTrigger>
              <TabsTrigger value="suggestions" className={TAB_CLASS} data-testid="tab-suggestions">
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="sent" className={TAB_CLASS} data-testid="tab-sent">
                Sent{sentRequests.length > 0 ? ` (${sentRequests.length})` : ''}
              </TabsTrigger>
              {hasSearched && (
                <TabsTrigger value="search" className={TAB_CLASS} data-testid="tab-search">
                  Results ({searchResults.length})
                </TabsTrigger>
              )}
            </TabsList>

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
                    <Button onClick={() => setActiveTab('suggestions')} className="rounded-full bg-[#16324F] hover:bg-[#0F2439] text-white">
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
                          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#245EA8]"
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
                        <div key={c._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow" data-testid={`connection-${c._id}`}>
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
                          <div className="mt-auto p-4 flex gap-2">
                            <Button
                              onClick={() => navigate(`/chat?with=${c._id}`)}
                              className="flex-1 rounded-full bg-[#16324F] hover:bg-[#0F2439] text-white font-semibold"
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
                  {suggestions.map((s) => (
                    <div key={s._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow" data-testid={`suggestion-card-${s._id}`}>
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
                      <div className="px-4 mt-2 min-h-[1.75rem] flex items-center justify-center gap-2 text-xs text-gray-500">
                        {s.mutualConnectionsCount > 0 ? (
                          <>
                            <div className="flex -space-x-2">
                              {s.mutualConnections?.slice(0, 3).map((m, idx) => (
                                <PersonAvatar key={m._id || idx} person={m} className="w-6 h-6 ring-2 ring-white text-[10px]" fallbackClass="bg-gray-200 text-gray-700" />
                              ))}
                            </div>
                            <span>{s.mutualConnectionsCount} mutual connection{s.mutualConnectionsCount === 1 ? '' : 's'}</span>
                          </>
                        ) : s.commonSkills?.length > 0 ? (
                          <span className="truncate">Shared skills: {s.commonSkills.slice(0, 3).join(', ')}</span>
                        ) : null}
                      </div>
                      <div className="mt-auto p-4 flex gap-2">
                        <div className="flex-1 min-w-0">{relationAction(s, `connect-btn-${s._id}`)}</div>
                        {followButton(s)}
                      </div>
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
                  {searchResults.map((p) => (
                    <div key={p._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow" data-testid={`search-result-${p._id}`}>
                      <CardTop person={p} />
                      <CardIdentity person={p} words={searchWords(searchQuery)} />
                      <div className="mt-auto p-4 flex gap-2">
                        <div className="flex-1 min-w-0">{relationAction(p, `connect-search-btn-${p._id}`)}</div>
                        {followButton(p)}
                      </div>
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
