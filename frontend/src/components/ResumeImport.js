import React, { useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiUploadCloud } from 'react-icons/fi';
import { API_URL } from '../config/api';

/**
 * Upload a resume/CV (PDF/DOCX) → backend parses it and auto-fills skills.
 * Calls onImported(data) where data = { skills, parsed } so the parent can
 * prefill its fields. A LinkedIn "Save to PDF" export works here too.
 */
const ResumeImport = ({ onImported }) => {
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
