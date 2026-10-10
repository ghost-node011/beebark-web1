import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { refreshBadges } from '../hooks/useNavBadges';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  FiSend, FiArrowLeft, FiSearch, FiStar, FiArchive, FiTrash2, FiFlag, FiSlash,
  FiMoreVertical, FiUser, FiInbox, FiX, FiAlertOctagon, FiCheck, FiClock, FiAlertCircle, FiMail, FiPaperclip, FiFile, FiDownload, FiImage
} from 'react-icons/fi';
import { API_URL } from '../config/api';
import ReportDialog from '../components/ReportDialog';
import { SkeletonRows } from '../components/Skeletons';
import { personHeadline } from '../utils/personHeadline';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'starred', label: 'Starred' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'archived', label: 'Archived' },
  { id: 'blocked', label: 'Blocked' }
];

const EMPTY_TEXT = {
  all: 'No conversations yet. Message one of your connections to start.',
  unread: "You're all caught up.",
  starred: 'Star important conversations to find them here.',
  jobs: 'Conversations with people you hired or applied to will show here.',
  archived: 'Nothing archived.',
  blocked: "You haven't blocked anyone."
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

const clock = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// "just now", "5 min ago", "2 h ago", then a date and time
const ago = (d, now) => {
  const s = Math.max(0, Math.floor((now - new Date(d)) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${listTime(d)}, ${clock(d)}`;
};

const fileUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  // Photos sent before the HEIC fix: ask Cloudinary for a browser-friendly copy
  if (/res\.cloudinary\.com\/.+\/image\/upload\/(?!f_auto)/.test(url) && /\.(heic|heif)$/i.test(url)) {
    return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_2400/').replace(/\.(heic|heif)$/i, '.jpg');
  }
  return url;
};
const fileSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const MAX_FILE = 18 * 1024 * 1024;
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.dwg,.dxf,.skp,.rvt';

// What the conversation list shows for a message that's only files
const previewText = (text, attachments = []) => {
  if (text) return text;
  if (!attachments.length) return '';
  if (attachments.every((a) => a.kind === 'image')) return `📷 Photo${attachments.length > 1 ? `s (${attachments.length})` : ''}`;
  return `📎 ${attachments[0].name || 'File'}${attachments.length > 1 ? ` +${attachments.length - 1}` : ''}`;
};

// Photos as a grid, other files as download rows
const Attachments = ({ items, mine }) => {
  const images = items.filter((a) => a.kind === 'image');
  const files = items.filter((a) => a.kind !== 'image');
  return (
    <div className="space-y-1.5 mb-1">
      {images.length > 0 && (
        <div className={`grid gap-1 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {images.map((a) => (
            <a key={a.url} href={fileUrl(a.url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block overflow-hidden rounded-lg bg-black/5">
              <img src={a.preview || fileUrl(a.url)} alt={a.name || 'Photo'} className={`w-full object-cover ${images.length > 1 ? 'h-28' : 'max-h-72'}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {files.map((a) => (
        <a
          key={a.url}
          href={fileUrl(a.url)}
          target="_blank"
          rel="noopener noreferrer"
          download={a.name || true}
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-white hover:bg-gray-50'}`}
        >
          <FiFile className="w-5 h-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{a.name || 'File'}</span>
            {a.size > 0 && <span className="block text-[10px] opacity-60">{fileSize(a.size)}</span>}
          </span>
          <FiDownload className="w-4 h-4 shrink-0 opacity-70" />
        </a>
      ))}
    </div>
  );
};

const statusOf = (m) => (m.failed ? 'failed' : m.pending ? 'sending' : m.readAt ? 'read' : m.deliveredAt ? 'delivered' : 'sent');

// Sending: clock. Sent: one tick. Delivered: two grey ticks. Read: two blue ticks.
const Ticks = ({ status, className = '' }) => {
  if (status === 'sending') return <FiClock className={`w-3 h-3 ${className}`} aria-label="Sending" />;
  if (status === 'failed') return <FiAlertCircle className={`w-3.5 h-3.5 text-red-600 ${className}`} aria-label="Not sent" />;
  const colour = status === 'read' ? 'text-sky-500' : '';
  return (
    <span className={`inline-flex ${colour} ${className}`} aria-label={status === 'read' ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent'}>
      <FiCheck className="w-3.5 h-3.5" strokeWidth={3} />
      {status !== 'sent' && <FiCheck className="w-3.5 h-3.5 -ml-2" strokeWidth={3} />}
    </span>
  );
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
  const reconnectPeople = useRef({}); // unblocked people stay in the Blocked list until you leave it
  const [newMessage, setNewMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [infoFor, setInfoFor] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]); // { id, name, size, kind, preview, status, data }
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null); // message id whose receipt details are open
  const [now, setNow] = useState(Date.now());
  const receiptsOn = user?.readReceipts !== false;

  // Keeps "Seen 3 min ago" current
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const messagesEndRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selected?.person?._id || null;

  // People you blocked: listed under the Blocked filter, and unblockable from an open chat
  const [blockedPeople, setBlockedPeople] = useState([]);
  const [reconnect, setReconnect] = useState({}); // personId -> 'unblocked' | 'requested'
  const fetchBlocked = useCallback(() => axios.get(`${API_URL}/api/account/blocked`, { silent: true })
    .then((res) => setBlockedPeople(res.data.blocked || []))
    .catch(() => {}), []);
  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);
  useEffect(() => { if (filter !== 'blocked') setReconnect({}); }, [filter]);

  const unblockPerson = async (person) => {
    try {
      await axios.delete(`${API_URL}/api/account/block/${person._id}`);
      setBlockedPeople((list) => list.filter((p) => p._id !== person._id));
      setReconnect((r) => ({ ...r, [person._id]: 'unblocked' }));
      if (selected?.person._id === person._id) setBlocked(false);
      refreshUser?.();
      toast.success(`${person.name} is unblocked. Connect again to message each other.`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not unblock');
    }
  };

  const connectAgain = async (person) => {
    try {
      await axios.post(`${API_URL}/api/connections/send-request/${person._id}`);
      setReconnect((r) => ({ ...r, [person._id]: 'requested' }));
      toast.success(`Connection request sent to ${person.name}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send the request');
    }
  };

  const fetchConversations = useCallback(async () => {
    if (filter === 'blocked') {
      await fetchBlocked();
      setLoadingList(false);
      return;
    }
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
  }, [filter, query, fetchBlocked]);

  useEffect(() => {
    const t = setTimeout(fetchConversations, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchConversations, query]);

  // Update one row in place (and move it to the top) rather than reloading the list
  const refetchTimer = useRef(null);
  const touchRow = useCallback((personId, change) => {
    let found = false;
    setConversations((list) => {
      const i = list.findIndex((c) => c.person._id === personId);
      if (i < 0) return list;
      found = true;
      const row = change(list[i]);
      return [row, ...list.slice(0, i), ...list.slice(i + 1)];
    });
    setSelected((cur) => (cur && cur.person._id === personId ? change(cur) : cur));
    if (!found) {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchConversations, 400);
    }
  }, [fetchConversations]);

  const openConversation = useCallback(async (row) => {
    setSelected(row);
    setInfoFor(null);
    setPendingFiles([]);
    setMessages([]);
    setBlocked(false);
    try {
      const res = await axios.get(`${API_URL}/api/messages/${row.person._id}`);
      setMessages(res.data.messages || []);
      setBlocked(!!res.data.blocked);
      refreshBadges();
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
    const draft = searchParams.get('draft');
    if (draft) setNewMessage(draft.slice(0, 5000));
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
      const open = message.sender === selectedIdRef.current && document.visibilityState === 'visible';
      if (message.sender === selectedIdRef.current) {
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      }
      if (open) socket.emit('mark-read', { other: message.sender });
      touchRow(message.sender, (row) => ({
        ...row,
        lastMessage: { text: previewText(message.text, message.attachments), fromMe: false, createdAt: message.createdAt },
        unread: open ? 0 : (row.unread || 0) + 1
      }));
      if (!open) setTotals((t) => ({ ...t, unreadMessages: (t.unreadMessages || 0) + 1 }));
    };
    // Receipts for messages you sent
    const stamp = (field) => ({ by, at }) => {
      if (by === selectedIdRef.current) {
        setMessages((prev) => prev.map((m) => (String(m.sender) === String(myId) && !m.pending && !m.failed
          ? { ...m, deliveredAt: m.deliveredAt || at, ...(field === 'readAt' ? { readAt: m.readAt || at } : {}) }
          : m)));
      }
      setConversations((list) => list.map((c) => (c.person._id === by && c.lastMessage?.fromMe
        ? { ...c, lastMessage: { ...c.lastMessage, deliveredAt: c.lastMessage.deliveredAt || at, ...(field === 'readAt' ? { readAt: c.lastMessage.readAt || at } : {}) } }
        : c)));
    };
    const onDelivered = stamp('deliveredAt');
    const onRead = stamp('readAt');
    socket.on('receive-message', onReceive);
    socket.on('messages-delivered', onDelivered);
    socket.on('messages-read', onRead);
    return () => {
      socket.off('receive-message', onReceive);
      socket.off('messages-delivered', onDelivered);
      socket.off('messages-read', onRead);
    };
  }, [socket, touchRow, myId]);

  // Coming back to the tab with a chat open reads what arrived meanwhile
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && selectedIdRef.current) {
        if (socket?.connected) socket.emit('mark-read', { other: selectedIdRef.current });
        touchRow(selectedIdRef.current, (row) => ({ ...row, unread: 0 }));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [socket, touchRow]);

  // Without a live connection, poll the open conversation
  useEffect(() => {
    if (!selected || socket?.connected) return undefined;
    const id = selected.person._id;
    const t = setInterval(() => {
      axios.get(`${API_URL}/api/messages/${id}`, { silent: true }).then((res) => setMessages(res.data.messages || [])).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [selected, socket]);

  useEffect(() => {
    // Scroll only the message pane (scrollIntoView also moved the whole page)
    const pane = messagesEndRef.current?.parentElement;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Show the message straight away, then swap in the saved copy (or mark it failed)
  const deliver = async (receiver, text, clientId, attachments = []) => {
    const settle = (saved, error) => {
      setMessages((prev) => prev.map((m) => (m.clientId !== clientId ? m
        : saved ? { ...saved, clientId } : { ...m, pending: false, failed: true, error })));
      if (saved) {
        touchRow(receiver, (row) => ({ ...row, lastMessage: { text: previewText(saved.text, saved.attachments), fromMe: true, createdAt: saved.createdAt, deliveredAt: saved.deliveredAt, readAt: null } }));
      } else {
        toast.error(error || 'Message not sent');
      }
    };
    if (socket?.connected) {
      socket.timeout(10000).emit('send-message', { receiver, text, attachments, clientId }, (err, res) => {
        if (err) settle(null, 'No response from the server. Tap the message to retry.');
        else if (res?.ok) settle(res.message);
        else settle(null, res?.error);
      });
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/messages/send`, { receiver, text, attachments });
      settle(res.data.data);
    } catch (error) {
      settle(null, error.response?.data?.error || 'Message not sent');
    }
  };

  // Files upload as soon as they're picked, so sending is instant
  const addFiles = async (fileList) => {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    const room = 5 - pendingFiles.length;
    if (room <= 0) return toast.error('Send up to 5 files at a time');
    if (picked.length > room) toast.error(`Only the first ${room} file${room > 1 ? 's' : ''} were added (5 max)`);
    const accepted = picked.slice(0, room).filter((f) => {
      if (f.size > MAX_FILE) { toast.error(`${f.name} is over 18 MB`); return false; }
      return true;
    });
    const entries = accepted.map((f) => ({
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      kind: f.type.startsWith('image/') ? 'image' : 'file',
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      status: 'uploading',
      file: f
    }));
    setPendingFiles((list) => [...list, ...entries]);
    await Promise.all(entries.map(async (entry) => {
      const body = new FormData();
      body.append('files', entry.file);
      try {
        const res = await axios.post(`${API_URL}/api/upload/chat-files`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
        const data = res.data.files?.[0];
        setPendingFiles((list) => list.map((x) => (x.id === entry.id ? { ...x, status: 'done', data } : x)));
      } catch (error) {
        toast.error(error.response?.data?.error || `Couldn't upload ${entry.name}`);
        setPendingFiles((list) => list.filter((x) => x.id !== entry.id));
      }
    }));
  };

  const removePending = (id) => setPendingFiles((list) => list.filter((x) => x.id !== id));
  const uploading = pendingFiles.some((f) => f.status === 'uploading');

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    const ready = pendingFiles.filter((f) => f.status === 'done');
    if ((!text && !ready.length) || !selected || blocked || uploading) return;
    const receiver = selected.person._id;
    const attachments = ready.map((f) => f.data);
    setNewMessage('');
    setPendingFiles([]);
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const shown = ready.map((f) => ({ ...f.data, preview: f.preview }));
    setMessages((prev) => [...prev, { _id: clientId, clientId, sender: myId, receiver, text, attachments: shown, createdAt: new Date().toISOString(), pending: true }]);
    deliver(receiver, text, clientId, attachments);
  };

  const retry = (m) => {
    setMessages((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, pending: true, failed: false, createdAt: new Date().toISOString() } : x)));
    deliver(m.receiver, m.text, m.clientId, (m.attachments || []).map(({ preview, ...a }) => a));
  };

  const markUnread = async (row) => {
    try {
      await axios.put(`${API_URL}/api/messages/conversations/${row.person._id}`, { markedUnread: true });
      setConversations((list) => list.map((c) => (c.person._id === row.person._id ? { ...c, unread: Math.max(1, c.unread || 0), markedUnread: true } : c)));
      if (selected?.person._id === row.person._id) setSelected(null);
    } catch {
      toast.error('Could not mark as unread');
    }
  };

  // Star / archive change on screen immediately; the server catches up behind
  const updateFlags = async (row, flags, note) => {
    const id = row.person._id;
    const before = { conversations, totals, selected };
    const leavesView = (flags.archived !== undefined && (filter === 'archived') !== flags.archived)
      || (flags.starred === false && filter === 'starred');
    setConversations((list) => (leavesView ? list.filter((c) => c.person._id !== id) : list.map((c) => (c.person._id === id ? { ...c, ...flags } : c))));
    setSelected((cur) => (cur && cur.person._id === id ? (flags.archived !== undefined ? null : { ...cur, ...flags }) : cur));
    setTotals((t) => {
      const next = { ...t };
      if (flags.starred !== undefined && !row.archived) next.starred = Math.max(0, (t.starred || 0) + (flags.starred ? 1 : -1));
      if (flags.archived !== undefined) {
        next.archived = Math.max(0, (t.archived || 0) + (flags.archived ? 1 : -1));
        next.all = Math.max(0, (t.all || 0) + (flags.archived ? -1 : 1));
        if (row.starred) next.starred = Math.max(0, (t.starred || 0) + (flags.archived ? -1 : 1));
      }
      return next;
    });
    if (note && flags.archived !== undefined) toast.success(note);
    try {
      await axios.put(`${API_URL}/api/messages/conversations/${id}`, flags);
    } catch {
      setConversations(before.conversations);
      setTotals(before.totals);
      setSelected(before.selected);
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
      toast.success(`${row.person.name} is blocked. You can unblock them under Blocked.`);
      setSelected(null);
      fetchBlocked();
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
      {!row.unread && (
        <DropdownMenuItem onClick={() => markUnread(row)} data-testid="chat-mark-unread"><FiMail className="mr-2" />Mark as unread</DropdownMenuItem>
      )}
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

  // The receipt line ("Seen 2 min ago") sits under your latest message, if it's after their latest
  const lastMineIndex = messages.length && String(messages[messages.length - 1].sender) === String(myId) ? messages.length - 1 : -1;

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
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? 'bg-[#16324F] text-white' : 'bg-white border border-[#DCE3EB] text-[#526174] hover:border-gray-300'}`}
                    data-testid={`chat-filter-${f.id}`}
                  >
                    {f.label}{n ? ` ${n}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filter === 'blocked' ? (
              <div data-testid="blocked-people">
                {[...blockedPeople, ...Object.keys(reconnect).filter((id) => !blockedPeople.some((p) => p._id === id)).map((id) => reconnectPeople.current[id]).filter(Boolean)]
                  .filter((p) => !query.trim() || p.name?.toLowerCase().includes(query.trim().toLowerCase()))
                  .map((p) => {
                    const state = reconnect[p._id];
                    if (!state) reconnectPeople.current[p._id] = p;
                    return (
                      <div key={p._id} className="flex items-center gap-3 px-4 py-3" data-testid={`blocked-${p._id}`}>
                        <Avatar className="w-11 h-11 shrink-0">
                          <AvatarImage src={p.profilePic} />
                          <AvatarFallback className="bg-gray-300">{p.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-black">{p.name}</p>
                          <p className="text-xs text-gray-500">{state === 'requested' ? 'Request sent' : state === 'unblocked' ? 'Unblocked' : 'Blocked'}</p>
                        </div>
                        {!state && <Button size="sm" variant="outline" onClick={() => unblockPerson(p)} data-testid={`unblock-${p._id}`}>Unblock</Button>}
                        {state === 'unblocked' && <Button size="sm" onClick={() => connectAgain(p)} className="bg-[#16324F] hover:bg-[#0F2439] text-white" data-testid={`reconnect-${p._id}`}>Connect</Button>}
                      </div>
                    );
                  })}
                {blockedPeople.length === 0 && Object.keys(reconnect).length === 0 && (
                  <p className="px-6 py-12 text-center text-sm text-gray-500">{EMPTY_TEXT.blocked}</p>
                )}
              </div>
            ) : loadingList ? (
              <SkeletonRows rows={7} />
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
                      <p className={`flex-1 truncate text-sm flex items-center gap-1 ${row.unread ? 'text-black font-medium' : 'text-gray-500'}`}>
                        {row.lastMessage?.fromMe && <Ticks status={statusOf(row.lastMessage)} className="shrink-0 text-gray-400" />}
                        <span className="truncate">{row.lastMessage ? `${row.lastMessage.fromMe ? 'You: ' : ''}${row.lastMessage.text}` : personHeadline(row.person)}</span>
                      </p>
                      {row.unread > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#16324F] text-white text-[11px] font-bold flex items-center justify-center">{row.unread > 99 ? '99+' : row.unread}</span>
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
        <div
          className={`relative flex-1 flex-col min-w-0 ${selected ? 'flex' : 'hidden md:flex'}`}
          onDragOver={(e) => { if (selected && !blocked && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={(e) => { if (!selected || blocked) return; e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        >
          {dragging && (
            <div className="absolute inset-0 z-20 m-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-yellow-400 bg-yellow-50/90 pointer-events-none">
              <p className="flex items-center gap-2 font-semibold text-black"><FiImage />Drop files to attach</p>
            </div>
          )}
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

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-[#F5F7FA]">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-10">Say hello to {selected.person.name.split(' ')[0]}.</p>
                )}
                {messages.map((msg, idx) => {
                  const mine = String(msg.sender) === String(myId);
                  const prev = messages[idx - 1];
                  const newDay = !prev || !sameDay(new Date(prev.createdAt), new Date(msg.createdAt));
                  const status = mine ? statusOf(msg) : null;
                  const isLastMine = mine && idx === lastMineIndex;
                  const showInfo = infoFor === (msg.clientId || msg._id);
                  return (
                    <React.Fragment key={msg.clientId || msg._id || idx}>
                      {newDay && (
                        <div className="flex justify-center py-2">
                          <span className="rounded-full bg-white border border-gray-200 px-3 py-0.5 text-[11px] font-medium text-gray-500">{dayLabel(msg.createdAt)}</span>
                        </div>
                      )}
                      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <button
                          type="button"
                          onClick={() => (msg.failed ? retry(msg) : mine && setInfoFor(showInfo ? null : (msg.clientId || msg._id)))}
                          className={`text-left px-4 py-2 rounded-2xl max-w-[80%] sm:max-w-md break-words whitespace-pre-wrap ${mine ? 'bg-[#16324F] text-white rounded-br-sm' : 'bg-[#EEF2F6] text-[#1F2933] rounded-bl-sm cursor-text'} ${msg.failed ? 'ring-2 ring-red-300' : ''}`}
                          title={msg.failed ? 'Tap to retry' : mine ? 'Message info' : undefined}
                          data-testid={mine ? 'my-message' : 'their-message'}
                        >
                          {msg.attachments?.length > 0 && <Attachments items={msg.attachments} mine={mine} />}
                          {msg.text}
                          <span className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-black/50'}`}>
                            {clock(msg.createdAt)}
                            {mine && <Ticks status={status} className={status === 'read' ? 'text-[#7CC4FF]' : 'text-white/70'} />}
                          </span>
                        </button>
                        {msg.failed && (
                          <button type="button" onClick={() => retry(msg)} className="mt-0.5 text-[11px] font-medium text-red-600 hover:underline">Not sent. Tap to retry</button>
                        )}
                        {showInfo && !msg.pending && !msg.failed && (
                          <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600 space-y-0.5 shadow-sm" data-testid="message-info">
                            <p className="flex items-center gap-2"><Ticks status="sent" className="text-gray-400" />Sent {listTime(msg.createdAt) === clock(msg.createdAt) ? 'today' : listTime(msg.createdAt)}, {clock(msg.createdAt)}</p>
                            <p className="flex items-center gap-2"><Ticks status="delivered" className="text-gray-400" />{msg.deliveredAt ? `Delivered ${ago(msg.deliveredAt, now)}` : 'Not delivered yet'}</p>
                            {receiptsOn ? (
                              <p className="flex items-center gap-2"><Ticks status="read" />{msg.readAt ? `Read ${ago(msg.readAt, now)}` : 'Not read yet'}</p>
                            ) : (
                              <p className="text-gray-400">Read receipts are off in your settings</p>
                            )}
                          </div>
                        )}
                        {isLastMine && !showInfo && !msg.failed && (
                          <p className="mt-0.5 text-[11px] text-gray-500" data-testid="last-receipt">
                            {status === 'sending' ? 'Sending...'
                              : status === 'read' ? `Seen ${ago(msg.readAt, now)}`
                              : status === 'delivered' ? `Delivered ${ago(msg.deliveredAt, now)}`
                              : 'Sent'}
                          </p>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 sm:p-4 bg-white">
                {blocked ? (
                  blockedPeople.some((p) => p._id === selected.person._id) ? (
                    <div className="flex flex-wrap items-center justify-center gap-3 py-1">
                      <p className="text-sm text-gray-500">You blocked {selected.person.name}.</p>
                      <Button size="sm" variant="outline" onClick={() => unblockPerson(selected.person)} data-testid="chat-unblock">Unblock</Button>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500 py-2">You can't reply to this conversation.</p>
                  )
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    {pendingFiles.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="pending-files">
                        {pendingFiles.map((f) => (
                          <div key={f.id} className="relative shrink-0 w-20">
                            <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                              {f.preview ? <img src={f.preview} alt={f.name} className="w-full h-full object-cover" /> : <FiFile className="w-7 h-7 text-gray-400" />}
                              {f.status === 'uploading' && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-gray-600">{f.name}</p>
                            <button type="button" onClick={() => removePending(f.id)} className="absolute -top-1.5 -right-1.5 rounded-full bg-[#16324F] text-white p-0.5" aria-label={`Remove ${f.name}`}><FiX className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} data-testid="chat-file-input" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-gray-600 hover:bg-gray-100" aria-label="Attach files" title="Attach photos or files" data-testid="chat-attach">
                      <FiPaperclip className="w-5 h-5" />
                    </button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onPaste={(e) => { const files = Array.from(e.clipboardData?.files || []); if (files.length) { e.preventDefault(); addFiles(files); } }}
                      placeholder={pendingFiles.length ? 'Add a message (optional)' : 'Write a message...'}
                      className="flex-1 border-gray-300"
                      maxLength={5000}
                      spellCheck
                      data-testid="chat-input"
                    />
                    <button type="submit" disabled={uploading || (!newMessage.trim() && !pendingFiles.some((f) => f.status === 'done'))} className="w-11 h-11 bg-[#16324F] hover:bg-[#0F2439] disabled:opacity-50 rounded-lg flex items-center justify-center shrink-0 text-white" aria-label="Send" data-testid="chat-send">
                      <FiSend className="w-5 h-5 text-black" />
                    </button>
                    </div>
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
