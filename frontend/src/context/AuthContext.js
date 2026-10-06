import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();

// Fail requests that hang instead of spinning forever. Generous enough to
// survive a Render free-tier cold start (~30-50s) without being cancelled.
axios.defaults.timeout = 45000;

// Token is kept in localStorage when "Remember me" is on (persists across
// browser restarts) and in sessionStorage otherwise (cleared when tab closes).
const readStoredToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token');

const storeToken = (token, remember) => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  (remember ? localStorage : sessionStorage).setItem('token', token);
};

const clearStoredToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

// Single source of truth for where a just-authenticated user should land.
// Where to go after signing in: back to the page that asked (?next=/profile/x,
// in-app paths only), otherwise the dashboard; onboarding always comes first.
const safeNext = () => {
  try {
    const next = new URLSearchParams(window.location.search).get('next') || '';
    return /^\/(?!\/)[\w\-./?=&%]*$/.test(next) ? next : '';
  } catch {
    return '';
  }
};
export const postAuthPath = (user) => (user?.onboardingCompleted ? safeNext() || '/dashboard' : '/onboarding');

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(readStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    // Retry transient failures (cold start / flaky network) and only log the
    // user out when the token is actually rejected (401/403) — never on a
    // timeout, which previously kicked valid users to /login.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await axios.get(`${API_URL}/api/profile/me`);
        setUser(response.data.user);
        setLoading(false);
        return;
      } catch (error) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          logout();
          setLoading(false);
          return;
        }
        // transient error — wait briefly and retry, keep the token
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    console.error('Server unreachable; keeping session token for retry.');
    setLoading(false);
  };

  // Finalize an authenticated session from a token + user payload
  const establishSession = (data, remember = true) => {
    const { token: newToken, user: sessionUser } = data;
    storeToken(newToken, remember);
    setToken(newToken);
    setUser(sessionUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return data;
  };

  const login = async (email, password, remember = true) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    return establishSession(response.data, remember);
  };

  // Step 1 of registration: creates an unverified account and emails an OTP.
  // Returns { requiresVerification, email } — no token yet.
  const registerInit = async (name, email, password, role) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, { name, email, password, role });
    return response.data;
  };

  // Step 2: verify the emailed OTP. On success, establishes the session.
  const verifyOtp = async (email, otp) => {
    const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
    return establishSession(response.data, true);
  };

  const resendOtp = async (email) => {
    const response = await axios.post(`${API_URL}/api/auth/resend-otp`, { email });
    return response.data;
  };

  // Sign in / sign up with a Google ID token (credential) from Google Identity Services
  const googleLogin = async (credential, role) => {
    const response = await axios.post(`${API_URL}/api/auth/google`, { credential, role });
    return establishSession(response.data, true);
  };

  // Sign in / sign up with a LinkedIn authorization code (OpenID Connect)
  const linkedinLogin = async (code, redirectUri) => {
    const response = await axios.post(`${API_URL}/api/auth/linkedin`, { code, redirectUri });
    return establishSession(response.data, true);
  };

  // Sign in / sign up with a Firebase phone (SMS OTP) ID token
  const firebaseLogin = async (idToken) => {
    const response = await axios.post(`${API_URL}/api/auth/firebase`, { idToken });
    return establishSession(response.data, true);
  };

  // Save onboarding data; refreshes the user so onboardingCompleted is current
  const updateOnboarding = async (payload) => {
    const response = await axios.put(`${API_URL}/api/profile/onboarding`, payload);
    await fetchCurrentUser();
    return response.data;
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const logoutAll = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout-all`);
    } catch (error) {
      console.error('Logout-all failed:', error);
    } finally {
      logout();
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    registerInit,
    verifyOtp,
    resendOtp,
    googleLogin,
    linkedinLogin,
    firebaseLogin,
    updateOnboarding,
    logout,
    logoutAll,
    setUser,
    // Re-fetch /api/profile/me and refresh the shared user object — use this
    // after any action that changes something on `user` from outside the
    // profile pages themselves (e.g. accepting a connection request changes
    // user.connections, but that happens on the Connections page).
    refreshUser: fetchCurrentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
