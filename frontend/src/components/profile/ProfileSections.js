import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CompanyLogo from '../company/CompanyLogo';
import { toast } from 'sonner';
import {
  FiGlobe, FiMapPin, FiUsers, FiCalendar, FiExternalLink, FiMail, FiPhone, FiCopy, FiLock, FiChevronDown,
  FiBriefcase, FiHome, FiFileText, FiTrash2, FiSend, FiCheckCircle
} from 'react-icons/fi';
import { LuBuilding2 as FiBriefcaseAlt } from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa6';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { SOCIAL } from './ProfileShell';
import { inrSalary } from '../../utils/salary';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AVAILABILITY_LABELS, experienceDates, employmentTypeLabel, proficiencyLabel } from '../../config/profileOptions';
import { personHeadline } from '../../utils/personHeadline';
import PostActions from './PostActions';

// Read-only pieces shared by the own-profile and public-profile pages

// White card with a serif title, like the reference profile
export const Section = ({ id, title, action, children, className = '' }) => (
  <section id={id} className={`scroll-mt-36 pf-card p-6 sm:p-9 ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {title && <h2 className="pf-serif text-2xl sm:text-[28px] font-semibold text-[#32281F]">{title}</h2>}
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    )}
    {children}
  </section>
);

export const AnalyticsCards = ({ items }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {items.map(({ icon: Icon, value, label, note }) => (
      <div key={label} className="pf-soft rounded-2xl px-4 py-6 text-center">
        <Icon className="w-6 h-6 mx-auto text-[#F2B21B] mb-3" />
        <p className="pf-serif text-3xl font-bold text-[#32281F]">{value}</p>
        <p className="mt-1 text-[15px] pf-muted">{label}</p>
        {note && <p className="mt-2 text-xs font-medium text-[#E0A21A]">{note}</p>}
      </div>
    ))}
  </div>
);

// Label / value tiles under Professional Identity
export const InfoTiles = ({ items }) => {
  const shown = items.filter((i) => (Array.isArray(i.value) ? i.value.length : i.value));
  if (!shown.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
      {shown.map(({ icon: Icon, label, value }) => (
        <div key={label} className="pf-soft rounded-2xl px-5 py-4 flex gap-4">
          <Icon className="w-5 h-5 mt-1 shrink-0 text-[#F2B21B]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide pf-muted">{label}</p>
            <p className="mt-1 text-[17px] text-[#32281F]">{Array.isArray(value) ? value.join(', ') : value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Long text with a "Read more" toggle
export const ReadMore = ({ text, limit = 320 }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > limit;
  return (
    <div>
      <p className="text-[17px] leading-[1.75] pf-muted whitespace-pre-line">{long && !open ? `${text.slice(0, limit).trimEnd()}…` : text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 inline-flex items-center gap-1 text-[17px] font-medium text-[#E0A21A] hover:text-[#c98d0f]">
          {open ? 'Show less' : 'Read more'}<FiChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
};

// Square photo tiles; category, title, place · year and role appear on hover
// One tile: a project's photo on top, title and details always readable underneath.
// `photo` > 0 is another photo of the same project (used to fill the grid).
const ProjectCard = ({ item, to, photo = 0, featured = false }) => {
  const src = item.images?.[photo];
  const count = item.images?.length || 0;
  return (
    <Link to={to} className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E6E1DB] bg-white transition hover:-translate-y-0.5 hover:shadow-lg ${featured ? 'lg:col-span-2 lg:row-span-2' : ''}`} data-testid={photo ? `profile-project-photo-${item._id}-${photo}` : `profile-project-${item._id}`}>
      <div className={`relative overflow-hidden bg-[#efebe5] ${featured ? 'aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-[22rem]' : 'aspect-[4/3]'}`}>
        {src
          ? <img src={src} alt={photo ? `${item.title}, photo ${photo + 1}` : item.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
          : <div className="absolute inset-0 flex items-center justify-center p-4 text-center pf-serif text-lg pf-muted">{item.title}</div>}
        {!photo && item.category && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#32281F] backdrop-blur-sm">{item.category}</span>}
        {count > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">{photo ? `${photo + 1} / ${count}` : `${count} photos`}</span>}
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <p className={`pf-serif font-semibold leading-snug text-[#32281F] line-clamp-2 ${featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>{item.title}</p>
        {photo ? (
          <p className="mt-1 truncate text-sm pf-muted">Photo {photo + 1} of {count}</p>
        ) : (item.location || item.year || item.role) && (
          <p className="mt-1 truncate text-sm pf-muted">{[item.role, item.location, item.year].filter(Boolean).join(' · ')}</p>
        )}
      </div>
    </Link>
  );
};

// Portfolio preview on a profile. With fewer than three projects, more photos of
// those projects fill the grid, so one project with many photos doesn't look empty.
// The layout follows the number of tiles: one large card, two side by side, or the
// first one featured with the rest beside it.
export const ProjectGrid = ({ items, linkFor }) => {
  if (!items.length) return null;
  const tiles = items.map((item) => ({ item, photo: 0 }));
  for (let photo = 1; tiles.length < 3 && photo < 12; photo += 1) {
    for (const item of items) if (tiles.length < 3 && (item.images?.length || 0) > photo) tiles.push({ item, photo });
  }
  // Extra photos sit right after their own project
  if (tiles.length > items.length) tiles.sort((a, b) => items.indexOf(a.item) - items.indexOf(b.item) || a.photo - b.photo);
  const link = ({ item, photo }) => (photo ? `${linkFor(item)}${linkFor(item).includes('?') ? '&' : '?'}photo=${photo}` : linkFor(item));
  const card = (t, featured = false) => <ProjectCard key={`${t.item._id}-${t.photo}`} item={t.item} photo={t.photo} to={link(t)} featured={featured} />;
  if (tiles.length === 1) return <div className="grid max-w-3xl">{card(tiles[0])}</div>;
  if (tiles.length === 2) return <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">{tiles.map((t) => card(t))}</div>;
  // Featured tile over two columns and two rows, two beside it, then a row of three:
  // 3 or 6 tiles always fill the grid without gaps
  const shown = tiles.slice(0, tiles.length >= 6 ? 6 : 3);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {shown.map((t, i) => card(t, i === 0))}
    </div>
  );
};

// Initials of a company with no BeeBark page, e.g. "Studio Mehta" -> "SM"
const initialsOf = (name) => String(name || '').split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
const LOGO_TONES = ['bg-[#F2EBDD] text-[#7A5A1E]', 'bg-[#E7EEF0] text-[#2F5560]', 'bg-[#EFE7EE] text-[#5E3A5A]', 'bg-[#E9EFE6] text-[#3D5A34]', 'bg-[#F3E6DF] text-[#7A3E26]'];
const toneOf = (name) => LOGO_TONES[[...String(name || '')].reduce((n, c) => n + c.charCodeAt(0), 0) % LOGO_TONES.length];

// Experience entry in the LinkedIn layout: logo, role, company and type, then
// dates with the duration, location, and the description (expandable)
export const ExperienceCard = ({ exp, actions }) => {
  const [open, setOpen] = useState(false);
  const company = exp.page ? exp.page.name : exp.company;
  const type = employmentTypeLabel(exp.employmentType);
  const long = (exp.description || '').length > 180;
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#E6E1DB] bg-white p-5 sm:p-6" data-testid="experience-card">
      {exp.page ? (
        <Link to={`/company/${exp.page.slug}`} className="shrink-0" aria-label={exp.page.name} data-testid="exp-company-link">
          <CompanyLogo page={exp.page} className="w-12 h-12 sm:w-14 sm:h-14" text="text-sm" />
        </Link>
      ) : (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold sm:h-14 sm:w-14 sm:text-lg ${toneOf(company)}`} aria-hidden="true">{initialsOf(company)}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold leading-snug text-[#1C1712] sm:text-lg">{exp.title}</p>
        <p className="text-[15px] text-[#3D342C]">
          {exp.page ? <Link to={`/company/${exp.page.slug}`} className="hover:underline">{company}</Link> : company}
          {type && <span className="pf-muted"> · {type}</span>}
        </p>
        {(exp.startDate || exp.duration) && <p className="mt-0.5 text-sm pf-muted" data-testid="exp-dates">{experienceDates(exp)}</p>}
        {exp.location && <p className="text-sm pf-muted">{exp.location}</p>}
        {exp.description && (
          <div className="mt-2.5 text-[15px] leading-relaxed text-[#3D342C]">
            <p className={`whitespace-pre-line ${long && !open ? 'line-clamp-2' : ''}`}>{exp.description}</p>
            {long && (
              <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold pf-muted hover:text-[#32281F]" aria-expanded={open}>
                {open ? 'Show less' : '…see more'}<FiChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
};

// Associated professionals as centred circles (photo or initials), name and role
export const PeopleGrid = ({ people }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
    {people.map((p) => (
      <Link key={p._id} to={`/profile/${p.username}`} className="group flex flex-col items-center text-center min-w-0">
        <span className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full pf-soft flex items-center justify-center overflow-hidden ring-0 group-hover:ring-2 ring-[#F2B21B] transition">
          {p.profilePic ? <img src={p.profilePic} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-semibold text-[#32281F]">{initials(p.name)}</span>}
        </span>
        <span className="mt-3 w-full truncate text-[15px] font-medium text-[#32281F]">{p.name}</span>
        <span className="w-full truncate text-xs pf-muted">{personHeadline(p)}</span>
      </Link>
    ))}
  </div>
);

const KIND = { article: 'Article', site_update: 'Site Update', opinion: 'Opinion', project: 'Project', update: 'Update' };
const ago = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  const days = Math.round(s / 86400);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.round(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

// Recent activity: type, time, title, excerpt, likes, comments, Share
export const ActivityCards = ({ posts, renderShare, onDelete }) => (
  <div className="space-y-4">
    {posts.map((post) => (
      <article key={post._id} className="rounded-2xl border border-[#E6E1DB] bg-white p-5 sm:p-6 pf-hover" data-testid={`activity-${post._id}`}>
        <div className="flex items-center gap-3 text-[15px] pf-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full pf-soft px-3 py-1 text-sm"><FiFileText className="w-3.5 h-3.5" />{KIND[post.kind] || 'Update'}</span>
          <span>{ago(post.createdAt)}</span>
          {onDelete && <button type="button" onClick={() => onDelete(post)} className="ml-auto p-1 pf-muted hover:text-red-600" aria-label="Delete update"><FiTrash2 className="w-4 h-4" /></button>}
        </div>
        {post.title && <h3 className="pf-serif mt-3 text-lg sm:text-xl font-semibold text-[#32281F]">{post.title}</h3>}
        <p className={`${post.title ? 'mt-1.5' : 'mt-3'} text-[16px] leading-relaxed pf-muted whitespace-pre-line line-clamp-4`}>{post.content}</p>
        {post.mediaUrl && <img src={post.mediaUrl} alt="" className="mt-4 rounded-xl max-h-72 w-full object-cover" loading="lazy" />}
        <PostActions post={post} share={renderShare?.(post)} />
      </article>
    ))}
  </div>
);

const formatPrice = (n) => {
  if (n === null || n === undefined) return 'Price on request';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

const STATUS_PILL = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700' },
  pre_launch: { label: 'Pre-launch', className: 'bg-amber-50 text-amber-600' },
  under_offer: { label: 'Under offer', className: 'bg-orange-50 text-orange-700' },
  sold: { label: 'Sold', className: 'bg-gray-100 text-gray-600' },
  rented: { label: 'Leased', className: 'bg-gray-100 text-gray-600' }
};
const PER = { per_month: '/month', per_sqft: '/sqft' };
const listingPrice = (l) => {
  if (l.price === null || l.price === undefined) return 'On request';
  const unit = PER[l.priceUnit] || '';
  return l.priceTo ? `${formatPrice(l.price)} – ${formatPrice(l.priceTo)}${unit}` : `${formatPrice(l.price)}${unit}`;
};

// Property listings as rows: icon, title, availability line, price, status
export const ListingCards = ({ listings }) => (
  <div className="space-y-4">
    {listings.map((l) => {
      const pill = l.status === 'active' && l.purpose !== 'sale' ? { label: 'Leasing', className: 'bg-blue-50 text-blue-700' } : STATUS_PILL[l.status] || STATUS_PILL.active;
      const Icon = ['apartment', 'villa', 'house', 'plot'].includes(l.propertyType) ? FiHome : FiBriefcaseAlt;
      const sub = l.subtitle || [l.bedrooms ? `${l.bedrooms} BHK` : '', l.area ? `${Number(l.area).toLocaleString('en-IN')} ${l.areaUnit === 'sqm' ? 'sq m' : l.areaUnit === 'acre' ? 'acre' : 'sq ft'}` : '', l.location].filter(Boolean).join(' · ');
      return (
        <Link key={l._id} to={`/listing/${l._id}`} className="flex items-start gap-4 rounded-2xl border border-[#E6E1DB] bg-white p-5 sm:p-6 pf-hover" data-testid={`profile-listing-${l._id}`}>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl pf-soft flex items-center justify-center shrink-0"><Icon className="w-6 h-6 text-[#2A221C]" /></div>
          <div className="flex-1 min-w-0">
            <p className="pf-serif text-lg sm:text-xl font-semibold text-[#32281F]">{l.title}</p>
            {sub && <p className="text-[15px] pf-muted">{sub}</p>}
            <p className="mt-1.5 text-[16px] font-semibold text-[#32281F]">{listingPrice(l)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${pill.className}`}>{pill.label}</span>
        </Link>
      );
    })}
  </div>
);

const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const JOB_TYPE = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship', contract: 'Contract', freelance: 'Freelance' };
const WORKPLACE = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' };

// Open positions: icon, title, "Full-time · Mumbai", Apply (or View for your own)
export const JobRows = ({ jobs, onApply, applyingId, own }) => (
  <div className="space-y-4">
    {jobs.map((j) => (
      <div key={j._id} className="flex items-center gap-4 rounded-2xl border border-[#E6E1DB] bg-white p-5 sm:p-6 pf-hover" data-testid={`profile-job-${j._id}`}>
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl pf-soft flex items-center justify-center shrink-0"><FiBriefcase className="w-6 h-6 text-[#2A221C]" /></div>
        <Link to={`/jobs?job=${j._id}`} className="flex-1 min-w-0">
          <p className="pf-serif text-lg sm:text-xl font-semibold text-[#32281F] hover:underline">{j.title}</p>
          <p className="text-[15px] pf-muted">{[JOB_TYPE[j.employmentType], WORKPLACE[j.workplace] === 'Remote' ? 'Remote' : j.location, inrSalary(j.salary)].filter(Boolean).join(' · ')}</p>
        </Link>
        {own ? (
          <Link to={`/jobs?job=${j._id}`} className="shrink-0 rounded-xl border border-[#E6E1DB] px-4 py-2.5 text-[15px] font-medium text-[#32281F] hover:border-[#CFC6BC]">{j.applicantCount || 0} applicant{j.applicantCount === 1 ? '' : 's'}</Link>
        ) : j.hasApplied ? (
          <span className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-[15px] font-semibold text-green-700"><FiCheckCircle className="w-4 h-4" />Applied</span>
        ) : (
          <button type="button" onClick={() => onApply?.(j)} disabled={applyingId === j._id} className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#32281F] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#221A14] disabled:opacity-60" data-testid={`apply-${j._id}`}>
            <FiSend className="w-4 h-4" />{applyingId === j._id ? 'Applying…' : 'Apply'}
          </button>
        )}
      </div>
    ))}
  </div>
);

const ContactRow = ({ icon: Icon, label, value, href }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-sm font-medium text-black hover:underline break-all">{value}</a>
        : <p className="text-sm text-black break-words">{value}</p>}
    </div>
    <button type="button" onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success('Copied'), () => {})} className="p-1.5 text-gray-400 hover:text-black" aria-label={`Copy ${label}`}><FiCopy className="w-4 h-4" /></button>
  </div>
);

/** Contact details and social links; explains why they're hidden when they are. */
export const ContactInfoDialog = ({ open, onOpenChange, name, username, contact, socialLinks, hiddenReason, onEdit }) => {
  const rows = contact ? [
    contact.email && { icon: FiMail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { icon: FiPhone, label: 'Phone', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    contact.whatsapp && { icon: FaWhatsapp, label: 'WhatsApp', value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}` },
    contact.website && { icon: FiGlobe, label: 'Website', value: contact.website.replace(/^https?:\/\//, ''), href: contact.website },
    contact.address && { icon: FiMapPin, label: 'Address', value: contact.address }
  ].filter(Boolean) : [];
  const profileUrl = `${window.location.origin}/profile/${username}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="contact-info-dialog">
        <DialogHeader><DialogTitle className="font-serif text-xl">{name}</DialogTitle></DialogHeader>
        <div className="divide-y divide-gray-100 -mt-2">
          <ContactRow icon={FiUsers} label="BeeBark profile" value={profileUrl.replace(/^https?:\/\//, '')} href={profileUrl} />
          {rows.map((r) => <ContactRow key={r.label} {...r} />)}
          {socialLinks?.map((l) => {
            const s = SOCIAL[l.platform] || SOCIAL.website;
            return <ContactRow key={l.url} icon={s.icon} label={s.label} value={l.url.replace(/^https?:\/\/(www\.)?/, '')} href={l.url} />;
          })}
        </div>
        {!contact && hiddenReason && (
          <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <FiLock className="w-4 h-4 mt-0.5 shrink-0" />
            {hiddenReason === 'connect' ? `Connect with ${name?.split(' ')[0]} to see their email and phone.` : `${name?.split(' ')[0]} keeps their contact details private.`}
          </p>
        )}
        {contact && !rows.length && !socialLinks?.length && !onEdit && <p className="text-sm text-gray-500">No contact details added yet.</p>}
        {onEdit && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-gray-500">
              {contact?.visibility === 'everyone' ? 'Visible to everyone' : contact?.visibility === 'only_me' ? 'Only you can see these' : 'Visible to your connections'}
            </p>
            <button type="button" onClick={onEdit} className="rounded-md bg-[#32281F] px-4 py-2 text-sm font-medium text-white hover:bg-[#221A14]" data-testid="contact-info-edit">Edit</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const ExperienceItem = ({ exp }) => (
  <div>
    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
    <p className="text-gray-700 text-sm font-medium">
      {[exp.company, employmentTypeLabel(exp.employmentType)].filter(Boolean).join(' · ')}
    </p>
    <p className="text-xs text-gray-500">{[experienceDates(exp), exp.location].filter(Boolean).join(' · ')}</p>
    {exp.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{exp.description}</p>}
  </div>
);

// Newest first: current roles, then by start date; undated entries keep their order at the end
export const sortExperience = (list) => [...(list || [])]
  .map((e, i) => ({ e, i }))
  .sort((a, b) => (Number(!!b.e.current) - Number(!!a.e.current))
    || String(b.e.startDate || '').localeCompare(String(a.e.startDate || ''))
    || a.i - b.i)
  .map(({ e, i }) => ({ ...e, _index: i }));

export const AvailabilityChips = ({ values }) => (
  values?.length ? (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{AVAILABILITY_LABELS[v] || v}
        </span>
      ))}
    </div>
  ) : null
);

export const LanguagesList = ({ languages }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {languages.map((l) => (
      <div key={l.name} className="rounded-lg bg-gray-50 px-4 py-2.5">
        <p className="text-sm font-medium text-black">{l.name}</p>
        {l.proficiency && <p className="text-xs text-gray-500">{proficiencyLabel(l.proficiency)}</p>}
      </div>
    ))}
  </div>
);

export const BusinessDetails = ({ business }) => (
  <div className="space-y-3">
    <div>
      <p className="text-lg font-semibold text-black">{business.name}</p>
      {business.type && <p className="text-sm text-gray-600">{business.type}</p>}
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
      {business.founded && <span className="flex items-center gap-1.5"><FiCalendar className="w-3.5 h-3.5" />Founded {business.founded}</span>}
      {business.teamSize && <span className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5" />{business.teamSize} {business.teamSize === 'Just me' ? '' : 'people'}</span>}
      {business.address && <span className="flex items-center gap-1.5"><FiMapPin className="w-3.5 h-3.5" />{business.address}</span>}
      {business.website && (
        <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-black font-medium hover:underline">
          <FiGlobe className="w-3.5 h-3.5" />{business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}<FiExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
    {business.about && <p className="text-sm text-gray-700 whitespace-pre-line">{business.about}</p>}
    {business.services?.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {business.services.map((s) => <span key={s} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{s}</span>)}
      </div>
    )}
  </div>
);

export const PeopleStrip = ({ people }) => (
  <div className="flex gap-4 overflow-x-auto pb-1">
    {people.map((p) => (
      <Link key={p._id} to={`/profile/${p.username}`} className="flex flex-col items-center text-center w-24 shrink-0 hover:opacity-80">
        <Avatar className="w-14 h-14">
          <AvatarImage src={p.profilePic} />
          <AvatarFallback className="bg-gray-200 text-black font-semibold">{p.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <p className="text-xs font-medium text-black mt-1 truncate w-full">{p.name}</p>
        <p className="text-[10px] text-gray-500 truncate w-full">{personHeadline(p)}</p>
      </Link>
    ))}
  </div>
);
