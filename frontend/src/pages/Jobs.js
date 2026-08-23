import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { FiUpload, FiBriefcase, FiMapPin, FiDollarSign, FiFileText, FiAward, FiZap, FiCheckCircle } from 'react-icons/fi';
import { API_URL } from '../config/api';

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
  const [formData, setFormData] = useState({ title: '', description: '', company: '', location: '', salary: '' });
  const { user } = useAuth();

  useEffect(() => {
    fetchJobs();
    fetchRecommendedJobs();
    fetchMyApplications();
    if (user?.role === 'recruiter') fetchMyPostedJobs();
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
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to apply');
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/jobs/create`, formData);
      toast.success('Job posted successfully!');
      setShowPostDialog(false);
      fetchJobs();
      fetchMyPostedJobs();
      setFormData({ title: '', description: '', company: '', location: '', salary: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post job');
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
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Job Portal</h1>
            <p className="text-gray-600">AI-powered job matching for professionals</p>
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
            {user?.role === 'recruiter' && (
              <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-black hover:bg-gray-900 text-white">Post Job</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Post a New Job</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePostJob} className="space-y-4 mt-4">
                    <div>
                      <Label>Job Title</Label>
                      <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Location</Label>
                        <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                      </div>
                      <div>
                        <Label>Salary</Label>
                        <Input value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} placeholder="$80k-100k" />
                      </div>
                    </div>
                    <div>
                      <Label>Job Description</Label>
                      <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="min-h-32" />
                    </div>
                    <Button type="submit" className="w-full bg-black text-white">Post Job</Button>
                  </form>
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
                    <p className="text-sm text-gray-600">AI-reviewed by Gemini</p>
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
            <TabsTrigger value="browse">Browse Jobs</TabsTrigger>
            <TabsTrigger value="recommended">Recommended ({recommendedJobs.length})</TabsTrigger>
            <TabsTrigger value="applied">My Applications ({myApplications.length})</TabsTrigger>
            {user?.role === 'recruiter' && <TabsTrigger value="posted">Posted Jobs ({myJobs.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <Card key={job._id} className="shadow-md hover:shadow-xl transition">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FiBriefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-black">{job.title}</h3>
                          <p className="text-sm text-gray-600">{job.company}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-white">Active</Badge>
                    </div>
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
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <FiAward className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-black">{job.title}</h3>
                          <p className="text-sm text-gray-600">{job.company}</p>
                        </div>
                      </div>
                      <div className={`${getMatchColor(job.matchScore)} text-white px-3 py-1 rounded-full font-bold text-sm`}>
                        {job.matchScore}% AI Match
                      </div>
                    </div>
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

          {user?.role === 'recruiter' && (
            <TabsContent value="posted">
              <div className="space-y-6">
                {myJobs.map((job) => (
                  <Card key={job._id} className="shadow-md">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          <p className="text-sm text-gray-600">{job.company}</p>
                        </div>
                        <Button onClick={() => { setSelectedJob(job); fetchMatchedCandidates(job._id); }} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                          View Top 10 Matches
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{job.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600"><strong>{job.applicants.length}</strong> applicants</p>
                        <Badge className={job.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>{job.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
      </div>
    </div>
  );
};

export default Jobs;