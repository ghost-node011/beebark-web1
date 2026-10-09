import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiCamera, FiX, FiPlus } from 'react-icons/fi';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { LocationInput } from '../AutocompleteInput';
import { API_URL } from '../../config/api';
import { PAGE_TYPE_LABELS, TEAM_SIZE_OPTIONS } from '../../context/PagesContext';
import { checkPhone, checkYear, digitsOnly } from '../../utils/validation';

export const EMPTY_PAGE = {
  name: '', slug: '', type: '', tagline: '', about: '', logo: '', cover: '', website: '', email: '', phone: '',
  locations: [], teamSize: '', founded: '', specialties: []
};

export const slugify = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
  .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Problems that stop a save, keyed by field
export const pageErrors = (form) => {
  const out = {};
  if (form.name.trim().length < 2) out.name = 'Add the company name';
  if (!form.type) out.type = 'Choose what kind of company this is';
  if (slugify(form.slug).length < 2) out.slug = 'Choose a page address';
  const phone = checkPhone(form.phone).error;
  if (phone) out.phone = phone;
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) out.email = 'Enter a valid email';
  const year = checkYear(form.founded, { allowFuture: 0 });
  if (year) out.founded = year;
  return out;
};

const SPECIALTY_HINTS = {
  architecture_firm: ['Residential', 'Commercial', 'Hospitality', 'Master planning', 'Sustainable design', 'Restoration'],
  interior_firm: ['Residential interiors', 'Office interiors', 'Retail', 'Hospitality', 'Furniture design', 'Turnkey projects'],
  real_estate: ['Residential projects', 'Commercial spaces', 'Plots', 'Leasing', 'Resale', 'Property management'],
  supplier: ['Natural stone', 'Tiles', 'Cladding', 'Cement', 'Steel', 'Sanitaryware', 'Lighting', 'Hardware'],
  construction: ['Civil works', 'Turnkey construction', 'MEP', 'Waterproofing', 'Fit-outs', 'Project management'],
  consultancy: ['Structural', 'MEP consulting', 'Project management', 'Cost consulting', 'Green building'],
  education: ['Architecture', 'Interior design', 'Planning', 'Workshops'],
  other: []
};

