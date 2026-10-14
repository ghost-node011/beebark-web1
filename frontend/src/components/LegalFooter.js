import React from 'react';
import { Link } from 'react-router-dom';

/** Links to BeeBark's legal documents, for public pages that have no sidebar */
const LegalFooter = ({ className = '' }) => (
  <footer className={`border-t border-[#E6E1DB] bg-white/70 px-4 py-5 text-center text-xs text-[#857B71] ${className}`} data-testid="legal-footer">
    <span>© {new Date().getFullYear()} BeeBark</span>
    {[['/terms', 'User Agreement'], ['/privacy', 'Privacy Policy'], ['/community-standards', 'Community Standards'], ['/ai-policy', 'AI Policy']].map(([to, label]) => (
      <span key={to}><span className="mx-2">·</span><Link to={to} className="hover:text-[#32281F] hover:underline">{label}</Link></span>
    ))}
  </footer>
);

export default LegalFooter;
