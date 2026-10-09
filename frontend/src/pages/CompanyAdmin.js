import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FiEye, FiUsers, FiBriefcase, FiInbox, FiPlus, FiShare2, FiEdit2, FiExternalLink, FiTrash2, FiChevronRight, FiGrid, FiUserPlus
} from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import BeeLoader from '../components/BeeLoader';
import ShareMenu from '../components/ShareMenu';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import PageForm, { EMPTY_PAGE, pageErrors, slugify } from '../components/company/PageForm';
import { PAGE_BG } from '../components/profile/ProfileShell';
import { API_URL } from '../config/api';
import { usePages, PAGE_TYPE_LABELS } from '../context/PagesContext';
import CompanyLogo from '../components/company/CompanyLogo';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'edit', label: 'Edit page' },
  { id: 'admins', label: 'Admins' }
];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const ago = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// Page admin: dashboard numbers, editing the page, and who can manage it
const CompanyAdmin = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'dashboard';
  const navigate = useNavigate();
  const { refreshPages, setActingAs } = usePages();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(EMPTY_PAGE);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminName, setAdminName] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/companies/${slug}`, { params: { preview: 1 } });
      if (!res.data.isAdmin) { navigate(`/company/${slug}`, { replace: true }); return; }
      setData(res.data);
      const p = res.data.page;
      setForm({ ...EMPTY_PAGE, ...Object.fromEntries(Object.keys(EMPTY_PAGE).map((k) => [k, p[k] ?? EMPTY_PAGE[k]])) });
      setActingAs(p._id);
      axios.get(`${API_URL}/api/companies/${p._id}/stats`, { silent: true }).then((s) => setStats(s.data)).catch(() => {});
    } catch {
      navigate('/dashboard', { replace: true });
      toast.error('Page not found');
    }
  }, [slug, navigate, setActingAs]);
  useEffect(() => { load(); }, [load]);

  if (!data) return (
    <div className={`min-h-screen ${PAGE_BG}`}><Sidebar /><TopBar /><div className="lg:ml-64 mt-16 flex min-h-[60vh] items-center justify-center"><BeeLoader size="section" label="Opening your page" /></div></div>
  );
  const { page } = data;
  const setTab = (id) => setSearchParams((p) => { p.set('tab', id); return p; }, { replace: true });

  const save = async () => {
    const errors = pageErrors(form);
    if (Object.keys(errors).length) { setShowErrors(true); toast.error(Object.values(errors)[0]); return; }
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/companies/${page._id}`, { ...form, slug: slugify(form.slug) });
      await refreshPages();
      toast.success('Page saved');
      setShowErrors(false);
      if (res.data.page.slug !== page.slug) navigate(`/company/${res.data.page.slug}/admin?tab=edit`, { replace: true });
      else setData((d) => ({ ...d, page: { ...d.page, ...res.data.page } }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = async (e) => {
    e.preventDefault();
    if (!adminName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/api/companies/${page._id}/admins`, { username: adminName.trim() });
      setData((d) => ({ ...d, admins: [...d.admins, res.data.admin] }));
      setAdminName('');
      toast.success(`${res.data.admin.name} can now manage this page`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not add admin');
    }
  };
  const removeAdmin = async (a) => {
    if (!window.confirm(`Remove ${a.name} as an admin?`)) return;
    try {
      await axios.delete(`${API_URL}/api/companies/${page._id}/admins/${a._id}`);
      setData((d) => ({ ...d, admins: d.admins.filter((x) => x._id !== a._id) }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not remove');
    }
  };
  const deletePage = async () => {
    if (!window.confirm(`Delete ${page.name}? Followers, jobs and Experience links to it will be removed. This can't be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/api/companies/${page._id}`);
      setActingAs(null);
      await refreshPages();
      toast.success('Page deleted');
      navigate('/profile', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete');
    }
  };

  const statCards = [
    { icon: FiEye, value: stats?.views, label: 'Page views' },
    { icon: FiUsers, value: stats?.followers, label: 'Followers' },
    { icon: FiBriefcase, value: stats?.jobs, label: 'Open jobs' },
    { icon: FiInbox, value: stats?.applicants, label: 'Job applicants' }
  ];

  return (
    <div className={`min-h-screen ${PAGE_BG}`} data-testid="company-admin">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome */}
          <div className="relative overflow-hidden rounded-2xl border border-[#ebe6df] bg-white">
            <div className="absolute inset-y-0 right-0 w-full sm:w-1/2 opacity-90"
              style={page.cover ? { backgroundImage: `linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0) 100%), url(${page.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}} />
            <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <CompanyLogo page={page} className="w-16 h-16 sm:w-20 sm:h-20" rounded="rounded-2xl" text="text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="pf-muted">{greeting()},</p>
                <h1 className="pf-serif text-3xl sm:text-4xl font-bold text-[#2b2622] break-words">{page.name}</h1>
                <p className="mt-1 text-sm pf-muted flex flex-wrap gap-x-3">
                  {PAGE_TYPE_LABELS[page.type] && <span className="inline-flex items-center gap-1"><FiGrid />{PAGE_TYPE_LABELS[page.type]}</span>}
                  {page.locations?.[0] && <span>{page.locations[0]}</span>}
                  <span>Company page</span>
                </p>
              </div>
            </div>
            <div className="relative px-6 sm:px-8 pb-6 flex flex-wrap gap-2">
              <Link to={`/jobs?post=1&as=${page._id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#F2B21B] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#E0A21A]" data-testid="admin-post-job"><FiPlus />Post a job</Link>
              {page.type === 'supplier' && <Link to="/portfolio" className="inline-flex items-center gap-1.5 rounded-xl bg-[#2b2622] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"><FiPlus />Add product</Link>}
              {['architecture_firm', 'interior_firm', 'construction'].includes(page.type) && <Link to="/portfolio" className="inline-flex items-center gap-1.5 rounded-xl bg-[#2b2622] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"><FiPlus />Add project</Link>}
              <ShareMenu path={`/c/${page.slug}`} title={`${page.name} on BeeBark`} text={page.tagline} align="start" testId="admin-share"
                trigger={<button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ddd5] bg-white px-4 py-2.5 text-sm font-medium text-[#2b2622]"><FiShare2 />Share page</button>} />
              <Link to={`/company/${page.slug}?preview=1`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ddd5] bg-white px-4 py-2.5 text-sm font-medium text-[#2b2622]" data-testid="admin-view-as-visitor"><FiEye />View as visitor</Link>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 border-b border-[#ebe6df] overflow-x-auto" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
                className={`relative px-4 py-3 text-[15px] whitespace-nowrap ${tab === t.id ? 'font-semibold text-[#2b2622]' : 'pf-muted hover:text-[#2b2622]'}`}>
                {t.label}{tab === t.id && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#F2B21B]" />}
              </button>
            ))}
          </nav>

          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {statCards.map((s) => (
                  <div key={s.label} className="pf-card p-5" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <s.icon className="w-5 h-5 text-[#E0A21A]" />
                    <p className="mt-3 text-3xl font-bold text-[#2b2622]">{stats ? Number(s.value || 0).toLocaleString('en-IN') : '–'}</p>
                    <p className="text-sm pf-muted">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="pf-card p-6">
                  <div className="flex items-center justify-between"><h2 className="pf-serif text-xl font-semibold text-[#2b2622]">Recent applicants</h2><Link to="/jobs?tab=posted" className="text-sm font-medium text-[#2b2622] hover:underline">View all</Link></div>
                  {stats?.recentApplicants?.length ? (
                    <ul className="mt-4 divide-y divide-[#ebe6df]">
                      {stats.recentApplicants.map((a, i) => (
                        <li key={i}><Link to={`/profile/${a.person.username}`} className="flex items-center gap-3 py-3">
                          {a.person.profilePic ? <img src={a.person.profilePic} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-[#f3efe9] flex items-center justify-center font-semibold">{a.person.name?.[0]}</span>}
                          <span className="flex-1 min-w-0"><span className="block font-medium text-[#2b2622] truncate">{a.person.name}</span><span className="block text-sm pf-muted truncate">Applied for {a.job}</span></span>
                          <span className="text-xs pf-muted shrink-0">{ago(a.at)}</span>
                        </Link></li>
                      ))}
                    </ul>
                  ) : <p className="mt-4 text-sm pf-muted">No applicants yet. <Link to={`/jobs?post=1&as=${page._id}`} className="font-semibold text-[#2b2622] underline">Post a job</Link> as {page.name}.</p>}
                </div>
                <div className="pf-card p-6">
                  <h2 className="pf-serif text-xl font-semibold text-[#2b2622]">New followers</h2>
                  {stats?.recentFollowers?.length ? (
                    <ul className="mt-4 divide-y divide-[#ebe6df]">
                      {stats.recentFollowers.map((p) => (
                        <li key={p._id}><Link to={`/profile/${p.username}`} className="flex items-center gap-3 py-3">
                          {p.profilePic ? <img src={p.profilePic} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-[#f3efe9] flex items-center justify-center font-semibold">{p.name?.[0]}</span>}
                          <span className="flex-1 min-w-0"><span className="block font-medium text-[#2b2622] truncate">{p.name}</span><span className="block text-sm pf-muted truncate">{p.headline}</span></span>
                        </Link></li>
                      ))}
                    </ul>
                  ) : <p className="mt-4 text-sm pf-muted">Share your page to get your first followers.</p>}
                </div>
              </div>
              <div className="pf-card p-6">
                <h2 className="pf-serif text-xl font-semibold text-[#2b2622]">Quick links</h2>
                <div className="mt-3 divide-y divide-[#ebe6df]">
                  {[
                    { label: 'Edit page details', onClick: () => setTab('edit'), icon: FiEdit2 },
                    { label: 'Manage admins', onClick: () => setTab('admins'), icon: FiUserPlus },
                    { label: 'Review job applications', to: '/jobs?tab=posted', icon: FiBriefcase },
                    { label: 'Open the public page', to: `/company/${page.slug}`, icon: FiExternalLink }
                  ].map((l) => {
                    const inner = <><l.icon className="w-4 h-4 pf-muted" /><span className="flex-1">{l.label}</span><FiChevronRight className="pf-muted" /></>;
                    return l.to
                      ? <Link key={l.label} to={l.to} className="flex items-center gap-3 py-3 text-[#2b2622] hover:underline">{inner}</Link>
                      : <button key={l.label} type="button" onClick={l.onClick} className="w-full flex items-center gap-3 py-3 text-left text-[#2b2622] hover:underline">{inner}</button>;
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <div className="pf-card p-5 sm:p-8">
              <PageForm form={form} setForm={setForm} showErrors={showErrors} pageId={page._id} />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                {data.isOwner ? <button type="button" onClick={deletePage} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline" data-testid="page-delete"><FiTrash2 />Delete page</button> : <span />}
                <Button type="button" onClick={save} disabled={saving} className="bg-[#2b2622] text-white hover:bg-black" data-testid="page-save">{saving ? 'Saving…' : 'Save changes'}</Button>
              </div>
            </div>
          )}

          {tab === 'admins' && (
            <div className="pf-card p-5 sm:p-8 space-y-5">
              <div>
                <h2 className="pf-serif text-xl font-semibold text-[#2b2622]">Page admins</h2>
                <p className="text-sm pf-muted">Admins can edit the page, post jobs as {page.name} and see the dashboard.</p>
              </div>
              <ul className="divide-y divide-[#ebe6df]">
                {data.admins.map((a) => (
                  <li key={a._id} className="flex items-center gap-3 py-3">
                    {a.profilePic ? <img src={a.profilePic} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-[#f3efe9] flex items-center justify-center font-semibold">{a.name?.[0]}</span>}
                    <span className="flex-1 min-w-0"><span className="block font-medium text-[#2b2622] truncate">{a.name}</span><span className="block text-sm pf-muted">{a.role === 'owner' ? 'Owner' : 'Admin'}</span></span>
                    {data.isOwner && a.role !== 'owner' && <button type="button" onClick={() => removeAdmin(a)} className="text-sm text-red-600 hover:underline">Remove</button>}
                  </li>
                ))}
              </ul>
              {data.isOwner && (
                <form onSubmit={addAdmin} className="flex gap-2">
                  <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Their BeeBark username, e.g. riya" data-testid="admin-username" />
                  <Button type="submit" className="bg-[#F2B21B] text-black hover:bg-[#E0A21A] shrink-0" data-testid="admin-add"><FiUserPlus className="mr-1" />Add</Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyAdmin;
