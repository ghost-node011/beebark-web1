import { useInLayout } from '../context/LayoutContext';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { FiLogOut, FiMenu, FiUser, FiSettings, FiBell, FiChevronDown } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import ProfileCompletionBadge from './ProfileCompletionBadge';
import NotificationBell from './NotificationBell';
import PeopleSearchBox from './PeopleSearchBox';
import { useBadgeTotal } from '../hooks/useNavBadges';
import { personHeadline } from '../utils/personHeadline';

const TopBarFrame = () => {
  const { user, logout, logoutAll } = useAuth();
  const { setSidebarOpen } = useUI();
  const badgeTotal = useBadgeTotal();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-slate-200 z-30 px-3 sm:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="relative lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
          aria-label={badgeTotal ? `Open menu, ${badgeTotal} new` : 'Open menu'}
          data-testid="open-sidebar"
        >
          <FiMenu className="w-6 h-6" />
          {badgeTotal > 0 && <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" data-testid="menu-badge" />}
        </button>

        <PeopleSearchBox />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <ProfileCompletionBadge />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 sm:gap-3 sm:border-l sm:border-slate-200 sm:pl-3 rounded-lg hover:bg-slate-50 py-1 pr-1"
              aria-label="Account menu"
              data-testid="account-menu"
            >
              <div className="text-right hidden md:block max-w-[12rem]">
                <p className="font-semibold text-sm text-black leading-tight truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{personHeadline(user)}</p>
              </div>
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.profilePic} />
                <AvatarFallback className="bg-yellow-400 text-black font-semibold">
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <FiChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-black truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}><FiUser className="mr-2" />View profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/notifications')}><FiBell className="mr-2" />Notifications</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings"><FiSettings className="mr-2" />Settings & privacy</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="logout-this-device"><FiLogOut className="mr-2" />Log out</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogoutAll} className="text-red-600" data-testid="logout-all-devices">
              Log out from all devices
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Pages inside AppLayout get nothing here: the layout already shows the frame
const TopBar = ({ layout = false }) => (useInLayout() && !layout ? null : <TopBarFrame />);

export default TopBar;
