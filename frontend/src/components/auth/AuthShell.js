import React from 'react';
import { Link } from 'react-router-dom';

const BeeLogo = ({ className = 'h-9 w-9' }) => <img src="/image.png" alt="" className={`${className} object-contain`} />;

/**
 * Shared sign-in / sign-up layout: the Founding Member Card story on the left
 * (large screens), the form on a soft-grey panel on the right.
 */
const BrandMark = ({ className = '', tagline = true }) => (
  <Link to="/" className={`flex items-center gap-3 ${className}`}>
    <BeeLogo className="h-11 w-11" />
    <span className="leading-none">
      <span className="block text-[28px] font-black tracking-tight text-[#1c1712]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BeeBark</span>
      {tagline && <span className="block mt-1 text-[11px] font-medium text-[#3a322b]">Network For The Built Environment</span>}
    </span>
  </Link>
);

const AuthShell = ({ children }) => (
  <div className="min-h-screen flex flex-col lg:flex-row bg-white lg:bg-[#F6F4F1]" data-testid="auth-shell">
    {/* Founding membership: beside the form on large screens, above it on phones */}
    <div className="flex lg:w-[54%] flex-col bg-white px-6 pt-8 pb-8 sm:px-10 lg:px-12 xl:px-20 lg:py-12 lg:border-r border-[#E8E3DD]">
      <BrandMark />
      <div className="mt-8 lg:mt-14 max-w-xl">
        <p className="text-xs font-semibold tracking-[0.42em] text-[#E0A800]">FOUNDING MEMBERSHIP</p>
        <h1 className="mt-3 lg:mt-4 text-[38px] sm:text-[44px] xl:text-[54px] leading-[1.05] text-[#141414]" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>
          Your professional identity. Recognised.
        </h1>
        <p className="mt-3 lg:mt-4 text-base sm:text-lg text-[#6B625A]">Complete your profile to be considered for the BeeBark Founding Member Card.</p>
      </div>
      <div className="mt-7 lg:mt-10 flex-1 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-[40rem] overflow-hidden rounded-3xl ring-1 ring-black/5 shadow-[0_30px_60px_-30px_rgba(50,40,31,0.35)]">
          <img src="/card-preview.jpg" alt="BeeBark Founding Member Card, front and back" className="block w-full h-auto select-none" draggable="false" data-testid="member-card" />
        </div>
        <div className="mt-6 lg:mt-10 text-center">
          <p className="text-[11px] tracking-[0.3em] text-[#6B625A]">MEMBER CARD PREVIEW</p>
          <p className="mt-1 text-sm text-[#6B625A]">Member cards are available to selected completed and verified profiles.</p>
        </div>
      </div>
    </div>

    {/* Form */}
    <div className="w-full lg:w-[46%] flex flex-col items-center px-6 pb-8 sm:px-10 lg:py-10">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center border-t border-[#E8E3DD] pt-8 lg:border-0 lg:pt-0">
        {children}
      </div>
      <p className="mt-10 text-center text-sm text-[#857B71]">
        <Link to="/privacy" className="hover:text-[#32281F]">Privacy Policy</Link>
        <span className="mx-3">·</span>
        <Link to="/privacy#terms" className="hover:text-[#32281F]">Terms of Service</Link>
      </p>
    </div>
  </div>
);

export default AuthShell;
export { BrandMark };
