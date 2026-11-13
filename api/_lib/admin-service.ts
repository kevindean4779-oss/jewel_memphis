import { randomUUID } from 'node:crypto';
import { safeEqual } from './crypto.js';
import { can, type Permission, type Role } from './rbac.js';
import { pinLookup, pinProblem, randomPin } from './pin.js';
import { resendVerification, type Authed, type Ctx, type Deps, type Result } from './auth-service.js';
import type { UserRow } from './store.js';

// Admin actions. Each one checks a permission first, then the safety rules, and
// writes an audit entry. Admins can't delete or demote themselves, and the last
// active Admin can't be removed (enforced in the database as well).

export function adminView(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    emailVerified: Boolean(u.email_verified_at),
    totpEnabled: u.totp_enabled,
    lastLoginAt: u.last_login_at,
    lockedUntil: u.locked_until,
    createdAt: u.created_at,
    deletedAt: u.deleted_at,
  };
}

const forbidden = (): Result => ({ status: 403, body: { error: 'You do not have permission to do that.' } });
const notFound = (): Result => ({ status: 404, body: { error: 'User not found' } });

function require_(auth: Authed, perm: Permission): Result | null {
  return can(auth.user.role, perm) ? null : forbidden();
}

// Managers can act only on plain Users. Admins can act on anyone.
function canManage(actorRole: Role, target: UserRow): boolean {
  if (actorRole === 'admin') return true;
  return actorRole === 'manager' && target.role === 'user';
}

async function audit(deps: Deps, ctx: Ctx, auth: Authed, action: string, targetId: string | null, details?: Record<string, unknown>) {
  try {
    await deps.store.appendAudit({ actor_id: auth.user.id, action, target_id: targetId, ip: ctx.ip, user_agent: ctx.userAgent, details });
  } catch {
    console.error(`[audit] could not write ${action}`);
  }
}

function lastAdminResult(err: unknown): Result | null {
  return (err as Error).message.includes('last_admin')
    ? { status: 409, body: { error: 'At least one active Admin must remain.' } }
    : null;
}

export async function listUsers(
  deps: Deps,
  auth: Authed,
  q: { search?: string; role?: Role; status?: 'active' | 'invited' | 'suspended' | 'deleted'; sort: 'email' | 'name' | 'role' | 'status' | 'created_at' | 'last_login_at'; dir: 'asc' | 'desc'; page: number; pageSize: number },
): Promise<Result> {
  const denied = require_(auth, 'users:read');
  if (denied) return denied;
  const { rows, total } = await deps.store.listUsers(q);
  return { status: 200, body: { users: rows.map(adminView), total, page: q.page, pageSize: q.pageSize } };
}

export async function getUser(deps: Deps, auth: Authed, id: string): Promise<Result> {
  const denied = require_(auth, 'users:read');
  if (denied) return denied;
  const u = await deps.store.getUserById(id);
  return u ? { status: 200, body: { user: adminView(u) } } : notFound();
}

// A PIN no active account uses. Tries a few random 4-digit PINs.
async function freshPin(deps: Deps): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const pin = randomPin();
    if (!(await deps.store.findUserByPinLookup(pinLookup(pin)))) return pin;
  }
  throw new Error('could not find a free PIN');
}

// Creates a person with a personal PIN, shown once. Email is optional for counter staff.
export async function createAccount(
  deps: Deps,
  ctx: Ctx,
  auth: Authed,
  input: { email?: string; name: string; role: Role },
): Promise<Result> {
  const denied = require_(auth, 'users:invite');
  if (denied) return denied;
  // Only someone allowed to change roles can create an Admin or Manager.
  if (input.role !== 'user' && !can(auth.user.role, 'users:role')) return forbidden();
  if (input.email && (await deps.store.getUserByEmail(input.email))) {
    return { status: 409, body: { error: 'An account with that email already exists.' } };
  }
  const pin = await freshPin(deps);
  const user = await deps.store.createUser({
    email: input.email ?? `no-email-${randomUUID().slice(0, 8)}@no-email.invalid`,
    name: input.name,
    role: input.role,
    status: 'active',
    email_verified_at: new Date().toISOString(),
    pin_lookup: pinLookup(pin),
  });
  await audit(deps, ctx, auth, 'user.create', user.id, { role: input.role });
  return { status: 201, body: { user: adminView(user), pin } };
}

// New PIN for a person, e.g. when they forget it. Shown once.
export async function resetPin(deps: Deps, ctx: Ctx, auth: Authed, targetId: string): Promise<Result> {
  const denied = require_(auth, 'users:reset_password');
  if (denied) return denied;
  const target = await deps.store.getUserById(targetId);
  if (!target) return notFound();
  if (!canManage(auth.user.role, target)) return forbidden();
  if (target.id === auth.user.id) return { status: 400, body: { error: 'Change your own PIN from your account.' } };
  const pin = await freshPin(deps);
  await deps.store.updateUser(target.id, { pin_lookup: pinLookup(pin) });
  // Old sign-ins end, so a lost or shared PIN can't keep working.
  await deps.store.revokeUserSessions(target.id, 'password_reset');
  await audit(deps, ctx, auth, 'user.pin_reset', target.id);
  return { status: 200, body: { pin } };
}

