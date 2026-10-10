import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft, FiCheckCircle, FiFlag, FiEdit2, FiUsers, FiCalendar, FiHelpCircle, FiZap, FiLock
} from 'react-icons/fi';
import { FaMoneyBillWave } from 'react-icons/fa';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ShareMenu from '../ShareMenu';
import { inrSalary } from '../../utils/salary';
import { CompanySquare } from './JobListItem';
import { idOf, isClosed, jobChips, questionCount, shortDate, timeAgo } from './jobUtils';

const Section = ({ title, children }) => (
  <section className="pt-5 mt-5 border-t border-[#f0ebe4]">
    <h3 className="pf-serif text-lg text-[#16324F] mb-3">{title}</h3>
    {children}
  </section>
);

/**
 * Full job view: right-hand pane on desktop, full-width page (with Back) on
 * phones, or inside a dialog.
 */
const JobDetail = ({
  job, loading, mine, applied, onApply, onReport, onEdit, onApplicants, onBack, testId = 'job-detail-dialog', className = ''
}) => {
  if (!job) {
    return (
      <div className={`rounded-2xl border border-[#DCE3EB] bg-white p-8 text-center text-[#526174] ${className}`}>
        {loading ? 'Loading…' : 'Select a job to see the details'}
      </div>
    );
  }

  const chips = jobChips(job);
  const qs = questionCount(job);
  const closed = isClosed(job);
  const poster = job.postedBy && typeof job.postedBy === 'object' ? job.postedBy : null;
  const posterPath = poster?.username ? `/profile/${poster.username}` : null;
  const page = job.companyPage && typeof job.companyPage === 'object' ? job.companyPage : null;
  const meta = [
    page ? null : job.company,
    job.location,
    job.createdAt ? `posted ${timeAgo(job.createdAt)}` : null,
    typeof job.applicantCount === 'number' ? `${job.applicantCount} applicant${job.applicantCount === 1 ? '' : 's'}` : null
  ].filter(Boolean);

  let primary;
  if (mine) {
    primary = (
      <>
        <Button onClick={() => onEdit(job)} variant="outline" className="rounded-full"><FiEdit2 className="mr-2" />Edit job</Button>
        <Button onClick={() => onApplicants(job)} variant="outline" className="rounded-full" data-testid="job-detail-applicants">
          <FiUsers className="mr-2" />Applicants ({job.applicantCount ?? job.applicants?.length ?? 0})
        </Button>
      </>
    );
  } else if (applied) {
    primary = <Button disabled className="rounded-full bg-green-50 text-green-700 border border-green-200 opacity-100"><FiCheckCircle className="mr-2" />Applied</Button>;
  } else if (closed) {
    primary = <Button disabled className="rounded-full bg-gray-100 text-gray-500"><FiLock className="mr-2" />Closed</Button>;
  } else {
    primary = (
      <Button onClick={() => onApply(job)} className="rounded-full bg-[#16324F] hover:bg-[#e0a312] text-white font-semibold px-6 h-11" data-testid="job-detail-apply">
        Apply{qs > 0 ? '' : ' now'}
      </Button>
    );
  }

  return (
    <article className={`rounded-2xl border border-[#DCE3EB] bg-white p-4 sm:p-6 pf-page ${className}`} data-testid={testId} aria-busy={loading || undefined}>
      {onBack && (
        <button type="button" onClick={onBack} className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-[#16324F] mb-4 -ml-1 px-1 py-1" data-testid="job-detail-back">
          <FiArrowLeft />Back to jobs
        </button>
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        <CompanySquare job={job} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="pf-serif text-2xl sm:text-3xl leading-tight text-[#16324F] break-words">{job.title}</h2>
          <p className="text-sm text-[#526174] mt-1 break-words">
            {page && <><Link to={`/company/${page.slug}`} className="font-medium text-[#16324F] hover:underline" data-testid="job-company-page">{page.name}</Link>{meta.length ? ' · ' : ''}</>}
            {meta.join(' · ')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {closed && <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-3 py-1">Closed</span>}
        {chips.map((c) => <span key={c} className="text-xs rounded-full border border-[#e2dbd2] text-[#16324F] px-3 py-1">{c}</span>)}
        {typeof job.matchScore === 'number' && (
          <span className="inline-flex items-center gap-1 text-xs rounded-full bg-[#EEF2F6] text-[#16324F] font-semibold px-3 py-1"><FiZap className="w-3 h-3" />{job.matchScore}% match</span>
        )}
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-[#16324F]">
        {job.salary && <p className="flex items-center gap-2"><FaMoneyBillWave className="text-[#526174]" />{inrSalary(job.salary)}</p>}
        {job.applyBy && <p className="flex items-center gap-2"><FiCalendar className="text-[#526174]" />Apply by {shortDate(job.applyBy)}</p>}
        {qs > 0 && !mine && <p className="flex items-center gap-2 text-[#526174]"><FiHelpCircle />Asks {qs} screening question{qs === 1 ? '' : 's'}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-5">
        {primary}
        <ShareMenu path={`/jobs?job=${job._id}`} title={`${job.title} at ${job.company}`} align="start" testId="job-detail-share" />
        {!mine && idOf(job.postedBy) && (
          <Button variant="ghost" onClick={() => onReport(job)} className="text-[#526174]" data-testid="job-detail-report">
            <FiFlag className="mr-2" />Report
          </Button>
        )}
      </div>

      {job.matchReason && (
        <p className="mt-4 text-sm rounded-xl bg-[#FFFBF0] border border-[#f5e2ad] text-[#16324F] p-3">{job.matchReason}</p>
      )}

      <Section title="About the job">
        {job.description
          ? <p className="text-[15px] leading-relaxed text-[#16324F] whitespace-pre-line break-words">{job.description}</p>
          : <p className="text-sm text-[#526174]">{loading ? 'Loading…' : 'No description.'}</p>}
      </Section>

      {job.skills?.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => {
              const matched = job.matchedSkills?.some?.((m) => String(m).toLowerCase() === String(skill).toLowerCase());
              return (
                <span key={skill} className={`text-xs rounded-full px-3 py-1 ${matched ? 'bg-[#F2B21B] text-[#16324F] font-semibold' : 'bg-[#EEF2F6] text-[#16324F]'}`}>
                  {matched && <FiCheckCircle className="inline w-3 h-3 mr-1 -mt-0.5" />}{skill}
                </span>
              );
            })}
          </div>
        </Section>
      )}

      {poster && (
        <Section title="Posted by">
          {(() => {
            const inner = (
              <>
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={poster.profilePic} />
                  <AvatarFallback className="bg-[#EEF2F6] text-[#16324F]">{(poster.name || '?').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-[#16324F] truncate">{poster.name || 'BeeBark member'}</p>
                  {(poster.headline || poster.company) && <p className="text-sm text-[#526174] truncate">{poster.headline || poster.company}</p>}
                </div>
              </>
            );
            return posterPath ? (
              <Link to={posterPath} className="flex items-center gap-3 rounded-xl border border-[#DCE3EB] p-3 hover:bg-[#FBFAF8]" data-testid="job-detail-poster">{inner}</Link>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-[#DCE3EB] p-3" data-testid="job-detail-poster">{inner}</div>
            );
          })()}
        </Section>
      )}
    </article>
  );
};

export default JobDetail;
