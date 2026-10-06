import React from 'react';

// Pointy-top hexagon path (same shape as the logo's cells), radius r around (50, 50)
const HEX = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i - 90);
  return `${(50 + 44 * Math.cos(a)).toFixed(2)},${(50 + 44 * Math.sin(a)).toFixed(2)}`;
}).join(' ');

const SIZES = { small: 36, section: 56, full: 72 };

/**
 * BeeBark loader: just the logo, breathing gently, while a honey-coloured
 * hexagon traces around it. `size="full"` centres it on the screen (only while
 * the app first starts); otherwise it sits inline where it's used.
 */
const BeeLoader = ({ size = 'section', label = 'Loading' }) => {
  const px = SIZES[size] || SIZES.section;
  const loader = (
    <div className="bee-loader relative" style={{ width: px, height: px }} role="status" aria-label={label} data-testid="bee-loader">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="bee-trace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <polygon points={HEX} className="bee-track" />
        <polygon points={HEX} className="bee-trace" pathLength="100" />
      </svg>
      <img src="/image.png" alt="" className="bee-logo absolute left-1/2 top-1/2 object-contain" style={{ width: px * 0.46, height: px * 0.46 }} />
    </div>
  );
  if (size !== 'full') return loader;
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FAF9F6]">{loader}</div>;
};

export default BeeLoader;
