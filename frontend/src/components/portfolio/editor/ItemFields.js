import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiFileText, FiPlus, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { API_URL } from '../../../config/api';

export const PRICE_UNITS = [
  ['', 'No unit'], ['piece', 'per piece'], ['sqft', 'per sq ft'], ['sqm', 'per sq m'], ['rft', 'per running ft'],
  ['kg', 'per kg'], ['bag', 'per bag'], ['ton', 'per ton'], ['set', 'per set']
];
export const AVAILABILITY = [['', 'Not shown'], ['in_stock', 'In stock'], ['made_to_order', 'Made to order'], ['out_of_stock', 'Out of stock']];
const SPEC_QUICK = ['Material', 'Dimensions', 'Thickness', 'Finish', 'Warranty', 'Standard/IS code'];
const MAX_SPECS = 20;

export const STORY_FIELDS = [
  { key: 'summary', label: 'Summary', help: 'Start your project by giving context: what, where, for whom.' },
  { key: 'contribution', label: 'My contribution', help: 'What was your role? What did you do yourself?' },
  { key: 'process', label: 'Process', help: 'How did you approach it? Keep it short and to the point.' },
  { key: 'outcome', label: 'Outcome', help: 'What was built, delivered or learned?' }
];

// Form fields for the extra item data, and how they map to/from the API
export const emptyExtra = {
  kind: 'project', captions: {}, section: '',
  story: { summary: '', contribution: '', process: '', outcome: '' },
  sku: '', specs: [], finishes: [], sizes: [], priceFrom: '', priceTo: '', priceUnit: '',
  moq: '', leadTime: '', availability: '', brochureUrl: '', brochureName: ''
};

export const extraFromItem = (item) => ({
  kind: item.kind === 'product' ? 'product' : 'project',
  // Captions are kept per photo URL while editing so reordering/removing photos keeps them attached
  captions: Object.fromEntries((item.images || []).map((url, i) => [url, item.captions?.[i] || ''])),
  section: item.section || '',
  story: { ...emptyExtra.story, ...(item.story || {}) },
  sku: item.sku || '',
  specs: (item.specs || []).map((s) => ({ label: s.label || '', value: s.value || '' })),
  finishes: item.finishes || [],
  sizes: item.sizes || [],
  priceFrom: item.priceFrom ?? '',
  priceTo: item.priceTo ?? '',
  priceUnit: item.priceUnit || '',
  moq: item.moq || '',
  leadTime: item.leadTime || '',
  availability: item.availability || '',
  brochureUrl: item.brochureUrl || '',
  brochureName: ''
});

export const extraToPayload = (form) => {
  const isProduct = form.kind === 'product';
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    kind: form.kind,
    captions: form.images.map((url) => (form.captions[url] || '').trim()),
    section: form.section.trim(),
    story: form.story,
    sku: isProduct ? form.sku : '',
    specs: isProduct ? form.specs.filter((s) => s.label.trim() || s.value.trim()) : [],
    finishes: isProduct ? form.finishes : [],
    sizes: isProduct ? form.sizes : [],
    priceFrom: isProduct ? num(form.priceFrom) : null,
    priceTo: isProduct ? num(form.priceTo) : null,
    priceUnit: isProduct ? form.priceUnit : '',
    moq: isProduct ? form.moq : '',
    leadTime: isProduct ? form.leadTime : '',
    availability: isProduct ? form.availability : '',
    brochureUrl: isProduct ? form.brochureUrl : ''
  };
};

const selectClass = 'h-10 w-full rounded-md border border-input bg-white px-3 text-sm';

export const KindSwitch = ({ value, onChange }) => (
  <div>
    <Label className="mb-1 block">This is a</Label>
    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1" role="radiogroup" aria-label="This is a">
      {[['project', 'Project'], ['product', 'Product']].map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${value === key ? 'bg-black text-white' : 'text-gray-600 hover:text-black'}`}
          data-testid={`pf-kind-${key}`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

export const StoryFields = ({ story, onChange }) => (
  <div className="space-y-3 rounded-lg border border-gray-200 p-3" data-testid="pf-story">
    <div>
      <p className="text-sm font-semibold text-black">Tell the story</p>
      <p className="text-xs text-gray-500">Short answers work best. Anything left empty isn't shown.</p>
    </div>
    {STORY_FIELDS.map((f) => (
      <div key={f.key}>
        <div className="mb-1 flex items-baseline justify-between">
          <Label htmlFor={`pf-story-${f.key}`} className="text-xs text-gray-700">{f.label}</Label>
          <span className="text-[11px] text-gray-400">{story[f.key].length}/2000</span>
        </div>
        <Textarea
          id={`pf-story-${f.key}`}
          value={story[f.key]}
          maxLength={2000}
          placeholder={f.help}
          onChange={(e) => onChange({ ...story, [f.key]: e.target.value })}
          className="min-h-20 text-sm"
          data-testid={`pf-story-${f.key}`}
        />
      </div>
    ))}
  </div>
);

// Type a value and press Enter (or comma) to add it as a chip
export const ChipInput = ({ id, label, values, onChange, placeholder, testId }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const next = draft.split(',').map((v) => v.trim().slice(0, 60)).filter(Boolean).filter((v) => !values.includes(v));
    if (next.length) onChange([...values, ...next].slice(0, 30));
    setDraft('');
  };
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {values.length > 0 && (
        <div className="mb-2 mt-1 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-3 pr-1 text-xs text-black">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-black" aria-label={`Remove ${v}`}>
                <FiX className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
        data-testid={testId}
      />
    </div>
  );
};

const SpecsEditor = ({ specs, onChange }) => {
  const update = (index, patch) => onChange(specs.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const used = new Set(specs.map((s) => s.label.trim().toLowerCase()));
  const quick = SPEC_QUICK.filter((q) => !used.has(q.toLowerCase()));
  const full = specs.length >= MAX_SPECS;
  return (
    <div data-testid="pf-specs">
      <Label>Specifications</Label>
      <div className="mt-1 space-y-2">
        {specs.map((s, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
            <Input value={s.label} maxLength={80} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Material" aria-label={`Specification ${i + 1} name`} data-testid={`pf-spec-label-${i}`} />
            <Input value={s.value} maxLength={80} onChange={(e) => update(i, { value: e.target.value })} placeholder="e.g. Vitrified porcelain" aria-label={`Specification ${i + 1} value`} data-testid={`pf-spec-value-${i}`} />
            <button type="button" onClick={() => onChange(specs.filter((_, j) => j !== i))} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Remove specification ${i + 1}`}>
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" disabled={full} onClick={() => onChange([...specs, { label: '', value: '' }])} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-black hover:bg-gray-50 disabled:opacity-40" data-testid="pf-add-spec">
          <FiPlus className="h-3 w-3" />Add row
        </button>
        {!full && quick.map((q) => (
          <button key={q} type="button" onClick={() => onChange([...specs, { label: q, value: '' }])} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 hover:text-black">
            + {q}
          </button>
        ))}
      </div>
      {full && <p className="mt-1 text-xs text-gray-400">Up to {MAX_SPECS} rows.</p>}
    </div>
  );
};

