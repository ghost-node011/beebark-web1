import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FiSearch, FiBell, FiLogOut, FiMenu } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import ProfileCompletionBadge from './ProfileCompletionBadge';

const ROLE_LABELS = {
  student: 'Student',
  professional: 'Professional',
  firm: 'Firm',
  recruiter: 'Recruiter',
  company: 'Firm'
};

const TopBar = () => {
  const { user, logout, logoutAll } = useAuth();
  const { setSidebarOpen } = useUI();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate('/login');
  };

  return (
    <div className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-slate-200 z-30 px-3 sm:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
          aria-label="Open menu"
          data-testid="open-sidebar"
        >
          <FiMenu className="w-6 h-6" />
        </button>

        <div className="relative w-full max-w-xl">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-slate-50 border-slate-200"
            data-testid="search-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <ProfileCompletionBadge />
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative" aria-label="Notifications">
          <FiBell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-3">
          <div className="text-right hidden md:block">
            <p className="font-semibold text-sm text-black leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{ROLE_LABELS[user?.role] || 'Professional'}</p>
          </div>
          <Avatar className="w-9 h-9 cursor-pointer" onClick={() => navigate('/profile')}>
            <AvatarImage src={user?.profilePic} />
            <AvatarFallback className="bg-yellow-400 text-black font-semibold">
              {user?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-red-600"
              data-testid="logout-button"
            >
              <FiLogOut className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLogout} data-testid="logout-this-device">
              Log out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogoutAll} className="text-red-600" data-testid="logout-all-devices">
              Log out from all devices
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TopBar;
