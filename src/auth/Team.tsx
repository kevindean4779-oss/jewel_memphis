import { useEffect, useState } from 'react';
import { ApiError, authed, session } from './client';

// Staff and Admin dashboard. Every control is also enforced on the server; hiding a
// button is only a convenience.

type Role = 'admin' | 'manager' | 'user';
interface UserRow { id: string; email: string; name: string; role: Role; status: string; emailVerified: boolean; totpEnabled: boolean; lastLoginAt: string | null; lockedUntil: string | null; createdAt: string }
interface AuditRow { id: number; occurred_at: string; action: string; actor_id: string | null; target_id: string | null; ip: string | null; details: Record<string, unknown> }

const PAGE = 25;

export function TeamModal({ onClose }: { onClose: () => void }) {
  const me = session.user!;
  const isAdmin = me.role === 'admin';
  const [tab, setTab] = useState<'users' | 'audit'>('users');
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ maxWidth: 820, maxHeight: '92vh', overflow: 'auto' }}>
        <div className="sec">Team <span className="hint">{me.role}</span></div>
        <div className="seg">
          <button className={`chip ${tab === 'users' ? 'on' : ''}`} onClick={() => setTab('users')}>Users</button>
          {isAdmin && <button className={`chip ${tab === 'audit' ? 'on' : ''}`} onClick={() => setTab('audit')}>Audit log</button>}
        </div>
        {err && <div className="note bad">{err}</div>}
        {notice && <div className="note ok">{notice}</div>}
        {tab === 'users'
          ? <Users isAdmin={isAdmin} myId={me.id} onError={setErr} onNotice={setNotice} />
          : <Audit />}
        <div className="actions"><span /><button className="btn dark" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function Users({ isAdmin, myId, onError, onNotice }: { isAdmin: boolean; myId: string; onError: (m: string | null) => void; onNotice: (m: string | null) => void }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [invite, setInvite] = useState({ email: '', name: '', role: 'user' as Role });
  const [issued, setIssued] = useState<{ who: string; password: string } | null>(null);

  const load = async () => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE), sort, dir });
    if (search) qs.set('search', search);
    if (role) qs.set('role', role);
    if (status) qs.set('status', status);
    try {
      const r = await authed<{ users: UserRow[]; total: number }>(`/api/admin/users?${qs}`);
      setRows(r.users);
      setTotal(r.total);
    } catch (e) { onError((e as Error).message); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, sort, dir, role, status]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    onError(null);
    try { await fn(); onNotice(done); await load(); }
    catch (e) { onError(e instanceof ApiError ? e.message : 'Something went wrong.'); }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <div className="fields" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
        <label className="field"><span>Search</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); void load(); } }} placeholder="Name or email" /></label>
        <label className="field"><span>Role</span>
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">All</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option></select></label>
        <label className="field"><span>Status</span>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Suspended</option></select></label>
      </div>
      <div className="actions">
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><span>Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="created_at">Created</option><option value="email">Email</option><option value="name">Name</option><option value="role">Role</option><option value="status">Status</option><option value="last_login_at">Last sign-in</option>
          </select></label>
        <button className="chip" onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}>{dir === 'asc' ? 'Ascending' : 'Descending'}</button>
        <button className="btn" onClick={() => { setPage(1); void load(); }}>Apply</button>
      </div>

      {rows.map(u => (
        <div className="kv" key={u.id} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            <b style={{ color: 'var(--ink)' }}>{u.name || u.email}</b> · {u.email}
            <br /><small>{u.role} · {u.status}{u.emailVerified ? '' : ' · email not verified'}{u.totpEnabled ? ' · 2FA on' : ''}{u.lockedUntil && new Date(u.lockedUntil) > new Date() ? ' · locked' : ''}</small>
          </span>
          {u.id !== myId && (
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && (
                <select value={u.role} onChange={e => act(() => authed(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) }), 'Role updated.')}>
                  <option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option>
                </select>
              )}
              <button className="btn" onClick={() => act(async () => {
                const r = await authed<{ temporaryPassword: string }>(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
                setIssued({ who: u.email, password: r.temporaryPassword });
              }, 'Password reset. They are signed out.')}>Reset password</button>
              {isAdmin && (u.status === 'suspended'
                ? <button className="btn" onClick={() => act(() => authed(`/api/admin/users/${u.id}/reactivate`, { method: 'POST' }), 'Account reactivated.')}>Reactivate</button>
                : <button className="btn" onClick={() => act(() => authed(`/api/admin/users/${u.id}/suspend`, { method: 'POST' }), 'Account suspended.')}>Suspend</button>)}
              {isAdmin && <button className="btn" onClick={() => { if (confirm(`Delete ${u.email}? They will lose access.`)) act(() => authed(`/api/admin/users/${u.id}`, { method: 'DELETE' }), 'Account deleted.'); }}>Delete</button>}
            </span>
          )}
        </div>
      ))}
      {rows.length === 0 && <p className="muted">No users match.</p>}

      <div className="actions">
        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="faint">Page {page} of {pages} · {total} users</span>
        <button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {issued && (
        <div className="note ok">
          <b>Temporary password for {issued.who}:</b> <code style={{ fontSize: 16 }}>{issued.password}</code>
          <br /><small>Give it to them now. It won't be shown again. They choose their own password at first sign-in.</small>
          <div className="actions"><button className="btn" onClick={() => navigator.clipboard?.writeText(issued.password)}>Copy</button><button className="btn" onClick={() => setIssued(null)}>Done</button></div>
        </div>
      )}

      <div className="sec">Add a staff account</div>
      <div className="fields">
        <label className="field"><span>Email</span><input type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} /></label>
        <label className="field"><span>Name</span><input value={invite.name} onChange={e => setInvite({ ...invite, name: e.target.value })} /></label>
        <label className="field"><span>Role</span>
          <select value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value as Role })}>
            {isAdmin && <option value="admin">Admin</option>}{isAdmin && <option value="manager">Manager</option>}<option value="user">User</option>
          </select></label>
      </div>
      <button className="btn primary" disabled={!invite.email || !invite.name} onClick={() => act(async () => {
        const r = await authed<{ temporaryPassword: string }>('/api/admin/users', { method: 'POST', body: JSON.stringify(invite) });
        setIssued({ who: invite.email, password: r.temporaryPassword });
        setInvite({ email: '', name: '', role: 'user' });
      }, 'Account created.')}>Create account</button>
    </>
  );
}

function Audit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    authed<{ entries: AuditRow[] }>('/api/admin/audit?pageSize=50').then(r => setRows(r.entries)).catch(e => setErr((e as Error).message));
  }, []);
  if (err) return <div className="note bad">{err}</div>;
  return (
    <>
      <p className="muted">Admin actions and sign-in events. This log is append-only and can't be edited.</p>
      {rows.map(a => (
        <div className="kv" key={a.id}>
          <span><b style={{ color: 'var(--ink)' }}>{a.action}</b><br /><small>{new Date(a.occurred_at).toLocaleString()} · {a.ip ?? 'no IP'}</small></span>
        </div>
      ))}
    </>
  );
}
