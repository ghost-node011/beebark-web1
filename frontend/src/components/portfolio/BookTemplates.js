import React, { useEffect, useState } from 'react';
import { FiMail, FiDownload, FiArrowRight, FiPlus, FiMapPin, FiImage } from 'react-icons/fi';
// NOTE: PortfolioTemplates.js imports this file too (to register the templates).
// Everything imported from it is only used inside components (at render time),
// never at module level, so the circular import is safe.
import {
  fontStack, num, Controls, Tags, HEX, rgba, isLight, resolveLook, visibleAccent, openOnClick, OpenTitle,
  formatPrice, AvailabilityBadge, isProduct, specsOf, storyOf
} from './PortfolioTemplates';

// ---------------------------------------------------------------------------
// Book templates: web pages that read like printed booklets. Each "spread" is a
// full-width section in normal flow (no fixed positioning, nothing animated in),
// so the PDF exporter captures them as they appear.
// ---------------------------------------------------------------------------

export const BOOK_THEME_META = [
  { key: 'noir', label: 'Noir Catalogue', description: 'Deep green-charcoal booklet for interiors and products', group: 'Interiors', modes: ['portfolio', 'catalogue'], swatches: ['#2E3530', '#EDE8DF', '#C9B79C'] },
  { key: 'redline', label: 'Red Line Book', description: 'Architecture book with red accents and numbered drawings', group: 'Architecture', modes: ['portfolio'], swatches: ['#FFFFFF', '#111111', '#E1251B'] },
  { key: 'warm', label: 'Warm Presentation', description: 'Cream and taupe interior presentation with timelines and mood boards', group: 'Interiors', modes: ['portfolio'], swatches: ['#F4EFE8', '#3B3129', '#9C8270'] },
  { key: 'manual', label: 'Studio Manual', description: 'Huge uppercase headings on beige pages over orange', group: 'Creative', modes: ['portfolio'], swatches: ['#EFE6D6', '#1A1A1A', '#F28C28'] },
  { key: 'cleanbook', label: 'Clean Book', description: 'Crisp white architecture book with thin rules', group: 'Architecture', modes: ['portfolio'], swatches: ['#FFFFFF', '#141414', '#2F6FDE'] },
  { key: 'creative', label: 'Creative Bold', description: 'Black and white spreads with huge royal-blue type', group: 'Creative', modes: ['portfolio'], swatches: ['#FFFFFF', '#0B0B0B', '#1F3FA8'] },
  { key: 'catalogue', label: 'Product Catalogue', description: 'Clean B2B catalogue for construction materials and suppliers', group: 'Construction & suppliers', modes: ['catalogue'], swatches: ['#F6F7F9', '#111827', '#C2410C'] }
];

// `accent` is each template's signature accent, used while the saved accent is
// still the app-wide default yellow.
export const BOOK_PALETTE_DEFAULTS = {
  noir: { background: '#2E3530', textColor: '#EDE8DF', accent: '#C9B79C' },
  redline: { background: '#FFFFFF', textColor: '#111111', accent: '#E1251B' },
  warm: { background: '#F4EFE8', textColor: '#3B3129', accent: '#9C8270' },
  manual: { background: '#EFE6D6', textColor: '#1A1A1A', accent: '#F28C28' },
  cleanbook: { background: '#FFFFFF', textColor: '#141414', accent: '#2F6FDE' },
  creative: { background: '#FFFFFF', textColor: '#0B0B0B', accent: '#1F3FA8' },
  catalogue: { background: '#F6F7F9', textColor: '#111827', accent: '#C2410C' }
};

export const BOOK_COLOUR_PRESETS = {
  noir: [
    { label: 'Green charcoal', background: '#2E3530', textColor: '#EDE8DF' },
    { label: 'Graphite', background: '#26282B', textColor: '#ECE9E4' },
    { label: 'Espresso', background: '#2F2723', textColor: '#F1E9DF' },
    { label: 'Navy', background: '#1E2633', textColor: '#E9EDF2' }
  ],
  redline: [
    { label: 'White', background: '#FFFFFF', textColor: '#111111' },
    { label: 'Paper', background: '#F7F6F3', textColor: '#151515' },
    { label: 'Grey', background: '#EFEFEF', textColor: '#111111' }
  ],
  warm: [
    { label: 'Cream', background: '#F4EFE8', textColor: '#3B3129' },
    { label: 'Linen', background: '#EFE7DC', textColor: '#35291F' },
    { label: 'Stone', background: '#ECEAE5', textColor: '#2E2B27' }
  ],
  manual: [
    { label: 'Beige', background: '#EFE6D6', textColor: '#1A1A1A' },
    { label: 'Paper', background: '#F6F1E8', textColor: '#151515' },
    { label: 'Sand', background: '#E6D9C3', textColor: '#1A1A1A' }
  ],
  cleanbook: [
    { label: 'White', background: '#FFFFFF', textColor: '#141414' },
    { label: 'Mist', background: '#F5F7FA', textColor: '#111827' },
    { label: 'Paper', background: '#FAFAF7', textColor: '#1A1A1A' }
  ],
  creative: [
    { label: 'White', background: '#FFFFFF', textColor: '#0B0B0B' },
    { label: 'Off-white', background: '#F4F2EE', textColor: '#111111' }
  ],
  catalogue: [
    { label: 'Light', background: '#F6F7F9', textColor: '#111827' },
    { label: 'White', background: '#FFFFFF', textColor: '#0F172A' },
    { label: 'Concrete', background: '#EEEEEC', textColor: '#1C1917' }
  ]
};

// ---------- shared helpers ----------
// Accents nobody picked on purpose (app yellow, and the lime every portfolio starts with)
const DEFAULT_ACCENTS = ['#F5C518', '#D4F547'];
const pickAccent = (accentColor, theme) => (
  HEX.test(accentColor || '') && !DEFAULT_ACCENTS.includes(accentColor.toUpperCase()) ? accentColor : BOOK_PALETTE_DEFAULTS[theme].accent
);
const pad = (n) => String(n).padStart(2, '0');
const photosOf = (item) => (Array.isArray(item?.images) ? item.images.filter(Boolean) : []);
const captionOf = (item, n) => (Array.isArray(item?.captions) && typeof item.captions[n] === 'string' ? item.captions[n].trim() : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contactOf = (L, user) => L.contact || user?.email || (user?.username ? `@${user.username}` : '');
const yearNow = () => new Date().getFullYear();
const firstSentence = (text = '') => (text.split(/(?<=[.!?])\s/)[0] || '').trim();
const groupName = (item, fallback) => item?.section || item?.category || fallback;

// Ordered sections: [{ name, items: [{ item, index }] }]; index counts across sections
const groupSections = (items, fallback = 'Projects') => {
  const map = new Map();
  items.forEach((item) => {
    const name = groupName(item, fallback);
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(item);
  });
  let index = 0;
  return [...map.entries()].map(([name, list]) => ({ name, items: list.map((item) => ({ item, index: index++ })) }));
};

// A tag that reads like an area ("2,400 sq ft", "180 m²", "Area: 3 acres")
const areaOf = (item) => (item?.tags || []).find((t) => /\b(sq\.?\s?ft|sqft|sq\.?\s?m|m²|m2|acres?|hectares?|area)\b/i.test(t || '')) || '';

const metaOf = (item) => [
  item.location && ['Location', item.location],
  item.year && ['Year', String(item.year)],
  item.role && ['Role', item.role],
  item.projectStatus && ['Status', item.projectStatus],
  areaOf(item) && ['Area', areaOf(item).replace(/^area\s*:?\s*/i, '')]
].filter(Boolean);

// Story parts, or the description as a single summary when there is no story
const storyOrDescription = (item) => {
  const story = storyOf(item);
  if (story.length) return story;
  return item?.description ? [{ key: 'summary', label: 'Summary', text: item.description }] : [];
};

const mix = (a, b, t) => {
  const p = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));
  const x = p(a); const y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

// Finish names that are colours get a swatch dot
const FINISH_COLOURS = {
  white: '#F5F5F2', black: '#151515', grey: '#8A8A8A', gray: '#8A8A8A', charcoal: '#36393B', beige: '#D9C7A8', ivory: '#F1EAD8', cream: '#EFE5CF',
  brown: '#6B4A33', walnut: '#5A3D2B', oak: '#B58B5A', teak: '#9B6B3C', wenge: '#3E2C23', sand: '#D6C3A0', terracotta: '#C0603F',
  red: '#B3261E', green: '#3E6B48', blue: '#2F5DA8', gold: '#C9A13B', brass: '#B5A04A', copper: '#B4693E', bronze: '#8C6A3F',
  silver: '#BFC3C7', chrome: '#C9CDD1', steel: '#9EA4A9', matte: '#555555', concrete: '#A7A49E', marble: '#E8E5DF', slate: '#4C5257'
};
const finishColour = (name = '') => {
  if (HEX.test(name.trim())) return name.trim();
  const word = name.toLowerCase().split(/[^a-z]+/).find((w) => FINISH_COLOURS[w]);
  return word ? FINISH_COLOURS[word] : null;
};

const FinishChips = ({ finishes, line, muted, className = '' }) => {
  const list = (finishes || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {list.map((f, n) => {
        const dot = finishColour(f);
        return (
          <span key={`${f}-${n}`} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: line, color: muted }}>
            {dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full border" style={{ backgroundColor: dot, borderColor: line }} />}{f}
          </span>
        );
      })}
    </div>
  );
};

const SizeChips = ({ sizes, line, muted }) => {
  const list = (sizes || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((s, n) => <span key={`${s}-${n}`} className="border px-2 py-0.5 text-[11px]" style={{ borderColor: line, color: muted }}>{s}</span>)}
    </div>
  );
};

// "Request a quote" (onEnquire, else mailto: when the contact is an email) and "Download brochure"
const ProductActions = ({ item, onEnquire, contact, primary, secondary, className = '' }) => {
  const mail = EMAIL.test((contact || '').trim()) ? `mailto:${contact.trim()}?subject=${encodeURIComponent(`Quote request: ${item.title || ''}`)}` : '';
  if (!onEnquire && !mail && !item.brochureUrl) return null;
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition hover:opacity-85';
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} data-pdf-ignore>
      {onEnquire ? (
        <button type="button" onClick={() => onEnquire(item)} className={base} style={primary} data-testid={`enquire-${item._id}`}>Request a quote</button>
      ) : mail ? (
        <a href={mail} className={base} style={primary} data-testid={`enquire-${item._id}`}>Request a quote</a>
      ) : null}
      {item.brochureUrl && (
        <a href={item.brochureUrl} target="_blank" rel="noreferrer" className={`${base} border`} style={secondary}><FiDownload className="h-4 w-4" />Download brochure</a>
      )}
    </div>
  );
};

