import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useAuth } from './AuthContext';

// Company Pages you manage, and which one you're "acting as" (null = yourself).
// The choice is remembered on this device.
const PagesContext = createContext({ pages: [], acting: null, setActingAs: () => {}, refreshPages: () => {}, loaded: false });

const KEY = 'beebark.actingAs';
const readKey = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeKey = (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* private mode */ } };

export const PagesProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [pages, setPages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [actingId, setActingId] = useState(readKey);

  const refreshPages = useCallback(async () => {
    if (!userId) { setPages([]); setLoaded(false); return []; }
    try {
      const res = await axios.get(`${API_URL}/api/companies/mine`, { silent: true });
      setPages(res.data.pages || []);
      return res.data.pages || [];
    } catch {
      return [];
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => { refreshPages(); }, [refreshPages]);

  const setActingAs = useCallback((pageId) => {
    setActingId(pageId || null);
    writeKey(pageId || null);
  }, []);

  // Signed out, or no longer an admin of that page: act as yourself
  const acting = useMemo(() => (actingId && pages.find((p) => p._id === actingId)) || null, [actingId, pages]);
  useEffect(() => {
    if (loaded && actingId && !acting) setActingAs(null);
  }, [loaded, actingId, acting, setActingAs]);

  const value = useMemo(() => ({ pages, acting, setActingAs, refreshPages, loaded }), [pages, acting, setActingAs, refreshPages, loaded]);
  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>;
};

export const usePages = () => useContext(PagesContext);

export const PAGE_TYPE_LABELS = {
  architecture_firm: 'Architecture firm',
  interior_firm: 'Interior design firm',
  real_estate: 'Real estate developer / agency',
  supplier: 'Supplier / manufacturer',
  construction: 'Construction / contractor',
  consultancy: 'Consultancy',
  education: 'Education',
  other: 'Other'
};
export const TEAM_SIZE_OPTIONS = ['1', '2-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
