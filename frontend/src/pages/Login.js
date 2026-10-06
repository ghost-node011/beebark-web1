import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, postAuthPath } from '../context/AuthContext';
import { toast } from 'sonner';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import AuthShell from '../components/auth/AuthShell';
import SocialAuth from '../components/auth/SocialAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email.trim(), password, remember);
      toast.success(data.user.onboardingCompleted ? 'Welcome back!' : 'Welcome to BeeBark!');
      navigate(postAuthPath(data.user), { replace: true });
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 403 && data?.requiresVerification) {
        toast.info('Please verify your email to continue.');
        navigate('/verify-email', { state: { email: data.email || email.trim(), autoSend: true } });
        return;
      }
      toast.error(data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    try {
      const data = await googleLogin(credential);
      toast.success(data.user.onboardingCompleted ? 'Welcome back!' : 'Welcome to BeeBark!');
      navigate(postAuthPath(data.user), { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Google sign-in failed');
    }
  };

  return (
    <AuthShell>
      <div data-testid="login-page">
        <h2 className="text-2xl sm:text-3xl font-bold text-black">Sign in</h2>
        <p className="mt-2 text-gray-600 text-sm">
          New to BeeBark?{' '}
          <Link to="/register" className="font-semibold text-black hover:underline">Create an account</Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" data-testid="login-form">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-0 top-4 text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-beebark pl-7"
                data-testid="email-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Password</label>
            <div className="relative">
              <FaLock className="absolute left-0 top-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-beebark pl-7 pr-8"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-0 top-4 text-gray-400 hover:text-black"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="accent-yellow-400"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-yellow-btn disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="login-submit-button"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <SocialAuth onGoogleCredential={handleGoogle} text="signin_with" />
      </div>
    </AuthShell>
  );
};

export default Login;
