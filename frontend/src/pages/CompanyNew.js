import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { FiArrowLeft, FiMapPin, FiUsers, FiPlus } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import PageForm, { EMPTY_PAGE, pageErrors, slugify } from '../components/company/PageForm';
import { API_URL } from '../config/api';
import { usePages, PAGE_TYPE_LABELS, TEAM_SIZE_OPTIONS } from '../context/PagesContext';
import { useAuth } from '../context/AuthContext';
import CompanyLogo from '../components/company/CompanyLogo';
import { PAGE_BG } from '../components/profile/ProfileShell';

// Create a company Page (like LinkedIn's "Create a Company Page")
const CompanyNew = () => {
  const navigate = useNavigate();
  const { refreshPages, setActingAs } = usePages();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  // "Turn my business into a page": start from the details already on the profile
  const [form, setForm] = useState(() => {
    const b = user?.business || {};
    if (searchParams.get('from') !== 'business' || !b.name) return EMPTY_PAGE;
    const typeText = `${b.type || ''} ${(b.services || []).join(' ')}`;
    const type = /real\s*estate|realty|developer/i.test(typeText) ? 'real_estate' : /interior/i.test(typeText) ? 'interior_firm'
      : /architect/i.test(typeText) ? 'architecture_firm' : /supplier|manufactur|material/i.test(typeText) ? 'supplier'
        : /construct|contract|builder/i.test(typeText) ? 'construction' : '';
    return {
      ...EMPTY_PAGE, name: b.name, type, about: b.about || '', website: b.website || '', founded: /^\d{4}$/.test(b.founded || '') ? b.founded : '',
      teamSize: TEAM_SIZE_OPTIONS.includes(b.teamSize) ? b.teamSize : '', specialties: (b.services || []).slice(0, 20), locations: b.address ? [b.address] : []
    };
  });
  const [confirmed, setConfirmed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    const errors = pageErrors(form);
    if (Object.keys(errors).length) {
      setShowErrors(true);
      toast.error(Object.values(errors)[0]);
      return;
    }
    if (!confirmed) { toast.error('Please confirm you can act for this company'); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/api/companies`, { ...form, slug: slugify(form.slug), confirmed: true });
      await refreshPages();
      setActingAs(res.data.page._id);
      toast.success(`${res.data.page.name} is live`);
      navigate(`/company/${res.data.page.slug}/admin`, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not create the page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${PAGE_BG}`} data-testid="company-new">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm pf-muted hover:text-[#2b2622]"><FiArrowLeft />Back</Link>
          <h1 className="mt-3 pf-serif text-3xl sm:text-4xl font-bold text-[#2b2622]">Create a company page</h1>
          <p className="mt-1 pf-muted max-w-2xl">Firms, studios, developers and suppliers get a page people can follow. Your team can add it to their Experience, and you can post jobs as the company.</p>

          <form onSubmit={create} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="pf-card p-5 sm:p-8">
              <PageForm form={form} setForm={setForm} showErrors={showErrors} />
              <label className="mt-6 flex items-start gap-3 rounded-xl bg-[#f6f3ef] p-4 text-sm text-[#3a322b] cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-yellow-500" data-testid="page-confirm" />
                <span>I confirm that I work at or represent this company and may create and manage its page on BeeBark.</span>
              </label>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-[#2b2622] text-white hover:bg-black" data-testid="page-create">{saving ? 'Creating…' : 'Create page'}</Button>
              </div>
            </div>

            {/* Live preview */}
            <aside className="lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wide pf-muted mb-2">Page preview</p>
              <div className="pf-card overflow-hidden">
                <div className="h-24" style={form.cover ? { backgroundImage: `url(${form.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(120deg, #c89a5b 0%, #8a6136 38%, #3b2a1c 75%, #1f1812 100%)' }} />
                <div className="px-5 pb-5">
                  <div className="-mt-8"><CompanyLogo page={{ name: form.name || 'Company', logo: form.logo }} className="w-16 h-16 border-[3px] border-white" text="text-xl" /></div>
                  <p className="mt-2 pf-serif text-xl font-bold text-[#2b2622] break-words">{form.name || 'Company name'}</p>
                  <p className="text-sm pf-muted">{form.tagline || 'Tagline'}</p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs pf-muted">
                    {form.type && <span>{PAGE_TYPE_LABELS[form.type]}</span>}
                    {form.locations[0] && <span className="inline-flex items-center gap-1"><FiMapPin />{form.locations[0]}</span>}
                    {form.teamSize && <span className="inline-flex items-center gap-1"><FiUsers />{form.teamSize}</span>}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#F6D46B] px-4 py-2 text-sm font-semibold text-[#2b2622]"><FiPlus />Follow</span>
                </div>
              </div>
            </aside>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyNew;
