import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { FiEdit2, FiTrash2, FiMail, FiChevronLeft, FiChevronRight, FiArrowRight, FiX, FiImage, FiMapPin, FiFlag, FiCalendar, FiMaximize2, FiUser, FiLayers, FiDownload } from 'react-icons/fi';
import {
  BOOK_THEME_META, BOOK_PALETTE_DEFAULTS, BOOK_COLOUR_PRESETS,
  NoirTemplate, RedlineTemplate, WarmTemplate, ManualTemplate, CleanbookTemplate, CreativeTemplate, CatalogueTemplate
} from './BookTemplates';

// `group` and `modes` let the picker filter templates (portfolio vs product catalogue)
export const THEME_META = [
  { key: 'editorial', label: 'Editorial', description: 'Refined and light, with a warm serif feel', group: 'Architecture', modes: ['portfolio'], swatches: ['#FBF8F3', '#1C1A17', '#F5C518'] },
  { key: 'studio', label: 'Studio', description: 'Bold and dark, one project at a time', group: 'Creative', modes: ['portfolio'], swatches: ['#151618', '#FFFFFF', '#F5C518'] },
  ...BOOK_THEME_META
  // Earlier layouts, kept in the code but not offered for now:
  // { key: 'grid', label: 'Contemporary', description: 'Numbered project grid, monochrome' },
  // { key: 'timeline', label: 'Spec Sheet', description: 'Chaptered spreads with project meta' },
  // { key: 'minimal', label: 'Editorial (classic)', description: 'Large-format photography book' },
  // { key: 'magazine', label: 'Bold', description: 'Color-blocked magazine spreads' },
  // { key: 'stack', label: 'Stacked', description: 'Case-study cards, image + notes' },
  // { key: 'mosaic', label: 'Mosaic', description: 'Asymmetric photo-led grid' },
  // { key: 'index', label: 'Index', description: 'Text-first list, fast to scan' },
  // { key: 'brutalist', label: 'Brutalist', description: 'Thick borders, hard shadows' }
];

export const FONT_META = [
  { key: 'playfair', label: 'Playfair', description: 'Elegant serif · editorial', stack: "'Playfair Display', Georgia, serif" },
  { key: 'space', label: 'Space Grotesk', description: 'Modern geometric sans', stack: "'Space Grotesk', sans-serif" },
  { key: 'mono', label: 'JetBrains Mono', description: 'Technical monospace', stack: "'JetBrains Mono', monospace" },
  { key: 'classic', label: 'Baskerville', description: 'Classic book serif', stack: "'Libre Baskerville', Georgia, serif" },
  { key: 'inter', label: 'Inter', description: 'Clean modern sans', stack: "'Inter', sans-serif" },
  { key: 'dmserif', label: 'DM Serif Display', description: 'Elegant display serif', stack: "'DM Serif Display', Georgia, serif" },
  { key: 'cormorant', label: 'Cormorant Garamond', description: 'Refined literary serif', stack: "'Cormorant Garamond', Georgia, serif" },
  { key: 'bodoni', label: 'Bodoni Moda', description: 'High-contrast fashion serif', stack: "'Bodoni Moda', Georgia, serif" },
  { key: 'fraunces', label: 'Fraunces', description: 'Warm, expressive soft-serif', stack: "'Fraunces', Georgia, serif" },
  { key: 'archivo', label: 'Archivo Black', description: 'Heavyweight display sans', stack: "'Archivo Black', sans-serif" },
  { key: 'bigshoulders', label: 'Big Shoulders', description: 'Condensed industrial display', stack: "'Big Shoulders Display', sans-serif" },
  { key: 'oswald', label: 'Oswald', description: 'Condensed editorial headline', stack: "'Oswald', sans-serif" },
  { key: 'bebas', label: 'Bebas Neue', description: 'Tall condensed display', stack: "'Bebas Neue', sans-serif" },
  { key: 'plexmono', label: 'IBM Plex Mono', description: 'Precise technical monospace', stack: "'IBM Plex Mono', monospace" },
  { key: 'plexsans', label: 'IBM Plex Sans', description: 'Neutral technical sans', stack: "'IBM Plex Sans', sans-serif" },
  { key: 'poppins', label: 'Poppins', description: 'Rounded geometric sans', stack: "'Poppins', sans-serif" },
  { key: 'manrope', label: 'Manrope', description: 'Modern grotesque sans', stack: "'Manrope', sans-serif" },
  { key: 'syne', label: 'Syne', description: 'Contemporary quirky display', stack: "'Syne', sans-serif" },
  { key: 'unbounded', label: 'Unbounded', description: 'Bold geometric display', stack: "'Unbounded', sans-serif" },
  { key: 'spectral', label: 'Spectral', description: 'Literary book serif', stack: "'Spectral', Georgia, serif" }
];

export const ACCENT_PRESETS = ['#F5C518', '#1F1F1F', '#A8A8A8', '#9AA08B', '#E9E2D8'];
// Earlier presets: ['#D4F547', '#FFB347', '#7DD3FC', '#FCA5A5', '#C4B5FD', '#000000']

export const fontStack = (font) => FONT_META.find((f) => f.key === font)?.stack || FONT_META[0].stack;
export const num = (i) => String(i + 1).padStart(2, '0');
// Own-account view passes `connections` (populated array); public view passes `connectionCount` (number)
const connCount = (user) => (typeof user?.connectionCount === 'number' ? user.connectionCount : (user?.connections?.length ?? null));

export const Controls = ({ item, editable, onEdit, onDelete, light }) => {
  if (!editable) return null;
  return (
    <div className="flex gap-2 mt-4" data-pdf-ignore>
      <Button size="sm" variant="outline" onClick={() => onEdit(item)}
        className={`rounded-none flex items-center gap-1 ${light ? 'bg-transparent border-white/40 text-white hover:bg-white/10' : ''}`}>
        <FiEdit2 className="w-3.5 h-3.5" />Edit
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDelete(item)}
        className={`rounded-none flex items-center gap-1 text-red-500 hover:text-red-600 ${light ? 'bg-transparent border-white/40 hover:bg-white/10' : ''}`}>
        <FiTrash2 className="w-3.5 h-3.5" />Remove
      </Button>
    </div>
  );
};