export async function updateUser(
  deps: Deps,
  ctx: Ctx,
  auth: Authed,
  targetId: string,
  patch: { name?: string; email?: string; role?: Role },
): Promise<Result> {
  const denied = require_(auth, 'users:edit');
  if (denied) return denied;
  const target = await deps.store.getUserById(targetId);
  if (!target) return notFound();
  if (!canManage(auth.user.role, target)) return forbidden();

  const changed: string[] = [];
  const fromRole = target.role; // captured before the update, for the audit entry
  if (patch.role && patch.role !== target.role) {
    if (!can(auth.user.role, 'users:role')) return forbidden();
    if (target.id === auth.user.id && patch.role !== 'admin') {
      return { status: 400, body: { error: 'You cannot demote yourself.' } };
    }
    try {
      await deps.store.setUserAccess(auth.user.id, target.id, { role: patch.role });
    } catch (err) {
      const r = lastAdminResult(err);
      if (r) return r;
      throw err;
    }
    await audit(deps, ctx, auth, 'user.role_change', target.id, { from: fromRole, to: patch.role });
    changed.push('role');
  }

  if (patch.email && patch.email !== target.email) {
    const clash = await deps.store.getUserByEmail(patch.email);
    if (clash && clash.id !== target.id) return { status: 409, body: { error: 'An account with that email already exists.' } };
    // A new address must be verified again, and the old sessions end.
    await deps.store.updateUser(target.id, { email: patch.email, email_verified_at: null });
    await deps.store.revokeUserSessions(target.id, 'revoked');
    await resendVerification(deps, ctx, patch.email);
    changed.push('email');
  }

  if (patch.name !== undefined && patch.name !== target.name) {
    await deps.store.updateUser(target.id, { name: patch.name });
    changed.push('name');
  }
  if (changed.length) await audit(deps, ctx, auth, 'user.update', target.id, { fields: changed });

  const fresh = await deps.store.getUserById(target.id);
  return { status: 200, body: { user: adminView(fresh!) } };
}

export async function suspendUser(deps: Deps, ctx: Ctx, auth: Authed, targetId: string): Promise<Result> {
  const denied = require_(auth, 'users:suspend');
  if (denied) return denied;
  if (targetId === auth.user.id) return { status: 400, body: { error: 'You cannot suspend yourself.' } };
  const target = await deps.store.getUserById(targetId);
  if (!target) return notFound();
  if (target.status === 'suspended') return { status: 200, body: { ok: true } };
  try {
    await deps.store.setUserAccess(auth.user.id, target.id, { status: 'suspended' });
  } catch (err) {
    const r = lastAdminResult(err);
    if (r) return r;
    throw err;
  }
  // Ends every session now, so the user's access stops at once.
  await deps.store.revokeUserSessions(target.id, 'suspended');
  await audit(deps, ctx, auth, 'user.suspend', target.id);
  return { status: 200, body: { ok: true } };
}

export async function reactivateUser(deps: Deps, ctx: Ctx, auth: Authed, targetId: string): Promise<Result> {
  const denied = require_(auth, 'users:suspend');
  if (denied) return denied;
  const target = await deps.store.getUserById(targetId);
  if (!target) return notFound();
  if (target.status !== 'suspended') return { status: 400, body: { error: 'This account is not suspended.' } };
  await deps.store.setUserAccess(auth.user.id, target.id, { status: 'active' });
  await audit(deps, ctx, auth, 'user.reactivate', target.id);
  return { status: 200, body: { ok: true } };
}

export async function deleteUser(deps: Deps, ctx: Ctx, auth: Authed, targetId: string): Promise<Result> {
  const denied = require_(auth, 'users:delete');
  if (denied) return denied;
  if (targetId === auth.user.id) return { status: 400, body: { error: 'You cannot delete your own account.' } };
  const target = await deps.store.getUserById(targetId);
  if (!target) return notFound();
  try {
    await deps.store.setUserAccess(auth.user.id, target.id, { delete: true });
  } catch (err) {
    const r = lastAdminResult(err);
    if (r) return r;
    throw err;
  }
  await deps.store.revokeUserSessions(target.id, 'deleted');
  await audit(deps, ctx, auth, 'user.delete', target.id);
  return { status: 200, body: { ok: true } };
}

export async function listAudit(deps: Deps, auth: Authed, page: number, pageSize: number): Promise<Result> {
  const denied = require_(auth, 'audit:read');
  if (denied) return denied;
  const { rows, total } = await deps.store.listAudit(page, pageSize);
  return { status: 200, body: { entries: rows, total, page, pageSize } };
}

// First Admin. Works only when SETUP_TOKEN is set, no active Admin exists, and the
// token matches. Otherwise it answers 404, so it doesn't reveal that it exists.
export async function bootstrapAdmin(
  deps: Deps,
  ctx: Ctx,
  input: { setupToken: string; email: string; name: string; pin: string },
  setupTokenFromEnv: string | undefined,
): Promise<Result> {
  const hidden: Result = { status: 404, body: { error: 'Not found' } };
  if (!setupTokenFromEnv) return hidden;
  if (!safeEqual(input.setupToken, setupTokenFromEnv)) return hidden;
  if ((await deps.store.countActiveAdmins()) > 0) return hidden;
  const problem = pinProblem(input.pin);
  if (problem) return { status: 400, body: { error: problem } };

  const user = await deps.store.createUser({
    email: input.email,
    name: input.name,
    role: 'admin',
    status: 'active',
    email_verified_at: new Date().toISOString(),
    pin_lookup: pinLookup(input.pin),
  });
  await deps.store.appendAudit({ actor_id: null, action: 'admin.bootstrap', target_id: user.id, ip: ctx.ip, user_agent: ctx.userAgent });
  return { status: 201, body: { ok: true } };
}
