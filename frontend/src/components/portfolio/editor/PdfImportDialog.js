import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiCheck, FiFileText, FiUpload } from 'react-icons/fi';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { API_URL } from '../../../config/api';

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAX_PDF_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 100;
const RENDER_SCALE = 2;
const MAX_SIDE = 3200; // keeps very large drawings under the upload limit
const UPLOAD_BATCH = 8;
const SAVE_BATCH = 10; // the bulk endpoint takes up to 10 at a time

let pdfjsPromise = null;
const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_URL;
      script.async = true;
      script.onload = () => {
        const lib = window.pdfjsLib;
        if (!lib) { reject(new Error('PDF reader did not load')); return; }
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(lib);
      };
      script.onerror = () => { pdfjsPromise = null; script.remove(); reject(new Error('PDF reader did not load')); };
      document.head.appendChild(script);
    });
  }
  return pdfjsPromise;
};

// Title = the line set in the largest type (first one if tied); the rest of the text is the description
const readPageText = async (page) => {
  try {
    const content = await page.getTextContent();
    const lines = [];
    content.items.forEach((it) => {
      const str = (it.str || '').trim();
      if (!str) return;
      const size = Math.round(Math.hypot(it.transform[2], it.transform[3]) || it.height || 0);
      const y = Math.round(it.transform[5]);
      const line = lines.find((l) => Math.abs(l.y - y) <= Math.max(2, size * 0.3));
      if (line) { line.parts.push(str); line.size = Math.max(line.size, size); } else lines.push({ y, size, parts: [str] });
    });
    // PDF y grows upwards: read top to bottom
    lines.sort((a, b) => b.y - a.y);
    const textLines = lines.map((l) => ({ size: l.size, text: l.parts.join(' ').replace(/\s+/g, ' ').trim() })).filter((l) => l.text);
    if (!textLines.length) return { title: '', body: '' };
    const biggest = textLines.reduce((best, l) => (l.size > best.size ? l : best), textLines[0]);
    const title = biggest.text.slice(0, 120);
    const body = textLines.filter((l) => l !== biggest).map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
    return { title, body: body.length > 600 ? `${body.slice(0, 597).replace(/\s+\S*$/, '')}…` : body };
  } catch {
    return { title: '', body: '' };
  }
};

