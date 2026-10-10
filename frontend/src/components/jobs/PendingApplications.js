import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiSend, FiX, FiCpu, FiAlertCircle } from 'react-icons/fi';
import { Button } from '../ui/button';
import { API_URL } from '../../config/api';
import QuestionInput from './QuestionInput';
import { answerError, companyInitial, timeAgo } from './jobUtils';

const initialAnswers = (pending) => Object.fromEntries(
  (pending.questions || []).map((q) => [q._id, q.answer === null || q.answer === undefined ? '' : String(q.answer)])
);

// One auto-apply draft that is waiting on the student
const PendingCard = ({ pending, onDone, onOpenJob }) => {
  const [answers, setAnswers] = useState(() => initialAnswers(pending));
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');
  const job = pending.job || {};
  const closed = job.status === 'closed';

  const setAnswer = (qid, v) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    setTouched((t) => ({ ...t, [qid]: true }));
    setErrors((e) => ({ ...e, [qid]: '' }));
  };

  const submit = async () => {
    const errs = {};
    (pending.questions || []).forEach((q) => {
      const err = answerError(q, answers[q._id], q.required || q.needsYou);
      if (err) errs[q._id] = err;
    });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please answer the highlighted question(s)'); return; }
    setBusy('submit');
    try {
      const payload = (pending.questions || [])
        .filter((q) => String(answers[q._id] ?? '').trim())
        .map((q) => ({ questionId: q._id, answer: String(answers[q._id]).trim() }));
      await axios.post(`${API_URL}/api/jobs/pending/${pending._id}/submit`, { answers: payload });
      toast.success(`Application sent to ${job.company || job.title || 'the poster'}`);
      onDone(pending._id, 'submitted', job._id);
    } catch (error) {
      const missing = error.response?.data?.missing;
      if (error.response?.status === 400 && Array.isArray(missing) && missing.length) {
        setErrors(Object.fromEntries(missing.map((qid) => [qid, 'This one is required'])));
      }
      toast.error(error.response?.data?.error || 'Could not send the application');
    } finally {
      setBusy('');
    }
  };

  const dismiss = async () => {
    setBusy('dismiss');
    try {
      await axios.post(`${API_URL}/api/jobs/pending/${pending._id}/dismiss`);
      toast.success('Removed');
      onDone(pending._id, 'dismissed', job._id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not remove it');
      setBusy('');
    }
  };

  return (
    <div className="rounded-2xl border border-[#E6E1DB] bg-white p-4 sm:p-5" data-testid={`pending-${pending._id}`}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#F2EFEC] text-[#32281F] font-bold flex items-center justify-center shrink-0">{companyInitial(job)}</div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => job._id && onOpenJob(job)} className="text-left font-semibold text-[#32281F] hover:underline break-words">
            {job.title || 'Job'}
          </button>
          <p className="text-sm text-[#6B625A] break-words">
            {[job.company, job.location].filter(Boolean).join(' · ')}
            {pending.createdAt ? ` · matched ${timeAgo(pending.createdAt)}` : ''}
          </p>
        </div>
        {closed && <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 shrink-0">Closed</span>}
      </div>

      <p className="text-sm text-[#32281F] mt-3 flex items-start gap-2">
        <FiCpu className="mt-0.5 shrink-0 text-[#F2B21B]" />
        Our AI filled what it could. Answer the highlighted question(s) to send your application.
      </p>

      <div className="space-y-3 mt-4">
        {(pending.questions || []).map((q) => {
          const needs = q.needsYou;
          const aiFilled = q.source === 'ai' && !touched[q._id];
          const savedFilled = q.source === 'saved' && !touched[q._id];
          return (
            <div
              key={q._id}
              className={`rounded-xl border p-3 ${errors[q._id] ? 'border-red-300 bg-red-50/40' : needs ? 'border-[#F2B21B] border-2 bg-[#FFFBF0]' : 'border-[#E6E1DB]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-[#32281F] min-w-0 break-words">
                  {q.text}{(q.required || needs) && <span className="text-red-500"> *</span>}
                </p>
                {aiFilled && <span className="text-[10px] uppercase tracking-wide font-semibold rounded-full bg-[#EEF2FF] text-[#4338ca] px-2 py-0.5 shrink-0">AI filled — check it</span>}
                {savedFilled && <span className="text-[10px] uppercase tracking-wide font-semibold rounded-full bg-[#F2EFEC] text-[#32281F] px-2 py-0.5 shrink-0">Saved answer</span>}
              </div>
              {needs && q.reason && (
                <p className="text-xs text-[#32281F] mb-2 flex items-start gap-1.5"><FiAlertCircle className="mt-0.5 shrink-0" />{q.reason}</p>
              )}
              <QuestionInput
                question={q}
                value={answers[q._id]}
                onChange={(v) => setAnswer(q._id, v)}
                invalid={!!errors[q._id]}
                testId={`pending-answer-${pending._id}-${q._id}`}
              />
              {errors[q._id] && <p className="text-xs text-red-600 mt-1">{errors[q._id]}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
        <Button variant="outline" onClick={dismiss} disabled={!!busy} data-testid={`pending-dismiss-${pending._id}`}>
          <FiX className="mr-2" />{busy === 'dismiss' ? 'Removing…' : 'Not interested'}
        </Button>
        <Button onClick={submit} disabled={!!busy || closed} className="bg-[#32281F] hover:bg-[#221A14] text-white" data-testid={`pending-submit-${pending._id}`}>
          <FiSend className="mr-2" />{busy === 'submit' ? 'Sending…' : 'Send application'}
        </Button>
      </div>
    </div>
  );
};

/** "Needs your answers" tab body */
const PendingApplications = ({ pending, loading, onDone, onOpenJob }) => {
  if (loading && !pending.length) {
    return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-40 rounded-2xl bg-white border border-[#E6E1DB] animate-pulse" />)}</div>;
  }
  if (!pending.length) {
    return (
      <div className="rounded-2xl border border-[#E6E1DB] bg-white text-center py-12 px-4">
        <p className="pf-serif text-xl text-[#32281F]">Nothing waiting on you</p>
        <p className="text-sm text-[#6B625A] mt-1 max-w-md mx-auto">When auto-apply finds a strong match that asks something only you can answer, it shows up here and we email you.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {pending.map((p) => <PendingCard key={p._id} pending={p} onDone={onDone} onOpenJob={onOpenJob} />)}
    </div>
  );
};

export default PendingApplications;
