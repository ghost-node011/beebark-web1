import React, { useState } from 'react';
import { FiBriefcase } from 'react-icons/fi';

// Initials of a company name, e.g. "Crave Design" -> "CD" ('' when there are none)
export const companyInitials = (name) => String(name || '').split(/\s+/)
  .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ''))
  .filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// A company Page's logo, or its initials on a dark tile (a plain company icon
// when the name has no letters); a logo that fails to load falls back the same way
const CompanyLogo = ({ page, className = 'w-12 h-12', rounded = 'rounded-xl', text = 'text-base' }) => {
  const [broken, setBroken] = useState('');
  const initials = companyInitials(page?.name);
  if (page?.logo && broken !== page.logo) {
    return <img src={page.logo} alt="" onError={() => setBroken(page.logo)} className={`${className} ${rounded} object-cover bg-white border border-[#E6E1DB] shrink-0`} />;
  }
  return (
    <span className={`${className} ${rounded} shrink-0 flex items-center justify-center bg-[#32281F] text-white font-semibold ${text}`}>
      {initials || <FiBriefcase className="h-1/2 w-1/2" aria-hidden="true" />}
    </span>
  );
};

export default CompanyLogo;
