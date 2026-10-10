import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../components/ui/alert-dialog';
import ReportDialog from '../components/ReportDialog';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  FiUpload, FiZap, FiCheckCircle, FiAward, FiEdit2, FiTrash2, FiLock, FiUnlock, FiX, FiUsers, FiPlus,
  FiSearch, FiBookmark, FiChevronDown, FiStar
} from 'react-icons/fi';
import { API_URL } from '../config/api';
import { getCopy } from '../config/roleDomainCopy';
import {
  EMPLOYMENT_TYPES, WORKPLACES, EXPERIENCE_LEVELS, isClosed, idOf, jobChips, shortDate
} from '../components/jobs/jobUtils';
import JobListItem, { JobCardActions } from '../components/jobs/JobListItem';
import JobDetail from '../components/jobs/JobDetail';
import ApplyDialog from '../components/jobs/ApplyDialog';
import ApplicantsDialog from '../components/jobs/ApplicantsDialog';
import SavedAnswersDialog from '../components/jobs/SavedAnswersDialog';
import PendingApplications from '../components/jobs/PendingApplications';
import SwipeDeck from '../components/jobs/SwipeDeck';
import { SkeletonRows } from '../components/Skeletons';
import { checkSalary } from '../utils/validation';
import { AutocompleteInput, LocationInput } from '../components/AutocompleteInput';
import { usePages } from '../context/PagesContext';
import CompanyLogo from '../components/company/CompanyLogo';
import ScreeningQuestionsEditor, { questionsError, questionsPayload } from '../components/jobs/ScreeningQuestionsEditor';

// Roles that can post; students can't (the backend also allows anyone with a "hire" intent)
const POSTING_ROLES = ['professional', 'firm', 'recruiter', 'company'];
const NONE = 'none'; // Radix Select can't use '' as an item value
const TABS = ['foryou', 'all', 'applied', 'pending', 'posted'];
const LIST_TABS = ['all', 'applied', 'posted']; // list + detail layout ("foryou" is the swipe deck)

const EMPTY_FORM = {
  title: '', description: '', company: '', location: '', salary: '',
  employmentType: '', workplace: '', experienceLevel: '', skills: [], applyBy: '', questions: [], companyPage: ''
};

const formFromJob = (job) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, job?.[k] ?? EMPTY_FORM[k]])),
  skills: job?.skills || [],
  applyBy: job?.applyBy ? String(job.applyBy).slice(0, 10) : '',
  companyPage: job?.companyPage ? String(job.companyPage._id || job.companyPage) : '',
  questions: (job?.questions || []).map((q) => ({
    ...q, key: q._id, options: q.options || [], idealAnswer: q.idealAnswer || '', required: !!q.required
  }))
});

