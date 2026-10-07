import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiX, FiCheck, FiRotateCcw, FiInfo, FiHelpCircle, FiCalendar, FiZap, FiMapPin } from 'react-icons/fi';
import { FaMoneyBillWave } from 'react-icons/fa';
import { API_URL } from '../../config/api';
import { inrSalary } from '../../utils/salary';
import { CompanySquare } from './JobListItem';
import ApplyDialog from './ApplyDialog';
import { jobChips, questionCount, shortDate } from './jobUtils';

const THRESHOLD = 120; // px past which a release counts as a swipe
const FLICK = 0.6; // px/ms
const FLY_MS = 280;

const DeckCard = ({ job, expanded, onToggleExpand }) => {
  const chips = jobChips(job);
  const qs = questionCount(job);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start gap-3">
        <CompanySquare job={job} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="pf-serif text-2xl leading-tight text-[#2b2622] break-words">{job.title}</h3>
          <p className="text-sm text-[#7a7067] mt-1 break-words">
            {job.company}
            {job.location ? <> · <FiMapPin className="inline w-3 h-3 -mt-0.5" /> {job.location}</> : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {typeof job.matchScore === 'number' && (
          <span className="inline-flex items-center gap-1 text-xs rounded-full bg-[#F2B21B] text-[#2b2622] font-bold px-3 py-1"><FiZap className="w-3 h-3" />{job.matchScore}% match</span>
        )}
        {chips.map((c) => <span key={c} className="text-xs rounded-full border border-[#e2dbd2] text-[#2b2622] px-3 py-1">{c}</span>)}
      </div>

      {job.matchReason && <p className="text-sm text-[#2b2622] mt-3 rounded-xl bg-[#FFFBF0] border border-[#f5e2ad] px-3 py-2 break-words">{job.matchReason}</p>}

      <div className="mt-3 space-y-1 text-sm text-[#2b2622]">
        {job.salary && <p className="flex items-center gap-2"><FaMoneyBillWave className="text-[#7a7067] shrink-0" />{inrSalary(job.salary)}</p>}
        {job.applyBy && <p className="flex items-center gap-2"><FiCalendar className="text-[#7a7067] shrink-0" />Apply by {shortDate(job.applyBy)}</p>}
        {qs > 0 && <p className="flex items-center gap-2 text-[#7a7067]"><FiHelpCircle className="shrink-0" />{qs} question{qs === 1 ? '' : 's'} to answer</p>}
      </div>

      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.skills.slice(0, 8).map((s) => <span key={s} className="text-xs rounded-full bg-[#FFF3D1] text-[#2b2622] px-2.5 py-0.5">{s}</span>)}
        </div>
      )}

      <div className={`mt-3 min-h-0 flex-1 ${expanded ? 'overflow-y-auto overscroll-contain pr-1' : 'overflow-hidden'}`} data-scrollable={expanded || undefined}>
        <p className={`text-sm leading-relaxed text-[#2b2622] whitespace-pre-line break-words ${expanded ? '' : 'line-clamp-6'}`}>{job.description}</p>
      </div>
      {job.description && (
        <button type="button" onClick={onToggleExpand} className="self-start text-sm font-semibold text-[#2b2622] underline underline-offset-2 mt-2" data-testid={`swipe-expand-${job._id}`}>
          {expanded ? 'Show less' : 'Read full description'}
        </button>
      )}
    </div>
  );
};

/**
 * "Jobs for you" as a swipe deck: right = apply, left = pass.
 * `jobs` are the recommendations (backend already drops passed/applied ones);
 * `appliedIds` hides jobs applied to elsewhere on the page.
 */
