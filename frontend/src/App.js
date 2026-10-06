import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { UIProvider } from './context/UIContext';
import { Toaster } from './components/ui/sonner';
import AppLayout from './components/AppLayout';
import BeeLoader from './components/BeeLoader';
import TopProgressBar from './components/TopProgressBar';
import { Pages, warmUp } from './lib/pages';
import { installAxiosProgress } from './lib/progress';
import './App.css';

installAxiosProgress();

const {
  Login, Register, VerifyEmail, Onboarding, ForgotPassword, LinkedInCallback, PrivacyPolicy, PhoneLogin,
  Dashboard, Feed, Portfolio, PublicPortfolio, Profile, PublicProfile, Connections, Chat, Jobs, News,
  Official, Meetings, MeetingRoom, Settings, Notifications, CalendarPage, Listings, ListingDetail, Search
} = Pages;

// Redirects replace the current history entry, so Back never bounces into a redirect loop
const Go = ({ to }) => <Navigate to={to} replace />;

// Signed-in pages. The bee loader covers the screen only while the session is
// first checked; after that, pages load inside the layout.
const PrivateRoute = ({ bare = false }) => {
  const { user, loading } = useAuth();
  useEffect(() => { if (user) warmUp(); }, [user]);
  if (loading) return <BeeLoader size="full" />;
  if (!user) return <Go to="/login" />;
  // Safety net: onboardingCompleted is the single source of truth for gating
  // onboarding (see postAuthPath in AuthContext).
  if (user.onboardingCompleted === false) return <Go to="/onboarding" />;
  // `bare`: signed-in pages without the frame (the full-screen meeting room)
  return bare ? <Suspense fallback={<BeeLoader size="full" />}><Outlet /></Suspense> : <AppLayout />;
};

const OnboardingRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <BeeLoader size="full" />;
  if (!user) return <Go to="/login" />;
  if (user.onboardingCompleted) return <Go to="/dashboard" />;
  return <Onboarding />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <BeeLoader size="full" />;
  return user ? <Go to="/dashboard" /> : children;
};

// Pages outside the app frame (sign-in, public portfolio) show the loader on their own
const Standalone = ({ children }) => <Suspense fallback={<BeeLoader size="full" />}>{children}</Suspense>;

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <UIProvider>
          <Toaster position="top-right" richColors />
          <TopProgressBar />
          <Standalone>
          <Routes>
            <Route path="/" element={<Go to="/dashboard" />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
            <Route path="/phone-login" element={<PublicRoute><PhoneLogin /></PublicRoute>} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/portfolio/:username" element={<PublicPortfolio />} />
            {/* Public profile anyone can open (shared on LinkedIn etc.); signed-in people get the in-app one */}
            <Route path="/in/:username" element={<PublicProfile open />} />
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:username" element={<PublicProfile />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/news" element={<News />} />
              <Route path="/official" element={<Official />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route path="/search" element={<Search />} />
              {['/reels', '/projects', '/store', '/rent', '/events', '/memories', '/wallet'].map((p) => (
                <Route key={p} path={p} element={<Go to="/dashboard" />} />
              ))}
            </Route>
            <Route element={<PrivateRoute bare />}>
              <Route path="/meeting-room/:meetingId" element={<MeetingRoom />} />
            </Route>
            <Route path="*" element={<Go to="/dashboard" />} />
          </Routes>
          </Standalone>
          </UIProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
