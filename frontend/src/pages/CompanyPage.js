import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FiMapPin, FiUsers, FiGlobe, FiMail, FiPhone, FiEdit2, FiShare2, FiEye, FiPlus, FiCheck,
  FiCheckCircle, FiLink, FiCalendar, FiGrid, FiArrowRight
} from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import BeeLoader from '../components/BeeLoader';
import ShareMenu from '../components/ShareMenu';
import { ProfileTabs, PAGE_BG, heroBtn } from '../components/profile/ProfileShell';
import { Section } from '../components/profile/ProfileSections';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { usePages, PAGE_TYPE_LABELS } from '../context/PagesContext';
import { inrSalary } from '../utils/salary';
import CompanyLogo from '../components/company/CompanyLogo';

const compact = (n) => (n >= 1e4 ? `${Math.round(n / 1e3)}K` : Number(n || 0).toLocaleString('en-IN'));
const initials = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const companyUrl = (slug) => `${window.location.origin}/c/${slug}`;

export { CompanyLogo };

/**
 * A company Page, like LinkedIn's: cover, logo, followers, about, people and jobs.
 * `open`: the shareable version for visitors who aren't signed in (/c/:slug).
 */
const CompanyPage = ({ open = false }) => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActingAs } = usePages();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    axios.get(`${API_URL}/api/companies/${slug}`, { params: preview ? { preview: 1 } : {} })
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [slug, preview]);
  useEffect(() => { setData(null); setNotFound(false); load(); }, [load]);

  const frame = (children) => (
    <div className={`min-h-screen ${PAGE_BG}`}>
      {open ? <OpenHeader slug={slug} /> : (<><Sidebar /><TopBar /></>)}
      <div className={open ? 'pt-16' : 'lg:ml-64 mt-16'}><div className="p-4 sm:p-6 lg:p-8">{children}</div></div>
    </div>
  );

  if (notFound) {
    return frame(
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <p className="pf-serif text-2xl text-[#32281F]">This page isn't available</p>
          <p className="mt-2 pf-muted">The link may be wrong, or the page was removed.</p>
          <Link to={open ? '/' : '/dashboard'} className="mt-5 inline-block font-semibold text-[#32281F] hover:underline">Back to BeeBark</Link>
        </div>
      </div>
    );
  }
  if (!data) return frame(<div className="flex min-h-[60vh] items-center justify-center"><BeeLoader size="section" label="Opening the page" /></div>);

  const { page, employees, jobs } = data;
  const admin = data.isAdmin && !preview;
  const typeLabel = PAGE_TYPE_LABELS[page.type] || '';

  const toggleFollow = async () => {
    if (!user) { navigate(`/register?next=${encodeURIComponent(`/company/${page.slug}`)}`); return; }
    setBusy(true);
    try {
      const res = data.isFollowing
        ? await axios.delete(`${API_URL}/api/companies/${page._id}/follow`)
        : await axios.post(`${API_URL}/api/companies/${page._id}/follow`);
      setData((d) => ({ ...d, isFollowing: res.data.following, page: { ...d.page, followerCount: res.data.followerCount } }));
      if (res.data.following) toast.success(`You're following ${page.name}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: 'page-overview', label: 'Overview' },
    { id: 'page-people', label: `People${employees.length ? ` (${employees.length})` : ''}` },
    { id: 'page-jobs', label: `Jobs${jobs.length ? ` (${jobs.length})` : ''}` }
  ];

  const manage = () => { setActingAs(page._id); navigate(`/company/${page.slug}/admin`); };

  return frame(
    <>
      {preview && data.isAdmin && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-4 sm:mb-6 lg:mb-8 bg-[#32281F] text-white text-sm px-4 py-2.5 flex items-center justify-center gap-3">
          <FiEye className="w-4 h-4" />You're seeing this page as a visitor.
          <Link to={`/company/${page.slug}`} className="font-semibold underline">Back to admin view</Link>
        </div>
      )}
      {/* Cover + logo */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
        <div className="relative h-44 sm:h-60 lg:h-72"
          style={page.cover
            ? { backgroundImage: `url(${page.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(120deg, #6B5440 0%, #4A3A2C 40%, #32281F 75%, #221A14 100%)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,15,10,0) 45%, rgba(20,15,10,0.35) 100%)' }} />
          {admin && (
            <Link to={`/company/${page.slug}/admin?tab=edit`} className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/75">
              <FiEdit2 className="w-3.5 h-3.5" />Edit cover
            </Link>
          )}
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="-mt-12 sm:-mt-16 relative z-10">
            <CompanyLogo page={page} className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]" rounded="rounded-2xl" text="text-3xl sm:text-4xl" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="pf-serif text-3xl sm:text-[40px] font-bold leading-tight text-[#32281F] break-words" data-testid="company-name">{page.name}</h1>
            {page.verified && <FiCheckCircle className="w-6 h-6 text-[#E0A21A]" aria-label="Verified page" title="Verified by BeeBark" />}
          </div>
          {page.tagline && <p className="mt-1 text-lg pf-muted">{page.tagline}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] pf-muted">
            {typeLabel && <span className="inline-flex items-center gap-1.5"><FiGrid className="w-4 h-4" />{typeLabel}</span>}
            {page.locations[0] && <span className="inline-flex items-center gap-1.5"><FiMapPin className="w-4 h-4" />{page.locations[0]}</span>}
            {page.teamSize && <span className="inline-flex items-center gap-1.5"><FiUsers className="w-4 h-4" />{page.teamSize} employees</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] pf-muted">
            <span data-testid="company-followers"><b className="font-semibold text-[#32281F]">{compact(page.followerCount)}</b> follower{page.followerCount === 1 ? '' : 's'}</span>
            {employees.length > 0 && <span><b className="font-semibold text-[#32281F]">{employees.length}</b> on BeeBark</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-5 pb-6">
            {admin ? (
              <>
                <button type="button" onClick={manage} className={heroBtn.dark} data-testid="company-manage"><FiEdit2 className="w-4 h-4" />Manage page</button>
                <Link to={`/jobs?post=1&as=${page._id}`} onClick={() => setActingAs(page._id)} className={heroBtn.honey}><FiPlus className="w-4 h-4" />Post a job</Link>
                <ShareMenu path={`/c/${page.slug}`} title={`${page.name} on BeeBark`} text={page.tagline} align="start" testId="company-share"
                  trigger={<button type="button" className={heroBtn.outline}><FiShare2 className="w-4 h-4" />Share page</button>} />
                <Link to={`/company/${page.slug}?preview=1`} className={heroBtn.outline} data-testid="company-view-as-visitor"><FiEye className="w-4 h-4" />View as visitor</Link>
              </>
            ) : (
              <>
                <button type="button" onClick={toggleFollow} disabled={busy} className={data.isFollowing ? heroBtn.outline : heroBtn.dark} data-testid="company-follow">
                  {data.isFollowing ? <><FiCheck className="w-4 h-4" />Following</> : <><FiPlus className="w-4 h-4" />Follow</>}
                </button>
                {page.website && <a href={page.website} target="_blank" rel="noreferrer" className={heroBtn.outline}><FiGlobe className="w-4 h-4" />Visit website</a>}
                <ShareMenu path={`/c/${page.slug}`} title={`${page.name} on BeeBark`} text={page.tagline} align="start" testId="company-share"
                  trigger={<button type="button" className={heroBtn.outline}><FiShare2 className="w-4 h-4" />Share</button>} />
              </>
            )}
          </div>
        </div>
      </div>

      <ProfileTabs tabs={tabs} />

      <div className="max-w-6xl mx-auto mt-6 sm:mt-8 grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6 sm:space-y-8 min-w-0">
          <Section id="page-overview" title="About">
            {page.about ? <p className="whitespace-pre-line text-[16px] leading-relaxed text-[#2A221C]" data-testid="company-about">{page.about}</p>
              : <p className="pf-muted">{admin ? 'Tell people what your company does. ' : 'No description yet.'}{admin && <Link to={`/company/${page.slug}/admin?tab=edit`} className="font-semibold text-[#32281F] underline">Add one</Link>}</p>}
            {page.specialties.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#32281F] mb-2">{page.type === 'supplier' ? 'Products' : 'Specialties'}</p>
                <div className="flex flex-wrap gap-2">
                  {page.specialties.map((s) => <span key={s} className="rounded-full bg-[#F2EFEC] px-3 py-1 text-sm text-[#2A221C]">{s}</span>)}
                </div>
              </div>
            )}
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 text-[15px]">
              {page.website && <Fact icon={FiGlobe} label="Website"><a href={page.website} target="_blank" rel="noreferrer" className="text-[#32281F] hover:underline break-all">{page.website.replace(/^https?:\/\//, '')}</a></Fact>}
              {typeLabel && <Fact icon={FiGrid} label="Industry">{typeLabel}</Fact>}
              {page.teamSize && <Fact icon={FiUsers} label="Company size">{page.teamSize} employees</Fact>}
              {page.locations.length > 0 && <Fact icon={FiMapPin} label={page.locations.length > 1 ? 'Locations' : 'Location'}>{page.locations.join(' · ')}</Fact>}
              {page.founded && <Fact icon={FiCalendar} label="Founded">{page.founded}</Fact>}
              {page.email && <Fact icon={FiMail} label="Email"><a href={`mailto:${page.email}`} className="hover:underline">{page.email}</a></Fact>}
              {page.phone && <Fact icon={FiPhone} label="Phone"><a href={`tel:${page.phone.replace(/\s/g, '')}`} className="hover:underline">{page.phone}</a></Fact>}
            </dl>
          </Section>

          <Section id="page-people" title="People">
            {employees.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {employees.map((p) => (
                  <Link key={p._id} to={`/profile/${p.username}`} className="flex items-center gap-3 rounded-xl border border-[#E6E1DB] p-3 hover:border-[#CFC6BC]">
                    {p.profilePic ? <img src={p.profilePic} alt="" className="w-12 h-12 rounded-full object-cover" /> : <span className="w-12 h-12 rounded-full bg-[#F2EFEC] flex items-center justify-center font-semibold text-[#32281F]">{initials(p.name)}</span>}
                    <span className="min-w-0">
                      <span className="block font-semibold text-[#32281F] truncate">{p.name}</span>
                      <span className="block text-sm pf-muted truncate">{p.title}{p.current ? '' : ' (past)'}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : <p className="pf-muted">People who work here can add {page.name} to the Experience section of their profile.</p>}
          </Section>

          <Section id="page-jobs" title="Jobs" action={admin && <Link to={`/jobs?post=1&as=${page._id}`} onClick={() => setActingAs(page._id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#32281F] px-3 py-1.5 text-sm font-semibold text-white"><FiPlus className="w-4 h-4" />Post a job</Link>}>
            {jobs.length ? (
              <div className="divide-y divide-[#E6E1DB]">
                {jobs.map((j) => (
                  <Link key={j._id} to={`/jobs?tab=all&job=${j._id}`} className="flex items-center gap-3 py-3 group">
                    <CompanyLogo page={page} className="w-11 h-11" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-[#32281F] group-hover:underline truncate">{j.title}</span>
                      <span className="block text-sm pf-muted truncate">{[j.location, j.workplace, inrSalary(j.salary)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <FiArrowRight className="pf-muted" />
                  </Link>
                ))}
              </div>
            ) : <p className="pf-muted">No open jobs right now.</p>}
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-36">
          {!admin && (
            <div className="pf-card p-6">
              <p className="pf-serif text-xl font-semibold text-[#32281F]">Stay in touch</p>
              <p className="mt-1 text-sm pf-muted">Follow to see their jobs and updates.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={toggleFollow} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#32281F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#221A14]">
                  {data.isFollowing ? <><FiCheck className="w-4 h-4" />Following</> : <><FiPlus className="w-4 h-4" />Follow</>}
                </button>
                {page.email && <a href={`mailto:${page.email}?subject=${encodeURIComponent(`Enquiry via BeeBark`)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E1DB] bg-white px-4 py-2 text-sm font-medium text-[#32281F]"><FiMail className="w-4 h-4" />Enquire</a>}
              </div>
            </div>
          )}
          <div className="pf-card p-6">
            <p className="font-semibold text-[#32281F]">Share this page</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#F2EFEC] px-3 py-2">
              <span className="flex-1 min-w-0 truncate text-sm pf-muted">{companyUrl(page.slug).replace(/^https?:\/\//, '')}</span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(companyUrl(page.slug)).then(() => toast.success('Link copied'), () => toast(companyUrl(page.slug)))}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#32281F]" data-testid="company-copy-link"><FiLink className="w-4 h-4" />Copy</button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

const Fact = ({ icon: Icon, label, children }) => (
  <div className="flex gap-3 min-w-0">
    <Icon className="w-4 h-4 mt-1 pf-muted shrink-0" />
    <div className="min-w-0"><dt className="text-sm pf-muted">{label}</dt><dd className="text-[#32281F] break-words">{children}</dd></div>
  </div>
);

const OpenHeader = ({ slug }) => (
  <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-[#E6E1DB] bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-8">
      <Link to="/" className="flex items-center gap-2">
        <img src="/image.png" alt="" className="h-8 w-8 object-contain" />
        <span className="pf-serif text-xl font-bold text-[#32281F]">Bee<span className="text-[#E0A21A]">Bark</span></span>
      </Link>
      <div className="flex items-center gap-2">
        <Link to={`/login?next=${encodeURIComponent(`/company/${slug}`)}`} className="rounded-lg px-4 py-2 text-sm font-medium text-[#32281F] hover:bg-[#F2EFEC]">Sign in</Link>
        <Link to={`/register?next=${encodeURIComponent(`/company/${slug}`)}`} className="rounded-lg bg-[#32281F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#221A14]">Join now</Link>
      </div>
    </div>
  </header>
);

export default CompanyPage;
