import React, { useRef, useState } from 'react';
import { FiCamera, FiMove } from 'react-icons/fi';

const GRADIENT = 'linear-gradient(120deg, #6B5440 0%, #4A3A2C 40%, #32281F 75%, #221A14 100%)';

// The banner's background, with the chosen part of the cover showing
export const coverStyle = (cover, position = 50) => (cover
  ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: `center ${Number.isFinite(Number(position)) ? Number(position) : 50}%` }
  : { background: GRADIENT });

/**
 * Company cover in the same wide shape as the page banner (4:1). With a cover,
 * "Reposition" lets the owner drag it up or down (or use the slider) to pick
 * which part shows; what's shown here is what the page shows.
 * `children` is drawn on top (the logo picker).
 */
const CoverEditor = ({ cover, position = 50, onPosition, onPick, uploading = false, children }) => {
  const [editing, setEditing] = useState(false);
  const box = useRef(null);
  const drag = useRef(null);

  const start = (e) => {
    if (!editing) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    drag.current = { y, pos: position };
    e.preventDefault();
  };
  const move = (e) => {
    if (!drag.current || !box.current) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    // Dragging the photo down shows more of its top, like LinkedIn
    const delta = ((drag.current.y - y) / box.current.clientHeight) * 60;
    onPosition(Math.min(100, Math.max(0, Math.round(drag.current.pos + delta))));
  };
  const end = () => { drag.current = null; };

  return (
    <div>
      <div
        ref={box}
        className={`relative mt-1.5 aspect-[4/1] min-h-[7rem] w-full overflow-hidden rounded-xl border border-gray-200 select-none ${editing ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#F4C430]' : ''}`}
        style={coverStyle(cover, position)}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        data-testid="page-cover"
      >
        {editing && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white"><FiMove className="h-3.5 w-3.5" />Drag to reposition</span>
          </span>
        )}
        {!editing && (
          <div className="absolute right-2 top-2 flex gap-2">
            {cover && (
              <button type="button" onClick={() => setEditing(true)} className="rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/75" data-testid="page-cover-reposition">
                <FiMove className="mr-1 inline h-3.5 w-3.5" />Reposition
              </button>
            )}
            <label className="cursor-pointer rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/75" data-testid="page-cover-upload">
              <FiCamera className="mr-1 inline h-3.5 w-3.5" />{uploading ? 'Uploading…' : cover ? 'Change cover' : 'Add cover'}
              <input type="file" accept="image/*" className="hidden" onChange={onPick} />
            </label>
          </div>
        )}
        {!editing && children}
      </div>
      {editing ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-[#F1DFA8] bg-[#FFFBEF] px-3 py-2" data-testid="page-cover-controls">
          <span className="text-xs font-medium text-[#6B625A]">Top</span>
          <input type="range" min={0} max={100} value={position} onChange={(e) => onPosition(Number(e.target.value))} className="min-w-0 flex-1 accent-[#32281F]" aria-label="Cover position" data-testid="page-cover-slider" />
          <span className="text-xs font-medium text-[#6B625A]">Bottom</span>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg bg-[#32281F] px-3 py-1.5 text-xs font-semibold text-white" data-testid="page-cover-done">Done</button>
          <p className="w-full text-xs text-[#857B71]">This preview has the same shape as the banner on your page. Save the page to keep the new position.</p>
        </div>
      ) : (
        cover && <p className="mt-1 text-xs text-gray-500">Wide images (at least 1584 × 396) look best. Use Reposition to choose which part shows.</p>
      )}
    </div>
  );
};

export default CoverEditor;
