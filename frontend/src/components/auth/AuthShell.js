import React from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

/**
 * Shared two-panel auth layout.
 * - On large screens: brand illustration on the left, form on the right.
 * - On mobile: illustration hidden, compact brand header above the form.
 */
const POSITIONING = 'The professional network for architecture, interiors & construction.';
const VALUE_POINTS = [
  'Build your portfolio',
  'Connect with professionals',
  'Get hired',
  'Showcase your work'
];

const BrandMark = ({ className = '' }) => (
  <Link to="/" className={`flex items-center gap-2 ${className}`}>
    <img src="/image.png" alt="BeeBark" className="h-8 w-8 object-contain" />
    <span className="text-xl font-extrabold tracking-tight text-black">BeeBark</span>
  </Link>
);

const AuthShell = ({ children, headline, subline }) => {
  return (
    <div className="min-h-screen flex bg-white" data-testid="auth-shell">
      {/* Left brand panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative z-10 max-w-md">
          <BrandMark className="mb-8" />
          <h2 className="text-3xl xl:text-4xl font-bold text-black leading-tight">
            {headline || POSITIONING}
          </h2>
          {subline && <p className="mt-4 text-black/70 text-base">{subline}</p>}
          <ul className="mt-8 space-y-3">
            {VALUE_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-black/80">
                <FaCheckCircle className="text-black shrink-0" />
                <span className="font-medium">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <BrandMark className="lg:hidden mb-8" />
          {children}
          <p className="mt-10 text-center text-xs text-gray-400">
            <a href="/privacy" className="hover:text-gray-600">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
export { BrandMark };
