import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth, postAuthPath } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';

// Handles the redirect back from LinkedIn: validates state, exchanges the code
// via the backend, then routes the user in.
const LinkedInCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { linkedinLogin } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');
    const savedState = sessionStorage.getItem('li_oauth_state');
    sessionStorage.removeItem('li_oauth_state');

    if (oauthError || !code) {
      setError('LinkedIn sign-in was cancelled.');
      return;
    }
    if (!state || state !== savedState) {
      setError('Security check failed. Please try again.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    linkedinLogin(code, redirectUri)
      .then((data) => {
        toast.success(data.user.onboardingCompleted ? 'Welcome back!' : 'Welcome to BeeBark!');
        navigate(postAuthPath(data.user), { replace: true });
      })
      .catch((e) => setError(e.response?.data?.error || 'LinkedIn sign-in failed'));
  }, [params, linkedinLogin, navigate]);

  return (
    <AuthShell>
      <div className="text-center" data-testid="linkedin-callback">
        {error ? (
          <>
            <h2 className="text-xl font-bold text-black">Sign-in failed</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button onClick={() => navigate('/login', { replace: true })} className="auth-yellow-btn mt-6">Back to login</button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto" />
            <p className="mt-4 text-gray-600 text-sm">Signing you in with LinkedIn…</p>
          </>
        )}
      </div>
    </AuthShell>
  );
};

export default LinkedInCallback;