const SwipeDeck = ({ jobs, appliedIds, loading, onApplied, onDetails, onBrowseAll, paused }) => {
  const [removed, setRemoved] = useState(() => new Set()); // passed / applied / held while the apply dialog is open
  const [history, setHistory] = useState([]); // passed job ids, for Undo
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [flying, setFlying] = useState(null); // 'left' | 'right'
  const [expanded, setExpanded] = useState(false);
  const [applyJob, setApplyJob] = useState(null);
  const start = useRef(null);
  const appliedRef = useRef(false);
  const busy = useRef(false);

  const queue = useMemo(
    () => jobs.filter((j) => !removed.has(j._id) && !appliedIds.has(j._id)),
    [jobs, removed, appliedIds]
  );
  const top = queue[0];

  useEffect(() => { setExpanded(false); }, [top?._id]);

  const hide = (id) => setRemoved((s) => new Set(s).add(id));
  const unhide = (id) => setRemoved((s) => { const n = new Set(s); n.delete(id); return n; });

  const commit = useCallback(async (dir, job) => {
    if (dir === 'left') {
      hide(job._id);
      setHistory((h) => [...h, job._id]);
      try {
        await axios.post(`${API_URL}/api/jobs/${job._id}/pass`);
      } catch (error) {
        unhide(job._id);
        setHistory((h) => h.filter((id) => id !== job._id));
        toast.error(error.response?.data?.error || 'Could not pass on that job');
      }
      return;
    }
    hide(job._id);
    if (questionCount(job) > 0) {
      appliedRef.current = false;
      setApplyJob(job);
      return;
    }
    try {
      await axios.post(`${API_URL}/api/jobs/${job._id}/apply`, { answers: [] });
      toast.success(`Applied to ${job.title}`);
      onApplied(job._id);
    } catch (error) {
      unhide(job._id);
      const missing = error.response?.data?.missing;
      if (error.response?.status === 400 && Array.isArray(missing) && missing.length) {
        // The job has questions after all; ask them
        hide(job._id);
        appliedRef.current = false;
        setApplyJob(job);
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to apply');
    }
  }, [onApplied]);

  const fly = useCallback((dir) => {
    if (!top || busy.current) return;
    busy.current = true;
    const job = top;
    setFlying(dir);
    setTimeout(() => {
      setFlying(null);
      setDrag({ x: 0, y: 0, active: false });
      busy.current = false;
      commit(dir, job);
    }, FLY_MS);
  }, [top, commit]);

  const undo = async () => {
    const id = history[history.length - 1];
    if (!id) return;
    setHistory((h) => h.slice(0, -1));
    unhide(id);
    try {
      await axios.delete(`${API_URL}/api/jobs/${id}/pass`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not undo');
    }
  };

  // Keyboard: ← pass, → apply
  useEffect(() => {
    if (paused || applyJob) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); fly('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); fly('right'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fly, paused, applyJob]);

  // Pointer drag (mouse + touch)
  const onPointerDown = (e) => {
    if (busy.current || e.button > 0) return;
    if (e.target.closest('button, a, input, textarea, [data-scrollable]')) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    setDrag({ x: e.clientX - start.current.x, y: (e.clientY - start.current.y) * 0.25, active: true });
  };
  const onPointerUp = (e) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const dx = e.clientX - start.current.x;
    const v = Math.abs(dx) / Math.max(1, performance.now() - start.current.t);
    start.current = null;
    if (Math.abs(dx) > THRESHOLD || (v > FLICK && Math.abs(dx) > 40)) {
      fly(dx > 0 ? 'right' : 'left');
    } else {
      setDrag({ x: 0, y: 0, active: false }); // springs back via the transition
    }
  };
  const onPointerCancel = () => { start.current = null; setDrag({ x: 0, y: 0, active: false }); };

  const closeApply = () => {
    const job = applyJob;
    setApplyJob(null);
    if (job && !appliedRef.current) unhide(job._id); // cancelled: card comes back on top
  };
  const appliedFromDialog = (id) => { appliedRef.current = true; onApplied(id); };

  if (loading && !jobs.length) {
    return (
      <div className="mx-auto w-full max-w-md" data-testid="swipe-deck" aria-busy="true">
        <div className="h-[30rem] rounded-3xl bg-white border border-[#ebe6df] animate-pulse" />
      </div>
    );
  }

  const x = flying === 'right' ? 700 : flying === 'left' ? -700 : drag.x;
  const y = drag.y;
  const rot = x / 20;
  const applyOpacity = Math.max(0, Math.min(1, x / THRESHOLD));
  const passOpacity = Math.max(0, Math.min(1, -x / THRESHOLD));
  const behind = queue.slice(1, 3);

  return (
    <div className="mx-auto w-full max-w-md select-none" data-testid="swipe-deck">
      {top ? (
        <>
          <div className="relative h-[32rem] sm:h-[34rem]" style={{ overflowX: 'clip' }}>
            {behind.slice().reverse().map((job, ri) => {
              const depth = behind.length - ri; // 2 = furthest back
              return (
                <div
                  key={job._id}
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-[calc(100%-1rem)] rounded-3xl border border-[#ebe6df] shadow-sm p-5 overflow-hidden pointer-events-none transition-transform duration-300 ${depth === 2 ? 'bg-[#faf8f5]' : 'bg-white'}`}
                  style={{ transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})` }}
                >
                  {/* Solid card, faded content: cards further back never show through */}
                  <div style={{ opacity: depth === 2 ? 0.35 : 0.7 }}><DeckCard job={job} expanded={false} onToggleExpand={() => {}} /></div>
                </div>
              );
            })}
            <div
              key={top._id}
              data-testid={`swipe-card-${top._id}`}
              className="absolute inset-x-0 top-0 h-[calc(100%-1rem)] rounded-3xl border border-[#ebe6df] bg-white shadow-lg p-5 overflow-hidden cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
                transition: drag.active && !flying ? 'none' : `transform ${flying ? FLY_MS : 250}ms ${flying ? 'ease-in' : 'cubic-bezier(.2,1.4,.4,1)'}`,
                touchAction: 'pan-y'
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              <div className="absolute top-6 left-5 z-10 rotate-[-14deg] rounded-lg border-4 border-green-500 text-green-600 font-black text-2xl tracking-widest px-3 py-0.5 pointer-events-none" style={{ opacity: applyOpacity }} aria-hidden="true">APPLY</div>
              <div className="absolute top-6 right-5 z-10 rotate-[14deg] rounded-lg border-4 border-red-500 text-red-600 font-black text-2xl tracking-widest px-3 py-0.5 pointer-events-none" style={{ opacity: passOpacity }} aria-hidden="true">PASS</div>
              <DeckCard job={top} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-2">
            <button type="button" onClick={undo} disabled={!history.length} className="w-11 h-11 rounded-full bg-white border border-[#ebe6df] text-[#7a7067] flex items-center justify-center shadow-sm hover:text-[#2b2622] disabled:opacity-40" aria-label="Undo last pass" data-testid="swipe-undo">
              <FiRotateCcw className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => fly('left')} className="w-16 h-16 rounded-full bg-white border-2 border-red-200 text-red-500 flex items-center justify-center shadow-md hover:bg-red-50" aria-label="Pass" data-testid="swipe-pass">
              <FiX className="w-8 h-8" />
            </button>
            <button type="button" onClick={() => fly('right')} className="w-16 h-16 rounded-full bg-[#F2B21B] border-2 border-[#F2B21B] text-[#2b2622] flex items-center justify-center shadow-md hover:bg-[#e0a312]" aria-label="Apply" data-testid="swipe-apply">
              <FiCheck className="w-8 h-8" />
            </button>
            <button type="button" onClick={() => onDetails(top)} className="w-11 h-11 rounded-full bg-white border border-[#ebe6df] text-[#7a7067] flex items-center justify-center shadow-sm hover:text-[#2b2622]" aria-label="Details" data-testid="swipe-details">
              <FiInfo className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-[#7a7067] mt-3">
            Swipe right to apply, left to pass · <span className="hidden sm:inline">← → keys work too · </span>{queue.length} left
          </p>
        </>
      ) : (
        <div className="rounded-3xl border border-[#ebe6df] bg-white text-center px-6 py-14" data-testid="swipe-empty">
          <p className="pf-serif text-2xl text-[#2b2622]">You're all caught up</p>
          <p className="text-sm text-[#7a7067] mt-2">New matches appear here as jobs are posted. Upload or update your résumé to sharpen them.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-6">
            <button type="button" onClick={onBrowseAll} className="rounded-full bg-[#2b2622] text-white px-5 py-2 text-sm font-semibold" data-testid="swipe-browse-all">Browse all jobs</button>
            {history.length > 0 && (
              <button type="button" onClick={undo} className="rounded-full border border-[#e2dbd2] px-5 py-2 text-sm font-medium text-[#2b2622]" data-testid="swipe-undo">
                <FiRotateCcw className="inline mr-1" />Undo last pass
              </button>
            )}
          </div>
        </div>
      )}

      {applyJob && <ApplyDialog job={applyJob} onClose={closeApply} onApplied={appliedFromDialog} />}
    </div>
  );
};

export default SwipeDeck;
