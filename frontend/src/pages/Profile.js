import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  FiEdit2, FiSave, FiPlus, FiTrash2, FiBriefcase, FiMapPin, FiImage, FiZap,
  FiEye, FiUsers, FiTarget, FiLayers, FiGlobe, FiCamera, FiHeart, FiMessageSquare
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { INTENTS, INDUSTRIES } from '../config/onboarding';
import ImageUpload from '../components/ImageUpload';
import ResumeImport from '../components/ResumeImport';
import { SuggestChip, useSuggestChip } from '../components/ai/SuggestChip';
import { StatCard, InfoBlock } from '../components/profile/ProfileWidgets';

const ROLE_LABELS = {
  student: 'Student',
  professional: 'Professional',
  firm: 'Firm',
  recruiter: 'Recruiter',
  company: 'Firm'
};

const labelsFrom = (values, options) =>
  (values || []).map((v) => options.find((o) => o.value === v)?.label || v);

const Profile = () => {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    profilePic: '',
    coverPhoto: '',
    skills: [],
    specialization: [],
    projectTypeFocus: [],
    markets: [],
    experience: [],
    analyticsPublic: false
  });
  const [newSkill, setNewSkill] = useState('');
  const [tagInputs, setTagInputs] = useState({ specialization: '', projectTypeFocus: '', markets: '' });
  const [newExperience, setNewExperience] = useState({ title: '', company: '', duration: '', description: '' });
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameMismatch, setNameMismatch] = useState(null); // { detectedName, currentName }
  const [bioSuggestions, setBioSuggestions] = useState(null); // string[]
  const skillSuggest = useSuggestChip('skill');
  const [galleryPreview, setGalleryPreview] = useState({ items: [], count: 0, associatedProfessionals: [] });
  const [activity, setActivity] = useState([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        profilePic: user.profilePic || '',
        coverPhoto: user.coverPhoto || '',
        skills: user.skills || [],
        specialization: user.specialization || [],
        projectTypeFocus: user.projectTypeFocus || [],
        markets: user.markets || [],
        experience: user.experience || [],
        analyticsPublic: user.analyticsPublic || false
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user?.username) return;
    axios.get(`${API_URL}/api/profile/public/${user.username}`)
      .then((res) => setGalleryPreview({
        items: res.data.portfolioPreview || [],
        count: res.data.portfolioCount || 0,
        associatedProfessionals: res.data.associatedProfessionals || []
      }))
      .catch(() => {});
    axios.get(`${API_URL}/api/profile/activity`)
      .then((res) => setActivity(res.data.posts || []))
      .catch(() => {});
  }, [user?.username]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_URL}/api/profile/update`, formData);
      setUser(response.data.user);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverPhotoFile = async (file) => {
    setUploadingCover(true);
    const body = new FormData();
    body.append('image', file);
    try {
      const response = await axios.post(`${API_URL}/api/upload/image`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData((f) => ({ ...f, coverPhoto: response.data.url }));
      toast.success('Cover photo updated — Save to keep it');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload cover photo');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const addTag = (field) => {
    const value = tagInputs[field].trim();
    if (value && !formData[field].includes(value)) {
      setFormData((f) => ({ ...f, [field]: [...f[field], value] }));
    }
    setTagInputs((t) => ({ ...t, [field]: '' }));
  };

  const removeTag = (field, value) => {
    setFormData((f) => ({ ...f, [field]: f[field].filter((v) => v !== value) }));
  };

  const handleAddExperience = () => {
    if (newExperience.title && newExperience.company) {
      setFormData({ ...formData, experience: [...formData.experience, { ...newExperience }] });
      setNewExperience({ title: '', company: '', duration: '', description: '' });
      setShowAddExperience(false);
      toast.success('Experience added');
    } else {
      toast.error('Please fill in title and company');
    }
  };

  const handleRemoveExperience = (index) => {
    setFormData({ ...formData, experience: formData.experience.filter((_, i) => i !== index) });
  };

  const handleResumeImported = (data) => {
    if (Array.isArray(data?.skills)) setFormData((f) => ({ ...f, skills: data.skills }));
    if (data?.bios?.length > 0) {
      setFormData((f) => ({ ...f, bio: data.bios[0] })); // auto-fill with the first suggestion
      setBioSuggestions(data.bios);
    }
    if (data?.nameMismatch && data?.detectedName) {
      setNameMismatch({ detectedName: data.detectedName, currentName: data.currentName });
    }
    // Backend may have auto-filled intent/industries too — refresh context so read-view badges update
    axios.get(`${API_URL}/api/profile/me`).then((res) => setUser(res.data.user)).catch(() => {});
  };

  const confirmNameChange = async (useResumeName) => {
    if (useResumeName && nameMismatch) {
      try {
        const response = await axios.put(`${API_URL}/api/profile/update`, { name: nameMismatch.detectedName });
        setUser(response.data.user);
        setFormData((f) => ({ ...f, name: nameMismatch.detectedName }));
        toast.success('Name updated everywhere on your account');
      } catch (error) {
        toast.error('Could not update your name');
      }
    }
    setNameMismatch(null);
  };

  const chooseBio = (bio) => {
    setFormData((f) => ({ ...f, bio }));
    setBioSuggestions(null);
  };

  const roleLabel = ROLE_LABELS[user?.role] || 'Professional';
  const industryLabels = labelsFrom(user?.industries, INDUSTRIES);
  const intentLabels = labelsFrom(user?.intent, INTENTS);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="profile-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div
              className="h-40 sm:h-56 bg-gradient-to-br from-yellow-400 to-amber-500 relative"
              style={formData.coverPhoto ? { backgroundImage: `url(${formData.coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {editing && (
                <label className="absolute bottom-3 right-3 cursor-pointer" data-testid="cover-photo-upload">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleCoverPhotoFile(e.target.files[0])} className="hidden" disabled={uploadingCover} />
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 transition">
                    <FiCamera className="w-3.5 h-3.5" />{uploadingCover ? 'Uploading...' : 'Change cover'}
                  </span>
                </label>
              )}
            </div>
            <div className="px-6 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14 justify-between">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-lg shrink-0">
                    <AvatarImage src={formData.profilePic} />
                    <AvatarFallback className="bg-yellow-400 text-black text-2xl font-bold">
                      {(formData.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 sm:pb-1">
                    <CardTitle className="text-xl sm:text-2xl font-bold truncate text-black">{user?.name}</CardTitle>
                    <p className="text-gray-500 text-sm break-all">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-gray-900 text-yellow-400 capitalize">{roleLabel}</Badge>
                      {user?.username && (
                        <Link to={`/portfolio/${user.username}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 hover:underline">
                          <FiImage className="w-3.5 h-3.5" />View my portfolio
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => (editing ? handleSave() : setEditing(true))}
                  className="bg-gray-900 text-yellow-400 hover:bg-gray-800 sm:mb-1 shrink-0"
                  disabled={loading}
                  data-testid="edit-profile-button"
                >
                  {editing ? <><FiSave className="mr-2" /> Save</> : <><FiEdit2 className="mr-2" /> Edit Profile</>}
                </Button>
              </div>
            </div>

            <CardContent className="mt-4 space-y-6">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border-slate-300" data-testid="name-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" className="border-slate-300" data-testid="location-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile photo</Label>
                    {formData.profilePic ? (
                      <div className="flex items-center gap-4">
                        <img src={formData.profilePic} alt="Profile" className="h-20 w-20 rounded-full object-cover border" />
                        <button type="button" onClick={() => setFormData({ ...formData, profilePic: '' })} className="text-sm text-gray-500 hover:text-black">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <ImageUpload onUploadComplete={(url) => setFormData((f) => ({ ...f, profilePic: url }))} endpoint="/api/upload/profile-photo" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." className="min-h-24 border-slate-300" data-testid="bio-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <ResumeImport onImported={handleResumeImported} />
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onBlur={(e) => skillSuggest.check(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        placeholder="Add a skill"
                        className="border-slate-300"
                        data-testid="skill-input"
                      />
                      <Button onClick={handleAddSkill} type="button" className="bg-yellow-500 hover:bg-yellow-600 shrink-0" data-testid="add-skill-button">Add</Button>
                    </div>
                    <SuggestChip
                      suggestion={skillSuggest.suggestion}
                      onAccept={(corrected) => { setNewSkill(corrected); skillSuggest.dismiss(); }}
                      onAcceptAlternative={(alt) => {
                        if (!formData.skills.includes(alt)) setFormData((f) => ({ ...f, skills: [...f.skills, alt] }));
                      }}
                      onDismiss={skillSuggest.dismiss}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.skills.map((skill, idx) => (
                        <Badge key={idx} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer" onClick={() => handleRemoveSkill(skill)}>
                          {skill} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Professional Identity</Label>
                    {[
                      { field: 'specialization', label: 'Specialization', placeholder: 'e.g. Sustainable Urban Design' },
                      { field: 'projectTypeFocus', label: 'Project Type Focus', placeholder: 'e.g. Mixed-Use, High-Rise Residential' },
                      { field: 'markets', label: 'Markets', placeholder: 'e.g. Mumbai, Pune' }
                    ].map(({ field, label, placeholder }) => (
                      <div key={field} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={tagInputs[field]}
                            onChange={(e) => setTagInputs((t) => ({ ...t, [field]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(field))}
                            placeholder={placeholder}
                            className="border-slate-300"
                          />
                          <Button onClick={() => addTag(field)} type="button" className="bg-yellow-500 hover:bg-yellow-600 shrink-0">Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData[field].map((v, idx) => (
                            <Badge key={idx} className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => removeTag(field, v)}>
                              {v} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Experience</Label>
                      <Button onClick={() => setShowAddExperience(!showAddExperience)} className="bg-yellow-500 hover:bg-yellow-600" size="sm">
                        <FiPlus className="mr-1" /> Add
                      </Button>
                    </div>
                    {showAddExperience && (
                      <Card className="p-4 bg-slate-50">
                        <div className="space-y-3">
                          <Input placeholder="Job Title" value={newExperience.title} onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })} />
                          <Input placeholder="Company" value={newExperience.company} onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })} />
                          <Input placeholder="Duration (e.g., Jan 2020 - Present)" value={newExperience.duration} onChange={(e) => setNewExperience({ ...newExperience, duration: e.target.value })} />
                          <Textarea placeholder="Description" value={newExperience.description} onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })} rows={3} />
                          <div className="flex gap-2">
                            <Button onClick={handleAddExperience} className="bg-yellow-500 hover:bg-yellow-600">Save Experience</Button>
                            <Button onClick={() => setShowAddExperience(false)} variant="outline">Cancel</Button>
                          </div>
                        </div>
                      </Card>
                    )}
                    <div className="space-y-3">
                      {formData.experience.map((exp, idx) => (
                        <Card key={idx} className="p-4 relative">
                          <Button onClick={() => handleRemoveExperience(idx)} variant="ghost" size="sm" className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <FiTrash2 />
                          </Button>
                          <div className="pr-10">
                            <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                            <p className="text-gray-700">{exp.company}</p>
                            <p className="text-sm text-gray-500">{exp.duration}</p>
                            {exp.description && <p className="text-sm text-gray-600 mt-2">{exp.description}</p>}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-5">
                    <Label className="text-lg font-semibold">Privacy</Label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.analyticsPublic}
                        onChange={(e) => setFormData({ ...formData, analyticsPublic: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        data-testid="analytics-public-toggle"
                      />
                      <span className="text-sm text-slate-700">
                        Show my analytics (profile views, gallery entries) on my public profile
                        <span className="block text-xs text-slate-400">Off by default — only you can see them until you turn this on</span>
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard icon={FiEye} value={user?.profileViews ?? 0} label="Profile Views" />
                    <StatCard icon={FiUsers} value={user?.connections?.length || 0} label="Connections" />
                    <StatCard icon={FiImage} value={galleryPreview.count} label="Work Gallery Entries" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">About</h3>
                    <p className="text-slate-700">{formData.bio || 'No bio yet'}</p>
                  </div>

                  {(formData.specialization.length > 0 || formData.projectTypeFocus.length > 0 || formData.markets.length > 0) && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Professional Identity</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoBlock icon={FiTarget} label="Specialization" values={formData.specialization} />
                        <InfoBlock icon={FiLayers} label="Project Type Focus" values={formData.projectTypeFocus} />
                        <InfoBlock icon={FiGlobe} label="Markets" values={formData.markets} />
                      </div>
                    </div>
                  )}

                  {user?.location && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
                        <FiMapPin className="mr-2" /> Location
                      </h3>
                      <p className="text-slate-700">{user.location}</p>
                    </div>
                  )}

                  {industryLabels.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Industry</h3>
                      <div className="flex flex-wrap gap-2">
                        {industryLabels.map((l) => (
                          <Badge key={l} className="bg-slate-900 text-yellow-400">{l}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {intentLabels.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Goals</h3>
                      <div className="flex flex-wrap gap-2">
                        {intentLabels.map((l) => (
                          <Badge key={l} variant="outline" className="border-slate-300 text-slate-700">{l}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.length > 0 ? (
                        formData.skills.map((skill, idx) => (
                          <Badge key={idx} className="bg-yellow-500 text-gray-900">{skill}</Badge>
                        ))
                      ) : (
                        <p className="text-slate-500">No skills added yet</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 flex items-center"><FiImage className="mr-2" />Work Gallery</h3>
                      <Link to="/portfolio" className="text-sm font-medium text-black hover:underline">Manage in Portfolio →</Link>
                    </div>
                    {galleryPreview.items.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {galleryPreview.items.map((item) => (
                          <div key={item._id} className="rounded-lg overflow-hidden bg-gray-100 aspect-square">
                            {item.images?.[0] ? (
                              <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2 text-center">{item.title}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">Nothing here yet — add work photos or let AI draft entries for you in Portfolio</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                      <FiBriefcase className="mr-2" /> Experience
                    </h3>
                    {formData.experience.length > 0 ? (
                      <div className="space-y-4">
                        {formData.experience.map((exp, idx) => (
                          <Card key={idx} className="p-4 border-l-4 border-yellow-500">
                            <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                            <p className="text-gray-700 font-medium">{exp.company}</p>
                            <p className="text-sm text-gray-500">{exp.duration}</p>
                            {exp.description && <p className="text-sm text-gray-600 mt-2">{exp.description}</p>}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">No experience added yet</p>
                    )}
                  </div>

                  {galleryPreview.associatedProfessionals.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Associated Professionals</h3>
                      <div className="flex gap-4 overflow-x-auto pb-1">
                        {galleryPreview.associatedProfessionals.map((p) => (
                          <Link key={p._id} to={`/profile/${p.username}`} className="flex flex-col items-center text-center w-20 shrink-0 hover:opacity-80">
                            <Avatar className="w-14 h-14">
                              <AvatarImage src={p.profilePic} />
                              <AvatarFallback className="bg-gray-200 text-black font-semibold">{p.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-black mt-1 truncate w-full">{p.name}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {activity.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Recent Activity</h3>
                      <div className="space-y-3">
                        {activity.map((post) => (
                          <Card key={post._id} className="p-4">
                            <p className="text-gray-800 text-sm">{post.content}</p>
                            {post.mediaUrl && <img src={post.mediaUrl} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />}
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><FiHeart className="w-3.5 h-3.5" />{post.likeCount}</span>
                              <span className="flex items-center gap-1"><FiMessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!nameMismatch} onOpenChange={(open) => !open && confirmNameChange(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Name doesn't match</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Your résumé says <span className="font-semibold text-black">{nameMismatch?.detectedName}</span>, but
            your account name is <span className="font-semibold text-black">{nameMismatch?.currentName}</span>.
            Update your name everywhere on BeeBark to match your résumé?
          </p>
          <div className="flex gap-2 mt-2">
            <Button onClick={() => confirmNameChange(true)} className="flex-1 bg-black text-white">
              Yes, update to {nameMismatch?.detectedName}
            </Button>
            <Button onClick={() => confirmNameChange(false)} variant="outline" className="flex-1">Keep current name</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bioSuggestions} onOpenChange={(open) => !open && setBioSuggestions(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FiZap className="text-yellow-500" />Pick a bio</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Generated from your résumé — we've filled in the first one, pick a different one if you'd rather.</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bioSuggestions?.map((bio, i) => (
              <button
                key={i}
                type="button"
                onClick={() => chooseBio(bio)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm transition ${formData.bio === bio ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {bio}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
