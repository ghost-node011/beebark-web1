import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { UIProvider } from './context/UIContext';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Onboarding from './pages/Onboarding';
import ForgotPassword from './pages/ForgotPassword';
import LinkedInCallback from './pages/LinkedInCallback';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PhoneLogin from './pages/PhoneLogin';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import Portfolio from './pages/Portfolio';
import PublicPortfolio from './pages/PublicPortfolio';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Connections from './pages/Connections';
import Chat from './pages/Chat';
import Jobs from './pages/Jobs';
import News from './pages/News';
import Official from './pages/Official';
import Meetings from './pages/Meetings';
import MeetingRoom from './pages/MeetingRoom';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import CalendarPage from './pages/Calendar';
import Listings from './pages/Listings';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  // Safety net: onboardingCompleted is now the single source of truth for
  // gating onboarding (see postAuthPath in AuthContext) and is backfilled for
  // legacy accounts, so this can no longer wrongly catch returning users.
  if (user.onboardingCompleted === false) return <Navigate to="/onboarding" />;
  return children;
};

const OnboardingRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.onboardingCompleted) return <Navigate to="/dashboard" />;
  return <Onboarding />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <UIProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
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
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
            <Route path="/portfolio" element={<PrivateRoute><Portfolio /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/profile/:username" element={<PrivateRoute><PublicProfile /></PrivateRoute>} />
            <Route path="/connections" element={<PrivateRoute><Connections /></PrivateRoute>} />
            <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/jobs" element={<PrivateRoute><Jobs /></PrivateRoute>} />
            <Route path="/news" element={<PrivateRoute><News /></PrivateRoute>} />
            <Route path="/official" element={<PrivateRoute><Official /></PrivateRoute>} />
            <Route path="/meetings" element={<PrivateRoute><Meetings /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/listings" element={<PrivateRoute><Listings /></PrivateRoute>} />
            <Route path="/meeting-room/:meetingId" element={<PrivateRoute><MeetingRoom /></PrivateRoute>} />
            <Route path="/reels" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/projects" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/store" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/rent" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/events" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/memories" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          </Routes>
          </UIProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
