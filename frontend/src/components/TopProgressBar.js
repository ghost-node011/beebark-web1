import React, { useEffect, useRef, useState } from 'react';
import { progress } from '../lib/progress';

/**
 * YouTube-style bar along the top of the window while anything loads. It only
 * appears if loading takes longer than a blink, creeps towards the end, then
 * zips to 100% and fades out. A small bee rides the leading edge.
 */
const TopProgressBar = () => {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef({});

  useEffect(() => progress.subscribe((count) => {
    const t = timers.current;
    if (count > 0) {
      clearTimeout(t.hide);
      if (!t.running) {
        t.running = true;
        t.show = setTimeout(() => { setVisible(true); setWidth(12); }, 120);
        t.creep = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w)), 180);
      }
    } else if (t.running) {
      t.running = false;
      clearTimeout(t.show);
      clearInterval(t.creep);
      setWidth(100);
      t.hide = setTimeout(() => { setVisible(false); setWidth(0); }, 320);
    }
  }), []);

  return (
    <div className={`top-progress pointer-events-none fixed left-0 right-0 top-0 z-[150] h-[3px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" data-testid="top-progress">
      <div className="top-progress-fill relative h-full" style={{ width: `${width}%` }}>
        <span className="top-progress-bee absolute -right-2 -top-[7px] text-[13px] leading-none">🐝</span>
      </div>
    </div>
  );
};

export default TopProgressBar;
