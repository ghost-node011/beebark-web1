import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../components/ui/alert-dialog';
import ShareMenu from '../components/ShareMenu';
import ReportDialog from '../components/ReportDialog';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  FiUpload, FiBriefcase, FiMapPin, FiDollarSign, FiFileText, FiAward, FiZap, FiCheckCircle,
  FiShare2, FiFlag, FiEdit2, FiTrash2, FiLock, FiUnlock, FiCalendar, FiX, FiUsers, FiPlus
} from 'react-icons/fi';
import { API_URL } from '../config/api';
import { getCopy } from '../config/roleDomainCopy';

const EMPLOYMENT_TYPES = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship', contract: 'Contract', freelance: 'Freelance', graduate: 'Graduate' };
const WORKPLACES = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' };
const EXPERIENCE_LEVELS = { fresher: 'Fresher', junior: 'Junior', mid: 'Mid-level', senior: 'Senior' };
// Roles that can post; students can't (the backend also allows anyone with a "hire" intent)
const POSTING_ROLES = ['professional', 'firm', 'recruiter', 'company'];
const NONE = 'none'; // Radix Select can't use '' as an item value

const EMPTY_FORM = {
  title: '', description: '', company: '', location: '', salary: '',
  employmentType: '', workplace: '', experienceLevel: '', skills: [], applyBy: ''
};

const formFromJob = (job) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, job?.[k] ?? EMPTY_FORM[k]])),
  skills: job?.skills || [],
  applyBy: job?.applyBy ? String(job.applyBy).slice(0, 10) : ''
});

const isClosed = (job) => job?.status === 'closed';
const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

// "Full-time · Hybrid · Mid-level"
const jobChips = (job) => [
  EMPLOYMENT_TYPES[job?.employmentType],
  WORKPLACES[job?.workplace],
  EXPERIENCE_LEVELS[job?.experienceLevel]
].filter(Boolean);

const JobChips = ({ job }) => {
  const chips = jobChips(job);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {chips.map((c) => <Badge key={c} variant="outline" className="text-xs font-medium text-gray-700">{c}</Badge>)}
    </div>
  );
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
const JobForm = ({ initial, submitLabel, onSubmit }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const addSkill = () => {
    const skill = skillInput.trim().replace(/,$/, '').slice(0, 40);
    if (skill && form.skills.length < 20 && !form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      set('skills')([...form.skills, skill]);
    }
    setSkillInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, applyBy: form.applyBy || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div>
        <Label>Job Title</Label>
        <Input value={form.title} onChange={(e) => set('title')(e.target.value)} maxLength={150} required data-testid="job-form-title" />
      </div>
      <div>
        <Label>Company</Label>
        <Input value={form.company} onChange={(e) => set('company')(e.target.value)} maxLength={150} required data-testid="job-form-company" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => set('location')(e.target.value)} maxLength={150} />
        </div>
        <div>
          <Label>Salary</Label>
          <Input value={form.salary} onChange={(e) => set('salary')(e.target.value)} maxLength={80} placeholder="$80k-100k" />
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
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }}
              placeholder="e.g. Revit, then Enter"
              data-testid="job-form-skill-input"
            />
            <Button type="button" variant="outline" onClick={addSkill} aria-label="Add skill"><FiPlus /></Button>
          </div>
        </div>
        <div>
          <Label>Apply by</Label>
          <Input type="date" value={form.applyBy} onChange={(e) => set('applyBy')(e.target.value)} />
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
      <Button type="submit" disabled={saving} className="w-full bg-black text-white" data-testid="job-form-submit">
        {saving ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
};