const BrochureUpload = ({ url, name, onChange }) => {
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error('Choose a PDF file');
    if (file.size > 18 * 1024 * 1024) return toast.error('The brochure must be under 18 MB');
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await axios.post(`${API_URL}/api/upload/chat-files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploaded = res.data.files?.[0];
      if (!uploaded?.url) throw new Error('No file');
      onChange(uploaded.url, uploaded.name || file.name);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not upload the brochure');
    } finally {
      setBusy(false);
    }
  };
  const fileName = name || (url ? decodeURIComponent(url.split('/').pop().split('?')[0]) : '');
  return (
    <div>
      <Label>Brochure (PDF)</Label>
      {url ? (
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 p-2" data-testid="pf-brochure">
          <FiFileText className="h-5 w-5 shrink-0 text-gray-500" />
          <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-black hover:underline">{fileName || 'Brochure'}</a>
          <button type="button" onClick={() => onChange('', '')} className="p-1 text-gray-500 hover:text-red-600" aria-label="Remove brochure" data-testid="pf-brochure-remove">
            <FiX className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-yellow-400">
          <input type="file" accept="application/pdf" className="hidden" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} data-testid="pf-brochure-input" />
          <FiUpload />{busy ? 'Uploading…' : 'Upload a PDF brochure'}
        </label>
      )}
    </div>
  );
};

export const ProductFields = ({ form, setForm }) => {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const priceInput = (key, label, testId) => (
    <div>
      <Label htmlFor={`pf-${key}`}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₹</span>
        <Input
          id={`pf-${key}`}
          value={form[key]}
          inputMode="decimal"
          onChange={(e) => set({ [key]: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })}
          className="pl-7"
          placeholder="0"
          data-testid={testId}
        />
      </div>
    </div>
  );
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-3" data-testid="pf-product-fields">
      <p className="text-sm font-semibold text-black">Product details</p>
      <div>
        <Label htmlFor="pf-sku">SKU / product code</Label>
        <Input id="pf-sku" value={form.sku} maxLength={60} onChange={(e) => set({ sku: e.target.value })} placeholder="e.g. TL-6060-MAT" data-testid="pf-sku" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {priceInput('priceFrom', 'Price from', 'pf-price-from')}
        {priceInput('priceTo', 'Price to', 'pf-price-to')}
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="pf-price-unit">Unit</Label>
          <select id="pf-price-unit" value={form.priceUnit} onChange={(e) => set({ priceUnit: e.target.value })} className={selectClass} data-testid="pf-price-unit">
            {PRICE_UNITS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="pf-moq">Minimum order</Label>
          <Input id="pf-moq" value={form.moq} maxLength={60} onChange={(e) => set({ moq: e.target.value })} placeholder="e.g. 100 sq ft" data-testid="pf-moq" />
        </div>
        <div>
          <Label htmlFor="pf-lead-time">Lead time</Label>
          <Input id="pf-lead-time" value={form.leadTime} maxLength={60} onChange={(e) => set({ leadTime: e.target.value })} placeholder="e.g. 7–10 days" data-testid="pf-lead-time" />
        </div>
      </div>
      <div>
        <Label htmlFor="pf-availability">Availability</Label>
        <select id="pf-availability" value={form.availability} onChange={(e) => set({ availability: e.target.value })} className={selectClass} data-testid="pf-availability">
          {AVAILABILITY.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <ChipInput id="pf-finishes" label="Finishes" values={form.finishes} onChange={(finishes) => set({ finishes })} placeholder="e.g. Matt, Glossy — press Enter to add" testId="pf-finishes" />
      <ChipInput id="pf-sizes" label="Sizes" values={form.sizes} onChange={(sizes) => set({ sizes })} placeholder="e.g. 600×600 mm — press Enter to add" testId="pf-sizes" />
      <SpecsEditor specs={form.specs} onChange={(specs) => set({ specs })} />
      <BrochureUpload url={form.brochureUrl} name={form.brochureName} onChange={(brochureUrl, brochureName) => set({ brochureUrl, brochureName })} />
    </div>
  );
};
