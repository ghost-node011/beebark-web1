import React, { useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { BrandMark } from './auth/AuthShell';

// Pages a member can read without accepting first (the documents themselves)
const OPEN_PATHS = ['/terms', '/privacy', '/privacy-policy', '/community-standards', '/business-and-hiring', '/ai-policy', '/login', '/register'];

/**
 * Signed-in members who haven't accepted the current User Agreement and Privacy
 * Policy (for example a Google account created from the sign-in page, or anyone
 * who joined before consent was recorded) accept them here once, before going on.
 */
const ConsentGate = () => {
  const { user, refreshUser, logout } = useAuth();
  const location = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user || user.consentCurrent !== false) return null;
  if (OPEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  const save = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/profile/consent`, { acceptTerms: true, method: user.onboardingCompleted ? 'existing-member' : 'social-signup' });
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1C1712]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="consent-title" data-testid="consent-gate">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <BrandMark />
        <h2 id="consent-title" className="mt-6 flex items-center gap-2 text-xl font-bold text-[#1C1712]"><FiShield className="text-[#C9A227]" />Before you continue</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6B625A]">
          Please read and accept BeeBark's terms. They explain how BeeBark works, what we do with your information and how members treat each other.
        </p>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#E6E1DB] p-3 text-sm leading-relaxed text-[#3D342C]">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#32281F]" data-testid="consent-gate-checkbox" />
          <span>
            I'm 18 or older and I agree to the{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-[#32281F] underline">User Agreement</a> and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[#32281F] underline">Privacy Policy</a>, and to follow the{' '}
            <a href="/community-standards" target="_blank" rel="noreferrer" className="font-semibold text-[#32281F] underline">Community Standards</a>.
          </span>
        </label>
        <button type="button" onClick={save} disabled={!accepted || saving} className="auth-yellow-btn mt-5 disabled:cursor-not-allowed disabled:opacity-50" data-testid="consent-gate-continue">
          {saving ? 'Saving…' : 'Accept and continue'}
        </button>
        <button type="button" onClick={logout} className="mt-3 w-full text-center text-sm font-medium text-[#6B625A] hover:text-[#1C1712]">Log out</button>
      </div>
    </div>
  );
};

export default ConsentGate;
