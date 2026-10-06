import React from 'react';
import { Link } from 'react-router-dom';
import { FiGlobe, FiMapPin, FiUsers, FiCalendar, FiExternalLink } from 'react-icons/fi';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AVAILABILITY_LABELS, experienceDates, employmentTypeLabel, proficiencyLabel } from '../../config/profileOptions';
import { personHeadline } from '../../utils/personHeadline';

// Read-only pieces shared by the own-profile and public-profile pages

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
