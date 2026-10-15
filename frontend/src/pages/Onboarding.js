import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { FiArrowLeft, FiArrowRight, FiUser, FiPlus, FiClock } from 'react-icons/fi';
import axios from 'axios';
import { API_URL } from '../config/api';
import { imageFileError, uploadImage } from '../lib/imageUpload';
import ResumeImport from '../components/ResumeImport';
import { ROLES } from '../config/roles';
import { intentsFor, INDUSTRIES } from '../config/onboarding';
import { AutocompleteInput } from '../components/AutocompleteInput';
import CompanyInput from '../components/company/CompanyInput';
import ProfessionPicker from '../components/ProfessionPicker';
import CityPicker from '../components/CityPicker';
import { isWaitlistedLocation, WAITLISTED_STATES } from '../config/cities';
import SkillPicker from '../components/SkillPicker';

const TOTAL_STEPS = 4;
// BeeBark is for these four fields only
const FIELD_OPTIONS = INDUSTRIES.filter((i) => i.value !== 'related');

const toggle = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// Large selectable option card (modern full-screen wizard style)
const OptionCard = ({ active, onClick, title, description, icon: Icon, testId }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={`group relative flex items-center gap-4 w-full rounded-2xl border-2 px-6 py-5 text-left transition-all duration-200 ${
      active
        ? 'border-yellow-400 bg-yellow-50 shadow-sm'
        : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-gray-50'
    }`}
  >
    {Icon && (
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? 'bg-[#32281F] text-white' : 'bg-[#F2EFEC] text-[#32281F] group-hover:bg-yellow-200'}`}>
        <Icon className="text-lg" />
      </span>
    )}
    <span className="flex-1">
      <span className="block text-base font-semibold text-black">{title}</span>
      {description && <span className="mt-0.5 block text-sm text-gray-500">{description}</span>}
    </span>
    <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${active ? 'border-[#32281F] bg-[#32281F] text-white' : 'border-gray-300 text-transparent'}`}>
      <FaCheck className="text-[10px]" />
    </span>
  </button>
);

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateOnboarding, logout } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState(user?.role && ['student', 'professional'].includes(user.role) ? user.role : '');
  const isStudent = role === 'student';
  // Students pick their goals and field before their school; professionals describe their work first
  const ORDER = isStudent ? ['role', 'goals', 'background', 'profile'] : ['role', 'background', 'goals', 'profile'];
  const current = ORDER[step];
  const firstJob = (user?.experience || []).find((e) => e.current) || {};
  const firstSchool = (user?.education || [])[0] || {};
  const [background, setBackground] = useState({
    title: firstJob.title || '', company: firstJob.company || '', companyPage: firstJob.companyPage || null, selfEmployed: false,
    school: firstSchool.school || '', field: firstSchool.field || '', gradYear: ''
  });
  const setBg = (patch) => setBackground((b) => ({ ...b, ...patch }));
  const [intent, setIntent] = useState(user?.intent || []);
  const [industries, setIndustries] = useState((user?.industries || []).filter((v) => v !== 'related'));
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [bioSuggestions, setBioSuggestions] = useState([]);
  const [location, setLocation] = useState(user?.location || '');
  const [detectedLocation, setDetectedLocation] = useState('');
  const [nameMismatch, setNameMismatch] = useState(null);
  const [skills, setSkills] = useState(user?.skills || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Students can skip their school and course for now (added later from the profile)
  const [educationSkipped, setEducationSkipped] = useState(false);
  // A city in a state BeeBark hasn't opened in: they wait for it instead of joining
  // (only while their state is still waitlisted: once it opens they carry on)
  const [regionWait, setRegionWait] = useState(WAITLISTED_STATES.includes(user?.regionWaitlist?.state) && !user?.location ? user.regionWaitlist : null);
  const joinRegionWaitlist = async (c) => {
    try {
      const res = await axios.post(`${API_URL}/api/profile/region-waitlist`, { city: c.city, state: c.state });
      setRegionWait(res.data.regionWaitlist);
      setLocation('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not join the waitlist');
    }
  };

  // Profile photos go through the same checked upload as the profile page
  const choosePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = imageFileError(file);
    if (problem) { toast.error(problem); return; }
    setUploadingPhoto(true);
    try {
      setProfilePic(await uploadImage(file, { endpoint: '/api/upload/profile-photo', maxSide: 1200 }));
    } catch (error) {
      toast.error(error.message || 'Could not upload that photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const selectIndustry = (value) => setIndustries((prev) => toggle(prev, value));

  const educationDone = !!background.school.trim() && !!background.field.trim();
  const backgroundDone = (isStudent
    ? educationDone || educationSkipped
    : !!background.title.trim()) && !!location.trim() && !isWaitlistedLocation(location);

  // Skip the school step: only the city is still needed to continue
  const skipEducation = () => {
    setEducationSkipped(true);
    if (!location.trim() || isWaitlistedLocation(location)) {
      toast.message('Choose your city to continue. You can add your school later from your profile.');
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };

  const canContinue =
    ((current === 'role' && !!role) ||
      (current === 'background' && backgroundDone) ||
      (current === 'goals' && intent.some((v) => intentsFor({ role }).some((i) => i.value === v)) && industries.length > 0) ||
      current === 'profile');

  const next = () => {
    if (!canContinue) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setSaving(true);
    try {
      const bg = isStudent
        ? (educationDone ? { school: background.school.trim(), field: background.field.trim(), gradYear: background.gradYear } : { skipped: true })
        : { title: background.title.trim(), company: background.company.trim(), companyPage: background.companyPage || undefined, selfEmployed: background.selfEmployed };
      await updateOnboarding({ role, background: bg, intent: intent.filter((v) => intentsFor({ role }).some((i) => i.value === v)), industries, industriesOther: '', bio, location, skills, profilePic, name, complete: true });
      toast.success("You're all set!");
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const STEP_META = {
    role: { title: 'What best describes you?', subtitle: "We'll tailor BeeBark to your journey." },
    background: isStudent
      ? { title: 'Where are you studying?', subtitle: 'Connect with people in your field.' }
      : { title: 'Tell us about your work', subtitle: 'Start with your current or most recent role.' },
    goals: { title: 'What brings you here?', subtitle: 'Pick your goals and the fields you work in.' },
    profile: { eyebrow: 'YOUR PROFESSIONAL IDENTITY', title: 'Make it yours.', subtitle: 'A face. A few words. Your next connection.', left: true }
  };
  const meta = STEP_META[current];
  const thisYear = new Date().getFullYear();
  const fieldClass = 'w-full h-12 rounded-xl border border-gray-300 bg-white px-4 text-[15px] focus:border-[#7A6450] focus:outline-none focus:ring-2 focus:ring-[#7A6450]/20';

  return (
    <div className="min-h-screen bg-[#F6F4F1] sm:py-8 flex flex-col items-center" data-testid="onboarding">
      <div className="w-full sm:max-w-xl bg-white sm:rounded-3xl sm:shadow-[0_20px_60px_-30px_rgba(50,40,31,0.35)] sm:border sm:border-[#E8E3DD] flex flex-col min-h-screen sm:min-h-0">
        {/* Header: back, logo, step */}
        <div className="px-5 sm:px-8 pt-6">
          <div className="grid grid-cols-[2.5rem_1fr_auto] items-center">
            {step > 0 ? (
              <button type="button" onClick={back} className="p-1 -ml-1 text-[#32281F] hover:opacity-70" aria-label="Back" data-testid="onboarding-back"><FiArrowLeft className="w-6 h-6" /></button>
            ) : <span />}
            <span className="flex items-center justify-center gap-2">
              <img src="/image.png" alt="" className="h-9 w-9 object-contain" />
              <span className="text-2xl font-black tracking-tight text-[#1C1712]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BeeBark</span>
            </span>
            {current === 'profile' ? (
              <button type="button" onClick={finish} disabled={saving} className="text-[15px] text-[#6B625A] hover:text-black disabled:opacity-50" data-testid="onboarding-skip">Skip</button>
            ) : current === 'background' && isStudent && !educationDone ? (
              <button type="button" onClick={skipEducation} className="text-[15px] font-medium text-[#6B625A] hover:text-black" data-testid="onboarding-skip-education">Skip</button>
            ) : (
              <span className="text-sm text-[#6B625A] whitespace-nowrap" data-testid="onboarding-step">Step {step + 1} of {TOTAL_STEPS}</span>
            )}
          </div>
          <div className="mt-5 h-2 w-full rounded-full bg-[#EFECE8] overflow-hidden">
            <div className="h-full rounded-full bg-[#F4C430] transition-all duration-500 ease-out" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {regionWait ? (
          <div className="flex-1 px-5 sm:px-8 py-12 text-center" data-testid="onboarding-region-waitlisted">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF4CC] text-[#1C1712]"><FiClock className="h-7 w-7" /></span>
            <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-[#6B625A]">WAITLISTED</p>
            <h1 className="mt-2 text-[28px] sm:text-[34px] font-bold leading-tight text-[#1C1712]">You're on the list for {regionWait.city}</h1>
            <p className="mx-auto mt-3 max-w-sm text-[#6B625A]">BeeBark isn't open in {regionWait.state} yet. We'll let you know as soon as it opens there.</p>
            <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3">
              <button type="button" onClick={() => setRegionWait(null)} className="auth-yellow-btn" data-testid="onboarding-change-city">I'm in a different city</button>
              <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="text-sm text-[#6B625A] hover:text-black">Log out</button>
            </div>
          </div>
        ) : (
        <div className="flex-1 px-5 sm:px-8 py-8 animate-fadeIn" key={step}>
          {meta.eyebrow && <p className="text-xs font-semibold tracking-[0.25em] text-[#6B625A]">{meta.eyebrow}</p>}
          <h1 className={`${meta.left ? 'mt-2 text-[36px] sm:text-[44px]' : 'text-center text-[28px] sm:text-[32px]'} font-bold leading-tight tracking-tight text-[#1C1712]`}>{meta.title}</h1>
          <p className={`mt-2 ${meta.left ? 'text-lg' : 'text-center'} text-[#6B625A]`}>{meta.subtitle}</p>

          <div className="mt-8">
            {/* Step 1: who you are */}
            {current === 'role' && (
              <div data-testid="onboarding-role">
                <div className="space-y-3" role="radiogroup">
                  {ROLES.map((r) => {
                    const active = role === r.value;
                    return (
                      <button key={r.value} type="button" role="radio" aria-checked={active} onClick={() => setRole(r.value)} data-testid={`role-${r.value}`}
                        className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${active ? 'border-[#F4C430] bg-[#FFF9E6] ring-1 ring-[#F4C430]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-[#F4C430] bg-[#F4C430]' : 'border-gray-300'}`}>
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-[#1C1712]" />}
                        </span>
                        <span>
                          <span className="block text-base font-semibold text-[#1C1712]">{r.label}</span>
                          <span className="block text-sm text-[#6B625A]">{r.value === 'student' ? 'Studying or preparing for your career.' : 'Working, freelancing or running a business.'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm text-[#6B625A]">Business owners join as professionals, then create a company page.</p>
              </div>
            )}

            {/* Step 2: background */}
            {current === 'background' && (
              <div className="space-y-5" data-testid="onboarding-background">
                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-[#FAF8F5] px-4 py-2 text-sm">
                    <span className={`h-3.5 w-3.5 rounded-full ${isStudent ? 'border-2 border-gray-400' : 'bg-[#F4C430]'}`} />
                    <span className="font-medium text-[#1C1712]">{isStudent ? 'Student' : 'Professional'}</span>
                    <span className="h-4 w-px bg-gray-300" />
                    <button type="button" onClick={() => setStep(0)} className="font-medium text-[#7A6450] hover:underline" data-testid="onboarding-change-role">Change</button>
                  </span>
                </div>
                {isStudent ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">School, college or university</label>
                      <AutocompleteInput field="school" value={background.school} onChange={(v) => setBg({ school: v })} placeholder="Enter your institution" className={fieldClass} data-testid="onboarding-school" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">Course or field of study</label>
                      <AutocompleteInput field="field" value={background.field} onChange={(v) => setBg({ field: v })} placeholder="e.g. Architecture, interior design, civil engineering" className={fieldClass} data-testid="onboarding-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">Expected graduation year <span className="font-normal text-[#6B625A]">(optional)</span></label>
                      <select value={background.gradYear} onChange={(e) => setBg({ gradYear: e.target.value })} className={fieldClass} data-testid="onboarding-grad-year">
                        <option value="">Select year</option>
                        {Array.from({ length: 9 }, (_, i) => thisYear - 1 + i).map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">Job title or professional role</label>
                      <ProfessionPicker value={background.title} allowGeneral={false} testId="onboarding-title" placeholder="e.g. Architect, contractor, property consultant"
                        otherGroup={background.titleGroup}
                        onChange={(v, g) => {
                          setBg({ title: v, titleGroup: g?.id || null });
                          // Pre-pick the matching field for the next step
                          if (g && !industries.length) setIndustries([g.industry]);
                        }} />
                    </div>
                    <div className={background.selfEmployed ? 'opacity-50 pointer-events-none' : ''}>
                      <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">Company or studio <span className="font-normal text-[#6B625A]">(optional)</span></label>
                      <CompanyInput value={background.company} pageId={background.companyPage} onChange={(n, id) => setBg({ company: n, companyPage: id })} placeholder="Where you work" testId="onboarding-company" canCreatePage={false} />
                    </div>
                    <label className="flex items-center gap-3 text-[15px] text-[#1C1712] cursor-pointer">
                      <input type="checkbox" checked={background.selfEmployed} onChange={(e) => setBg({ selfEmployed: e.target.checked })} className="h-5 w-5 rounded accent-[#32281F]" data-testid="onboarding-self-employed" />
                      I'm self-employed
                    </label>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">City</label>
                  <CityPicker value={location} testId="onboarding-city" onChange={(label) => setLocation(label)} onWaitlisted={joinRegionWaitlist} />
                  {detectedLocation && location === detectedLocation && <p className="mt-1 text-xs text-gray-400">From your resume. Edit it if it isn't right.</p>}
                </div>
                {isStudent && !educationDone ? (
                  <p className="text-sm text-[#6B625A]">
                    You can update this later.{' '}
                    <button type="button" onClick={skipEducation} className="font-semibold text-[#32281F] underline underline-offset-2 hover:text-black" data-testid="onboarding-skip-education-link">Skip for now</button>
                    {educationSkipped && <span className="block mt-1">School skipped. Choose your city, then continue.</span>}
                  </p>
                ) : (
                  <p className="text-sm text-[#6B625A]">You can update this later.</p>
                )}
              </div>
            )}

            {/* Step 3: goals and field */}
            {current === 'goals' && (
              <div className="space-y-8">
                <div data-testid="onboarding-intent">
                  <p className="text-sm font-semibold text-[#1C1712] mb-3">Your goals <span className="font-normal text-[#6B625A]">(pick any)</span></p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {intentsFor({ role }).map((it) => (
                      <OptionCard key={it.value} active={intent.includes(it.value)} onClick={() => setIntent(toggle(intent, it.value))}
                        title={it.label} description={it.tagline} icon={it.icon} testId={`intent-${it.value}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C1712] mb-3">Your field</p>
            {/* Industry */}
                <div data-testid="onboarding-industry">
                <div className="grid sm:grid-cols-2 gap-4">
                  {FIELD_OPTIONS.map((ind) => (
                    <OptionCard
                      key={ind.value}
                      active={industries.includes(ind.value)}
                      onClick={() => selectIndustry(ind.value)}
                      title={ind.label}
                      testId={`industry-${ind.value}`}
                    />
                  ))}
                </div>
                </div>

                </div>
              </div>
            )}

            {/* Step 4: profile ("Make it yours.") */}
            {current === 'profile' && (
              <div className="space-y-6" data-testid="onboarding-profile">
                {/* Photo */}
                <div className="flex items-center gap-5">
                  <label className="relative shrink-0 cursor-pointer" data-testid="onboarding-photo">
                    {profilePic
                      ? <img src={profilePic} alt="" className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover" />
                      : <span className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-[#ECEAE7] text-[#B5AEA6]"><FiUser className="h-12 w-12" /></span>}
                    <span className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#F4C430] text-[#1C1712] ring-4 ring-white">
                      {uploadingPhoto ? <span className="h-3.5 w-3.5 rounded-full border-2 border-[#1C1712] border-t-transparent animate-spin" /> : <FiPlus className="h-4 w-4" />}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={choosePhoto} disabled={uploadingPhoto} data-testid="onboarding-photo-input" />
                  </label>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-[#1C1712]">{profilePic ? 'Looking good' : 'Add a profile photo'}</p>
                    <p className="text-[#6B625A]">Help people recognise you.</p>
                    <label className="mt-1 inline-block cursor-pointer font-semibold text-[#C99A06] hover:underline">
                      {profilePic ? 'Change photo' : 'Choose photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={choosePhoto} disabled={uploadingPhoto} />
                    </label>
                    {profilePic && <button type="button" onClick={() => setProfilePic('')} className="ml-3 text-sm text-[#857B71] hover:text-black">Remove</button>}
                  </div>
                </div>

                <ResumeImport
                  variant="card"
                  onImported={(data) => {
                    if (Array.isArray(data?.skills)) setSkills(data.skills);
                    if (Array.isArray(data?.bios) && data.bios.length > 0) {
                      setBioSuggestions(data.bios);
                      if (!bio.trim()) setBio(data.bios[0]);
                    }
                    if (data?.detectedLocation) {
                      setDetectedLocation(data.detectedLocation);
                      if (!location.trim()) setLocation(data.detectedLocation);
                    }
                    if (data?.nameMismatch && data?.detectedName) {
                      setNameMismatch({ detectedName: data.detectedName, currentName: data.currentName || user?.name || '' });
                    }
                  }}
                />

                {nameMismatch && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm" data-testid="resume-name-mismatch">
                    <p className="text-black">
                      Your resume says <strong>{nameMismatch.detectedName}</strong>, but your account is registered as <strong>{nameMismatch.currentName}</strong>. Is this your resume?
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setName(nameMismatch.detectedName); setNameMismatch(null); }} className="btn-black rounded-full px-3 py-1.5 text-xs font-medium">
                        Use "{nameMismatch.detectedName}"
                      </button>
                      <button type="button" onClick={() => setNameMismatch(null)} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-black">
                        Keep "{nameMismatch.currentName}"
                      </button>
                    </div>
                  </div>
                )}

                {/* About */}
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label htmlFor="onb-bio" className="text-lg font-semibold text-[#1C1712]">About you</label>
                    <span className="text-sm text-[#857B71]">Optional</span>
                  </div>
                  <div className="relative">
                    <textarea id="onb-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={5} maxLength={500}
                      placeholder="What do you do, and what inspires your work?" data-testid="bio-input"
                      className="w-full resize-none rounded-xl border border-gray-300 bg-white p-4 pb-8 text-[15px] focus:border-[#7A6450] focus:outline-none focus:ring-2 focus:ring-[#7A6450]/20" />
                    <span className="pointer-events-none absolute bottom-3 right-4 text-sm text-[#857B71]">{bio.length}/500</span>
                  </div>
                  <p className="mt-2 text-sm text-[#6B625A]">Example: {isStudent ? 'Architecture student who loves sketching and sustainable homes.' : 'Interior designer creating thoughtful, everyday spaces.'}</p>
                  {bioSuggestions.length > 0 && (
                    <div className="mt-3 space-y-2" data-testid="bio-suggestions">
                      <p className="text-xs font-medium text-gray-500">Suggestions from your resume. Pick one, or keep editing yours.</p>
                      {bioSuggestions.map((sug, i) => (
                        <button key={i} type="button" onClick={() => setBio(sug)}
                          className={`block w-full text-left rounded-xl border p-3 text-xs transition-colors ${bio === sug ? 'border-[#F4C430] bg-[#FFF9E6]' : 'border-gray-200 hover:border-[#E0B93C]'}`}>
                          {i === 0 && <span className="mb-1 inline-block rounded-full bg-[#32281F] px-2 py-0.5 text-[10px] font-semibold text-white">Recommended</span>}
                          <span className="block text-gray-700">{sug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills: optional */}
                <div className="grid gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1712] mb-1.5">Skills <span className="font-normal text-[#857B71]">(optional)</span></label>
                    <SkillPicker skills={skills} onAdd={(skill) => setSkills((list) => [...list, skill])} inputClassName="h-12 rounded-xl border-gray-300" />
                    {skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {skills.map((sk) => (
                          <span key={sk} className="inline-flex items-center gap-1.5 rounded-full bg-[#F2EFEC] px-3 py-1.5 text-xs font-medium text-[#1C1712]">
                            {sk}
                            <button type="button" onClick={() => setSkills(skills.filter((x) => x !== sk))} aria-label={`Remove ${sk}`}><FaTimes className="text-[10px]" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="border-t border-[#EFEBE6] pt-5 text-sm text-[#6B625A]">You can edit these details anytime.</p>
              </div>
            )}
          </div>
        </div>

        )}

        {/* Actions */}
        {!regionWait && <div className="sticky bottom-0 w-full border-t border-gray-100 bg-white/95 backdrop-blur px-5 sm:px-8 py-5 sm:rounded-b-3xl">
          {step < TOTAL_STEPS - 1 ? (
            <button type="button" onClick={next} disabled={!canContinue}
              className="auth-yellow-btn disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400" data-testid="onboarding-next">
              Continue
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={saving} className="auth-yellow-btn inline-flex items-center justify-center gap-2 disabled:opacity-50" data-testid="onboarding-finish">
              {saving ? 'Saving...' : <>Finish profile <FiArrowRight className="h-5 w-5" /></>}
            </button>
          )}
        </div>}
      </div>
    </div>
  );
};

export default Onboarding;
