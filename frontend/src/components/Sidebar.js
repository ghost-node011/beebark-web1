import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  FiHome, FiMessageCircle, FiUsers, FiLayers, FiBriefcase,
  FiVideo, FiX, FiImage, FiFileText, FiSend
} from 'react-icons/fi';
import { getCopy } from '../config/roleDomainCopy';

const Sidebar = () => {
  const { user } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const close = () => setSidebarOpen(false);
  const copy = getCopy(user);

  const menuItems = [
    { id: 'dashboard', path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { id: 'messages', path: '/chat', icon: FiMessageCircle, label: 'Messages' },
    { id: 'connections', path: '/connections', icon: FiUsers, label: copy.connectionsLabel },
    // { id: 'feed', path: '/feed', icon: FiLayers, label: 'Feed' },
    { id: 'portfolio', path: '/portfolio', icon: FiImage, label: copy.domain === 'real_estate' ? 'Listings' : 'Portfolio' },
    // { id: 'reels', path: '/reels', icon: FiFilm, label: 'Reels' },
    // { id: 'projects', path: '/projects', icon: FiTrendingUp, label: 'Projects Center' },
    { id: 'jobs', path: '/jobs', icon: FiBriefcase, label: copy.jobsLabel },
    { id: 'news', path: '/news', icon: FiFileText, label: 'News' },
    { id: 'official', path: '/official', icon: FiSend, label: '@BeeBark Official' },
    // { id: 'store', path: '/store', icon: FiShoppingBag, label: 'Store' },
    // { id: 'rent', path: '/rent', icon: FiDollarSign, label: 'Rent & Sell' },
    // { id: 'events', path: '/events', icon: FiCalendar, label: 'Events' },
    // { id: 'memories', path: '/memories', icon: FiImage, label: 'Memories' },
    // { id: 'wallet', path: '/wallet', icon: FiDollarSign, label: 'Wallet & Economy' },
    // { id: 'meetings', path: '/meetings', icon: FiVideo, label: 'Meetings' },
  ];

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
                key={item.path}
                to={item.path}
                onClick={close}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
                data-testid={`sidebar-${item.id}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 shrink-0">
          <NavLink to="/profile" onClick={close} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.profilePic} />
              <AvatarFallback className="bg-yellow-400 text-black font-semibold">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm text-black">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </NavLink>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
