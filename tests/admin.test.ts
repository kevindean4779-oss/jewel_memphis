import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as svc from '../api/_lib/auth-service';
import { routeAdmin } from '../api/_lib/admin-routes';
import { hashPassword } from '../api/_lib/passwords';
import { MemoryStore, makeUser } from './fakes/memory-store';

const PASSWORD = 'correct horse battery';
const APP = 'https://example.test';
const SETUP = randomBytes(24).toString('base64url');
const IP = '203.0.113.50';
const UA = 'vitest-admin';

class FakeMailer {
  sent: { to: string; text: string }[] = [];
  async send(to: string, _subject: string, text: string) {
    this.sent.push({ to, text });
  }
}

let store: MemoryStore;
let mailer: FakeMailer;
let now: number;
const deps = () => ({ store, mailer, appUrl: APP, now: () => new Date(now) });

beforeAll(() => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.TOTP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  process.env.APP_URL = APP;
});

beforeEach(() => {
  store = new MemoryStore();
  mailer = new FakeMailer();
  now = Date.parse('2026-11-11T12:00:00Z');
  store.clock = () => now;
});

// ── Test helpers ─────────────────────────────────────────────────────────

interface Reply { status: number; body: any; headers: Record<string, string> }

async function call(method: string, path: string, opts: { token?: string | null; body?: unknown; query?: Record<string, string>; origin?: boolean; setup?: string } = {}): Promise<Reply> {
  const reply: Reply = { status: 0, body: undefined, headers: {} };
  const headers: Record<string, string> = { 'user-agent': UA, 'x-forwarded-for': IP };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.origin !== false && method !== 'GET') {
    headers.origin = APP;
    headers['x-requested-with'] = 'app';
  }
  const req = {
    method,
    headers,
    query: { ...(opts.query ?? {}), path: path.split('/').filter(Boolean) },
    body: opts.body,
    socket: { remoteAddress: IP },
  } as unknown as VercelRequest;
  const res = {
    setHeader: (k: string, v: string) => { reply.headers[k] = v; },
    status(c: number) { reply.status = c; return this; },
    json(b: unknown) { reply.body = b; return this; },
    end() { return this; },
  } as unknown as VercelResponse;
  await routeAdmin(req, res, deps(), opts.setup);
  return reply;
}

async function account(email: string, role: 'admin' | 'manager' | 'user', status: 'active' | 'suspended' = 'active') {
  const u = await makeUser(store, { email, role, status, name: email.split('@')[0] });
  await store.updateUser(u.id, { password_hash: await hashPassword(PASSWORD) });
  return (await store.getUserById(u.id))!;
}

const ctx = () => ({ ip: IP, userAgent: UA });

