import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiUploadCloud, FiFileText, FiUpload, FiBookOpen, FiBriefcase } from 'react-icons/fi';
import { API_URL } from '../config/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import MonthYearPicker from './MonthYearPicker';
import CompanyLogo from './company/CompanyLogo';

const yearOptions = () => {
  const now = new Date().getFullYear();
  return Array.from({ length: now + 8 - 1960 + 1 }, (_, i) => now + 8 - i);
};
// "Bachelor of Architecture", "B. Arch" and "B.Arch" are the same degree
const DEGREE_WORDS = [[/bachelors? of architecture/, 'barch'], [/masters? of architecture/, 'march'], [/bachelors? of design/, 'bdes'], [/masters? of design/, 'mdes'],
  [/bachelors? of technology/, 'btech'], [/masters? of technology/, 'mtech'], [/bachelors? of engineering/, 'be'], [/masters? of engineering/, 'me'],
  [/bachelors? of planning/, 'bplan'], [/masters? of planning/, 'mplan'], [/masters? of business administration/, 'mba']];
const degreeKey = (d) => {
  let v = String(d || '').toLowerCase();
  for (const [re, key] of DEGREE_WORDS) v = v.replace(re, key);
  return v.replace(/[^a-z0-9]/g, '');
};
const schoolKey = (s) => String(s || '').toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '');
// Same school, and the same degree (or one of them has no degree)
const sameEntry = (a, b) => schoolKey(a.school) === schoolKey(b.school)
  && (!degreeKey(a.degree) || !degreeKey(b.degree) || degreeKey(a.degree) === degreeKey(b.degree));

/**
 * Education found in a resume, shown for review: each entry can be corrected
 * or left out before it's added to the profile. Entries already on the
 * profile (same school and degree) are skipped.
 */
