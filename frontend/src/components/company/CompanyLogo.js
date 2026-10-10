import React from 'react';

const initials = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// A company Page's logo, or its initials on a dark tile
const CompanyLogo = ({ page, className = 'w-12 h-12', rounded = 'rounded-xl', text = 'text-base' }) => (
  page?.logo
    ? <img src={page.logo} alt="" className={`${className} ${rounded} object-cover bg-white border border-[#DCE3EB] shrink-0`} />
    : <span className={`${className} ${rounded} shrink-0 flex items-center justify-center bg-[#16324F] text-white font-semibold ${text}`}>{initials(page?.name)}</span>
);

export default CompanyLogo;
