import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export const THEME_META = [
  { key: 'grid', label: 'Grid', description: 'Clean masonry-style gallery' },
  { key: 'timeline', label: 'Timeline', description: 'Chronological, story-like' },
  { key: 'minimal', label: 'Minimal', description: 'Large-format, text-forward' },
  { key: 'magazine', label: 'Magazine', description: 'Bold hero spreads' }
];

const displayFont = { fontFamily: "'Playfair Display', Georgia, serif" };

const ItemActions = ({ item, editable, onEdit, onDelete, dark }) => {
  if (!editable) return null;
  return (
    <div className="flex gap-2 mt-3" data-pdf-ignore>
      <Button size="sm" variant="outline" onClick={() => onEdit(item)} className={`flex items-center gap-1 ${dark ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : ''}`}>
        <FiEdit2 className="w-3.5 h-3.5" />Edit
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDelete(item)} className={`flex items-center gap-1 text-red-500 hover:text-red-600 ${dark ? 'bg-white/10 border-white/30 hover:bg-white/20' : ''}`}>
        <FiTrash2 className="w-3.5 h-3.5" />Remove
      </Button>
    </div>
  );
};

const ItemTags = ({ tags, dark }) => {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((t, i) => (
        <Badge key={i} className={dark ? 'bg-white/15 text-white border-0' : 'bg-black/5 text-black border-0'}>{t}</Badge>
      ))}
    </div>
  );
};

// Shared editorial cover — name, headline, and a hero image pulled from the first item.
const PortfolioCover = ({ user, headline, heroImage, accent = '#facc15' }) => (
  <div className="relative rounded-2xl overflow-hidden mb-10 bg-black text-white min-h-[320px] flex items-end">
    {heroImage && (
      <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
    )}
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)' }} />
    <div className="relative p-8 sm:p-12 w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-px w-8" style={{ backgroundColor: accent }} />
        <span className="text-xs tracking-[0.25em] uppercase" style={{ color: accent }}>Portfolio</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05]" style={displayFont}>{user?.name}</h1>
      {(headline || user?.bio) && (
        <p className="mt-4 text-lg italic text-white/80 max-w-xl" style={displayFont}>{headline || user?.bio}</p>
      )}
      <div className="flex items-center gap-3 mt-6">
        <Avatar className="w-10 h-10 border-2 border-white/30">
          <AvatarImage src={user?.profilePic} />
          <AvatarFallback className="bg-white/20 text-white font-semibold">{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-white/70">@{user?.username}</span>
      </div>
    </div>
  </div>
);

export const GridTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => (
  <div>
    <PortfolioCover user={user} headline={headline} heroImage={items[0]?.images?.[0]} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, i) => (
        <div key={item._id} className={`group rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow ${i === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}`}>
          {item.images?.[0] && (
            <div className={`overflow-hidden ${i === 0 ? 'h-72' : 'h-52'}`}>
              <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          <div className="p-5">
            <h3 className="text-lg font-bold text-black" style={displayFont}>{item.title}</h3>
            {item.description && <p className="text-sm text-gray-600 mt-1.5 line-clamp-3">{item.description}</p>}
            <ItemTags tags={item.tags} />
            <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TimelineTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => (
  <div>
    <PortfolioCover user={user} headline={headline} heroImage={items[0]?.images?.[0]} />
    <div className="relative border-l-2 border-yellow-300 pl-8 space-y-10 ml-3">
      {items.map((item, i) => (
        <div key={item._id} className="relative">
          <div className="absolute -left-[39px] top-1 w-5 h-5 rounded-full bg-yellow-400 border-4 border-white shadow" />
          <span className="text-xs tracking-widest uppercase text-gray-400">Entry {String(i + 1).padStart(2, '0')}</span>
          <div className="mt-2 flex flex-col sm:flex-row gap-5 bg-white rounded-xl shadow-sm p-5">
            {item.images?.[0] && (
              <img src={item.images[0]} alt={item.title} className="w-full sm:w-56 h-44 object-cover rounded-lg shrink-0" />
            )}
            <div>
              <h3 className="text-xl font-bold text-black" style={displayFont}>{item.title}</h3>
              {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
              <ItemTags tags={item.tags} />
              <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MinimalTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => (
  <div className="max-w-3xl mx-auto">
    <div className="text-center mb-14">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="h-px w-8 bg-gray-300" />
        <span className="text-xs tracking-[0.25em] uppercase text-gray-400">Portfolio</span>
        <span className="h-px w-8 bg-gray-300" />
      </div>
      <h1 className="text-5xl font-bold text-black" style={displayFont}>{user?.name}</h1>
      {(headline || user?.bio) && <p className="mt-3 text-gray-500 italic" style={displayFont}>{headline || user?.bio}</p>}
    </div>
    <div className="space-y-16">
      {items.map((item) => (
        <div key={item._id}>
          {item.images?.[0] && (
            <img src={item.images[0]} alt={item.title} className="w-full max-h-[420px] object-cover rounded-lg mb-5" />
          )}
          <h3 className="text-2xl font-bold text-black" style={displayFont}>{item.title}</h3>
          {item.description && <p className="text-gray-700 mt-2 leading-relaxed">{item.description}</p>}
          <ItemTags tags={item.tags} />
          <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  </div>
);

export const MagazineTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => {
  const [featured, ...rest] = items;
  return (
    <div>
      <PortfolioCover user={user} headline={headline} heroImage={featured?.images?.[0]} accent="#facc15" />
      {featured && (
        <div className="relative rounded-2xl overflow-hidden mb-8 min-h-[280px] flex items-end bg-black">
          {featured.images?.[0] && <img src={featured.images[0]} alt={featured.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 10%, transparent 60%)' }} />
          <div className="relative p-8 text-white">
            <span className="text-xs tracking-widest uppercase text-yellow-400">Featured</span>
            <h3 className="text-3xl font-bold mt-1" style={displayFont}>{featured.title}</h3>
            {featured.description && <p className="text-white/80 mt-2 max-w-xl">{featured.description}</p>}
            <ItemTags tags={featured.tags} dark />
            <ItemActions item={featured} editable={editable} onEdit={onEdit} onDelete={onDelete} dark />
          </div>
        </div>
      )}
      <div className="space-y-8">
        {rest.map((item, i) => (
          <div key={item._id} className={`flex flex-col ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} gap-6 items-center bg-white rounded-xl shadow-sm overflow-hidden`}>
            {item.images?.[0] && (
              <img src={item.images[0]} alt={item.title} className="w-full sm:w-1/2 h-56 object-cover" />
            )}
            <div className="p-6 sm:w-1/2">
              <h3 className="text-xl font-bold text-black" style={displayFont}>{item.title}</h3>
              {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
              <ItemTags tags={item.tags} />
              <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TEMPLATES = {
  grid: GridTemplate,
  timeline: TimelineTemplate,
  minimal: MinimalTemplate,
  magazine: MagazineTemplate
};
