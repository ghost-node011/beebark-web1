import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import BeeLoader from '../components/BeeLoader';
import PortfolioNav from '../components/portfolio/editor/PortfolioNav';
import { FiArrowLeft, FiDownload, FiMail, FiPhone, FiGlobe, FiMapPin } from 'react-icons/fi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => {
  const [y, m] = String(ym || '').split('-');
  if (!y) return '';
  return m && MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : y;
};
const experienceDates = (exp) => {
  if (exp.startDate) return `${monthLabel(exp.startDate)} – ${exp.current || !exp.endDate ? 'Present' : monthLabel(exp.endDate)}`;
  return exp.duration || '';
};
const EMPLOYMENT = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship', freelance: 'Freelance', contract: 'Contract' };
const PROFICIENCY = { basic: 'Basic', conversational: 'Conversational', professional: 'Professional', native: 'Native' };

const Section = ({ title, children, testId }) => (
  <section className="break-inside-avoid border-t border-gray-200 py-6 print:py-4" data-testid={testId}>
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{title}</h2>
    {children}
  </section>
);

// Printable CV built from the owner's profile, at /portfolio/:username/cv
const PortfolioCv = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/portfolio/${username}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    if (data?.user?.name) document.title = `${data.user.name} · CV`;
  }, [data]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="mb-4 text-gray-600">CV not found.</p>
          <Link to="/dashboard" className="font-semibold text-black hover:underline">Back to BeeBark</Link>
        </div>
      </div>
    );
  }
  if (!data) return <BeeLoader size="full" label="Opening the CV" />;

  const u = data.user || {};
  const showCv = data.showCv !== false;
  const showContact = data.showContact !== false;
  const about = data.look?.aboutText || u.bio;
  const headline = u.headline || data.headline || data.look?.tagline || u.role || '';
  const c = u.contact || {};
  const website = c.website || u.business?.website;
  const contacts = [
    c.email && { icon: FiMail, label: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: FiPhone, label: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}` },
    website && { icon: FiGlobe, label: website.replace(/^https?:\/\//, ''), href: /^https?:\/\//.test(website) ? website : `https://${website}` },
    u.location && { icon: FiMapPin, label: u.location }
  ].filter(Boolean);
  const experience = (u.experience || []).filter((e) => e?.title || e?.company);
  const education = (u.education || []).filter((e) => e?.school || e?.degree);
  const skills = (u.skills || []).filter(Boolean);
  const languages = (u.languages || []).filter((l) => l?.name);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <style>{'@media print { @page { size: A4; margin: 14mm; } html, body { background: #fff !important; } }'}</style>
      <div className="flex items-center justify-between p-4 sm:p-6 print:hidden">
        <Link to={`/portfolio/${u.username || username}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black">
          <FiArrowLeft />Portfolio
        </Link>
        {showCv && (
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-black hover:bg-gray-50" data-testid="cv-download">
            <FiDownload />Download PDF
          </button>
        )}
      </div>
      <PortfolioNav username={u.username || username} name={u.name} active="cv" showCv={showCv} showContact={showContact} />

      {!showCv ? (
        <p className="px-4 py-10 text-center text-gray-500 sm:px-6">{u.name || 'This person'} hasn't shared a CV here.</p>
      ) : (
        <main className="mx-auto my-6 max-w-3xl bg-white px-5 py-8 shadow-sm sm:my-10 sm:rounded-2xl sm:px-10 sm:py-12 print:my-0 print:max-w-none print:p-0 print:shadow-none" data-testid="portfolio-cv">
          <header className="flex items-start gap-4 pb-6 sm:gap-6">
            {u.profilePic && <img src={u.profilePic} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20" />}
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold text-black sm:text-3xl">{u.name}</h1>
              {headline && <p className="mt-1 text-base text-gray-700">{headline}</p>}
              {contacts.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  {contacts.map(({ icon: Icon, label, href }) => (
                    <li key={label} className="inline-flex min-w-0 items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {href ? <a href={href} className="break-all hover:underline">{label}</a> : <span className="break-words">{label}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </header>

          {about && (
            <Section title="About" testId="cv-about">
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">{about}</p>
            </Section>
          )}

          {experience.length > 0 && (
            <Section title="Experience" testId="cv-experience">
              <ul className="space-y-5">
                {experience.map((e, i) => (
                  <li key={e._id || i} className="break-inside-avoid">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <p className="font-semibold text-black">{e.title}{e.company ? <span className="font-normal text-gray-700"> · {e.company}</span> : null}</p>
                      <p className="shrink-0 text-xs text-gray-500">{experienceDates(e)}</p>
                    </div>
                    {(EMPLOYMENT[e.employmentType] || e.location) && (
                      <p className="text-xs text-gray-500">{[EMPLOYMENT[e.employmentType], e.location].filter(Boolean).join(' · ')}</p>
                    )}
                    {e.description && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-gray-700">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {education.length > 0 && (
            <Section title="Education" testId="cv-education">
              <ul className="space-y-4">
                {education.map((e, i) => (
                  <li key={e._id || i} className="break-inside-avoid">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <p className="font-semibold text-black">{e.school}</p>
                      {e.duration && <p className="shrink-0 text-xs text-gray-500">{e.duration}</p>}
                    </div>
                    {(e.degree || e.field) && <p className="text-sm text-gray-700">{[e.degree, e.field].filter(Boolean).join(', ')}</p>}
                    {e.description && <p className="mt-1 text-sm text-gray-600">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {skills.length > 0 && (
            <Section title="Skills" testId="cv-skills">
              <ul className="flex flex-wrap gap-2">
                {skills.map((s) => <li key={s} className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-800">{s}</li>)}
              </ul>
            </Section>
          )}

          {languages.length > 0 && (
            <Section title="Languages" testId="cv-languages">
              <ul className="grid gap-1 text-sm text-gray-800 sm:grid-cols-2">
                {languages.map((l) => (
                  <li key={l.name}>{l.name}{l.proficiency ? <span className="text-gray-500"> · {PROFICIENCY[l.proficiency] || l.proficiency}</span> : null}</li>
                ))}
              </ul>
            </Section>
          )}

          {u.business?.name && (
            <Section title="Practice" testId="cv-business">
              <p className="font-semibold text-black">{u.business.name}</p>
              {[u.business.type, u.business.founded && `Since ${u.business.founded}`, u.business.teamSize && `Team of ${u.business.teamSize}`].filter(Boolean).length > 0 && (
                <p className="text-sm text-gray-600">{[u.business.type, u.business.founded && `Since ${u.business.founded}`, u.business.teamSize && `Team of ${u.business.teamSize}`].filter(Boolean).join(' · ')}</p>
              )}
              {u.business.about && <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{u.business.about}</p>}
            </Section>
          )}

          {!about && !experience.length && !education.length && !skills.length && !languages.length && (
            <p className="border-t border-gray-200 pt-6 text-sm text-gray-500">Nothing on this CV yet.</p>
          )}
        </main>
      )}
    </div>
  );
};

export default PortfolioCv;
