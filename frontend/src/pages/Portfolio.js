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
import { FiCamera, FiImage, FiPlus, FiDownload, FiX, FiEye, FiEdit2, FiTrash2, FiArrowUp, FiArrowDown, FiStar, FiShare2, FiFileText, FiMonitor, FiSmartphone } from 'react-icons/fi';
// import { FiZap, FiCheck } from 'react-icons/fi'; // used by the AI tools below (switched off)
// import { Card, CardContent } from '../components/ui/card';
// import { Badge } from '../components/ui/badge';
import { API_URL } from '../config/api';
import { AutocompleteInput, LocationInput } from '../components/AutocompleteInput';
import { THEME_META, FONT_META, ACCENT_PRESETS, COLOUR_PRESETS, PALETTE_DEFAULTS, DEFAULT_CLOSING_LINE, resolveTemplate, resolveThemeKey, ProjectViewer, PROJECT_VIEWER_DIALOG_CLASS } from '../components/portfolio/PortfolioTemplates';
import ShareMenu from '../components/ShareMenu';
import { PillFilter } from '../components/profile/ProfileShell';
import { exportPortfolioPdf } from '../utils/exportPortfolioPdf';
import { SkeletonCards } from '../components/Skeletons';
import { getCopy } from '../config/roleDomainCopy';
import { emptyExtra, extraFromItem, extraToPayload, KindSwitch, StoryFields, ProductFields } from '../components/portfolio/editor/ItemFields';
import { ModeToggle, TemplateGallery, PageToggles, templatesFor } from '../components/portfolio/editor/TemplateGallery';
import DeviceFrame from '../components/portfolio/editor/DeviceFrame';
import PdfImportDialog from '../components/portfolio/editor/PdfImportDialog';

const BASE_FIELDS = ['title', 'description', 'images', 'category', 'location', 'projectStatus', 'role', 'year'];
const emptyForm = { title: '', description: '', images: [], category: '', location: '', projectStatus: '', role: '', year: '', ...emptyExtra };
// Photos are uploaded a few at a time so any number can be added to a project
const UPLOAD_BATCH = 5;

const emptyLook = { background: '', textColor: '', bodyFont: '', tagline: '', aboutText: '', closingLine: '', contactInfo: '' };
const TEXT_FIELDS = [
  { key: 'tagline', label: 'Tagline', max: 160, placeholder: 'e.g. Architect designing calm, light-filled homes' },
  { key: 'aboutText', label: 'About you', max: 1200, multiline: true, placeholder: 'A few lines about you and your work. Leave empty to use your profile bio.' },
  { key: 'closingLine', label: 'Closing line', max: 120, placeholder: DEFAULT_CLOSING_LINE },
  { key: 'contactInfo', label: 'Contact shown', max: 160, placeholder: 'e.g. hello@yourstudio.com · +91 98xxx xxxxx' }
];

