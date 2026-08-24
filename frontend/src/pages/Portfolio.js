import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { FiCamera, FiImage, FiPlus, FiZap, FiDownload, FiCheck, FiX } from 'react-icons/fi';
import { API_URL } from '../config/api';
import { TEMPLATES, THEME_META, FONT_META, ACCENT_PRESETS } from '../components/portfolio/PortfolioTemplates';
import { exportPortfolioPdf } from '../utils/exportPortfolioPdf';
import { getCopy } from '../config/roleDomainCopy';

const emptyForm = { title: '', description: '', images: [] };

const Portfolio = () => {
  const { user } = useAuth();
  const copy = getCopy(user);
  const [items, setItems] = useState([]);
  const [theme, setTheme] = useState('grid');
  const [font, setFont] = useState('playfair');
  const [accentColor, setAccentColor] = useState('#D4F547');
  const [suggestingStyle, setSuggestingStyle] = useState(false);
  const [starterSuggestions, setStarterSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef(null);
  const [showAutoGenDialog, setShowAutoGenDialog] = useState(false);
  const [autoGenBusy, setAutoGenBusy] = useState(false);
  const [autoGenDrafts, setAutoGenDrafts] = useState([]); // { imageUrl, isWorkPhoto, title, description, tags, reason, included }
  const [autoGenSaving, setAutoGenSaving] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/portfolio/me`);
      setItems(response.data.items || []);
      setTheme(response.data.theme || 'grid');
      setFont(response.data.font || 'playfair');
      setAccentColor(response.data.accentColor || '#D4F547');
      setStarterSuggestions(response.data.starterSuggestions || []);
    } catch (error) {
      toast.error('Failed to load your portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    setUploadingImages(true);
    try {
      const response = await axios.post(`${API_URL}/api/upload/multiple`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const urls = (response.data.images || []).map((img) => img.url);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(message === 'File too large' ? 'Image too large — each photo must be under 18MB' : (message || 'Failed to upload image(s)'));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAutoGenFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setAutoGenBusy(true);
    setAutoGenDrafts([]);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const uploadRes = await axios.post(`${API_URL}/api/upload/multiple`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const urls = (uploadRes.data.images || []).map((img) => img.url);
      const draftRes = await axios.post(`${API_URL}/api/portfolio/auto-generate`, { images: urls });
      const drafts = (draftRes.data.drafts || []).map((d) => ({ ...d, included: d.isWorkPhoto }));
      setAutoGenDrafts(drafts);
      if (drafts.every((d) => !d.isWorkPhoto)) {
        toast.error("Couldn't recognize work photos in those images");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze photos');
    } finally {
      setAutoGenBusy(false);
    }
  };

  const updateAutoGenDraft = (index, patch) => {
    setAutoGenDrafts((drafts) => drafts.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const handleSaveAutoGenDrafts = async () => {
    const toSave = autoGenDrafts.filter((d) => d.isWorkPhoto && d.included);
    if (!toSave.length) return toast.error('Select at least one to save');

    setAutoGenSaving(true);
    try {
      await axios.post(`${API_URL}/api/portfolio/items/bulk`, {
        items: toSave.map((d) => ({ title: d.title, description: d.description, images: [d.imageUrl], tags: d.tags }))
      });
      toast.success(`Added ${toSave.length} to your ${copy.workNoun.toLowerCase()}`);
      setShowAutoGenDialog(false);
      setAutoGenDrafts([]);
      fetchPortfolio();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setAutoGenSaving(false);
    }
  };

  const openAddDialog = (prefill) => {
    setEditingItem(null);
    setLastFeedback(null);
    setForm(prefill ? { title: prefill.title, description: prefill.description, images: [] } : emptyForm);
    setShowAddDialog(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setLastFeedback(null);
    setForm({ title: item.title, description: item.description || '', images: item.images || [] });
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
        const response = await axios.post(`${API_URL}/api/portfolio/items`, form);
        toast.success('Added to your portfolio');
        if (response.data.item?.aiFeedback) {
          setLastFeedback({ feedback: response.data.item.aiFeedback, tags: response.data.item.tags });
        }
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

  const handleThemeChange = async (nextTheme) => {
    setTheme(nextTheme);
    try {
      await axios.put(`${API_URL}/api/portfolio/theme`, { theme: nextTheme });
    } catch (error) {
      toast.error('Failed to save theme');
    }
  };

  const handleFontChange = async (nextFont) => {
    setFont(nextFont);
    try {
      await axios.put(`${API_URL}/api/portfolio/theme`, { font: nextFont });
    } catch (error) {
      toast.error('Failed to save font');
    }
  };

  const handleAccentChange = async (nextColor) => {
    setAccentColor(nextColor);
    try {
      await axios.put(`${API_URL}/api/portfolio/theme`, { accentColor: nextColor });
    } catch (error) {
      toast.error('Failed to save color');
    }
  };

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

  const Template = TEMPLATES[theme] || TEMPLATES.grid;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16">
      <div className="p-4 sm:p-6 lg:p-8 pb-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6" data-pdf-ignore>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{copy.domain === 'real_estate' ? 'Listings' : 'Portfolio'}</h1>
            <p className="text-gray-600">{copy.portfolioSubtitle}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExport} disabled={exporting || items.length === 0} variant="outline" className="flex items-center gap-2">
              <FiDownload />{exporting ? 'Exporting...' : 'Export as PDF'}
            </Button>
            <Button onClick={() => setShowAutoGenDialog(true)} variant="outline" className="flex items-center gap-2 border-black">
              <FiZap />Auto-generate from photos
            </Button>
            <Button onClick={() => openAddDialog()} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold flex items-center gap-2">
              <FiPlus />{copy.portfolioAddLabel}
            </Button>
          </div>
        </div>

        {/* Design controls: layout, font, color — fully user-managed, or let AI suggest one from your actual work */}
        <div className="border border-gray-200 rounded-xl p-4 sm:p-5 mb-8 bg-white" data-pdf-ignore>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-black">Design your portfolio</p>
            <Button size="sm" onClick={handleSuggestStyle} disabled={suggestingStyle} className="bg-black text-white hover:bg-gray-800 flex items-center gap-2">
              <FiZap className={suggestingStyle ? 'animate-pulse' : ''} />{suggestingStyle ? 'Thinking...' : 'Suggest a style for me'}
            </Button>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Layout</p>
          <div className="flex flex-wrap gap-3 mb-5">
            {THEME_META.map((t) => (
              <button
                key={t.key}
                onClick={() => handleThemeChange(t.key)}
                className={`px-4 py-2 rounded-lg border-2 text-left transition ${theme === t.key ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                data-testid={`theme-${t.key}`}
              >
                <p className="font-semibold text-sm text-black">{t.label}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Typography</p>
          <div className="flex flex-wrap gap-3 mb-5">
            {FONT_META.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFontChange(f.key)}
                className={`px-4 py-2 rounded-lg border-2 text-left transition ${font === f.key ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                style={{ fontFamily: f.stack }}
                data-testid={`font-${f.key}`}
              >
                <p className="font-bold text-sm text-black">{f.label}</p>
                <p className="text-xs text-gray-500" style={{ fontFamily: 'inherit' }}>{f.description}</p>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Accent color</p>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => handleAccentChange(c)}
                className={`w-9 h-9 rounded-full border-2 transition ${accentColor === c ? 'border-black scale-110' : 'border-gray-200'}`}
                style={{ backgroundColor: c }}
                aria-label={c}
                data-testid={`accent-${c}`}
              />
            ))}
            <input
              type="color"
              value={accentColor}
              onChange={(e) => handleAccentChange(e.target.value)}
              className="w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer p-0 overflow-hidden"
              title="Custom color"
            />
          </div>
        </div>

        {/* Starter suggestions from resume, shown only when portfolio is empty */}
        {starterSuggestions.length > 0 && (
          <Card className="mb-8 border-2 border-yellow-200 shadow-md" data-pdf-ignore>
            <CardContent className="pt-6">
              <p className="font-semibold text-black mb-3 flex items-center gap-2">
                <FiZap className="text-yellow-500" />We found these from your resume — add them with one tap
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {starterSuggestions.map((s, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-black text-sm">{s.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{s.description}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openAddDialog(s)}>Add</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loading && <p className="text-gray-500 pb-8">Loading...</p>}
        {!loading && items.length === 0 && starterSuggestions.length === 0 && (
          <div className="text-center py-16 pb-8" data-pdf-ignore>
            <FiImage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">Nothing here yet — add your first {copy.workNoun}</p>
            <Button onClick={() => openAddDialog()} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">{copy.portfolioAddLabel}</Button>
          </div>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div ref={captureRef}>
          <Template items={items} user={user} headline={user?.portfolio?.headline} editable onEdit={openEditDialog} onDelete={handleDelete} font={font} accentColor={accentColor} />
        </div>
      )}
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? `Edit ${copy.workNoun}` : `Add ${copy.workNoun}`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24" />
              </div>
              <div>
                <Label>Photos</Label>
                <div className="flex gap-3 mt-1">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handleImageFiles(e.target.files)} className="hidden" />
                    <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-yellow-400 rounded-lg px-4 py-3 text-sm text-gray-600">
                      <FiCamera />Take Photo
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleImageFiles(e.target.files)} className="hidden" />
                    <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-yellow-400 rounded-lg px-4 py-3 text-sm text-gray-600">
                      <FiImage />Upload from Gallery
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">Max 18MB per photo • JPG, PNG, GIF, WebP</p>
                {uploadingImages && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-md" />
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" disabled={saving || uploadingImages} className="w-full bg-black text-white">
                {saving ? 'Saving...' : editingItem ? 'Save changes' : `Add ${copy.workNoun}`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showAutoGenDialog} onOpenChange={(open) => { setShowAutoGenDialog(open); if (!open) setAutoGenDrafts([]); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FiZap className="text-yellow-500" />Auto-generate from photos</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 -mt-2">Upload photos of your work — AI drafts a title, description, and tags for each. Review and edit before saving.</p>

            {autoGenDrafts.length === 0 && (
              <label className="cursor-pointer block mt-2">
                <input type="file" accept="image/*" multiple onChange={(e) => handleAutoGenFiles(e.target.files)} className="hidden" disabled={autoGenBusy} />
                <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-yellow-400 rounded-lg px-4 py-10 text-sm text-gray-600">
                  {autoGenBusy ? (
                    <p>Analyzing photos...</p>
                  ) : (
                    <>
                      <FiImage className="w-6 h-6" />
                      <p>Upload work photos</p>
                      <p className="text-xs text-gray-400">Max 5 at once • JPG, PNG, WebP</p>
                    </>
                  )}
                </div>
              </label>
            )}

            {autoGenDrafts.length > 0 && (
              <div className="space-y-3 mt-2">
                {autoGenDrafts.map((d, i) => (
                  <div key={i} className={`border rounded-lg p-3 flex gap-3 ${d.isWorkPhoto ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                    <img src={d.imageUrl} alt="" className="w-20 h-20 object-cover rounded-md shrink-0" />
                    {d.isWorkPhoto ? (
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Input value={d.title} onChange={(e) => updateAutoGenDraft(i, { title: e.target.value })} className="font-medium" />
                          <button
                            type="button"
                            onClick={() => updateAutoGenDraft(i, { included: !d.included })}
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${d.included ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-gray-300 text-gray-300'}`}
                            aria-label={d.included ? 'Included' : 'Excluded'}
                          >
                            {d.included ? <FiCheck /> : <FiX />}
                          </button>
                        </div>
                        <Textarea value={d.description} onChange={(e) => updateAutoGenDraft(i, { description: e.target.value })} className="min-h-16 text-sm" />
                        <div className="flex flex-wrap gap-1.5">
                          {d.tags?.map((t, ti) => <Badge key={ti} className="bg-gray-100 text-black text-xs">{t}</Badge>)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center text-sm text-gray-500">{d.reason || "Doesn't look like a work photo — skipped"}</div>
                    )}
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveAutoGenDrafts} disabled={autoGenSaving} className="flex-1 bg-black text-white">
                    {autoGenSaving ? 'Saving...' : `Save ${autoGenDrafts.filter((d) => d.isWorkPhoto && d.included).length} to your portfolio`}
                  </Button>
                  <Button onClick={() => setAutoGenDrafts([])} variant="outline">Start over</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!lastFeedback} onOpenChange={() => setLastFeedback(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FiZap className="text-yellow-500" />AI take</DialogTitle>
            </DialogHeader>
            <p className="text-gray-700">{lastFeedback?.feedback}</p>
            {lastFeedback?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lastFeedback.tags.map((t, i) => <Badge key={i} className="bg-gray-100 text-black">{t}</Badge>)}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Portfolio;
