import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Check, ArrowRight, Zap, MapPin, GraduationCap, Users, BriefcaseBusiness, Building2,
  Briefcase, UserRound, Store, ChevronRight, Megaphone, Image as ImageIcon, FileText, ExternalLink
} from 'lucide-react';
import ResumeImport from '../components/ResumeImport';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { STAGES, INDUSTRY_LABEL, getVariant, unsplash } from '../config/dashboardVariants';
import FollowButton, { followersLabel } from '../components/FollowButton';

const STAGE_ICONS = { GraduationCap, Users, BriefcaseBusiness, Building2, Briefcase, UserRound, Store };

const TYPE_LABEL = {
  internship: 'Internship', graduate: 'Graduate', full_time: 'Full-time',
  part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance'
};

const Panel = ({ title, action, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-black">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const ViewAll = ({ to, label = 'View all' }) => (
  <Link to={to} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-slate-600 hover:text-black">
    {label} <ArrowRight className="h-4 w-4" />
  </Link>
);

const Tags = ({ items }) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {items.map((t) => (
      <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>
    ))}
  </div>
);

const Initials = ({ name, src, size = 'h-14 w-14' }) =>
  src ? (
    <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-yellow-400 font-bold text-black`}>
      {name?.charAt(0)}
    </span>
  );

const FeaturedJob = ({ job }) => (
  <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
    {job.imageUrl ? (
      <img src={job.imageUrl} alt="" className="h-48 w-full rounded-xl object-cover sm:h-full" />
    ) : (
      <div className="flex h-48 items-center justify-center rounded-xl bg-yellow-50"><Briefcase className="h-10 w-10 text-yellow-500" /></div>
    )}
    <div className="min-w-0">
      <h3 className="font-display text-lg font-bold text-black">{job.title}</h3>
      <p className="text-slate-600">{job.company}</p>
      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{job.location}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{job.description}</p>
      <Tags items={[...new Set([TYPE_LABEL[job.employmentType], ...job.tags].filter(Boolean))].slice(0, 4)} />
    </div>
  </div>
);

const FeaturedProject = ({ project }) => (
  <div>
    <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
      {project.images[0] ? (
        <img src={project.images[0]} alt="" className="h-48 w-full rounded-xl object-cover sm:h-56" />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl bg-yellow-50"><ImageIcon className="h-10 w-10 text-yellow-500" /></div>
      )}
      <div className="min-w-0">
        <h3 className="font-display text-lg font-bold text-black">{project.title}</h3>
        <p className="text-sm text-slate-600">{[project.category, project.projectStatus].filter(Boolean).join(' · ')}</p>
        {project.location && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{project.location}</p>}
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{project.description}</p>
      </div>
    </div>
    {project.images.length > 1 && (
      <div className="mt-3 grid grid-cols-4 gap-2">
        {project.images.slice(1, 5).map((src) => (
          <img key={src} src={src} alt="" className="h-20 w-full rounded-lg object-cover" />
        ))}
      </div>
    )}
  </div>
);

const EmptyState = ({ text, cta, to }) => (
  <div className="flex flex-col items-start gap-3 rounded-xl bg-slate-50 p-5">
    <p className="text-sm text-slate-600">{text}</p>
    <Link to={to} className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500">
      {cta} <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('');
  const [requested, setRequested] = useState({});

  useEffect(() => {
    axios.get(`${API_URL}/api/dashboard`)
      .then((res) => { setData(res.data); setStage(res.data.careerStage); })
      .catch(() => setError("Couldn't load your dashboard. Please refresh."));
  }, []);

  const chooseStage = async (id) => {
    const previous = stage;
    setStage(id);
    try {
      await axios.put(`${API_URL}/api/profile/update`, { careerStage: id });
      refreshUser?.();
    } catch {
      setStage(previous);
    }
  };

  // Follow state and count for one suggested person
  const patchPerson = (id, changes) => setData((d) => ({
    ...d,
    connections: (d?.connections || []).map((p) => (p.id === id ? { ...p, ...changes } : p))
  }));

  const connect = async (personId) => {
    setRequested((r) => ({ ...r, [personId]: 'sending' }));
    try {
      await axios.post(`${API_URL}/api/connections/send-request/${personId}`);
      setRequested((r) => ({ ...r, [personId]: 'sent' }));
    } catch {
      setRequested((r) => ({ ...r, [personId]: undefined }));
    }
  };

  const audience = data?.audience || (user?.role === 'student' ? 'student' : 'professional');
  const v = getVariant(data?.industry, audience);
  const isStudent = audience === 'student';
  const completion = data?.completion;
  const checklist = completion
    ? [...completion.items.filter((i) => i.done).slice(0, 2), ...completion.items.filter((i) => !i.done).slice(0, 2)]
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />

      <main className="mt-16 p-4 sm:p-6 lg:ml-64 lg:p-8" data-testid="dashboard">
        {/* Heading and stage chips */}
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-500" data-testid="dashboard-breadcrumb">
              {INDUSTRY_LABEL[v.industry]} / {isStudent ? 'Student' : 'Professional'}
            </p>
            <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-black sm:text-4xl" data-testid="dashboard-title">{v.title}</h1>
            <p className="mt-2 max-w-3xl text-slate-600">{v.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Where you are now">
            {STAGES[audience].map((s) => {
              const Icon = STAGE_ICONS[s.icon];
              const active = stage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseStage(s.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active ? 'border-yellow-400 bg-yellow-300 text-black' : 'border-slate-200 bg-white text-slate-700 hover:border-yellow-400'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {/* Profile completion */}
        {completion && completion.percent < 100 && (
          <section className="mt-6 grid gap-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center" data-testid="dashboard-profile-completion">
            <div>
              <p className="font-display font-bold text-black">Complete your profile ({completion.percent}%)</p>
              <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-yellow-100">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${completion.percent}%` }} />
              </div>
            </div>
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                  {item.done ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400"><Check className="h-3.5 w-3.5 text-black" strokeWidth={3} /></span>
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
            <Link to="/profile" className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-500">
              Edit profile <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        {/* Next step */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl bg-black p-5 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Zap className="mt-1 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60">Your next step</p>
              <p className="mt-1 text-lg">{v.nextStep}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 lg:flex-nowrap">
            <Link to={v.primary.to} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-500">
              {v.primary.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={v.secondary.to} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/70 px-5 py-3 font-semibold text-white hover:bg-white/10">
              {v.secondary.label}
            </Link>
          </div>
        </section>

        {/* Résumé: see it, open it, replace it */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center" data-testid="dashboard-resume">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-50"><FileText className="h-6 w-6 text-yellow-600" /></div>
            {user?.resume?.url ? (
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-slate-500">Your résumé</p>
                <p className="truncate font-semibold text-black">{user.resume.fileName || 'Résumé'}</p>
                <p className="text-xs text-slate-500">
                  {user.resume.uploadedAt ? `Updated ${new Date(user.resume.uploadedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Uploaded'}
                  {typeof user.resume.score === 'number' ? ` · Score ${user.resume.score}/100` : ''}
                  {' · only you can see it'}
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="font-semibold text-black">Add your résumé</p>
                <p className="text-sm text-slate-500">Fill your skills automatically and apply to jobs faster. Only you can see it.</p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {user?.resume?.url && (
              <a href={user.resume.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-black hover:bg-slate-50" data-testid="dashboard-resume-view">
                View <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <ResumeImport onImported={() => refreshUser?.()} />
            {user?.resume?.url && <Link to="/profile" className="text-sm font-medium text-slate-600 hover:text-black">Manage</Link>}
          </div>
        </section>

        {/* Featured + connections */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          {isStudent ? (
            <Panel title="Featured Opportunity" action={<ViewAll to="/jobs" />}>
              {data?.featuredJob ? (
                <FeaturedJob job={data.featuredJob} />
              ) : (
                <EmptyState text="Internships and entry-level roles for your field will appear here." cta="Browse opportunities" to="/jobs" />
              )}
            </Panel>
          ) : (
            <Panel title="Featured Project" action={<ViewAll to="/portfolio" label="View all portfolio" />}>
              {data?.featuredProject ? (
                <FeaturedProject project={data.featuredProject} />
              ) : (
                <EmptyState text="Add your first project so clients and connections can see your work." cta="Add a project" to="/portfolio" />
              )}
            </Panel>
          )}

          <Panel title={v.peopleTitle} action={<ViewAll to="/connections" />}>
            {data?.connections?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.connections.map((p) => (
                  <li key={p.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                    <Link to={`/profile/${p.username}`}><Initials name={p.name} src={p.profilePic} /></Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/profile/${p.username}`} className="font-display font-bold text-black hover:underline">{p.name}</Link>
                      <p className="text-sm text-slate-600">{p.headline}</p>
                      {typeof p.followerCount === 'number' && <p className="text-xs text-slate-500" data-testid={`follower-count-${p.id}`}>{followersLabel(p.followerCount)}</p>}
                      <p className="text-xs text-slate-500">{[p.company, p.location].filter(Boolean).join(' · ')}</p>
                      {p.tags.length > 0 && <Tags items={p.tags} />}
                    </div>
                    <div className="flex h-fit shrink-0 flex-col items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => connect(p.id)}
                        disabled={!!requested[p.id]}
                        className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {requested[p.id] === 'sent' ? 'Requested' : requested[p.id] === 'sending' ? 'Sending…' : 'Connect'}
                      </button>
                      <FollowButton
                        userId={p.id}
                        name={p.name}
                        isFollowing={p.isFollowing}
                        followerCount={p.followerCount || 0}
                        onChange={(changes) => patchPerson(p.id, changes)}
                        className="rounded-lg"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="As more people join from your industry, we'll suggest them here." cta="Search people" to="/connections" />
            )}
          </Panel>
        </div>

        {/* Opportunities, news, official */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Panel title={v.opportunitiesTitle} action={<ViewAll to="/jobs" />}>
            {data?.jobs?.length ? (
              <ul className="divide-y divide-slate-100">
                {data.jobs.map((j) => (
                  <li key={j.id}>
                    <Link to="/jobs" className="flex items-center gap-3 py-3 hover:bg-slate-50">
                      {j.imageUrl ? (
                        <img src={j.imageUrl} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-yellow-50"><Briefcase className="h-6 w-6 text-yellow-600" /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-black">{j.title}</p>
                        <p className="truncate text-sm text-slate-600">{j.company}</p>
                        <p className="truncate text-xs text-slate-500">{[j.location, TYPE_LABEL[j.employmentType]].filter(Boolean).join(' · ')}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">New roles in your field will appear here.</p>
            )}
          </Panel>

          <Panel title="Industry News" action={<ViewAll to="/news" />}>
            <ul className="space-y-4">
              {v.news.map((n) => (
                <li key={n.title}>
                  <Link to="/news" className="flex gap-3 hover:opacity-90">
                    <img src={unsplash(n.image, 300)} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug text-black">{n.title}</p>
                      <p className="mt-1 text-xs text-slate-500">BeeBark Insights · {n.tag}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="@BeeBark Official" action={<ViewAll to="/official" />}>
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-400"><Megaphone className="h-5 w-5 text-black" /></span>
              <div>
                <p className="font-semibold text-black">BeeBark Official</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{v.official}</p>
              </div>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
