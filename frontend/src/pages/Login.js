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
        <h2 className="text-[32px] sm:text-[40px] font-bold leading-tight tracking-tight text-[#1C1712]">Welcome to BeeBark</h2>
        <p className="mt-1.5 text-lg text-[#6B625A]">Sign in to your professional network.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" data-testid="login-form">
          <div>
            <label className="block text-[15px] font-semibold text-[#1C1712] mb-2">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-beebark"
                data-testid="email-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-semibold text-[#1C1712] mb-2">Password</label>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-beebark pr-11"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-[15px] text-[#2A221C] cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 rounded accent-[#FFD60A]"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-[15px] text-[#6B625A] hover:text-[#32281F]">
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

        <SocialAuth onGoogleCredential={handleGoogle} text="continue_with" />
        <p className="mt-8 text-center text-[15px] text-[#6B625A]">
          New to BeeBark?{' '}
          <Link to="/register" className="font-semibold text-[#1C1712] hover:underline" data-testid="go-register">Create an account</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Login;
