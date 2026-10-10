import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { API_URL } from '../../config/api';
import QuestionInput from './QuestionInput';
import { answerError, shortDate } from './jobUtils';

// Choice answers without their options are edited as plain text
const editType = (a) => (!a.type || (a.type === 'single_choice' && !a.options?.length) ? 'short_text' : a.type);

/** The student's answer bank: answers reused by Apply and auto-apply. */
const SavedAnswersDialog = ({ open, onOpenChange, onCountChange }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // { id, value }
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get(`${API_URL}/api/jobs/answers`)
      .then((res) => {
        const list = res.data.answers || [];
        setAnswers(list);
        onCountChange?.(list.length);
      })
      .catch(() => toast.error('Could not load your saved answers'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async (a) => {
    const value = String(editing?.value ?? '').trim();
    const err = answerError({ type: editType(a), options: a.options }, value, true);
    if (err) { toast.error(err); return; }
    setBusyId(a._id);
    try {
      await axios.put(`${API_URL}/api/jobs/answers/${a._id}`, { answer: value });
      setAnswers((list) => list.map((x) => (x._id === a._id ? { ...x, answer: value, updatedAt: new Date().toISOString() } : x)));
      setEditing(null);
      toast.success('Answer updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (a) => {
    setBusyId(a._id);
    try {
      await axios.delete(`${API_URL}/api/jobs/answers/${a._id}`);
      setAnswers((list) => {
        const next = list.filter((x) => x._id !== a._id);
        onCountChange?.(next.length);
        return next;
      });
      toast.success('Answer deleted');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl pf-page" data-testid="saved-answers-dialog">
        <DialogHeader className="text-left">
          <DialogTitle className="pf-serif text-xl text-[#16324F]">Saved answers</DialogTitle>
          <DialogDescription className="text-[#526174]">
            We reuse these when you apply and when auto-apply applies for you. Edit or delete any of them.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-[#F2EEE8] animate-pulse" />)}</div>
        ) : answers.length === 0 ? (
          <p className="text-sm text-[#526174] py-6 text-center">No saved answers yet. They're added as you answer screening questions.</p>
        ) : (
          <ul className="space-y-2">
            {answers.map((a) => (
              <li key={a._id} className="rounded-xl border border-[#DCE3EB] p-3" data-testid={`saved-answer-${a._id}`}>
                <p className="text-sm font-medium text-[#16324F] break-words">{a.question}</p>
                {editing?.id === a._id ? (
                  <div className="mt-2 space-y-2">
                    <QuestionInput
                      question={{ type: editType(a), text: a.question, options: a.options }}
                      value={editing.value}
                      onChange={(v) => setEditing({ id: a._id, value: v })}
                      testId={`saved-answer-input-${a._id}`}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => save(a)} disabled={busyId === a._id} className="bg-[#16324F] text-white hover:bg-[#0F2439]"><FiCheck className="mr-1" />Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}><FiX className="mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="min-w-0">
                      <p className="text-sm text-[#16324F] whitespace-pre-line break-words">{a.answer}</p>
                      {a.updatedAt && <p className="text-xs text-[#526174] mt-0.5">Updated {shortDate(a.updatedAt)}</p>}
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" onClick={() => setEditing({ id: a._id, value: a.answer ?? '' })} className="p-2 text-[#526174] hover:text-[#16324F]" aria-label="Edit answer" data-testid={`saved-answer-edit-${a._id}`}><FiEdit2 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => remove(a)} disabled={busyId === a._id} className="p-2 text-[#526174] hover:text-red-600" aria-label="Delete answer" data-testid={`saved-answer-delete-${a._id}`}><FiTrash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SavedAnswersDialog;
