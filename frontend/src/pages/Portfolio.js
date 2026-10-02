import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { FiCamera, FiImage, FiPlus, FiDownload, FiX, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
// import { FiZap, FiCheck } from 'react-icons/fi'; // used by the AI tools below (switched off)
// import { Card, CardContent } from '../components/ui/card';
// import { Badge } from '../components/ui/badge';
import { API_URL } from '../config/api';
import { THEME_META, FONT_META, ACCENT_PRESETS, COLOUR_PRESETS, PALETTE_DEFAULTS, DEFAULT_CLOSING_LINE, resolveTemplate, resolveThemeKey } from '../components/portfolio/PortfolioTemplates';
import { PillFilter } from '../components/profile/ProfileShell';
import { exportPortfolioPdf } from '../utils/exportPortfolioPdf';
import { getCopy } from '../config/roleDomainCopy';

const emptyForm = { title: '', description: '', images: [], category: '', location: '', projectStatus: '' };
// Photos are uploaded a few at a time so any number can be added to a project
const UPLOAD_BATCH = 5;

const emptyLook = { background: '', textColor: '', bodyFont: '', tagline: '', aboutText: '', closingLine: '', contactInfo: '' };
const TEXT_FIELDS = [
  { key: 'tagline', label: 'Tagline', max: 160, placeholder: 'e.g. Architect designing calm, light-filled homes' },
  { key: 'aboutText', label: 'About you', max: 1200, multiline: true, placeholder: 'A few lines about you and your work. Leave empty to use your profile bio.' },
  { key: 'closingLine', label: 'Closing line', max: 120, placeholder: DEFAULT_CLOSING_LINE },
  { key: 'contactInfo', label: 'Contact shown', max: 160, placeholder: 'e.g. hello@yourstudio.com · +91 98xxx xxxxx' }
];

const Portfolio = () => {
  const { user } = useAuth();
  const copy = getCopy(user);
  const [items, setItems] = useState([]);
  const [theme, setTheme] = useState('editorial');
  const [font, setFont] = useState('playfair');
  const [accentColor, setAccentColor] = useState('#F5C518');
  const [look, setLook] = useState(emptyLook);
  const [savedLook, setSavedLook] = useState(emptyLook);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadProgress, setUploadProgress] = useState(null); // { done, total }
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [mobileTab, setMobileTab] = useState('preview');
  const [activeCategory, setActiveCategory] = useState('All');
  const captureRef = useRef(null);

  // AI tools in the portfolio are switched off for now; their code is kept below, commented out.
  // const [suggestingStyle, setSuggestingStyle] = useState(false);
  // const [starterSuggestions, setStarterSuggestions] = useState([]);
  // const [lastFeedback, setLastFeedback] = useState(null);
  // const [showAutoGenDialog, setShowAutoGenDialog] = useState(false);
  // const [autoGenBusy, setAutoGenBusy] = useState(false);
  // const [autoGenDrafts, setAutoGenDrafts] = useState([]);
  // const [autoGenSaving, setAutoGenSaving] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/portfolio/me`);
      setItems(response.data.items || []);
      setTheme(resolveThemeKey(response.data.theme));
      setFont(response.data.font || 'playfair');
      setAccentColor(response.data.accentColor || '#F5C518');
      const nextLook = { ...emptyLook, ...(response.data.look || {}) };
      setLook(nextLook);
      setSavedLook(nextLook);
      // setStarterSuggestions(response.data.starterSuggestions || []);
    } catch (error) {
      toast.error('Failed to load your portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setUploadProgress({ done: 0, total: files.length });
    let uploaded = 0;
    try {
      for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
        const batch = files.slice(i, i + UPLOAD_BATCH);
        const formData = new FormData();
        batch.forEach((f) => formData.append('images', f));
        const response = await axios.post(`${API_URL}/api/upload/multiple`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const urls = (response.data.images || []).map((img) => img.url);
        uploaded += urls.length;
        setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
        setUploadProgress({ done: uploaded, total: files.length });
      }
    } catch (error) {
      const message = error.response?.data?.message;
      const prefix = uploaded ? `${uploaded} of ${files.length} photos added. ` : '';
      toast.error(prefix + (message === 'File too large' ? 'One photo is too large — each must be under 18MB.' : 'Some photos could not be uploaded. Please try those again.'));
    } finally {
      setUploadProgress(null);
    }
  };

  const removePhoto = (url) => setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));

  /* AI tools (switched off): auto-generate drafts from photos, and suggest a style.
  const handleAutoGenFiles = async (fileList) => { ... };
  const updateAutoGenDraft = (index, patch) => { ... };
  const handleSaveAutoGenDrafts = async () => { ... };
  const handleSuggestStyle = async () => {
    setSuggestingStyle(true);
    try {
      const response = await axios.get(`${API_URL}/api/portfolio/style-suggestion`);
      const { font: suggestedFont, accentColor: suggestedColor, reason } = response.data;
      await handleFontChange(suggestedFont);
      await handleAccentChange(suggestedColor);
      toast.success(reason || 'Applied an AI-suggested style');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not generate a suggestion right now');
    } finally {
      setSuggestingStyle(false);
    }
  };
  */

  const openAddDialog = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setShowAddDialog(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      images: item.images || [],
      category: item.category || '',
      location: item.location || '',
      projectStatus: item.projectStatus || ''
    });
    setShowAddDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Give it a title');

    setSaving(true);
    try {
      if (editingItem) {
        await axios.put(`${API_URL}/api/portfolio/items/${editingItem._id}`, form);
        toast.success('Updated');
      } else {
        await axios.post(`${API_URL}/api/portfolio/items`, form);
        toast.success('Added to your portfolio');
      }
      setShowAddDialog(false);
      fetchPortfolio();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      await axios.delete(`${API_URL}/api/portfolio/items/${item._id}`);
      toast.success('Removed');
      fetchPortfolio();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const saveSetting = async (payload, label) => {
    try {
      await axios.put(`${API_URL}/api/portfolio/theme`, payload);
    } catch (error) {
      toast.error(`Failed to save ${label}`);
    }
  };

  // A new template starts from its own colours
  const handleThemeChange = (next) => {
    setTheme(next);
    setLook((l) => ({ ...l, background: '', textColor: '' }));
    setSavedLook((l) => ({ ...l, background: '', textColor: '' }));
    saveSetting({ theme: next, background: '', textColor: '' }, 'template');
  };
  const handleLookChange = (patch, label) => {
    setLook((l) => ({ ...l, ...patch }));
    setSavedLook((l) => ({ ...l, ...patch }));
    saveSetting(patch, label);
  };
  // Text is saved when the field loses focus, only if it changed
  const saveText = (key) => {
    if (look[key] === savedLook[key]) return;
    setSavedLook((l) => ({ ...l, [key]: look[key] }));
    saveSetting({ [key]: look[key] }, 'text');
  };
  const handleFontChange = (next) => { setFont(next); saveSetting({ font: next }, 'font'); };
  const handleAccentChange = (next) => { setAccentColor(next); saveSetting({ accentColor: next }, 'colour'); };

  const Template = resolveTemplate(theme);
  const existingCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const visibleItems = activeCategory === 'All' ? items : items.filter((i) => i.category === activeCategory);
  const currentFont = FONT_META.find((f) => f.key === font) || FONT_META[0];
  const firstImage = items.find((i) => i.images?.length)?.images[0];
  const palette = PALETTE_DEFAULTS[theme] || PALETTE_DEFAULTS.editorial;
  const background = look.background || palette.background;
  const textColor = look.textColor || palette.textColor;
  const bodyFont = FONT_META.find((f) => f.key === look.bodyFont);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPortfolioPdf(captureRef.current, `${user?.username || 'portfolio'}.pdf`);
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const designPanel = (
    <section className="space-y-6" data-testid="portfolio-design">
      <div>
        <p className="mb-3 text-sm font-semibold text-black">Template</p>
        <div className="grid grid-cols-2 gap-3">
          {THEME_META.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleThemeChange(t.key)}
              aria-pressed={theme === t.key}
              className={`overflow-hidden rounded-xl border-2 text-left transition ${theme === t.key ? 'border-yellow-400' : 'border-gray-200 hover:border-gray-300'}`}
              data-testid={`theme-${t.key}`}
            >
              <div className="flex h-24 items-end gap-2 p-2" style={{ backgroundColor: theme === t.key ? background : PALETTE_DEFAULTS[t.key].background }}>
                <span className="flex-1 text-sm leading-tight" style={{ fontFamily: currentFont.stack, color: theme === t.key ? textColor : PALETTE_DEFAULTS[t.key].textColor }}>Aa</span>
                {firstImage && <img src={firstImage} alt="" className="h-16 w-16 rounded object-cover" />}
              </div>
              <div className="p-2">
                <p className="text-sm font-semibold text-black">{t.label}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="portfolio-font" className="mb-2 block text-sm font-semibold text-black">Heading font</Label>
        <div className="flex items-center gap-3">
          <select
            id="portfolio-font"
            value={font}
            onChange={(e) => handleFontChange(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            {FONT_META.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <span className="text-2xl text-black" style={{ fontFamily: currentFont.stack }} aria-hidden="true">Aa</span>
        </div>
      </div>

      <div>
        <Label htmlFor="portfolio-body-font" className="mb-2 block text-sm font-semibold text-black">Text font</Label>
        <div className="flex items-center gap-3">
          <select
            id="portfolio-body-font"
            value={look.bodyFont}
            onChange={(e) => handleLookChange({ bodyFont: e.target.value }, 'text font')}
            className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">Standard</option>
            {FONT_META.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <span className="text-base text-black" style={bodyFont ? { fontFamily: bodyFont.stack } : undefined} aria-hidden="true">Text</span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-black">Colours</p>
          {(look.background || look.textColor) && (
            <button type="button" onClick={() => handleLookChange({ background: '', textColor: '' }, 'colours')} className="text-xs text-gray-500 hover:text-black hover:underline">
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(COLOUR_PRESETS[theme] || COLOUR_PRESETS.editorial).map((p) => {
            const active = background.toLowerCase() === p.background.toLowerCase() && textColor.toLowerCase() === p.textColor.toLowerCase();
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handleLookChange({ background: p.background, textColor: p.textColor }, 'colours')}
                aria-pressed={active}
                className={`flex h-12 items-center justify-center rounded-lg border-2 text-xs font-semibold transition ${active ? 'border-black' : 'border-gray-200 hover:border-gray-300'}`}
                style={{ backgroundColor: p.background, color: p.textColor }}
                data-testid={`palette-${p.label}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="color"
              value={background}
              onChange={(e) => handleLookChange({ background: e.target.value }, 'background')}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-0"
              aria-label="Background colour"
              data-testid="pf-background"
            />
            Background
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="color"
              value={textColor}
              onChange={(e) => handleLookChange({ textColor: e.target.value }, 'text colour')}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-0"
              aria-label="Text colour"
              data-testid="pf-text-color"
            />
            Text
          </label>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-black">Accent colour</p>
        <div className="flex flex-wrap items-center gap-3">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleAccentChange(c)}
              className={`h-9 w-9 rounded-full border-2 transition ${accentColor.toLowerCase() === c.toLowerCase() ? 'scale-110 border-black' : 'border-gray-200'}`}
              style={{ backgroundColor: c }}
              aria-label={`Accent ${c}`}
              data-testid={`accent-${c}`}
            />
          ))}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => handleAccentChange(e.target.value)}
            className="h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-gray-200 p-0"
            title="Custom colour"
            aria-label="Custom colour"
          />
        </div>
      </div>

      <div className="space-y-3" data-testid="portfolio-text">
        <p className="text-sm font-semibold text-black">Text</p>
        {TEXT_FIELDS.map((f) => {
          const Field = f.multiline ? Textarea : Input;
          return (
            <div key={f.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <Label htmlFor={`pf-text-${f.key}`} className="text-xs text-gray-600">{f.label}</Label>
                <span className="text-[11px] text-gray-400">{look[f.key].length}/{f.max}</span>
              </div>
              <Field
                id={`pf-text-${f.key}`}
                value={look[f.key]}
                maxLength={f.max}
                placeholder={f.placeholder}
                onChange={(e) => setLook((l) => ({ ...l, [f.key]: e.target.value }))}
                onBlur={() => saveText(f.key)}
                className={f.multiline ? 'min-h-24 text-sm' : 'text-sm'}
              />
            </div>
          );
        })}
        <p className="text-xs text-gray-400">Changes save when you leave a field.</p>
      </div>
    </section>
  );

  const projectsPanel = (
    <section data-testid="portfolio-projects">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-black">Projects ({items.length})</p>
        <button type="button" onClick={openAddDialog} className="inline-flex items-center gap-1 text-sm font-semibold text-black hover:underline">
          <FiPlus /> Add work
        </button>
      </div>
      {items.length === 0 && !loading && <p className="text-sm text-gray-500">No projects yet. Add your first {copy.workNoun}.</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item._id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
            {item.images?.[0] ? (
              <img src={item.images[0]} alt="" className="h-12 w-14 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded bg-gray-100"><FiImage className="text-gray-400" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-black">{item.title}</p>
              <p className="text-xs text-gray-500">{item.images?.length || 0} photo{item.images?.length === 1 ? '' : 's'}</p>
            </div>
            <button type="button" onClick={() => openEditDialog(item)} className="p-2 text-gray-500 hover:text-black" aria-label={`Edit ${item.title}`}><FiEdit2 /></button>
            <button type="button" onClick={() => handleDelete(item)} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Remove ${item.title}`}><FiTrash2 /></button>
          </li>
        ))}
      </ul>
    </section>
  );

  const previewPanel = (
    <section className="min-w-0" data-testid="portfolio-preview">
      {existingCategories.length > 0 && (
        <div className="mb-4">
          <PillFilter options={['All', ...existingCategories]} active={activeCategory} onChange={setActiveCategory} />
        </div>
      )}
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FiImage className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="mb-4 text-gray-500">Add your first {copy.workNoun} to see your portfolio here.</p>
          <Button onClick={openAddDialog} className="bg-yellow-400 font-semibold text-black hover:bg-yellow-500">{copy.portfolioAddLabel}</Button>
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
          <div ref={captureRef}>
            <Template
              items={visibleItems}
              user={user}
              headline={user?.portfolio?.headline}
              editable
              onEdit={openEditDialog}
              onDelete={handleDelete}
              onAdd={openAddDialog}
              font={font}
              accentColor={accentColor}
              look={look}
            />
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <TopBar />
      <div className="mt-16 p-4 sm:p-6 lg:ml-64 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-black sm:text-3xl">Portfolio maker</h1>
            <p className="text-gray-600">{copy.portfolioSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user?.username && (
              <a href={`/portfolio/${user.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50">
                <FiEye /> Preview
              </a>
            )}
            <Button onClick={handleExport} disabled={exporting || items.length === 0} variant="outline" className="flex items-center gap-2">
              <FiDownload />{exporting ? 'Exporting...' : 'Export as PDF'}
            </Button>
            {/* AI tool, switched off:
            <Button onClick={() => setShowAutoGenDialog(true)} variant="outline"><FiZap />Auto-generate from photos</Button> */}
            <Button onClick={openAddDialog} className="flex items-center gap-2 bg-yellow-400 font-semibold text-black hover:bg-yellow-500">
              <FiPlus />{copy.portfolioAddLabel}
            </Button>
          </div>
        </div>

        {/* Phone: Projects / Design / Preview tabs */}
        <div className="mb-4 flex border-b border-gray-200 lg:hidden" role="tablist">
          {[['projects', 'Projects'], ['design', 'Design'], ['preview', 'Preview']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mobileTab === id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 border-b-2 py-3 text-sm font-semibold ${mobileTab === id ? 'border-yellow-400 text-black' : 'border-transparent text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`space-y-8 rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-24 lg:block lg:self-start ${mobileTab === 'preview' ? 'hidden' : ''}`}>
            <div className={mobileTab === 'projects' ? 'hidden lg:block' : ''}>{designPanel}</div>
            <div className={mobileTab === 'design' ? 'hidden lg:block' : ''}>{projectsPanel}</div>
          </aside>
          <div className={mobileTab === 'preview' ? '' : 'hidden lg:block'}>{previewPanel}</div>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${copy.workNoun}` : `Add ${copy.workNoun}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-2 space-y-4">
            <div>
              <Label htmlFor="pf-title">Title</Label>
              <Input id="pf-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pf-category">Category</Label>
                <Input id="pf-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="category-suggestions" placeholder="e.g. Residential" />
                <datalist id="category-suggestions">
                  {existingCategories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="pf-status">Status</Label>
                <Input id="pf-status" value={form.projectStatus} onChange={(e) => setForm({ ...form, projectStatus: e.target.value })} placeholder="e.g. Completed, 2026" />
              </div>
            </div>
            <div>
              <Label htmlFor="pf-location">Location</Label>
              <Input id="pf-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Pune, India" />
            </div>
            <div>
              <Label htmlFor="pf-description">Description</Label>
              <Textarea id="pf-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24" />
            </div>
            <div>
              <Label>Photos {form.images.length > 0 && <span className="font-normal text-gray-500">({form.images.length})</span>}</Label>
              <div className="mt-1 flex flex-wrap gap-3">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => { handleImageFiles(e.target.files); e.target.value = ''; }} className="hidden" />
                  <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-yellow-400">
                    <FiCamera />Take Photo
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple onChange={(e) => { handleImageFiles(e.target.files); e.target.value = ''; }} className="hidden" data-testid="pf-photo-input" />
                  <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-yellow-400">
                    <FiImage />Upload from Gallery
                  </div>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">Add as many photos as you like • Max 18MB each • JPG, PNG, GIF, WebP</p>
              {uploadProgress && <p className="mt-2 text-xs text-gray-600">Uploading {uploadProgress.done} of {uploadProgress.total}…</p>}
              {form.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.images.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="h-16 w-16 rounded-md object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white"
                        aria-label="Remove photo"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving || !!uploadProgress} className="w-full bg-black text-white">
              {saving ? 'Saving...' : editingItem ? 'Save changes' : `Add ${copy.workNoun}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI tools, switched off: "Auto-generate from photos" dialog, the "Suggest a style for me"
          button, resume-based starter suggestions and the "AI take" feedback dialog. Restore from
          git history (commit before this change) when the AI features come back. */}
    </div>
  );
};

export default Portfolio;