export const Tags = ({ tags, light }) => {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {tags.map((t, i) => (
        <span key={i} className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border ${light ? 'border-white/40 text-white/80' : 'border-black/20 text-black/60'}`}>{t}</span>
      ))}
    </div>
  );
};

const ContactStrip = ({ user, accentColor }) => (
  <div className="bg-black text-white py-16 px-6 sm:px-10 mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
    <div>
      <span className="text-xs tracking-[0.3em] uppercase" style={{ color: accentColor }}>Get in touch</span>
      <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mt-2">Open for new work</h3>
    </div>
    <div className="flex items-center gap-2 text-white/80">
      <FiMail />
      <span>{user?.email || `@${user?.username}`}</span>
    </div>
  </div>
);

// ---------- COVER: full-bleed hero, bold uppercase title, thin index rule ----------
const Cover = ({ user, headline, heroImage, kicker = 'Portfolio', count, accentColor }) => (
  <div className="relative bg-black text-white min-h-[70vh] flex flex-col justify-end overflow-hidden">
    {heroImage && <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.92) 100%)' }} />
    <div className="relative p-6 sm:p-14">
      <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-white/60 mb-8">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        <span className="flex-1">{kicker}</span>
        <span>{count} {count === 1 ? 'Entry' : 'Entries'}</span>
      </div>
      <h1 className="text-5xl sm:text-8xl font-black uppercase tracking-tighter leading-[0.9]">{user?.name}</h1>
      {(user?.role || user?.location) && (
        <p className="mt-3 text-sm text-white/60 uppercase tracking-wide">
          {[user.role, user.location].filter(Boolean).join(' · ')}
          {connCount(user) !== null && ` · ${connCount(user)} connection${connCount(user) === 1 ? '' : 's'}`}
        </p>
      )}
      {(headline || user?.bio) && (
        <p className="mt-4 text-base sm:text-lg text-white/70 max-w-md italic">{headline || user?.bio}</p>
      )}
      {user?.skills?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {user.skills.slice(0, 8).map((s, i) => (
            <span key={i} className="text-[10px] tracking-widest uppercase px-2.5 py-1 border border-white/30 text-white/80">{s}</span>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ExperienceSection = ({ experience }) => {
  if (!experience?.length) return null;
  return (
    <div className="border-t border-black/10 p-6 sm:p-14">
      <span className="text-xs tracking-[0.3em] uppercase text-gray-400">Experience</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-5">
        {experience.map((exp, i) => (
          <div key={i} className="border-l-2 border-black/10 pl-4">
            <h4 className="font-black uppercase tracking-tight">{exp.title}</h4>
            <p className="text-sm text-gray-600">{[exp.company, exp.duration].filter(Boolean).join(' · ')}</p>
            {exp.description && <p className="text-sm text-gray-500 mt-1">{exp.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- GRID / "Contemporary": image-led cards, category + title overlaid on the photo ----------
export const GridTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
    <Cover user={user} headline={headline} heroImage={items[0]?.images?.[0]} count={items.length} accentColor={accentColor} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-black/10">
      {items.map((item, i) => (
        <div key={item._id} className="border-b border-r border-black/10 sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0">
          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
            {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />}
            {item.category && (
              <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-black" style={{ backgroundColor: accentColor }}>
                {item.category}
              </span>
            )}
            <div className="absolute inset-0 flex flex-col justify-end p-4" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.85) 100%)' }}>
              <span className="text-[10px] tracking-widest text-white/60">{num(i)}</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white leading-tight">{item.title}</h3>
            </div>
          </div>
          <div className="p-6 pt-4">
            {item.description && <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>}
            <Tags tags={item.tags} />
            <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);

// ---------- TIMELINE / "Spec Sheet": full-bleed image + meta block per chapter ----------
export const TimelineTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
    <Cover user={user} headline={headline} heroImage={items[0]?.images?.[0]} kicker="Project Log" count={items.length} accentColor={accentColor} />
    {items.map((item, i) => (
      <div key={item._id} className="border-t border-black/10">
        {item.images?.[0] && (
          <div className="w-full h-[45vh] sm:h-[60vh] bg-gray-100 overflow-hidden">
            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 p-6 sm:p-12">
          <div>
            <span className="text-5xl sm:text-6xl font-black text-gray-200 leading-none">{num(i)}</span>
          </div>
          <div className="sm:col-span-2">
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{item.title}</h3>
            {item.description && <p className="text-gray-700 mt-4 leading-relaxed max-w-2xl">{item.description}</p>}
            <Tags tags={item.tags} />
            <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      </div>
    ))}
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);

// ---------- MINIMAL / "Editorial": large-format book, generous margins, serif captions ----------
export const MinimalTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white max-w-4xl mx-auto" style={{ fontFamily: fontStack(font) }}>
    <div className="text-center py-20 px-6 border-b border-black/10">
      <span className="text-xs tracking-[0.3em] uppercase" style={{ color: accentColor }}>Portfolio</span>
      <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mt-4">{user?.name}</h1>
      {(user?.role || user?.location) && (
        <p className="mt-2 text-sm text-gray-400 uppercase tracking-wide">
          {[user.role, user.location].filter(Boolean).join(' · ')}
          {connCount(user) !== null && ` · ${connCount(user)} connection${connCount(user) === 1 ? '' : 's'}`}
        </p>
      )}
      {(headline || user?.bio) && <p className="mt-4 text-gray-500 max-w-md mx-auto italic">{headline || user?.bio}</p>}
      {user?.skills?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {user.skills.slice(0, 8).map((s, i) => (
            <span key={i} className="text-[10px] tracking-widest uppercase px-2.5 py-1 border border-black/20 text-black/60">{s}</span>
          ))}
        </div>
      )}
    </div>
    {items.map((item, i) => (
      <div key={item._id} className="py-14 px-6 border-b border-black/10">
        <span className="text-xs tracking-widest" style={{ color: accentColor }}>{num(i)} / {num(items.length - 1)}</span>
        {item.images?.[0] && (
          <img src={item.images[0]} alt={item.title} className="w-full max-h-[520px] object-cover mt-5" />
        )}
        <h3 className="text-2xl font-black uppercase tracking-tight mt-6">{item.title}</h3>
        {item.description && <p className="text-gray-700 mt-3 leading-relaxed italic">{item.description}</p>}
        <Tags tags={item.tags} />
        <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
      </div>
    ))}
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);

// ---------- MAGAZINE / "Bold": color-blocked spreads, alternating layout ----------
export const MagazineTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => {
  const [featured, ...rest] = items;
  return (
    <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
      <Cover user={user} headline={headline} heroImage={featured?.images?.[0]} count={items.length} accentColor={accentColor} />
      {featured && (
        <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-black/10">
          <div className="p-8 sm:p-14 flex flex-col justify-center" style={{ backgroundColor: accentColor }}>
            <span className="text-xs tracking-widest uppercase text-black/60">Featured — 01</span>
            <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mt-3">{featured.title}</h3>
            {featured.description && <p className="text-black/70 mt-4">{featured.description}</p>}
            <Tags tags={featured.tags} />
            <Controls item={featured} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
          {featured.images?.[0] && (
            <div className="h-72 sm:h-auto">
              <img src={featured.images[0]} alt={featured.title} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}
      {rest.map((item, i) => (
        <div key={item._id} className={`grid grid-cols-1 sm:grid-cols-2 border-t border-black/10 ${i % 2 === 1 ? 'sm:[direction:rtl]' : ''}`}>
          {item.images?.[0] && (
            <div className="h-64 sm:h-96" style={{ direction: 'ltr' }}>
              <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-8 sm:p-14 flex flex-col justify-center" style={{ direction: 'ltr' }}>
            <span className="text-xs tracking-widest" style={{ color: accentColor }}>{num(i + 1)}</span>
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-2">{item.title}</h3>
            {item.description && <p className="text-gray-700 mt-3">{item.description}</p>}
            <Tags tags={item.tags} />
            <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      ))}
      <ExperienceSection experience={user?.experience} />
      <ContactStrip user={user} accentColor={accentColor} />
    </div>
  );
};

// ---------- STACK / "Stacked": case-study cards, image beside notes, hairline dividers ----------
export const StackTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
    <Cover user={user} headline={headline} heroImage={items[0]?.images?.[0]} kicker="Case Studies" count={items.length} accentColor={accentColor} />
    <div className="divide-y divide-black/10">
      {items.map((item, i) => (
        <div key={item._id} className="grid grid-cols-1 sm:grid-cols-5 gap-6 p-6 sm:p-10">
          <div className="sm:col-span-2">
            {item.images?.[0] ? (
              <img src={item.images[0]} alt={item.title} className="w-full aspect-[4/3] object-cover" />
            ) : (
              <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center text-3xl font-black text-gray-300">{num(i)}</div>
            )}
          </div>
          <div className="sm:col-span-3">
            <span className="text-xs tracking-widest" style={{ color: accentColor }}>{num(i)}</span>
            <h3 className="text-2xl font-black uppercase tracking-tight mt-1">{item.title}</h3>
            {item.description && <p className="text-gray-700 mt-3 leading-relaxed">{item.description}</p>}
            <Tags tags={item.tags} />
            <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);

// ---------- MOSAIC: asymmetric photo-led grid, first item spans a 2x2 block ----------
export const MosaicTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
    <Cover user={user} headline={headline} heroImage={items[0]?.images?.[0]} count={items.length} accentColor={accentColor} />
    <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] gap-1 p-1">
      {items.map((item, i) => (
        <div key={item._id} className={`relative group overflow-hidden bg-gray-100 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
          {item.images?.[0] ? (
            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-300">{num(i)}</div>
          )}
          <div className="absolute inset-0 flex flex-col justify-end p-4" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.82) 100%)' }}>
            <span className="text-[10px] tracking-widest uppercase" style={{ color: accentColor }}>{num(i)}</span>
            <h3 className="text-white font-black uppercase tracking-tight leading-tight">{item.title}</h3>
            <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light />
          </div>
        </div>
      ))}
    </div>
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);

