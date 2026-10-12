import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';

/**
 * Full-screen photo viewer, drawn over the whole page (a portal on <body>, so
 * no parent layout can shrink or clip it). Photos fill the screen even when the
 * stored file is small, and never open the storage link in a new tab.
 * `round` shows a profile photo as a large circle. `inline` fills the nearest
 * positioned parent instead, for use inside a dialog (which blocks the page
 * outside it). Esc closes only this viewer, not a dialog underneath.
 */
const PhotoLightbox = ({ images, index = 0, alt = '', round = false, inline = false, onClose }) => {
  const list = (Array.isArray(images) ? images : [images]).filter(Boolean);
  const [current, setCurrent] = useState(index);
  const many = list.length > 1;
  const step = (d) => setCurrent((c) => (c + d + list.length) % list.length);

  useEffect(() => {
    // Capture on window runs before any dialog's own Esc and arrow handling
    const onKey = (e) => {
      const handled = e.key === 'Escape' || (many && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'));
      if (!handled) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') onClose();
      else step(e.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    if (!inline) document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey, true); if (!inline) document.body.style.overflow = prev; };
  });

  if (!list.length) return null;
  const stop = (e) => e.stopPropagation();

  const view = (
    <div className={`${inline ? 'absolute' : 'fixed'} inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 sm:p-8`} onClick={onClose} role="dialog" aria-modal="true" aria-label={alt || 'Photo'} data-testid="photo-lightbox">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close"><FiX className="h-6 w-6" /></button>
      {round ? (
        <img src={list[current]} alt={alt} onClick={stop} onContextMenu={(e) => e.preventDefault()} draggable={false}
          className="aspect-square w-[min(80vw,75vh)] rounded-full object-cover shadow-2xl ring-4 ring-white/10" />
      ) : (
        <img src={list[current]} alt={alt} onClick={stop} onContextMenu={(e) => e.preventDefault()} draggable={false}
          className="h-full max-h-[88vh] w-full object-contain" />
      )}
      {many && (
        <>
          <button type="button" onClick={(e) => { stop(e); step(-1); }} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-yellow-400 sm:left-6" aria-label="Previous photo"><FiChevronLeft className="h-6 w-6" /></button>
          <button type="button" onClick={(e) => { stop(e); step(1); }} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-yellow-400 sm:right-6" aria-label="Next photo"><FiChevronRight className="h-6 w-6" /></button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm tabular-nums text-white">{current + 1} / {list.length}</span>
        </>
      )}
    </div>
  );
  return inline ? view : createPortal(view, document.body);
};

export default PhotoLightbox;
