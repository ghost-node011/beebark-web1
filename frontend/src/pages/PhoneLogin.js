import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { toast } from 'sonner';
import { useAuth, postAuthPath } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import { getFirebaseAuth, FIREBASE_ENABLED } from '../config/firebase';

const PhoneLogin = () => {
  const navigate = useNavigate();
  const { firebaseLogin } = useAuth();
  const [step, setStep] = useState(0); // 0 = phone, 1 = code
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef(null);
  const verifierRef = useRef(null);

  if (!FIREBASE_ENABLED) {
    return (
      <AuthShell>
        <h2 className="text-2xl font-bold text-black">Phone sign-in unavailable</h2>
        <p className="mt-2 text-gray-600 text-sm">Phone sign-in isn't configured yet.</p>
        <Link to="/login" className="auth-yellow-btn mt-6 inline-block text-center">Back to sign in</Link>
      </AuthShell>
    );
  }

  const ensureVerifier = () => {
    const auth = getFirebaseAuth();
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
    return verifierRef.current;
  };

  const resetVerifier = () => {
    try { verifierRef.current?.clear(); } catch (_) { /* noop */ }
    verifierRef.current = null;
  };

  const sendCode = async (e) => {
    e.preventDefault();
    const normalized = phone.replace(/[^\d+]/g, '');
    if (!/^\+\d{8,15}$/.test(normalized)) {
      return toast.error('Use international format, e.g. +919876543210');
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const verifier = ensureVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, normalized, verifier);
      toast.success('Code sent via SMS');
      setStep(1);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not send code');
      resetVerifier();
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const cred = await confirmationRef.current.confirm(code);
      const idToken = await cred.user.getIdToken();
      const data = await firebaseLogin(idToken);
      toast.success(data.user.onboardingCompleted ? 'Welcome back!' : 'Welcome to BeeBark!');
      navigate(postAuthPath(data.user));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell headline="Sign in with your phone" subline="We'll text you a one-time code.">
      <div data-testid="phone-login">
        {step === 0 ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">Phone sign-in</h2>
            <p className="mt-2 text-gray-600 text-sm">Enter your mobile number with country code.</p>
            <form onSubmit={sendCode} className="mt-7 space-y-5">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input-beebark"
                data-testid="phone-input"
              />
              <button type="submit" disabled={loading} className="auth-yellow-btn disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">Enter the code</h2>
            <p className="mt-2 text-gray-600 text-sm">
              Sent to <span className="font-semibold text-black">{phone}</span>
            </p>
            <form onSubmit={verify} className="mt-7 space-y-5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="input-beebark text-center tracking-[0.6em] text-xl font-bold"
                data-testid="phone-otp-input"
              />
              <button type="submit" disabled={loading} className="auth-yellow-btn disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Verifying…' : 'Verify & continue'}
              </button>
            </form>
            <button type="button" onClick={() => { setStep(0); resetVerifier(); }} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-black">
              ← Use a different number
            </button>
          </>
        )}

        {/* invisible reCAPTCHA mounts here */}
        <div id="recaptcha-container" />

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="font-semibold text-black hover:underline">Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default PhoneLogin;