// One-tap chips for values already used (instead of a browser dropdown arrow)
const QuickPicks = ({ options, value, onPick }) => {
  const list = (options || []).filter((o) => o && o.toLowerCase() !== String(value || '').trim().toLowerCase()).slice(0, 8);
  if (!list.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {list.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600 hover:border-black hover:text-black">{o}</button>
      ))}
    </div>
  );
};

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
  // The project dialog shows a project first ('view') and switches to the form ('form') to edit
  const [dialogMode, setDialogMode] = useState('form');
  const [viewingId, setViewingId] = useState(null);
  const [viewerPhoto, setViewerPhoto] = useState(0);
  const [exporting, setExporting] = useState(false);
  // Phones open on the project list (the part you manage); desktops show everything
  const [mobileTab, setMobileTab] = useState('projects');
  const [activeCategory, setActiveCategory] = useState('All');
  // 'catalogue' turns the portfolio into a product catalogue
  const [mode, setMode] = useState('portfolio');
  const [pages, setPages] = useState({ showCv: true, showContact: true });
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
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
      setMode(response.data.mode === 'catalogue' ? 'catalogue' : 'portfolio');
      setPages({ showCv: response.data.showCv !== false, showContact: response.data.showContact !== false });
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
  // The first photo is the project's cover
  const makeCover = (url) => setForm((f) => ({ ...f, images: [url, ...f.images.filter((u) => u !== url)] }));

  // Swap a project with its neighbour; the top project is the featured one
  const moveItem = async (index, step) => {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const previous = items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await axios.put(`${API_URL}/api/portfolio/order`, { ids: next.map((i) => i._id) });
    } catch (error) {
      setItems(previous);
      toast.error('Could not save the new order');
    }
  };

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
    setViewingId(null);
    // Suppliers mostly add products
    setForm({ ...emptyForm, kind: mode === 'catalogue' ? 'product' : 'project' });
    setDialogMode('form');
    setShowAddDialog(true);
  };

  // Clicking a project shows it first; editing is one step away
  const openViewer = (item, photo = 0) => {
    setViewingId(item._id);
    setViewerPhoto(photo);
    setDialogMode('view');
    setShowAddDialog(true);
  };

  const openEditDialog = (item) => {
    setViewingId(item._id);
    setDialogMode('form');
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      images: item.images || [],
      category: item.category || '',
      location: item.location || '',
      projectStatus: item.projectStatus || '',
      role: item.role || '',
      year: item.year || '',
      ...extraFromItem(item)
    });
    setShowAddDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Give it a title');

    const payload = { ...Object.fromEntries(BASE_FIELDS.map((k) => [k, form[k]])), ...extraToPayload(form) };
    setSaving(true);
    try {
      if (editingItem) {
        const response = await axios.put(`${API_URL}/api/portfolio/items/${editingItem._id}`, payload);
        const updated = response.data?.item;
        if (updated) setItems((list) => list.map((i) => (i._id === updated._id ? updated : i)));
        toast.success('Updated');
        // Back to the project, now showing the saved changes
        setEditingItem(null);
        setViewerPhoto(0);
        setDialogMode('view');
        if (!updated) fetchPortfolio();
        return;
      }
      await axios.post(`${API_URL}/api/portfolio/items`, payload);
      toast.success('Added to your portfolio');
      setShowAddDialog(false);
      fetchPortfolio();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Leaving the form returns to the project when it was opened from there
  const cancelEdit = () => {
    if (viewingId && items.some((i) => i._id === viewingId)) {
      setEditingItem(null);
      setDialogMode('view');
    } else {
      setShowAddDialog(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      await axios.delete(`${API_URL}/api/portfolio/items/${item._id}`);
      toast.success('Removed');
      if (item._id === viewingId || item._id === editingItem?._id) setShowAddDialog(false);
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
  // Switching mode keeps the template if it suits the new mode, otherwise picks the first one that does
  const handleModeChange = (next) => {
    setMode(next);
    const available = templatesFor(THEME_META, next);
    if (available.length && !available.some((t) => t.key === theme)) {
      setTheme(available[0].key);
      setLook((l) => ({ ...l, background: '', textColor: '' }));
      setSavedLook((l) => ({ ...l, background: '', textColor: '' }));
      saveSetting({ mode: next, theme: available[0].key, background: '', textColor: '' }, 'mode');
    } else {
      saveSetting({ mode: next }, 'mode');
    }
  };
  const handlePagesChange = (patch) => {
    setPages((p) => ({ ...p, ...patch }));
    saveSetting(patch, 'pages');
  };
  const handleFontChange = (next) => { setFont(next); saveSetting({ font: next }, 'font'); };
  const handleAccentChange = (next) => { setAccentColor(next); saveSetting({ accentColor: next }, 'colour'); };

  const Template = resolveTemplate(theme);
  const existingCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const sectionSuggestions = [...new Set([...items.map((i) => i.section), ...existingCategories].filter(Boolean))];
  const isProductForm = form.kind === 'product';
  const visibleItems = activeCategory === 'All' ? items : items.filter((i) => i.category === activeCategory);
  const currentFont = FONT_META.find((f) => f.key === font) || FONT_META[0];
  const firstImage = items.find((i) => i.images?.length)?.images[0];
  const palette = PALETTE_DEFAULTS[theme] || PALETTE_DEFAULTS.editorial;
  const background = look.background || palette.background;
  const textColor = look.textColor || palette.textColor;
  const bodyFont = FONT_META.find((f) => f.key === look.bodyFont);
  const viewingItem = items.find((i) => i._id === viewingId) || null;
  // Prev/next follow what the preview shows, unless the project is filtered out
  const viewerList = viewingItem && visibleItems.some((i) => i._id === viewingId) ? visibleItems : items;
  const viewerIndex = viewingItem ? viewerList.findIndex((i) => i._id === viewingId) : -1;
  const showViewerAt = (index) => {
    const next = viewerList[index];
    if (next) { setViewingId(next._id); setViewerPhoto(0); }
  };
  const editingIndex = editingItem ? items.findIndex((i) => i._id === editingItem._id) : -1;
  const inViewer = dialogMode === 'view';

  const handleExport = async () => {
    setExporting(true);
    try {
      // The PDF is taken from the desktop layout
      if (previewDevice !== 'desktop') {
        setPreviewDevice('desktop');
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      await exportPortfolioPdf(captureRef.current, `${user?.username || 'portfolio'}.pdf`);
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const designPanel = (
    <section className="space-y-6" data-testid="portfolio-design">
      <ModeToggle mode={mode} onChange={handleModeChange} />

      <TemplateGallery
        themes={THEME_META}
        mode={mode}
        theme={theme}
        onSelect={handleThemeChange}
        paletteDefaults={PALETTE_DEFAULTS}
        firstImage={firstImage}
        headingFont={currentFont.stack}
      />

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

      <PageToggles showCv={pages.showCv} showContact={pages.showContact} onChange={handlePagesChange} />
    </section>
  );

  const projectsPanel = (
    <section data-testid="portfolio-projects">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-black">{mode === 'catalogue' ? 'Products & projects' : 'Projects'} ({items.length})</p>
        <button type="button" onClick={openAddDialog} className="inline-flex items-center gap-1 text-sm font-semibold text-black hover:underline">
          <FiPlus /> Add work
        </button>
      </div>
      {items.length === 0 && !loading && <p className="text-sm text-gray-500">No projects yet. Add your first {copy.workNoun}.</p>}
      {items.length > 1 && <p className="mb-2 text-xs text-gray-400">Use the arrows to change the order. The top project is featured first.</p>}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item._id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2" data-testid={`project-row-${item._id}`}>
            <div className="flex shrink-0 flex-col">
              <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="p-1 text-gray-500 hover:text-black disabled:opacity-25" aria-label={`Move ${item.title} up`}><FiArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="p-1 text-gray-500 hover:text-black disabled:opacity-25" aria-label={`Move ${item.title} down`}><FiArrowDown className="h-3.5 w-3.5" /></button>
            </div>
            <button type="button" onClick={() => openViewer(item)} className="flex min-w-0 flex-1 items-center gap-2 rounded text-left hover:opacity-80" aria-label={`View ${item.title}`}>
              {item.images?.[0] ? (
                <img src={item.images[0]} alt="" className="h-12 w-14 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded bg-gray-100"><FiImage className="text-gray-400" /></span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-black">{item.title}</span>
                <span className="block text-xs text-gray-500">{index === 0 ? 'Featured · ' : ''}{item.kind === 'product' ? 'Product · ' : ''}{item.images?.length || 0} photo{item.images?.length === 1 ? '' : 's'}</span>
              </span>
            </button>
            <button type="button" onClick={() => openEditDialog(item)} className="p-2 text-gray-500 hover:text-black" aria-label={`Edit ${item.title}`}><FiEdit2 /></button>
            <button type="button" onClick={() => handleDelete(item)} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Remove ${item.title}`}><FiTrash2 /></button>
          </li>
        ))}
      </ul>
    </section>
  );

  const templateNode = (
    <div className="pf-template">
    <Template
      items={visibleItems}
      user={user}
      headline={user?.portfolio?.headline}
      editable
      onEdit={openEditDialog}
      onDelete={handleDelete}
      onAdd={openAddDialog}
      onOpen={openViewer}
      font={font}
      accentColor={accentColor}
      look={look}
      mode={mode}
    />
    </div>
  );

  const previewPanel = (
    <section className="min-w-0" data-testid="portfolio-preview">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {existingCategories.length > 0 && (
            <PillFilter options={['All', ...existingCategories]} active={activeCategory} onChange={setActiveCategory} />
          )}
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-gray-200 bg-white p-1" role="radiogroup" aria-label="Preview size">
          {[['desktop', 'Desktop', FiMonitor], ['phone', 'Phone', FiSmartphone]].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={previewDevice === key}
              onClick={() => setPreviewDevice(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${previewDevice === key ? 'bg-[#32281F] text-white' : 'text-gray-600 hover:text-black'}`}
              data-testid={`pf-preview-${key}`}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>
      {loading && <SkeletonCards count={3} />}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FiImage className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="mb-4 text-gray-500">Add your first {copy.workNoun} to see your portfolio here.</p>
          <Button onClick={openAddDialog} className="bg-[#32281F] font-semibold text-white hover:bg-[#221A14]">{copy.portfolioAddLabel}</Button>
        </div>
      )}
      {!loading && items.length > 0 && (previewDevice === 'phone' ? (
        <DeviceFrame>{templateNode}</DeviceFrame>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
          <div ref={captureRef}>{templateNode}</div>
        </div>
      ))}
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
            <Button onClick={() => setPdfImportOpen(true)} variant="outline" className="flex items-center gap-2" data-testid="pf-import-pdf">
              <FiFileText />Import from PDF
            </Button>
            {/* AI tool, switched off:
            <Button onClick={() => setShowAutoGenDialog(true)} variant="outline"><FiZap />Auto-generate from photos</Button> */}
            <Button onClick={openAddDialog} className="flex items-center gap-2 bg-[#32281F] font-semibold text-white hover:bg-[#221A14]">
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

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 lg:sticky lg:top-24 lg:block lg:self-start ${mobileTab === 'preview' ? 'hidden' : ''}`}>
            <div className={mobileTab === 'projects' ? 'hidden lg:block' : ''}>{designPanel}</div>
            <div className={mobileTab === 'design' ? 'hidden lg:block lg:mt-8' : 'lg:mt-8'}>{projectsPanel}</div>
          </aside>
          <div className={`min-w-0 ${mobileTab === 'preview' ? '' : 'hidden lg:block'}`}>{previewPanel}</div>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        {inViewer ? (viewingItem && (
          <DialogContent className={PROJECT_VIEWER_DIALOG_CLASS} aria-describedby={undefined}>
            <DialogTitle className="sr-only">{viewingItem.title}</DialogTitle>
            <ProjectViewer
              key={viewingItem._id}
              item={viewingItem}
              index={viewerIndex}
              total={viewerList.length}
              initialPhoto={viewerPhoto}
              onPrev={() => showViewerAt(viewerIndex - 1)}
              onNext={() => showViewerAt(viewerIndex + 1)}
              onClose={() => setShowAddDialog(false)}
              actions={(
                <>
                  {user?.username && (
                    <ShareMenu
                      path={`/portfolio/${user.username}?project=${viewingItem._id}`}
                      title={viewingItem.title}
                      testId="project-viewer-share"
                      trigger={(
                        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-black hover:bg-gray-50" data-testid="project-viewer-share" aria-label="Share project">
                          <FiShare2 className="h-4 w-4" /><span className="hidden sm:inline">Share</span>
                        </button>
                      )}
                    />
                  )}
                  <button type="button" onClick={() => openEditDialog(viewingItem)} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#32281F] px-4 text-sm font-semibold text-white hover:bg-[#221A14]" data-testid="project-viewer-edit">
                    <FiEdit2 className="h-4 w-4" />Edit
                  </button>
                </>
              )}
            />
          </DialogContent>
        )) : (
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${copy.workNoun}` : `Add ${copy.workNoun}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-2 space-y-4">
            <KindSwitch value={form.kind} onChange={(kind) => setForm((f) => ({ ...f, kind }))} />
            <div>
              <Label htmlFor="pf-title">{isProductForm ? 'Product name' : 'Title'}</Label>
              <Input id="pf-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pf-category">Category</Label>
                <Input id="pf-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} autoComplete="off" placeholder="e.g. Residential" data-testid="pf-category" />
                <QuickPicks options={existingCategories} value={form.category} onPick={(c) => setForm({ ...form, category: c })} />
              </div>
              <div>
                <Label htmlFor="pf-status">Status</Label>
                <Input id="pf-status" value={form.projectStatus} onChange={(e) => setForm({ ...form, projectStatus: e.target.value })} placeholder="e.g. Completed, 2026" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
              <div>
                <Label htmlFor="pf-role">Your role</Label>
                <AutocompleteInput field="title" id="pf-role" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} maxLength={80} placeholder="e.g. Lead Architect" data-testid="pf-role" />
              </div>
              <div>
                <Label htmlFor="pf-year">Year</Label>
                <Input id="pf-year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" placeholder="e.g. 2024" data-testid="pf-year" />
              </div>
            </div>
            <div>
              <Label htmlFor="pf-section">Section</Label>
              <Input id="pf-section" value={form.section} maxLength={80} autoComplete="off" onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder={isProductForm ? 'e.g. Floor tiles' : 'e.g. Residential'} data-testid="pf-section" />
              <QuickPicks options={sectionSuggestions} value={form.section} onPick={(c) => setForm({ ...form, section: c })} />
              <p className="mt-1 text-xs text-gray-400">Items with the same section are shown together under that heading.</p>
            </div>
            <div>
              <Label htmlFor="pf-location">Location</Label>
              <LocationInput id="pf-location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Search a city, e.g. Pune" data-testid="pf-location" />
            </div>
            <div>
              <Label htmlFor="pf-description">Description</Label>
              <Textarea id="pf-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24" placeholder={isProductForm ? 'What it is, where it is used, what makes it good.' : undefined} />
            </div>
            {isProductForm ? (
              <ProductFields form={form} setForm={setForm} />
            ) : (
              <StoryFields story={form.story} onChange={(story) => setForm((f) => ({ ...f, story }))} />
            )}
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
              {form.images.length > 1 && <p className="mt-2 text-xs text-gray-500">Tap the star on a photo to make it the cover.</p>}
              {form.images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {form.images.map((url, i) => (
                    <div key={url} className="min-w-0">
                      <div className="relative">
                        <img src={url} alt="" className={`h-24 w-full rounded-md object-cover ${i === 0 ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`} />
                        {i === 0 ? (
                          <span className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[#32281F] text-center text-[10px] font-semibold text-white" data-testid="pf-cover-badge">Cover</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makeCover(url)}
                            className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-yellow-400"
                            aria-label="Set as cover"
                            title="Set as cover"
                          >
                            <FiStar className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#32281F] text-white"
                          aria-label="Remove photo"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Input
                        value={form.captions[url] || ''}
                        maxLength={200}
                        onChange={(e) => setForm((f) => ({ ...f, captions: { ...f.captions, [url]: e.target.value } }))}
                        placeholder={i === 0 ? 'e.g. 3D view from the street' : 'e.g. Ground floor plan'}
                        aria-label={`Caption for photo ${i + 1}`}
                        className="mt-1.5 h-8 px-2 text-xs"
                        data-testid={`pf-caption-${i}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {editingItem && editingIndex >= 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3" data-testid="pf-edit-position">
                <p className="text-sm text-gray-600">
                  Position {editingIndex + 1} of {items.length}{editingIndex === 0 ? ' · Featured' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveItem(editingIndex, -1)} disabled={editingIndex === 0} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-black disabled:opacity-30">
                    <FiArrowUp className="h-3.5 w-3.5" />Earlier
                  </button>
                  <button type="button" onClick={() => moveItem(editingIndex, 1)} disabled={editingIndex === items.length - 1} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-black disabled:opacity-30">
                    <FiArrowDown className="h-3.5 w-3.5" />Later
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {(editingItem || viewingId) && (
                <Button type="button" variant="outline" onClick={cancelEdit} className="sm:flex-1" data-testid="pf-edit-cancel">Cancel</Button>
              )}
              <Button type="submit" disabled={saving || !!uploadProgress} className="bg-[#32281F] text-white sm:flex-1">
                {saving ? 'Saving...' : editingItem ? 'Save changes' : `Add ${copy.workNoun}`}
              </Button>
            </div>
            {editingItem && (
              <button
                type="button"
                onClick={() => { if (window.confirm(`Remove "${editingItem.title}" from your portfolio?`)) handleDelete(editingItem); }}
                className="inline-flex w-full items-center justify-center gap-2 py-1 text-sm text-red-600 hover:underline"
                data-testid="pf-edit-delete"
              >
                <FiTrash2 className="h-4 w-4" />Remove this {copy.workNoun}
              </button>
            )}
          </form>
        </DialogContent>
        )}
      </Dialog>

      <PdfImportDialog
        open={pdfImportOpen}
        onOpenChange={setPdfImportOpen}
        kind={mode === 'catalogue' ? 'product' : 'project'}
        onImported={fetchPortfolio}
      />

      {/* AI tools, switched off: "Auto-generate from photos" dialog, the "Suggest a style for me"
          button, resume-based starter suggestions and the "AI take" feedback dialog. Restore from
          git history (commit before this change) when the AI features come back. */}
    </div>
  );
};

export default Portfolio;
