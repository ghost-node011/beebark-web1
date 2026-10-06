import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { API_URL } from '../config/api';

const REASONS = [
  { value: 'spam', label: 'Spam', hint: 'Unwanted promotions or repeated messages' },
  { value: 'scam', label: 'Scam or fraud', hint: 'Asking for money, fake jobs or deals' },
  { value: 'harassment', label: 'Harassment', hint: 'Bullying, threats or abuse' },
  { value: 'inappropriate', label: 'Inappropriate content', hint: 'Offensive or explicit messages' },
  { value: 'fake_profile', label: 'Fake profile', hint: 'Pretending to be someone else' },
  { value: 'other', label: 'Something else', hint: '' }
];

/**
 * Report a person, from a chat or their profile. Optionally block them too.
 * onDone({ blocked }) runs after a successful report.
 */
const ReportDialog = ({ open, onOpenChange, person, context = 'profile', onDone }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [sending, setSending] = useState(false);

  const reset = () => { setReason(''); setDetails(''); setAlsoBlock(false); };

  const submit = async () => {
    if (!reason) return toast.error('Choose a reason');
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/messages/report`, { userId: person._id, reason, details, context });
      if (alsoBlock) await axios.post(`${API_URL}/api/account/block/${person._id}`);
      toast.success(alsoBlock ? `Reported and blocked ${person.name}` : 'Thanks, we\'ll review this report');
      onDone?.({ blocked: alsoBlock, reason });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send report');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {person?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-2">They won't know you reported them.</p>
        <div className="space-y-2" role="radiogroup">
          {REASONS.map((r) => (
            <label key={r.value} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${reason === r.value ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="mt-1 accent-yellow-500" />
              <span>
                <span className="block text-sm font-medium text-black">{r.label}</span>
                {r.hint && <span className="block text-xs text-slate-500">{r.hint}</span>}
              </span>
            </label>
          ))}
        </div>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything else we should know? (optional)" rows={3} maxLength={1000} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="accent-yellow-500" />
          Also block {person?.name?.split(' ')[0]} (removes the connection and stops messages)
        </label>
        {context === 'chat' && reason === 'spam' && (
          <p className="text-xs text-slate-500">This conversation will move to Archived.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={sending || !reason} className="bg-red-600 hover:bg-red-700 text-white">
            {sending ? 'Sending...' : 'Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
