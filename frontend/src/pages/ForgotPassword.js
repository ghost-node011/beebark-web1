import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa';
import AuthShell from '../components/auth/AuthShell';
import { API_URL } from '../config/api';

const RESEND_SECONDS = 60;
const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) }
];
const evaluate = (pw) => {
  const rules = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(pw) }));
  return { rules, allValid: rules.every((r) => r.ok) };
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = email, 1 = code + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const strength = useMemo(() => evaluate(password), [password]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return toast.error('Enter your email');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: email.trim() });
      toast.success('If an account exists, a reset code has been sent.');
      setStep(1);
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    await sendCode();
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    if (!strength.allValid) return toast.error('Please meet all password requirements');
    if (password !== confirm) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, { email: email.trim(), otp, password });
      toast.success('Password reset successful — please log in');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell headline="Reset your password" subline="We'll email you a 6-digit code to set a new password.">
      <div data-testid="forgot-password-page">
        {step === 0 ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">Forgot password</h2>
            <p className="mt-2 text-gray-600 text-sm">Enter your email and we'll send you a reset code.</p>

            <form onSubmit={sendCode} className="mt-7 space-y-5" data-testid="forgot-password-form">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Email</label>
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
              <button type="submit" disabled={loading} className="auth-yellow-btn disabled:opacity-50 disabled:cursor-not-allowed" data-testid="submit-button">
                {loading ? 'Sending...' : 'Send reset code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">Enter code & new password</h2>
            <p className="mt-2 text-gray-600 text-sm">
              We sent a 6-digit code to <span className="font-semibold text-black break-all">{email}</span>.
            </p>

            <form onSubmit={submitReset} className="mt-6 space-y-5" data-testid="reset-password-form">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Reset code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="input-beebark tracking-[0.6em] text-center text-xl font-bold"
                  data-testid="otp-input"
                />
                <div className="mt-2 text-right">
                  <button type="button" onClick={resend} disabled={cooldown > 0} className="text-xs font-medium text-black hover:underline disabled:text-gray-400 disabled:no-underline">
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">New password</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="Create a new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-beebark pr-11"
                    data-testid="password-input"
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black" tabIndex={-1} aria-label="Toggle password visibility">
                    {show ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {password && (
                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {strength.rules.map((r) => (
                      <li key={r.key} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className={`text-[9px] ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Confirm password</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="input-beebark"
                    data-testid="confirm-password-input"
                  />
                </div>
                {confirm && confirm !== password && <p className="mt-1 text-xs text-red-500">Passwords don't match</p>}
              </div>

              <button type="submit" disabled={loading} className="auth-yellow-btn disabled:opacity-50 disabled:cursor-not-allowed" data-testid="reset-submit-button">
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>

            <button type="button" onClick={() => setStep(0)} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-black">
              ← Use a different email
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="font-semibold text-black hover:underline" data-testid="back-to-login-link">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
