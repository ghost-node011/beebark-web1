import React from 'react';
import { FiShare2, FiFlag, FiCheckCircle, FiHelpCircle, FiZap } from 'react-icons/fi';
import ShareMenu from '../ShareMenu';
import { companyInitial, idOf, isClosed, jobChips, questionCount, timeAgo } from './jobUtils';

export const CompanySquare = ({ job, size = 'md' }) => {
  const cls = size === 'lg' ? 'w-14 h-14 text-2xl rounded-2xl' : size === 'sm' ? 'w-10 h-10 text-base rounded-xl' : 'w-12 h-12 text-lg rounded-xl';
  const page = job?.companyPage && typeof job.companyPage === 'object' ? job.companyPage : null;
  if (page?.logo) return <img src={page.logo} alt="" className={`${cls} object-cover border border-[#DCE3EB] bg-white shrink-0`} />;
  return (
    <div className={`${cls} bg-[#EEF2F6] text-[#16324F] font-bold flex items-center justify-center shrink-0 pf-serif`} aria-hidden="true">
      {companyInitial(job)}
    </div>
  );
};

// Share (and Report, for other people's jobs)
export const JobCardActions = ({ job, isMine, onReport }) => (
  <div className="flex items-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    <ShareMenu
      path={`/jobs?job=${job._id}`}
      title={`${job.title} at ${job.company}`}
      testId={`job-share-${job._id}`}
      trigger={
        <button type="button" className="p-1.5 rounded-md text-[#526174] hover:text-[#16324F] hover:bg-[#F2EEE8]" data-testid={`job-share-${job._id}`} aria-label="Share job">
          <FiShare2 className="w-4 h-4" />
        </button>
      }
    />
    {!isMine && idOf(job.postedBy) && (
      <button type="button" className="p-1.5 rounded-md text-[#526174] hover:text-[#16324F] hover:bg-[#F2EEE8]" onClick={() => onReport(job)} data-testid={`job-report-${job._id}`} aria-label="Report job">
        <FiFlag className="w-4 h-4" />
      </button>
    )}
  </div>
);

/** Compact, selectable job card for the left-hand list. */
const JobListItem = ({ job, selected, applied, isMine, onSelect, onReport, testId, meta }) => {
  const chips = jobChips(job);
  const qs = questionCount(job);
  const select = () => onSelect(job);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={select}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}
      data-testid={testId || `job-card-${job._id}`}
      className={`group relative w-full text-left rounded-2xl border bg-white p-3 sm:p-4 cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-[#F2B21B]
        ${selected ? 'border-[#F2B21B] ring-1 ring-[#F2B21B] bg-[#FFFBF0]' : 'border-[#DCE3EB] hover:border-[#B9C6D5]'}`}
    >
      {selected && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-[#F2B21B]" aria-hidden="true" />}
      <div className="flex items-start gap-3">
        <CompanySquare job={job} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold leading-snug break-words ${selected ? 'text-[#16324F]' : 'text-[#16324F] group-hover:underline'}`}>{job.title}</p>
            <JobCardActions job={job} isMine={isMine} onReport={onReport} />
          </div>
          <p className="text-sm text-[#16324F] truncate">{job.company}</p>
          {job.location && <p className="text-sm text-[#526174] truncate">{job.location}</p>}
          {chips.length > 0 && <p className="text-xs text-[#526174] mt-1">{chips.join(' · ')}</p>}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-[#526174]">
            {typeof job.matchScore === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2F6] text-[#16324F] font-semibold px-2 py-0.5"><FiZap className="w-3 h-3" />{job.matchScore}% match</span>
            )}
            {applied && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 font-semibold px-2 py-0.5"><FiCheckCircle className="w-3 h-3" />Applied</span>
            )}
            {isClosed(job) && <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">Closed</span>}
            {qs > 0 && (
              <span className="inline-flex items-center gap-1"><FiHelpCircle className="w-3 h-3" />{qs} question{qs === 1 ? '' : 's'}</span>
            )}
            {job.createdAt && <span>{timeAgo(job.createdAt)}</span>}
            {meta}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobListItem;
