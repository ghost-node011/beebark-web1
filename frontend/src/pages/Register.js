import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, postAuthPath } from '../context/AuthContext';
import { toast } from 'sonner';
import { FaEnvelope, FaUser, FaLock, FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa';
import AuthShell from '../components/auth/AuthShell';
import SocialAuth from '../components/auth/SocialAuth';
import OtpVerification from '../components/auth/OtpVerification';

// Password policy (matches backend): 8+ chars, upper, lower, number, special
const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) }
];

const evaluatePassword = (pw) => {
  const passed = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(pw) }));
  const score = passed.filter((r) => r.ok).length; // 0-5
  const meta = [
    { label: 'Too weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Okay', color: 'bg-lime-500' },
    { label: 'Good', color: 'bg-green-500' },
    { label: 'Strong', color: 'bg-green-600' }
  ];
  return { score, rules: passed, allValid: score === PASSWORD_RULES.length, ...meta[score] };
};

const Register = () => {
  const navigate = useNavigate();
  const { registerInit, googleLogin } = useAuth();

  const [step, setStep] = useState(0); // 0=details, 1=otp
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => evaluatePassword(form.password), [form.password]);
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleGoogle = async (credential) => {
    try {
      const data = await googleLogin(credential);
      toast.success(data.user.onboardingCompleted ? 'Welcome back!' : 'Welcome to BeeBark!');
      navigate(postAuthPath(data.user), { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Google sign-in failed');
    }
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Please enter your name');
    if (!strength.allValid) return toast.error('Please meet all password requirements');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await registerInit(form.name.trim(), form.email.trim(), form.password);
      toast.success('Verification code sent to your email');
      setStep(1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Step 0 — Account details */}
      {step === 0 && (
        <div data-testid="details-step">
          <h2 className="text-[32px] sm:text-[40px] font-bold leading-tight tracking-tight text-[#111827]">Join BeeBark</h2>
          <p className="mt-1.5 text-lg text-[#526174]">Create your professional account.</p>

          <form onSubmit={submitDetails} className="mt-7 space-y-5" data-testid="register-form">
            <div>
              <label className="block text-[15px] font-semibold text-[#111827] mb-2">Full name</label>
              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                <input type="text" placeholder="Enter your name" value={form.name} onChange={update('name')} required className="input-beebark" data-testid="name-input" />
              </div>
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-[#111827] mb-2">Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                <input type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required className="input-beebark" data-testid="email-input" />
              </div>
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-[#111827] mb-2">Password</label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={form.password} onChange={update('password')} required className="input-beebark pr-11" data-testid="password-input" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black" tabIndex={-1} aria-label="Toggle password visibility">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs font-medium text-gray-600">{strength.label}</p>
                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {strength.rules.map((r) => (
                      <li key={r.key} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className={`text-[9px] ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-[#111827] mb-2">Confirm password</label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={form.confirmPassword} onChange={update('confirmPassword')} required className="input-beebark" data-testid="confirm-password-input" />
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="mt-1 text-xs text-red-500">Passwords don't match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="auth-yellow-btn disabled:opacity-50 disabled:cursor-not-allowed" data-testid="register-submit-button">
              {loading ? 'Sending code...' : 'Create account'}
            </button>
          </form>

          <SocialAuth onGoogleCredential={handleGoogle} text="signup_with" />
          <p className="mt-8 text-center text-[15px] text-[#526174]">
            Already a member?{' '}
            <Link to="/login" className="font-semibold text-[#111827] hover:underline">Sign in</Link>
          </p>
        </div>
      )}

      {/* Step 1 — OTP verification */}
      {step === 1 && (
        <OtpVerification
          email={form.email.trim()}
          onVerified={(data) => navigate(postAuthPath(data.user), { replace: true })}
          onBack={() => setStep(0)}
        />
      )}
    </AuthShell>
  );
};

export default Register;
