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
  FiEye, FiUsers, FiTarget, FiLayers, FiGlobe, FiCamera,
  FiMessageSquare, FiBookOpen, FiUpload, FiFileText, FiExternalLink,
  FiGlobe as FiLanguage, FiHome, FiCheckCircle, FiX, FiShare2, FiBookmark, FiCalendar, FiLink
} from 'react-icons/fi';
import { FaLinkedin } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { INTENTS, INDUSTRIES, intentsFor } from '../config/onboarding';
import ResumeImport from '../components/ResumeImport';
import { SuggestChip, useSuggestChip } from '../components/ai/SuggestChip';
import { InfoBlock } from '../components/profile/ProfileWidgets';
import { ProfileHero, ProfileTabs, VisibilityPill, PillFilter, PAGE_BG, SOCIAL } from '../components/profile/ProfileShell';
import ShareMenu from '../components/ShareMenu';
import { sortExperience, AvailabilityChips, LanguagesList, BusinessDetails, PeopleGrid, AnalyticsCards, ProjectGrid, ExperienceCard, ListingCards, JobRows, ContactInfoDialog, ActivityCards, ReadMore } from '../components/profile/ProfileSections';
import { heroBtn } from '../components/profile/ProfileShell';
import { Switch } from '../components/ui/switch';
import { AutocompleteInput, LocationInput } from '../components/AutocompleteInput';
import { AVAILABILITY_LABELS, PROFICIENCY, EMPLOYMENT_TYPES, BUSINESS_TYPES, TEAM_SIZES } from '../config/profileOptions';
import { personHeadline } from '../utils/personHeadline';

const ROLE_LABELS = {
  student: 'Student',
  professional: 'Professional',
  firm: 'Firm',
  recruiter: 'Recruiter',
  company: 'Firm'
};

const labelsFrom = (values, options) =>
  (values || []).map((v) => options.find((o) => o.value === v)?.label || v);