/** Upload one image and return its URL */
const uploadImage = async (file) => {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP image');
  const body = new FormData();
  body.append('image', file);
  const res = await axios.post(`${API_URL}/api/upload/image`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.url;
};

/**
 * Fields of a company Page (create and edit). `form`/`setForm` are owned by the parent.
 * `showErrors` turns on the red messages after a failed save.
 */
const PageForm = ({ form, setForm, showErrors = false, pageId = null }) => {
  const [slugTouched, setSlugTouched] = useState(!!form.slug);
  const [slugState, setSlugState] = useState(null); // null | 'checking' | 'free' | 'taken'
  const [locDraft, setLocDraft] = useState('');
  const [specDraft, setSpecDraft] = useState('');
  const [uploading, setUploading] = useState('');
  const errors = showErrors ? pageErrors(form) : {};
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // The address follows the name until it's edited by hand
  useEffect(() => {
    if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, slugTouched, setForm]);

  useEffect(() => {
    const slug = slugify(form.slug);
    if (slug.length < 2) { setSlugState(null); return undefined; }
    setSlugState('checking');
    const t = setTimeout(() => {
      axios.get(`${API_URL}/api/companies/check-slug`, { params: { slug, except: pageId || undefined }, silent: true })
        .then((res) => setSlugState(res.data.available ? 'free' : 'taken'))
        .catch(() => setSlugState(null));
    }, 350);
    return () => clearTimeout(t);
  }, [form.slug, pageId]);

  const pickImage = (key) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(key);
    try {
      set(key)(await uploadImage(file));
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Upload failed');
    } finally {
      setUploading('');
    }
  };

  const addLocation = (v) => {
    const loc = String(v || '').trim();
    if (!loc || form.locations.includes(loc) || form.locations.length >= 10) { setLocDraft(''); return; }
    set('locations')([...form.locations, loc]);
    setLocDraft('');
  };
  const addSpecialty = (v) => {
    const s = String(v || '').trim().slice(0, 60);
    if (!s || form.specialties.some((x) => x.toLowerCase() === s.toLowerCase()) || form.specialties.length >= 20) { setSpecDraft(''); return; }
    set('specialties')([...form.specialties, s]);
    setSpecDraft('');
  };

  const err = (k) => errors[k] && <p className="mt-1 text-xs text-red-600" data-testid={`page-${k}-error`}>{errors[k]}</p>;
  const bad = (k) => (errors[k] ? 'border-red-400' : '');
  const hints = (SPECIALTY_HINTS[form.type] || []).filter((h) => !form.specialties.includes(h));

  return (
    <div className="space-y-5">
      {/* Cover + logo */}
      <div>
        <Label>Cover and logo</Label>
        <div className="mt-1.5 relative h-32 sm:h-40 rounded-xl overflow-hidden border border-gray-200"
          style={form.cover ? { backgroundImage: `url(${form.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(120deg, #c89a5b 0%, #8a6136 38%, #3b2a1c 75%, #1f1812 100%)' }}>
          <label className="absolute top-2 right-2 cursor-pointer rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/75" data-testid="page-cover-upload">
            <FiCamera className="inline w-3.5 h-3.5 mr-1" />{uploading === 'cover' ? 'Uploading…' : form.cover ? 'Change cover' : 'Add cover'}
            <input type="file" accept="image/*" className="hidden" onChange={pickImage('cover')} />
          </label>
          <label className="absolute left-3 bottom-3 cursor-pointer" data-testid="page-logo-upload" title="Upload logo">
            {form.logo
              ? <img src={form.logo} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-[3px] border-white bg-white" />
              : <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-[3px] border-white bg-white/90 flex flex-col items-center justify-center text-[11px] text-gray-600"><FiCamera className="w-5 h-5 mb-0.5" />{uploading === 'logo' ? '…' : 'Logo'}</span>}
            <input type="file" accept="image/*" className="hidden" onChange={pickImage('logo')} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="page-name">Company name *</Label>
          <Input id="page-name" value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={120} placeholder="e.g. Form Studio" className={bad('name')} data-testid="page-name" />
          {err('name')}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="page-slug">Page address *</Label>
          <div className={`mt-1 flex items-center rounded-md border bg-white ${errors.slug || slugState === 'taken' ? 'border-red-400' : 'border-input'}`}>
            <span className="pl-3 text-sm text-gray-500 whitespace-nowrap">beebark/c/</span>
            <input id="page-slug" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug')(slugify(e.target.value)); }} maxLength={60}
              className="flex-1 min-w-0 h-10 bg-transparent px-1 text-sm outline-none" data-testid="page-slug" />
            <span className="pr-3 text-xs whitespace-nowrap" aria-live="polite">
              {slugState === 'checking' && <span className="text-gray-400">Checking…</span>}
              {slugState === 'free' && <span className="text-green-700">Available</span>}
              {slugState === 'taken' && <span className="text-red-600">Taken</span>}
            </span>
          </div>
          {err('slug')}
        </div>
        <div>
          <Label htmlFor="page-type">Type of company *</Label>
          <select id="page-type" value={form.type} onChange={(e) => set('type')(e.target.value)} className={`mt-1 h-10 w-full rounded-md border bg-white px-2 text-sm ${errors.type ? 'border-red-400' : 'border-input'}`} data-testid="page-type">
            <option value="">Choose…</option>
            {Object.entries(PAGE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {err('type')}
        </div>
        <div>
          <Label htmlFor="page-size">Company size</Label>
          <select id="page-size" value={form.teamSize} onChange={(e) => set('teamSize')(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-white px-2 text-sm" data-testid="page-size">
            <option value="">Choose…</option>
            {TEAM_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} employees</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="page-tagline">Tagline</Label>
          <Input id="page-tagline" value={form.tagline} onChange={(e) => set('tagline')(e.target.value)} maxLength={160} placeholder="e.g. Architecture & Interiors · Designing thoughtful spaces" data-testid="page-tagline" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="page-about">About</Label>
          <Textarea id="page-about" value={form.about} onChange={(e) => set('about')(e.target.value)} maxLength={3000} rows={5} spellCheck placeholder="What you do, who you work with, what makes you different." data-testid="page-about" />
        </div>
      </div>

      <div>
        <Label>{form.type === 'supplier' ? 'Products and categories' : 'Specialties'}</Label>
        <div className="mt-1 flex gap-2">
          <Input value={specDraft} onChange={(e) => setSpecDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(specDraft); } }} placeholder="Type and press Enter" maxLength={60} data-testid="page-specialty" />
          <button type="button" onClick={() => addSpecialty(specDraft)} className="shrink-0 rounded-md border border-input px-3 text-sm"><FiPlus /></button>
        </div>
        {hints.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hints.map((h) => <button key={h} type="button" onClick={() => addSpecialty(h)} className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-gray-600 hover:border-black hover:text-black">+ {h}</button>)}
          </div>
        )}
        {form.specialties.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-black">
                {s}<button type="button" onClick={() => set('specialties')(form.specialties.filter((x) => x !== s))} aria-label={`Remove ${s}`}><FiX className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Locations</Label>
        <div className="mt-1 flex gap-2">
          <LocationInput value={locDraft} onChange={setLocDraft} onPick={addLocation} wrapperClassName="flex-1" placeholder="City, e.g. Delhi" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation(locDraft); } }} data-testid="page-location" />
          <button type="button" onClick={() => addLocation(locDraft)} className="shrink-0 rounded-md border border-input px-3 text-sm"><FiPlus /></button>
        </div>
        {form.locations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.locations.map((l, i) => (
              <span key={l} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-black">
                {l}{i === 0 && <span className="text-gray-500">· main</span>}
                <button type="button" onClick={() => set('locations')(form.locations.filter((x) => x !== l))} aria-label={`Remove ${l}`}><FiX className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="page-website">Website</Label>
          <Input id="page-website" value={form.website} onChange={(e) => set('website')(e.target.value)} maxLength={200} placeholder="yourcompany.com" data-testid="page-website" />
        </div>
        <div>
          <Label htmlFor="page-founded">Year founded</Label>
          <Input id="page-founded" value={form.founded} onChange={(e) => set('founded')(digitsOnly(e.target.value))} inputMode="numeric" maxLength={4} placeholder="e.g. 2012" className={bad('founded')} data-testid="page-founded" />
          {err('founded')}
        </div>
        <div>
          <Label htmlFor="page-email">Contact email</Label>
          <Input id="page-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} maxLength={120} placeholder="hello@yourcompany.com" className={bad('email')} data-testid="page-email" />
          {err('email')}
        </div>
        <div>
          <Label htmlFor="page-phone">Phone</Label>
          <Input id="page-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} maxLength={16} placeholder="+91 98765 43210" className={bad('phone')} data-testid="page-phone" />
          {err('phone')}
        </div>
      </div>
    </div>
  );
};

export default PageForm;
