import React from 'react';
import { Button } from '../ui/button';
import { FiEdit2, FiTrash2, FiMail } from 'react-icons/fi';

export const THEME_META = [
  { key: 'grid', label: 'Contemporary', description: 'Numbered project grid, monochrome' },
  { key: 'timeline', label: 'Spec Sheet', description: 'Chaptered spreads with project meta' },
  { key: 'minimal', label: 'Editorial', description: 'Large-format photography book' },
  { key: 'magazine', label: 'Bold', description: 'Color-blocked magazine spreads' },
  { key: 'stack', label: 'Stacked', description: 'Case-study cards, image + notes' },
  { key: 'mosaic', label: 'Mosaic', description: 'Asymmetric photo-led grid' },
  { key: 'index', label: 'Index', description: 'Text-first list, fast to scan' },
  { key: 'brutalist', label: 'Brutalist', description: 'Thick borders, hard shadows' }
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

export const ACCENT_PRESETS = ['#D4F547', '#FFB347', '#7DD3FC', '#FCA5A5', '#C4B5FD', '#000000'];

const fontStack = (font) => FONT_META.find((f) => f.key === font)?.stack || FONT_META[0].stack;
const num = (i) => String(i + 1).padStart(2, '0');
// Own-account view passes `connections` (populated array); public view passes `connectionCount` (number)
const connCount = (user) => (typeof user?.connectionCount === 'number' ? user.connectionCount : (user?.connections?.length ?? null));

const Controls = ({ item, editable, onEdit, onDelete, light }) => {
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

const Tags = ({ tags, light }) => {
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

// ---------- GRID / "Contemporary": strict numbered grid, monochrome, sharp edges ----------
export const GridTemplate = ({ items, user, headline, editable, onEdit, onDelete, font = 'playfair', accentColor = '#D4F547' }) => (
  <div className="bg-white" style={{ fontFamily: fontStack(font) }}>
    <Cover user={user} headline={headline} heroImage={items[0]?.images?.[0]} count={items.length} accentColor={accentColor} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-black/10">
      {items.map((item, i) => (
        <div key={item._id} className="border-b border-r border-black/10 sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0">
          <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
            {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />}
          </div>
          <div className="p-6">
            <span className="text-xs tracking-widest" style={{ color: accentColor }}>{num(i)}</span>
            <h3 className="text-xl font-black uppercase tracking-tight mt-1">{item.title}</h3>
            {item.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{item.description}</p>}
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

export const TEMPLATES = {
  grid: GridTemplate,
  timeline: TimelineTemplate,
  minimal: MinimalTemplate,
  magazine: MagazineTemplate,
  stack: StackTemplate,
  mosaic: MosaicTemplate,
  index: IndexTemplate,
  brutalist: BrutalistTemplate
};
