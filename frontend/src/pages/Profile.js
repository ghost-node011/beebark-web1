import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  FiEdit2, FiPlus, FiTrash2, FiBriefcase, FiImage, FiZap,
  FiEye, FiUsers, FiTarget, FiLayers, FiGlobe, FiCamera, FiHeart,
  FiMessageSquare, FiBookOpen, FiUpload
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { INTENTS, INDUSTRIES } from '../config/onboarding';
import ResumeImport from '../components/ResumeImport';
import { SuggestChip, useSuggestChip } from '../components/ai/SuggestChip';
import { StatCard, InfoBlock } from '../components/profile/ProfileWidgets';
import { ProfileHero, VisibilityPill, PillFilter, PAGE_BG } from '../components/profile/ProfileShell';

const ROLE_LABELS = {
  student: 'Student',
  professional: 'Professional',
  firm: 'Firm',
  recruiter: 'Recruiter',
  company: 'Firm'
};

const labelsFrom = (values, options) =>
  (values || []).map((v) => options.find((o) => o.value === v)?.label || v);

const emptyFormFromUser = (user) => ({
  name: user?.name || '',
  bio: user?.bio || '',
  pronouns: user?.pronouns || '',
  location: user?.location || '',
  profilePic: user?.profilePic || '',
  coverPhoto: user?.coverPhoto || '',
  skills: user?.skills || [],
  specialization: user?.specialization || [],
  projectTypeFocus: user?.projectTypeFocus || [],
  markets: user?.markets || [],
  experience: user?.experience || [],
  education: user?.education || [],
  analyticsPublic: user?.analyticsPublic || false,
  galleryPublic: user?.galleryPublic ?? true,
  activityPublic: user?.activityPublic || false
});