const AddTile = ({ editable, onAdd, label = 'Add work', className = '', style }) => (editable && onAdd ? (
  <button type="button" onClick={onAdd} className={`flex min-h-[140px] w-full flex-col items-center justify-center gap-2 border border-dashed text-sm transition hover:opacity-75 ${className}`} style={style} data-pdf-ignore data-testid="book-add-tile">
    <FiPlus className="h-5 w-5" />{label}
  </button>
) : null);

const EmptyState = ({ editable, onAdd, L, display, label = 'work', className = '' }) => (
  <section className={`px-5 py-16 text-center sm:px-12 sm:py-24 ${className}`} data-testid="book-empty">
    <FiImage className="mx-auto h-8 w-8" style={{ color: L.faint }} />
    <p className="mt-4 text-2xl sm:text-3xl" style={display}>No {label} here yet</p>
    <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: L.muted }}>
      {editable ? `Add your first ${label === 'products' ? 'product' : 'project'} and this book fills itself in.` : 'Check back soon.'}
    </p>
    {editable && onAdd && (
      <button type="button" onClick={onAdd} className="mt-6 inline-flex items-center gap-2 border px-5 py-2 text-sm font-semibold hover:opacity-80" style={{ borderColor: L.fg }} data-pdf-ignore>
        <FiPlus />Add {label === 'products' ? 'a product' : 'a project'}
      </button>
    )}
  </section>
);

// A photo with explicit cover sizing. `n` is its index in the item's photos.
const Photo = ({ src, n, alt = '', className = '', style }) => (src ? (
  <img src={src} alt={alt} data-photo={n} className={`block w-full object-cover ${className}`} style={style} />
) : null);

const Placeholder = ({ className = '', style }) => (
  <div className={`flex w-full items-center justify-center ${className}`} style={style}><FiImage className="h-8 w-8 opacity-40" /></div>
);

// Root wrapper shared by every book: page colours, body font, no sideways scroll
// (overflow-x: clip keeps `position: sticky` working, unlike overflow: hidden).
// It is a size container, so display type (cqw) scales with the page itself,
// including the narrower editor preview.
const Book = ({ L, children, testid, style }) => (
  <div style={{ backgroundColor: L.bg, color: L.fg, overflowX: 'clip', containerType: 'inline-size', ...L.body, ...style }} data-testid={testid}>{children}</div>
);

const SANS = "'Inter', sans-serif";
const MANROPE = "'Manrope', 'Inter', sans-serif";
const SERIF_ITALIC = { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' };
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const GROTESK = "'Archivo Black', 'Inter', sans-serif";
const CONDENSED = "'Bebas Neue', 'Oswald', sans-serif";

// ======================================================================
// 1. NOIR CATALOGUE
// ======================================================================
const NoirProductCard = ({ item, index, L, accent, display, editable, onEdit, onDelete, onOpen, onEnquire, contact, panel, wide }) => {
  const photos = photosOf(item);
  const price = formatPrice(item);
  const specs = specsOf(item).slice(0, wide ? 6 : 4);
  return (
    <article
      className={`flex min-w-0 flex-col ${wide ? 'lg:grid lg:grid-cols-[1.1fr_1fr]' : ''} ${onOpen ? 'cursor-pointer' : ''}`}
      style={{ backgroundColor: panel }}
      onClick={openOnClick(onOpen, item)}
      data-testid={`project-tile-${item._id}`}
    >
      {photos[0] ? <Photo src={photos[0]} n={0} alt={item.title} className={wide ? 'aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[360px]' : 'aspect-[4/3]'} /> : <Placeholder className="aspect-[4/3]" style={{ backgroundColor: L.line }} />}
      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: L.faint }}>
          <span>{pad(index + 1)}</span>
          {item.sku && <span className="truncate">SKU {item.sku}</span>}
        </div>
        <h3 className="mt-3 break-words text-2xl leading-tight sm:text-3xl" style={display}><OpenTitle item={item} onOpen={onOpen} /></h3>
        {item.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed" style={{ color: L.muted }}>{item.description}</p>}
        {(price || item.availability) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {price && <p className="text-lg font-semibold" style={{ color: accent }}>{price}</p>}
            <AvailabilityBadge value={item.availability} />
          </div>
        )}
        {specs.length > 0 && (
          <dl className="mt-4 text-sm">
            {specs.map((s, n) => (
              <div key={`${s.label}-${n}`} className="flex justify-between gap-4 border-t py-1.5" style={{ borderColor: L.line }}>
                <dt style={{ color: L.faint }}>{s.label}</dt><dd className="min-w-0 break-words text-right">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <FinishChips finishes={item.finishes} line={L.line} muted={L.muted} className="mt-4" />
        {item.sizes?.length > 0 && <div className="mt-2"><SizeChips sizes={item.sizes} line={L.line} muted={L.muted} /></div>}
        {(item.moq || item.leadTime) && (
          <p className="mt-3 text-xs" style={{ color: L.faint }}>{[item.moq && `MOQ ${item.moq}`, item.leadTime && `Lead time ${item.leadTime}`].filter(Boolean).join(' · ')}</p>
        )}
        <ProductActions item={item} onEnquire={onEnquire} contact={contact} className="mt-5"
          primary={{ backgroundColor: accent, color: isLight(accent) ? '#1A1A1A' : '#FFFFFF' }}
          secondary={{ borderColor: L.line, color: L.fg }} />
        <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
      </div>
    </article>
  );
};

const NoirProjectSpread = ({ item, index, flip, L, accent, display, editable, onEdit, onDelete, onOpen, panel }) => {
  const photos = photosOf(item);
  const story = storyOrDescription(item);
  const meta = metaOf(item);
  return (
    <article
      className={`grid min-w-0 lg:grid-cols-2 ${onOpen ? 'cursor-pointer' : ''}`}
      onClick={openOnClick(onOpen, item)}
      data-testid={`project-tile-${item._id}`}
    >
      <div className={`grid min-w-0 gap-2 p-2 ${photos.length > 2 ? 'grid-cols-2' : 'grid-cols-1'} ${flip ? 'lg:order-2' : ''}`}>
        {photos.length === 0 && <Placeholder className="h-[260px] sm:h-[420px]" style={{ backgroundColor: panel }} />}
        {photos.slice(0, 3).map((src, n) => (
          <Photo key={src + n} src={src} n={n} alt={captionOf(item, n) || item.title}
            className={photos.length > 2 && n === 0 ? 'col-span-2 h-[220px] sm:h-[360px]' : photos.length > 2 ? 'h-[140px] sm:h-[220px]' : 'h-[260px] sm:h-[420px]'} />
        ))}
      </div>
      <div className={`flex min-w-0 flex-col justify-center px-5 py-10 sm:px-12 ${flip ? 'lg:order-1' : ''}`} style={{ backgroundColor: panel }}>
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: accent }}>{pad(index + 1)}</p>
        <h3 className="mt-3 break-words text-3xl leading-tight sm:text-5xl" style={display}><OpenTitle item={item} onOpen={onOpen} /></h3>
        {meta.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {meta.map(([k, v]) => (
              <div key={k} className="min-w-0"><dt className="text-[11px] uppercase tracking-[0.2em]" style={{ color: L.faint }}>{k}</dt><dd className="break-words">{v}</dd></div>
            ))}
          </dl>
        )}
        {story.slice(0, 3).map((part) => (
          <div key={part.key} className="mt-6">
            {story.length > 1 && <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: L.faint }}>{part.label}</p>}
            <p className="mt-1 whitespace-pre-line leading-relaxed" style={{ color: L.muted }}>{part.text}</p>
          </div>
        ))}
        {captionOf(item, 0) && <p className="mt-6 border-l-2 pl-3 text-sm italic" style={{ borderColor: accent, color: L.faint }}>{captionOf(item, 0)}</p>}
        <Tags tags={item.tags} light={L.onDark} />
        <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
      </div>
    </article>
  );
};

