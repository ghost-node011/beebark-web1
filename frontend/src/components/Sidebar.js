import { useInLayout } from '../context/LayoutContext';
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  FiHome, FiMessageCircle, FiUsers, FiLayers, FiBriefcase,
  FiVideo, FiX, FiImage, FiFileText, FiSend, FiHome as FiProperty, FiSettings, FiGrid
} from 'react-icons/fi';
import { getCopy } from '../config/roleDomainCopy';
import { personHeadline } from '../utils/personHeadline';
import { preloadPath } from '../lib/pages';
import useNavBadges from '../hooks/useNavBadges';
import { usePages } from '../context/PagesContext';
import CompanyLogo from './company/CompanyLogo';

const SidebarFrame = () => {
  const { user } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const close = () => setSidebarOpen(false);
  const copy = getCopy(user);
  const badges = useNavBadges();
  const countFor = { messages: badges.messages, connections: badges.connections, jobs: badges.jobs };

  const { acting, setActingAs } = usePages();
  const navigate = useNavigate();
  const location = useLocation();
  // Managing a company Page: its own menu
  const pageItems = acting && [
    { id: 'page-dashboard', path: `/company/${acting.slug}/admin`, icon: FiHome, label: 'Page dashboard', end: true },
    { id: 'page-view', path: `/company/${acting.slug}`, icon: FiGrid, label: 'Company page', end: true },
    { id: 'messages', path: '/chat', icon: FiMessageCircle, label: 'Messages' },
    { id: 'jobs', path: '/jobs?tab=posted', icon: FiBriefcase, label: 'Hiring' },
    { id: 'portfolio', path: '/portfolio', icon: FiImage, label: acting.type === 'supplier' ? 'Product catalogue' : 'Projects' },
    { id: 'news', path: '/news', icon: FiFileText, label: 'News' },
    { id: 'page-settings', path: `/company/${acting.slug}/admin?tab=edit`, icon: FiSettings, label: 'Page settings' }
  ];

  const personalItems = [
    { id: 'dashboard', path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { id: 'messages', path: '/chat', icon: FiMessageCircle, label: 'Messages' },
    { id: 'connections', path: '/connections', icon: FiUsers, label: copy.connectionsLabel },
    // { id: 'feed', path: '/feed', icon: FiLayers, label: 'Feed' },
    ...(copy.domain === 'real_estate' || (user?.industries || []).includes('real_estate')
      ? [{ id: 'listings', path: '/listings', icon: FiProperty, label: 'Listings' }]
      : []),
    { id: 'portfolio', path: '/portfolio', icon: FiImage, label: 'Portfolio' },
    // { id: 'reels', path: '/reels', icon: FiFilm, label: 'Reels' },
    // { id: 'projects', path: '/projects', icon: FiTrendingUp, label: 'Projects Center' },
    { id: 'jobs', path: '/jobs', icon: FiBriefcase, label: copy.jobsLabel },
    { id: 'news', path: '/news', icon: FiFileText, label: 'News' },
    { id: 'official', path: '/official', icon: FiSend, label: '@BeeBark Official' },
    // { id: 'store', path: '/store', icon: FiShoppingBag, label: 'Store' },
    // { id: 'rent', path: '/rent', icon: FiDollarSign, label: 'Rent & Sell' },
    // { id: 'memories', path: '/memories', icon: FiImage, label: 'Memories' },
    // { id: 'wallet', path: '/wallet', icon: FiDollarSign, label: 'Wallet & Economy' },
    // { id: 'meetings', path: '/meetings', icon: FiVideo, label: 'Meetings' },
    { id: 'settings', path: '/settings', icon: FiSettings, label: 'Settings' },
  ];
  const menuItems = pageItems || personalItems;

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="p-6 shrink-0">
          <div className="flex items-center justify-between mb-8">
            <NavLink to="/dashboard" onClick={close} className="flex items-center space-x-3">
              <img src="/image.png" alt="BeeBark" className="w-9 h-9 object-contain" />
              <span className="text-2xl font-bold text-black">BeeBark</span>
            </NavLink>
            <button onClick={close} className="lg:hidden p-1 text-slate-500 hover:text-black" aria-label="Close menu">
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 pb-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.end}
                onClick={close}
                onMouseEnter={() => preloadPath(item.path)}
                onFocus={() => preloadPath(item.path)}
                className={({ isActive }) => {
                  // Links with a query (?tab=…) only count as active when the query matches too
                  const [, query] = item.path.split('?');
                  const on = query ? isActive && location.search.includes(query) : isActive && !(item.end && location.search.includes('tab=edit'));
                  return `sidebar-item ${on ? 'active' : ''}`;
                }}
                data-testid={`sidebar-${item.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {countFor[item.id] > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
                    aria-label={`${countFor[item.id]} new`} data-testid={`sidebar-badge-${item.id}`}>
                    {countFor[item.id] > 99 ? '99+' : countFor[item.id]}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 shrink-0">
          {acting ? (
            <div className="space-y-1">
              <NavLink to={`/company/${acting.slug}`} onClick={close} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg">
                <CompanyLogo page={acting} className="w-10 h-10" rounded="rounded-lg" text="text-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-black truncate">{acting.name}</p>
                  <p className="text-xs text-slate-500 truncate">Acting as page</p>
                </div>
              </NavLink>
              <button type="button" onClick={() => { setActingAs(null); close(); navigate('/dashboard'); }} className="w-full text-left text-xs font-medium text-slate-600 hover:text-black px-3 py-1.5" data-testid="switch-back-personal">
                Switch back to {user?.name?.split(' ')[0] || 'your profile'}
              </button>
            </div>
          ) : (
          <NavLink to="/profile" onClick={close} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.profilePic} />
              <AvatarFallback className="bg-yellow-400 text-black font-semibold">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-black truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{personHeadline(user)}</p>
            </div>
          </NavLink>
          )}
        </div>
      </div>
    </>
  );
};

// Pages inside AppLayout get nothing here: the layout already shows the frame
const Sidebar = ({ layout = false }) => (useInLayout() && !layout ? null : <SidebarFrame />);

export default Sidebar;