// Every profile section renders its view content by default; clicking the
// pencil swaps in editContent for that section only — the rest of the page
// stays read-only and unaffected.
const SectionCard = ({ title, icon: Icon, sectionKey, editingSection, onEditClick, onCancel, onSave, saving, editable = true, children, editContent, action }) => {
  const isEditing = editingSection === sectionKey;
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold text-slate-900 font-serif flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 shrink-0" />}{title}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {editable && (
            isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={onSave} disabled={saving} className="bg-black text-white hover:bg-gray-800">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            ) : (
              <button onClick={onEditClick} className="text-gray-400 hover:text-black p-1" aria-label={`Edit ${title}`}>
                <FiEdit2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
      {isEditing ? editContent : children}
    </Card>
  );
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState(emptyFormFromUser(null));
  const [editingSection, setEditingSection] = useState(null);
  const [saving, setSaving] = useState(false);

  const [newSkill, setNewSkill] = useState('');
  const [tagInputs, setTagInputs] = useState({ specialization: '', projectTypeFocus: '', markets: '' });
  const [newExperience, setNewExperience] = useState({ title: '', company: '', duration: '', description: '' });
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [newEducation, setNewEducation] = useState({ school: '', degree: '', field: '', duration: '', description: '' });
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [nameMismatch, setNameMismatch] = useState(null); // { detectedName, currentName }
  const [bioSuggestions, setBioSuggestions] = useState(null); // string[]
  const skillSuggest = useSuggestChip('skill');
  const specializationSuggest = useSuggestChip('specialization for a professional profile');
  const projectTypeSuggest = useSuggestChip('project type focus for a professional profile');
  const marketsSuggest = useSuggestChip('market / region a professional works in');
  const tagSuggesters = { specialization: specializationSuggest, projectTypeFocus: projectTypeSuggest, markets: marketsSuggest };
  const jobTitleSuggest = useSuggestChip('job title');
  const fieldOfStudySuggest = useSuggestChip('field of study');
  const [galleryPreview, setGalleryPreview] = useState({ items: [], count: 0, associatedProfessionals: [] });
  const [galleryCategory, setGalleryCategory] = useState('All');
  const [activity, setActivity] = useState([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    if (user) setFormData(emptyFormFromUser(user));
  }, [user]);

  const fetchGalleryPreview = useCallback(() => {
    if (!user?.username) return;
    axios.get(`${API_URL}/api/profile/public/${user.username}`)
      .then((res) => setGalleryPreview({
        items: res.data.portfolioPreview || [],
        count: res.data.portfolioCount || 0,
        associatedProfessionals: res.data.associatedProfessionals || []
      }))
      .catch(() => {});
  }, [user?.username]);

  useEffect(() => {
    fetchGalleryPreview();
    axios.get(`${API_URL}/api/profile/activity`)
      .then((res) => setActivity(res.data.posts || []))
      .catch(() => {});
  }, [fetchGalleryPreview]);

  // Shared by every section's Save button — sends the whole (already-synced)
  // formData object; the backend only applies the fields it recognizes.
  const saveSection = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/api/profile/update`, formData);
      setUser(response.data.user);
      setEditingSection(null);
      toast.success('Saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const cancelSection = () => {
    setFormData(emptyFormFromUser(user));
    setEditingSection(null);
  };

  const handleAvatarFile = async (file) => {
    setUploadingAvatar(true);
    const body = new FormData();
    body.append('image', file);
    try {
      const uploadRes = await axios.post(`${API_URL}/api/upload/profile-photo`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const response = await axios.put(`${API_URL}/api/profile/update`, { profilePic: uploadRes.data.url });
      setUser(response.data.user);
      toast.success('Profile photo updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverPhotoFile = async (file) => {
    setUploadingCover(true);
    const body = new FormData();
    body.append('image', file);
    try {
      const uploadRes = await axios.post(`${API_URL}/api/upload/image`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const response = await axios.put(`${API_URL}/api/profile/update`, { coverPhoto: uploadRes.data.url });
      setUser(response.data.user);
      toast.success('Cover photo updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload cover photo');
    } finally {
      setUploadingCover(false);
    }
  };

  // Shared by the Analytics / Work Gallery / Activity visibility pills —
  // `field` is one of analyticsPublic / galleryPublic / activityPublic.
  const handleVisibilityToggle = async (field, checked) => {
    setFormData((f) => ({ ...f, [field]: checked }));
    try {
      const response = await axios.put(`${API_URL}/api/profile/update`, { [field]: checked });
      setUser(response.data.user);
    } catch (error) {
      toast.error('Failed to update privacy setting');
    }
  };

  const handleGalleryFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const uploadBody = new FormData();
      files.forEach((f) => uploadBody.append('images', f));
      const uploadRes = await axios.post(`${API_URL}/api/upload/multiple`, uploadBody, { headers: { 'Content-Type': 'multipart/form-data' } });
      const urls = (uploadRes.data.images || []).map((img) => img.url);
      const draftRes = await axios.post(`${API_URL}/api/portfolio/auto-generate`, { images: urls });
      const drafts = draftRes.data.drafts || [];
      const workDrafts = drafts.filter((d) => d.isWorkPhoto);
      const skipped = drafts.length - workDrafts.length;
      if (workDrafts.length > 0) {
        await axios.post(`${API_URL}/api/portfolio/items/bulk`, {
          items: workDrafts.map((d) => ({ title: d.title, description: d.description, images: [d.imageUrl], tags: d.tags, category: d.category }))
        });
        toast.success(`Added ${workDrafts.length} to your Work Gallery — refine details anytime in Portfolio`);
        fetchGalleryPreview();
      }
      if (skipped > 0) toast(`${skipped} photo${skipped > 1 ? 's' : ''} skipped — didn't look like work photos`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add photos');
    } finally {
      setUploadingGallery(false);
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
    } else {
      toast.error('Please fill in title and company');
    }
  };

  const handleRemoveExperience = (index) => {
    setFormData({ ...formData, experience: formData.experience.filter((_, i) => i !== index) });
  };

  const handleAddEducation = () => {
    if (newEducation.school && newEducation.degree) {
      setFormData({ ...formData, education: [...formData.education, { ...newEducation }] });
      setNewEducation({ school: '', degree: '', field: '', duration: '', description: '' });
      setShowAddEducation(false);
    } else {
      toast.error('Please fill in school and degree');
    }
  };

  const handleRemoveEducation = (index) => {
    setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
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
  const galleryCategories = [...new Set(galleryPreview.items.map((i) => i.category).filter(Boolean))];
  const visibleGalleryItems = galleryCategory === 'All' ? galleryPreview.items : galleryPreview.items.filter((i) => i.category === galleryCategory);

  const edit = (key) => setEditingSection(key);

  return (
    <div className={`min-h-screen ${PAGE_BG}`} data-testid="profile-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <ProfileHero
            coverPhoto={formData.coverPhoto}
            profilePic={formData.profilePic}
            name={user?.name}
            roleLabel={roleLabel}
            subtitle={user?.email}
            pronouns={formData.pronouns}
            location={formData.location}
            connectionCount={user?.connections?.length || 0}
            onPhotoEdit={uploadingAvatar ? undefined : handleAvatarFile}
            actions={
              <Button onClick={() => edit('header')} variant="outline" data-testid="edit-header-button">
                <FiEdit2 className="mr-2 w-4 h-4" /> Edit
              </Button>
            }
            headerExtra={
              <label className="absolute bottom-3 right-3 cursor-pointer" data-testid="cover-photo-upload">
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleCoverPhotoFile(e.target.files[0])} className="hidden" disabled={uploadingCover} />
                <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 transition">
                  <FiCamera className="w-3.5 h-3.5" />{uploadingCover ? 'Uploading...' : 'Change cover'}
                </span>
              </label>
            }
          />

          {editingSection === 'header' && (
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="name-input" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" data-testid="location-input" />
              </div>
              <div className="space-y-2">
                <Label>Pronouns</Label>
                <Input
                  value={formData.pronouns}
                  onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                  placeholder="e.g. he/him"
                  list="pronoun-suggestions"
                  data-testid="pronouns-input"
                />
                <datalist id="pronoun-suggestions">
                  <option value="he/him" />
                  <option value="she/her" />
                  <option value="they/them" />
                </datalist>
                <p className="text-xs text-gray-400">Shown next to your name — leave blank to hide it.</p>
              </div>
              <p className="text-xs text-gray-400 -mt-2">Use the camera icon on your profile photo to change it.</p>
              <div className="flex gap-2">
                <Button onClick={cancelSection} variant="outline">Cancel</Button>
                <Button onClick={saveSection} disabled={saving} className="bg-black text-white hover:bg-gray-800">{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </Card>
          )}

          <div id="section-overview" className="space-y-6 scroll-mt-24">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 font-serif">Analytics</h3>
                  <VisibilityPill isPublic={formData.analyticsPublic} editable onToggle={(v) => handleVisibilityToggle('analyticsPublic', v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard icon={FiEye} value={user?.profileViews ?? 0} label="Profile Views" />
                  <StatCard icon={FiUsers} value={user?.connections?.length || 0} label="Connections" />
                  <StatCard icon={FiImage} value={galleryPreview.count} label="Work Gallery Entries" />
                </div>
                <p className="text-xs text-slate-400 mt-3">Private by default — only visible to you until you switch it to Public above.</p>
              </Card>

              <SectionCard
                title="About" sectionKey="about" editingSection={editingSection}
                onEditClick={() => edit('about')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." className="min-h-24" data-testid="bio-input" />
                }
              >
                <p className="text-slate-700 whitespace-pre-line">{formData.bio || 'No bio yet'}</p>
              </SectionCard>

              <SectionCard
                title="Professional Identity" sectionKey="identity" editingSection={editingSection}
                onEditClick={() => edit('identity')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-4">
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
                            onBlur={(e) => tagSuggesters[field].check(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(field))}
                            placeholder={placeholder}
                          />
                          <Button onClick={() => addTag(field)} type="button" className="bg-yellow-500 hover:bg-yellow-600 shrink-0">Add</Button>
                        </div>
                        <SuggestChip
                          suggestion={tagSuggesters[field].suggestion}
                          onAccept={(corrected) => { setTagInputs((t) => ({ ...t, [field]: corrected })); tagSuggesters[field].dismiss(); }}
                          onAcceptAlternative={(alt) => { if (!formData[field].includes(alt)) setFormData((f) => ({ ...f, [field]: [...f[field], alt] })); }}
                          onDismiss={tagSuggesters[field].dismiss}
                        />
                        <div className="flex flex-wrap gap-2">
                          {formData[field].map((v, idx) => (
                            <Badge key={idx} className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => removeTag(field, v)}>{v} ×</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                {(formData.specialization.length > 0 || formData.projectTypeFocus.length > 0 || formData.markets.length > 0) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoBlock icon={FiTarget} label="Specialization" values={formData.specialization} />
                    <InfoBlock icon={FiLayers} label="Project Type Focus" values={formData.projectTypeFocus} />
                    <InfoBlock icon={FiGlobe} label="Markets" values={formData.markets} />
                  </div>
                ) : <p className="text-slate-500">Nothing added yet</p>}
              </SectionCard>

              {industryLabels.length > 0 && (
                <SectionCard title="Industry" sectionKey="industry-noop" editingSection={editingSection} editable={false}>
                  <div className="flex flex-wrap gap-2">
                    {industryLabels.map((l) => <Badge key={l} className="bg-slate-900 text-yellow-400">{l}</Badge>)}
                  </div>
                </SectionCard>
              )}

              {intentLabels.length > 0 && (
                <SectionCard title="Goals" sectionKey="goals-noop" editingSection={editingSection} editable={false}>
                  <div className="flex flex-wrap gap-2">
                    {intentLabels.map((l) => <Badge key={l} variant="outline" className="border-slate-300 text-slate-700">{l}</Badge>)}
                  </div>
                </SectionCard>
              )}

              <SectionCard
                title="Skills" sectionKey="skills" editingSection={editingSection}
                onEditClick={() => edit('skills')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-3">
                    <ResumeImport onImported={handleResumeImported} />
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onBlur={(e) => skillSuggest.check(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        placeholder="Add a skill"
                        data-testid="skill-input"
                      />
                      <Button onClick={handleAddSkill} type="button" className="bg-yellow-500 hover:bg-yellow-600 shrink-0" data-testid="add-skill-button">Add</Button>
                    </div>
                    <SuggestChip
                      suggestion={skillSuggest.suggestion}
                      onAccept={(corrected) => { setNewSkill(corrected); skillSuggest.dismiss(); }}
                      onAcceptAlternative={(alt) => { if (!formData.skills.includes(alt)) setFormData((f) => ({ ...f, skills: [...f.skills, alt] })); }}
                      onDismiss={skillSuggest.dismiss}
                    />
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, idx) => (
                        <Badge key={idx} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer" onClick={() => handleRemoveSkill(skill)}>{skill} ×</Badge>
                      ))}
                    </div>
                  </div>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {formData.skills.length > 0 ? (
                    formData.skills.map((skill, idx) => <Badge key={idx} className="bg-yellow-500 text-gray-900">{skill}</Badge>)
                  ) : <p className="text-slate-500">No skills added yet</p>}
                </div>
              </SectionCard>
          </div>

          <div id="section-portfolio" className="space-y-6 scroll-mt-24">
            <SectionCard
              title="Work Gallery" sectionKey="gallery-noop" editingSection={editingSection} editable={false}
              action={
                <>
                  <VisibilityPill isPublic={formData.galleryPublic} editable onToggle={(v) => handleVisibilityToggle('galleryPublic', v)} />
                  <Link to="/portfolio" className="text-sm font-medium text-black hover:underline hidden sm:inline">Full Portfolio →</Link>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleGalleryFiles(e.target.files)} className="hidden" disabled={uploadingGallery} />
                    <span className="flex items-center gap-1.5 text-sm font-medium bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg px-3 py-1.5 transition">
                      <FiUpload className="w-3.5 h-3.5" />{uploadingGallery ? 'Adding...' : 'Add Photos'}
                    </span>
                  </label>
                </>
              }
            >
              {galleryCategories.length > 0 && (
                <div className="mb-3">
                  <PillFilter options={['All', ...galleryCategories]} active={galleryCategory} onChange={setGalleryCategory} />
                </div>
              )}
              {visibleGalleryItems.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {visibleGalleryItems.map((item) => (
                    <Link key={item._id} to="/portfolio" className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square group">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2 text-center">{item.title}</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end p-2 opacity-0 group-hover:opacity-100">
                        <p className="text-white text-xs font-medium truncate">{item.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Nothing here yet — add your first work photo above</p>
              )}
            </SectionCard>
          </div>

          <div id="section-experience" className="space-y-6 scroll-mt-24">
              <SectionCard
                title="Experience" sectionKey="experience" editingSection={editingSection} icon={FiBriefcase}
                onEditClick={() => edit('experience')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-3">
                    <Button onClick={() => setShowAddExperience(!showAddExperience)} className="bg-yellow-500 hover:bg-yellow-600" size="sm" type="button">
                      <FiPlus className="mr-1" /> Add
                    </Button>
                    {showAddExperience && (
                      <Card className="p-4 bg-slate-50">
                        <div className="space-y-3">
                          <Input
                            placeholder="Job Title"
                            value={newExperience.title}
                            onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                            onBlur={(e) => jobTitleSuggest.check(e.target.value)}
                          />
                          <SuggestChip
                            suggestion={jobTitleSuggest.suggestion}
                            onAccept={(corrected) => { setNewExperience((f) => ({ ...f, title: corrected })); jobTitleSuggest.dismiss(); }}
                            onAcceptAlternative={(alt) => setNewExperience((f) => ({ ...f, title: alt }))}
                            onDismiss={jobTitleSuggest.dismiss}
                          />
                          <Input placeholder="Company" value={newExperience.company} onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })} />
                          <Input placeholder="Duration (e.g., Jan 2020 - Present)" value={newExperience.duration} onChange={(e) => setNewExperience({ ...newExperience, duration: e.target.value })} />
                          <Textarea placeholder="Description" value={newExperience.description} onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })} rows={3} />
                          <div className="flex gap-2">
                            <Button onClick={handleAddExperience} type="button" className="bg-yellow-500 hover:bg-yellow-600">Save Experience</Button>
                            <Button onClick={() => setShowAddExperience(false)} type="button" variant="outline">Cancel</Button>
                          </div>
                        </div>
                      </Card>
                    )}
                    <div className="space-y-3">
                      {formData.experience.map((exp, idx) => (
                        <Card key={idx} className="p-4 relative">
                          <Button onClick={() => handleRemoveExperience(idx)} type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50">
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
                }
              >
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
                ) : <p className="text-slate-500">No experience added yet</p>}
              </SectionCard>

              <SectionCard
                title="Education" sectionKey="education" editingSection={editingSection} icon={FiBookOpen}
                onEditClick={() => edit('education')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-3">
                    <Button onClick={() => setShowAddEducation(!showAddEducation)} className="bg-yellow-500 hover:bg-yellow-600" size="sm" type="button">
                      <FiPlus className="mr-1" /> Add
                    </Button>
                    {showAddEducation && (
                      <Card className="p-4 bg-slate-50">
                        <div className="space-y-3">
                          <Input placeholder="School / Institution" value={newEducation.school} onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })} />
                          <Input placeholder="Degree (e.g. B.Arch)" value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} />
                          <Input
                            placeholder="Field of Study"
                            value={newEducation.field}
                            onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                            onBlur={(e) => fieldOfStudySuggest.check(e.target.value)}
                          />
                          <SuggestChip
                            suggestion={fieldOfStudySuggest.suggestion}
                            onAccept={(corrected) => { setNewEducation((f) => ({ ...f, field: corrected })); fieldOfStudySuggest.dismiss(); }}
                            onAcceptAlternative={(alt) => setNewEducation((f) => ({ ...f, field: alt }))}
                            onDismiss={fieldOfStudySuggest.dismiss}
                          />
                          <Input placeholder="Duration (e.g. 2016 - 2020)" value={newEducation.duration} onChange={(e) => setNewEducation({ ...newEducation, duration: e.target.value })} />
                          <Textarea placeholder="Description (optional)" value={newEducation.description} onChange={(e) => setNewEducation({ ...newEducation, description: e.target.value })} rows={2} />
                          <div className="flex gap-2">
                            <Button onClick={handleAddEducation} type="button" className="bg-yellow-500 hover:bg-yellow-600">Save</Button>
                            <Button onClick={() => setShowAddEducation(false)} type="button" variant="outline">Cancel</Button>
                          </div>
                        </div>
                      </Card>
                    )}
                    <div className="space-y-3">
                      {formData.education.map((edu, idx) => (
                        <Card key={idx} className="p-4 relative">
                          <Button onClick={() => handleRemoveEducation(idx)} type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <FiTrash2 />
                          </Button>
                          <div className="pr-10">
                            <h4 className="font-semibold text-gray-900">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</h4>
                            <p className="text-gray-700">{edu.school}</p>
                            <p className="text-sm text-gray-500">{edu.duration}</p>
                            {edu.description && <p className="text-sm text-gray-600 mt-2">{edu.description}</p>}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                }
              >
                {formData.education.length > 0 ? (
                  <div className="space-y-4">
                    {formData.education.map((edu, idx) => (
                      <Card key={idx} className="p-4 border-l-4 border-yellow-500">
                        <h4 className="font-semibold text-gray-900">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</h4>
                        <p className="text-gray-700 font-medium">{edu.school}</p>
                        <p className="text-sm text-gray-500">{edu.duration}</p>
                        {edu.description && <p className="text-sm text-gray-600 mt-2">{edu.description}</p>}
                      </Card>
                    ))}
                  </div>
                ) : <p className="text-slate-500">No education added yet</p>}
              </SectionCard>
          </div>

          <div id="section-activity" className="space-y-6 scroll-mt-24">
              <SectionCard
                title="Recent Activity" sectionKey="activity-noop" editingSection={editingSection} editable={false}
                action={<VisibilityPill isPublic={formData.activityPublic} editable onToggle={(v) => handleVisibilityToggle('activityPublic', v)} />}
              >
                {activity.length > 0 ? (
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
                ) : <p className="text-slate-500">No activity yet.</p>}
              </SectionCard>

              {galleryPreview.associatedProfessionals.length > 0 && (
                <SectionCard title="Associated Professionals" sectionKey="assoc-noop" editingSection={editingSection} editable={false}>
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
                </SectionCard>
              )}
          </div>
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
