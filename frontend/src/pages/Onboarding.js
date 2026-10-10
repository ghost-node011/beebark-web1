import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import ImageUpload from '../components/ImageUpload';
import ResumeImport from '../components/ResumeImport';
import { ROLES } from '../config/roles';
import { intentsFor, INDUSTRIES } from '../config/onboarding';
import { AutocompleteInput, LocationInput } from '../components/AutocompleteInput';
import CompanyInput from '../components/company/CompanyInput';
import SkillPicker from '../components/SkillPicker';
import { SuggestChip, useSuggestChip } from '../components/ai/SuggestChip';

const TOTAL_STEPS = 4;

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
  const { user, updateOnboarding } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState(user?.role && ['student', 'professional'].includes(user.role) ? user.role : '');
  const firstJob = (user?.experience || []).find((e) => e.current) || {};
  const firstSchool = (user?.education || [])[0] || {};
  const [background, setBackground] = useState({
    title: firstJob.title || '', company: firstJob.company || '', companyPage: firstJob.companyPage || null, selfEmployed: false,
    school: firstSchool.school || '', field: firstSchool.field || '', gradYear: ''
  });
  const setBg = (patch) => setBackground((b) => ({ ...b, ...patch }));
  const [intent, setIntent] = useState(user?.intent || []);
  const [industries, setIndustries] = useState(user?.industries || []);
  const [industriesOther, setIndustriesOther] = useState(user?.industriesOther || '');
  const domainSuggest = useSuggestChip('professional industry/domain');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [bioSuggestions, setBioSuggestions] = useState([]);
  const [location, setLocation] = useState(user?.location || '');
  const [detectedLocation, setDetectedLocation] = useState('');
  const [nameMismatch, setNameMismatch] = useState(null);
  const [skills, setSkills] = useState(user?.skills || []);
  const [checkingField, setCheckingField] = useState(false);

  const selectIndustry = (value) => {
    if (value === 'related') {
      setIndustries((prev) => (prev.includes('related') ? [] : ['related']));
    } else {
      setIndustries((prev) => toggle(prev.filter((v) => v !== 'related'), value));
    }
  };

  // True while the "What field?" suggestion chip is showing something the
  // user hasn't acted on yet (accept, accept an alternative, or dismiss).
  const industryOtherUnresolved =
    step === 2 &&
    industries.includes('related') &&
    !!industriesOther.trim() &&
    domainSuggest.original === industriesOther &&
    !!domainSuggest.suggestion &&
    (domainSuggest.suggestion.relevant === false || domainSuggest.suggestion.changed || domainSuggest.suggestion.alternatives?.length > 0);

  const isStudent = role === 'student';
  const backgroundDone = isStudent
    ? !!background.school.trim() && !!background.field.trim()
    : !!background.title.trim();

  const canContinue =
    ((step === 0 && !!role) ||
      (step === 1 && backgroundDone) ||
      (step === 2 && intent.some((v) => intentsFor({ role }).some((i) => i.value === v)) && industries.length > 0) ||
      step === 3) &&
    !industryOtherUnresolved;

  const next = async () => {
    if (!canContinue) return;
    if (step === 2 && industries.includes('related') && industriesOther.trim()) {
      let result = domainSuggest.suggestion;
      if (domainSuggest.original !== industriesOther) {
        setCheckingField(true);
        result = await domainSuggest.check(industriesOther);
        setCheckingField(false);
      }
      // Block Continue until the user acts on a pending suggestion — either
      // accept it (which clears it) or dismiss it to keep their own text.
      const unresolved = !!result && (result.relevant === false || result.changed || result.alternatives?.length > 0);
      if (unresolved) return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setSaving(true);
    try {
      const bg = isStudent
        ? { school: background.school.trim(), field: background.field.trim(), gradYear: background.gradYear }
        : { title: background.title.trim(), company: background.company.trim(), companyPage: background.companyPage || undefined, selfEmployed: background.selfEmployed };
      await updateOnboarding({ role, background: bg, intent: intent.filter((v) => intentsFor({ role }).some((i) => i.value === v)), industries, industriesOther, bio, location, skills, profilePic, name, complete: true });
      toast.success("You're all set!");
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const STEP_META = [
    { title: 'What best describes you?', subtitle: "We'll tailor BeeBark to your journey." },
    isStudent
      ? { title: 'Where are you studying?', subtitle: 'Connect with people in your field.' }
      : { title: 'Tell us about your work', subtitle: 'Start with your current or most recent role.' },
    { title: 'What brings you here?', subtitle: 'Pick your goals and the fields you work in.' },
    { title: 'Complete your profile', subtitle: 'Help others recognise you. You can skip this for now.' }
  ];
  const meta = STEP_META[step];
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
            <span className="text-sm text-[#6B625A] whitespace-nowrap" data-testid="onboarding-step">Step {step + 1} of {TOTAL_STEPS}</span>
          </div>
          <div className="mt-5 h-2 w-full rounded-full bg-[#EFECE8] overflow-hidden">
            <div className="h-full rounded-full bg-[#F4C430] transition-all duration-500 ease-out" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="flex-1 px-5 sm:px-8 py-8 animate-fadeIn" key={step}>
          <h1 className="text-center text-[28px] sm:text-[32px] font-bold leading-tight text-[#1C1712]">{meta.title}</h1>
          <p className="mt-2 text-center text-[#6B625A]">{meta.subtitle}</p>

          <div className="mt-8">
            {/* Step 1: who you are */}
            {step === 0 && (
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
            {step === 1 && (
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
                      <AutocompleteInput field="title" value={background.title} onChange={(v) => setBg({ title: v })} placeholder="e.g. Architect, contractor, property consultant" className={fieldClass} data-testid="onboarding-title" />
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
                <p className="text-sm text-[#6B625A]">You can update this later.</p>
              </div>
            )}

            {/* Step 3: goals and field */}
            {step === 2 && (
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
                  {INDUSTRIES.map((ind) => (
                    <OptionCard
                      key={ind.value}
                      active={industries.includes(ind.value)}
                      onClick={() => selectIndustry(ind.value)}
                      title={ind.label}
                      description={ind.value === 'related' ? "None of the above? Choose this instead" : undefined}
                      testId={`industry-${ind.value}`}
                    />
                  ))}
                </div>
                {industries.includes('related') && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-black mb-1">What field?</label>
                    <input
                      type="text"
                      value={industriesOther}
                      onChange={(e) => { setIndustriesOther(e.target.value); if (domainSuggest.suggestion) domainSuggest.dismiss(); }}
                      onBlur={(e) => domainSuggest.check(e.target.value)}
                      placeholder="e.g. Product Design, Quantity Surveying, Facilities Management"
                      className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-[#7A6450] focus:outline-none"
                      data-testid="industry-other-input"
                    />
                    {domainSuggest.suggestion?.relevant === false && domainSuggest.original === industriesOther && (
                      <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="industry-other-warning">
                        {domainSuggest.suggestion.relevantReason || "This doesn't look like a real professional field. BeeBark is built for architecture, interiors, construction, real estate and closely adjacent fields — please enter one to continue."}
                      </div>
                    )}
                    <SuggestChip
                      suggestion={domainSuggest.suggestion}
                      onAccept={(corrected) => { setIndustriesOther(corrected); domainSuggest.dismiss(); }}
                      onAcceptAlternative={(alt) => { setIndustriesOther(alt); domainSuggest.dismiss(); }}
                      onDismiss={domainSuggest.dismiss}
                    />
                  </div>
                )}
                </div>

                </div>
              </div>
            )}

            {/* Step 4: profile */}
            {step === 3 && (
              <div className="mx-auto max-w-xl space-y-6" data-testid="onboarding-profile">
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-black mb-2">Have a resume? Skip the typing.</p>
                  <ResumeImport
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
                </div>

                {nameMismatch && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm" data-testid="resume-name-mismatch">
                    <p className="text-black">
                      Your resume says <strong>{nameMismatch.detectedName}</strong>, but your account is registered as <strong>{nameMismatch.currentName}</strong>. Is this your resume?
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { setName(nameMismatch.detectedName); setNameMismatch(null); }}
                        className="btn-black rounded-full px-3 py-1.5 text-xs font-medium"
                      >
                        Use "{nameMismatch.detectedName}"
                      </button>
                      <button
                        type="button"
                        onClick={() => setNameMismatch(null)}
                        className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-black"
                      >
                        Keep "{nameMismatch.currentName}"
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-black mb-2">Profile photo</label>
                  {profilePic ? (
                    <div className="flex items-center gap-4">
                      <img src={profilePic} alt="Profile" className="h-20 w-20 rounded-full object-cover border" />
                      <button type="button" onClick={() => setProfilePic('')} className="text-sm text-gray-500 hover:text-black">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <ImageUpload onUploadComplete={(url) => setProfilePic(url)} endpoint="/api/upload/profile-photo" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="A short line about what you do"
                    className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-[#7A6450] focus:outline-none resize-none"
                    data-testid="bio-input"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">{bio.length}/500</p>
                  {bioSuggestions.length > 0 && (
                    <div className="mt-2 space-y-2" data-testid="bio-suggestions">
                      <p className="text-xs font-medium text-gray-500">AI suggestions from your resume — pick one, or keep editing yours</p>
                      {bioSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setBio(s)}
                          className={`block w-full text-left rounded-xl border-2 p-3 text-xs transition-colors ${bio === s ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'}`}
                        >
                          {i === 0 && (
                            <span className="mb-1 inline-block rounded-full bg-[#32281F] px-2 py-0.5 text-[10px] font-semibold text-white">
                              Recommended
                            </span>
                          )}
                          <span className="block text-gray-700">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Location</label>
                  <LocationInput
                    value={location}
                    onChange={setLocation}
                    placeholder="Start typing your city"
                    className="w-full rounded-xl border-2 border-gray-200 h-auto p-3 text-sm focus:border-[#7A6450] focus-visible:ring-0"
                    data-testid="location-input"
                  />
                  {detectedLocation && location === detectedLocation && (
                    <p className="mt-1 text-xs text-gray-400">Detected from your resume — edit if this isn't right.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Skills / interests</label>
                  <SkillPicker skills={skills} onAdd={(skill) => setSkills((list) => [...list, skill])} inputClassName="h-12 rounded-xl border-2 border-gray-200 focus-visible:ring-0 focus-visible:border-yellow-400" />
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 bg-yellow-100 text-black text-xs font-medium px-3 py-1.5 rounded-full">
                          {s}
                          <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                            <FaTimes className="text-[10px]" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 w-full border-t border-gray-100 bg-white/95 backdrop-blur px-5 sm:px-8 py-5 sm:rounded-b-3xl">
          {industryOtherUnresolved && (
            <p className="mb-2 text-xs font-medium text-red-600" data-testid="onboarding-blocked-reason">
              {domainSuggest.suggestion?.relevant === false
                ? "Not matching with our domain. If you're looking for this industry to connect with people, you can join as a customer instead."
                : 'Not matching with our domain — confirm or dismiss the suggestion above to continue.'}
            </p>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button type="button" onClick={next} disabled={!canContinue || checkingField}
              className="auth-yellow-btn disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400" data-testid="onboarding-next">
              {checkingField ? 'Checking...' : 'Continue'}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button type="button" onClick={finish} disabled={saving} className="text-sm text-[#6B625A] hover:text-black disabled:opacity-50 shrink-0">Skip for now</button>
              <button type="button" onClick={finish} disabled={saving} className="auth-yellow-btn disabled:opacity-50" data-testid="onboarding-finish">
                {saving ? 'Saving...' : 'Finish'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