// ---------- INDEX: text-first numbered list, thumbnail aside, fast to scan ----------
export const IndexTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white max-w-4xl mx-auto" style={{ fontFamily: fontStack(font) }}>
    <div className="py-16 px-6 border-b border-black/10">
      <span className="text-xs tracking-[0.3em] uppercase" style={{ color: accentColor }}>Index</span>
      <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mt-4">{user?.name}</h1>
      {(user?.role || user?.location) && (
        <p className="mt-2 text-sm text-gray-400 uppercase tracking-wide">
          {[user.role, user.location].filter(Boolean).join(' · ')}
          {connCount(user) !== null && ` · ${connCount(user)} connection${connCount(user) === 1 ? '' : 's'}`}
        </p>
      )}
      {(headline || user?.bio) && <p className="mt-4 text-gray-500 max-w-md italic">{headline || user?.bio}</p>}
    </div>
    <div className="divide-y divide-black/10">
      {items.map((item, i) => (
        <div key={item._id} className="flex items-center gap-5 py-6 px-6 sm:px-0 group">
          <span className="text-sm text-gray-300 font-black w-8 shrink-0">{num(i)}</span>
          <div className="w-16 h-16 bg-gray-100 shrink-0 overflow-hidden">
            {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black uppercase tracking-tight truncate">{item.title}</h3>
            {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
            <Tags tags={item.tags} />
            <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);

// ---------- BRUTALIST: thick borders, hard offset shadows, blocky high-impact type ----------
export const BrutalistTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
    <div className="border-b-4 border-black p-6 sm:p-14">
      <div className="inline-block px-3 py-1 mb-6 text-xs font-black uppercase tracking-widest text-black border-2 border-black" style={{ backgroundColor: accentColor }}>
        {items.length} {items.length === 1 ? 'Entry' : 'Entries'}
      </div>
      <h1 className="text-5xl sm:text-8xl font-black uppercase tracking-tighter leading-[0.9]">{user?.name}</h1>
      {(user?.role || user?.location) && (
        <p className="mt-3 text-sm font-bold uppercase tracking-wide">
          {[user.role, user.location].filter(Boolean).join(' · ')}
          {connCount(user) !== null && ` · ${connCount(user)} connection${connCount(user) === 1 ? '' : 's'}`}
        </p>
      )}
      {(headline || user?.bio) && <p className="mt-4 text-base sm:text-lg max-w-md">{headline || user?.bio}</p>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 sm:p-14">
      {items.map((item, i) => (
        <div key={item._id} className="border-4 border-black p-5" style={{ boxShadow: `8px 8px 0 ${accentColor}` }}>
          {item.images?.[0] && (
            <div className="border-2 border-black mb-4 overflow-hidden">
              <img src={item.images[0]} alt={item.title} className="w-full aspect-[4/3] object-cover" />
            </div>
          )}
          <span className="text-xs font-black">{num(i)}</span>
          <h3 className="text-xl font-black uppercase tracking-tight mt-1">{item.title}</h3>
          {item.description && <p className="text-sm mt-2">{item.description}</p>}
          <Tags tags={item.tags} />
          <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
    <ExperienceSection experience={user?.experience} />
    <ContactStrip user={user} accentColor={accentColor} />
  </div>
);


// ---------- Customisation shared by Editorial and Studio ----------
// Background and text colours default to each template's own palette; an
// empty value in the saved settings means "use the template default".
export const PALETTE_DEFAULTS = {
  editorial: { background: '#FBF8F3', textColor: '#1C1A17' },
  studio: { background: '#151618', textColor: '#FFFFFF' },
  ...BOOK_PALETTE_DEFAULTS
};

export const COLOUR_PRESETS = {
  editorial: [
    { label: 'Cream', background: '#FBF8F3', textColor: '#1C1A17' },
    { label: 'White', background: '#FFFFFF', textColor: '#111111' },
    { label: 'Sand', background: '#EFE6D8', textColor: '#2B2620' },
    { label: 'Sage', background: '#E7EAE0', textColor: '#1F2A1F' },
    { label: 'Blush', background: '#F6E9E4', textColor: '#2E1F1B' },
    { label: 'Stone', background: '#E9E9E6', textColor: '#1E1E1E' }
  ],
  studio: [
    { label: 'Charcoal', background: '#151618', textColor: '#FFFFFF' },
    { label: 'Black', background: '#000000', textColor: '#FFFFFF' },
    { label: 'Ink', background: '#0F172A', textColor: '#F8FAFC' },
    { label: 'Forest', background: '#14211B', textColor: '#EEF3EA' },
    { label: 'Espresso', background: '#1F1A17', textColor: '#F5EFE6' },
    { label: 'Plum', background: '#221623', textColor: '#F6EEF4' }
  ],
  ...BOOK_COLOUR_PRESETS
};

export const DEFAULT_CLOSING_LINE = "Let's work together.";

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
export const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6;
};

// Everything a template needs from the saved look, with defaults filled in
export const resolveLook = (theme, look = {}) => {
  const base = PALETTE_DEFAULTS[theme];
  const bg = HEX.test(look.background || '') ? look.background : base.background;
  const fg = HEX.test(look.textColor || '') ? look.textColor : base.textColor;
  return {
    bg,
    fg,
    muted: rgba(fg, 0.65),
    faint: rgba(fg, 0.5),
    line: rgba(fg, 0.12),
    onDark: isLight(fg),
    body: look.bodyFont ? { fontFamily: fontStack(look.bodyFont) } : {},
    tagline: look.tagline || '',
    about: look.aboutText || '',
    closing: look.closingLine || DEFAULT_CLOSING_LINE,
    contact: look.contactInfo || ''
  };
};

// An accent too close to the background is swapped for the text colour
export const visibleAccent = (accent, bg, fg) => {
  if (!HEX.test(accent || '')) return fg;
  const d = (a, b) => Math.abs(parseInt(a.slice(1), 16) - parseInt(b.slice(1), 16));
  return isLight(accent) === isLight(bg) && d(accent, bg) < 0x303030 ? fg : accent;
};

// Clicking anywhere on a project (except its own buttons and links) opens it in
// the viewer; a clicked photo opens the viewer at that photo.
export const openOnClick = (onOpen, item) => (onOpen ? (e) => {
  if (e.target.closest('button, a, input, label')) return;
  const photo = e.target.closest('[data-photo]');
  onOpen(item, photo ? Number(photo.dataset.photo) || 0 : 0);
} : undefined);

// A project title that opens the viewer (keyboard reachable) when the page allows it
export const OpenTitle = ({ item, onOpen }) => (onOpen ? (
  <button type="button" onClick={() => onOpen(item)} className="text-left hover:underline focus:underline focus:outline-none">{item.title}</button>
) : item.title);

// ---------- EDITORIAL: light, refined, serif-led; split hero and full galleries ----------
const editorialSection = (id) => `editorial-${id}`;

export const EditorialTemplate = ({ items, user, headline, editable, onEdit, onDelete, onOpen, font = 'playfair', accentColor = '#F5C518', look }) => {
  const display = { fontFamily: fontStack(font) };
  const L = resolveLook('editorial', look);
  const accent = visibleAccent(accentColor, L.bg, L.fg);
  const hero = items[0];
  const about = L.about || user?.bio || headline;
  const contact = L.contact || user?.email || `@${user?.username}`;
  return (
    <div style={{ backgroundColor: L.bg, color: L.fg, ...L.body }}>
      <nav className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-12 sm:py-5" style={{ borderColor: L.line }}>
        <span className="text-sm uppercase tracking-[0.25em]" style={display}>{user?.name}</span>
        <div className="flex gap-5 text-xs" style={{ color: L.muted }} data-pdf-ignore>
          <a href={`#${editorialSection('projects')}`} className="hover:underline">Projects</a>
          <a href={`#${editorialSection('about')}`} className="hover:underline">About</a>
          <a href={`#${editorialSection('contact')}`} className="hover:underline">Contact</a>
        </div>
      </nav>

      {L.tagline && (
        <p className="max-w-3xl px-5 pt-8 text-xl leading-snug sm:px-12 sm:pt-10 sm:text-3xl" style={display} data-testid="pf-tagline">{L.tagline}</p>
      )}

      {hero && (
        <header className={`grid gap-6 sm:gap-8 px-5 py-8 sm:px-12 sm:py-12 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-16 ${onOpen ? 'cursor-pointer' : ''}`} onClick={openOnClick(onOpen, hero)}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: L.faint }}>{[hero.category, hero.location].filter(Boolean).join(' · ') || 'Featured project'}</p>
            <h1 className="mt-4 break-words text-4xl leading-[1.05] sm:text-7xl" style={display}><OpenTitle item={hero} onOpen={onOpen} /></h1>
            {hero.description && <p className="mt-5 max-w-md leading-relaxed" style={{ color: L.muted }}>{hero.description}</p>}
            {onOpen ? (
              <button type="button" onClick={() => onOpen(hero)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline" data-pdf-ignore>
                View project <FiArrowRight />
              </button>
            ) : (
              <a href={`#${editorialSection(hero._id)}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" data-pdf-ignore>
                View project <FiArrowRight />
              </a>
            )}
          </div>
          {hero.images?.[0] && <img src={hero.images[0]} alt={hero.title} data-photo="0" className="h-[260px] w-full object-cover sm:h-[520px]" />}
        </header>
      )}

      <section id={editorialSection('projects')} className="border-t" style={{ borderColor: L.line }}>
        {items.map((item, i) => (
          <article
            key={item._id}
            id={editorialSection(item._id)}
            className={`border-b px-5 py-10 sm:px-12 sm:py-14 ${onOpen ? 'cursor-pointer' : ''}`}
            style={{ borderColor: L.line }}
            onClick={openOnClick(onOpen, item)}
            data-testid={`project-tile-${item._id}`}
          >
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
              <div>
                <span className="text-sm" style={{ color: accent }}>{num(i)}</span>
                <h2 className="mt-2 break-words text-3xl leading-tight sm:text-4xl" style={display}><OpenTitle item={item} onOpen={onOpen} /></h2>
                <p className="mt-2 text-sm" style={{ color: L.faint }}>{[item.category, item.projectStatus, item.location].filter(Boolean).join(' · ')}</p>
                {item.description && <p className="mt-4 leading-relaxed" style={{ color: L.muted }}>{item.description}</p>}
                <Tags tags={item.tags} light={L.onDark} />
                <Controls item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
              </div>
              {item.images?.length > 0 && (
                <div className="space-y-4">
                  <img src={item.images[0]} alt={item.title} data-photo="0" className="aspect-[4/3] w-full object-cover sm:aspect-auto sm:max-h-[560px]" />
                  {item.images.length > 1 && (
                    <div className="grid grid-cols-2 gap-4">
                      {item.images.slice(1).map((src, n) => (
                        <img key={src} src={src} alt="" data-photo={n + 1} className="aspect-[4/3] w-full object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <section id={editorialSection('about')} className="px-5 py-10 sm:px-12 sm:py-14">
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: L.faint }}>About</p>
        <h2 className="mt-3 text-3xl sm:text-4xl" style={display}>{user?.name}</h2>
        {about && <p className="mt-4 max-w-2xl whitespace-pre-line leading-relaxed" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
        {user?.experience?.length > 0 && (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {user.experience.map((exp, i) => (
              <li key={i} className="border-l-2 pl-4" style={{ borderColor: accent }}>
                <p className="font-semibold">{exp.title}</p>
                <p className="text-sm" style={{ color: L.muted }}>{[exp.company, exp.duration].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer id={editorialSection('contact')} className="flex flex-col gap-3 border-t px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12" style={{ borderColor: L.line }}>
        <p className="text-2xl sm:text-3xl" style={display} data-testid="pf-closing">{L.closing}</p>
        <p className="flex items-center gap-2 break-all" style={{ color: L.muted }}><FiMail className="shrink-0" />{contact}</p>
      </footer>
    </div>
  );
};

// ---------- STUDIO: bold and dark; one project at a time with a thumbnail strip ----------
export const StudioTemplate = ({ items, user, headline, editable, onEdit, onDelete, onAdd, onOpen, font = 'playfair', accentColor = '#F5C518', look }) => {
  const [current, setCurrent] = useState(0);
  const display = { fontFamily: fontStack(font) };
  const L = resolveLook('studio', look);
  const ring = visibleAccent(accentColor, L.bg, L.fg);
  const safe = Math.min(current, Math.max(items.length - 1, 0));
  const item = items[safe];
  const go = (step) => setCurrent((c) => (c + step + items.length) % items.length);
  const about = L.about || user?.bio || headline;
  const contact = L.contact || user?.email || `@${user?.username}`;
  // The project card flips the page colours: text colour as its background
  const card = { backgroundColor: L.fg, color: L.bg };
  const cardMuted = rgba(L.bg, 0.65);
  const cardLine = rgba(L.bg, 0.2);

  return (
    <div style={{ backgroundColor: L.bg, color: L.fg, ...L.body }}>
      <nav className="flex items-center justify-between gap-4 px-6 py-5 sm:px-12">
        <span className="text-sm uppercase tracking-[0.25em]" style={display}>{user?.name}</span>
        <span className="text-xs capitalize" style={{ color: L.faint }}>{[user?.role, user?.location].filter(Boolean).join(' · ')}</span>
      </nav>

      {L.tagline && (
        <p className="max-w-3xl px-6 pb-6 pt-2 text-2xl leading-snug sm:px-12 sm:text-4xl" style={display} data-testid="pf-tagline">{L.tagline}</p>
      )}

      {item && (
        <section className="px-4 sm:px-12">
          <div className={`overflow-hidden rounded-xl ${onOpen ? 'cursor-pointer' : ''}`} style={card} onClick={openOnClick(onOpen, item)}>
            {item.images?.[0] && <img src={item.images[0]} alt={item.title} data-photo="0" className="h-[240px] w-full object-cover sm:h-[520px]" />}
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
              <div className="min-w-0">
                <h1 className="break-words text-3xl leading-tight sm:text-5xl" style={display}><OpenTitle item={item} onOpen={onOpen} /></h1>
                <p className="mt-2" style={{ color: cardMuted }}>{item.description ? item.description.split(/(?<=\.)\s/)[0] : [item.category, item.location].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4" data-pdf-ignore>
                <span className="text-sm tabular-nums" style={{ color: cardMuted }}>{num(safe)} / {num(items.length - 1)}</span>
                <button type="button" onClick={() => go(-1)} aria-label="Previous project" className="rounded-full border p-2 hover:opacity-70" style={{ borderColor: cardLine }}><FiChevronLeft /></button>
                <button type="button" onClick={() => go(1)} aria-label="Next project" className="rounded-full border p-2 hover:opacity-70" style={{ borderColor: cardLine }}><FiChevronRight /></button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex gap-3 overflow-x-auto px-6 py-5 sm:px-12" data-pdf-ignore>
        {items.map((it, i) => (
          <button
            key={it._id}
            type="button"
            onClick={() => setCurrent(i)}
            className="w-36 shrink-0 text-left"
            aria-pressed={i === safe}
          >
            <span className="block h-20 overflow-hidden rounded-lg border-2" style={{ borderColor: i === safe ? ring : 'transparent' }}>
              {it.images?.[0] ? <img src={it.images[0]} alt="" className="h-full w-full object-cover" /> : <span className="block h-full w-full" style={{ backgroundColor: L.line }} />}
            </span>
            <span className="mt-1 block truncate text-xs" style={{ color: L.muted }}>{it.title}</span>
          </button>
        ))}
        {editable && onAdd && (
          <button type="button" onClick={onAdd} className="flex h-20 w-32 shrink-0 flex-col items-center justify-center rounded-lg border text-xs hover:opacity-80" style={{ borderColor: L.line, color: L.muted }}>
            <span className="text-xl">+</span>Add work
          </button>
        )}
      </div>

      {/* Every project in full, so nothing is hidden (and the PDF includes all work) */}
      <section className="border-t px-6 py-12 sm:px-12" style={{ borderColor: L.line }}>
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: L.faint }}>All work</p>
        <div className="mt-8 space-y-16 lg:space-y-20">
          {items.map((it, i) => {
            const photos = it.images || [];
            const flip = i % 2 === 1; // alternate sides so the page reads like a spread
            return (
              <article
                key={it._id}
                className={`grid items-center gap-6 lg:gap-12 ${!photos.length ? '' : flip ? 'lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]'} ${onOpen ? 'cursor-pointer' : ''}`}
                onClick={openOnClick(onOpen, it)}
                data-testid={`project-tile-${it._id}`}
              >
                <div className={`min-w-0 ${flip && photos.length ? 'lg:order-2' : ''}`}>
                  <p className="text-sm" style={{ color: ring }}>{num(i)}</p>
                  <h2 className="mt-1 min-w-0 break-words text-3xl sm:text-4xl" style={display}><OpenTitle item={it} onOpen={onOpen} /></h2>
                  {[it.category, it.projectStatus, it.location].filter(Boolean).length > 0 && (
                    <p className="mt-2 text-sm" style={{ color: L.faint }}>{[it.category, it.projectStatus, it.location].filter(Boolean).join(' · ')}</p>
                  )}
                  {it.description && <p className="mt-4 leading-relaxed" style={{ color: L.muted }}>{it.description}</p>}
                  <Tags tags={it.tags} light={L.onDark} />
                  <Controls item={it} editable={editable} onEdit={onEdit} onDelete={onDelete} light={L.onDark} />
                </div>
                {photos.length > 0 && (
                  <div className={`min-w-0 ${flip ? 'lg:order-1' : ''}`}>
                    <img src={photos[0]} alt={it.title} data-photo={0} className="aspect-[4/3] w-full rounded-xl object-cover" />
                    {photos.length > 1 && (
                      <div className={`mt-3 grid gap-3 ${photos.length === 2 ? 'grid-cols-1' : photos.length === 3 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {photos.slice(1).map((src, n) => (
                          <img key={src} src={src} alt="" data-photo={n + 1} className={`w-full rounded-lg object-cover ${photos.length === 2 ? 'aspect-[16/7]' : 'aspect-[4/3]'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-col gap-3 border-t px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-12" style={{ borderColor: L.line }}>
        <div>
          <p className="text-2xl" style={display} data-testid="pf-closing">{L.closing}</p>
          {about && <p className="mt-1 max-w-xl whitespace-pre-line text-sm" style={{ color: L.muted }} data-testid="pf-about">{about}</p>}
        </div>
        <p className="flex items-center gap-2 break-all" style={{ color: L.muted }}><FiMail className="shrink-0" />{contact}</p>
      </footer>
    </div>
  );
};

// ---------- Products: INR prices, availability, spec helpers (shared with BookTemplates) ----------
export const UNIT_LABELS = { piece: '/piece', sqft: '/sq ft', sqm: '/sq m', rft: '/running ft', kg: '/kg', bag: '/bag', ton: '/ton', set: '/set' };

const hasNumber = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
const short = (x) => String(parseFloat(x.toFixed(2)));

// ₹3.5 Cr, ₹1.2 L, otherwise ₹12,500
export const formatINR = (value) => {
  if (!hasNumber(value)) return '';
  const n = Number(value);
  if (n >= 1e7) return `₹${short(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${short(n / 1e5)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// "₹450 – ₹780 / sq ft"; "" when the item has no price
export const formatPrice = (item) => {
  const from = hasNumber(item?.priceFrom) ? Number(item.priceFrom) : null;
  const to = hasNumber(item?.priceTo) ? Number(item.priceTo) : null;
  if (from === null && to === null) return '';
  let text;
  if (from !== null && to !== null && to !== from) text = `${formatINR(Math.min(from, to))} – ${formatINR(Math.max(from, to))}`;
  else if (from !== null) text = formatINR(from);
  else text = `Up to ${formatINR(to)}`;
  const unit = UNIT_LABELS[item?.priceUnit];
  return unit ? `${text} ${unit.replace('/', '/ ')}` : text;
};

export const AVAILABILITY_META = {
  in_stock: { label: 'In stock', color: '#166534', bg: '#DCFCE7' },
  made_to_order: { label: 'Made to order', color: '#92400E', bg: '#FEF3C7' },
  out_of_stock: { label: 'Out of stock', color: '#991B1B', bg: '#FEE2E2' }
};

export const AvailabilityBadge = ({ value, className = '' }) => {
  const meta = AVAILABILITY_META[value];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`} style={{ color: meta.color, backgroundColor: meta.bg }} data-testid="availability-badge">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}
    </span>
  );
};

export const isProduct = (item) => item?.kind === 'product';
export const specsOf = (item) => (Array.isArray(item?.specs) ? item.specs.filter((s) => s && (s.label || s.value)) : []);
export const STORY_LABELS = { summary: 'Summary', contribution: 'My contribution', process: 'Process', outcome: 'Outcome' };
// [{ key, label, text }] for the story parts that have text
export const storyOf = (item) => Object.keys(STORY_LABELS)
  .map((key) => ({ key, label: STORY_LABELS[key], text: typeof item?.story?.[key] === 'string' ? item.story[key].trim() : '' }))
  .filter((s) => s.text);

// ---------- PROJECT VIEWER: one project in full, shown before any editing ----------
// Wrap it in <DialogContent className={PROJECT_VIEWER_DIALOG_CLASS}>: full screen on
// phones, a large panel from `sm` up. The dialog's own close button is hidden
// because the viewer has its own.
export const PROJECT_VIEWER_DIALOG_CLASS = 'flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#FAF9F6] p-0 sm:h-[92vh] sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:max-w-6xl sm:rounded-2xl sm:border [&>button:last-child]:hidden';

const viewerDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';
};

/**
 * Read-only view of a project: photo gallery (arrow keys, swipe, thumbnails,
 * click for full size) and its details. `actions` are extra header buttons
 * (Edit, Share, Report). Give it `key={item._id}` so the gallery restarts per project.
 */
export const ProjectViewer = ({ item, index = 0, total = 1, initialPhoto = 0, onPrev, onNext, onClose, actions }) => {
  const images = item?.images || [];
  const [photo, setPhoto] = useState(initialPhoto);
  const touchX = useRef(null);
  const current = Math.min(Math.max(photo, 0), Math.max(images.length - 1, 0));
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  const step = (dir) => setPhoto((p) => (Math.min(p, images.length - 1) + dir + images.length) % images.length);

  // Arrow keys move between photos; with one photo or none they move between projects
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"], [role="menu"], [role="radiogroup"]')) return;
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      if (images.length > 1) {
        e.preventDefault();
        setPhoto((p) => (Math.min(p, images.length - 1) + dir + images.length) % images.length);
      } else if (dir > 0 && index < total - 1) {
        onNext?.();
      } else if (dir < 0 && index > 0) {
        onPrev?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, index, total, onPrev, onNext]);

  if (!item) return null;

  const onTouchEnd = (e) => {
    if (touchX.current === null || images.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  };

  const date = viewerDate(item.createdAt);
  const captions = Array.isArray(item.captions) ? item.captions : [];
  const caption = (captions[current] || '').trim();
  const product = isProduct(item);
  const kicker = [...new Set([item.section, item.category].filter(Boolean))].join(' · ');
  const meta = [
    item.location && { icon: FiMapPin, label: 'Location', value: item.location },
    item.role && { icon: FiUser, label: 'Role', value: item.role },
    item.year && { icon: FiCalendar, label: 'Year', value: String(item.year) },
    item.projectStatus && { icon: FiFlag, label: 'Status', value: item.projectStatus },
    !item.year && date && { icon: FiCalendar, label: 'Added', value: date }
  ].filter(Boolean);
  const story = storyOf(item);
  const description = (item.description || '').trim();
  // The description stays unless the story already says the same thing
  const showDescription = description && !story.some((part) => part.text === description);
  const price = product ? formatPrice(item) : '';
  const specs = product ? specsOf(item) : [];
  const facts = product ? [
    item.sku && ['SKU', item.sku],
    item.moq && ['Minimum order', item.moq],
    item.leadTime && ['Lead time', item.leadTime]
  ].filter(Boolean) : [];
  const chipRow = (label, list) => (Array.isArray(list) && list.filter(Boolean).length > 0 ? (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {list.filter(Boolean).map((v, n) => (
          <span key={`${v}-${n}`} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">{v}</span>
        ))}
      </div>
    </div>
  ) : null);
  const navBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition hover:bg-gray-50 disabled:opacity-30';

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-[#FAF9F6]" data-testid="project-viewer">
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 sm:px-5 sm:py-3">
        {total > 1 && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onPrev} disabled={!hasPrev} className={navBtn} aria-label="Previous project" data-testid="project-viewer-prev"><FiChevronLeft /></button>
            <span className="hidden text-xs tabular-nums text-gray-500 sm:inline">{index + 1} of {total}</span>
            <button type="button" onClick={onNext} disabled={!hasNext} className={navBtn} aria-label="Next project" data-testid="project-viewer-next"><FiChevronRight /></button>
          </div>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {actions}
          <button type="button" onClick={onClose} className={navBtn} aria-label="Close" data-testid="project-viewer-close"><FiX /></button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:overflow-hidden">
        <section className={`flex min-w-0 flex-col ${images.length ? 'bg-black' : 'bg-gray-100'} lg:min-h-0`} aria-label="Photos">
          <div
            className="relative flex h-[52vh] min-h-[240px] items-center justify-center sm:h-[60vh] lg:h-auto lg:min-h-0 lg:flex-1"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={onTouchEnd}
          >
            {images.length > 0 ? (
              <a href={images[current]} target="_blank" rel="noreferrer" className="group flex h-full w-full items-center justify-center" title="Open full size" data-testid="project-viewer-image">
                <img src={images[current]} alt={caption || `${item.title} – photo ${current + 1}`} className="max-h-full max-w-full object-contain" />
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-80 group-hover:opacity-100"><FiMaximize2 className="h-4 w-4" /></span>
              </a>
            ) : (
              <div className="text-center text-gray-400">
                <FiImage className="mx-auto mb-2 h-10 w-10" />
                <p className="text-sm">No photos yet</p>
              </div>
            )}
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-yellow-400 sm:left-4" aria-label="Previous photo"><FiChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => step(1)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-yellow-400 sm:right-4" aria-label="Next photo"><FiChevronRight className="h-5 w-5" /></button>
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs tabular-nums text-white">{current + 1} / {images.length}</span>
              </>
            )}
          </div>
          {caption && (
            <p className="shrink-0 break-words px-4 pt-3 text-sm leading-snug text-white/80 sm:px-5" data-testid="project-viewer-caption">
              <span className="mr-2 tabular-nums text-white/50">{String(current + 1).padStart(2, '0')}</span>{caption}
            </p>
          )}
          {images.length > 1 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto p-3" data-testid="project-viewer-thumbs">
              {images.map((src, n) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPhoto(n)}
                  aria-label={`Show photo ${n + 1}`}
                  title={captions[n] || `Photo ${n + 1}`}
                  aria-current={n === current}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${n === current ? 'border-yellow-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="min-w-0 p-5 sm:p-8 lg:overflow-y-auto">
          {kicker && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{kicker}</p>}
          <h2 className="mt-1 break-words font-serif text-3xl leading-tight text-black sm:text-4xl" data-testid="project-viewer-title">{item.title}</h2>
          {meta.length > 0 && (
            <dl className="mt-5 space-y-2.5">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <dt className="sr-only">{label}</dt>
                  <dd className="min-w-0 break-words text-gray-700">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {product && (price || item.availability) && (
            <div className="mt-4 flex flex-wrap items-center gap-3" data-testid="project-viewer-price">
              {price && <p className="text-xl font-semibold text-black">{price}</p>}
              <AvailabilityBadge value={item.availability} />
            </div>
          )}
          {facts.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
                  <dd className="break-words text-sm font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {showDescription && (
            <p className="mt-6 whitespace-pre-wrap break-words leading-relaxed text-gray-800" data-testid="project-viewer-description">{description}</p>
          )}
          {story.length > 0 && (
            <div className="mt-6 space-y-5" data-testid="project-viewer-story">
              {story.map((part) => (
                <div key={part.key}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{part.label}</h3>
                  <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-gray-800">{part.text}</p>
                </div>
              ))}
            </div>
          )}
          {product && chipRow('Finishes', item.finishes)}
          {product && chipRow('Sizes', item.sizes)}
          {specs.length > 0 && (
            <div className="mt-6" data-testid="project-viewer-specs">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500"><FiLayers className="h-3.5 w-3.5" />Specifications</p>
              <table className="mt-2 w-full table-fixed border-collapse text-sm">
                <tbody>
                  {specs.map((spec, n) => (
                    <tr key={`${spec.label}-${n}`} className="border-b border-gray-200 align-top">
                      <th scope="row" className="w-2/5 break-words py-2 pr-3 text-left font-normal text-gray-500">{spec.label}</th>
                      <td className="break-words py-2 text-gray-900">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {product && item.brochureUrl && (
            <a href={item.brochureUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-50" data-testid="project-viewer-brochure">
              <FiDownload className="h-4 w-4" />Download brochure
            </a>
          )}
          {item.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {item.tags.map((t, n) => (
                <span key={`${t}-${n}`} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">{t}</span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// Editorial, Studio and the book templates (BookTemplates.js) are offered. Anyone
// who picked an earlier layout sees Editorial; the earlier templates stay above, commented out of use.
export const TEMPLATES = {
  editorial: EditorialTemplate,
  studio: StudioTemplate,
  noir: NoirTemplate,
  redline: RedlineTemplate,
  warm: WarmTemplate,
  manual: ManualTemplate,
  cleanbook: CleanbookTemplate,
  creative: CreativeTemplate,
  catalogue: CatalogueTemplate
  // grid: GridTemplate,
  // timeline: TimelineTemplate,
  // minimal: MinimalTemplate,
  // magazine: MagazineTemplate,
  // stack: StackTemplate,
  // mosaic: MosaicTemplate,
  // index: IndexTemplate,
  // brutalist: BrutalistTemplate
};

export const resolveTemplate = (theme) => TEMPLATES[theme] || TEMPLATES.editorial;
export const resolveThemeKey = (theme) => (TEMPLATES[theme] ? theme : 'editorial');
