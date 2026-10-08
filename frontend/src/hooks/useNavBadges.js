import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// Anything that changes a count (opening a chat, answering an invitation)
// can ask the sidebar to refresh: window.dispatchEvent(new Event('badges:refresh'))
export const refreshBadges = () => window.dispatchEvent(new Event('badges:refresh'));

const EMPTY = { messages: 0, connections: 0, jobs: 0, notifications: 0 };

/** Counts behind the sidebar dots; refreshed on navigation, new messages and every minute. */
const useNavBadges = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const { pathname } = useLocation();
  const [badges, setBadges] = useState(EMPTY);
  const signedIn = !!user;

  const load = useCallback(() => {
    if (!signedIn) return;
    axios.get(`${API_URL}/api/notifications/badges`, { silent: true })
      .then((res) => {
        const next = { ...EMPTY, ...res.data };
        setBadges(next);
        window.dispatchEvent(new CustomEvent('badges:update', { detail: next }));
      })
      .catch(() => {});
  }, [signedIn]);

  useEffect(() => { load(); }, [load, pathname]);

  useEffect(() => {
    if (!signedIn) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000);
    window.addEventListener('badges:refresh', load);
    window.addEventListener('focus', load);
    return () => { clearInterval(t); window.removeEventListener('badges:refresh', load); window.removeEventListener('focus', load); };
  }, [signedIn, load]);

  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = () => setTimeout(load, 300);
    socket.on('receive-message', onMessage);
    return () => socket.off('receive-message', onMessage);
  }, [socket, load]);

  return badges;
};

// Read-only copy of the counts for other parts of the frame (e.g. the phone menu button)
export const useBadgeTotal = () => {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const on = (e) => setTotal((e.detail?.messages || 0) + (e.detail?.connections || 0) + (e.detail?.jobs || 0));
    window.addEventListener('badges:update', on);
    return () => window.removeEventListener('badges:update', on);
  }, []);
  return total;
};

export default useNavBadges;
