import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { FiHome, FiUsers, FiMessageCircle, FiBriefcase, FiVideo, FiLogOut } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinks = [
    { path: '/feed', icon: FiHome, label: 'Feed' },
    { path: '/connections', icon: FiUsers, label: 'Network' },
    { path: '/chat', icon: FiMessageCircle, label: 'Chat' },
    { path: '/jobs', icon: FiBriefcase, label: 'Jobs' },
    { path: '/meetings', icon: FiVideo, label: 'Meetings' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/feed" className="flex items-center space-x-2" data-testid="logo-link">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">SN</span>
              </div>
              <span className="text-xl font-bold text-slate-900 hidden sm:block">SocialNet</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    data-testid={`nav-${link.label.toLowerCase()}`}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      isActive(link.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/profile" data-testid="profile-link">
              <div className="flex items-center space-x-3 hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profilePic} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-slate-700 hidden sm:block">{user?.name}</span>
              </div>
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-red-600"
              data-testid="logout-button"
            >
              <FiLogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;