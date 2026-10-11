import React, { useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiUploadCloud, FiFileText, FiUpload } from 'react-icons/fi';
import { API_URL } from '../config/api';

/**
 * Upload a resume/CV (PDF/DOCX) → backend parses it and auto-fills skills.
 * Calls onImported(data) where data = { skills, parsed } so the parent can
 * prefill its fields. A LinkedIn "Save to PDF" export works here too.
 */
const ResumeImport = ({ onImported, variant = 'button' }) => {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      const data = error.response?.data;
      const message = data?.reason ? `${data.error} — ${data.reason}` : data?.error;
      toast.error(message || 'Could not read that file');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // Onboarding: a card with the import button on the side
  if (variant === 'card') {
    return (
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
    );
  }

  return (
    <div>
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
      <p className="mt-1 text-xs text-gray-400 text-center">Auto-fills your skills. A LinkedIn “Save to PDF” export works too.</p>
    </div>
  );
};

export default ResumeImport;
