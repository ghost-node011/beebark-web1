import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { FaCheck, FaArrowLeft, FaTimes } from 'react-icons/fa';
import ImageUpload from '../components/ImageUpload';
import ResumeImport from '../components/ResumeImport';
import { ROLES } from '../config/roles';
import { intentsFor, INDUSTRIES } from '../config/onboarding';
import { LocationInput } from '../components/AutocompleteInput';
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
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? 'bg-yellow-400 text-black' : 'bg-yellow-100 text-black group-hover:bg-yellow-200'}`}>
        <Icon className="text-lg" />
      </span>
    )}
    <span className="flex-1">
      <span className="block text-base font-semibold text-black">{title}</span>
      {description && <span className="mt-0.5 block text-sm text-gray-500">{description}</span>}
    </span>
    <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${active ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-gray-300 text-transparent'}`}>
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
  const [skillInput, setSkillInput] = useState('');
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

  const canContinue =
    ((step === 0 && !!role) ||
      (step === 1 && intent.some((v) => intentsFor({ role }).some((i) => i.value === v))) ||
      (step === 2 && industries.length > 0) ||
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
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setSkillInput('');
  };

  const handleSkillKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateOnboarding({ role, intent: intent.filter((v) => intentsFor({ role }).some((i) => i.value === v)), industries, industriesOther, bio, location, skills, profilePic, name, complete: true });
      toast.success("You're all set!");
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const STEP_META = [
    { title: 'What best describes you?', subtitle: 'This personalizes your BeeBark experience.' },
    { title: 'What brings you to BeeBark?', subtitle: 'Select all that apply.' },
    { title: 'Your industry focus', subtitle: 'Choose the fields you work in or care about.' },
    { title: 'Complete your profile', subtitle: 'Help others recognize you — you can skip this for now.' }
  ];

  const meta = STEP_META[step];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top progress bar */}
      <div className="w-full px-5 pt-8">
        <div className="mx-auto max-w-3xl">
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-3xl animate-fadeIn" key={step}>
          <h1 className="text-center text-3xl sm:text-4xl font-bold text-black">{meta.title}</h1>
          <p className="mt-3 text-center text-gray-500">{meta.subtitle}</p>

          <div className="mt-10">
            {/* Step 1 — Role (single select) */}
            {step === 0 && (
              <div className="grid sm:grid-cols-2 gap-4" data-testid="onboarding-role">
                {ROLES.map((r) => (
                  <OptionCard
                    key={r.value}
                    active={role === r.value}
                    onClick={() => setRole(r.value)}
                    title={r.label}
                    description={r.tagline}
                    icon={r.icon}
                    testId={`role-${r.value}`}
                  />
                ))}
              </div>
            )}

            {/* Step 2 — Intent (multi select) */}
            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-4" data-testid="onboarding-intent">
                {intentsFor({ role }).map((it) => (
                  <OptionCard
                    key={it.value}
                    active={intent.includes(it.value)}
                    onClick={() => setIntent(toggle(intent, it.value))}
                    title={it.label}
                    description={it.tagline}
                    icon={it.icon}
                    testId={`intent-${it.value}`}
                  />
                ))}
              </div>
            )}

            {/* Step 3 — Industry (multi select) */}
            {step === 2 && (
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
                      className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-yellow-400 focus:outline-none"
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
            )}

            {/* Step 4 — Profile */}
            {step === 3 && (
              <div className="mx-auto max-w-xl space-y-6" data-testid="onboarding-profile">
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-black mb-2">Have a résumé? Skip the typing.</p>
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
                      Your résumé says <strong>{nameMismatch.detectedName}</strong>, but your account is registered as <strong>{nameMismatch.currentName}</strong>. Is this your résumé?
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
                    className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-yellow-400 focus:outline-none resize-none"
                    data-testid="bio-input"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">{bio.length}/500</p>
                  {bioSuggestions.length > 0 && (
                    <div className="mt-2 space-y-2" data-testid="bio-suggestions">
                      <p className="text-xs font-medium text-gray-500">AI suggestions from your résumé — pick one, or keep editing yours</p>
                      {bioSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setBio(s)}
                          className={`block w-full text-left rounded-xl border-2 p-3 text-xs transition-colors ${bio === s ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'}`}
                        >
                          {i === 0 && (
                            <span className="mb-1 inline-block rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-semibold text-black">
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
                    className="w-full rounded-xl border-2 border-gray-200 h-auto p-3 text-sm focus:border-yellow-400 focus-visible:ring-0"
                    data-testid="location-input"
                  />
                  {detectedLocation && location === detectedLocation && (
                    <p className="mt-1 text-xs text-gray-400">Detected from your résumé — edit if this isn't right.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Skills / interests</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKey}
                      placeholder="Type a skill and press Enter"
                      className="flex-1 rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-yellow-400 focus:outline-none"
                      data-testid="skill-input"
                    />
                    <button type="button" onClick={addSkill} className="btn-black rounded-xl px-4 text-sm">Add</button>
                  </div>
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
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 w-full border-t border-gray-100 bg-white/90 backdrop-blur px-5 py-5">
        {industryOtherUnresolved && (
          <p className="mx-auto max-w-3xl mb-2 text-xs font-medium text-red-600" data-testid="onboarding-blocked-reason">
            {domainSuggest.suggestion?.relevant === false
              ? "Not matching with our domain. If you're looking for this industry to connect with people, you can join as a customer instead."
              : "Not matching with our domain — confirm or dismiss the suggestion above to continue."}
          </p>
        )}
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          {step > 0 ? (
            <button type="button" onClick={back} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black px-2 shrink-0">
              <FaArrowLeft className="text-xs" /> Back
            </button>
          ) : (
            <span className="w-12" />
          )}

          {step === 3 && (
            <button type="button" onClick={finish} disabled={saving} className="text-sm text-gray-500 hover:text-black disabled:opacity-50 shrink-0">
              Skip for now
            </button>
          )}

          <div className="flex-1" />

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue || checkingField}
              className="w-full max-w-xs rounded-full bg-yellow-400 py-3.5 font-semibold text-black transition-all hover:bg-yellow-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              data-testid="onboarding-next"
            >
              {checkingField ? 'Checking...' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="w-full max-w-xs rounded-full bg-yellow-400 py-3.5 font-semibold text-black transition-all hover:bg-yellow-500 disabled:opacity-50"
              data-testid="onboarding-finish"
            >
              {saving ? 'Saving...' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
