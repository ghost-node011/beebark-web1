import React from 'react';
import { Link } from 'react-router-dom';
import { FaLinkedin } from 'react-icons/fa';
import { FiPhone } from 'react-icons/fi';
import { toast } from 'sonner';
import GoogleAuthButton from './GoogleAuthButton';
import LinkedInButton, { LINKEDIN_ENABLED } from './LinkedInButton';
import { FIREBASE_ENABLED } from '../../config/firebase';

/**
 * Social sign-in block: Google sign-in + LinkedIn. LinkedIn renders a real
 * sign-in button when REACT_APP_LINKEDIN_CLIENT_ID is configured, otherwise a
 * clearly-labeled "coming soon" placeholder.
 */
const SocialAuth = ({ onGoogleCredential, text = 'continue_with' }) => (
  <div className="mt-6">
    <div className="flex items-center gap-3 mb-5">
      <span className="h-px flex-1 bg-[#DCE3EB]" />
      <span className="text-xs uppercase tracking-wide text-[#7a8696]">or</span>
      <span className="h-px flex-1 bg-[#DCE3EB]" />
    </div>

    <div className="space-y-3">
      <GoogleAuthButton onCredential={onGoogleCredential} text={text} />

      {LINKEDIN_ENABLED ? (
        <LinkedInButton />
      ) : (
        <button
          type="button"
          onClick={() => toast.info('LinkedIn sign-in is coming soon')}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#DCE3EB] bg-white h-12 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors cursor-not-allowed"
          aria-disabled="true"
          data-testid="linkedin-soon"
        >
          <FaLinkedin className="text-[#0A66C2] text-lg" />
          Continue with LinkedIn
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Soon
          </span>
        </button>
      )}

      {FIREBASE_ENABLED && (
        <Link
          to="/phone-login"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#DCE3EB] bg-white h-12 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          data-testid="phone-signin"
        >
          <FiPhone className="text-base" />
          Continue with phone
        </Link>
      )}
    </div>
  </div>
);

export default SocialAuth;
