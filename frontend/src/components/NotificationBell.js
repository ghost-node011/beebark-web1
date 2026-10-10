import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiBell, FiUserPlus, FiUserCheck, FiUserX, FiRss, FiTag } from 'react-icons/fi';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { API_URL } from '../config/api';

const MESSAGES = {
  connection_request: (name) => `${name} sent you a connection request`,
  connection_accepted: (name) => `${name} accepted your connection request`,
  connection_declined: (name) => `${name} declined your connection request`,
  page_admin: (name, n) => `${name} made you an admin of ${n?.meta?.pageName || 'a company page'}`,
  follow: (name) => `${name} started following you`,
  quote_request: (name, n) => `${name} asked for a quote${n?.meta?.itemTitle ? ` for ${n.meta.itemTitle}` : ''}${n?.meta?.message ? `: "${n.meta.message.slice(0, 120)}"` : ''}`
};

const ICONS = {
  connection_request: FiUserPlus,
  connection_accepted: FiUserCheck,
  connection_declined: FiUserX,
  follow: FiRss,
  quote_request: FiTag
};

export const notificationText = (n) => MESSAGES[n.type]?.(n.actor?.name || 'Someone', n) || 'New notification';

export const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(() => {
    axios.get(`${API_URL}/api/notifications`, { params: { limit: 15 }, silent: true })
      .then((res) => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      axios.put(`${API_URL}/api/notifications/mark-read`).catch(() => {});
    }
  };

  const handleClickNotification = (n) => {
    setOpen(false);
    if (n.actor?.username) navigate(`/profile/${n.actor.username}`);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative"
        aria-label="Notifications"
        data-testid="notification-bell"
      >
        <FiBell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#16324F] text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50" data-testid="notification-dropdown">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-black">Notifications</span>
            <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="text-xs font-medium text-slate-500 hover:text-black">See all</button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const Icon = ICONS[n.type] || FiBell;
                const message = notificationText(n);
                return (
                  <button
                    key={n._id}
                    onClick={() => handleClickNotification(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition ${!n.read ? 'bg-yellow-50' : ''}`}
                  >
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={n.actor?.profilePic} />
                      <AvatarFallback className="bg-[#16324F] text-white font-semibold">{n.actor?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black leading-snug">{message}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Icon className="w-3 h-3" />{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#16324F] mt-1.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="sticky bottom-0 w-full border-t border-slate-100 bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-slate-50"
            data-testid="notifications-view-all"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
