import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  FiSend, FiArrowLeft, FiSearch, FiStar, FiArchive, FiTrash2, FiFlag, FiSlash,
  FiMoreVertical, FiUser, FiInbox, FiX, FiAlertOctagon
} from 'react-icons/fi';
import { API_URL } from '../config/api';
import ReportDialog from '../components/ReportDialog';
import { personHeadline } from '../utils/personHeadline';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'starred', label: 'Starred' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'archived', label: 'Archived' }
];

const EMPTY_TEXT = {
  all: 'No conversations yet. Message one of your connections to start.',
  unread: "You're all caught up.",
  starred: 'Star important conversations to find them here.',
  jobs: 'Conversations with people you hired or applied to will show here.',
  archived: 'Nothing archived.'
};

const sameDay = (a, b) => a.toDateString() === b.toDateString();

const listTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (sameDay(date, now)) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';
  if (now - date < 6 * 86400000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const dayLabel = (d) => {
  const date = new Date(d);
  const now = new Date();
  if (sameDay(date, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};

const Chat = () => {
  const socket = useSocket();
  const { user, refreshUser } = useAuth();
  const myId = user?.id || user?._id;
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [totals, setTotals] = useState({});
  const [loadingList, setLoadingList] = useState(true);

  const [selected, setSelected] = useState(null); // a conversation row
  const [messages, setMessages] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selected?.person?._id || null;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/messages/conversations`, { params: { filter, q: query.trim() || undefined } });
      setConversations(res.data.conversations || []);
      setTotals(res.data.totals || {});
      // Keep the open conversation's flags current
      setSelected((cur) => (cur ? (res.data.conversations || []).find((c) => c.person._id === cur.person._id) || cur : cur));
    } catch {
      toast.error('Could not load conversations');
    } finally {
      setLoadingList(false);
    }
  }, [filter, query]);

  useEffect(() => {
    const t = setTimeout(fetchConversations, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchConversations, query]);

  const openConversation = useCallback(async (row) => {
    setSelected(row);
    setMessages([]);
    setBlocked(false);
    try {
      const res = await axios.get(`${API_URL}/api/messages/${row.person._id}`);
      setMessages(res.data.messages || []);
      setBlocked(!!res.data.blocked);
      if (row.unread) {
        setConversations((list) => list.map((c) => (c.person._id === row.person._id ? { ...c, unread: 0 } : c)));
        setTotals((t) => ({ ...t, unread: Math.max(0, (t.unread || 0) - 1), unreadMessages: Math.max(0, (t.unreadMessages || 0) - row.unread) }));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not open this conversation');
    }
  }, []);

  // Arriving with ?with=<userId> (from Connections or a profile) opens that chat,
  // even when it's archived or has no messages yet
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId || loadingList) return;
    const found = conversations.find((c) => c.person._id === withId);
    if (found) {
      openConversation(found);
      setSearchParams({}, { replace: true });
      return;
    }
    axios.get(`${API_URL}/api/messages/conversations`, { params: { filter: 'archived' } })
      .then((res) => {
        const archived = (res.data.conversations || []).find((c) => c.person._id === withId);
        if (archived) {
          setFilter('archived');
          openConversation(archived);
        } else {
          toast.error('You can only message your connections');
        }
      })
      .catch(() => {})
      .finally(() => setSearchParams({}, { replace: true }));
  }, [searchParams, conversations, loadingList, openConversation, setSearchParams]);

  // Live updates
  useEffect(() => {
    if (!socket) return undefined;
    const onReceive = (message) => {
      if (message.sender === selectedIdRef.current) {
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
        axios.put(`${API_URL}/api/messages/conversations/${message.sender}/read`).catch(() => {});
      }
      fetchConversations();
    };
    const onSent = (message) => {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !(String(m._id).startsWith('temp-') && m.text === message.text));
        return withoutTemp.some((m) => m._id === message._id) ? withoutTemp : [...withoutTemp, message];
      });
      fetchConversations();
    };
    const onError = (error) => {
      toast.error(error.error || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => !String(m._id).startsWith('temp-')));
    };
    socket.on('receive-message', onReceive);
    socket.on('message-sent', onSent);
    socket.on('message-error', onError);
    return () => {
      socket.off('receive-message', onReceive);
      socket.off('message-sent', onSent);
      socket.off('message-error', onError);
    };
  }, [socket, fetchConversations]);

  // Without a live connection, poll the open conversation
  useEffect(() => {
    if (!selected || socket?.connected) return undefined;
    const id = selected.person._id;
    const t = setInterval(() => {
      axios.get(`${API_URL}/api/messages/${id}`).then((res) => setMessages(res.data.messages || [])).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [selected, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !selected || blocked) return;
    const receiver = selected.person._id;
    setNewMessage('');
    const temp = { _id: `temp-${Date.now()}`, sender: myId, receiver, text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);

    if (socket?.connected) {
      socket.emit('send-message', { receiver, text });
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/messages/send`, { receiver, text });
      setMessages((prev) => [...prev.filter((m) => m._id !== temp._id), res.data.data]);
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
      setNewMessage(text);
    }
  };

  const updateFlags = async (row, flags, note) => {
    try {
      await axios.put(`${API_URL}/api/messages/conversations/${row.person._id}`, flags);
      if (note) toast.success(note);
      if (flags.archived !== undefined && selected?.person._id === row.person._id) setSelected(null);
      fetchConversations();
    } catch {
      toast.error('Could not update conversation');
    }
  };

  const deleteConversation = async (row) => {
    if (!window.confirm(`Delete your conversation with ${row.person.name}? Messages are removed for you only.`)) return;
    try {
      await axios.delete(`${API_URL}/api/messages/conversations/${row.person._id}`);
      toast.success('Conversation deleted');
      if (selected?.person._id === row.person._id) setSelected(null);
      fetchConversations();
    } catch {
      toast.error('Could not delete conversation');
    }
  };

  const markSpam = async (row) => {
    try {
      await axios.post(`${API_URL}/api/messages/report`, { userId: row.person._id, reason: 'spam', context: 'chat' });
      toast.success('Marked as spam and moved to Archived');
      if (selected?.person._id === row.person._id) setSelected(null);
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not mark as spam');
    }
  };

  const blockPerson = async (row) => {
    if (!window.confirm(`Block ${row.person.name}? They won't be able to message or find you, and your connection will be removed.`)) return;
    try {
      await axios.post(`${API_URL}/api/account/block/${row.person._id}`);
      toast.success(`${row.person.name} is blocked. You can unblock them in Settings.`);
      setSelected(null);
      refreshUser?.();
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not block');
    }
  };

  const conversationMenu = (row, align = 'end') => (
    <DropdownMenuContent align={align} className="w-52">
      <DropdownMenuItem onClick={() => updateFlags(row, { starred: !row.starred }, row.starred ? 'Removed star' : 'Starred')}>
        <FiStar className="mr-2" />{row.starred ? 'Remove star' : 'Star'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => updateFlags(row, { archived: !row.archived }, row.archived ? 'Moved to inbox' : 'Archived')}>
        {row.archived ? <FiInbox className="mr-2" /> : <FiArchive className="mr-2" />}{row.archived ? 'Move to inbox' : 'Archive'}
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to={`/profile/${row.person.username}`}><FiUser className="mr-2" />View profile</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => markSpam(row)} data-testid="chat-mark-spam"><FiAlertOctagon className="mr-2" />Mark as spam</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setReportOpen(row)} data-testid="chat-report"><FiFlag className="mr-2" />Report</DropdownMenuItem>
      <DropdownMenuItem onClick={() => blockPerson(row)} className="text-red-600"><FiSlash className="mr-2" />Block</DropdownMenuItem>
      <DropdownMenuItem onClick={() => deleteConversation(row)} className="text-red-600" data-testid="chat-delete"><FiTrash2 className="mr-2" />Delete conversation</DropdownMenuItem>
    </DropdownMenuContent>
  );

  const countFor = (id) => (id === 'unread' ? totals.unread : id === 'archived' ? totals.archived : id === 'starred' ? totals.starred : id === 'jobs' ? totals.jobs : null);
  const reportTarget = reportOpen && typeof reportOpen === 'object' ? reportOpen : selected;

  return (
    <div className="min-h-screen bg-white" data-testid="chat-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 flex h-[calc(100vh-4rem)]">
        {/* Conversation list — full width on mobile; hidden once a chat is open */}
        <div className={`w-full md:w-96 border-r border-gray-200 flex-col bg-gray-50 ${selected ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 pb-2 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-black">Messages</h1>
              {totals.unreadMessages > 0 && <span className="text-xs font-semibold text-gray-500">{totals.unreadMessages} unread</span>}
            </div>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className="bg-white pl-9 pr-8" data-testid="chat-search" />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black" aria-label="Clear search"><FiX className="w-4 h-4" /></button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
              {FILTERS.map((f) => {
                const n = countFor(f.id);
                return (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => { setFilter(f.id); setSelected(null); }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    data-testid={`chat-filter-${f.id}`}
                  >
                    {f.label}{n ? ` ${n}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="p-8 text-center text-sm text-gray-400">Loading...</p>
            ) : conversations.length > 0 ? conversations.map((row) => {
              const active = selected?.person._id === row.person._id;
              return (
                <div
                  key={row.person._id}
                  onClick={() => openConversation(row)}
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer border-l-4 ${active ? 'bg-white border-yellow-400' : 'border-transparent hover:bg-gray-100'}`}
                  data-testid={`conversation-${row.person._id}`}
                >
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={row.person.profilePic} />
                    <AvatarFallback className="bg-gray-300">{row.person.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-black ${row.unread ? 'font-bold' : 'font-semibold'}`}>{row.person.name}</p>
                      {row.starred && <FiStar className="w-3.5 h-3.5 shrink-0 text-yellow-500 fill-yellow-400" aria-label="Starred" />}
                      {row.jobs && <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Job</span>}
                      <span className="ml-auto shrink-0 text-xs text-gray-400">{listTime(row.lastMessage?.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`flex-1 truncate text-sm ${row.unread ? 'text-black font-medium' : 'text-gray-500'}`}>
                        {row.lastMessage ? `${row.lastMessage.fromMe ? 'You: ' : ''}${row.lastMessage.text}` : personHeadline(row.person)}
                      </p>
                      {row.unread > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-400 text-black text-[11px] font-bold flex items-center justify-center">{row.unread > 99 ? '99+' : row.unread}</span>
                      )}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-full text-gray-400 hover:bg-gray-200 hover:text-black md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" aria-label={`Options for ${row.person.name}`}>
                          <FiMoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      {conversationMenu(row)}
                    </DropdownMenu>
                  </div>
                </div>
              );
            }) : (
              <p className="p-8 text-center text-sm text-gray-500">{query ? `No conversations match "${query}"` : EMPTY_TEXT[filter]}</p>
            )}
          </div>
        </div>

        {/* Conversation — hidden on mobile until one is selected */}
        <div className={`flex-1 flex-col min-w-0 ${selected ? 'flex' : 'hidden md:flex'}`}>
          {selected ? (
            <>
              <div className="h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-white gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelected(null)} className="md:hidden p-1 -ml-1 text-gray-600 hover:text-black" aria-label="Back to conversations">
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                  <Link to={`/profile/${selected.person.username}`} className="shrink-0">
                    <Avatar className="w-10 h-10 hover:opacity-80 transition">
                      <AvatarImage src={selected.person.profilePic} />
                      <AvatarFallback>{selected.person.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0">
                    <Link to={`/profile/${selected.person.username}`} className="font-bold text-black hover:underline truncate block">{selected.person.name}</Link>
                    <p className="text-xs text-gray-500 truncate">{personHeadline(selected.person)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateFlags(selected, { starred: !selected.starred }, selected.starred ? 'Removed star' : 'Starred')}
                    className="p-2 rounded-full hover:bg-gray-100"
                    aria-label={selected.starred ? 'Remove star' : 'Star conversation'}
                    title={selected.starred ? 'Remove star' : 'Star'}
                  >
                    <FiStar className={`w-5 h-5 ${selected.starred ? 'text-yellow-500 fill-yellow-400' : 'text-gray-500'}`} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Conversation options" data-testid="chat-menu"><FiMoreVertical className="w-5 h-5 text-gray-600" /></button>
                    </DropdownMenuTrigger>
                    {conversationMenu(selected)}
                  </DropdownMenu>
                </div>
              </div>

              {selected.archived && (
                <div className="flex items-center justify-between gap-3 bg-gray-50 border-b px-4 sm:px-6 py-2 text-sm text-gray-600">
                  <span>This conversation is archived.</span>
                  <button onClick={() => updateFlags(selected, { archived: false }, 'Moved to inbox')} className="font-medium text-black hover:underline">Move to inbox</button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-[#FAF9F6]">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-10">Say hello to {selected.person.name.split(' ')[0]}.</p>
                )}
                {messages.map((msg, idx) => {
                  const mine = String(msg.sender) === String(myId);
                  const prev = messages[idx - 1];
                  const newDay = !prev || !sameDay(new Date(prev.createdAt), new Date(msg.createdAt));
                  return (
                    <React.Fragment key={msg._id || idx}>
                      {newDay && (
                        <div className="flex justify-center py-2">
                          <span className="rounded-full bg-white border border-gray-200 px-3 py-0.5 text-[11px] font-medium text-gray-500">{dayLabel(msg.createdAt)}</span>
                        </div>
                      )}
                      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl max-w-[80%] sm:max-w-md break-words whitespace-pre-wrap ${mine ? 'bg-yellow-400 text-black rounded-br-sm' : 'bg-white border text-black rounded-bl-sm'} ${String(msg._id).startsWith('temp-') ? 'opacity-60' : ''}`}>
                          {msg.text}
                          <span className="block text-[10px] text-right mt-0.5 text-black/50">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 sm:p-4 bg-white">
                {blocked ? (
                  <p className="text-center text-sm text-gray-500 py-2">You can't reply to this conversation.</p>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write a message..."
                      className="flex-1 border-gray-300"
                      maxLength={5000}
                      spellCheck
                      data-testid="chat-input"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="w-11 h-11 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 rounded-lg flex items-center justify-center shrink-0" aria-label="Send" data-testid="chat-send">
                      <FiSend className="w-5 h-5 text-black" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FiInbox className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {reportTarget && (
        <ReportDialog
          open={!!reportOpen}
          onOpenChange={(o) => setReportOpen(o)}
          person={reportTarget.person}
          context="chat"
          onDone={({ blocked: didBlock, reason }) => {
            if (didBlock || reason === 'spam') setSelected(null);
            if (didBlock) refreshUser?.();
            fetchConversations();
          }}
        />
      )}
    </div>
  );
};

export default Chat;
