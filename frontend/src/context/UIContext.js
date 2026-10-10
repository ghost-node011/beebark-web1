import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Small UI state shared across the app shell: the phone sidebar drawer, and the
// desktop sidebar collapsed to icons (remembered on this device).
const UIContext = createContext({ sidebarOpen: false, setSidebarOpen: () => {}, collapsed: false, toggleCollapsed: () => {} });

export const useUI = () => useContext(UIContext);

const KEY = 'beebark.sidebarCollapsed';

export const UIProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });

  // Pages use lg:ml-64 / lg:left-64; a class on <html> narrows them (see index.css)
  useEffect(() => {
    document.documentElement.classList.toggle('sb-collapsed', collapsed);
    try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <UIContext.Provider value={{ sidebarOpen, setSidebarOpen, collapsed, toggleCollapsed }}>
      {children}
    </UIContext.Provider>
  );
};
