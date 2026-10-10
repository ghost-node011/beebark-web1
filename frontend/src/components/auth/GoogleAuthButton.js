import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Load the Google Identity Services script once and resolve when ready
let gsiPromise = null;
const loadGsi = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsiPromise;
};

/**
 * Renders the official Google sign-in button.
 * Calls onCredential(idToken) when the user authenticates.
 * Renders nothing if REACT_APP_GOOGLE_CLIENT_ID is not configured.
 */
const GoogleAuthButton = ({ onCredential, text = 'continue_with' }) => {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) callbackRef.current?.(response.credential);
          }
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: Math.max(240, Math.min(400, containerRef.current.offsetWidth || 320)),
          shape: 'rectangular',
          text,
          logo_alignment: 'center'
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID || failed) return null;

  return <div ref={containerRef} className="flex justify-center" data-testid="google-signin" />;
};

export default GoogleAuthButton;
