import React, { useEffect, useState } from 'react';

const TIPS = [
  'Buzzing up your network…',
  'Polishing the portfolio…',
  'Warming up the hive…',
  'Lining up opportunities…',
  'Sketching the blueprints…'
];

// Flat-top hexagon of radius r centred at (cx, cy)
const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i);
  return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

// Ring of six cells around the centre one
const R = 22;
const CELLS = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (Math.PI / 180) * (60 * i + 30);
  const d = R * Math.sqrt(3) + 2;
  return { x: 60 + d * Math.cos(a), y: 60 + d * Math.sin(a), i };
});

/**
 * BeeBark loader: the logo sits in a honeycomb whose cells fill with honey in
 * a wave while a little bee orbits it. `size="full"` covers the screen (only
 * used while the app first starts); `size="section"` fills a content area.
 */
const BeeLoader = ({ size = 'section', label }) => {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 1800);
    return () => clearInterval(t);
  }, []);
  const full = size === 'full';
  const px = full ? 168 : size === 'small' ? 72 : 120;

  const loader = (
    <div className="bee-loader flex flex-col items-center justify-center gap-5" role="status" aria-live="polite" data-testid="bee-loader">
      <div className="relative" style={{ width: px, height: px }}>
        <div className="bee-glow absolute inset-0 rounded-full" />
        <svg viewBox="0 0 120 120" className="relative w-full h-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="bee-honey" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE066" />
              <stop offset="100%" stopColor="#F5B400" />
            </linearGradient>
          </defs>
          {CELLS.map((c) => (
            <polygon key={c.i} points={hex(c.x, c.y, R - 1)} className="bee-cell" style={{ animationDelay: `${c.i * 0.16}s` }} />
          ))}
          <polygon points={hex(60, 60, R + 3)} className="bee-core" />
          <g className="bee-orbit">
            <circle cx="60" cy="6" r="2" className="bee-trail" style={{ animationDelay: '0.1s' }} />
            <g transform="translate(60 6)">
              <ellipse cx="-3" cy="-4" rx="4" ry="2.6" className="bee-wing" />
              <ellipse cx="3" cy="-4" rx="4" ry="2.6" className="bee-wing" style={{ animationDelay: '0.05s' }} />
              <ellipse cx="0" cy="0" rx="5.5" ry="3.8" fill="#111" />
              <rect x="-1.6" y="-3.8" width="1.6" height="7.6" fill="#FACC15" />
              <rect x="1.8" y="-3.6" width="1.4" height="7.2" fill="#FACC15" />
            </g>
          </g>
        </svg>
        <img src="/image.png" alt="" className="bee-logo absolute left-1/2 top-1/2 object-contain" style={{ width: px * 0.3, height: px * 0.3 }} />
      </div>
      {size !== 'small' && (
        <div className="text-center">
          <p className={`bee-word font-bold tracking-tight text-black ${full ? 'text-3xl' : 'text-xl'}`} aria-label="BeeBark">
            {'BeeBark'.split('').map((ch, i) => <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>{ch}</span>)}
          </p>
          <p key={tip} className="bee-tip mt-1 text-sm text-gray-500">{label || TIPS[tip]}</p>
        </div>
      )}
    </div>
  );

  if (!full) return loader;
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FAF9F6]">{loader}</div>;
};

export default BeeLoader;
