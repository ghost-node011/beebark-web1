import React from 'react';

// Shimmering placeholders in the shape of what's loading (YouTube-style),
// so only that part of the page waits.
const Bar = ({ className = '', style }) => <div className={`skeleton-shimmer rounded-md ${className}`} style={style} />;

export const SkeletonRows = ({ rows = 5, avatar = true, className = '' }) => (
  <div className={`divide-y divide-gray-100 ${className}`} aria-label="Loading" role="status">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        {avatar && <div className="skeleton-shimmer h-11 w-11 shrink-0 rounded-full" />}
        <div className="flex-1 space-y-2">
          <Bar className="h-3.5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
          <Bar className="h-3 w-2/5" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonCards = ({ count = 6, className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5', media = 'aspect-[4/3]' }) => (
  <div className={className} aria-label="Loading" role="status">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className={`skeleton-shimmer ${media}`} />
        <div className="space-y-2 p-4">
          <Bar className="h-4 w-3/4" />
          <Bar className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
