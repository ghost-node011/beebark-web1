import React from 'react';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Bolds the parts of `text` that start with any of the typed words
const Highlight = ({ text, words }) => {
  const list = (words || []).filter(Boolean);
  if (!text || !list.length) return <>{text}</>;
  const re = new RegExp(`((?:^|(?<=[\\s,/&(|.-]))(?:${list.map(escape).join('|')}))`, 'gi');
  const parts = String(text).split(re);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-black">{p}</strong> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
};

export const searchWords = (q) => String(q || '').toLowerCase().split(/\s+/).filter((w) => w.length > 0).slice(0, 6);

export default Highlight;
