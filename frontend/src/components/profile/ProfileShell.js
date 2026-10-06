import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FiCamera, FiX, FiMapPin, FiPlus, FiBriefcase, FiUsers, FiInfo, FiGlobe } from 'react-icons/fi';
import {
  FaLinkedin, FaInstagram, FaBehance, FaPinterest, FaYoutube, FaXTwitter, FaFacebook, FaGithub, FaHouzz, FaDribbble
} from 'react-icons/fa6';

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

export const SOCIAL = {
  linkedin: { label: 'LinkedIn', icon: FaLinkedin, colour: 'text-[#0A66C2]' },
  instagram: { label: 'Instagram', icon: FaInstagram, colour: 'text-[#E4405F]' },
  behance: { label: 'Behance', icon: FaBehance, colour: 'text-[#1769FF]' },
  pinterest: { label: 'Pinterest', icon: FaPinterest, colour: 'text-[#E60023]' },
  youtube: { label: 'YouTube', icon: FaYoutube, colour: 'text-[#FF0000]' },
  x: { label: 'X', icon: FaXTwitter, colour: 'text-black' },
  facebook: { label: 'Facebook', icon: FaFacebook, colour: 'text-[#1877F2]' },
  github: { label: 'GitHub', icon: FaGithub, colour: 'text-black' },
  houzz: { label: 'Houzz', icon: FaHouzz, colour: 'text-[#4DBC15]' },
  dribbble: { label: 'Dribbble', icon: FaDribbble, colour: 'text-[#EA4C89]' },
  website: { label: 'Website', icon: FiGlobe, colour: 'text-gray-700' }
};

export const SocialIcons = ({ links, size = 'w-5 h-5' }) => (
  links?.length ? (
    <div className="flex flex-wrap items-center gap-1">
      {links.map((l) => {
        const s = SOCIAL[l.platform] || SOCIAL.website;
        const Icon = s.icon;
        return (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer me" title={s.label} aria-label={s.label}
            className={`p-1.5 rounded-full hover:bg-gray-100 transition ${s.colour}`}>
            <Icon className={size} />
          </a>
        );
      })}
    </div>
  ) : null
);

/**
 * Sticky section nav under the hero. Clicking scrolls to a section; the
 * underline follows whichever section is on screen.
 */
export const ProfileTabs = ({ tabs }) => {
  const [active, setActive] = useState(tabs[0]?.id);
  useEffect(() => {
    const onScroll = () => {
      let current = tabs[0]?.id;
      for (const t of tabs) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top < 180) current = t.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tabs]);

  const go = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur border-b border-black/5" aria-label="Profile sections">
      <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition ${active === t.id ? 'text-black' : 'text-gray-500 hover:text-black'}`}
            aria-current={active === t.id ? 'true' : undefined}
            data-testid={`profile-tab-${t.id}`}
          >
            {t.label}
            {active === t.id && <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-yellow-500" />}
          </button>
        ))}
      </div>
    </nav>
  );
};

// Full-bleed cover with a large photo overlapping it, then name, headline,
// meta and actions — shared by the own-profile and public-profile pages so
// they can't drift apart. `actions` (Connect/Message/Edit…) and `headerExtra`
// (cover photo control) are the only parts that differ.
export const ProfileHero = ({
  coverPhoto, profilePic, name, roleLabel, headline, pronouns, location, yearsOfExperience,
  connectionCount, socialLinks, actions, headerExtra, onPhotoEdit, onAddLocation, badges, onContactInfo
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 bg-white">
      <div
        className="h-44 sm:h-64 lg:h-72 relative"
        style={coverPhoto
          ? { backgroundImage: `url(${coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #5a4a35 0%, #2a2219 55%, #15120d 100%)' }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%)' }} />
        {headerExtra}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-16 sm:-mt-20">
          <div className="relative shrink-0 self-start">
            <button
              type="button"
              onClick={() => profilePic && setLightboxOpen(true)}
              className={`block rounded-full ${profilePic ? 'cursor-zoom-in' : 'cursor-default'}`}
              aria-label={profilePic ? 'View profile photo' : undefined}
            >
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-xl">
                <AvatarImage src={profilePic} className="object-cover" />
                <AvatarFallback className="bg-yellow-400 text-black text-5xl font-bold font-serif">{name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
            {onPhotoEdit && (
              <label className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white border-2 border-white cursor-pointer hover:bg-yellow-500 hover:text-black transition" aria-label="Change profile photo">
                <FiCamera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onPhotoEdit(e.target.files[0])} />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-black font-serif leading-tight break-words">{name}</h1>
              {pronouns && <span className="text-base text-gray-500">({pronouns})</span>}
              {roleLabel && <span className="rounded-full border border-yellow-400/60 bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">{roleLabel}</span>}
            </div>
            {headline && <p className="text-base sm:text-lg text-gray-700 mt-1 break-words" data-testid="profile-headline">{headline}</p>}
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          {location ? (
            <span className="inline-flex items-center gap-1.5"><FiMapPin className="w-4 h-4" />{location}</span>
          ) : onAddLocation && (
            <button type="button" onClick={onAddLocation} className="inline-flex items-center gap-1 text-gray-500 hover:text-black hover:underline">
              <FiPlus className="w-4 h-4" />Add location
            </button>
          )}
          {yearsOfExperience > 0 && (
            <span className="inline-flex items-center gap-1.5"><FiBriefcase className="w-4 h-4" />{yearsOfExperience} year{yearsOfExperience === 1 ? '' : 's'} experience</span>
          )}
          <span className="inline-flex items-center gap-1.5"><FiUsers className="w-4 h-4" /><b className="text-black font-semibold">{connectionCount}</b> connection{connectionCount === 1 ? '' : 's'}</span>
          {onContactInfo && (
            <button type="button" onClick={onContactInfo} className="inline-flex items-center gap-1.5 font-semibold text-black hover:underline" data-testid="contact-info-button">
              <FiInfo className="w-4 h-4" />Contact info
            </button>
          )}
          <SocialIcons links={socialLinks} size="w-4 h-4" />
        </div>
        {badges && <div className="mt-3">{badges}</div>}

        <div className="flex flex-wrap gap-2 py-5">{actions}</div>
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} className="absolute top-5 right-5 text-white/80 hover:text-white p-2" aria-label="Close">
            <FiX className="w-7 h-7" />
          </button>
          <img src={profilePic} alt={name} className="max-w-full max-h-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

// Per-section Public/Private badge — clickable to toggle when the owner is
// viewing their own profile, read-only elsewhere.
export const VisibilityPill = ({ isPublic, editable, onToggle }) => (
  editable ? (
    <button
      onClick={() => onToggle(!isPublic)}
      className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full transition ${isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
      title="Click to change who can see this"
    >
      {isPublic ? 'Public' : 'Private'}
    </button>
  ) : (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${isPublic ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {isPublic ? 'Public' : 'Private'}
    </span>
  )
);