const EMPTY_BUSINESS = { name: '', type: '', website: '', founded: '', teamSize: '', services: [], address: '', about: '' };
const EMPTY_EXPERIENCE = { title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' };
const EMPTY_EDUCATION = { school: '', degree: '', field: '', duration: '', description: '' };
const selectClass = 'w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400';

const weekTrend = (pct) => (pct === undefined ? '' : pct > 0 ? `+${pct}% this week` : pct < 0 ? `${pct}% this week` : 'Same as last week');

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
  intent: user?.intent || [],
  industries: user?.industries || [],
  languages: user?.languages || [],
  availability: user?.availability || [],
  business: { ...EMPTY_BUSINESS, ...(user?.business || {}) },
  associatedProfessionals: user?.associatedProfessionals || [],
  headline: user?.headline || '',
  contact: { email: '', phone: '', whatsapp: '', website: '', address: '', visibility: 'connections', ...(user?.contact || {}) },
  socialLinks: user?.socialLinks || [],
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
    <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm">
      <div className="flex items-center justify-between mb-5 gap-3">
        <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif flex items-center gap-2">
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
  // Experience / education being added (index -1) or edited (index >= 0)
  const [expDraft, setExpDraft] = useState(null); // { index, ...fields }
  const [eduDraft, setEduDraft] = useState(null);
  const [langDraft, setLangDraft] = useState({ name: '', proficiency: '' });
  const [serviceInput, setServiceInput] = useState('');
  const [myConnections, setMyConnections] = useState(null);
  const [removingResume, setRemovingResume] = useState(false);
  const [nameMismatch, setNameMismatch] = useState(null); // { detectedName, currentName }
  const [bioSuggestions, setBioSuggestions] = useState(null); // string[]
  const skillSuggest = useSuggestChip('skill');
  const specializationSuggest = useSuggestChip('specialization for a professional profile');
  const projectTypeSuggest = useSuggestChip('project type focus for a professional profile');
  const marketsSuggest = useSuggestChip('market / region a professional works in');
  const tagSuggesters = { specialization: specializationSuggest, projectTypeFocus: projectTypeSuggest, markets: marketsSuggest };
  const [galleryPreview, setGalleryPreview] = useState({ items: [], count: 0, associatedProfessionals: [], listings: [], listingCount: 0, openJobs: [] });
  const [contactOpen, setContactOpen] = useState(false);
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
        associatedProfessionals: res.data.associatedProfessionals || [],
        listings: res.data.listings || [],
        listingCount: res.data.listingCount || 0,
        openJobs: res.data.openJobs || [],
        analytics: res.data.analytics || null
      }))
      .catch(() => {});
  }, [user?.username]);

  useEffect(() => {
    fetchGalleryPreview();
    axios.get(`${API_URL}/api/profile/activity`, { silent: true })
      .then((res) => setActivity(res.data.posts || []))
      .catch(() => {});
  }, [fetchGalleryPreview]);

  // Shared by every section's Save button — sends the whole (already-synced)
  // formData object; the backend only applies the fields it recognizes.
  const saveFields = async (fields = {}) => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/profile/update`, { ...formData, ...fields });
      // /me carries the derived fields (resume link, availability options)
      const me = await axios.get(`${API_URL}/api/profile/me`);
      setUser(me.data.user);
      setEditingSection(null);
      toast.success('Saved');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const saveSection = () => saveFields();

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

  // Experience and education save straight away, one entry at a time
  const saveExperience = async () => {
    const { index, ...entry } = expDraft;
    if (!entry.title.trim() || !entry.company.trim()) return toast.error('Add a title and company');
    if (!entry.startDate) return toast.error('Add a start date');
    if (!entry.current && entry.endDate && entry.endDate < entry.startDate) return toast.error('End date is before the start date');
    if (!entry.current && !entry.endDate) return toast.error('Add an end date, or tick "I currently work here"');
    const next = index >= 0 ? formData.experience.map((e, i) => (i === index ? { ...e, ...entry, duration: '' } : e)) : [...formData.experience, entry];
    if (await saveFields({ experience: next })) setExpDraft(null);
  };

  const removeExperience = async (index) => {
    if (!window.confirm('Remove this experience?')) return;
    await saveFields({ experience: formData.experience.filter((_, i) => i !== index) });
  };

  const saveEducation = async () => {
    const { index, ...entry } = eduDraft;
    if (!entry.school.trim() || !entry.degree.trim()) return toast.error('Add a school and degree');
    const next = index >= 0 ? formData.education.map((e, i) => (i === index ? entry : e)) : [...formData.education, entry];
    if (await saveFields({ education: next })) setEduDraft(null);
  };

  const removeEducation = async (index) => {
    if (!window.confirm('Remove this education entry?')) return;
    await saveFields({ education: formData.education.filter((_, i) => i !== index) });
  };

  const addLanguage = () => {
    const name = langDraft.name.trim();
    if (!name) return;
    if (formData.languages.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`${name} is already added`);
      return;
    }
    setFormData((f) => ({ ...f, languages: [...f.languages, { name, proficiency: langDraft.proficiency }] }));
    setLangDraft({ name: '', proficiency: '' });
  };

  const toggleIn = (field, value) => setFormData((f) => ({
    ...f,
    [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value]
  }));

  const setBusiness = (patch) => setFormData((f) => ({ ...f, business: { ...f.business, ...patch } }));
  const addService = () => {
    const v = serviceInput.trim();
    if (v && !formData.business.services.includes(v)) setBusiness({ services: [...formData.business.services, v] });
    setServiceInput('');
  };

  const editAssociated = () => {
    // Start from what's shown now, so the first edit keeps the current people
    setFormData((f) => ({ ...f, associatedProfessionals: user?.associatedProfessionals?.length ? f.associatedProfessionals : galleryPreview.associatedProfessionals.map((p) => p._id) }));
    if (!myConnections) {
      axios.get(`${API_URL}/api/connections/list`).then((res) => setMyConnections(res.data.connections || [])).catch(() => setMyConnections([]));
    }
    edit('associated');
  };

  const saveAssociated = async () => {
    if (await saveFields()) fetchGalleryPreview();
  };

  const [postDraft, setPostDraft] = useState(null);
  const [posting, setPosting] = useState(false);
  const loadActivity = useCallback(() => {
    axios.get(`${API_URL}/api/profile/activity`).then((res) => setActivity(res.data.posts || [])).catch(() => {});
  }, []);
  const uploadPostImage = async (file) => {
    const body = new FormData();
    body.append('image', file);
    try {
      const res = await axios.post(`${API_URL}/api/upload/image`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPostDraft((d) => ({ ...d, mediaUrl: res.data.url }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not upload photo');
    }
  };
  const publishPost = async () => {
    setPosting(true);
    try {
      await axios.post(`${API_URL}/api/posts/create`, postDraft);
      setPostDraft(null);
      loadActivity();
      toast.success('Posted');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not post');
    } finally {
      setPosting(false);
    }
  };
  const deletePost = async (post) => {
    if (!window.confirm('Delete this update?')) return;
    try {
      await axios.delete(`${API_URL}/api/posts/${post._id}`);
      setActivity((list) => list.filter((p) => p._id !== post._id));
    } catch {
      toast.error('Could not delete');
    }
  };
  const togglePublicProfile = async (value) => {
    setUser((u) => ({ ...u, publicProfile: value }));
    try {
      await axios.put(`${API_URL}/api/profile/update`, { publicProfile: value });
      toast.success(value ? 'Your public profile is on' : 'Your public profile is off');
    } catch {
      setUser((u) => ({ ...u, publicProfile: !value }));
      toast.error('Could not change this');
    }
  };

  const removeResume = async () => {
    if (!window.confirm('Remove your résumé from your profile? Your skills stay.')) return;
    setRemovingResume(true);
    try {
      await axios.delete(`${API_URL}/api/profile/resume`);
      const me = await axios.get(`${API_URL}/api/profile/me`);
      setUser(me.data.user);
      toast.success('Résumé removed');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not remove résumé');
    } finally {
      setRemovingResume(false);
    }
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
  const intentOptions = intentsFor(user);
  const availabilityOptions = user?.availabilityOptions || [];
  const showBusiness = user?.role !== 'student';
  const sortedExperience = sortExperience(formData.experience);
  const galleryCategories = [...new Set(galleryPreview.items.map((i) => i.category).filter(Boolean))];
  const visibleGalleryItems = galleryCategory === 'All' ? galleryPreview.items : galleryPreview.items.filter((i) => i.category === galleryCategory);

  const edit = (key) => setEditingSection(key);

  return (
    <div className={`min-h-screen ${PAGE_BG}`} data-testid="profile-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <ProfileHero
            coverPhoto={formData.coverPhoto}
            profilePic={formData.profilePic}
            name={user?.name}
            roleLabel={roleLabel}
            headline={user?.headline || personHeadline(user)}
            pronouns={formData.pronouns}
            location={formData.location}
            yearsOfExperience={user?.yearsOfExperience}
            connectionCount={user?.connections?.length || 0}
            socialLinks={user?.socialLinks}
            followerCount={user?.followerCount || 0}
            badges={user?.badges}
            onContactInfo={() => setContactOpen(true)}
            onPhotoEdit={uploadingAvatar ? undefined : handleAvatarFile}
            onAddLocation={() => edit('header')}
            actions={
              <>
                <button type="button" onClick={() => edit('header')} className={heroBtn.dark} data-testid="edit-header-button">
                  <FiEdit2 className="w-4 h-4" />Edit intro
                </button>
                <ShareMenu path={`/in/${user?.username}`} title={`${user?.name} on BeeBark`} text={user?.headline || personHeadline(user)} align="start" testId="profile-share"
                  trigger={<button type="button" className={heroBtn.honey} data-testid="profile-share"><FiShare2 className="w-4 h-4" />Share profile</button>} />
                <Link to={`/profile/${user?.username}`} className={heroBtn.outline}>View as others</Link>
              </>
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

          <ProfileTabs tabs={[
            { id: 'section-overview', label: 'Overview' },
            { id: 'section-portfolio', label: 'Portfolio' },
            { id: 'section-experience', label: 'Experience' },
            { id: 'section-activity', label: 'Activity' },
            ...(galleryPreview.listingCount ? [{ id: 'section-listings', label: 'Listings' }] : []),
            ...(galleryPreview.openJobs.length ? [{ id: 'section-hiring', label: 'Hiring' }] : [])
          ]} />

          <div className="pf-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="public-link-card">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2b2622]">Public profile &amp; URL</p>
              <p className="mt-0.5 truncate text-[15px] pf-muted">
                {user?.publicProfile !== false ? <a href={`/in/${user?.username}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{window.location.host}/in/{user?.username}</a> : 'Your profile is only visible to signed-in BeeBark members'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {user?.publicProfile !== false && (
                <>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/in/${user?.username}`).then(() => toast.success('Link copied'), () => {})} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2b2622] hover:underline" data-testid="copy-public-link">
                    <FiLink className="w-4 h-4" />Copy link
                  </button>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/in/${user?.username}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A66C2] hover:underline">
                    <FaLinkedin className="w-4 h-4" />Share on LinkedIn
                  </a>
                </>
              )}
              <label className="inline-flex items-center gap-2 text-sm pf-muted">
                <Switch checked={user?.publicProfile !== false} onCheckedChange={(v) => togglePublicProfile(v)} data-testid="public-profile-toggle" />Public
              </label>
            </div>
          </div>

          {editingSection === 'header' && (
            <Card className="p-5 sm:p-8 space-y-5 rounded-2xl" id="intro-editor" data-testid="intro-editor">
              <h3 className="text-xl font-semibold font-serif">Edit intro</h3>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="name-input" />
              </div>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} maxLength={140} spellCheck
                  placeholder={`e.g. ${personHeadline(user) || 'Architect | Interior Designer | Urban Planner'}`} data-testid="headline-input" />
                <p className="text-xs text-gray-400">Shown under your name. Leave empty to use your current role.</p>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <LocationInput value={formData.location} onChange={(v) => setFormData((f) => ({ ...f, location: v }))} placeholder="Start typing your city" data-testid="location-input" />
                <p className="text-xs text-gray-400">Shown on your profile and used to suggest people and jobs near you.</p>
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
              <div className="space-y-3 border-t border-gray-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base">Contact info</Label>
                  <select value={formData.contact.visibility} onChange={(e) => setFormData((f) => ({ ...f, contact: { ...f.contact, visibility: e.target.value } }))} className="h-9 rounded-md border border-input bg-background px-2 text-sm" aria-label="Who can see your contact info" data-testid="contact-visibility">
                    <option value="connections">Visible to connections</option>
                    <option value="everyone">Visible to everyone</option>
                    <option value="only_me">Only me</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { k: 'email', label: 'Email', type: 'email', ph: user?.email || 'you@example.com' },
                    { k: 'phone', label: 'Phone', type: 'tel', ph: '+91 98765 43210' },
                    { k: 'whatsapp', label: 'WhatsApp', type: 'tel', ph: '+91 98765 43210' },
                    { k: 'website', label: 'Website', type: 'url', ph: 'yourstudio.com' }
                  ].map(({ k, label, type, ph }) => (
                    <div key={k} className="space-y-1">
                      <Label className="text-xs text-gray-500">{label}</Label>
                      <Input type={type} value={formData.contact[k]} onChange={(e) => setFormData((f) => ({ ...f, contact: { ...f.contact, [k]: e.target.value } }))} placeholder={ph} data-testid={`contact-${k}`} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Address</Label>
                  <LocationInput value={formData.contact.address} onChange={(v) => setFormData((f) => ({ ...f, contact: { ...f.contact, address: v } }))} placeholder="Office or studio address" />
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-5">
                <Label className="text-base">Social links</Label>
                {formData.socialLinks.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={l.platform} onChange={(e) => setFormData((f) => ({ ...f, socialLinks: f.socialLinks.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)) }))} className="h-10 w-36 shrink-0 rounded-md border border-input bg-background px-2 text-sm" aria-label="Platform">
                      {Object.entries(SOCIAL).map(([v, o]) => <option key={v} value={v}>{o.label}</option>)}
                    </select>
                    <Input value={l.url} onChange={(e) => setFormData((f) => ({ ...f, socialLinks: f.socialLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }))} placeholder="https://" data-testid={`social-url-${i}`} />
                    <button type="button" onClick={() => setFormData((f) => ({ ...f, socialLinks: f.socialLinks.filter((_, j) => j !== i) }))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove link"><FiTrash2 /></button>
                  </div>
                ))}
                {formData.socialLinks.length < 12 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setFormData((f) => ({ ...f, socialLinks: [...f.socialLinks, { platform: f.socialLinks.length ? 'instagram' : 'linkedin', url: '' }] }))} data-testid="add-social-link">
                    <FiPlus className="mr-1" />Add link
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400">Use the camera icon on your profile photo to change it.</p>
              <div className="flex gap-2">
                <Button onClick={cancelSection} variant="outline">Cancel</Button>
                <Button onClick={saveSection} disabled={saving} className="bg-black text-white hover:bg-gray-800">{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </Card>
          )}

          <div id="section-overview" className="space-y-6 scroll-mt-24">
              <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif">Analytics</h3>
                  <VisibilityPill isPublic={formData.analyticsPublic} editable onToggle={(v) => handleVisibilityToggle('analyticsPublic', v)} />
                </div>
                <AnalyticsCards items={[
                  { icon: FiEye, value: (galleryPreview.analytics?.viewsWeek ?? 0).toLocaleString('en-IN'), label: 'Profile Views', note: weekTrend(galleryPreview.analytics?.viewsChange) },
                  { icon: FiBookmark, value: (galleryPreview.analytics?.saves ?? 0).toLocaleString('en-IN'), label: 'Project Saves', note: 'All time' },
                  { icon: FiCalendar, value: (galleryPreview.analytics?.meetingsMonth ?? 0).toLocaleString('en-IN'), label: 'Meeting Requests', note: 'This month' },
                  { icon: FiMessageSquare, value: (galleryPreview.analytics?.enquiriesMonth ?? 0).toLocaleString('en-IN'), label: 'Enquiries', note: 'This month' }
                ]} />
                <p className="text-xs text-slate-400 mt-3">Private by default — only visible to you until you switch it to Public above.</p>
              </Card>

              <SectionCard
                title="About" sectionKey="about" editingSection={editingSection}
                onEditClick={() => edit('about')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-1">
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="min-h-32"
                      spellCheck
                      autoCorrect="on"
                      autoCapitalize="sentences"
                      lang="en"
                      maxLength={2000}
                      data-testid="bio-input"
                    />
                    <p className="text-xs text-gray-400 text-right">{formData.bio.length}/2000 · spelling mistakes are underlined as you type</p>
                  </div>
                }
              >
                {formData.bio ? <ReadMore text={formData.bio} /> : <p className="text-slate-500">No bio yet</p>}
              </SectionCard>

              {availabilityOptions.length > 0 && (
                <SectionCard
                  title="Open to" sectionKey="availability" editingSection={editingSection} icon={FiCheckCircle}
                  onEditClick={() => edit('availability')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                  editContent={
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Let people know what you're open to. This shows under your name.</p>
                      <div className="flex flex-wrap gap-2">
                        {availabilityOptions.map((v) => {
                          const on = formData.availability.includes(v);
                          return (
                            <button key={v} type="button" onClick={() => toggleIn('availability', v)} aria-pressed={on}
                              className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition ${on ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                              {AVAILABILITY_LABELS[v] || v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  }
                >
                  {formData.availability.length > 0 ? <AvailabilityChips values={formData.availability} /> : <p className="text-slate-500">Not set. Tell people if you're hiring, open to work or taking projects.</p>}
                </SectionCard>
              )}

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

              <SectionCard
                title="Industry" sectionKey="industry" editingSection={editingSection}
                onEditClick={() => edit('industry')} onCancel={cancelSection}
                onSave={() => (formData.industries.length ? saveSection() : toast.error('Pick at least one industry'))} saving={saving}
                editContent={
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((o) => {
                      const on = formData.industries.includes(o.value);
                      return (
                        <button key={o.value} type="button" onClick={() => toggleIn('industries', o.value)} aria-pressed={on}
                          className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition ${on ? 'bg-slate-900 border-slate-900 text-yellow-400' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                }
              >
                {industryLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {industryLabels.map((l) => <Badge key={l} className="bg-slate-900 text-yellow-400">{l}</Badge>)}
                  </div>
                ) : <p className="text-slate-500">No industry chosen yet</p>}
              </SectionCard>

              <SectionCard
                title="Goals" sectionKey="goals" editingSection={editingSection} icon={FiTarget}
                onEditClick={() => edit('goals')} onCancel={cancelSection}
                onSave={() => (formData.intent.length ? saveSection() : toast.error('Pick at least one goal'))} saving={saving}
                editContent={
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {intentOptions.map((o) => {
                      const on = formData.intent.includes(o.value);
                      return (
                        <button key={o.value} type="button" onClick={() => toggleIn('intent', o.value)} aria-pressed={on}
                          className={`text-left rounded-lg border-2 p-3 transition ${on ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <span className="block text-sm font-semibold text-black">{o.label}</span>
                          <span className="block text-xs text-gray-500">{o.tagline}</span>
                        </button>
                      );
                    })}
                  </div>
                }
              >
                {intentLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intentLabels.map((l) => <Badge key={l} variant="outline" className="border-slate-300 text-slate-700">{l}</Badge>)}
                  </div>
                ) : <p className="text-slate-500">No goals chosen yet</p>}
              </SectionCard>

              <SectionCard
                title="Skills" sectionKey="skills" editingSection={editingSection}
                onEditClick={() => edit('skills')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-3">
                    <ResumeImport onImported={handleResumeImported} />
                    <div className="flex gap-2">
                      <AutocompleteInput
                        field="skill"
                        wrapperClassName="flex-1"
                        value={newSkill}
                        onChange={setNewSkill}
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
              title="Portfolio" sectionKey="gallery-noop" editingSection={editingSection} editable={false}
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
                <ProjectGrid items={visibleGalleryItems} linkFor={(item) => `/portfolio/${user?.username}?project=${item._id}`} />
              ) : (
                <p className="text-slate-500">Nothing here yet — add your first work photo above</p>
              )}
            </SectionCard>
          </div>

          <div id="section-experience" className="space-y-6 scroll-mt-24">
              <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm" data-testid="experience-section">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif flex items-center gap-2"><FiBriefcase className="w-4 h-4" />Experience</h3>
                  {!expDraft && (
                    <Button size="sm" onClick={() => setExpDraft({ index: -1, ...EMPTY_EXPERIENCE })} className="bg-yellow-400 hover:bg-yellow-500 text-black" data-testid="add-experience">
                      <FiPlus className="mr-1" />Add
                    </Button>
                  )}
                </div>
                {expDraft && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 mb-4 space-y-3" data-testid="experience-form">
                    <p className="text-sm font-semibold text-black">{expDraft.index >= 0 ? 'Edit experience' : 'Add experience'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Title *</Label>
                        <AutocompleteInput field="title" value={expDraft.title} onChange={(v) => setExpDraft((d) => ({ ...d, title: v }))} placeholder="e.g. Junior Architect" data-testid="exp-title" />
                      </div>
                      <div className="space-y-1">
                        <Label>Company *</Label>
                        <AutocompleteInput field="company" value={expDraft.company} onChange={(v) => setExpDraft((d) => ({ ...d, company: v }))} placeholder="e.g. Studio Lotus" data-testid="exp-company" />
                      </div>
                      <div className="space-y-1">
                        <Label>Employment type</Label>
                        <select value={expDraft.employmentType} onChange={(e) => setExpDraft((d) => ({ ...d, employmentType: e.target.value }))} className={selectClass}>
                          <option value="">Select</option>
                          {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Location</Label>
                        <LocationInput value={expDraft.location} onChange={(v) => setExpDraft((d) => ({ ...d, location: v }))} placeholder="City" />
                      </div>
                      <div className="space-y-1">
                        <Label>Start date *</Label>
                        <Input type="month" value={expDraft.startDate} max={new Date().toISOString().slice(0, 7)} onChange={(e) => setExpDraft((d) => ({ ...d, startDate: e.target.value }))} data-testid="exp-start" />
                      </div>
                      <div className="space-y-1">
                        <Label>End date</Label>
                        <Input type="month" value={expDraft.current ? '' : expDraft.endDate} disabled={expDraft.current} min={expDraft.startDate || undefined} onChange={(e) => setExpDraft((d) => ({ ...d, endDate: e.target.value }))} data-testid="exp-end" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={expDraft.current} onChange={(e) => setExpDraft((d) => ({ ...d, current: e.target.checked, endDate: e.target.checked ? '' : d.endDate }))} className="accent-yellow-500" data-testid="exp-current" />
                      I currently work here
                    </label>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea value={expDraft.description} onChange={(e) => setExpDraft((d) => ({ ...d, description: e.target.value }))} rows={3} spellCheck placeholder="What did you work on? Projects, responsibilities, results" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveExperience} disabled={saving} className="bg-black text-white hover:bg-gray-800" data-testid="exp-save">{saving ? 'Saving...' : 'Save'}</Button>
                      <Button onClick={() => setExpDraft(null)} variant="outline">Cancel</Button>
                    </div>
                  </div>
                )}
                {sortedExperience.length > 0 ? (
                  <div className="space-y-4">
                    {sortedExperience.map((exp) => (
                      <ExperienceCard key={exp._index} exp={exp} actions={(
                        <>
                          <button onClick={() => setExpDraft({ ...EMPTY_EXPERIENCE, ...exp, index: exp._index })} className="p-1.5 text-gray-400 hover:text-black" aria-label={`Edit ${exp.title}`}><FiEdit2 className="w-4 h-4" /></button>
                          <button onClick={() => removeExperience(exp._index)} className="p-1.5 text-gray-400 hover:text-red-600" aria-label={`Remove ${exp.title}`}><FiTrash2 className="w-4 h-4" /></button>
                        </>
                      )} />
                    ))}
                  </div>
                ) : !expDraft && <p className="text-slate-500">No experience added yet</p>}
              </Card>

              <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm" data-testid="education-section">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif flex items-center gap-2"><FiBookOpen className="w-4 h-4" />Education</h3>
                  {!eduDraft && (
                    <Button size="sm" onClick={() => setEduDraft({ index: -1, ...EMPTY_EDUCATION })} className="bg-yellow-400 hover:bg-yellow-500 text-black" data-testid="add-education">
                      <FiPlus className="mr-1" />Add
                    </Button>
                  )}
                </div>
                {eduDraft && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 mb-4 space-y-3">
                    <p className="text-sm font-semibold text-black">{eduDraft.index >= 0 ? 'Edit education' : 'Add education'}</p>
                    <div className="space-y-1">
                      <Label>School / institution *</Label>
                      <AutocompleteInput field="school" value={eduDraft.school} onChange={(v) => setEduDraft((d) => ({ ...d, school: v }))} placeholder="Start typing to search" data-testid="edu-school" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Degree *</Label>
                        <AutocompleteInput field="degree" value={eduDraft.degree} onChange={(v) => setEduDraft((d) => ({ ...d, degree: v }))} placeholder="e.g. B.Arch" data-testid="edu-degree" />
                      </div>
                      <div className="space-y-1">
                        <Label>Field of study</Label>
                        <AutocompleteInput field="field" value={eduDraft.field} onChange={(v) => setEduDraft((d) => ({ ...d, field: v }))} placeholder="e.g. Architecture" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Years</Label>
                      <Input value={eduDraft.duration} onChange={(e) => setEduDraft((d) => ({ ...d, duration: e.target.value }))} placeholder="e.g. 2019 - 2024" />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea value={eduDraft.description} onChange={(e) => setEduDraft((d) => ({ ...d, description: e.target.value }))} rows={2} spellCheck placeholder="Thesis, awards, activities (optional)" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEducation} disabled={saving} className="bg-black text-white hover:bg-gray-800" data-testid="edu-save">{saving ? 'Saving...' : 'Save'}</Button>
                      <Button onClick={() => setEduDraft(null)} variant="outline">Cancel</Button>
                    </div>
                  </div>
                )}
                {formData.education.length > 0 ? (
                  <div className="space-y-4">
                    {formData.education.map((edu, idx) => (
                      <div key={idx} className="relative border-l-4 border-yellow-500 pl-4 pr-16">
                        <h4 className="font-semibold text-gray-900">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</h4>
                        <p className="text-gray-700 text-sm font-medium">{edu.school}</p>
                        <p className="text-xs text-gray-500">{edu.duration}</p>
                        {edu.description && <p className="text-sm text-gray-600 mt-2">{edu.description}</p>}
                        <div className="absolute top-0 right-0 flex gap-1">
                          <button onClick={() => setEduDraft({ ...EMPTY_EDUCATION, ...edu, index: idx })} className="p-1.5 text-gray-400 hover:text-black" aria-label={`Edit ${edu.school}`}><FiEdit2 className="w-4 h-4" /></button>
                          <button onClick={() => removeEducation(idx)} className="p-1.5 text-gray-400 hover:text-red-600" aria-label={`Remove ${edu.school}`}><FiTrash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !eduDraft && <p className="text-slate-500">No education added yet</p>}
              </Card>

              <SectionCard
                title="Languages" sectionKey="languages" editingSection={editingSection} icon={FiLanguage}
                onEditClick={() => edit('languages')} onCancel={cancelSection} onSave={saveSection} saving={saving}
                editContent={
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <AutocompleteInput field="language" wrapperClassName="flex-1" value={langDraft.name} onChange={(v) => setLangDraft((d) => ({ ...d, name: v }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())} placeholder="e.g. Hindi" data-testid="language-input" />
                      <select value={langDraft.proficiency} onChange={(e) => setLangDraft((d) => ({ ...d, proficiency: e.target.value }))} className={`${selectClass} sm:w-52`} aria-label="Proficiency">
                        <option value="">Proficiency</option>
                        {PROFICIENCY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      <Button type="button" onClick={addLanguage} className="bg-yellow-400 hover:bg-yellow-500 text-black shrink-0" data-testid="add-language">Add</Button>
                    </div>
                    <div className="space-y-2">
                      {formData.languages.map((l, i) => (
                        <div key={l.name} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                          <span className="flex-1 text-sm font-medium text-black">{l.name}</span>
                          <select value={l.proficiency} onChange={(e) => setFormData((f) => ({ ...f, languages: f.languages.map((x, j) => (j === i ? { ...x, proficiency: e.target.value } : x)) }))} className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs" aria-label={`${l.name} proficiency`}>
                            <option value="">Proficiency</option>
                            {PROFICIENCY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                          <button type="button" onClick={() => setFormData((f) => ({ ...f, languages: f.languages.filter((_, j) => j !== i) }))} className="p-1 text-gray-400 hover:text-red-600" aria-label={`Remove ${l.name}`}><FiX /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                {formData.languages.length > 0 ? <LanguagesList languages={formData.languages} /> : <p className="text-slate-500">No languages added yet</p>}
              </SectionCard>

              {showBusiness && (
                <SectionCard
                  title="Business" sectionKey="business" editingSection={editingSection} icon={FiHome}
                  onEditClick={() => edit('business')} onCancel={cancelSection}
                  onSave={() => (formData.business.name.trim() || !Object.values(formData.business).some((v) => (Array.isArray(v) ? v.length : String(v).trim()))
                    ? saveSection()
                    : toast.error('Add your business name'))}
                  saving={saving}
                  editContent={
                    <div className="space-y-3" data-testid="business-form">
                      <p className="text-sm text-gray-500">Run a studio, practice or firm? Add it here so clients and talent can find it.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1"><Label>Business name</Label><Input value={formData.business.name} onChange={(e) => setBusiness({ name: e.target.value })} placeholder="e.g. Sharma Design Studio" data-testid="business-name" /></div>
                        <div className="space-y-1">
                          <Label>Type</Label>
                          <select value={formData.business.type} onChange={(e) => setBusiness({ type: e.target.value })} className={selectClass}>
                            <option value="">Select</option>
                            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1"><Label>Website</Label><Input value={formData.business.website} onChange={(e) => setBusiness({ website: e.target.value })} placeholder="yourstudio.com" /></div>
                        <div className="space-y-1"><Label>Founded</Label><Input value={formData.business.founded} onChange={(e) => setBusiness({ founded: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="e.g. 2018" inputMode="numeric" /></div>
                        <div className="space-y-1">
                          <Label>Team size</Label>
                          <select value={formData.business.teamSize} onChange={(e) => setBusiness({ teamSize: e.target.value })} className={selectClass}>
                            <option value="">Select</option>
                            {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1"><Label>Address</Label><LocationInput value={formData.business.address} onChange={(v) => setBusiness({ address: v })} placeholder="Office location" /></div>
                      </div>
                      <div className="space-y-1">
                        <Label>Services</Label>
                        <div className="flex gap-2">
                          <Input value={serviceInput} onChange={(e) => setServiceInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())} placeholder="e.g. Residential interiors" spellCheck />
                          <Button type="button" onClick={addService} className="bg-yellow-400 hover:bg-yellow-500 text-black shrink-0">Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {formData.business.services.map((v) => (
                            <Badge key={v} className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => setBusiness({ services: formData.business.services.filter((x) => x !== v) })}>{v} ×</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1"><Label>About the business</Label><Textarea value={formData.business.about} onChange={(e) => setBusiness({ about: e.target.value })} rows={3} spellCheck placeholder="What you do, who you work with" /></div>
                    </div>
                  }
                >
                  {user?.business?.name ? <BusinessDetails business={user.business} /> : <p className="text-slate-500">No business added. Add your studio, practice or firm.</p>}
                </SectionCard>
              )}

              <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm" data-testid="resume-section">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif flex items-center gap-2"><FiFileText className="w-4 h-4" />Résumé</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">Only you</span>
                </div>
                {user?.resume?.url ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-gray-50 p-4">
                    <FiFileText className="w-8 h-8 text-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate">{user.resume.fileName || 'Résumé'}</p>
                      <p className="text-xs text-gray-500">
                        {user.resume.uploadedAt ? `Uploaded ${new Date(user.resume.uploadedAt).toLocaleDateString()}` : 'Uploaded'}
                        {typeof user.resume.score === 'number' ? ` · Score ${user.resume.score}/100` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={user.resume.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline"><FiExternalLink className="mr-1" />View</Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={removeResume} disabled={removingResume} className="text-red-600 hover:text-red-700">
                        <FiTrash2 className="mr-1" />{removingResume ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 mb-3">Upload your résumé to fill your skills and apply to jobs faster. Only you can see it.</p>
                )}
                <div className="mt-3">
                  <ResumeImport onImported={handleResumeImported} />
                  {user?.resume?.url && <p className="text-xs text-gray-400 mt-1">Uploading a new file replaces the current one.</p>}
                </div>
              </Card>
          </div>

          <div id="section-activity" className="space-y-6 scroll-mt-24">
              <SectionCard
                title="Recent Activity" sectionKey="activity-noop" editingSection={editingSection} editable={false}
                action={
                  <>
                    <VisibilityPill isPublic={formData.activityPublic} editable onToggle={(v) => handleVisibilityToggle('activityPublic', v)} />
                    <button type="button" onClick={() => setPostDraft({ kind: 'update', title: '', content: '', mediaUrl: '' })} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2b2622] px-3 py-1.5 text-sm font-semibold text-white hover:bg-black" data-testid="post-update">
                      <FiPlus className="w-4 h-4" />Post an update
                    </button>
                  </>
                }
              >
                {postDraft && (
                  <div className="mb-5 space-y-3 rounded-2xl border border-[#f3d27a] bg-[#fffbeb] p-4" data-testid="post-form">
                    <div className="flex flex-wrap gap-2">
                      {[['update', 'Update'], ['article', 'Article'], ['site_update', 'Site Update'], ['opinion', 'Opinion'], ['project', 'Project']].map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setPostDraft((d) => ({ ...d, kind: v }))} className={`rounded-full px-3 py-1 text-sm ${postDraft.kind === v ? 'bg-[#2b2622] text-white' : 'bg-white border border-[#e3ddd5] text-[#6f655c]'}`}>{l}</button>
                      ))}
                    </div>
                    <Input value={postDraft.title} onChange={(e) => setPostDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Title (optional)" maxLength={160} spellCheck data-testid="post-title" />
                    <Textarea value={postDraft.content} onChange={(e) => setPostDraft((d) => ({ ...d, content: e.target.value }))} placeholder="Share a project milestone, an idea or news" rows={4} maxLength={5000} spellCheck data-testid="post-content" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm pf-muted hover:text-[#2b2622]">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadPostImage(e.target.files[0])} />
                        <FiImage className="w-4 h-4" />{postDraft.mediaUrl ? 'Change photo' : 'Add a photo'}
                      </label>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setPostDraft(null)}>Cancel</Button>
                        <Button onClick={publishPost} disabled={posting || !postDraft.content.trim()} className="bg-[#2b2622] text-white hover:bg-black" data-testid="post-submit">{posting ? 'Posting…' : 'Post'}</Button>
                      </div>
                    </div>
                    {postDraft.mediaUrl && <img src={postDraft.mediaUrl} alt="" className="max-h-48 rounded-xl object-cover" />}
                  </div>
                )}
                {activity.length > 0 ? (
                  <ActivityCards
                    posts={activity}
                    onDelete={deletePost}
                    renderShare={(post) => (
                      <ShareMenu path={`/in/${user?.username}`} title={post.title || `${user?.name} on BeeBark`} text={post.content?.slice(0, 140)} align="start"
                        trigger={<button type="button" className="inline-flex items-center gap-1.5 hover:text-[#2b2622]"><FiShare2 className="w-4 h-4" />Share</button>} />
                    )}
                  />
                ) : !postDraft && <p className="text-slate-500">No activity yet. Post an update about your work.</p>}
              </SectionCard>

              <SectionCard
                title="Associated Professionals" sectionKey="associated" editingSection={editingSection} icon={FiUsers}
                onEditClick={editAssociated} onCancel={cancelSection} onSave={saveAssociated} saving={saving}
                editContent={
                  <div className="space-y-3" data-testid="associated-editor">
                    <p className="text-sm text-gray-500">Choose which of your connections appear on your profile, e.g. people you've worked with.</p>
                    {myConnections === null ? (
                      <p className="text-sm text-gray-400">Loading your connections...</p>
                    ) : myConnections.length === 0 ? (
                      <p className="text-sm text-gray-500">Connect with people first, then add them here. <Link to="/connections" className="font-medium text-black underline">Find people</Link></p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                        {myConnections.map((c) => {
                          const on = formData.associatedProfessionals.includes(c._id);
                          return (
                            <button key={c._id} type="button" onClick={() => toggleIn('associatedProfessionals', c._id)} aria-pressed={on}
                              className={`flex items-center gap-3 rounded-lg border-2 p-2.5 text-left transition ${on ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                              <Avatar className="w-9 h-9">
                                <AvatarImage src={c.profilePic} />
                                <AvatarFallback className="bg-gray-200 text-black text-sm font-semibold">{c.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium text-black truncate">{c.name}</span>
                                <span className="block text-xs text-gray-500 truncate">{personHeadline(c)}</span>
                              </span>
                              {on ? <FiCheckCircle className="text-yellow-500 shrink-0" /> : <FiPlus className="text-gray-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">{formData.associatedProfessionals.length} selected</p>
                  </div>
                }
              >
                {galleryPreview.associatedProfessionals.length > 0
                  ? <PeopleGrid people={galleryPreview.associatedProfessionals} />
                  : <p className="text-slate-500">No one added yet. Use the pencil to add people you've worked with.</p>}
              </SectionCard>
          </div>

          {galleryPreview.listingCount > 0 && (
            <div id="section-listings" className="scroll-mt-32">
              <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-5 gap-3">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif">Property Listings</h3>
                  <Link to="/listings" className="text-sm font-medium text-black hover:underline">Manage listings →</Link>
                </div>
                <ListingCards listings={galleryPreview.listings} />
              </Card>
            </div>
          )}

          {galleryPreview.openJobs.length > 0 && (
            <div id="section-hiring" className="scroll-mt-32">
              <Card className="p-5 sm:p-8 rounded-2xl border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-5 gap-3">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif">Open Positions</h3>
                  <Link to="/jobs" className="text-sm font-medium text-black hover:underline">Manage jobs →</Link>
                </div>
                <JobRows jobs={galleryPreview.openJobs} own />
              </Card>
            </div>
          )}
        </div>
      </div>

      <ContactInfoDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        name={user?.name}
        username={user?.username}
        contact={{ ...(user?.contact || {}), email: user?.contact?.email || '' }}
        socialLinks={user?.socialLinks}
        onEdit={() => {
          setContactOpen(false);
          edit('header');
          setTimeout(() => document.getElementById('intro-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }}
      />

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
