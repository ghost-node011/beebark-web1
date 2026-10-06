import { lazy } from 'react';

// Each page's code downloads the first time it's needed. `preload` lets the
// sidebar fetch a page on hover, and the app warms the common ones when idle.
const page = (load) => {
  const Component = lazy(load);
  Component.preload = load;
  return Component;
};

export const Pages = {
  Login: page(() => import('../pages/Login')),
  Register: page(() => import('../pages/Register')),
  VerifyEmail: page(() => import('../pages/VerifyEmail')),
  Onboarding: page(() => import('../pages/Onboarding')),
  ForgotPassword: page(() => import('../pages/ForgotPassword')),
  LinkedInCallback: page(() => import('../pages/LinkedInCallback')),
  PrivacyPolicy: page(() => import('../pages/PrivacyPolicy')),
  PhoneLogin: page(() => import('../pages/PhoneLogin')),
  Dashboard: page(() => import('../pages/Dashboard')),
  Feed: page(() => import('../pages/Feed')),
  Portfolio: page(() => import('../pages/Portfolio')),
  PublicPortfolio: page(() => import('../pages/PublicPortfolio')),
  Profile: page(() => import('../pages/Profile')),
  PublicProfile: page(() => import('../pages/PublicProfile')),
  Connections: page(() => import('../pages/Connections')),
  Chat: page(() => import('../pages/Chat')),
  Jobs: page(() => import('../pages/Jobs')),
  News: page(() => import('../pages/News')),
  Official: page(() => import('../pages/Official')),
  Meetings: page(() => import('../pages/Meetings')),
  MeetingRoom: page(() => import('../pages/MeetingRoom')),
  Settings: page(() => import('../pages/Settings')),
  Notifications: page(() => import('../pages/Notifications')),
  CalendarPage: page(() => import('../pages/Calendar')),
  Listings: page(() => import('../pages/Listings')),
  ListingDetail: page(() => import('../pages/ListingDetail')),
  Search: page(() => import('../pages/Search'))
};

// Sidebar paths → page, for preloading on hover
const BY_PATH = {
  '/dashboard': Pages.Dashboard,
  '/chat': Pages.Chat,
  '/connections': Pages.Connections,
  '/portfolio': Pages.Portfolio,
  '/profile': Pages.Profile,
  '/jobs': Pages.Jobs,
  '/news': Pages.News,
  '/official': Pages.Official,
  '/settings': Pages.Settings,
  '/notifications': Pages.Notifications,
  '/calendar': Pages.CalendarPage,
  '/listings': Pages.Listings,
  '/search': Pages.Search
};

export const preloadPath = (path) => BY_PATH[path]?.preload().catch(() => {});

// After sign-in, quietly fetch the pages people open most so later clicks are instant
export const warmUp = () => {
  const run = () => ['/dashboard', '/chat', '/connections', '/profile', '/jobs', '/portfolio', '/search', '/notifications']
    .forEach((p) => preloadPath(p));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
};
