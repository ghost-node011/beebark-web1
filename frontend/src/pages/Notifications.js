import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { FiBell, FiUserPlus, FiUserCheck, FiCheck, FiTrash2, FiRss, FiTag } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { SkeletonRows } from '../components/Skeletons';
import { notificationText, timeAgo } from '../components/NotificationBell';
import FollowButton from '../components/FollowButton';

const ICONS = { connection_request: FiUserPlus, connection_accepted: FiUserCheck, follow: FiRss, quote_request: FiTag };

const groupOf = (d) => {
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (now - date < 7 * 86400000) return 'This week';
  return 'Earlier';
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [handled, setHandled] = useState({}); // actorId -> 'accepted' | 'declined'
  // Ids of people you follow (null until loaded), for "Follow back" on follow notifications
  const [followingIds, setFollowingIds] = useState(null);
  const myId = user?.id || user?._id;

  useEffect(() => {
    if (!myId) return;
    axios.get(`${API_URL}/api/follow/${myId}/list`, { params: { type: 'following' }, silent: true })
      .then((res) => setFollowingIds(new Set((res.data.people || []).map((p) => String(p._id)))))
      .catch(() => setFollowingIds(null));
  }, [myId]);

  const setFollowing = (id, following) => setFollowingIds((ids) => {
    const next = new Set(ids || []);
    if (following) next.add(id); else next.delete(id);
    return next;
  });

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, { params: { page: nextPage, limit: 20, filter: filter === 'unread' ? 'unread' : undefined } });
      setItems((list) => (nextPage === 1 ? res.data.notifications : [...list, ...res.data.notifications]));
      setPage(res.data.page);
      setPages(res.data.pages);
      setUnreadCount(res.data.unreadCount);
    } catch {
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(1); }, [load]);

  const markRead = (n) => {
    if (n.read) return;
    setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    axios.put(`${API_URL}/api/notifications/${n._id}/read`).catch(() => {});
  };

  const markAllRead = async () => {
    await axios.put(`${API_URL}/api/notifications/mark-read`).catch(() => {});
    setItems((list) => (filter === 'unread' ? [] : list.map((x) => ({ ...x, read: true }))));
    setUnreadCount(0);
  };

  const remove = async (n) => {
    setItems((list) => list.filter((x) => x._id !== n._id));
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
    axios.delete(`${API_URL}/api/notifications/${n._id}`).catch(() => {});
  };

  const respond = async (n, accept) => {
    const id = n.actor?._id;
    try {
      await axios.post(`${API_URL}/api/connections/${accept ? 'accept' : 'reject'}-request/${id}`);
      setHandled((h) => ({ ...h, [id]: accept ? 'accepted' : 'declined' }));
      markRead(n);
      refreshUser?.();
      toast.success(accept ? `You're now connected with ${n.actor.name}` : 'Request declined');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update request');
    }
  };

  const pendingIds = new Set((user?.pendingRequests || []).map((p) => String(p._id || p)));
  let lastGroup = null;

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="notifications-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black">Notifications</h1>
              <p className="text-gray-600 mt-1">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} data-testid="mark-all-read"><FiCheck className="mr-1" />Mark all as read</Button>
            )}
          </div>

          <div className="flex gap-2">
            {['all', 'unread'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === f ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>

          <Card className="divide-y divide-gray-100 overflow-hidden">
            {items.length === 0 && !loading && (
              <div className="py-16 text-center">
                <FiBell className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
              </div>
            )}
            {items.map((n) => {
              const Icon = ICONS[n.type] || FiBell;
              const group = groupOf(n.createdAt);
              const header = group !== lastGroup ? group : null;
              lastGroup = group;
              const actorId = String(n.actor?._id || '');
              const canRespond = n.type === 'connection_request' && pendingIds.has(actorId) && !handled[actorId];
              return (
                <React.Fragment key={n._id}>
                  {header && <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 bg-white">{header}</p>}
                  <div className={`group flex items-start gap-3 px-4 py-3 ${n.read ? 'bg-white' : 'bg-yellow-50'}`}>
                    <Link to={n.actor?.username ? `/profile/${n.actor.username}` : '#'} onClick={() => markRead(n)} className="shrink-0">
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={n.actor?.profilePic} />
                        <AvatarFallback className="bg-yellow-400 text-black font-semibold">{n.actor?.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={() => { markRead(n); if (n.actor?.username) navigate(`/profile/${n.actor.username}`); }} className="text-left">
                        <p className="text-sm text-black leading-snug">{notificationText(n)}</p>
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Icon className="w-3 h-3" />{timeAgo(n.createdAt)}</p>
                      {canRespond && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => respond(n, true)} className="bg-yellow-400 hover:bg-yellow-500 text-black h-8">Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => respond(n, false)} className="h-8">Decline</Button>
                        </div>
                      )}
                      {n.type === 'follow' && actorId && (
                        followingIds ? (
                          !followingIds.has(actorId) && (
                            <div className="mt-2">
                              <FollowButton
                                userId={actorId}
                                name={n.actor?.name}
                                isFollowing={false}
                                label="Follow back"
                                onChange={({ isFollowing }) => { setFollowing(actorId, isFollowing); if (isFollowing) markRead(n); }}
                                className="h-8"
                              />
                            </div>
                          )
                        ) : n.actor?.username && (
                          <Link to={`/profile/${n.actor.username}`} onClick={() => markRead(n)} className="inline-block mt-1 text-xs font-medium text-gray-600 hover:text-black hover:underline">
                            View profile
                          </Link>
                        )
                      )}
                      {handled[actorId] && n.type === 'connection_request' && (
                        <p className="text-xs font-medium text-gray-500 mt-1">{handled[actorId] === 'accepted' ? 'Accepted' : 'Declined'}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button onClick={() => markRead(n)} className="p-1.5 text-gray-400 hover:text-black" aria-label="Mark as read" title="Mark as read"><FiCheck className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => remove(n)} className="p-1.5 text-gray-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100" aria-label="Remove notification" title="Remove"><FiTrash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {loading && <SkeletonRows rows={items.length ? 2 : 6} />}
          </Card>

          {page < pages && !loading && (
            <div className="text-center">
              <Button variant="outline" onClick={() => load(page + 1)}>Load more</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