export const NoirTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, onEnquire, font = 'playfair', accentColor, look, mode = 'portfolio' }) => {
  const L = resolveLook('noir', look);
  const accent = visibleAccent(pickAccent(accentColor, 'noir'), L.bg, L.fg);
  const display = { fontFamily: MANROPE, fontWeight: 300, letterSpacing: '-0.01em' };
  const titleFont = { fontFamily: fontStack(font) };
  const panel = isLight(L.bg) ? mix(L.bg, '#000000', 0.06) : mix(L.bg, '#000000', 0.18);
  const catalogue = mode === 'catalogue';
  const sections = groupSections(items, catalogue ? 'Collection' : 'Projects');
  const hero = items.find((i) => photosOf(i).length) || items[0];
  const heroPhoto = photosOf(hero)[0];
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);
  const tagline = L.tagline || headline || user?.headline || (catalogue ? 'Product catalogue' : 'Selected work');
  const trending = catalogue ? items.filter((i) => photosOf(i).length).slice(0, 2) : [];
  const collage = [user?.profilePic, ...items.flatMap((i) => photosOf(i).slice(0, 1))].filter(Boolean).slice(0, 3);
  // Page-like numbers: cover 01, contents 02, about 03, then each section takes 1 + its items
  let page = 4;
  const toc = sections.map((s) => { const at = page; page += 1 + s.items.length; return { name: s.name, page: at }; });
  const sectionId = (i) => `noir-section-${i}`;
  const label = (text) => <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: L.faint }}>{text}</p>;

  return (
    <Book L={L} testid="template-noir">
      <nav className="flex items-center justify-between gap-4 border-b px-5 py-4 text-[11px] uppercase tracking-[0.3em] sm:px-12" style={{ borderColor: L.line }}>
        <span className="truncate">{user?.name}</span>
        <span style={{ color: L.faint }}>{catalogue ? 'Catalogue' : 'Portfolio'} {yearNow()}</span>
      </nav>

      {/* Cover */}
      <header className={`grid min-w-0 lg:grid-cols-[1fr_1.15fr] ${onOpen && hero ? 'cursor-pointer' : ''}`} onClick={hero ? openOnClick(onOpen, hero) : undefined}>
        <div className="flex min-w-0 flex-col justify-between gap-10 px-5 py-12 sm:px-12 sm:py-16">
          {label(catalogue ? 'Product catalogue' : 'Interior portfolio')}
          <div>
            <h1 className="break-words leading-[0.95]" style={{ ...display, fontSize: 'clamp(2.75rem, 7cqw, 6.5rem)' }}>{user?.name || 'Portfolio'}</h1>
            <p className="mt-6 max-w-md text-lg leading-snug" style={{ color: L.muted }} data-testid="pf-tagline">{tagline}</p>
          </div>
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em]" style={{ color: L.faint }}>
            <span className="h-px w-10" style={{ backgroundColor: accent }} />
            <span>{[user?.location, yearNow()].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
        {heroPhoto ? <Photo src={heroPhoto} n={0} alt={hero.title} className="h-[300px] sm:h-[480px] lg:h-full lg:min-h-[600px]" /> : <Placeholder className="h-[300px] sm:h-[480px]" style={{ backgroundColor: panel }} />}
      </header>

      {/* Table of contents */}
      <section className="grid gap-10 border-t px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1fr_1.4fr]" style={{ borderColor: L.line, backgroundColor: panel }}>
        <div>
          {label('02')}
          <h2 className="mt-4 text-4xl sm:text-6xl" style={display}>Table of<br />contents</h2>
        </div>
        <ol className="min-w-0">
          {[{ name: 'About us', page: 3, href: '#noir-about' }, ...toc.map((t, i) => ({ ...t, href: `#${sectionId(i)}` })), { name: 'Contact', page, href: '#noir-contact' }].map((row) => (
            <li key={row.name + row.page} className="border-b" style={{ borderColor: L.line }}>
              <a href={row.href} className="flex items-baseline gap-4 py-4 hover:opacity-75">
                <span className="w-10 shrink-0 text-sm tabular-nums" style={{ color: accent }}>{pad(row.page)}</span>
                <span className="min-w-0 flex-1 break-words text-lg sm:text-2xl" style={display}>{row.name}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {/* About us */}
      <section id="noir-about" className="grid gap-10 px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-2 lg:items-center">
        <div className={`grid min-w-0 gap-2 ${collage.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {collage.length === 0 && <Placeholder className="h-[280px]" style={{ backgroundColor: panel }} />}
          {collage.map((src, n) => (
            <img key={src + n} src={src} alt="" className={`block w-full object-cover ${collage.length > 2 && n === 0 ? 'row-span-2 h-full min-h-[300px]' : collage.length > 1 ? 'h-[150px] sm:h-[220px]' : 'h-[300px] sm:h-[420px]'}`} />
          ))}
        </div>
        <div className="min-w-0">
          {label('03')}
          <h2 className="mt-4 text-4xl sm:text-6xl" style={display}>About us</h2>
          {about && <p className="mt-6 whitespace-pre-line leading-relaxed" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
          {user?.skills?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {user.skills.slice(0, 10).map((s) => <span key={s} className="border px-3 py-1 text-xs" style={{ borderColor: L.line, color: L.muted }}>{s}</span>)}
            </div>
          )}
          {user?.experience?.length > 0 && (
            <ul className="mt-8 space-y-3 text-sm">
              {user.experience.slice(0, 4).map((exp, i) => (
                <li key={i} className="border-l-2 pl-3" style={{ borderColor: accent }}>
                  <span className="font-semibold">{exp.title}</span>
                  <span style={{ color: L.faint }}>{[exp.company, exp.duration].filter(Boolean).length ? ` · ${[exp.company, exp.duration].filter(Boolean).join(' · ')}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {items.length === 0 && <EmptyState editable={editable} onAdd={onAdd} L={L} display={display} label={catalogue ? 'products' : 'projects'} />}

      {/* Trending (catalogue) */}
      {trending.length > 0 && (
        <section className="border-t px-5 py-14 sm:px-12 sm:py-20" style={{ borderColor: L.line }}>
          {label('Featured')}
          <h2 className="mt-4 text-4xl sm:text-6xl" style={display}>Trending</h2>
          <div className={`mt-10 grid gap-4 ${trending.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {trending.map((item) => (
              <div key={item._id} className={`min-w-0 ${onOpen ? 'cursor-pointer' : ''}`} onClick={openOnClick(onOpen, item)}>
                <div className="relative">
                  <Photo src={photosOf(item)[0]} n={0} alt={item.title} className="h-[260px] sm:h-[380px]" />
                  {item.availability && <AvailabilityBadge value={item.availability} className="absolute left-3 top-3" />}
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 pt-4">
                  <h3 className="min-w-0 break-words text-xl" style={titleFont}><OpenTitle item={item} onOpen={onOpen} /></h3>
                  {formatPrice(item) && <span className="text-sm" style={{ color: accent }}>{formatPrice(item)}</span>}
                </div>
                {item.description && <p className="mt-1 text-sm" style={{ color: L.muted }}>{firstSentence(item.description)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      {sections.map((section, si) => (
        <section key={section.name} id={sectionId(si)} className="border-t" style={{ borderColor: L.line }}>
          <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-8 pt-14 sm:px-12 sm:pt-20">
            <div className="min-w-0">
              {label(`${pad(toc[si].page)} · ${section.items.length} ${catalogue ? (section.items.length === 1 ? 'product' : 'products') : (section.items.length === 1 ? 'project' : 'projects')}`)}
              <h2 className="mt-3 break-words text-4xl sm:text-6xl" style={display}>{section.name}</h2>
            </div>
          </div>
          {catalogue || section.items.every(({ item }) => isProduct(item)) ? (
            <div className="grid gap-4 px-2 pb-4 sm:grid-cols-2 sm:px-12 sm:pb-16 xl:grid-cols-3">
              {section.items.map(({ item, index }) => (
                <NoirProductCard key={item._id} item={item} index={index} L={L} accent={accent} display={titleFont} panel={panel}
                  editable={editable} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} onEnquire={onEnquire} contact={L.contact} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {section.items.map(({ item, index }) => (isProduct(item) ? (
                <div key={item._id} className="px-2 sm:px-12">
                  <NoirProductCard item={item} index={index} L={L} accent={accent} display={titleFont} panel={panel} wide
                    editable={editable} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} onEnquire={onEnquire} contact={L.contact} />
                </div>
              ) : (
                <NoirProjectSpread key={item._id} item={item} index={index} flip={index % 2 === 1} L={L} accent={accent} display={titleFont} panel={panel}
                  editable={editable} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} />
              )))}
            </div>
          )}
        </section>
      ))}

      {items.length > 0 && editable && onAdd && (
        <div className="px-5 py-8 sm:px-12"><AddTile editable={editable} onAdd={onAdd} label={catalogue ? 'Add product' : 'Add work'} style={{ borderColor: L.line, color: L.muted }} /></div>
      )}

      {/* Contact */}
      <footer id="noir-contact" className="grid gap-8 border-t px-5 py-16 sm:px-12 sm:py-24 lg:grid-cols-[1.4fr_1fr] lg:items-end" style={{ borderColor: L.line, backgroundColor: panel }}>
        <div className="min-w-0">
          {label(pad(page))}
          <p className="mt-4 break-words leading-tight" style={{ ...display, fontSize: 'clamp(2.25rem, 5.5cqw, 5rem)' }} data-testid="pf-closing">{L.closing}</p>
        </div>
        <div className="min-w-0 space-y-3 text-sm" style={{ color: L.muted }}>
          {contact && <p className="flex items-center gap-2 break-all"><FiMail className="shrink-0" style={{ color: accent }} />{contact}</p>}
          {user?.location && <p className="flex items-center gap-2"><FiMapPin className="shrink-0" style={{ color: accent }} />{user.location}</p>}
          <p className="pt-4 text-[11px] uppercase tracking-[0.3em]" style={{ color: L.faint }}>{user?.name} · {yearNow()}</p>
        </div>
      </footer>
    </Book>
  );
};

// ======================================================================
// 2. RED LINE BOOK
// ======================================================================
const CONSTRUCTION = /construct|detail|section|elevation|joinery|structur|plan\b|plans\b/i;
const MODELING = /\b3d\b|render|model|visuali[sz]/i;

const RedFigure = ({ item, n, accent, L, tall }) => (
  <figure className="min-w-0">
    <div className="border p-1.5" style={{ borderColor: L.line }}>
      <Photo src={photosOf(item)[n]} n={n} alt={captionOf(item, n) || item.title} className={tall ? 'h-[240px] sm:h-[420px]' : 'h-[180px] sm:h-[260px]'} />
    </div>
    <figcaption className="mt-2 flex items-start gap-2 text-xs leading-snug" style={{ color: L.muted }}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: accent }}>{n + 1}</span>
      <span className="min-w-0 break-words pt-0.5">{captionOf(item, n) || `Drawing ${pad(n + 1)}`}</span>
    </figcaption>
  </figure>
);

const RedHeading = ({ children, accent }) => (
  <div className="flex items-center gap-3">
    <span className="h-0.5 w-8 shrink-0" style={{ backgroundColor: accent }} />
    <h4 className="text-xs font-bold uppercase tracking-[0.25em]">{children}</h4>
  </div>
);

export const RedlineTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, font = 'playfair', accentColor, look }) => {
  const L = resolveLook('redline', look);
  const accent = visibleAccent(pickAccent(accentColor, 'redline'), L.bg, L.fg);
  const heavy = { fontFamily: SANS, fontWeight: 900, letterSpacing: '-0.03em' };
  const titleFont = { fontFamily: fontStack(font) };
  const alt = isLight(L.bg) ? mix(L.bg, '#000000', 0.05) : mix(L.bg, '#FFFFFF', 0.06);
  const hero = items.find((i) => photosOf(i).length);
  const portrait = user?.profilePic || photosOf(hero)[0];
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);

  return (
    <Book L={L} testid="template-redline">
      {/* Cover */}
      <header className="grid min-w-0 gap-8 px-5 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.35em]">Architecture</p>
          <h1 className="mt-2 break-words leading-[0.9]" style={{ fontSize: 'clamp(3.25rem, 11cqw, 8.5rem)' }}>
            <span style={{ ...heavy, color: accent }}>Port</span><span style={{ ...SERIF_ITALIC, fontWeight: 400 }}>folio</span>
          </h1>
          <div className="mt-6 h-1 w-16" style={{ backgroundColor: accent }} />
          <p className="mt-6 text-xl font-semibold">{user?.name}</p>
          <p className="text-sm" style={{ color: L.muted }}>{[user?.role || user?.headline, user?.location].filter(Boolean).join(' · ')}</p>
          {(L.tagline || headline) && <p className="mt-4 max-w-md leading-relaxed" style={{ color: L.muted }} data-testid="pf-tagline">{L.tagline || headline}</p>}
          <p className="mt-8 text-xs font-bold tracking-[0.3em]" style={{ color: accent }}>{yearNow()}</p>
        </div>
        {hero ? (
          <div className={`min-w-0 border p-2 ${onOpen ? 'cursor-pointer' : ''}`} style={{ borderColor: L.line }} onClick={openOnClick(onOpen, hero)}>
            <Photo src={photosOf(hero)[0]} n={0} alt={hero.title} className="h-[280px] sm:h-[480px]" />
          </div>
        ) : <Placeholder className="h-[280px] sm:h-[420px]" style={{ backgroundColor: alt }} />}
      </header>

      {/* Index */}
      <section className="px-5 py-14 sm:px-12 sm:py-20" style={{ backgroundColor: alt }}>
        <h2 className="text-5xl sm:text-7xl" style={heavy}>Index<span style={{ color: accent }}>.</span></h2>
        <ol className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {[{ label: 'Introduction', href: '#redline-intro' }, ...items.map((it) => ({ label: it.title, sub: it.section || it.category, href: `#redline-${it._id}` })), { label: 'Thank you', href: '#redline-thanks' }].map((row, i) => (
            <li key={row.href} className="border-b" style={{ borderColor: L.line }}>
              <a href={row.href} className="flex items-baseline gap-4 py-3 hover:opacity-75">
                <span className="w-8 shrink-0 text-sm font-bold tabular-nums" style={{ color: accent }}>{pad(i + 1)}</span>
                <span className="min-w-0 flex-1 break-words font-semibold">{row.label}</span>
                {row.sub && <span className="hidden shrink-0 text-xs uppercase tracking-widest sm:inline" style={{ color: L.faint }}>{row.sub}</span>}
              </a>
            </li>
          ))}
        </ol>
      </section>

      {/* Introduction */}
      <section id="redline-intro" className="grid gap-10 px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
        <div className="relative mx-auto h-56 w-56 shrink-0 sm:h-72 sm:w-72">
          <div className="absolute inset-0 rounded-full" style={{ backgroundColor: accent }} />
          {portrait ? (
            <img src={portrait} alt={user?.name || ''} className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)] rounded-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-6xl text-white" style={heavy}>{(user?.name || '?').charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>01 · Introduction</p>
          <h2 className="mt-3 break-words text-4xl sm:text-5xl" style={heavy}>{user?.name}</h2>
          {about && <p className="mt-5 max-w-2xl whitespace-pre-line leading-relaxed" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {user?.education?.length > 0 && (
              <div>
                <RedHeading accent={accent}>Education</RedHeading>
                <ul className="mt-3 space-y-2 text-sm">
                  {user.education.slice(0, 3).map((ed, i) => (
                    <li key={i}><span className="font-semibold">{ed.school}</span><br /><span style={{ color: L.muted }}>{[ed.degree, ed.field, ed.duration].filter(Boolean).join(' · ')}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {user?.experience?.length > 0 && (
              <div>
                <RedHeading accent={accent}>Experience</RedHeading>
                <ul className="mt-3 space-y-2 text-sm">
                  {user.experience.slice(0, 4).map((exp, i) => (
                    <li key={i}><span className="font-semibold">{exp.title}</span><br /><span style={{ color: L.muted }}>{[exp.company, exp.duration].filter(Boolean).join(' · ')}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {user?.skills?.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {user.skills.slice(0, 12).map((s) => <span key={s} className="border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: L.fg }}>{s}</span>)}
            </div>
          )}
        </div>
      </section>

      {items.length === 0 && <EmptyState editable={editable} onAdd={onAdd} L={L} display={heavy} label="projects" />}

      {/* Projects */}
      {items.map((item, i) => {
        const photos = photosOf(item);
        const meta = metaOf(item);
        const rest = photos.map((_, n) => n).slice(1);
        const construction = rest.filter((n) => CONSTRUCTION.test(captionOf(item, n)));
        const modeling = rest.filter((n) => !construction.includes(n) && MODELING.test(captionOf(item, n)));
        const other = rest.filter((n) => !construction.includes(n) && !modeling.includes(n));
        const story = storyOf(item);
        const process = story.find((s) => s.key === 'process');
        const overview = story.find((s) => s.key === 'summary')?.text || item.description;
        const notes = story.filter((s) => s.key !== 'process' && s.key !== 'summary');
        const group = (title, list) => (list.length > 0 ? (
          <div className="mt-12">
            {title && <RedHeading accent={accent}>{title}</RedHeading>}
            <div className={`mt-5 grid gap-6 ${list.length === 1 ? '' : 'sm:grid-cols-2'} ${list.length > 2 ? 'lg:grid-cols-3' : ''}`}>
              {list.map((n) => <RedFigure key={n} item={item} n={n} accent={accent} L={L} tall={list.length === 1} />)}
            </div>
          </div>
        ) : null);
        return (
          <article
            key={item._id}
            id={`redline-${item._id}`}
            className={`border-t px-5 py-14 sm:px-12 sm:py-20 ${onOpen ? 'cursor-pointer' : ''}`}
            style={{ borderColor: L.line, backgroundColor: i % 2 ? alt : undefined }}
            onClick={openOnClick(onOpen, item)}
            data-testid={`project-tile-${item._id}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4" style={{ borderColor: L.fg }}>
              <p className="text-2xl sm:text-4xl" style={{ ...heavy, color: accent }}>Project · {num(i)}</p>
              {(item.section || item.category) && <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: L.faint }}>{item.section || item.category}</p>}
            </div>
            <h3 className="mt-6 break-words text-3xl leading-tight sm:text-5xl" style={titleFont}><OpenTitle item={item} onOpen={onOpen} /></h3>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
              <div className="min-w-0">
                {photos[0] ? <RedFigure item={item} n={0} accent={accent} L={L} tall /> : <Placeholder className="h-[240px]" style={{ backgroundColor: L.line }} />}
              </div>
              <div className="min-w-0">
                <RedHeading accent={accent}>Project overview</RedHeading>
                {meta.length > 0 && (
                  <dl className="mt-4 text-sm">
                    {meta.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b py-2" style={{ borderColor: L.line }}>
                        <dt className="font-bold uppercase tracking-wider" style={{ fontSize: 11 }}>{k}</dt>
                        <dd className="min-w-0 break-words text-right" style={{ color: L.muted }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {overview && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed" style={{ color: L.muted }}>{overview}</p>}
                <Tags tags={item.tags} light={L.onDark} />
                <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
              </div>
            </div>

            {process && (
              <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_2fr]">
                <RedHeading accent={accent}>Design process</RedHeading>
                <p className="whitespace-pre-line leading-relaxed" style={{ color: L.muted }}>{process.text}</p>
              </div>
            )}
            {group('Construction details', construction)}
            {group('3D modeling & visualization', modeling)}
            {group(construction.length || modeling.length ? 'Drawings & photographs' : '', other)}
            {notes.length > 0 && (
              <div className={`mt-12 grid gap-8 ${notes.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {notes.map((s) => (
                  <div key={s.key}>
                    <RedHeading accent={accent}>{s.label}</RedHeading>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed" style={{ color: L.muted }}>{s.text}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}

      {items.length > 0 && editable && onAdd && (
        <div className="px-5 pb-10 sm:px-12"><AddTile editable={editable} onAdd={onAdd} style={{ borderColor: accent, color: accent }} /></div>
      )}

      {/* Thank you */}
      <footer id="redline-thanks" className="border-t px-5 py-16 text-center sm:px-12 sm:py-24" style={{ borderColor: L.line }}>
        <p className="leading-none" style={{ ...SERIF_ITALIC, color: accent, fontSize: 'clamp(3.5rem, 13cqw, 9rem)' }}>Thank you</p>
        <p className="mt-6 text-lg font-semibold" data-testid="pf-closing">{L.closing}</p>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-center sm:gap-8" style={{ color: L.muted }}>
          {contact && <span className="flex items-center gap-2 break-all"><FiMail className="shrink-0" style={{ color: accent }} />{contact}</span>}
          {user?.location && <span className="flex items-center gap-2"><FiMapPin className="shrink-0" style={{ color: accent }} />{user.location}</span>}
        </div>
      </footer>
    </Book>
  );
};

// ======================================================================
// 3. WARM PRESENTATION
// ======================================================================
// Five colours sampled from photos (needs CORS on the image host); falls back to
// tints of the accent when the photos can't be read.
const quantize = (pixels) => {
  const buckets = new Map();
  pixels.forEach(([r, g, b]) => {
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const e = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += r; e.g += g; e.b += b; e.n += 1;
    buckets.set(key, e);
  });
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n]);
  const picked = [];
  ranked.forEach((c) => {
    if (picked.length >= 5) return;
    if (picked.every((p) => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) > 60)) picked.push(c);
  });
  return picked.map((c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`);
};

const usePalette = (srcs, fallback) => {
  const key = srcs.join('|');
  const [colours, setColours] = useState(null);
  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length || typeof document === 'undefined') return undefined;
    let alive = true;
    let pending = list.length;
    const pixels = [];
    const done = () => {
      pending -= 1;
      if (pending === 0 && alive && pixels.length) setColours(quantize(pixels));
    };
    list.forEach((src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 32; canvas.height = 32;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 32, 32);
          const data = ctx.getImageData(0, 0, 32, 32).data;
          for (let p = 0; p < data.length; p += 4) if (data[p + 3] > 200) pixels.push([data[p], data[p + 1], data[p + 2]]);
        } catch { /* cross-origin photo: keep the fallback */ }
        done();
      };
      img.onerror = done;
      img.src = src;
    });
    return () => { alive = false; };
  }, [key]);
  if (!colours?.length) return fallback;
  return [...colours, ...fallback].slice(0, 5);
};

const MoodBoard = ({ item, L, accent, display, pageNo }) => {
  const photos = photosOf(item);
  const fallback = [mix(accent, '#FFFFFF', 0.7), mix(accent, '#FFFFFF', 0.4), accent, mix(accent, '#000000', 0.3), mix(accent, '#000000', 0.6)];
  const palette = usePalette(photos.slice(0, 2), fallback);
  const board = photos.slice(0, 5);
  return (
    <div className="relative px-5 py-14 sm:px-12 sm:py-20">
      <WarmPageNo n={pageNo} L={L} />
      <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>Furniture layout</p>
      <h4 className="mt-2 text-4xl sm:text-5xl" style={display}>Mood board</h4>
      {board.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {board.map((src, n) => (
            <Photo key={src + n} src={src} n={n} alt={captionOf(item, n) || ''}
              className={n === 0 ? 'col-span-2 row-span-2 h-[260px] sm:h-full sm:min-h-[340px]' : 'h-[125px] sm:h-[165px]'} />
          ))}
        </div>
      )}
      <div className="mt-8" data-testid="warm-palette">
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: L.faint }}>Colour palette</p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-4">
          {palette.map((c, n) => (
            <div key={`${c}-${n}`} className="min-w-0">
              <div className="h-14 w-full rounded-full sm:h-20" style={{ backgroundColor: c, border: `1px solid ${L.line}` }} />
              <p className="mt-2 truncate text-center text-[10px] uppercase tracking-wider" style={{ color: L.faint }}>{c}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WarmPageNo = ({ n, L, light }) => (
  <span className="pointer-events-none absolute right-4 top-2 select-none leading-none sm:right-10 sm:top-4" aria-hidden="true"
    style={{ fontFamily: CORMORANT, fontSize: 'clamp(4rem, 12cqw, 9rem)', color: light ? 'rgba(255,255,255,0.18)' : rgba(L.fg, 0.08) }}>{pad(n)}</span>
);

export const WarmTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, font = 'cormorant', accentColor, look }) => {
  const L = resolveLook('warm', look);
  const accent = visibleAccent(pickAccent(accentColor, 'warm'), L.bg, L.fg);
  const display = { fontFamily: CORMORANT, fontWeight: 500 };
  const titleFont = { fontFamily: font === 'playfair' ? CORMORANT : fontStack(font), fontWeight: 500 };
  const alt = mix(L.bg, isLight(L.bg) ? '#000000' : '#FFFFFF', 0.05);
  const hero = items.find((i) => photosOf(i).length) || items[0];
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);
  let page = 1;
  const next = () => { page += 1; return page; };
  const steps = [
    ['Get in touch', 'Share your space, brief and budget.'],
    ['Site visit', 'We measure, listen and understand how you live.'],
    ['Concept', 'Layouts, materials and a mood board for your review.'],
    ['Delivery', 'Detailed drawings, execution and styling.']
  ];

  return (
    <Book L={L} testid="template-warm">
      {/* Cover over a dark photo */}
      <header className={`relative min-h-[520px] overflow-hidden sm:min-h-[640px] ${onOpen && hero ? 'cursor-pointer' : ''}`} style={{ backgroundColor: '#2A231E' }} onClick={hero ? openOnClick(onOpen, hero) : undefined}>
        {photosOf(hero)[0] && <img src={photosOf(hero)[0]} alt="" data-photo="0" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.55 }} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,16,13,0.15) 0%, rgba(20,16,13,0.75) 100%)' }} />
        <WarmPageNo n={1} L={L} light />
        <div className="relative flex min-h-[520px] flex-col justify-end px-5 pb-12 text-white sm:min-h-[640px] sm:px-12 sm:pb-16">
          <p className="text-xs uppercase tracking-[0.4em] text-white/70">Interior Design</p>
          <h1 className="mt-3 break-words leading-[0.95]" style={{ ...display, fontSize: 'clamp(3rem, 9cqw, 7.5rem)' }}>{hero?.title || user?.name || 'Portfolio'}</h1>
          <p className="mt-4 max-w-lg text-white/75" data-testid="pf-tagline">{L.tagline || headline || [user?.name, user?.role].filter(Boolean).join(' · ')}</p>
          <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/60">{[user?.name, user?.location, yearNow()].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      {/* About */}
      <section className="relative grid gap-10 px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <WarmPageNo n={next()} L={L} />
        {user?.profilePic ? <img src={user.profilePic} alt={user?.name || ''} className="h-[320px] w-full object-cover sm:h-[440px]" /> : <div className="hidden lg:block" />}
        <div className="relative min-w-0">
          <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>About</p>
          <h2 className="mt-2 text-4xl sm:text-6xl" style={display}>{user?.name}</h2>
          {about && <p className="mt-5 max-w-xl whitespace-pre-line leading-relaxed" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
          {user?.skills?.length > 0 && <p className="mt-6 text-sm" style={{ color: L.faint }}>{user.skills.slice(0, 8).join(' · ')}</p>}
        </div>
      </section>

      {items.length === 0 && <EmptyState editable={editable} onAdd={onAdd} L={L} display={display} label="projects" />}

      {items.map((item, i) => {
        const photos = photosOf(item);
        const story = storyOrDescription(item);
        const meta = metaOf(item);
        const year = /^\d{4}$/.test(String(item.year || '').trim()) ? String(item.year).trim() : '';
        const renderIdx = photos.map((_, n) => n).slice(1);
        const renders = renderIdx.filter((n) => MODELING.test(captionOf(item, n)));
        const pairs = (renders.length ? renders : renderIdx).slice(0, 4);
        const titlePage = next();
        const timelinePage = story.length > 1 ? next() : null;
        const renderPage = pairs.length ? next() : null;
        const moodPage = photos.length > 1 ? next() : null;
        return (
          <article key={item._id} className={`border-t ${onOpen ? 'cursor-pointer' : ''}`} style={{ borderColor: L.line }} onClick={openOnClick(onOpen, item)} data-testid={`project-tile-${item._id}`}>
            {/* Project title spread */}
            <div className="relative grid gap-8 px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <WarmPageNo n={titlePage} L={L} />
              <div className="relative min-w-0">
                <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>Project {num(i)}{item.section || item.category ? ` · ${item.section || item.category}` : ''}</p>
                <h3 className="mt-3 break-words text-4xl leading-tight sm:text-6xl" style={titleFont}><OpenTitle item={item} onOpen={onOpen} /></h3>
                {meta.length > 0 && <p className="mt-4 text-sm" style={{ color: L.faint }}>{meta.map(([, v]) => v).join(' · ')}</p>}
                {item.description && <p className="mt-5 whitespace-pre-line leading-relaxed" style={{ color: L.muted }}>{item.description}</p>}
                <Tags tags={item.tags} light={L.onDark} />
                <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
              </div>
              {photos[0] ? <Photo src={photos[0]} n={0} alt={item.title} className="h-[280px] sm:h-[460px]" /> : <Placeholder className="h-[240px]" style={{ backgroundColor: alt }} />}
            </div>

            {/* Project timeline */}
            {timelinePage && (
              <div className="relative px-5 py-14 sm:px-12 sm:py-20" style={{ backgroundColor: alt }}>
                <WarmPageNo n={timelinePage} L={L} />
                <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>{item.title}</p>
                <h4 className="mt-2 text-4xl sm:text-5xl" style={display}>Project timeline</h4>
                <ol className={`relative mt-10 grid gap-8 sm:grid-cols-2 ${story.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                  {story.map((part, n) => (
                    <li key={part.key} className="min-w-0 border-t pt-4" style={{ borderColor: accent }}>
                      <span className="-mt-[1.4rem] mb-3 block h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
                      <p className="text-xs uppercase tracking-[0.25em]" style={{ color: L.faint }}>Phase {n + 1}{year ? ` · ${year}` : ''}</p>
                      <p className="mt-1 text-2xl" style={display}>{part.label}</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: L.muted }}>{part.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 3D renderings */}
            {renderPage && (
              <div className="relative px-5 py-14 sm:px-12 sm:py-20">
                <WarmPageNo n={renderPage} L={L} />
                <p className="text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>{item.title}</p>
                <h4 className="mt-2 text-4xl sm:text-5xl" style={display}>{renders.length ? '3D renderings' : 'Gallery'}</h4>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {pairs.map((n) => (
                    <figure key={n} className="min-w-0">
                      <Photo src={photos[n]} n={n} alt={captionOf(item, n) || item.title} className="h-[220px] sm:h-[320px]" />
                      {captionOf(item, n) && <figcaption className="mt-2 text-sm italic" style={{ ...display, color: L.muted }}>{captionOf(item, n)}</figcaption>}
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {moodPage && <div style={{ backgroundColor: alt }}><MoodBoard item={item} L={L} accent={accent} display={display} pageNo={moodPage} /></div>}
          </article>
        );
      })}

      {items.length > 0 && editable && onAdd && (
        <div className="px-5 py-8 sm:px-12"><AddTile editable={editable} onAdd={onAdd} style={{ borderColor: accent, color: accent }} /></div>
      )}

      {/* What's next */}
      <section className="relative border-t px-5 py-14 sm:px-12 sm:py-20" style={{ borderColor: L.line }}>
        <WarmPageNo n={next()} L={L} />
        <h2 className="text-4xl sm:text-6xl" style={display}>What&apos;s next</h2>
        <ol className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], n) => (
            <li key={title} className="min-w-0 p-5" style={{ backgroundColor: alt }}>
              <span className="text-3xl" style={{ ...display, color: accent }}>{pad(n + 1)}</span>
              <p className="mt-2 text-xl" style={display}>{title}</p>
              <p className="mt-1 text-sm" style={{ color: L.muted }}>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Contact us */}
      <section className="relative grid gap-8 px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-2 lg:items-center" style={{ backgroundColor: alt }}>
        <WarmPageNo n={next()} L={L} />
        <div className="relative min-w-0">
          <h2 className="text-4xl sm:text-6xl" style={display}>Contact us</h2>
          <div className="mt-6 space-y-3" style={{ color: L.muted }}>
            {contact && <p className="flex items-center gap-3 break-all"><FiMail className="shrink-0" style={{ color: accent }} />{contact}</p>}
            {user?.location && <p className="flex items-center gap-3"><FiMapPin className="shrink-0" style={{ color: accent }} />{user.location}</p>}
          </div>
        </div>
        {photosOf(items[1] || hero)[0] && <img src={photosOf(items[1] || hero)[0]} alt="" className="h-[220px] w-full object-cover sm:h-[300px]" />}
      </section>

      {/* Thank you */}
      <footer className="relative px-5 py-20 text-center sm:px-12 sm:py-28">
        <WarmPageNo n={next()} L={L} />
        <p className="leading-none" style={{ ...display, fontStyle: 'italic', fontSize: 'clamp(3.5rem, 11cqw, 8rem)' }}>Thank you</p>
        <p className="mt-5 text-lg" style={{ color: L.muted }} data-testid="pf-closing">{L.closing}</p>
        <p className="mt-6 text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>{user?.name}</p>
      </footer>
    </Book>
  );
};

// ======================================================================
// 4. STUDIO MANUAL
// ======================================================================
// Vertical on desktop, horizontal on phones
const SideLabel = ({ children, color }) => (
  <>
    <p className="mb-4 text-xs font-bold uppercase tracking-[0.4em] lg:hidden" style={{ color }}>{children}</p>
    <div className="hidden w-10 shrink-0 justify-center lg:flex">
      <span className="text-xs font-bold uppercase tracking-[0.5em]" style={{ color, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{children}</span>
    </div>
  </>
);

const Huge = ({ children, accent, block = 'left', size = 'clamp(2.75rem, 10cqw, 7.5rem)', className = '' }) => (
  <h2 className={`relative inline-block max-w-full break-words uppercase leading-[0.88] ${className}`} style={{ fontFamily: GROTESK, fontSize: size, letterSpacing: '-0.02em' }}>
    <span className={`absolute ${block === 'left' ? '-left-2 bottom-1 w-2/5' : '-right-2 top-1 w-1/3'} h-1/2`} style={{ backgroundColor: accent }} aria-hidden="true" />
    <span className="relative">{children}</span>
  </h2>
);

const BW = 'grayscale transition duration-300 hover:grayscale-0';

export const ManualTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, font = 'playfair', accentColor, look }) => {
  const L = resolveLook('manual', look);
  const accent = pickAccent(accentColor, 'manual');
  const onAccent = isLight(accent) ? '#1A1A1A' : '#FFFFFF';
  const titleFont = { fontFamily: font === 'playfair' ? GROTESK : fontStack(font) };
  const hero = items.find((i) => photosOf(i).length);
  const portrait = user?.profilePic || photosOf(hero)[0];
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);
  const pageCls = 'mx-2 my-2 flex min-w-0 flex-col lg:flex-row lg:gap-6 px-5 py-12 sm:mx-6 sm:my-4 sm:px-10 sm:py-16 lg:mx-10';
  const page = { backgroundColor: L.bg };

  return (
    <Book L={L} testid="template-manual" style={{ backgroundColor: accent, paddingTop: 8, paddingBottom: 8 }}>
      {/* Cover */}
      <header className={pageCls} style={page}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.3em]">
            <span className="truncate">{user?.name}</span><span>{yearNow()}</span>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div className="min-w-0">
              <Huge accent={accent} size="clamp(3rem, 13cqw, 10rem)">My<br />Portfolio</Huge>
              <p className="mt-6 max-w-md text-lg" style={{ color: L.muted }} data-testid="pf-tagline">{L.tagline || headline || [user?.role, user?.location].filter(Boolean).join(' · ')}</p>
            </div>
            {portrait && <img src={portrait} alt="" className={`h-[300px] w-full object-cover sm:h-[420px] ${BW}`} />}
          </div>
        </div>
      </header>

      {/* About me / philosophy */}
      <section className={pageCls} style={page}>
        <SideLabel color={accent}>Philosophy</SideLabel>
        <div className="min-w-0 flex-1">
          <Huge accent={accent} block="right">About me</Huge>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="text-2xl font-bold">{user?.name}</p>
              <p className="text-sm uppercase tracking-widest" style={{ color: L.faint }}>{[user?.role, user?.location].filter(Boolean).join(' · ')}</p>
              {about && <p className="mt-5 whitespace-pre-line leading-relaxed" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
            </div>
            <div className="min-w-0">
              {user?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {user.skills.slice(0, 12).map((s) => <span key={s} className="px-3 py-1 text-xs font-bold uppercase" style={{ backgroundColor: accent, color: onAccent }}>{s}</span>)}
                </div>
              )}
              {user?.experience?.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {user.experience.slice(0, 4).map((exp, i) => (
                    <li key={i} className="border-b pb-2" style={{ borderColor: L.line }}>
                      <p className="font-bold uppercase">{exp.title}</p>
                      <p className="text-sm" style={{ color: L.muted }}>{[exp.company, exp.duration].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio index */}
      {items.length > 0 && (
        <section className={pageCls} style={page}>
          <SideLabel color={accent}>Portfolio</SideLabel>
          <div className="min-w-0 flex-1">
            <Huge accent={accent}>Projects</Huge>
            <ol className="mt-8">
              {items.map((it, i) => (
                <li key={it._id} className="border-b" style={{ borderColor: L.fg }}>
                  <a href={`#manual-${it._id}`} className="flex items-baseline gap-4 py-3 hover:opacity-75">
                    <span className="w-10 shrink-0 font-bold tabular-nums" style={{ color: accent }}>{pad(i + 1)}</span>
                    <span className="min-w-0 flex-1 break-words text-lg font-bold uppercase sm:text-2xl" style={{ fontFamily: GROTESK }}>{it.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {items.length === 0 && <div className="mx-2 sm:mx-6 lg:mx-10" style={page}><EmptyState editable={editable} onAdd={onAdd} L={L} display={{ fontFamily: GROTESK }} label="projects" /></div>}

      {items.map((item, i) => {
        const photos = photosOf(item);
        const story = storyOf(item);
        const get = (k) => story.find((s) => s.key === k)?.text;
        const goals = get('summary') || item.description;
        const process = [get('contribution'), get('process')].filter(Boolean).join('\n\n');
        const outcome = get('outcome');
        return (
          <article key={item._id} id={`manual-${item._id}`} className={`${pageCls} ${onOpen ? 'cursor-pointer' : ''}`} style={page} onClick={openOnClick(onOpen, item)} data-testid={`project-tile-${item._id}`}>
            <SideLabel color={accent}>{item.section || item.category || 'Portfolio'}</SideLabel>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.35em]" style={{ color: L.faint }}>My project · {num(i)}</p>
              <h3 className="mt-3 break-words uppercase leading-[0.95]" style={{ ...titleFont, fontSize: 'clamp(2.25rem, 7cqw, 5rem)' }}><OpenTitle item={item} onOpen={onOpen} /></h3>
              {metaOf(item).length > 0 && <p className="mt-3 text-sm uppercase tracking-widest" style={{ color: L.muted }}>{metaOf(item).map(([, v]) => v).join(' · ')}</p>}
              {photos[0] && <Photo src={photos[0]} n={0} alt={item.title} className={`mt-8 h-[260px] sm:h-[460px] ${BW}`} />}
              <div className="mt-10 grid gap-10 lg:grid-cols-2">
                {goals && (
                  <div className="min-w-0">
                    <Huge accent={accent} size="clamp(2rem, 6cqw, 4rem)">Goals</Huge>
                    <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: L.muted }}>{goals}</p>
                  </div>
                )}
                {process && (
                  <div className="min-w-0">
                    <Huge accent={accent} block="right" size="clamp(2rem, 6cqw, 4rem)">Design process</Huge>
                    <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: L.muted }}>{process}</p>
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className="mt-12">
                  <Huge accent={accent} size="clamp(2rem, 6cqw, 4rem)">Mood boards</Huge>
                  <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {photos.slice(1).map((src, n) => (
                      <figure key={src + n} className="min-w-0">
                        <Photo src={src} n={n + 1} alt={captionOf(item, n + 1)} className={`h-[150px] sm:h-[240px] ${BW}`} />
                        {captionOf(item, n + 1) && <figcaption className="mt-1 text-xs uppercase tracking-wide" style={{ color: L.faint }}>{captionOf(item, n + 1)}</figcaption>}
                      </figure>
                    ))}
                  </div>
                </div>
              )}
              {outcome && (
                <div className="mt-10 p-6" style={{ backgroundColor: accent, color: onAccent }}>
                  <p className="text-xs font-bold uppercase tracking-[0.3em]">Outcome</p>
                  <p className="mt-2 whitespace-pre-line text-lg">{outcome}</p>
                </div>
              )}
              <Tags tags={item.tags} light={L.onDark} />
              <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
            </div>
          </article>
        );
      })}

      {items.length > 0 && editable && onAdd && (
        <div className="mx-2 my-2 sm:mx-6 lg:mx-10"><AddTile editable={editable} onAdd={onAdd} style={{ ...page, borderColor: L.fg, color: L.fg }} /></div>
      )}

      {/* Contact */}
      <footer className={pageCls} style={page}>
        <SideLabel color={accent}>Contact</SideLabel>
        <div className="min-w-0 flex-1">
          <Huge accent={accent} size="clamp(3rem, 12cqw, 9rem)">Contact</Huge>
          <p className="mt-6 text-2xl font-bold" data-testid="pf-closing">{L.closing}</p>
          <div className="mt-6 space-y-2" style={{ color: L.muted }}>
            {contact && <p className="flex items-center gap-2 break-all"><FiMail className="shrink-0" />{contact}</p>}
            {user?.location && <p className="flex items-center gap-2"><FiMapPin className="shrink-0" />{user.location}</p>}
          </div>
        </div>
      </footer>
    </Book>
  );
};

// ======================================================================
// 5. CLEAN BOOK
// ======================================================================
const FEATURED = 6;

export const CleanbookTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, font = 'playfair', accentColor, look }) => {
  const L = resolveLook('cleanbook', look);
  const accent = visibleAccent(pickAccent(accentColor, 'cleanbook'), L.bg, L.fg);
  const light = { fontFamily: SANS, fontWeight: 200, letterSpacing: '-0.02em' };
  const bold = { fontFamily: SANS, fontWeight: 800, letterSpacing: '0.12em' };
  const titleFont = { fontFamily: font === 'playfair' ? SANS : fontStack(font), fontWeight: font === 'playfair' ? 600 : undefined };
  const featured = items.slice(0, FEATURED);
  const additional = items.slice(FEATURED);
  const hero = items.find((i) => photosOf(i).length);
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);
  const rule = { borderColor: L.line };

  return (
    <Book L={L} testid="template-cleanbook">
      {/* Cover */}
      <header className="flex min-w-0 border-b" style={rule}>
        <div className="hidden w-14 shrink-0 items-center justify-center border-r sm:flex" style={rule}>
          <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.5em]" style={{ color: L.faint, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            {user?.name || 'Portfolio'} · Creative portfolio
          </span>
        </div>
        <div className="grid min-w-0 flex-1 gap-8 px-5 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.4em] sm:hidden" style={{ color: L.faint }}>{user?.name}</p>
            <p className="mt-2 leading-none sm:mt-0" style={{ ...light, fontSize: 'clamp(2.5rem, 7cqw, 5.5rem)' }}>Architecture</p>
            <p className="mt-1 break-words leading-none" style={{ ...bold, fontSize: 'clamp(1.9rem, 5.5cqw, 4.25rem)' }}>PORTFOLIO</p>
            <div className="mt-8 h-px w-24" style={{ backgroundColor: accent }} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed" style={{ color: L.muted }} data-testid="pf-tagline">{L.tagline || headline || [user?.role, user?.location].filter(Boolean).join(' · ')}</p>
            <p className="mt-6 text-xs tracking-[0.3em]" style={{ color: accent }}>{yearNow()}</p>
          </div>
          {hero ? (
            <div className={onOpen ? 'cursor-pointer' : ''} onClick={openOnClick(onOpen, hero)}>
              <Photo src={photosOf(hero)[0]} n={0} alt={hero.title} className="h-[280px] sm:h-[500px]" />
            </div>
          ) : <Placeholder className="h-[260px]" style={{ backgroundColor: L.line }} />}
        </div>
      </header>

      {/* Contents + introduction */}
      <section className="grid gap-12 border-b px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-2" style={rule}>
        <div className="min-w-0">
          <h2 className="text-3xl sm:text-4xl" style={light}>Table of content</h2>
          <ol className="mt-8">
            {[...featured.map((it, i) => ({ label: it.title, href: `#clean-${it._id}`, n: i + 1 })), ...(additional.length ? [{ label: 'Additional work', href: '#clean-additional', n: featured.length + 1 }] : [])].map((row) => (
              <li key={row.href} className="border-t" style={rule}>
                <a href={row.href} className="flex items-baseline gap-4 py-3 hover:opacity-70">
                  <span className="w-8 shrink-0 text-sm tabular-nums" style={{ color: accent }}>{pad(row.n)}</span>
                  <span className="min-w-0 flex-1 break-words">{row.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0">
          <h2 className="text-3xl sm:text-4xl" style={light}>Introduction</h2>
          <div className="mt-8 flex items-start gap-5">
            {user?.profilePic && <img src={user.profilePic} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24" />}
            <div className="min-w-0">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm" style={{ color: L.faint }}>{[user?.role, user?.location].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          {about && <p className="mt-6 whitespace-pre-line leading-relaxed" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
          {user?.skills?.length > 0 && <p className="mt-6 text-sm" style={{ color: L.faint }}>{user.skills.slice(0, 10).join('  /  ')}</p>}
        </div>
      </section>

      {items.length === 0 && <EmptyState editable={editable} onAdd={onAdd} L={L} display={light} label="projects" />}

      {featured.map((item, i) => {
        const photos = photosOf(item);
        const flip = i % 2 === 1;
        const points = [
          ...storyOf(item).map((s) => `${s.label}: ${firstSentence(s.text)}`),
          ...metaOf(item).map(([k, v]) => `${k}: ${v}`)
        ];
        return (
          <article key={item._id} id={`clean-${item._id}`} className={`grid gap-8 border-b px-5 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-start ${onOpen ? 'cursor-pointer' : ''}`} style={rule} onClick={openOnClick(onOpen, item)} data-testid={`project-tile-${item._id}`}>
            <div className={`min-w-0 ${flip ? 'lg:order-2' : ''}`}>
              {photos[0] ? <Photo src={photos[0]} n={0} alt={item.title} className="h-[260px] sm:h-[480px]" /> : <Placeholder className="h-[240px]" style={{ backgroundColor: L.line }} />}
              {captionOf(item, 0) && <p className="mt-2 text-xs" style={{ color: L.faint }}>{captionOf(item, 0)}</p>}
              {photos.length > 1 && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {photos.slice(1, 4).map((src, n) => <Photo key={src + n} src={src} n={n + 1} alt={captionOf(item, n + 1)} className="h-[80px] sm:h-[140px]" />)}
                </div>
              )}
            </div>
            <div className={`min-w-0 ${flip ? 'lg:order-1' : ''}`}>
              <p className="text-sm tracking-[0.3em]" style={{ color: accent }}>Project {i + 1}</p>
              <h3 className="mt-2 break-words text-3xl leading-tight sm:text-4xl" style={titleFont}><OpenTitle item={item} onOpen={onOpen} /></h3>
              <div className="mt-5 h-px w-full" style={{ backgroundColor: L.line }} />
              {item.description && <p className="mt-5 whitespace-pre-line leading-relaxed" style={{ color: L.muted }}>{item.description}</p>}
              {points.length > 0 && (
                <ul className="mt-5 space-y-2 text-sm">
                  {points.map((p, n) => (
                    <li key={n} className="flex gap-3"><span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} /><span className="min-w-0 break-words" style={{ color: L.muted }}>{p}</span></li>
                  ))}
                </ul>
              )}
              <Tags tags={item.tags} light={L.onDark} />
              <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
            </div>
          </article>
        );
      })}

      {(additional.length > 0 || (items.length > 0 && editable && onAdd)) && (
        <section id="clean-additional" className="border-b px-5 py-14 sm:px-12 sm:py-20" style={rule}>
          {additional.length > 0 && <h2 className="text-3xl sm:text-4xl" style={light}>Additional work</h2>}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {additional.map((item, i) => (
              <article key={item._id} className={`min-w-0 ${onOpen ? 'cursor-pointer' : ''}`} onClick={openOnClick(onOpen, item)} data-testid={`project-tile-${item._id}`}>
                {photosOf(item)[0] ? <Photo src={photosOf(item)[0]} n={0} alt={item.title} className="h-[200px] sm:h-[220px]" /> : <Placeholder className="h-[200px]" style={{ backgroundColor: L.line }} />}
                <p className="mt-3 text-xs tracking-[0.3em]" style={{ color: accent }}>{pad(FEATURED + i + 1)}</p>
                <h3 className="mt-1 break-words text-lg" style={titleFont}><OpenTitle item={item} onOpen={onOpen} /></h3>
                <p className="text-sm" style={{ color: L.faint }}>{[item.section || item.category, item.location, item.year].filter(Boolean).join(' · ')}</p>
                <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
              </article>
            ))}
            <AddTile editable={editable} onAdd={onAdd} className="min-h-[200px]" style={{ borderColor: L.line, color: L.muted }} />
          </div>
        </section>
      )}

      <footer className="px-5 py-16 sm:px-12 sm:py-24">
        <p className="leading-none" style={{ ...light, fontSize: 'clamp(2.5rem, 8cqw, 6rem)' }}>Thanks for <span style={{ ...bold, letterSpacing: '0.04em', color: accent }}>watching</span></p>
        <div className="mt-8 flex flex-col gap-3 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ ...rule, color: L.muted }}>
          <p data-testid="pf-closing">{L.closing}</p>
          {contact && <p className="flex items-center gap-2 break-all"><FiMail className="shrink-0" style={{ color: accent }} />{contact}</p>}
        </div>
      </footer>
    </Book>
  );
};

// ======================================================================
// 6. CREATIVE BOLD
// ======================================================================
const Display = ({ word, script, accent, scriptColor, size = 'clamp(3.5rem, 15cqw, 11rem)', align = 'left' }) => (
  <div className={`relative ${align === 'center' ? 'text-center' : ''}`}>
    <h2 className="break-words uppercase leading-[0.85]" style={{ fontFamily: CONDENSED, fontSize: size, color: accent, letterSpacing: '0.01em' }}>{word}</h2>
    {script && (
      <span className={`absolute bottom-[8%] ${align === 'center' ? 'left-1/2' : 'left-[12%]'} whitespace-nowrap leading-none`}
        style={{ ...SERIF_ITALIC, fontSize: `calc(${size} * 0.42)`, color: scriptColor, transform: `${align === 'center' ? 'translateX(-50%) ' : ''}rotate(-6deg)` }}>
        {script}
      </span>
    )}
  </div>
);

export const CreativeTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, font = 'playfair', accentColor, look }) => {
  const L = resolveLook('creative', look);
  const accent = pickAccent(accentColor, 'creative');
  const titleFont = { fontFamily: font === 'playfair' ? CONDENSED : fontStack(font) };
  const hero = items.find((i) => photosOf(i).length);
  const portrait = user?.profilePic || photosOf(hero)[0];
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);
  // The accent, lifted on dark spreads so the blue stays readable
  const acc = (t) => (isLight(t.bg) === isLight(accent) ? (isLight(t.bg) ? mix(accent, '#000000', 0.45) : mix(accent, '#FFFFFF', 0.35)) : accent);
  // Alternating spreads: page colours, then flipped
  const tone = (dark) => (dark
    ? { bg: L.fg, fg: L.bg, muted: rgba(L.bg, 0.7), faint: rgba(L.bg, 0.5), line: rgba(L.bg, 0.2), onDark: isLight(L.bg) }
    : { bg: L.bg, fg: L.fg, muted: L.muted, faint: L.faint, line: L.line, onDark: L.onDark });
  let spread = 0;
  const nextTone = () => { spread += 1; return tone(spread % 2 === 0); };
  const cover = tone(false);
  const aboutTone = nextTone();
  const spreadCls = 'px-5 py-14 sm:px-12 sm:py-20';
  const skills = (user?.skills || []).slice(0, 8);

  return (
    <Book L={L} testid="template-creative">
      <nav className="flex items-center justify-between gap-4 border-b px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.3em] sm:px-12" style={{ borderColor: L.line }}>
        <span className="truncate">{user?.name}</span>
        <span className="truncate" style={{ color: L.faint }}>{user?.role || 'Portfolio'}</span>
      </nav>

      {/* Cover */}
      <header className={`${spreadCls} grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end`} style={{ backgroundColor: cover.bg, color: cover.fg }}>
        <div className="min-w-0">
          <Display word="Portfolio" script="Creative" accent={acc(cover)} scriptColor={cover.fg} size="clamp(4rem, 19cqw, 13rem)" />
          <p className="mt-8 text-2xl font-semibold">{user?.name}</p>
          <p className="max-w-md" style={{ color: cover.muted }} data-testid="pf-tagline">{L.tagline || headline || [user?.role, user?.location].filter(Boolean).join(' · ')}</p>
        </div>
        {portrait && <img src={portrait} alt="" className={`h-[320px] w-full object-cover sm:h-[460px] ${BW}`} />}
      </header>

      {/* About me */}
      <section className={`${spreadCls} grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center`} style={{ backgroundColor: aboutTone.bg, color: aboutTone.fg }}>
        {user?.profilePic ? <img src={user.profilePic} alt={user?.name || ''} className={`h-[300px] w-full object-cover sm:h-[420px] ${BW}`} /> : <div className="hidden lg:block" />}
        <div className="min-w-0">
          <Display word="About me" script="Introduction" accent={acc(aboutTone)} scriptColor={aboutTone.fg} size="clamp(3.25rem, 12cqw, 8rem)" />
          {about && <p className="mt-8 whitespace-pre-line text-lg leading-relaxed" style={{ color: aboutTone.muted }} data-testid="pf-about">{about}</p>}
          <p className="mt-6 text-sm uppercase tracking-[0.25em]" style={{ color: aboutTone.faint }}>{[user?.location, contact].filter(Boolean).join(' · ')}</p>
        </div>
      </section>

      {items.length === 0 && <EmptyState editable={editable} onAdd={onAdd} L={L} display={{ fontFamily: CONDENSED, color: accent }} label="projects" />}

      {items.map((item, i) => {
        const t = nextTone();
        const photos = photosOf(item);
        const story = storyOrDescription(item);
        return (
          <article key={item._id} className={`${spreadCls} ${onOpen ? 'cursor-pointer' : ''}`} style={{ backgroundColor: t.bg, color: t.fg }} onClick={openOnClick(onOpen, item)} data-testid={`project-tile-${item._id}`}>
            <Display word={`Project ${num(i)}`} script={item.section || item.category || 'Work'} accent={acc(t)} scriptColor={t.fg} size="clamp(3.25rem, 13cqw, 9rem)" />
            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.5fr]">
              <div className="min-w-0">
                <h3 className="break-words text-3xl uppercase leading-none sm:text-5xl" style={titleFont}><OpenTitle item={item} onOpen={onOpen} /></h3>
                {metaOf(item).length > 0 && <p className="mt-3 text-xs uppercase tracking-[0.25em]" style={{ color: t.faint }}>{metaOf(item).map(([, v]) => v).join(' · ')}</p>}
                {story.map((part) => (
                  <div key={part.key} className="mt-6">
                    {story.length > 1 && <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: acc(t) }}>{part.label}</p>}
                    <p className="mt-1 whitespace-pre-line leading-relaxed" style={{ color: t.muted }}>{part.text}</p>
                  </div>
                ))}
                <Tags tags={item.tags} light={t.onDark} />
                <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={t.onDark} />
              </div>
              <div className={`grid min-w-0 gap-3 ${photos.length > 1 ? 'grid-cols-2' : ''}`}>
                {photos.length === 0 && <Placeholder className="h-[260px]" style={{ backgroundColor: t.line }} />}
                {photos.slice(0, 5).map((src, n) => (
                  <Photo key={src + n} src={src} n={n} alt={captionOf(item, n) || item.title}
                    className={`${BW} ${n === 0 && photos.length > 1 ? 'col-span-2 h-[240px] sm:h-[400px]' : photos.length === 1 ? 'h-[280px] sm:h-[460px]' : 'h-[150px] sm:h-[240px]'}`} />
                ))}
              </div>
            </div>
          </article>
        );
      })}

      {items.length > 0 && editable && onAdd && (
        <div className="px-5 py-8 sm:px-12"><AddTile editable={editable} onAdd={onAdd} style={{ borderColor: accent, color: accent }} /></div>
      )}

      {user?.experience?.length > 0 && (() => {
        const t = nextTone();
        return (
          <section className={spreadCls} style={{ backgroundColor: t.bg, color: t.fg }}>
            <Display word="Experience" script="Career" accent={acc(t)} scriptColor={t.fg} size="clamp(3.25rem, 13cqw, 9rem)" />
            <ol className="mt-10 grid gap-6 sm:grid-cols-2">
              {user.experience.map((exp, n) => (
                <li key={n} className="min-w-0 border-t pt-4" style={{ borderColor: t.line }}>
                  <p className="text-xs uppercase tracking-[0.25em]" style={{ color: t.faint }}>{exp.duration || [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).map((d) => (Number.isNaN(new Date(d).getTime()) ? d : new Date(d).getFullYear())).join(' – ')}</p>
                  <p className="mt-1 text-2xl uppercase" style={{ fontFamily: CONDENSED }}>{exp.title}</p>
                  <p style={{ color: t.muted }}>{[exp.company, exp.location].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ol>
          </section>
        );
      })()}

      {skills.length > 0 && (() => {
        const t = nextTone();
        return (
          <section className={spreadCls} style={{ backgroundColor: t.bg, color: t.fg }}>
            <Display word="Strengths" script="Brand" accent={acc(t)} scriptColor={t.fg} size="clamp(3.25rem, 13cqw, 9rem)" />
            <ol className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              {skills.map((s, n) => (
                <li key={s} className="min-w-0 border-t pt-3" style={{ borderColor: t.line }}>
                  <span className="text-sm" style={{ color: t.faint }}>{pad(n + 1)}</span>
                  <p className="break-words text-xl uppercase sm:text-2xl" style={{ fontFamily: CONDENSED }}>{s}</p>
                </li>
              ))}
            </ol>
          </section>
        );
      })()}

      {(() => {
        const t = tone(true);
        return (
          <footer className={`${spreadCls} text-center`} style={{ backgroundColor: t.bg, color: t.fg }}>
            <h2 className="uppercase leading-[0.85]" style={{ fontFamily: CONDENSED, fontSize: 'clamp(3rem, 13cqw, 9.5rem)', color: acc(t) }}>Let&apos;s work together</h2>
            <p className="mt-6 text-lg" style={{ color: t.muted }} data-testid="pf-closing">{L.closing}</p>
            {contact && <p className="mt-4 flex items-center justify-center gap-2 break-all" style={{ color: t.muted }}><FiMail className="shrink-0" />{contact}</p>}
          </footer>
        );
      })()}
    </Book>
  );
};

// ======================================================================
// 7. PRODUCT CATALOGUE (construction & suppliers)
// ======================================================================
const CatalogueCard = ({ item, accent, onAccent, editable, onEdit, onDelete, onOpen, onEnquire, contact }) => {
  const photo = photosOf(item)[0];
  const specs = specsOf(item).slice(0, 3);
  const price = formatPrice(item);
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white text-gray-900 shadow-sm ${onOpen ? 'cursor-pointer transition hover:shadow-md' : ''}`}
      style={{ borderColor: rgba('#111827', 0.08) }}
      onClick={openOnClick(onOpen, item)}
      data-testid={`project-tile-${item._id}`}
    >
      <div className="relative">
        {photo ? <Photo src={photo} n={0} alt={item.title} className="aspect-[4/3]" /> : <Placeholder className="aspect-[4/3] bg-gray-100 text-gray-400" />}
        {item.availability && <AvailabilityBadge value={item.availability} className="absolute left-3 top-3 shadow-sm" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        {item.sku && <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">SKU {item.sku}</p>}
        <h3 className="mt-0.5 break-words text-base font-semibold leading-snug" style={{ fontFamily: MANROPE }}><OpenTitle item={item} onOpen={onOpen} /></h3>
        {specs.length > 0 ? (
          <dl className="mt-3 space-y-1 text-xs">
            {specs.map((s, n) => (
              <div key={`${s.label}-${n}`} className="flex justify-between gap-3"><dt className="text-gray-500">{s.label}</dt><dd className="min-w-0 break-words text-right font-medium">{s.value}</dd></div>
            ))}
          </dl>
        ) : item.description ? <p className="mt-2 line-clamp-2 text-sm text-gray-600">{item.description}</p> : null}
        <div className="mt-auto pt-4">
          {price ? <p className="text-lg font-bold" style={{ color: accent }}>{price}</p> : <p className="text-sm font-medium text-gray-500">Price on request</p>}
          {(item.moq || item.leadTime) && <p className="mt-0.5 text-xs text-gray-500">{[item.moq && `MOQ ${item.moq}`, item.leadTime && `Lead time ${item.leadTime}`].filter(Boolean).join(' · ')}</p>}
          <ProductActions item={item} onEnquire={onEnquire} contact={contact} className="mt-3 [&>*]:flex-1 [&>*]:rounded-lg [&>*]:px-3 [&>*]:text-xs"
            primary={{ backgroundColor: accent, color: onAccent }} secondary={{ borderColor: '#D1D5DB', color: '#111827' }} />
          {onOpen && (
            <button type="button" onClick={() => onOpen(item)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:underline" data-pdf-ignore>
              View details <FiArrowRight />
            </button>
          )}
        </div>
        <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </article>
  );
};

export const CatalogueTemplate = ({ items = [], user, headline, editable, onEdit, onDelete, onAdd, onOpen, onEnquire, accentColor, look }) => {
  const L = resolveLook('catalogue', look);
  const accent = visibleAccent(pickAccent(accentColor, 'catalogue'), L.bg, L.fg);
  const onAccent = isLight(accent) ? '#111827' : '#FFFFFF';
  const heading = { fontFamily: MANROPE, fontWeight: 800, letterSpacing: '-0.02em' };
  const sections = groupSections(items, 'Products');
  const hero = items.find((i) => photosOf(i).length);
  const about = L.about || user?.bio || headline || L.tagline || user?.headline;
  const contact = contactOf(L, user);
  const mail = EMAIL.test((L.contact || '').trim()) ? `mailto:${L.contact.trim()}?subject=${encodeURIComponent('Quote request')}` : '';
  const sectionId = (i) => `catalogue-section-${i}`;

  return (
    <Book L={L} testid="template-catalogue">
      {/* Cover */}
      <header className="grid min-w-0 gap-8 px-5 py-10 sm:px-12 sm:py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: rgba(accent, 0.12), color: accent }}>
            Product catalogue · {yearNow()}
          </p>
          <h1 className="mt-4 break-words leading-[1.02]" style={{ ...heading, fontSize: 'clamp(2.25rem, 6cqw, 4.5rem)' }}>{user?.name || 'Our products'}</h1>
          <p className="mt-4 max-w-xl text-lg" style={{ color: L.muted }} data-testid="pf-tagline">{L.tagline || headline || user?.headline || 'Materials and supplies for builders, architects and contractors.'}</p>
          <p className="mt-4 text-sm" style={{ color: L.faint }}>
            {items.length} {items.length === 1 ? 'product' : 'products'} · {sections.length} {sections.length === 1 ? 'category' : 'categories'}{user?.location ? ` · ${user.location}` : ''}
          </p>
          {sections.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {sections.map((s, i) => (
                <a key={s.name} href={`#${sectionId(i)}`} className="rounded-full border bg-white px-3 py-1 text-sm text-gray-800 hover:border-gray-400" style={{ borderColor: L.line }}>{s.name}</a>
              ))}
            </div>
          )}
          {mail && !onEnquire && (
            <a href={mail} className="mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold" style={{ backgroundColor: accent, color: onAccent }} data-pdf-ignore>Request a quote <FiArrowRight /></a>
          )}
        </div>
        {hero ? (
          <div className={`min-w-0 overflow-hidden rounded-2xl ${onOpen ? 'cursor-pointer' : ''}`} onClick={openOnClick(onOpen, hero)}>
            <Photo src={photosOf(hero)[0]} n={0} alt={hero.title} className="h-[240px] sm:h-[400px]" />
          </div>
        ) : null}
      </header>

      {/* Category nav (sticky, never fixed) */}
      {sections.length > 1 && (
        <nav className="sticky top-0 z-10 border-y backdrop-blur" style={{ borderColor: L.line, backgroundColor: rgba(L.bg, 0.92) }} data-pdf-ignore aria-label="Categories">
          <div className="flex gap-2 overflow-x-auto px-5 py-3 sm:px-12">
            {sections.map((s, i) => (
              <a key={s.name} href={`#${sectionId(i)}`} className="shrink-0 rounded-full border px-3 py-1 text-sm font-medium hover:opacity-75" style={{ borderColor: L.line }}>
                {s.name} <span style={{ color: L.faint }}>{s.items.length}</span>
              </a>
            ))}
          </div>
        </nav>
      )}

      {items.length === 0 && <EmptyState editable={editable} onAdd={onAdd} L={L} display={heading} label="products" />}

      {sections.map((section, si) => (
        <section key={section.name} id={sectionId(si)} className="scroll-mt-16 px-5 py-10 sm:px-12 sm:py-12">
          <div className="flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: L.line }}>
            <h2 className="min-w-0 break-words text-2xl sm:text-3xl" style={heading}>{section.name}</h2>
            <span className="shrink-0 text-sm" style={{ color: L.faint }}>{section.items.length} {section.items.length === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.items.map(({ item }) => (
              <CatalogueCard key={item._id} item={item} accent={accent} onAccent={onAccent} contact={L.contact}
                editable={editable} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} onEnquire={onEnquire} />
            ))}
            {si === sections.length - 1 && <AddTile editable={editable} onAdd={onAdd} label="Add product" className="min-h-[260px] rounded-xl" style={{ borderColor: L.line, color: L.muted }} />}
          </div>
        </section>
      ))}

      {/* Footer */}
      <footer className="mt-6 border-t px-5 py-12 sm:px-12" style={{ borderColor: L.line, backgroundColor: L.fg, color: L.bg }}>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="min-w-0">
            <p className="text-2xl" style={heading} data-testid="pf-closing">{L.closing}</p>
            {about && <p className="mt-3 max-w-xl whitespace-pre-line text-sm" style={{ color: rgba(L.bg, 0.7) }} data-testid="pf-about">{about}</p>}
          </div>
          <div className="min-w-0 space-y-2 text-sm" style={{ color: rgba(L.bg, 0.8) }}>
            <p className="font-semibold" style={{ color: L.bg }}>{user?.name}</p>
            {contact && <p className="flex items-center gap-2 break-all"><FiMail className="shrink-0" />{contact}</p>}
            {user?.location && <p className="flex items-center gap-2"><FiMapPin className="shrink-0" />{user.location}</p>}
          </div>
        </div>
      </footer>
    </Book>
  );
};
