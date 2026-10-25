import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { FiCheck, FiX, FiUserPlus } from 'react-icons/fi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { API_URL } from '../../config/api';

const Person = ({ person, children }) => (
  <li className="flex items-center gap-3 py-3">
    <Link to={`/profile/${person.username}`} className="flex min-w-0 flex-1 items-center gap-3">
      {person.profilePic
        ? <img src={person.profilePic} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F2EFEC] font-semibold">{person.name?.[0]}</span>}
      <span className="min-w-0">
        <span className="block truncate font-medium text-[#32281F] hover:underline">{person.name}</span>
        {person.headline && <span className="block truncate text-sm pf-muted">{person.headline}</span>}
      </span>
    </Link>
    <span className="flex shrink-0 items-center gap-2">{children}</span>
  </li>
);

/**
 * A company page's own connections (admins): requests to answer, the page's
 * connections, and invitations it sent. Separate from the admins' personal networks.
 */
const PageConnections = ({ page }) => {
  const [data, setData] = useState(null);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setData((await axios.get(`${API_URL}/api/companies/${page._id}/connections`)).data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load the connections');
    }
  }, [page._id]);
  useEffect(() => { load(); }, [load]);

  const act = async (person, method, done) => {
    setBusy(person._id);
    try {
      await axios({ method, url: `${API_URL}/api/companies/${page._id}/connections/${person._id}` });
      if (done) toast.success(done);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update');
    } finally {
      setBusy('');
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    const name = username.trim().replace(/^@/, '').toLowerCase();
    if (!name) return;
    try {
      const res = await axios.get(`${API_URL}/api/profile/public/${encodeURIComponent(name)}`);
      const person = res.data.user;
      await act({ _id: person._id }, 'post', `Invitation sent to ${person.name}`);
      setUsername('');
    } catch (error) {
      toast.error(error.response?.status === 404 ? 'No member with that username' : error.response?.data?.error || 'Could not send the invitation');
    }
  };

  if (!data) return <div className="pf-card p-8 text-center pf-muted">Loading connections…</div>;

  return (
    <div className="space-y-6" data-testid="page-connections">
      <div className="pf-card p-5 sm:p-8">
        <h2 className="pf-serif text-xl font-semibold text-[#32281F]">Requests{data.requests.length ? ` (${data.requests.length})` : ''}</h2>
        <p className="text-sm pf-muted">People who asked to connect with {page.name}.</p>
        {data.requests.length ? (
          <ul className="mt-2 divide-y divide-[#E6E1DB]">
            {data.requests.map((r) => (
              <Person key={r.person._id} person={r.person}>
                <Button size="sm" disabled={busy === r.person._id} onClick={() => act(r.person, 'post', `Connected with ${r.person.name}`)} className="bg-[#32281F] text-white hover:bg-[#221A14]" data-testid="page-request-accept"><FiCheck className="mr-1" />Accept</Button>
                <Button size="sm" variant="outline" disabled={busy === r.person._id} onClick={() => act(r.person, 'delete')} data-testid="page-request-decline"><FiX className="mr-1" />Decline</Button>
              </Person>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm pf-muted">No requests right now.</p>}
      </div>

      <div className="pf-card p-5 sm:p-8">
        <h2 className="pf-serif text-xl font-semibold text-[#32281F]">Connections{data.connections.length ? ` (${data.connections.length})` : ''}</h2>
        <p className="text-sm pf-muted">The page's own network. Your personal connections aren't included and don't change.</p>
        {data.connections.length ? (
          <ul className="mt-2 divide-y divide-[#E6E1DB]">
            {data.connections.map((c) => (
              <Person key={c.person._id} person={c.person}>
                <button type="button" disabled={busy === c.person._id} onClick={() => window.confirm(`Remove ${c.person.name} from ${page.name}'s connections?`) && act(c.person, 'delete')} className="text-sm text-red-600 hover:underline">Remove</button>
              </Person>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm pf-muted">No connections yet. Invite people below, or use "Connect as {page.name}" on their profiles.</p>}
        <form onSubmit={invite} className="mt-5 flex gap-2">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Invite by BeeBark username, e.g. riya" data-testid="page-invite-username" />
          <Button type="submit" className="shrink-0 bg-[#32281F] text-white hover:bg-[#221A14]" data-testid="page-invite"><FiUserPlus className="mr-1" />Invite</Button>
        </form>
      </div>

      {data.sent.length > 0 && (
        <div className="pf-card p-5 sm:p-8">
          <h2 className="pf-serif text-xl font-semibold text-[#32281F]">Invitations sent ({data.sent.length})</h2>
          <ul className="mt-2 divide-y divide-[#E6E1DB]">
            {data.sent.map((s) => (
              <Person key={s.person._id} person={s.person}>
                <button type="button" disabled={busy === s.person._id} onClick={() => act(s.person, 'delete')} className="text-sm pf-muted hover:text-[#32281F] hover:underline">Withdraw</button>
              </Person>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PageConnections;
