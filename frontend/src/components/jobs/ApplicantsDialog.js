import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FiZap } from 'react-icons/fi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { API_URL } from '../../config/api';
import { shortDate } from './jobUtils';

/** Poster-only list of who applied, with their screening answers. */
const ApplicantsDialog = ({ job, onClose }) => {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_URL}/api/jobs/${job._id}/applicants`)
      .then((res) => { if (!cancelled) setApplicants(res.data.applicants || []); })
      .catch((error) => { if (!cancelled) toast.error(error.response?.data?.error || 'Could not load applicants'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [job._id]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl pf-page" data-testid="applicants-dialog">
        <DialogHeader className="text-left">
          <DialogTitle className="pf-serif text-xl text-[#32281F] pr-6">Applicants · {job.title}</DialogTitle>
          <DialogDescription className="text-[#6B625A]">
            {loading ? 'Loading…' : `${applicants.length} applicant${applicants.length === 1 ? '' : 's'}`}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-20 rounded-xl bg-[#F2EEE8] animate-pulse" />)}</div>
        ) : applicants.length === 0 ? (
          <p className="text-sm text-[#6B625A] py-6 text-center">No one has applied yet.</p>
        ) : (
          <ul className="space-y-3">
            {applicants.map((a, idx) => {
              const u = a.user || {};
              const profilePath = u.username ? `/profile/${u.username}` : null;
              return (
                <li key={u._id || idx} className="rounded-xl border border-[#E6E1DB] p-3 sm:p-4" data-testid={`applicant-${u._id || idx}`}>
                  <div className="flex items-start gap-3">
                    <Avatar className="w-11 h-11 shrink-0">
                      <AvatarImage src={u.profilePic} />
                      <AvatarFallback className="bg-[#F2EFEC] text-[#32281F]">{(u.name || '?').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {profilePath
                          ? <Link to={profilePath} className="font-semibold text-[#32281F] hover:underline break-words">{u.name || 'Applicant'}</Link>
                          : <span className="font-semibold text-[#32281F]">{u.name || 'Applicant'}</span>}
                        {a.source === 'auto' && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold rounded-full bg-purple-100 text-purple-700 px-2 py-0.5"><FiZap className="w-3 h-3" />Auto-applied</span>
                        )}
                        {a.status && <span className="text-[10px] uppercase tracking-wide rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{a.status}</span>}
                      </div>
                      {u.headline && <p className="text-sm text-[#6B625A] break-words">{u.headline}</p>}
                      {a.appliedAt && <p className="text-xs text-[#6B625A] mt-0.5">Applied {shortDate(a.appliedAt)}</p>}
                    </div>
                  </div>
                  {a.answers?.length > 0 && (
                    <dl className="mt-3 space-y-2 border-t border-[#f0ebe4] pt-3">
                      {a.answers.map((qa, i) => (
                        <div key={i}>
                          <dt className="text-xs text-[#6B625A] break-words">{qa.question}</dt>
                          <dd className="text-sm text-[#32281F] whitespace-pre-line break-words">{qa.answer || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApplicantsDialog;
