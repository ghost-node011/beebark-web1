import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiCheckCircle, FiBookmark } from 'react-icons/fi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { API_URL } from '../../config/api';
import QuestionInput from './QuestionInput';
import { answerError, jobId } from './jobUtils';

/**
 * Apply flow: loads the job's screening questions (prefilled from the student's
 * saved answers), validates, and posts the application.
 * onApplied(jobId) runs after a successful (or already-made) application.
 */
const ApplyDialog = ({ job, onClose, onApplied }) => {
  const id = jobId(job);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API_URL}/api/jobs/${id}/apply-form`)
      .then((res) => {
        if (cancelled) return;
        if (res.data.hasApplied) {
          toast.info("You've already applied to this job");
          onApplied?.(id);
          onClose();
          return;
        }
        const qs = res.data.questions || [];
        setQuestions(qs);
        const pre = {};
        const fromSaved = {};
        qs.forEach((q) => {
          if (q.savedAnswer !== null && q.savedAnswer !== undefined && q.savedAnswer !== '') {
            pre[q._id] = String(q.savedAnswer);
            fromSaved[q._id] = true;
          }
        });
        setAnswers(pre);
        setSaved(fromSaved);
      })
      // Older servers without the apply form: fall back to a plain confirm
      .catch(() => { if (!cancelled) setQuestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setAnswer = (qid, value) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
    setSaved((s) => ({ ...s, [qid]: false }));
    setErrors((e) => ({ ...e, [qid]: '' }));
  };

  const submit = async () => {
    const errs = {};
    questions.forEach((q) => {
      const err = answerError(q, answers[q._id]);
      if (err) errs[q._id] = err;
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please answer the highlighted question(s)');
      return;
    }
    setSubmitting(true);
    try {
      const payload = questions
        .filter((q) => String(answers[q._id] ?? '').trim())
        .map((q) => ({ questionId: q._id, answer: String(answers[q._id]).trim() }));
      await axios.post(`${API_URL}/api/jobs/${id}/apply`, { answers: payload });
      toast.success('Application sent!');
      onApplied?.(id);
      onClose();
    } catch (error) {
      const missing = error.response?.data?.missing;
      if (error.response?.status === 400 && Array.isArray(missing) && missing.length) {
        setErrors(Object.fromEntries(missing.map((qid) => [qid, 'This one is required'])));
      }
      toast.error(error.response?.data?.error || 'Failed to apply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl pf-page" data-testid="apply-dialog">
        <DialogHeader className="text-left">
          <DialogTitle className="pf-serif text-xl text-[#2b2622] pr-6">Apply to {job.title}</DialogTitle>
          <DialogDescription className="text-[#7a7067]">{job.company}{job.location ? ` · ${job.location}` : ''}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2" aria-busy="true">
            {[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-[#F2EEE8] animate-pulse" />)}
          </div>
        ) : questions.length === 0 ? (
          <p className="text-sm text-[#2b2622]">
            Your BeeBark profile and résumé will be shared with the poster. Send your application?
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#7a7067] flex items-start gap-1.5">
              <FiBookmark className="mt-0.5 shrink-0" />
              Your answers are saved so you don't have to type them again.
            </p>
            {questions.map((q, i) => (
              <div key={q._id} className={`rounded-xl border p-3 ${errors[q._id] ? 'border-red-300 bg-red-50/40' : 'border-[#ebe6df]'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-[#2b2622] min-w-0 break-words">
                    {i + 1}. {q.text}{q.required && <span className="text-red-500" aria-label="required"> *</span>}
                  </p>
                  {saved[q._id] && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold rounded-full bg-[#FFF3D1] text-[#8a6100] px-2 py-0.5 shrink-0">Saved answer</span>
                  )}
                </div>
                <QuestionInput
                  question={q}
                  value={answers[q._id]}
                  onChange={(v) => setAnswer(q._id, v)}
                  invalid={!!errors[q._id]}
                  testId={`apply-answer-${q._id}`}
                />
                {errors[q._id] && <p className="text-xs text-red-600 mt-1">{errors[q._id]}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={loading || submitting} className="bg-[#2b2622] hover:bg-black text-white" data-testid="apply-submit">
            <FiCheckCircle className="mr-2" />{submitting ? 'Sending…' : 'Send application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyDialog;