const matches = (job, q) => {
  if (!q) return true;
  const hay = `${job?.title || ''} ${job?.company || ''} ${job?.location || ''}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

const useIsDesktop = () => {
  const query = '(min-width: 1024px)';
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true);
  const [desktop, setDesktop] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return desktop;
};

const OptionSelect = ({ value, onChange, options, placeholder, testId }) => (
  <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
    <SelectTrigger data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>
      <SelectItem value={NONE}>Not specified</SelectItem>
      {Object.entries(options).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
    </SelectContent>
  </Select>
);

// Shared by "Post a job" and "Edit job"
const JobForm = ({ initial, submitLabel, onSubmit, pages = [], defaultPage = null }) => {
  const [form, setForm] = useState(() => {
    const start = initial || EMPTY_FORM;
    if (initial || !defaultPage) return start;
    return { ...start, companyPage: defaultPage._id, company: defaultPage.name, location: start.location || defaultPage.locations?.[0] || '' };
  });
  const postAsPage = pages.find((p) => p._id === form.companyPage) || null;
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const [showSalaryError, setShowSalaryError] = useState(false);
  const salaryError = showSalaryError ? checkSalary(form.salary) : '';

  const addSkill = (picked) => {
    const skill = String(picked ?? skillInput).trim().replace(/,$/, '').slice(0, 40);
    if (skill && form.skills.length < 20 && !form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      set('skills')([...form.skills, skill]);
    }
    setSkillInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const qErr = questionsError(form.questions);
    if (qErr) { toast.error(qErr); return; }
    const salaryErr = checkSalary(form.salary);
    if (salaryErr) { setShowSalaryError(true); toast.error(salaryErr); return; }
    setSaving(true);
    try {
      const { companyPage, ...rest } = form;
      await onSubmit({ ...rest, applyBy: form.applyBy || null, questions: questionsPayload(form.questions), ...(companyPage || initial ? { companyPage: companyPage || null } : {}) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4 pf-page">
      {pages.length > 0 && (
        <div>
          <Label>Post as</Label>
          <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" data-testid="job-post-as">
            {[{ _id: '', name: 'Yourself' }, ...pages].map((p) => {
              const active = (form.companyPage || '') === p._id;
              return (
                <button key={p._id || 'me'} type="button" role="radio" aria-checked={active}
                  onClick={() => setForm((f) => ({ ...f, companyPage: p._id, company: p._id ? p.name : (f.companyPage ? '' : f.company) }))}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${active ? 'border-[#2b2622] bg-[#16324F] text-white' : 'border-[#DCE3EB] bg-white text-[#16324F] hover:border-[#B9C6D5]'}`}
                  data-testid={`job-post-as-${p._id ? p.slug : 'me'}`}>
                  {p._id ? <CompanyLogo page={p} className="w-5 h-5" rounded="rounded" text="text-[8px]" /> : null}{p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <Label>Job Title</Label>
        <Input value={form.title} onChange={(e) => set('title')(e.target.value)} maxLength={150} required data-testid="job-form-title" />
      </div>
      <div>
        <Label>Company</Label>
        <Input value={postAsPage ? postAsPage.name : form.company} onChange={(e) => set('company')(e.target.value)} maxLength={150} required disabled={!!postAsPage} data-testid="job-form-company" />
        {postAsPage && <p className="mt-1 text-xs text-[#526174]">The job shows {postAsPage.name}'s page and logo.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Location</Label>
          <LocationInput value={form.location} onChange={set('location')} maxLength={150} placeholder="Search a city, e.g. Pune" data-testid="job-form-location" />
        </div>
        <div>
          <Label>Salary</Label>
          <Input value={form.salary} onChange={(e) => set('salary')(e.target.value)} maxLength={80} placeholder="e.g. ₹6–8 LPA or ₹40,000/month" data-testid="job-form-salary"
            aria-invalid={!!salaryError} className={salaryError ? 'border-red-400' : ''} onBlur={() => setShowSalaryError(true)} />
          {salaryError && <p className="mt-1 text-xs text-red-600" data-testid="job-form-salary-error">{salaryError}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Employment type</Label>
          <OptionSelect value={form.employmentType} onChange={set('employmentType')} options={EMPLOYMENT_TYPES} placeholder="Type" testId="job-form-type" />
        </div>
        <div>
          <Label>Workplace</Label>
          <OptionSelect value={form.workplace} onChange={set('workplace')} options={WORKPLACES} placeholder="Workplace" testId="job-form-workplace" />
        </div>
        <div>
          <Label>Experience</Label>
          <OptionSelect value={form.experienceLevel} onChange={set('experienceLevel')} options={EXPERIENCE_LEVELS} placeholder="Level" testId="job-form-level" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Skills</Label>
          <div className="flex gap-2">
            <AutocompleteInput
              field="skill"
              wrapperClassName="flex-1"
              value={skillInput}
              onChange={setSkillInput}
              onPick={(v) => addSkill(v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }}
              placeholder="Search skills, e.g. Revit"
              data-testid="job-form-skill-input"
            />
            <Button type="button" variant="outline" onClick={() => addSkill()} aria-label="Add skill"><FiPlus /></Button>
          </div>
        </div>
        <div>
          <Label>Apply by</Label>
          <Input type="date" value={form.applyBy} onChange={(e) => set('applyBy')(e.target.value)} data-testid="job-form-apply-by" />
        </div>
      </div>
      {form.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {form.skills.map((skill) => (
            <Badge key={skill} className="bg-yellow-100 text-black hover:bg-yellow-100 gap-1">
              {skill}
              <button type="button" onClick={() => set('skills')(form.skills.filter((s) => s !== skill))} aria-label={`Remove ${skill}`}>
                <FiX className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div>
        <Label>Job Description</Label>
        <Textarea value={form.description} onChange={(e) => set('description')(e.target.value)} maxLength={5000} required className="min-h-32" data-testid="job-form-description" />
      </div>
      <ScreeningQuestionsEditor
        questions={form.questions}
        onChange={set('questions')}
        skills={form.skills}
        location={form.location}
      />
      <Button type="submit" disabled={saving} className="w-full bg-[#16324F] text-white" data-testid="job-form-submit">
        {saving ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
};

const getMatchColor = (score) => {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-400';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-gray-400';
};

// A posted job in the "Posted" list, with the owner's actions
const PostedJobItem = ({ job, selected, onSelect, onEdit, onToggleStatus, onDelete, onApplicants, onMatches }) => {
  const count = job.applicantCount ?? job.applicants?.length ?? 0;
  const chips = jobChips(job);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(job)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(job); } }}
      className={`relative rounded-2xl border bg-white p-3 sm:p-4 cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-[#F2B21B]
        ${selected ? 'border-[#F2B21B] ring-1 ring-[#F2B21B] bg-[#FFFBF0]' : 'border-[#DCE3EB] hover:border-[#B9C6D5]'} ${isClosed(job) ? 'opacity-80' : ''}`}
      data-testid={`posted-job-${job._id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#16324F] break-words">{job.title}</p>
          <p className="text-sm text-[#526174] truncate">{[job.company, job.location].filter(Boolean).join(' · ')}</p>
          {chips.length > 0 && <p className="text-xs text-[#526174] mt-0.5">{chips.join(' · ')}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <JobCardActions job={job} isMine onReport={() => {}} />
          <span className={`text-xs rounded-full px-2 py-0.5 ${isClosed(job) ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'}`}>{isClosed(job) ? 'Closed' : 'Open'}</span>
        </div>
      </div>
      <p className="text-xs text-[#526174] mt-1">
        {job.createdAt ? `Posted ${shortDate(job.createdAt)}` : ''}
        {job.questions?.length ? `${job.createdAt ? ' · ' : ''}${job.questions.length} screening question${job.questions.length === 1 ? '' : 's'}` : ''}
      </p>
      <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Button size="sm" onClick={() => onApplicants(job)} className="bg-[#16324F] hover:bg-[#0F2439] text-white h-8" data-testid={`applicants-${job._id}`}>
          <FiUsers className="mr-1" />Applicants ({count})
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => onEdit(job)} data-testid={`job-edit-${job._id}`}>
          <FiEdit2 className="mr-1" />Edit
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => onToggleStatus(job)} data-testid={`job-toggle-status-${job._id}`}>
          {isClosed(job) ? <><FiUnlock className="mr-1" />Reopen</> : <><FiLock className="mr-1" />Close</>}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(job)} className="h-8 text-red-600 hover:text-red-700" data-testid={`job-delete-${job._id}`}>
          <FiTrash2 className="mr-1" />Delete
        </Button>
        <Button size="sm" onClick={() => onMatches(job)} className="h-8 bg-[#16324F] hover:bg-[#0F2439] text-white" data-testid={`job-matches-${job._id}`}>
          <FiStar className="mr-1" />Top 10 matches
        </Button>
      </div>
    </div>
  );
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [myApplications, setMyApplications] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(null);
  const [showSavedAnswers, setShowSavedAnswers] = useState(false);
  const [localApplied, setLocalApplied] = useState(() => new Set());
  const [matchesJob, setMatchesJob] = useState(null);
  const [matchedCandidates, setMatchedCandidates] = useState([]);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeReview, setResumeReview] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [reportJob, setReportJob] = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [applicantsJob, setApplicantsJob] = useState(null);
  const [fetchedJob, setFetchedJob] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVersion, setDetailVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useIsDesktop();
  const { user, setUser } = useAuth();
  const { pages: myPages, acting } = usePages();
  const asParam = searchParams.get('as');
  const postAsDefault = myPages.find((p) => p._id === asParam) || acting || null;
  const copy = getCopy(user);
  const myId = user?.id || user?._id;
  const isRecruiter = user?.role === 'recruiter';
  const canPost = POSTING_ROLES.includes(user?.role) || (user?.role !== 'student' && user?.intent?.includes?.('hire')) || myPages.length > 0;
  const showPostedTab = canPost || myJobs.length > 0;
  const isMine = useCallback((job) => !!myId && String(idOf(job?.postedBy)) === String(myId), [myId]);
  const deepLinkId = searchParams.get('job');
  const tabParam = searchParams.get('tab');
  // Students land on the swipe deck; everyone else on the full list (a ?job= link opens the list)
  const defaultTab = user?.role === 'student' && !deepLinkId ? 'foryou' : 'all';
  const tab = TABS.includes(tabParam) && (tabParam !== 'posted' || showPostedTab) ? tabParam : defaultTab;

  // "Post a job" from a company Page lands here with ?post=1&as=<page>
  useEffect(() => {
    if (searchParams.get('post') !== '1' || !canPost) return;
    setShowPostDialog(true);
    setSearchParams((p) => { p.delete('post'); return p; }, { replace: true });
  }, [searchParams, canPost, setSearchParams]);

  const setTab = (next) => {
    setSearchParams((p) => {
      p.set('tab', next);
      p.delete('job');
      return p;
    }, { replace: true });
  };

  useEffect(() => {
    fetchJobs();
    fetchRecommendedJobs();
    fetchMyApplications();
    fetchPending();
    if (user) fetchMyPostedJobs();
    if (user && !isRecruiter) {
      axios.get(`${API_URL}/api/jobs/answers`, { silent: true })
        .then((res) => setSavedCount((res.data.answers || []).length))
        .catch(() => {});
    }
  }, [user]);

  // Seed resume score + auto-apply toggle from the persisted profile (survives page reloads)
  useEffect(() => {
    if (user?.resume?.score !== undefined) {
      setResumeReview({
        score: user.resume.score,
        breakdown: user.resume.scoreBreakdown,
        strengths: user.resume.strengths,
        improvements: user.resume.improvements,
        suggestedRoles: user.resume.suggestedRoles
      });
    }
    setAutoApplyEnabled(!!user?.jobPreferences?.autoApplyEnabled);
  }, [user]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/list`);
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchRecommendedJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/recommended`, { silent: true });
      setRecommendedJobs(response.data.recommendations || []);
    } catch (error) {
      console.error('Failed to load recommendations');
    } finally {
      setRecLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/my/applications`, { silent: true });
      setMyApplications(response.data.applications || []);
    } catch (error) {
      console.error('Failed to load applications');
    }
  };

  const fetchMyPostedJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/my/posted`, { silent: true });
      setMyJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to load posted jobs');
    }
  };

  const fetchPending = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/my/pending`, { silent: true });
      setPending(response.data.pending || []);
    } catch (error) {
      console.error('Failed to load pending applications');
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchMatchedCandidates = async (job) => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/${job._id}/matched-candidates`);
      setMatchedCandidates(response.data.matchedCandidates || []);
      setMatchesJob(job);
      if (!(response.data.matchedCandidates || []).length) toast.info('No strong matches yet');
    } catch (error) {
      toast.error('Failed to load matched candidates');
    }
  };

  const appliedJobIds = useMemo(() => {
    const ids = new Set(localApplied);
    myApplications.forEach((app) => { const id = app.job?.id || app.job?._id; if (id) ids.add(String(id)); });
    jobs.forEach((j) => { if (j.hasApplied) ids.add(String(j._id)); });
    return ids;
  }, [myApplications, jobs, localApplied]);
  const hasApplied = (job) => !!job && (job.hasApplied || appliedJobIds.has(String(job._id)));

  // Applications shaped like jobs so they share the list + detail layout
  const applicationJobs = useMemo(() => myApplications.map((app) => ({
    ...app.job,
    _id: app.job?.id || app.job?._id,
    hasApplied: true,
    appliedAt: app.appliedAt,
    applicationStatus: app.status,
    applicationSource: app.source
  })), [myApplications]);

  const listForTab = useMemo(() => {
    const source = tab === 'all' ? jobs : tab === 'applied' ? applicationJobs : tab === 'posted' ? myJobs : [];
    return source.filter((j) => matches(j, search.trim()));
  }, [tab, jobs, applicationJobs, myJobs, search]);

  const isListTab = LIST_TABS.includes(tab);
  // "Jobs for you" as a plain list instead of the swipe deck (Settings → Jobs)
  const forYouList = tab === 'foryou' && user?.jobsView === 'list';
  const forYouJobs = useMemo(
    () => (forYouList ? recommendedJobs.filter((j) => matches(j, search.trim())) : []),
    [forYouList, recommendedJobs, search]
  );
  // Desktop always shows something on the right; phones show the list until a job is tapped
  const effectiveId = deepLinkId || (isDesktop && isListTab ? listForTab[0]?._id : null)
    || (isDesktop && forYouList ? forYouJobs[0]?._id : null);

  const listJob = useMemo(() => {
    if (!effectiveId) return null;
    const pools = [jobs, recommendedJobs, myJobs, applicationJobs];
    for (const pool of pools) {
      const found = pool.find((j) => String(j._id) === String(effectiveId));
      if (found) return found;
    }
    return null;
  }, [effectiveId, jobs, recommendedJobs, myJobs, applicationJobs]);

  // Full job (description, poster, applicant count) for whichever job is shown
  useEffect(() => {
    if (!effectiveId) { setFetchedJob(null); return undefined; }
    let cancelled = false;
    setDetailLoading(true);
    axios.get(`${API_URL}/api/jobs/${effectiveId}`, { silent: true })
      .then((res) => { if (!cancelled) setFetchedJob(res.data.job); })
      .catch(() => {
        if (cancelled) return;
        setFetchedJob(null);
        if (deepLinkId === effectiveId) {
          toast.error('That job is no longer available');
          setSearchParams((p) => { p.delete('job'); return p; }, { replace: true });
        }
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId, detailVersion]);

  const detailJob = useMemo(() => {
    const fetched = fetchedJob && String(fetchedJob._id) === String(effectiveId) ? fetchedJob : null;
    if (!listJob && !fetched) return null;
    // Keep recommendation extras (matchScore, matchedSkills, matchReason) from the list item
    return { ...(listJob || {}), ...(fetched || {}), postedBy: fetched?.postedBy || listJob?.postedBy };
  }, [listJob, fetchedJob, effectiveId]);

  const openJob = useCallback((job) => {
    const id = job?._id || job?.id;
    if (!id) return;
    // Pin the current tab, so opening a job from "Jobs for you" doesn't fall back to All jobs
    setSearchParams((p) => { if (!p.get('tab')) p.set('tab', tab); p.set('job', id); return p; }, { replace: true });
    if (!window.matchMedia?.('(min-width: 1024px)').matches) window.scrollTo({ top: 0 });
  }, [setSearchParams, tab]);

  const toggleJobsView = async () => {
    const next = user?.jobsView === 'list' ? 'swipe' : 'list';
    setUser((u) => ({ ...u, jobsView: next }));
    try {
      await axios.put(`${API_URL}/api/profile/update`, { jobsView: next }, { silent: true });
    } catch {
      setUser((u) => ({ ...u, jobsView: next === 'list' ? 'swipe' : 'list' }));
      toast.error('Could not save this setting');
    }
  };

  const closeJob = useCallback(() => {
    setSearchParams((p) => { p.delete('job'); return p; }, { replace: true });
  }, [setSearchParams]);

  // A job link from another tab (e.g. a shared link while on "Jobs for you") opens in a dialog there
  const detailInDialog = !isListTab && !forYouList && !!deepLinkId;

  const handleUploadResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);
    setUploadingResume(true);

    try {
      const response = await axios.post(`${API_URL}/api/jobs/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Resume uploaded and parsed successfully!');
      if (response.data.review) {
        setResumeReview(response.data.review);
        setShowReview(true);
      } else {
        toast.info("Uploaded, but AI scoring wasn't available right now.");
      }
      fetchRecommendedJobs();
      if (autoApplyEnabled) { fetchMyApplications(); fetchPending(); }
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  const handleToggleAutoApply = async (checked) => {
    setAutoApplyEnabled(checked);
    setSavingPreference(true);
    try {
      await axios.put(`${API_URL}/api/jobs/preferences`, { autoApplyEnabled: checked });
      toast.success(checked ? 'Auto-apply turned on — strong matches will be applied for you.' : 'Auto-apply turned off.');
      if (checked) setTimeout(() => { fetchMyApplications(); fetchPending(); }, 3000);
    } catch (error) {
      setAutoApplyEnabled(!checked);
      toast.error('Could not update auto-apply preference');
    } finally {
      setSavingPreference(false);
    }
  };

  // After any successful application (Apply dialog, swipe, or a pending draft)
  const handleApplied = useCallback((id) => {
    setLocalApplied((s) => new Set(s).add(String(id)));
    setJobs((list) => list.map((j) => (String(j._id) === String(id) ? { ...j, hasApplied: true, applicantCount: (j.applicantCount || 0) + 1 } : j)));
    setFetchedJob((d) => (d && String(d._id) === String(id) ? { ...d, hasApplied: true, applicantCount: (d.applicantCount || 0) + 1 } : d));
    fetchMyApplications();
    fetchPending();
  }, []);

  const handlePendingDone = (pendingId, outcome, jobIdDone) => {
    setPending((list) => list.filter((p) => p._id !== pendingId));
    if (outcome === 'submitted' && jobIdDone) handleApplied(jobIdDone);
  };

  const handlePostJob = async (data) => {
    try {
      await axios.post(`${API_URL}/api/jobs/create`, data);
      toast.success('Job posted successfully!');
      setShowPostDialog(false);
      fetchJobs();
      fetchMyPostedJobs();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post job');
    }
  };

  const handleEditJob = async (data) => {
    try {
      await axios.put(`${API_URL}/api/jobs/${editingJob._id}`, data);
      toast.success('Job updated');
      setEditingJob(null);
      fetchJobs();
      fetchMyPostedJobs();
      setDetailVersion((v) => v + 1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update job');
    }
  };

  const handleToggleStatus = async (job) => {
    const status = isClosed(job) ? 'open' : 'closed';
    try {
      await axios.put(`${API_URL}/api/jobs/${job._id}`, { status });
      toast.success(status === 'closed' ? 'Job closed to new applications' : 'Job reopened');
      fetchJobs();
      fetchMyPostedJobs();
      setDetailVersion((v) => v + 1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update job');
    }
  };

  const handleDeleteJob = async () => {
    const job = deletingJob;
    setDeletingJob(null);
    try {
      await axios.delete(`${API_URL}/api/jobs/${job._id}`);
      toast.success('Job deleted');
      if (String(deepLinkId) === String(job._id)) closeJob();
      fetchJobs();
      fetchMyPostedJobs();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete job');
    }
  };

  const detailProps = {
    job: detailJob,
    loading: detailLoading,
    mine: isMine(detailJob),
    applied: hasApplied(detailJob),
    onApply: setApplyJob,
    onReport: setReportJob,
    onEdit: (j) => { setEditingJob(myJobs.find((m) => m._id === j._id) || j); },
    onApplicants: setApplicantsJob
  };

  const tabButton = (value, label, extra = {}) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap
        ${tab === value ? 'bg-[#16324F] text-white' : 'bg-white border border-[#DCE3EB] text-[#16324F] hover:border-[#B9C6D5]'}`}
      {...extra}
    >
      {label}
    </button>
  );

  const countPill = (n, active) => (
    <span className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${active ? 'bg-[#F2B21B] text-[#16324F]' : 'bg-[#F2EEE8] text-[#526174]'}`}>{n}</span>
  );

  const emptyList = {
    all: jobsLoading ? 'Loading jobs…' : search ? 'No jobs match your search' : 'No open jobs right now',
    applied: search ? 'No applications match your search' : 'No applications yet',
    posted: search ? 'No posted jobs match your search' : "You haven't posted any jobs yet"
  }[tab];

  const filteredPending = pending.filter((p) => matches(p.job, search.trim()));

  return (
    <div className="min-h-screen bg-[#F5F7FA] pf-page" style={{ overflowX: 'clip' }}>
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="pf-serif text-3xl sm:text-4xl text-[#16324F]">{copy.jobsLabel}</h1>
            <p className="text-[#526174] mt-1">{copy.jobsSubtitle}</p>
          </div>
          {canPost && (
            <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#16324F] hover:bg-[#0F2439] text-white rounded-full self-start sm:self-auto" data-testid="post-job-button">
                  <FiPlus className="mr-2" />Post a job
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="pf-serif text-2xl">Post a New Job</DialogTitle>
                </DialogHeader>
                {showPostDialog && <JobForm key={postAsDefault?._id || "me"} submitLabel="Post Job" onSubmit={handlePostJob} pages={myPages} defaultPage={postAsDefault} />}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Résumé + auto-apply */}
        {!isRecruiter && (
          <div className="rounded-2xl border border-[#DCE3EB] bg-white p-4 sm:p-5 mb-6" data-testid="auto-apply-card">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${autoApplyEnabled ? 'bg-[#F2B21B] text-[#16324F]' : 'bg-[#F2EEE8] text-[#526174]'}`}>
                  <FiZap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3" data-testid="auto-apply-toggle">
                    <p className="font-semibold text-[#16324F]">Auto-apply</p>
                    <Switch checked={autoApplyEnabled} onCheckedChange={handleToggleAutoApply} disabled={savingPreference} aria-label="Auto-apply to strong matches" />
                    <span className="text-xs text-[#526174]">{autoApplyEnabled ? 'On' : 'Off'}</span>
                  </div>
                  <p className="text-sm text-[#526174] mt-1">
                    Auto-apply: our AI applies to strong matches for you using your profile and saved answers. If a job asks something only you can answer, we'll email you and keep it under Needs your answers.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowSavedAnswers(true)} data-testid="saved-answers-button">
                  <FiBookmark className="mr-1.5" />Saved answers{savedCount !== null ? ` (${savedCount})` : ''}
                </Button>
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.docx" onChange={handleUploadResume} className="hidden" data-testid="resume-upload-input" />
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#16324F] hover:bg-[#e0a312] text-white font-semibold px-4 py-1.5 text-sm transition">
                    <FiUpload className="w-4 h-4" />{uploadingResume ? 'Uploading...' : resumeReview ? 'Update résumé' : 'Upload résumé'}
                  </span>
                </label>
              </div>
            </div>

            {resumeReview && (
              <div className="mt-4 pt-4 border-t border-[#f0ebe4]" data-testid="resume-score-card">
                <button type="button" onClick={() => setShowReview((v) => !v)} className="w-full flex items-center gap-3 text-left" aria-expanded={showReview}>
                  <span className={`${getMatchColor(resumeReview.score)} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>{resumeReview.score}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[#16324F]">Your résumé score</span>
                    <span className="block text-xs text-[#526174]">AI-reviewed · {showReview ? 'hide' : 'see'} the review</span>
                  </span>
                  <FiChevronDown className={`text-[#526174] transition ${showReview ? 'rotate-180' : ''}`} />
                </button>
                {showReview && (
                  <div className="mt-4 space-y-4">
                    {resumeReview.breakdown && Object.keys(resumeReview.breakdown).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(resumeReview.breakdown).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-xs text-[#526174] capitalize mb-1">{key}</p>
                            <Progress value={val} className="h-2" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {resumeReview.strengths?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-[#16324F] mb-2">Strengths</p>
                          <ul className="space-y-1">
                            {resumeReview.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[#16324F]"><FiCheckCircle className="text-green-500 mt-0.5 shrink-0" />{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {resumeReview.improvements?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-[#16324F] mb-2">How to improve</p>
                          <ul className="space-y-1">
                            {resumeReview.improvements.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[#16324F]"><FiAward className="text-yellow-500 mt-0.5 shrink-0" />{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {resumeReview.suggestedRoles?.length > 0 && (
                      <div>
                        <p className="text-xs text-[#526174] mb-2">Well-suited roles:</p>
                        <div className="flex flex-wrap gap-2">
                          {resumeReview.suggestedRoles.map((role, i) => <Badge key={i} className="bg-[#F2EEE8] text-[#16324F] hover:bg-[#F2EEE8]">{role}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
          <div role="tablist" className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 lg:pb-0 flex-1 min-w-0 [scrollbar-width:none]">
            {tabButton('foryou', <>Jobs for you{recommendedJobs.length > 0 && countPill(recommendedJobs.filter((j) => !hasApplied(j)).length, tab === 'foryou')}</>, { 'data-testid': 'tab-foryou' })}
            {tabButton('all', 'All jobs', { 'data-testid': 'tab-all' })}
            {tabButton('applied', <>Applied{myApplications.length > 0 && countPill(myApplications.length, tab === 'applied')}</>, { 'data-testid': 'tab-applied' })}
            {(!isRecruiter || pending.length > 0) && tabButton('pending', <>Needs your answers{pending.length > 0 && countPill(pending.length, true)}</>, { 'data-testid': 'tab-pending' })}
            {showPostedTab && tabButton('posted', <>Posted{countPill(myJobs.length, tab === 'posted')}</>, { 'data-testid': 'posted-jobs-tab' })}
          </div>
          {(tab !== 'foryou' || forYouList) && (
            <div className="relative lg:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#526174]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, company, location"
                className="pl-9 rounded-full bg-white border-[#DCE3EB]"
                autoComplete="off"
                data-testid="jobs-search"
              />
            </div>
          )}
        </div>

        {/* Jobs for you: swipe deck */}
        {tab === 'foryou' && (
          <>
            {forYouList ? (
              <div className="lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-6 lg:items-start" data-testid="foryou-list">
                <div className={`${deepLinkId ? 'hidden lg:block' : ''} space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 lg:pb-4`}>
                  {recLoading && recommendedJobs.length === 0 && <SkeletonRows rows={4} />}
                  {forYouJobs.map((job) => (
                    <JobListItem
                      key={job._id}
                      job={job}
                      selected={String(effectiveId) === String(job._id)}
                      applied={hasApplied(job)}
                      isMine={isMine(job)}
                      onSelect={openJob}
                      onReport={setReportJob}
                    />
                  ))}
                  {!recLoading && forYouJobs.length === 0 && (
                    <div className="rounded-2xl border border-[#DCE3EB] bg-white text-center py-12 px-4 text-[#526174]">
                      {search.trim() ? 'No matching jobs' : 'No recommendations yet'}
                    </div>
                  )}
                </div>
                <div className={`${deepLinkId ? '' : 'hidden lg:block'} lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto`}>
                  <JobDetail {...detailProps} onBack={closeJob} />
                </div>
              </div>
            ) : (
              <SwipeDeck
                jobs={recommendedJobs}
                appliedIds={appliedJobIds}
                loading={recLoading}
                onApplied={handleApplied}
                onDetails={openJob}
                onBrowseAll={() => setTab('all')}
                paused={!!deepLinkId || !!applyJob}
              />
            )}
            <p className="text-center text-xs text-[#526174] mt-3">
              {forYouList ? 'Prefer swiping?' : 'Prefer a list?'}{' '}
              <button type="button" onClick={toggleJobsView} className="font-medium text-black underline underline-offset-2" data-testid="jobs-view-toggle">
                {forYouList ? 'Switch to swipe view' : 'Switch to list view'}
              </button>
              <span className="hidden sm:inline"> · also in Settings</span>
            </p>
            {!recLoading && recommendedJobs.length === 0 && !resumeReview && !isRecruiter && (
              <p className="text-center text-sm text-[#526174] mt-4">Tip: upload your résumé above to get AI-matched jobs here.</p>
            )}
          </>
        )}

        {/* Needs your answers */}
        {tab === 'pending' && (
          <div className="max-w-3xl">
            <PendingApplications pending={filteredPending} loading={pendingLoading} onDone={handlePendingDone} onOpenJob={openJob} />
          </div>
        )}

        {/* List + detail (All jobs, Applied, Posted) */}
        {isListTab && (
          <div className="lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-6 lg:items-start">
            <div
              className={`${deepLinkId ? 'hidden lg:block' : ''} space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 lg:pb-4`}
              data-testid="jobs-list"
            >
              {listForTab.length > 0 && (
                <p className="text-xs text-[#526174] px-1">{listForTab.length} {listForTab.length === 1 ? 'job' : 'jobs'}</p>
              )}
              {tab === 'posted' ? listForTab.map((job) => (
                <PostedJobItem
                  key={job._id}
                  job={job}
                  selected={String(effectiveId) === String(job._id)}
                  onSelect={openJob}
                  onEdit={setEditingJob}
                  onToggleStatus={handleToggleStatus}
                  onDelete={setDeletingJob}
                  onApplicants={setApplicantsJob}
                  onMatches={fetchMatchedCandidates}
                />
              )) : listForTab.map((job) => (
                <JobListItem
                  key={job._id}
                  job={job}
                  selected={String(effectiveId) === String(job._id)}
                  applied={hasApplied(job)}
                  isMine={isMine(job)}
                  onSelect={openJob}
                  onReport={setReportJob}
                  testId={tab === 'applied' ? `application-${job._id}` : undefined}
                  meta={tab === 'applied' ? (
                    <>
                      {job.appliedAt && <span>Applied {shortDate(job.appliedAt)}</span>}
                      {job.applicationSource === 'auto' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5"><FiZap className="w-3 h-3" />Auto-applied</span>
                      )}
                      {job.applicationStatus && <span className="rounded-full bg-[#F2EEE8] text-[#16324F] px-2 py-0.5 capitalize">{job.applicationStatus}</span>}
                    </>
                  ) : null}
                />
              ))}
              {listForTab.length === 0 && (
                <div className="rounded-2xl border border-[#DCE3EB] bg-white text-center py-12 px-4 text-[#526174]">{emptyList}</div>
              )}
            </div>

            <div className={`${deepLinkId ? '' : 'hidden lg:block'} lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4`}>
              {(detailJob || deepLinkId || listForTab.length > 0) ? (
                <JobDetail {...detailProps} onBack={closeJob} />
              ) : (
                <div className="rounded-2xl border border-[#DCE3EB] bg-white p-8 text-center text-[#526174]">Nothing to show yet</div>
              )}
            </div>
          </div>
        )}

        {/* Job opened from the deck or the pending tab */}
        <Dialog open={detailInDialog} onOpenChange={(o) => { if (!o) closeJob(); }}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 border-0 bg-transparent shadow-none">
            <DialogHeader className="sr-only"><DialogTitle>{detailJob?.title || 'Job'}</DialogTitle></DialogHeader>
            {detailInDialog && <JobDetail {...detailProps} />}
          </DialogContent>
        </Dialog>

        {matchesJob && matchedCandidates.length > 0 && (
          <Dialog open onOpenChange={(o) => { if (!o) setMatchesJob(null); }}>
            <DialogContent className="w-[calc(100%-1.5rem)] max-w-4xl max-h-[80vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="pf-serif text-xl pr-6">Top 10 AI-Matched Candidates for {matchesJob.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {matchedCandidates.map((candidate, idx) => (
                  <Card key={candidate._id} className="border border-[#DCE3EB] rounded-2xl">
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-[#16324F] rounded-full flex items-center justify-center font-bold text-white shrink-0">#{idx + 1}</div>
                          <Avatar className="w-12 h-12 shrink-0">
                            <AvatarImage src={candidate.profilePic} />
                            <AvatarFallback className="bg-gray-300 text-xl">{candidate.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3 className="font-bold text-[#16324F] truncate">{candidate.name}</h3>
                            <p className="text-sm text-[#526174] truncate">{candidate.email}</p>
                            {candidate.resume?.parsedData?.experience?.years && (
                              <p className="text-xs text-[#526174]">{candidate.resume.parsedData.experience.years} years experience</p>
                            )}
                          </div>
                        </div>
                        <div className={`${getMatchColor(candidate.matchScore)} text-white px-3 py-1.5 rounded-lg font-bold self-start`}>
                          {candidate.matchScore}% Match
                        </div>
                      </div>
                      {candidate.matchedSkills?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {candidate.matchedSkills.map((skill, i) => <Badge key={i} className="bg-green-100 text-green-800 hover:bg-green-100">{skill}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={!!editingJob} onOpenChange={(o) => { if (!o) setEditingJob(null); }}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="pf-serif text-2xl">Edit job</DialogTitle>
            </DialogHeader>
            {editingJob && <JobForm key={editingJob._id} initial={formFromJob(editingJob)} submitLabel="Save changes" onSubmit={handleEditJob} pages={myPages} />}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingJob} onOpenChange={(o) => { if (!o) setDeletingJob(null); }}>
          <AlertDialogContent className="w-[calc(100%-1.5rem)] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this job?</AlertDialogTitle>
              <AlertDialogDescription>
                “{deletingJob?.title}” and its {deletingJob?.applicants?.length || 0} application(s) will be removed. To just stop new applications, close it instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteJob} className="bg-red-600 hover:bg-red-700 text-white" data-testid="job-delete-confirm">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {applyJob && <ApplyDialog job={applyJob} onClose={() => setApplyJob(null)} onApplied={handleApplied} />}
        {applicantsJob && <ApplicantsDialog job={applicantsJob} onClose={() => setApplicantsJob(null)} />}
        <SavedAnswersDialog open={showSavedAnswers} onOpenChange={setShowSavedAnswers} onCountChange={setSavedCount} />

        {reportJob && (
          <ReportDialog
            open={!!reportJob}
            onOpenChange={(o) => { if (!o) setReportJob(null); }}
            person={reportJob.postedBy}
            context="job"
            itemId={reportJob._id}
            itemTitle={reportJob.title}
          />
        )}
      </div>
    </div>
  );
};

export default Jobs;
