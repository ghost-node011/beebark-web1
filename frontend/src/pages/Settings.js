import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { FiUser, FiLock, FiSlash, FiLogOut, FiPauseCircle, FiTrash2, FiChevronRight, FiBell, FiBriefcase, FiGrid, FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { SkeletonRows } from '../components/Skeletons';
import { API_URL } from '../config/api';
import { usePages } from '../context/PagesContext';
import CompanyLogo from '../components/company/CompanyLogo';

const PRIVACY = [
  { field: 'analyticsPublic', label: 'Show my profile analytics', hint: 'Profile views and counts on your profile' },
  { field: 'galleryPublic', label: 'Show my work gallery', hint: 'Your portfolio photos on your profile' },
  { field: 'activityPublic', label: 'Show my recent activity', hint: 'Your latest posts on your profile' },
  { field: 'readReceipts', label: 'Read receipts', hint: "Let people see when you've read their messages. If you turn this off, you won't see theirs either." }
];

const NAV = [
  { id: 'account', label: 'Account', icon: FiUser },
  { id: 'pages', label: 'Company pages', icon: FiGrid },
  { id: 'privacy', label: 'Privacy', icon: FiLock },
  { id: 'jobs', label: 'Job settings', icon: FiBriefcase },
  { id: 'blocked', label: 'Blocked people', icon: FiSlash },
  { id: 'signout', label: 'Sign out', icon: FiLogOut },
  { id: 'close', label: 'Close account', icon: FiPauseCircle, danger: true }
];

const Section = ({ id, icon: Icon, title, children, tone }) => (
  <Card id={`settings-${id}`} className={`p-6 scroll-mt-24 ${tone === 'danger' ? 'border-red-200' : ''}`}>
    <h2 className={`text-lg font-semibold font-serif flex items-center gap-2 mb-4 ${tone === 'danger' ? 'text-red-700' : 'text-slate-900'}`}>
      <Icon className="w-4 h-4" />{title}
    </h2>
    {children}
  </Card>
);

const Settings = () => {
  const { user, setUser, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const { pages, setActingAs } = usePages();
  const showPages = user?.role !== 'student' || pages.length > 0;
  const [blocked, setBlocked] = useState(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const needsPassword = (user?.authProvider || 'local') === 'local';

  useEffect(() => {
    axios.get(`${API_URL}/api/account/blocked`)
      .then((res) => setBlocked(res.data.blocked || []))
      .catch(() => setBlocked([]));
  }, []);

  const setJobsView = async (value) => {
    const previous = user?.jobsView === 'list' ? 'list' : 'swipe';
    if (value === previous) return;
    setUser((u) => ({ ...u, jobsView: value }));
    try {
      await axios.put(`${API_URL}/api/profile/update`, { jobsView: value });
      toast.success(value === 'list' ? 'Jobs for you will show as a list' : 'Jobs for you will show as swipe cards');
    } catch {
      setUser((u) => ({ ...u, jobsView: previous }));
      toast.error('Could not save this setting');
    }
  };

  const togglePrivacy = async (field, value) => {
    setUser((u) => ({ ...u, [field]: value }));
    try {
      await axios.put(`${API_URL}/api/profile/update`, { [field]: value });
    } catch {
      setUser((u) => ({ ...u, [field]: !value }));
      toast.error('Could not save this setting');
    }
  };

  const unblock = async (person) => {
    try {
      await axios.delete(`${API_URL}/api/account/block/${person._id}`);
      setBlocked((list) => list.filter((p) => p._id !== person._id));
      toast.success(`${person.name} is unblocked. Send a new request to connect again.`);
    } catch {
      toast.error('Could not unblock');
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      await axios.post(`${API_URL}/api/account/deactivate`);
      toast.success('Your account is deactivated. Sign in again any time to come back.');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not deactivate');
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await axios.post(`${API_URL}/api/account/delete`, { confirm: confirmText, password });
      toast.success('Your account has been deleted');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete account');
      setBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    await logoutAll();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F6F4]" data-testid="settings-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account, company pages, privacy and job preferences.</p>
          </div>
          <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
          {/* Section menu (a scrolling row of chips on phones) */}
          <nav className="mb-6 lg:mb-0 lg:sticky lg:top-24 flex lg:flex-col gap-1 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:p-2" aria-label="Settings sections">
            {NAV.filter((n) => n.id !== 'pages' || showPages).map((n) => (
              <a key={n.id} href={`#settings-${n.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(`settings-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className={`shrink-0 flex items-center gap-2.5 rounded-full lg:rounded-lg border lg:border-0 border-gray-200 bg-white lg:bg-transparent px-3 py-2 text-sm font-medium hover:bg-gray-50 ${n.danger ? 'text-red-600' : 'text-gray-700'}`}
                data-testid={`settings-nav-${n.id}`}>
                <n.icon className="w-4 h-4" />{n.label}
              </a>
            ))}
          </nav>
          <div className="space-y-6 min-w-0">

          <Section id="account" icon={FiUser} title="Account">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.profilePic} />
                <AvatarFallback className="bg-[#32281F] text-white font-semibold">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-black truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}{user?.username ? ` · @${user.username}` : ''}</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100 border-y border-gray-100">
              {[
                { to: '/profile', label: 'Edit profile', icon: FiUser },
                { to: '/notifications', label: 'Notifications', icon: FiBell }
              ].map((l) => (
                <Link key={l.to} to={l.to} className="flex items-center gap-3 py-3 text-sm text-black hover:bg-gray-50 -mx-2 px-2 rounded">
                  <l.icon className="w-4 h-4 text-gray-500" /><span className="flex-1">{l.label}</span><FiChevronRight className="text-gray-400" />
                </Link>
              ))}
            </div>
          </Section>

          {showPages && <Section id="pages" icon={FiGrid} title="Company pages">
            {pages.length ? (
              <div className="divide-y divide-gray-100 border-y border-gray-100">
                {pages.map((p) => (
                  <Link key={p._id} to={`/company/${p.slug}/admin?tab=edit`} onClick={() => setActingAs(p._id)} className="flex items-center gap-3 py-3 text-sm text-black hover:bg-gray-50 -mx-2 px-2 rounded">
                    <CompanyLogo page={p} className="w-9 h-9" rounded="rounded-lg" text="text-xs" />
                    <span className="flex-1 min-w-0"><span className="block font-medium truncate">{p.name}</span><span className="block text-xs text-gray-500">{p.role === 'owner' ? 'Owner' : 'Admin'} · Page settings</span></span>
                    <FiChevronRight className="text-gray-400" />
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">You don't manage any company pages yet.</p>}
            {user?.role !== 'student' && <Link to="/company/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#32281F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#221A14]" data-testid="settings-create-page">
              <FiPlus className="w-4 h-4" />Create a company page
            </Link>}
          </Section>}

          <Section id="privacy" icon={FiLock} title="Privacy">
            <div className="space-y-4">
              {PRIVACY.map((p) => (
                <div key={p.field} className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor={`privacy-${p.field}`} className="text-sm font-medium text-black">{p.label}</Label>
                    <p className="text-xs text-gray-500">{p.hint}</p>
                  </div>
                  <Switch id={`privacy-${p.field}`} checked={!!user?.[p.field]} onCheckedChange={(v) => togglePrivacy(p.field, v)} />
                </div>
              ))}
              <p className="text-xs text-gray-400">Your résumé is always private.</p>
            </div>
          </Section>

          <Section id="jobs" icon={FiBriefcase} title="Jobs">
            <p className="text-sm font-medium text-black">How "Jobs for you" looks</p>
            <p className="text-xs text-gray-500 mb-3">Swipe through one job at a time, or see them all in a list like All jobs.</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jobs for you view">
              {[
                { value: 'swipe', label: 'Swipe cards', hint: 'Right to apply, left to pass' },
                { value: 'list', label: 'List', hint: 'Scroll and open any job' }
              ].map((o) => {
                const active = (user?.jobsView === 'list' ? 'list' : 'swipe') === o.value;
                return (
                  <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => setJobsView(o.value)}
                    data-testid={`jobs-view-${o.value}`}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-[#32281F] bg-[#32281F] text-white' : 'border-gray-200 bg-white text-black hover:border-gray-300'}`}>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className={`block text-xs ${active ? 'text-white/70' : 'text-gray-500'}`}>{o.hint}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section id="blocked" icon={FiSlash} title="Blocked people">
            {blocked === null ? (
              <SkeletonRows rows={2} className="-mx-4" />
            ) : blocked.length === 0 ? (
              <p className="text-sm text-gray-500">You haven't blocked anyone. You can block someone from their profile or a chat.</p>
            ) : (
              <div className="space-y-2" data-testid="blocked-list">
                {blocked.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={p.profilePic} />
                      <AvatarFallback className="bg-gray-200 text-sm">{p.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 min-w-0 text-sm font-medium text-black truncate">{p.name}</span>
                    <Button size="sm" variant="outline" onClick={() => unblock(p)}>Unblock</Button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section id="signout" icon={FiLogOut} title="Sign out">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Log out</Button>
              <Button variant="outline" onClick={signOutEverywhere}>Log out from all devices</Button>
            </div>
          </Section>

          <Section id="close" icon={FiPauseCircle} title="Close account" tone="danger">
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Deactivate account</p>
                  <p className="text-xs text-gray-500">Hide your profile and sign out everywhere. Sign in again any time to reactivate.</p>
                </div>
                <Button variant="outline" onClick={() => setDeactivateOpen(true)} className="shrink-0" data-testid="deactivate-open">Deactivate</Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Delete account</p>
                  <p className="text-xs text-gray-500">Permanently delete your profile, messages, portfolio, listings and connections. This can't be undone.</p>
                </div>
                <Button onClick={() => setDeleteOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shrink-0" data-testid="delete-open">
                  <FiTrash2 className="mr-2" />Delete
                </Button>
              </div>
            </div>
          </Section>
          </div>
          </div>
        </div>
      </div>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Deactivate your account?</DialogTitle></DialogHeader>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Your profile won't appear in search, suggestions or chats.</li>
            <li>You'll be signed out on every device.</li>
            <li>Everything is kept. Sign in again to reactivate.</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button onClick={deactivate} disabled={busy} className="bg-[#32281F] text-white hover:bg-[#221A14]" data-testid="deactivate-confirm">{busy ? 'Deactivating...' : 'Deactivate'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) { setConfirmText(''); setPassword(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-red-700">Delete your account permanently?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Your profile, messages, portfolio, listings, posts and connections will be deleted. This can't be undone.</p>
          {needsPassword && (
            <div className="space-y-1">
              <Label htmlFor="delete-password">Your password</Label>
              <Input id="delete-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" data-testid="delete-confirm-input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={deleteAccount}
              disabled={busy || confirmText !== 'DELETE' || (needsPassword && !password)}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="delete-confirm"
            >
              {busy ? 'Deleting...' : 'Delete forever'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
