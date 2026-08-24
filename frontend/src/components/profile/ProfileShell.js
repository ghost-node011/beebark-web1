import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

export const TABS = ['Overview', 'Portfolio', 'Experience', 'Activity'];

// Page background used by both profile pages — a warm off-white rather than
// plain slate, to match the reference design's editorial tone.
export const PAGE_BG = 'bg-[#FAF9F6]';

export const PillFilter = ({ options, active, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onChange(o)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${active === o ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        {o}
      </button>
    ))}
  </div>
);

// Full-bleed banner + overlapping avatar + name/role/meta + tab nav, shared
// verbatim between the own-profile and public-profile pages so they can
// never visually drift apart — only the `actions` slot (Connect/Message vs
// nothing) and `editHeader` slot differ between the two.
export const ProfileHero = ({ coverPhoto, profilePic, name, roleLabel, subtitle, location, connectionCount, actions, activeTab, onTabChange, headerExtra }) => (
  <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-black/5">
    <div
      className="h-48 sm:h-64 relative"
      style={coverPhoto
        ? { backgroundImage: `url(${coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg, #3a3025 0%, #1a1712 100%)' }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)' }} />
      {headerExtra}
    </div>
    <div className="px-6 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
        <Avatar className="w-28 h-28 border-4 border-white shadow-lg shrink-0">
          <AvatarImage src={profilePic} />
          <AvatarFallback className="bg-yellow-400 text-black text-3xl font-bold">{name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 sm:pb-1 min-w-0">
          <h1 className="text-2xl font-bold text-black font-serif truncate">{name}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
            <Badge className="bg-slate-900 text-yellow-400 capitalize">{roleLabel}</Badge>
            {location && <span>{location}</span>}
            <span>{connectionCount} connection{connectionCount === 1 ? '' : 's'}</span>
          </div>
        </div>
        {actions && <div className="flex gap-2 sm:pb-1 shrink-0">{actions}</div>}
      </div>
    </div>
    <div className="border-t border-black/5 px-6">
      <div className="flex gap-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${activeTab === tab ? 'border-yellow-400 text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const AnalyticsPrivacyPill = ({ isPublic, editable, onToggle }) => (
  editable ? (
    <button
      onClick={() => onToggle(!isPublic)}
      className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full transition ${isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
      title="Click to change who can see this"
    >
      {isPublic ? 'Public' : 'Private'}
    </button>
  ) : (
    <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">Private</span>
  )
);