const EducationReview = ({ entries, onClose, onSaved }) => {
  const [rows, setRows] = useState(() => entries.map((e) => ({ ...e, keep: true })));
  const [saving, setSaving] = useState(false);

  // Entries already on the profile start unticked and say so
  useEffect(() => {
    axios.get(`${API_URL}/api/profile/me`).then(({ data }) => {
      const current = data.user?.education || [];
      setRows((list) => list.map((r) => (current.some((c) => sameEntry(c, r)) ? { ...r, keep: false, existing: true } : r)));
    }).catch(() => {});
  }, []);
  const set = (i, key) => (e) => setRows((list) => list.map((r, j) => (j === i ? { ...r, [key]: key === 'keep' ? e.target.checked : e.target.value } : r)));
  const chosen = rows.filter((r) => r.keep && (r.school.trim() || r.degree.trim()));

  const save = async () => {
    const bad = chosen.find((r) => r.startYear && r.endYear && Number(r.endYear) < Number(r.startYear));
    if (bad) return toast.error(`End year is before the start year for ${bad.school || bad.degree}`);
    setSaving(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/profile/me`);
      const current = data.user?.education || [];
      const added = chosen
        .filter((r) => !current.some((c) => sameEntry(c, r)))
        .map((r) => ({
          school: r.school.trim(), degree: r.degree.trim(), field: r.field.trim(),
          duration: r.startYear && r.endYear ? `${r.startYear} – ${r.endYear}` : String(r.startYear || r.endYear || '')
        }));
      if (!added.length) {
        toast('That education is already on your profile');
        onClose();
        return;
      }
      const next = [...current, ...added];
      await axios.put(`${API_URL}/api/profile/update`, { education: next });
      toast.success(`Added ${added.length} education ${added.length === 1 ? 'entry' : 'entries'} to your profile`);
      onSaved?.(next);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save your education');
    } finally {
      setSaving(false);
    }
  };

  const field = 'h-10 w-full rounded-lg border border-[#E6E1DB] bg-white px-3 text-sm outline-none focus:border-[#E0B93C]';
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="education-review">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FiBookOpen className="text-[#C9A227]" />Education found in your resume</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-gray-500">Check each entry, correct anything that's wrong, and untick what you don't want. Nothing is added until you save.</p>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className={`rounded-xl border p-3 ${r.keep ? 'border-[#F1DFA8] bg-[#FFFBEF]' : 'border-gray-200 bg-gray-50 opacity-60'}`} data-testid={`edu-review-${i}`}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#1C1712]">
                <input type="checkbox" checked={r.keep} onChange={set(i, 'keep')} className="accent-[#32281F]" />Add this entry
                {r.existing && <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600" data-testid={`edu-review-existing-${i}`}>Already on your profile</span>}
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-gray-600 sm:col-span-2">School / university
                  <input value={r.school} onChange={set(i, 'school')} maxLength={150} className={field} data-testid={`edu-review-school-${i}`} /></label>
                <label className="text-xs text-gray-600">Degree
                  <input value={r.degree} onChange={set(i, 'degree')} maxLength={100} className={field} /></label>
                <label className="text-xs text-gray-600">Field of study
                  <input value={r.field} onChange={set(i, 'field')} maxLength={100} className={field} /></label>
                <label className="text-xs text-gray-600">Start year
                  <select value={r.startYear || ''} onChange={set(i, 'startYear')} className={field}>
                    <option value="">—</option>
                    {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
                  </select></label>
                <label className="text-xs text-gray-600">End year (or expected)
                  <select value={r.endYear || ''} onChange={set(i, 'endYear')} className={field}>
                    <option value="">—</option>
                    {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
                  </select></label>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">Skip</button>
          <button type="button" onClick={save} disabled={saving || chosen.length === 0} className="rounded-lg bg-[#32281F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid="edu-review-save">
            {saving ? 'Saving…' : `Add ${chosen.length || ''} to profile`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Upload a resume/CV (PDF/DOCX) → backend parses it and auto-fills skills.
 * Calls onImported(data) where data = { skills, parsed } so the parent can
 * prefill its fields. A LinkedIn "Save to PDF" export works here too.
 */
const expKey = (e) => `${String(e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${String(e.company || e.page?.name || '').toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '')}`;

/**
 * Work experience found in a resume, shown for review: role, company (with its
 * BeeBark page logo when matched), place, months and description can be
 * corrected or left out. Entries already on the profile are skipped.
 */
const ExperienceReview = ({ entries, onClose, onSaved }) => {
  const [rows, setRows] = useState(() => entries.map((e) => ({ ...e, keep: true })));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    axios.get(`${API_URL}/api/profile/me`).then(({ data }) => {
      const keys = new Set((data.user?.experience || []).map(expKey));
      setRows((list) => list.map((r) => (keys.has(expKey(r)) ? { ...r, keep: false, existing: true } : r)));
    }).catch(() => {});
  }, []);
  const set = (i, key, value) => setRows((list) => list.map((r, j) => (j === i ? { ...r, [key]: value, ...(key === 'company' && r.page && value !== r.page.name ? { page: null, companyPage: '' } : {}) } : r)));
  const chosen = rows.filter((r) => r.keep && (r.title.trim() || r.company.trim()));
  const full = (v) => /^\d{4}-\d{2}$/.test(v || '');

  const save = async () => {
    const bad = chosen.find((r) => !full(r.startDate) || (!r.current && !full(r.endDate)) || (!r.current && r.endDate < r.startDate));
    if (bad) return toast.error(`Check the dates for ${bad.title || bad.company}: choose the start and end month, or tick "Current job"`);
    setSaving(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/profile/me`);
      const current = (data.user?.experience || []).map(({ page, _id, ...e }) => ({ ...e, companyPage: e.companyPage?._id || e.companyPage || page?._id || undefined }));
      const keys = new Set(current.map(expKey));
      const added = chosen.filter((r) => !keys.has(expKey(r))).map((r) => ({
        title: r.title.trim(), company: r.company.trim(), location: (r.location || '').trim(),
        startDate: r.startDate, endDate: r.current ? '' : r.endDate, current: !!r.current,
        description: (r.description || '').trim(), ...(r.companyPage ? { companyPage: r.companyPage } : {})
      }));
      if (!added.length) { toast('That experience is already on your profile'); onClose(); return; }
      const res = await axios.put(`${API_URL}/api/profile/update`, { experience: [...current, ...added] });
      toast.success(`Added ${added.length} experience ${added.length === 1 ? 'entry' : 'entries'} to your profile`);
      onSaved?.(res.data.user?.experience || [...current, ...added]);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save your experience');
    } finally {
      setSaving(false);
    }
  };

  const field = 'h-10 w-full rounded-lg border border-[#E6E1DB] bg-white px-3 text-sm outline-none focus:border-[#E0B93C]';
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="experience-review">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FiBriefcase className="text-[#C9A227]" />Experience found in your resume</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-gray-500">Check each job, correct anything that's wrong, and untick what you don't want. Nothing is added until you save.</p>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className={`rounded-xl border p-3 ${r.keep ? 'border-[#F1DFA8] bg-[#FFFBEF]' : 'border-gray-200 bg-gray-50 opacity-60'}`} data-testid={`exp-review-${i}`}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#1C1712]">
                <input type="checkbox" checked={r.keep} onChange={(e) => set(i, 'keep', e.target.checked)} className="accent-[#32281F]" />Add this job
                {r.existing && <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600" data-testid={`exp-review-existing-${i}`}>Already on your profile</span>}
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-gray-600">Role / title
                  <input value={r.title} onChange={(e) => set(i, 'title', e.target.value)} maxLength={120} className={field} data-testid={`exp-review-title-${i}`} /></label>
                <label className="text-xs text-gray-600">Company
                  <div className="flex items-center gap-2">
                    {r.page && <CompanyLogo page={r.page} className="h-10 w-10 shrink-0" text="text-xs" />}
                    <input value={r.company} onChange={(e) => set(i, 'company', e.target.value)} maxLength={120} className={field} data-testid={`exp-review-company-${i}`} />
                  </div>
                  {r.page && <span className="mt-0.5 block text-[11px] text-green-700" data-testid={`exp-review-page-${i}`}>Linked to {r.page.name}'s BeeBark page</span>}
                </label>
                <label className="text-xs text-gray-600 sm:col-span-2">Location
                  <input value={r.location || ''} onChange={(e) => set(i, 'location', e.target.value)} maxLength={120} className={field} /></label>
                <MonthYearPicker label="Start date" value={r.startDate || ''} max={new Date().toISOString().slice(0, 7)} onChange={(v) => set(i, 'startDate', v)} testId={`exp-review-start-${i}`} />
                <MonthYearPicker label="End date" value={r.current ? '' : (r.endDate || '')} disabled={r.current} min={full(r.startDate) ? r.startDate : ''} max={new Date().toISOString().slice(0, 7)} placeholder={r.current ? '' : 'Not set'} onChange={(v) => set(i, 'endDate', v)} testId={`exp-review-end-${i}`} />
                <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                  <input type="checkbox" checked={!!r.current} onChange={(e) => set(i, 'current', e.target.checked)} className="accent-[#32281F]" />Current job
                </label>
                <label className="text-xs text-gray-600 sm:col-span-2">Description
                  <textarea value={r.description || ''} onChange={(e) => set(i, 'description', e.target.value)} rows={3} maxLength={2000} className="w-full rounded-lg border border-[#E6E1DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#E0B93C]" /></label>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">Skip</button>
          <button type="button" onClick={save} disabled={saving || chosen.length === 0} className="rounded-lg bg-[#32281F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid="exp-review-save">
            {saving ? 'Saving…' : `Add ${chosen.length || ''} to profile`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ResumeImport = ({ onImported, onEducationSaved, onExperienceSaved, variant = 'button' }) => {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [education, setEducation] = useState(null); // entries found in the resume, to review
  const [experience, setExperience] = useState(null); // shown after the education review

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('resume', file);
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/profile/import-resume`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const count = res.data?.parsed?.skills?.length || 0;
      toast.success(count ? `Imported ${count} skill${count === 1 ? '' : 's'} from your resume` : 'Resume imported');
      onImported?.(res.data);
      if (res.data?.educationEntries?.length) setEducation(res.data.educationEntries);
      if (res.data?.experienceEntries?.length) setExperience(res.data.experienceEntries);
    } catch (error) {
      const data = error.response?.data;
      const message = data?.reason ? `${data.error} — ${data.reason}` : data?.error;
      toast.error(message || 'Could not read that file');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // Education first, then experience
  const review = education ? (
    <EducationReview entries={education.map((e) => ({ school: e.school || '', degree: e.degree || '', field: e.field || '', startYear: e.startYear || '', endYear: e.endYear || '' }))}
      onClose={() => setEducation(null)} onSaved={onEducationSaved} />
  ) : experience && (
    <ExperienceReview entries={experience.map((e) => ({ title: e.title || '', company: e.company || '', location: e.location || '', startDate: e.startDate || '', endDate: e.endDate || '', current: !!e.current, description: e.description || '', companyPage: e.companyPage || '', page: e.page || null }))}
      onClose={() => setExperience(null)} onSaved={onExperienceSaved} />
  );

  // Onboarding: a card with the import button on the side
  if (variant === 'card') {
    return (
      <>
      {review}
      <div className="flex items-center gap-4 rounded-2xl border border-[#F3E2A8] bg-[#FFF9E6] p-4 sm:p-5" data-testid="resume-import-card">
        <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={handleFile} className="hidden" data-testid="resume-import-input" />
        <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FCEFC4] text-[#1C1712]"><FiFileText className="h-6 w-6" /></span>
        <span className="hidden sm:block h-12 w-px bg-[#F0DFA6]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1C1712]">Have a resume?</p>
          <p className="text-sm text-[#6B625A]">Save time. Autofill your details.</p>
        </div>
        <div className="shrink-0 text-center">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} data-testid="resume-import-button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#1C1712] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1C1712] hover:bg-[#FFFDF5] disabled:opacity-50">
            <FiUpload className="h-4 w-4" />{loading ? 'Reading…' : 'Import resume'}
          </button>
          <p className="mt-1 text-xs text-[#857B71]">PDF or DOCX</p>
        </div>
      </div>
      </>
    );
  }

  return (
    <div>
      {review}
      <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={handleFile} className="hidden" data-testid="resume-import-input" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:border-yellow-400 hover:bg-yellow-50 transition-colors disabled:opacity-50"
        data-testid="resume-import-button"
      >
        <FiUploadCloud className="text-base" />
        {loading ? 'Reading resume…' : 'Import from resume (PDF / DOCX)'}
      </button>
      <p className="mt-1 text-xs text-gray-400 text-center">Auto-fills your skills, education and experience. A LinkedIn “Save to PDF” export works too.</p>
    </div>
  );
};

export default ResumeImport;
