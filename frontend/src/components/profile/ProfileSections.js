import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FiGlobe, FiMapPin, FiUsers, FiCalendar, FiExternalLink, FiMail, FiPhone, FiCopy, FiLock, FiChevronDown,
  FiBriefcase, FiHome, FiMaximize
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { SOCIAL } from './ProfileShell';
import { inrSalary } from '../../utils/salary';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AVAILABILITY_LABELS, experienceDates, employmentTypeLabel, proficiencyLabel } from '../../config/profileOptions';
import { personHeadline } from '../../utils/personHeadline';

// Read-only pieces shared by the own-profile and public-profile pages

// White card with a serif title, like the reference profile
export const Section = ({ id, title, action, children, className = '' }) => (
  <section id={id} className={`scroll-mt-32 rounded-2xl border border-black/5 bg-white p-5 sm:p-8 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-5">
        {title && <h2 className="text-xl sm:text-2xl font-semibold text-black font-serif">{title}</h2>}
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    )}
    {children}
  </section>
);

export const AnalyticsCards = ({ items }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {items.map(({ icon: Icon, value, label, note }) => (
      <div key={label} className="rounded-xl bg-[#F6F4EF] p-4 sm:p-5 text-center">
        <Icon className="w-5 h-5 mx-auto text-yellow-500 mb-2" />
        <p className="text-2xl font-bold text-black font-serif">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
        {note && <p className="text-[11px] text-yellow-700 mt-1">{note}</p>}
      </div>
    ))}
  </div>
);

// Photo-led project cards: category tag, title, place · year
export const ProjectGrid = ({ items, linkFor }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map((item) => (
      <Link key={item._id} to={linkFor(item)} className="group relative block aspect-square overflow-hidden rounded-xl bg-gray-100" data-testid={`profile-project-${item._id}`}>
        {item.images?.[0]
          ? <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          : <div className="h-full w-full flex items-center justify-center p-4 text-center text-sm text-gray-400">{item.title}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90 group-hover:opacity-100 transition" />
        {item.category && <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-black">{item.category}</span>}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="font-serif text-lg font-semibold leading-tight">{item.title}</p>
          {(item.location || item.createdAt) && (
            <p className="text-xs text-white/80 mt-0.5">{[item.location, item.createdAt ? new Date(item.createdAt).getFullYear() : null].filter(Boolean).join(' · ')}</p>
          )}
          {item.projectStatus && <p className="text-xs text-white/70">{item.projectStatus}</p>}
        </div>
      </Link>
    ))}
  </div>
);

// Collapsible experience card: icon, title, company, dates · place; description on expand
export const ExperienceCard = ({ exp, actions }) => {
  const [open, setOpen] = useState(false);
  const hasMore = Boolean(exp.description);
  return (
    <div className="rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-[#F6F4EF] flex items-center justify-center shrink-0"><FiBriefcase className="w-5 h-5 text-gray-600" /></div>
        <div className="flex-1 min-w-0">
          <ExperienceItem exp={{ ...exp, description: '' }} />
          {open && hasMore && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{exp.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {hasMore && (
            <button type="button" onClick={() => setOpen((o) => !o)} className="p-1.5 text-gray-400 hover:text-black" aria-expanded={open} aria-label={open ? 'Show less' : 'Show more'}>
              <FiChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const formatPrice = (n) => {
  if (n === null || n === undefined) return 'Price on request';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

export const ListingCards = ({ listings }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {listings.map((l) => (
      <Link key={l._id} to={`/listing/${l._id}`} className="group block overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md transition">
        <div className="relative aspect-[4/3] bg-gray-100">
          {l.images?.[0] ? <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center text-gray-300"><FiHome className="w-8 h-8" /></div>}
          <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white capitalize">For {l.purpose}</span>
          {['sold', 'rented', 'under_offer'].includes(l.status) && <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-black">{l.status === 'under_offer' ? 'Under offer' : l.status === 'sold' ? 'Sold' : 'Rented'}</span>}
        </div>
        <div className="p-3">
          <p className="font-bold text-black">{formatPrice(l.price)}</p>
          <p className="text-sm text-black truncate">{l.title}</p>
          <p className="text-xs text-gray-500 flex flex-wrap gap-x-2">
            {l.bedrooms ? <span>{l.bedrooms} BHK</span> : null}
            {l.area ? <span className="inline-flex items-center gap-1"><FiMaximize className="w-3 h-3" />{Number(l.area).toLocaleString('en-IN')} {l.areaUnit === 'sqm' ? 'sq m' : l.areaUnit === 'acre' ? 'acre' : 'sq ft'}</span> : null}
            {l.location && <span className="inline-flex items-center gap-1 truncate"><FiMapPin className="w-3 h-3" />{l.location}</span>}
          </p>
        </div>
      </Link>
    ))}
  </div>
);

const JOB_TYPE = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship', contract: 'Contract', freelance: 'Freelance' };
const WORKPLACE = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' };

export const JobRows = ({ jobs }) => (
  <div className="space-y-3">
    {jobs.map((j) => (
      <Link key={j._id} to={`/jobs?job=${j._id}`} className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition">
        <div className="w-11 h-11 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0"><FiBriefcase className="w-5 h-5 text-yellow-600" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-black truncate">{j.title}</p>
          <p className="text-sm text-gray-600 truncate">{[j.company, j.location].filter(Boolean).join(' · ')}</p>
          <p className="text-xs text-gray-500">{[JOB_TYPE[j.employmentType], WORKPLACE[j.workplace], inrSalary(j.salary)].filter(Boolean).join(' · ')}</p>
        </div>
        <span className="text-xs font-semibold text-black shrink-0">View →</span>
      </Link>
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
            <button type="button" onClick={onEdit} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800" data-testid="contact-info-edit">Edit</button>
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
