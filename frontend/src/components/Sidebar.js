import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  FiHome, FiMessageCircle, FiUsers, FiLayers, FiBriefcase,
  FiVideo, FiX, FiImage
} from 'react-icons/fi';

const Sidebar = () => {
  const { user } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const close = () => setSidebarOpen(false);

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/chat', icon: FiMessageCircle, label: 'Messages' },
    { path: '/connections', icon: FiUsers, label: 'Connections' },
    { path: '/feed', icon: FiLayers, label: 'Feed' },
    { path: '/portfolio', icon: FiImage, label: 'Portfolio' },
    // { path: '/reels', icon: FiFilm, label: 'Reels' },
    // { path: '/projects', icon: FiTrendingUp, label: 'Projects Center' },
    { path: '/jobs', icon: FiBriefcase, label: 'Jobs' },
    // { path: '/store', icon: FiShoppingBag, label: 'Store' },
    // { path: '/rent', icon: FiDollarSign, label: 'Rent & Sell' },
    // { path: '/events', icon: FiCalendar, label: 'Events' },
    // { path: '/memories', icon: FiImage, label: 'Memories' },
    // { path: '/wallet', icon: FiDollarSign, label: 'Wallet & Economy' },
    { path: '/meetings', icon: FiVideo, label: 'Meetings' },
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
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xl">B</span>
              </div>
              <span className="text-2xl font-bold text-black">BeeBark</span>
            </div>
            <button onClick={close} className="lg:hidden p-1 text-slate-500 hover:text-black" aria-label="Close menu">
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="space-y-1 pb-6">
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
                data-testid={`sidebar-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
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
