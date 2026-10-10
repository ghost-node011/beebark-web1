import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FiCamera, FiX, FiMapPin, FiPlus, FiBriefcase, FiInfo, FiGlobe, FiCalendar, FiCheck } from 'react-icons/fi';
import {
  FaLinkedin, FaInstagram, FaBehance, FaPinterest, FaYoutube, FaXTwitter, FaFacebook, FaGithub, FaHouzz, FaDribbble
} from 'react-icons/fa6';
import { FaCrown } from 'react-icons/fa';

// Page background used by both profile pages — a warm off-white rather than
// plain slate, to match the reference design's editorial tone.
export const PAGE_BG = 'bg-[#F5F7FA] pf-page';

export const PillFilter = ({ options, active, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onChange(o)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${active === o ? 'bg-[#16324F] text-white' : 'bg-[#f0ece6] text-[#6f655c] hover:bg-[#e8e2da]'}`}
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
        if (el && el.getBoundingClientRect().top < 230) current = t.id;
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
    <nav className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur border-b border-[#DCE3EB]" aria-label="Profile sections">
      <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`relative px-4 sm:px-5 py-4 text-[15px] whitespace-nowrap transition ${active === t.id ? 'text-[#16324F] font-semibold' : 'pf-muted hover:text-[#16324F]'}`}
            aria-current={active === t.id ? 'true' : undefined}
            data-testid={`profile-tab-${t.id}`}
          >
            {t.label}
            {active === t.id && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-[#F2B21B]" />}
          </button>
        ))}
      </div>
    </nav>
  );
};

const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : Number(n || 0).toLocaleString('en-IN'));

// Verified tick and Pro badge (set by the BeeBark team only)
const Badges = ({ badges }) => (
  <>
    {badges?.verified && (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F2B21B] text-[#F2B21B]" title="Verified by BeeBark" aria-label="Verified">
        <FiCheck className="h-4 w-4" strokeWidth={3} />
      </span>
    )}
    {badges?.pro && (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B21B]/70 bg-black/20 px-3 py-1 text-sm font-semibold text-[#F2B21B] backdrop-blur-sm">
        <FaCrown className="h-3.5 w-3.5" />BeeBark Pro
      </span>
    )}
  </>
);

// Full-bleed cover; the photo overlaps its bottom edge and the name sits on
// the cover beside it (as in the reference design). Shared by the own,
// in-app and public profile pages, so they can't drift apart.
export const ProfileHero = ({
  coverPhoto, profilePic, name, roleLabel, headline, pronouns, location, yearsOfExperience,
  connectionCount, followerCount, socialLinks, badges, actions, headerExtra, onPhotoEdit, onAddLocation, onContactInfo, onFollowers
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const parts = String(headline || '').split('|').map((p) => p.trim()).filter(Boolean);
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
      <div
        className="relative h-56 sm:h-72 lg:h-80"
        style={coverPhoto
          ? { backgroundImage: `url(${coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(120deg, #2C5A85 0%, #1E4266 40%, #16324F 75%, #0F2439 100%)' }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,15,10,0) 35%, rgba(20,15,10,0.55) 100%)' }} />
        {headerExtra}
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-end gap-5 sm:gap-8">
            <div className="relative shrink-0 translate-y-1/2 sm:translate-y-[45%]">
              <button
                type="button"
                onClick={() => profilePic && setLightboxOpen(true)}
                className={`block rounded-full ${profilePic ? 'cursor-zoom-in' : 'cursor-default'}`}
                aria-label={profilePic ? 'View profile photo' : undefined}
              >
                <Avatar className="w-28 h-28 sm:w-40 sm:h-40 lg:w-44 lg:h-44 border-[5px] border-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)]">
                  <AvatarImage src={profilePic} className="object-cover" />
                  <AvatarFallback className="bg-[#16324F] text-white text-5xl font-bold pf-serif">{name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </button>
              {onPhotoEdit && (
                <label className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#16324F] text-white border-2 border-white cursor-pointer hover:bg-[#F2B21B] hover:text-black transition" aria-label="Change profile photo">
                  <FiCamera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onPhotoEdit(e.target.files[0])} />
                </label>
              )}
            </div>
            <div className="min-w-0 pb-4 sm:pb-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="pf-serif text-3xl sm:text-5xl font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] break-words">{name}</h1>
                <Badges badges={badges} />
                {pronouns && <span className="text-sm text-white/80">({pronouns})</span>}
              </div>
              {parts.length > 0 && (
                <p className="mt-1 hidden sm:block text-lg lg:text-xl text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" data-testid="profile-headline">
                  {parts.map((p, i) => <React.Fragment key={i}>{i > 0 && <span className="mx-2.5 text-white/50">|</span>}{p}</React.Fragment>)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="pl-[8rem] sm:pl-[12.5rem] lg:pl-[13.5rem] pt-3 min-h-[4.5rem] sm:min-h-[5.5rem]">
          {parts.length > 0 && <p className="sm:hidden text-sm pf-muted leading-snug" data-testid="profile-headline-mobile">{parts.join(' | ')}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[15px] pf-muted">
            {location ? (
              <span className="inline-flex items-center gap-1.5"><FiMapPin className="w-4 h-4" />{location}</span>
            ) : onAddLocation && (
              <button type="button" onClick={onAddLocation} className="inline-flex items-center gap-1 hover:text-[#16324F] hover:underline"><FiPlus className="w-4 h-4" />Add location</button>
            )}
            {yearsOfExperience > 0 && <span className="inline-flex items-center gap-1.5"><FiCalendar className="w-4 h-4" />{yearsOfExperience} year{yearsOfExperience === 1 ? '' : 's'} experience</span>}
            {roleLabel && !yearsOfExperience && <span className="inline-flex items-center gap-1.5"><FiBriefcase className="w-4 h-4" />{roleLabel}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[15px] pf-muted">
            <span><b className="font-semibold text-[#16324F]">{compact(connectionCount)}</b> connection{connectionCount === 1 ? '' : 's'}</span>
            <button type="button" onClick={onFollowers} className={onFollowers ? 'hover:underline' : 'cursor-default'} data-testid="follower-count">
              <b className="font-semibold text-[#16324F]">{compact(followerCount || 0)}</b> follower{followerCount === 1 ? '' : 's'}
            </button>
            {onContactInfo && (
              <button type="button" onClick={onContactInfo} className="inline-flex items-center gap-1.5 font-semibold text-[#16324F] hover:underline" data-testid="contact-info-button">
                <FiInfo className="w-4 h-4" />Contact info
              </button>
            )}
            <SocialIcons links={socialLinks} size="w-4 h-4" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-5 pb-6">{actions}</div>
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} className="absolute top-5 right-5 text-white/80 hover:text-white p-2" aria-label="Close"><FiX className="w-7 h-7" /></button>
          <img src={profilePic} alt={name} className="max-w-full max-h-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

// Hero buttons in the reference style
export const heroBtn = {
  dark: 'inline-flex items-center gap-2 rounded-xl bg-[#16324F] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#0F2439] transition disabled:opacity-60',
  honey: 'inline-flex items-center gap-2 rounded-xl border border-[#16324F] bg-white px-6 py-3 text-[15px] font-semibold text-[#16324F] hover:bg-[#F3F6FA] transition disabled:opacity-60',
  outline: 'inline-flex items-center gap-2 rounded-xl border border-[#DCE3EB] bg-white px-6 py-3 text-[15px] font-medium text-[#16324F] hover:border-[#B9C6D5] transition disabled:opacity-60',
  ghost: 'inline-flex items-center gap-1.5 rounded-xl px-3 py-3 text-[15px] font-medium pf-muted hover:text-[#16324F] transition'
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