const renderPage = async (page) => {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(RENDER_SCALE, MAX_SIDE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  canvas.width = 0; canvas.height = 0;
  return blob;
};

/**
 * "Import from PDF": every page becomes an image, the person picks pages and
 * where each project starts, then everything is uploaded and saved in bulk.
 */
const PdfImportDialog = ({ open, onOpenChange, kind = 'project', onImported }) => {
  const [stage, setStage] = useState('pick'); // pick | reading | select | saving
  const [fileName, setFileName] = useState('');
  const [pages, setPages] = useState([]); // { n, blob, url, title, body, selected, starts }
  const [readProgress, setReadProgress] = useState({ done: 0, total: 0 });
  const [eachPage, setEachPage] = useState(false);
  const [titles, setTitles] = useState({}); // first page number → title typed by the person
  const [saveProgress, setSaveProgress] = useState('');
  const cancelled = useRef(false);
  const pagesRef = useRef([]);
  pagesRef.current = pages;

  const reset = () => {
    pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]); setStage('pick'); setFileName(''); setTitles({}); setEachPage(false); setSaveProgress('');
  };
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const close = (next) => {
    if (next) return;
    if (stage === 'saving') return; // finish saving first
    cancelled.current = true;
    reset();
    onOpenChange(false);
  };

  const readPdf = async (file) => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') return toast.error('Choose a PDF file');
    if (file.size > MAX_PDF_BYTES) return toast.error('The PDF must be 40 MB or smaller');
    cancelled.current = false;
    setFileName(file.name);
    setStage('reading');
    try {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const total = Math.min(pdf.numPages, MAX_PAGES);
      if (pdf.numPages > MAX_PAGES) toast.message(`Only the first ${MAX_PAGES} pages are shown`);
      setReadProgress({ done: 0, total });
      for (let n = 1; n <= total; n += 1) {
        if (cancelled.current) return;
        const page = await pdf.getPage(n);
        const [blob, text] = await Promise.all([renderPage(page), readPageText(page)]);
        page.cleanup();
        if (cancelled.current) return;
        if (blob) {
          setPages((list) => [...list, { n, blob, url: URL.createObjectURL(blob), ...text, selected: true, starts: n === 1 }]);
        }
        setReadProgress({ done: n, total });
      }
      pdf.destroy();
      setStage('select');
    } catch (error) {
      toast.error(error?.name === 'PasswordException' ? 'This PDF is password-protected' : 'Could not read this PDF');
      reset();
    }
  };

  const update = (n, patch) => setPages((list) => list.map((p) => (p.n === n ? { ...p, ...patch } : p)));

  // Selected pages grouped into projects
  const groups = useMemo(() => {
    const result = [];
    pages.filter((p) => p.selected).forEach((p) => {
      if (!result.length || eachPage || p.starts) result.push({ first: p, pages: [p] });
      else result[result.length - 1].pages.push(p);
    });
    return result.map((g, i) => ({
      ...g,
      title: titles[g.first.n] ?? (g.first.title || `${kind === 'product' ? 'Product' : 'Project'} ${i + 1}`)
    }));
  }, [pages, eachPage, titles, kind]);
  const groupOf = useMemo(() => {
    const map = {};
    groups.forEach((g, i) => g.pages.forEach((p) => { map[p.n] = { index: i, first: p === g.first }; }));
    return map;
  }, [groups]);

  const selectedCount = pages.filter((p) => p.selected).length;

  const runImport = async () => {
    if (!groups.length) return toast.error('Select at least one page');
    if (groups.some((g) => !g.title.trim())) return toast.error('Give every project a title');
    setStage('saving');
    const allPages = groups.flatMap((g) => g.pages);
    const urls = {};
    try {
      for (let i = 0; i < allPages.length; i += UPLOAD_BATCH) {
        const batch = allPages.slice(i, i + UPLOAD_BATCH);
        setSaveProgress(`Uploading pages ${i + 1}–${i + batch.length} of ${allPages.length}…`);
        const formData = new FormData();
        batch.forEach((p) => formData.append('images', new File([p.blob], `page-${p.n}.jpg`, { type: 'image/jpeg' })));
        const res = await axios.post(`${API_URL}/api/upload/multiple`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const uploaded = res.data.images || [];
        if (uploaded.length !== batch.length) throw new Error('Some pages were not uploaded');
        batch.forEach((p, j) => { urls[p.n] = uploaded[j].url; });
      }
      const items = groups.map((g) => ({
        kind,
        title: g.title.trim().slice(0, 200),
        description: g.first.body || '',
        images: g.pages.map((p) => urls[p.n]),
        captions: g.pages.map((p) => `Page ${p.n}`)
      }));
      let saved = 0;
      for (let i = 0; i < items.length; i += SAVE_BATCH) {
        setSaveProgress(`Saving ${kind === 'product' ? 'products' : 'projects'} ${i + 1}–${Math.min(i + SAVE_BATCH, items.length)} of ${items.length}…`);
        // Save from the last batch back so the PDF's order is kept at the top of the portfolio
        const batch = items.slice(Math.max(0, items.length - i - SAVE_BATCH), items.length - i);
        const res = await axios.post(`${API_URL}/api/portfolio/items/bulk`, { items: batch });
        saved += res.data.items?.length || 0;
      }
      toast.success(`Added ${saved} ${kind === 'product' ? 'product' : 'project'}${saved === 1 ? '' : 's'} from your PDF`);
      reset();
      onOpenChange(false);
      onImported?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The import stopped part-way. Please try again.');
      setStage('select');
      setSaveProgress('');
      onImported?.();
    }
  };

  const noun = kind === 'product' ? 'product' : 'project';

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0" data-testid="pdf-import-dialog">
        <DialogHeader className="border-b border-gray-200 p-4 sm:p-5">
          <DialogTitle>Import from PDF</DialogTitle>
          <p className="text-sm text-gray-500">
            {stage === 'pick' && 'Turn an existing portfolio or brochure PDF into projects. Each page becomes a photo.'}
            {stage === 'reading' && `Reading ${fileName}…`}
            {stage === 'select' && `Pick the pages to keep and mark where each ${noun} starts.`}
            {stage === 'saving' && saveProgress}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {stage === 'pick' && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-14 text-center hover:border-yellow-400">
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { readPdf(e.target.files?.[0]); e.target.value = ''; }} data-testid="pdf-import-input" />
              <FiUpload className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-semibold text-black">Choose a PDF</span>
              <span className="text-xs text-gray-500">Up to 40 MB · the PDF stays on your device until you import</span>
            </label>
          )}

          {stage === 'reading' && (
            <div className="mb-4">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-yellow-400 transition-all" style={{ width: `${readProgress.total ? (readProgress.done / readProgress.total) * 100 : 5}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">Page {readProgress.done} of {readProgress.total || '…'}</p>
            </div>
          )}

          {stage !== 'pick' && (
            <>
              {stage !== 'reading' && (
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={eachPage} onChange={(e) => setEachPage(e.target.checked)} className="h-4 w-4 accent-black" data-testid="pdf-each-page" />
                    Each selected page is a {noun}
                  </label>
                  <button type="button" onClick={() => setPages((l) => l.map((p) => ({ ...p, selected: true })))} className="text-gray-600 hover:text-black hover:underline">Select all</button>
                  <button type="button" onClick={() => setPages((l) => l.map((p) => ({ ...p, selected: false })))} className="text-gray-600 hover:text-black hover:underline">Select none</button>
                  <span className="text-gray-500">{selectedCount} page{selectedCount === 1 ? '' : 's'} · {groups.length} {noun}{groups.length === 1 ? '' : 's'}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {pages.map((p) => {
                  const g = groupOf[p.n];
                  return (
                    <div key={p.n} className={`overflow-hidden rounded-xl border-2 bg-white transition ${p.selected ? 'border-black' : 'border-gray-200 opacity-60'}`} data-testid={`pdf-page-${p.n}`}>
                      <button type="button" onClick={() => update(p.n, { selected: !p.selected })} className="relative block w-full bg-gray-100" aria-pressed={p.selected} aria-label={`Page ${p.n}${p.selected ? ', selected' : ''}`} disabled={stage === 'saving'}>
                        <img src={p.url} alt="" className="aspect-[3/4] w-full object-contain" />
                        <span className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${p.selected ? 'border-black bg-black text-white' : 'border-gray-400 bg-white'}`}>
                          {p.selected && <FiCheck className="h-3.5 w-3.5" />}
                        </span>
                        <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 text-[11px] font-semibold text-black">{p.n}</span>
                        {g && <span className={`absolute bottom-2 left-2 rounded px-1.5 text-[11px] font-semibold ${g.first ? 'bg-yellow-400 text-black' : 'bg-black/70 text-white'}`}>{g.first ? `${noun === 'product' ? 'Product' : 'Project'} ${g.index + 1}` : `+ ${g.index + 1}`}</span>}
                      </button>
                      {!eachPage && p.selected && stage !== 'reading' && (
                        <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={!!g?.first}
                            disabled={(g?.index === 0 && g?.first) || stage === 'saving'}
                            onChange={(e) => update(p.n, { starts: e.target.checked })}
                            className="h-3.5 w-3.5 accent-black"
                            data-testid={`pdf-page-start-${p.n}`}
                          />
                          Start a new {noun} here
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {stage !== 'reading' && groups.length > 0 && (
                <div className="mt-6" data-testid="pdf-import-projects">
                  <p className="mb-2 text-sm font-semibold text-black">{noun === 'product' ? 'Products' : 'Projects'} to add</p>
                  <ul className="space-y-2">
                    {groups.map((g, i) => (
                      <li key={g.first.n} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                        <img src={g.first.url} alt="" className="h-12 w-10 shrink-0 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <Input
                            value={g.title}
                            maxLength={200}
                            onChange={(e) => setTitles((t) => ({ ...t, [g.first.n]: e.target.value }))}
                            aria-label={`Title of ${noun} ${i + 1}`}
                            className="h-9 text-sm"
                            disabled={stage === 'saving'}
                            data-testid={`pdf-project-title-${i}`}
                          />
                          <p className="mt-0.5 text-xs text-gray-500">
                            {g.pages.length === 1 ? `Page ${g.first.n}` : `Pages ${g.pages.map((p) => p.n).join(', ')}`}
                            {g.first.body ? ' · description from the page text' : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {stage !== 'pick' && (
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <button type="button" onClick={() => { cancelled.current = true; reset(); }} disabled={stage === 'saving'} className="inline-flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-black disabled:opacity-40">
              <FiFileText />Choose another PDF
            </button>
            <Button onClick={runImport} disabled={stage !== 'select' || !groups.length} className="bg-yellow-400 font-semibold text-black hover:bg-yellow-500" data-testid="pdf-import-confirm">
              {stage === 'saving' ? 'Importing…' : `Add ${groups.length} ${noun}${groups.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PdfImportDialog;