// Share (and Report, for other people's jobs) on a job card
const JobCardActions = ({ job, isMine, onReport }) => (
  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
    <ShareMenu
      path={`/jobs?job=${job._id}`}
      title={`${job.title} at ${job.company}`}
      testId={`job-share-${job._id}`}
      trigger={
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-gray-600" data-testid={`job-share-${job._id}`} aria-label="Share job">
          <FiShare2 className="w-4 h-4" />
        </Button>
      }
    />
    {!isMine && idOf(job.postedBy) && (
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-gray-600" onClick={() => onReport(job)} data-testid={`job-report-${job._id}`} aria-label="Report job">
        <FiFlag className="w-4 h-4" />
      </Button>
    )}
  </div>
);

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [matchedCandidates, setMatchedCandidates] = useState([]);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeReview, setResumeReview] = useState(null);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [reportJob, setReportJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const copy = getCopy(user);
  const myId = user?.id || user?._id;
  const canPost = POSTING_ROLES.includes(user?.role) || (user?.role !== 'student' && user?.intent?.includes?.('hire'));
  const showPostedTab = canPost || myJobs.length > 0;
  const isMine = (job) => !!myId && String(idOf(job?.postedBy)) === String(myId);
  const deepLinkId = searchParams.get('job');

  useEffect(() => {
    fetchJobs();
    fetchRecommendedJobs();
    fetchMyApplications();
    if (user) fetchMyPostedJobs();
  }, [user]);

  // /jobs?job=<id> opens that job in the detail dialog
  useEffect(() => {
    if (!deepLinkId) { setDetailJob(null); return; }
    let cancelled = false;
    axios.get(`${API_URL}/api/jobs/${deepLinkId}`)
      .then((res) => { if (!cancelled) setDetailJob(res.data.job); })
      .catch(() => {
        if (cancelled) return;
        toast.error('That job is no longer available');
        setSearchParams((p) => { p.delete('job'); return p; }, { replace: true });
      });
    return () => { cancelled = true; };
  }, [deepLinkId, setSearchParams]);

  const openJob = useCallback((job) => {
    setDetailJob(job);
    setSearchParams((p) => { p.set('job', job._id); return p; });
  }, [setSearchParams]);

  const closeJob = () => {
    setDetailJob(null);
    setSearchParams((p) => { p.delete('job'); return p; }, { replace: true });
  };

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
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Failed to load jobs');
    }
  };

  const fetchRecommendedJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/recommended`);
      setRecommendedJobs(response.data.recommendations || []);
    } catch (error) {
      console.error('Failed to load recommendations');
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/my/applications`);
      setMyApplications(response.data.applications || []);
    } catch (error) {
      console.error('Failed to load applications');
    }
  };

  const fetchMyPostedJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/my/posted`);
      setMyJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to load posted jobs');
    }
  };

  const fetchMatchedCandidates = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/${jobId}/matched-candidates`);
      setMatchedCandidates(response.data.matchedCandidates || []);
    } catch (error) {
      toast.error('Failed to load matched candidates');
    }
  };

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
      } else {
        toast.info("Uploaded, but AI scoring wasn't available right now.");
      }
      fetchRecommendedJobs();
      if (autoApplyEnabled) fetchMyApplications();
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleToggleAutoApply = async (checked) => {
    setAutoApplyEnabled(checked);
    setSavingPreference(true);
    try {
      await axios.put(`${API_URL}/api/jobs/preferences`, { autoApplyEnabled: checked });
      toast.success(checked ? 'Auto-apply turned on — strong matches will be applied for you.' : 'Auto-apply turned off.');
      if (checked) setTimeout(fetchMyApplications, 3000);
    } catch (error) {
      setAutoApplyEnabled(!checked);
      toast.error('Could not update auto-apply preference');
    } finally {
      setSavingPreference(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      await axios.post(`${API_URL}/api/jobs/${jobId}/apply`);
      toast.success('Application submitted!');
      fetchMyApplications();
      setDetailJob((d) => (d && d._id === jobId ? { ...d, hasApplied: true, applicantCount: (d.applicantCount || 0) + 1 } : d));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to apply');
    }
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
      fetchJobs();
      fetchMyPostedJobs();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete job');
    }
  };

  const getMatchColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-400';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  const appliedJobIds = useMemo(
    () => new Set(myApplications.map((app) => app.job.id)),
    [myApplications]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{copy.jobsLabel}</h1>
            <p className="text-gray-600">{copy.jobsSubtitle}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {user?.role !== 'recruiter' && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5" data-testid="auto-apply-toggle">
                <FiZap className={autoApplyEnabled ? 'text-yellow-500' : 'text-gray-400'} />
                <span className="text-sm font-medium text-black">Auto-apply to strong matches</span>
                <Switch checked={autoApplyEnabled} onCheckedChange={handleToggleAutoApply} disabled={savingPreference} />
              </div>
            )}
            {user?.role !== 'recruiter' && (
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.docx" onChange={handleUploadResume} className="hidden" />
                <div className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition">
                  <FiUpload className="w-5 h-5" />
                  <span>{uploadingResume ? 'Uploading...' : 'Upload Resume'}</span>
                </div>
              </label>
            )}
            {canPost && (
              <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-black hover:bg-gray-900 text-white" data-testid="post-job-button">
                    <FiPlus className="mr-2" />Post a job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Post a New Job</DialogTitle>
                  </DialogHeader>
                  {showPostDialog && <JobForm submitLabel="Post Job" onSubmit={handlePostJob} />}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {resumeReview && (
          <Card className="shadow-md mb-8 border-2 border-yellow-200" data-testid="resume-score-card">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`${getMatchColor(resumeReview.score)} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0`}>
                    {resumeReview.score}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">Your Resume Score</h3>
                    <p className="text-sm text-gray-600">AI-reviewed</p>
                  </div>
                </div>

                {resumeReview.breakdown && Object.keys(resumeReview.breakdown).length > 0 && (
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(resumeReview.breakdown).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-xs text-gray-500 capitalize mb-1">{key}</p>
                        <Progress value={val} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                {resumeReview.strengths?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-black mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {resumeReview.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <FiCheckCircle className="text-green-500 mt-0.5 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {resumeReview.improvements?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-black mb-2">How to improve</p>
                    <ul className="space-y-1">
                      {resumeReview.improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <FiAward className="text-yellow-500 mt-0.5 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {resumeReview.suggestedRoles?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2">Well-suited roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {resumeReview.suggestedRoles.map((role, i) => (
                      <Badge key={i} className="bg-gray-100 text-black">{role}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="flex w-full justify-start overflow-x-auto mb-6">
            <TabsTrigger value="browse">Browse {copy.jobsLabel}</TabsTrigger>
            <TabsTrigger value="recommended">Recommended ({recommendedJobs.length})</TabsTrigger>
            <TabsTrigger value="applied">My Applications ({myApplications.length})</TabsTrigger>
            {showPostedTab && <TabsTrigger value="posted" data-testid="posted-jobs-tab">Posted Jobs ({myJobs.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <Card key={job._id} className="shadow-md hover:shadow-xl transition" data-testid={`job-card-${job._id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <FiBriefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <button type="button" onClick={() => openJob(job)} className="text-left text-xl font-bold text-black hover:underline">{job.title}</button>
                          <p className="text-sm text-gray-600">{job.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <JobCardActions job={job} isMine={isMine(job)} onReport={setReportJob} />
                        <Badge className="bg-green-500 text-white">Active</Badge>
                      </div>
                    </div>
                    <JobChips job={job} />
                    <div className="space-y-2 mb-4">
                      {job.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FiMapPin className="mr-2" />{job.location}
                        </div>
                      )}
                      {job.salary && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FiDollarSign className="mr-2" />{job.salary}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-700 line-clamp-3 mb-4">{job.description}</p>
                    {isMine(job) ? (
                      <Button variant="outline" onClick={() => openJob(job)} className="w-full">Your job · View details</Button>
                    ) : appliedJobIds.has(job._id) ? (
                      <Button disabled className="w-full bg-gray-200 text-gray-500 cursor-not-allowed">
                        <FiCheckCircle className="mr-2" />Applied
                      </Button>
                    ) : (
                      <Button onClick={() => handleApply(job._id)} className="w-full bg-black hover:bg-gray-900 text-white">
                        Apply Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommended">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recommendedJobs.map((job) => (
                <Card key={job._id} className="shadow-md border-2 border-yellow-400 hover:shadow-xl transition">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                          <FiAward className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                          <button type="button" onClick={() => openJob(job)} className="text-left text-xl font-bold text-black hover:underline">{job.title}</button>
                          <p className="text-sm text-gray-600">{job.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <JobCardActions job={job} isMine={isMine(job)} onReport={setReportJob} />
                        <div className={`${getMatchColor(job.matchScore)} text-white px-3 py-1 rounded-full font-bold text-sm`}>
                          {job.matchScore}% AI Match
                        </div>
                      </div>
                    </div>
                    <JobChips job={job} />
                    {job.matchedSkills?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-600 mb-2">Matched Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.matchedSkills.slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} className="bg-yellow-100 text-black">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 mb-4">
                      {job.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FiMapPin className="mr-2" />{job.location}
                        </div>
                      )}
                      {job.salary && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FiDollarSign className="mr-2" />{job.salary}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-700 line-clamp-3 mb-4">{job.description}</p>
                    {appliedJobIds.has(job._id) ? (
                      <Button disabled className="w-full bg-gray-200 text-gray-500 cursor-not-allowed">
                        <FiCheckCircle className="mr-2" />Applied
                      </Button>
                    ) : (
                      <Button onClick={() => handleApply(job._id)} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
                        Quick Apply
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {recommendedJobs.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Upload your resume to get AI-powered job recommendations</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="applied">
            <div className="space-y-4">
              {myApplications.map((app, idx) => (
                <Card key={idx} className="shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FiBriefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-black">{app.job.title}</h3>
                          <p className="text-sm text-gray-600">{app.job.company}</p>
                          <p className="text-xs text-gray-500 mt-1">Applied on {new Date(app.appliedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {app.source === 'auto' && (
                          <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
                            <FiZap className="w-3 h-3" />Auto-applied
                          </Badge>
                        )}
                        <Badge className={app.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'}>{app.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {myApplications.length === 0 && (
                <div className="text-center py-12 text-gray-500">No applications yet</div>
              )}
            </div>
          </TabsContent>

          {showPostedTab && (
            <TabsContent value="posted">
              <div className="space-y-6">
                {myJobs.map((job) => (
                  <Card key={job._id} className={`shadow-md ${isClosed(job) ? 'opacity-75' : ''}`} data-testid={`posted-job-${job._id}`}>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-xl">
                            <button type="button" onClick={() => openJob(job)} className="text-left hover:underline">{job.title}</button>
                          </CardTitle>
                          <p className="text-sm text-gray-600">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <JobCardActions job={job} isMine onReport={setReportJob} />
                          <Button variant="outline" size="sm" onClick={() => setEditingJob(job)} data-testid={`job-edit-${job._id}`}>
                            <FiEdit2 className="mr-1" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleToggleStatus(job)} data-testid={`job-toggle-status-${job._id}`}>
                            {isClosed(job) ? <><FiUnlock className="mr-1" />Reopen</> : <><FiLock className="mr-1" />Close</>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDeletingJob(job)} className="text-red-600 hover:text-red-700" data-testid={`job-delete-${job._id}`}>
                            <FiTrash2 className="mr-1" />Delete
                          </Button>
                          <Button size="sm" onClick={() => { setSelectedJob(job); fetchMatchedCandidates(job._id); }} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                            View Top 10 Matches
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <JobChips job={job} />
                      <p className="text-gray-700 mb-4 line-clamp-4">{job.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 flex items-center gap-1"><FiUsers /><strong>{job.applicants?.length || 0}</strong> applicants</p>
                        <Badge className={isClosed(job) ? 'bg-gray-500' : 'bg-green-500'}>{isClosed(job) ? 'Closed' : 'Open'}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {myJobs.length === 0 && (
                  <div className="text-center py-12 text-gray-500">You haven't posted any jobs yet</div>
                )}
              </div>

              {selectedJob && matchedCandidates.length > 0 && (
                <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Top 10 AI-Matched Candidates for {selectedJob.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {matchedCandidates.map((candidate, idx) => (
                        <Card key={candidate._id} className="border-2 border-gray-200">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-xl text-black">
                                    #{idx + 1}
                                  </div>
                                </div>
                                <Avatar className="w-16 h-16">
                                  <AvatarImage src={candidate.profilePic} />
                                  <AvatarFallback className="bg-gray-300 text-xl">{candidate.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-lg font-bold text-black">{candidate.name}</h3>
                                  <p className="text-sm text-gray-600">{candidate.email}</p>
                                  {candidate.resume?.parsedData?.experience?.years && (
                                    <p className="text-xs text-gray-500">{candidate.resume.parsedData.experience.years} years experience</p>
                                  )}
                                </div>
                              </div>
                              <div className={`${getMatchColor(candidate.matchScore)} text-white px-4 py-2 rounded-lg font-bold text-lg`}>
                                {candidate.matchScore}% Match
                              </div>
                            </div>
                            {candidate.matchedSkills?.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs text-gray-600 mb-2">Matched Skills:</p>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.matchedSkills.map((skill, idx) => (
                                    <Badge key={idx} className="bg-green-100 text-green-800">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={!!editingJob} onOpenChange={(o) => { if (!o) setEditingJob(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit job</DialogTitle>
            </DialogHeader>
            {editingJob && <JobForm key={editingJob._id} initial={formFromJob(editingJob)} submitLabel="Save changes" onSubmit={handleEditJob} />}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingJob} onOpenChange={(o) => { if (!o) setDeletingJob(null); }}>
          <AlertDialogContent>
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

        <Dialog open={!!detailJob} onOpenChange={(o) => { if (!o) closeJob(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="job-detail-dialog">
            {detailJob && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl pr-6">{detailJob.title}</DialogTitle>
                  <p className="text-gray-600">
                    {detailJob.company}
                    {detailJob.postedBy?.name ? <> · posted by {detailJob.postedBy.name}</> : null}
                  </p>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={isClosed(detailJob) ? 'bg-gray-500' : 'bg-green-500'}>{isClosed(detailJob) ? 'Closed' : 'Open'}</Badge>
                    {jobChips(detailJob).map((c) => <Badge key={c} variant="outline" className="text-gray-700">{c}</Badge>)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    {detailJob.location && <div className="flex items-center"><FiMapPin className="mr-2" />{detailJob.location}</div>}
                    {detailJob.salary && <div className="flex items-center"><FiDollarSign className="mr-2" />{detailJob.salary}</div>}
                    {detailJob.applyBy && <div className="flex items-center"><FiCalendar className="mr-2" />Apply by {new Date(detailJob.applyBy).toLocaleDateString()}</div>}
                    {detailJob.applicantCount !== undefined && <div className="flex items-center"><FiUsers className="mr-2" />{detailJob.applicantCount} applicant{detailJob.applicantCount === 1 ? '' : 's'}</div>}
                  </div>
                  {detailJob.skills?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {detailJob.skills.map((skill) => <Badge key={skill} className="bg-yellow-100 text-black hover:bg-yellow-100">{skill}</Badge>)}
                      </div>
                    </div>
                  )}
                  <p className="text-gray-700 whitespace-pre-line">{detailJob.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    {isMine(detailJob) ? (
                      <Button variant="outline" onClick={() => { const j = detailJob; closeJob(); setEditingJob(j); }}>
                        <FiEdit2 className="mr-2" />Edit job
                      </Button>
                    ) : isClosed(detailJob) ? (
                      <Button disabled className="bg-gray-200 text-gray-500">This job is closed</Button>
                    ) : detailJob.hasApplied || appliedJobIds.has(detailJob._id) ? (
                      <Button disabled className="bg-gray-200 text-gray-500"><FiCheckCircle className="mr-2" />Applied</Button>
                    ) : (
                      <Button onClick={() => handleApply(detailJob._id)} className="bg-black hover:bg-gray-900 text-white" data-testid="job-detail-apply">Apply Now</Button>
                    )}
                    <ShareMenu path={`/jobs?job=${detailJob._id}`} title={`${detailJob.title} at ${detailJob.company}`} align="start" testId="job-detail-share" />
                    {!isMine(detailJob) && idOf(detailJob.postedBy) && (
                      <Button variant="ghost" onClick={() => setReportJob(detailJob)} className="text-gray-600" data-testid="job-detail-report">
                        <FiFlag className="mr-2" />Report
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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