async function tokenFor(email: string): Promise<string> {
  const r = await svc.login(deps(), { ip: IP, userAgent: UA }, { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status}`);
  return (r.body as { accessToken: string }).accessToken;
}

async function setup() {
  const admin = await account('owner@example.com', 'admin');
  const manager = await account('manager@example.com', 'manager');
  const staff = await account('staff@example.com', 'user');
  return {
    admin, manager, staff,
    adminToken: await tokenFor('owner@example.com'),
    managerToken: await tokenFor('manager@example.com'),
    staffToken: await tokenFor('staff@example.com'),
  };
}

// ── Access control on the API ────────────────────────────────────────────

describe('admin API is closed to everyone who is not allowed in', () => {
  it('refuses requests with no sign-in', async () => {
    expect((await call('GET', 'users')).status).toBe(401);
    expect((await call('POST', 'users', { body: { email: 'x@example.com', name: 'X' } })).status).toBe(401);
  });

  it('refuses a plain User on every admin route, even with a direct call', async () => {
    const s = await setup();
    const u = s.staff.id;
    expect((await call('GET', 'users', { token: s.staffToken })).status).toBe(403);
    expect((await call('GET', `users/${u}`, { token: s.staffToken })).status).toBe(403);
    expect((await call('POST', `users/${u}/suspend`, { token: s.staffToken })).status).toBe(403);
    expect((await call('DELETE', `users/${u}`, { token: s.staffToken })).status).toBe(403);
    expect((await call('GET', 'audit', { token: s.staffToken })).status).toBe(403);
  });

  it('refuses a forged or tampered token', async () => {
    const s = await setup();
    expect((await call('GET', 'users', { token: s.adminToken.slice(0, -3) + 'abc' })).status).toBe(401);
  });

  it('refuses a state-changing request without the app origin and header (CSRF)', async () => {
    const s = await setup();
    expect((await call('POST', 'users', { token: s.adminToken, origin: false, body: { email: 'x@example.com', name: 'X' } })).status).toBe(403);
  });

  it('returns 404 for unknown routes', async () => {
    const s = await setup();
    expect((await call('GET', 'nope', { token: s.adminToken })).status).toBe(404);
  });
});

// ── Manager ──────────────────────────────────────────────────────────────

describe('manager', () => {
  it('can list users and invite plain Users', async () => {
    const s = await setup();
    expect((await call('GET', 'users', { token: s.managerToken })).status).toBe(200);
    const invite = await call('POST', 'users', { token: s.managerToken, body: { email: 'new@example.com', name: 'New', role: 'user' } });
    expect(invite.status).toBe(201);
  });

  it('cannot invite a manager or admin', async () => {
    const s = await setup();
    expect((await call('POST', 'users', { token: s.managerToken, body: { email: 'boss@example.com', name: 'Boss', role: 'admin' } })).status).toBe(403);
  });

  it('cannot suspend, delete or change roles, and cannot touch an Admin', async () => {
    const s = await setup();
    expect((await call('POST', `users/${s.staff.id}/suspend`, { token: s.managerToken })).status).toBe(403);
    expect((await call('DELETE', `users/${s.staff.id}`, { token: s.managerToken })).status).toBe(403);
    expect((await call('PATCH', `users/${s.staff.id}`, { token: s.managerToken, body: { role: 'manager' } })).status).toBe(403);
    expect((await call('PATCH', `users/${s.admin.id}`, { token: s.managerToken, body: { name: 'x' } })).status).toBe(403);
  });
});

// ── Admin: users ─────────────────────────────────────────────────────────

describe('admin: listing users', () => {
  beforeEach(async () => {
    await account('anna@example.com', 'user');
    await account('ben@example.com', 'manager');
    await account('carla@example.com', 'user', 'suspended');
  });

  it('paginates', async () => {
    const s = await setup();
    const r = await call('GET', 'users', { token: s.adminToken, query: { page: '1', pageSize: '2' } });
    expect(r.body.users).toHaveLength(2);
    expect(r.body.total).toBe(6);
    expect((await call('GET', 'users', { token: s.adminToken, query: { page: '3', pageSize: '2' } })).body.users).toHaveLength(2);
  });

  it('searches by email and name, and filters by role and status', async () => {
    const s = await setup();
    const byEmail = await call('GET', 'users', { token: s.adminToken, query: { search: 'carla' } });
    expect(byEmail.body.users.map((u: any) => u.email)).toEqual(['carla@example.com']);
    const managers = await call('GET', 'users', { token: s.adminToken, query: { role: 'manager' } });
    expect(managers.body.users.every((u: any) => u.role === 'manager')).toBe(true);
    const suspended = await call('GET', 'users', { token: s.adminToken, query: { status: 'suspended' } });
    expect(suspended.body.users.map((u: any) => u.email)).toEqual(['carla@example.com']);
  });

  it('sorts by the chosen column', async () => {
    const s = await setup();
    const r = await call('GET', 'users', { token: s.adminToken, query: { sort: 'email', dir: 'asc' } });
    const emails = r.body.users.map((u: any) => u.email);
    expect(emails).toEqual([...emails].sort());
  });

  it('never returns password or 2FA secret fields', async () => {
    const s = await setup();
    const r = await call('GET', 'users', { token: s.adminToken });
    const text = JSON.stringify(r.body);
    expect(text).not.toContain('password');
    expect(text).not.toContain('totpSecret');
    expect(text).not.toContain('$argon2');
    expect(text).not.toContain('secret');
  });

  it('rejects an unknown sort column', async () => {
    const s = await setup();
    expect((await call('GET', 'users', { token: s.adminToken, query: { sort: 'password_hash' } })).status).toBe(400);
  });
});

describe('admin: invite, edit and role changes', () => {
  it('creates an account with a temporary password and records it in the audit log', async () => {
    const s = await setup();
    const r = await call('POST', 'users', { token: s.adminToken, body: { email: 'New.Person@Example.com', name: 'New', role: 'manager' } });
    expect(r.status).toBe(201);
    expect(r.body.user.email).toBe('new.person@example.com');
    expect(r.body.user.status).toBe('active');
    expect(typeof r.body.temporaryPassword).toBe('string');
    expect(r.body.temporaryPassword.length).toBeGreaterThanOrEqual(12);
    expect(mailer.sent.length).toBe(0); // no email needed
    expect(store.audit.find(a => a.action === 'user.create')).toMatchObject({ actor_id: s.admin.id, ip: IP, user_agent: UA });
  });

  it('the new person must change the temporary password before using the app', async () => {
    const s = await setup();
    const r = await call('POST', 'users', { token: s.adminToken, body: { email: 'temp@example.com', name: 'Temp', role: 'user' } });
    const login = await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'temp@example.com', password: r.body.temporaryPassword });
    expect(login.status).toBe(200);
    const token = (login.body as { accessToken: string }).accessToken;
    expect((login.body as { user: { mustChangePassword: boolean } }).user.mustChangePassword).toBe(true);
    // Orders and admin routes refuse the account until it changes the password.
    expect(await svc.authenticate(deps(), token)).toBeNull();
    expect(await svc.authenticate(deps(), token, true)).not.toBeNull();
    const change = await svc.changePassword(deps(), { ip: IP, userAgent: UA }, (await svc.authenticate(deps(), token, true))!, { currentPassword: r.body.temporaryPassword, newPassword: 'my own passphrase' });
    expect(change.status).toBe(200);
    expect(await svc.authenticate(deps(), token)).not.toBeNull();
  });

  it('a wrong current password does not change anything', async () => {
    const s = await setup();
    const r = await call('POST', 'users', { token: s.adminToken, body: { email: 'temp2@example.com', name: 'T', role: 'user' } });
    const login = await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'temp2@example.com', password: r.body.temporaryPassword });
    const auth = await svc.authenticate(deps(), (login.body as { accessToken: string }).accessToken, true);
    expect((await svc.changePassword(deps(), ctx(), auth!, { currentPassword: 'not the temp one', newPassword: 'my own passphrase' })).status).toBe(400);
    expect(store.users.find(u => u.email === 'temp2@example.com')!.must_change_password).toBe(true);
  });

  it('an Admin can reset a staff password, which signs them out and forces a change', async () => {
    const s = await setup();
    const userToken = await tokenFor('staff@example.com');
    const r = await call('POST', `users/${s.staff.id}/reset-password`, { token: s.adminToken });
    expect(r.status).toBe(200);
    expect(await svc.authenticate(deps(), userToken)).toBeNull();
    const login = await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'staff@example.com', password: r.body.temporaryPassword });
    expect(login.status).toBe(200);
    expect(store.audit.find(a => a.action === 'user.password_reset')).toMatchObject({ target_id: s.staff.id });
    expect(JSON.stringify(store.audit)).not.toContain(r.body.temporaryPassword);
  });

  it('a manager can reset a User password but not an Admin or Manager', async () => {
    const s = await setup();
    const other = await account('mgr2@example.com', 'manager');
    expect((await call('POST', `users/${s.staff.id}/reset-password`, { token: s.managerToken })).status).toBe(200);
    expect((await call('POST', `users/${s.admin.id}/reset-password`, { token: s.managerToken })).status).toBe(403);
    expect((await call('POST', `users/${other.id}/reset-password`, { token: s.managerToken })).status).toBe(403);
  });

  it('an Admin cannot reset their own password through the admin route', async () => {
    const s = await setup();
    expect((await call('POST', `users/${s.admin.id}/reset-password`, { token: s.adminToken })).status).toBe(400);
  });

  it('a manager cannot create an Admin or Manager account', async () => {
    const s = await setup();
    expect((await call('POST', 'users', { token: s.managerToken, body: { email: 'boss2@example.com', name: 'B', role: 'manager' } })).status).toBe(403);
    expect((await call('POST', 'users', { token: s.managerToken, body: { email: 'staff2@example.com', name: 'S', role: 'user' } })).status).toBe(201);
  });

  it('rejects an email already in use', async () => {
    const s = await setup();
    expect((await call('POST', 'users', { token: s.adminToken, body: { email: 'staff@example.com', name: 'Dup', role: 'user' } })).status).toBe(409);
  });

  it('changes a role, and the change applies to the next request', async () => {
    const s = await setup();
    const r = await call('PATCH', `users/${s.staff.id}`, { token: s.adminToken, body: { role: 'manager' } });
    expect(r.status).toBe(200);
    expect(r.body.user.role).toBe('manager');
    expect(store.audit.find(a => a.action === 'user.role_change')!.details).toEqual({ from: 'user', to: 'manager' });
    // The same token now carries the manager role: it can list users but not change roles.
    expect((await call('GET', 'users', { token: s.staffToken })).status).toBe(200);
    expect((await call('PATCH', `users/${s.admin.id}`, { token: s.staffToken, body: { name: 'x' } })).status).toBe(403);
  });

  it('a changed email must be verified again and ends existing sessions', async () => {
    const s = await setup();
    const r = await call('PATCH', `users/${s.staff.id}`, { token: s.adminToken, body: { email: 'moved@example.com' } });
    expect(r.status).toBe(200);
    expect(r.body.user.emailVerified).toBe(false);
    expect((await call('GET', 'users', { token: s.staffToken })).status).toBe(401);
    expect(mailer.sent.some(m => m.to === 'moved@example.com')).toBe(true);
  });

  it('rejects an empty update', async () => {
    const s = await setup();
    expect((await call('PATCH', `users/${s.staff.id}`, { token: s.adminToken, body: {} })).status).toBe(400);
  });
});

describe('admin: suspend, reactivate and delete', () => {
  it('suspending ends the user\'s sessions at once', async () => {
    const s = await setup();
    const userToken = await tokenFor('staff@example.com');
    expect((await call('GET', 'users', { token: userToken })).status).toBe(403); // signed in, but not an admin
    expect((await call('POST', `users/${s.staff.id}/suspend`, { token: s.adminToken })).status).toBe(200);
    expect(await svc.authenticate(deps(), userToken)).toBeNull();
    expect((await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'staff@example.com', password: PASSWORD })).status).toBe(401);
  });

  it('reactivating lets the user sign in again', async () => {
    const s = await setup();
    await call('POST', `users/${s.staff.id}/suspend`, { token: s.adminToken });
    expect((await call('POST', `users/${s.staff.id}/reactivate`, { token: s.adminToken })).status).toBe(200);
    expect((await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'staff@example.com', password: PASSWORD })).status).toBe(200);
  });

  it('deleting hides the account and blocks its sign-in and tokens', async () => {
    const s = await setup();
    const userToken = await tokenFor('staff@example.com');
    expect((await call('DELETE', `users/${s.staff.id}`, { token: s.adminToken })).status).toBe(200);
    expect(await svc.authenticate(deps(), userToken)).toBeNull();
    expect((await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'staff@example.com', password: PASSWORD })).status).toBe(401);
    const list = await call('GET', 'users', { token: s.adminToken, query: { search: 'staff' } });
    expect(list.body.users).toHaveLength(0);
    expect(store.users.find(u => u.id === s.staff.id)!.deleted_at).not.toBeNull(); // kept for the audit trail
  });
});

// ── Guardrails ───────────────────────────────────────────────────────────

describe('admin safety rules', () => {
  it('an Admin cannot delete themselves', async () => {
    const s = await setup();
    const r = await call('DELETE', `users/${s.admin.id}`, { token: s.adminToken });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/own account/);
  });

  it('an Admin cannot demote themselves', async () => {
    const s = await setup();
    const other = await account('second@example.com', 'admin');
    expect(other.role).toBe('admin');
    expect((await call('PATCH', `users/${s.admin.id}`, { token: s.adminToken, body: { role: 'user' } })).status).toBe(400);
  });

  it('an Admin cannot suspend themselves', async () => {
    const s = await setup();
    expect((await call('POST', `users/${s.admin.id}/suspend`, { token: s.adminToken })).status).toBe(400);
  });

  it('the last active Admin cannot be demoted, suspended or deleted', async () => {
    // Use a second Admin to try to remove the first, who is the only other one.
    const first = await account('first@example.com', 'admin');
    const second = await account('second@example.com', 'admin');
    const token = await tokenFor('second@example.com');
    // Now second is the only other Admin. Removing first leaves second, so that's allowed once.
    expect((await call('PATCH', `users/${first.id}`, { token, body: { role: 'user' } })).status).toBe(200);
    // Second is now the only active Admin. Nobody can remove them.
    const third = await account('third@example.com', 'manager');
    expect(third.role).toBe('manager');
    const r1 = await call('PATCH', `users/${second.id}`, { token, body: { role: 'user' } });
    const r2 = await call('POST', `users/${second.id}/suspend`, { token });
    expect(r1.status).toBe(400); // self-demotion is refused first
    expect(r2.status).toBe(400);
    const adminsLeft = store.users.filter(u => u.role === 'admin' && u.status === 'active' && !u.deleted_at);
    expect(adminsLeft.map(u => u.id)).toEqual([second.id]);
  });

  it('the database guard refuses to remove the only active Admin, even outside the API', async () => {
    const only = await account('only@example.com', 'admin');
    await expect(store.setUserAccess(only.id, only.id, { role: 'user' })).rejects.toThrow(/last_admin/);
    await expect(store.setUserAccess(only.id, only.id, { status: 'suspended' })).rejects.toThrow(/last_admin/);
    await expect(store.setUserAccess(only.id, only.id, { delete: true })).rejects.toThrow(/last_admin/);
    expect(store.users.find(u => u.id === only.id)!.role).toBe('admin');
  });

  it('after one Admin demotes another, the remaining Admin is protected', async () => {
    const a = await account('a@example.com', 'admin');
    const b = await account('b@example.com', 'admin');
    const tokenA = await tokenFor('a@example.com');
    const tokenB = await tokenFor('b@example.com');
    expect((await call('PATCH', `users/${b.id}`, { token: tokenA, body: { role: 'user' } })).status).toBe(200);
    // B is now a plain User, so the request is refused on role grounds.
    expect((await call('PATCH', `users/${a.id}`, { token: tokenB, body: { role: 'user' } })).status).toBe(403);
    expect(store.users.find(u => u.id === a.id)!.role).toBe('admin');
  });
});

// ── Audit log ────────────────────────────────────────────────────────────

describe('audit log', () => {
  it('records actor, action, target, time context for each admin action', async () => {
    const s = await setup();
    await call('POST', `users/${s.staff.id}/suspend`, { token: s.adminToken });
    const entry = store.audit.find(a => a.action === 'user.suspend')!;
    expect(entry).toMatchObject({ actor_id: s.admin.id, target_id: s.staff.id, ip: IP, user_agent: UA });
  });

  it('is readable by Admins only', async () => {
    const s = await setup();
    await call('POST', `users/${s.staff.id}/suspend`, { token: s.adminToken });
    const r = await call('GET', 'audit', { token: s.adminToken });
    expect(r.status).toBe(200);
    expect(r.body.entries.some((e: any) => e.action === 'user.suspend')).toBe(true);
    expect((await call('GET', 'audit', { token: s.managerToken })).status).toBe(403);
  });

  it('never stores passwords or tokens in details', async () => {
    const s = await setup();
    await call('POST', 'users', { token: s.adminToken, body: { email: 'pw@example.com', name: 'Pw', role: 'user' } });
    expect(JSON.stringify(store.audit)).not.toMatch(/password|token|\$argon2/i);
  });
});

// ── First Admin setup ────────────────────────────────────────────────────

describe('first admin setup', () => {
  const body = { setupToken: SETUP, email: 'owner@example.com', name: 'Owner', password: PASSWORD };

  it('is hidden unless SETUP_TOKEN is set', async () => {
    expect((await call('POST', 'bootstrap', { body })).status).toBe(404);
  });

  it('is hidden for a wrong setup token', async () => {
    expect((await call('POST', 'bootstrap', { body: { ...body, setupToken: 'wrong-wrong-wrong-wrong-wrong' }, setup: SETUP })).status).toBe(404);
  });

  it('creates the first Admin with the right token, then shuts itself off', async () => {
    const first = await call('POST', 'bootstrap', { body, setup: SETUP });
    expect(first.status).toBe(201);
    const admin = store.users.find(u => u.email === 'owner@example.com')!;
    expect(admin.role).toBe('admin');
    expect(admin.status).toBe('active');
    const second = await call('POST', 'bootstrap', { body: { ...body, email: 'other@example.com' }, setup: SETUP });
    expect(second.status).toBe(404);
  });

  it('can sign in afterwards', async () => {
    await call('POST', 'bootstrap', { body, setup: SETUP });
    expect((await svc.login(deps(), { ip: IP, userAgent: UA }, { email: 'owner@example.com', password: PASSWORD })).status).toBe(200);
  });
});

// Keep the reference to the setup token used above.
export { SETUP };
