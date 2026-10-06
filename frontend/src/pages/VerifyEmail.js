import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, postAuthPath } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import OtpVerification from '../components/auth/OtpVerification';

/**
 * Standalone email-verification page, used when an unverified user tries to log in.
 * Expects navigation state: { email, autoSend }.
 */
const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resendOtp } = useAuth();
  const email = location.state?.email;
  const autoSent = useRef(false);

  // If redirected from login, send a fresh code automatically (best-effort)
  useEffect(() => {
    if (email && location.state?.autoSend && !autoSent.current) {
      autoSent.current = true;
      resendOtp(email).catch(() => {});
    }
  }, [email, location.state, resendOtp]);

  if (!email) {
    return (
      <AuthShell>
        <h2 className="text-2xl sm:text-3xl font-bold text-black">Verify your email</h2>
        <p className="mt-3 text-gray-600 text-sm">
          We need your email to send a verification code.
        </p>
        <Link to="/login" className="auth-yellow-btn mt-6 inline-block text-center">Go to login</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell headline="Almost there" subline="Verify your email to access your account.">
      <OtpVerification email={email} onVerified={(data) => navigate(postAuthPath(data.user), { replace: true })} />
      <p className="mt-6 text-center text-sm text-gray-600">
        <Link to="/login" className="font-semibold text-black hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
};

export default VerifyEmail;
