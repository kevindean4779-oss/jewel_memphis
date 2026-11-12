import { randomUUID } from 'node:crypto';
import { decryptSecret, encryptSecret, newBackupCode, normalizeBackupCode, randomToken, safeEqual, sha256 } from './crypto';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';

// otplib returns a result union; only a valid code carries the time step.
function validStep(r: { valid: boolean }): number | null {
  return r.valid && 'timeStep' in r ? (r as { timeStep: number }).timeStep : null;
}

// randomUUID's type is a template literal; store it as a plain string.
const uuid = (): string => randomUUID();
import { LIMITS, RATE, TIMING } from './config';
import { can, type Permission, type Role } from './rbac';
import { checkPassword, burnPasswordTime, hashPassword, passwordProblem } from './passwords';
import { signAccessToken, signMfaToken, verifyAccessToken, verifyMfaToken } from './tokens';
import type { Mailer } from './mailer';
import type { Store, UserRow } from './store';

export interface Deps {
  store: Store;
  mailer: Mailer;
  appUrl: string;
  now?: () => Date;
}

export interface Ctx {
  ip: string | null;
  userAgent: string | null;
}

export interface Result {
  status: number;
  body?: unknown;
  retryAfter?: number;
  /** Set a new refresh cookie, or clear it. */
  refresh?: { value: string } | 'clear';
}

export interface Authed {
  user: UserRow;
  sessionId: string;
}

const GENERIC_LOGIN = 'Invalid email or password';
const RESET_MSG = 'If an account exists for that email, we sent a link.';
const LINK_INVALID = 'This link is invalid or has expired.';

const minutesFromNow = (d: Date, m: number) => new Date(d.getTime() + m * 60_000).toISOString();
const secondsFromNow = (d: Date, s: number) => new Date(d.getTime() + s * 1000).toISOString();

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    emailVerified: Boolean(u.email_verified_at),
    totpEnabled: u.totp_enabled,
    mustChangePassword: u.must_change_password,
  };
}

export function permissionsFor(role: Role): Permission[] {
  return (['orders:use', 'users:read', 'users:invite', 'users:edit', 'users:suspend', 'users:role', 'users:delete', 'audit:read'] as const)
    .filter(p => can(role, p));
}

async function audit(deps: Deps, ctx: Ctx, action: string, actorId: string | null, targetId: string | null, details?: Record<string, unknown>) {
  try {
    await deps.store.appendAudit({ actor_id: actorId, action, target_id: targetId, ip: ctx.ip, user_agent: ctx.userAgent, details });
  } catch {
    // Audit failures must not leak or break the request, but they are reported.
    console.error(`[audit] could not write ${action}`);
  }
}

async function limited(deps: Deps, key: string, cfg: { windowSeconds: number; max: number }): Promise<Result | null> {
  const r = await deps.store.rateLimit(key, cfg.windowSeconds, cfg.max);
  if (r.allowed) return null;
  return { status: 429, body: { error: 'Too many attempts. Try again later.' }, retryAfter: r.retryAfterSeconds };
}

function isLocked(u: UserRow, now: Date): boolean {
  return Boolean(u.locked_until && new Date(u.locked_until) > now);
}

// Records a failed password or 2FA attempt. The fifth failure locks the account for 15 minutes.
async function recordFailure(deps: Deps, user: UserRow, now: Date) {
  const failures = user.failed_attempts + 1;
  if (failures >= LIMITS.lockAfterFailures) {
    await deps.store.updateUser(user.id, { failed_attempts: 0, locked_until: minutesFromNow(now, LIMITS.lockMinutes) });
  } else {
    await deps.store.updateUser(user.id, { failed_attempts: failures });
  }
}

async function issueSession(deps: Deps, ctx: Ctx, user: UserRow, now: Date, familyId = uuid()): Promise<Result> {
  const sessionId = uuid();
  const refresh = randomToken();
  await deps.store.createSession({
    id: sessionId,
    user_id: user.id,
    family_id: familyId,
    refresh_token_hash: sha256(refresh),
    created_at: now.toISOString(),
    last_used_at: now.toISOString(),
    expires_at: secondsFromNow(now, TIMING.refreshTokenSeconds),
    ip: ctx.ip,
    user_agent: ctx.userAgent,
  });
  const accessToken = await signAccessToken(user.id, sessionId, user.role);
  return {
    status: 200,
    body: { accessToken, expiresIn: TIMING.accessTokenSeconds, user: publicUser(user) },
    refresh: { value: refresh },
  };
}

// ── Sign in ──────────────────────────────────────────────────────────────

export async function login(deps: Deps, ctx: Ctx, input: { email: string; password: string }): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const limit = (await limited(deps, `login:ip:${ctx.ip}`, RATE.loginPerIp)) ?? (await limited(deps, `login:email:${input.email}`, RATE.loginPerEmail));
  if (limit) return limit;

  const user = await deps.store.getUserByEmail(input.email);
  if (!user || !user.password_hash) {
    await burnPasswordTime(input.password);
    return { status: 401, body: { error: GENERIC_LOGIN } };
  }
  // A locked account is refused without checking the password, so guesses don't count.
  if (isLocked(user, now)) {
    await burnPasswordTime(input.password);
    await audit(deps, ctx, 'auth.login_locked', user.id, user.id);
    return { status: 401, body: { error: GENERIC_LOGIN } };
  }

  const ok = await checkPassword(user.password_hash, input.password);
  if (!ok) {
    await recordFailure(deps, user, now);
    await audit(deps, ctx, 'auth.login_failed', user.id, user.id);
    return { status: 401, body: { error: GENERIC_LOGIN } };
  }
  if (user.status !== 'active') return { status: 401, body: { error: GENERIC_LOGIN } };
  if (!user.email_verified_at) {
    return { status: 403, body: { error: 'Verify your email before signing in.' } };
  }

  await deps.store.updateUser(user.id, { failed_attempts: 0, locked_until: null, last_login_at: now.toISOString() });

  if (user.totp_enabled) {
    return { status: 202, body: { mfaRequired: true, mfaToken: await signMfaToken(user.id) } };
  }
  await audit(deps, ctx, 'auth.login', user.id, user.id);
  return issueSession(deps, ctx, user, now);
}

export async function loginWithTwoFactor(
  deps: Deps,
  ctx: Ctx,
  input: { mfaToken: string; code?: string; backupCode?: string },
): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const userId = await verifyMfaToken(input.mfaToken);
  if (!userId) return { status: 401, body: { error: 'Sign in again.' } };

  const limit = await limited(deps, `mfa:${userId}`, RATE.mfaPerUser);
  if (limit) return limit;

  const user = await deps.store.getUserById(userId);
  if (!user || user.status !== 'active' || isLocked(user, now)) return { status: 401, body: { error: 'Sign in again.' } };

  let ok = false;
  if (input.code && user.totp_secret_enc) {
    const secret = decryptSecret(user.totp_secret_enc);
    const step = validStep(await verifyTotp({ strategy: 'totp', secret, token: input.code, epochTolerance: 30 }));
    // A code is accepted once: its time step must be newer than the last one used.
    if (step !== null && (user.totp_last_step === null || step > user.totp_last_step)) {
      await deps.store.updateUser(user.id, { totp_last_step: step });
      ok = true;
    }
  } else if (input.backupCode) {
    ok = await deps.store.consumeBackupCode(user.id, sha256(normalizeBackupCode(input.backupCode)));
  }

  if (!ok) {
    await recordFailure(deps, user, now);
    await audit(deps, ctx, 'auth.2fa_failed', user.id, user.id);
    return { status: 401, body: { error: 'That code is not valid.' } };
  }
  await deps.store.updateUser(user.id, { failed_attempts: 0, locked_until: null, last_login_at: now.toISOString() });
  await audit(deps, ctx, 'auth.login', user.id, user.id, { twoFactor: true });
  return issueSession(deps, ctx, user, now);
}

// ── Refresh, rotation and reuse detection ────────────────────────────────

export async function refresh(deps: Deps, ctx: Ctx, refreshValue: string | null): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const clear: Result = { status: 401, body: { error: 'Sign in again.' }, refresh: 'clear' };
  if (!refreshValue) return clear;

  const session = await deps.store.getSessionByHash(sha256(refreshValue));
  if (!session) return clear;

  if (session.revoked_at) {
    // A rotated token was presented again: someone else has the old copy.
    // Revoke every session from this login.
    if (session.revoke_reason === 'rotated') {
      await deps.store.revokeFamily(session.family_id, 'reuse');
      await audit(deps, ctx, 'auth.refresh_reuse', session.user_id, session.user_id);
    }
    return clear;
  }
  if (new Date(session.expires_at) <= now) {
    await deps.store.revokeSessionIfActive(session.id, 'expired');
    return clear;
  }

  const user = await deps.store.getUserById(session.user_id);
  if (!user || user.status !== 'active') {
    await deps.store.revokeSessionIfActive(session.id, 'revoked');
    return clear;
  }

  // Rotate: only the request that revokes the old token gets a new one.
  const claimed = await deps.store.revokeSessionIfActive(session.id, 'rotated');
  if (!claimed) {
    await deps.store.revokeFamily(session.family_id, 'reuse');
    await audit(deps, ctx, 'auth.refresh_reuse', user.id, user.id);
    return clear;
  }
  return issueSession(deps, ctx, user, now, session.family_id);
}

export async function logout(deps: Deps, refreshValue: string | null): Promise<Result> {
  if (refreshValue) {
    const session = await deps.store.getSessionByHash(sha256(refreshValue));
    if (session) await deps.store.revokeSessionIfActive(session.id, 'logout');
  }
  return { status: 200, body: { ok: true }, refresh: 'clear' };
}

// ── Access token check (used by every protected route) ───────────────────

// Protected routes refuse an account that must still change its temporary password.
// Only /me and /change-password accept it (allowPasswordChange).
export async function authenticate(deps: Deps, accessToken: string | null, allowPasswordChange = false): Promise<Authed | null> {
  if (!accessToken) return null;
  const now = deps.now?.() ?? new Date();
  const claims = await verifyAccessToken(accessToken);
  if (!claims) return null;

  // The session is checked on every request, so a revoked session stops working at once.
  const session = await deps.store.getSessionById(claims.sid);
  if (!session || session.revoked_at || session.user_id !== claims.sub || new Date(session.expires_at) <= now) return null;

  const user = await deps.store.getUserById(claims.sub);
  if (!user || user.status !== 'active') return null;
  if (user.must_change_password && !allowPasswordChange) return null;
  return { user, sessionId: session.id }; // role comes from the database, not the token
}

// ── Sessions ─────────────────────────────────────────────────────────────

export async function changePassword(
  deps: Deps,
  ctx: Ctx,
  auth: Authed,
  input: { currentPassword: string; newPassword: string },
): Promise<Result> {
  const u = auth.user;
  const problem = passwordProblem(input.newPassword);
  if (problem) return { status: 400, body: { error: problem } };
  if (!u.password_hash || !(await checkPassword(u.password_hash, input.currentPassword))) {
    return { status: 400, body: { error: 'Current password is not right.' } };
  }
  if (input.currentPassword === input.newPassword) return { status: 400, body: { error: 'Choose a different password.' } };
  await deps.store.updateUser(u.id, { password_hash: await hashPassword(input.newPassword), must_change_password: false, failed_attempts: 0, locked_until: null });
  // Other devices are signed out; this one stays signed in.
  await deps.store.revokeUserSessions(u.id, 'password_reset', auth.sessionId);
  await audit(deps, ctx, 'auth.password_changed', u.id, u.id);
  return { status: 200, body: { ok: true } };
}

export async function me(deps: Deps, auth: Authed): Promise<Result> {
  return { status: 200, body: { user: publicUser(auth.user), permissions: permissionsFor(auth.user.role) } };
}

export async function listSessions(deps: Deps, auth: Authed): Promise<Result> {
  const sessions = await deps.store.listSessions(auth.user.id);
  return {
    status: 200,
    body: {
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.created_at,
        lastUsedAt: s.last_used_at,
        ip: s.ip,
        userAgent: s.user_agent,
        current: s.id === auth.sessionId,
      })),
    },
  };
}

export async function revokeSession(deps: Deps, ctx: Ctx, auth: Authed, sessionId: string): Promise<Result> {
  const session = await deps.store.getSessionById(sessionId);
  if (!session || session.user_id !== auth.user.id) return { status: 404, body: { error: 'Session not found' } };
  await deps.store.revokeSessionIfActive(session.id, 'revoked');
  await audit(deps, ctx, 'auth.session_revoked', auth.user.id, auth.user.id, { sessionId });
  return { status: 200, body: { ok: true }, refresh: session.id === auth.sessionId ? 'clear' : undefined };
}

export async function revokeAllSessions(deps: Deps, ctx: Ctx, auth: Authed): Promise<Result> {
  await deps.store.revokeUserSessions(auth.user.id, 'revoked');
  await audit(deps, ctx, 'auth.sessions_revoked_all', auth.user.id, auth.user.id);
  return { status: 200, body: { ok: true }, refresh: 'clear' };
}

// ── Password reset and email verification ────────────────────────────────

export async function forgotPassword(deps: Deps, ctx: Ctx, email: string): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const limit = (await limited(deps, `reset:ip:${ctx.ip}`, RATE.resetPerIp)) ?? (await limited(deps, `reset:email:${email}`, RATE.resetPerEmail));
  if (limit) return limit;

  const user = await deps.store.getUserByEmail(email);
  if (user && user.status === 'active') {
    await deps.store.invalidateTokens(user.id, 'reset');
    const token = randomToken();
    await deps.store.createToken({
      id: uuid(),
      user_id: user.id,
      type: 'reset',
      token_hash: sha256(token),
      expires_at: secondsFromNow(now, TIMING.resetTokenSeconds),
      created_at: now.toISOString(),
    });
    await sendLink(deps, user.email, 'Reset your password', `${deps.appUrl}/?auth=reset&token=${token}`, 'reset your password');
  }
  // Same answer whether or not the account exists.
  return { status: 202, body: { message: RESET_MSG } };
}

export async function resetPassword(deps: Deps, ctx: Ctx, input: { token: string; password: string }): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const limit = await limited(deps, `verify:ip:${ctx.ip}`, RATE.verifyPerIp);
  if (limit) return limit;
  const problem = passwordProblem(input.password);
  if (problem) return { status: 400, body: { error: problem } };

  const rec = await deps.store.getToken(sha256(input.token), 'reset');
  if (!rec || rec.used_at || new Date(rec.expires_at) <= now) return { status: 400, body: { error: LINK_INVALID } };
  if (!(await deps.store.consumeToken(rec.id))) return { status: 400, body: { error: LINK_INVALID } };

  const user = await deps.store.getUserById(rec.user_id);
  if (!user || user.status !== 'active') return { status: 400, body: { error: LINK_INVALID } };

  await deps.store.updateUser(user.id, {
    password_hash: await hashPassword(input.password),
    failed_attempts: 0,
    locked_until: null,
    email_verified_at: user.email_verified_at ?? now.toISOString(),
  });
  await deps.store.revokeUserSessions(user.id, 'password_reset');
  await audit(deps, ctx, 'auth.password_reset', user.id, user.id);
  return { status: 200, body: { ok: true } };
}

export async function verifyEmail(deps: Deps, ctx: Ctx, token: string): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const limit = await limited(deps, `verify:ip:${ctx.ip}`, RATE.verifyPerIp);
  if (limit) return limit;

  const rec = await deps.store.getToken(sha256(token), 'verify');
  if (!rec || rec.used_at || new Date(rec.expires_at) <= now) return { status: 400, body: { error: LINK_INVALID } };
  if (!(await deps.store.consumeToken(rec.id))) return { status: 400, body: { error: LINK_INVALID } };
  await deps.store.updateUser(rec.user_id, { email_verified_at: now.toISOString() });
  return { status: 200, body: { ok: true } };
}

export async function resendVerification(deps: Deps, ctx: Ctx, email: string): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const limit = await limited(deps, `verify:ip:${ctx.ip}`, RATE.verifyPerIp);
  if (limit) return limit;
  const user = await deps.store.getUserByEmail(email);
  if (user && user.status === 'active' && !user.email_verified_at) {
    await deps.store.invalidateTokens(user.id, 'verify');
    const token = randomToken();
    await deps.store.createToken({
      id: uuid(),
      user_id: user.id,
      type: 'verify',
      token_hash: sha256(token),
      expires_at: secondsFromNow(now, TIMING.verifyTokenSeconds),
      created_at: now.toISOString(),
    });
    await sendLink(deps, user.email, 'Verify your email', `${deps.appUrl}/?auth=verify&token=${token}`, 'verify your email');
  }
  return { status: 202, body: { message: RESET_MSG } };
}

// ── Invitations (created by admins, see admin routes) ────────────────────

export async function sendInvite(deps: Deps, userId: string, email: string): Promise<void> {
  const now = deps.now?.() ?? new Date();
  await deps.store.invalidateTokens(userId, 'invite');
  const token = randomToken();
  await deps.store.createToken({
    id: uuid(),
    user_id: userId,
    type: 'invite',
    token_hash: sha256(token),
    expires_at: secondsFromNow(now, TIMING.inviteTokenSeconds),
    created_at: now.toISOString(),
  });
  await sendLink(deps, email, 'You are invited to Golden Jewelers', `${deps.appUrl}/?auth=invite&token=${token}`, 'accept your invitation');
}

export async function acceptInvite(deps: Deps, ctx: Ctx, input: { token: string; password: string; name?: string }): Promise<Result> {
  const now = deps.now?.() ?? new Date();
  const limit = await limited(deps, `verify:ip:${ctx.ip}`, RATE.verifyPerIp);
  if (limit) return limit;
  const problem = passwordProblem(input.password);
  if (problem) return { status: 400, body: { error: problem } };

  const rec = await deps.store.getToken(sha256(input.token), 'invite');
  if (!rec || rec.used_at || new Date(rec.expires_at) <= now) return { status: 400, body: { error: 'This invitation is invalid or has expired.' } };
  if (!(await deps.store.consumeToken(rec.id))) return { status: 400, body: { error: 'This invitation is invalid or has expired.' } };

  const user = await deps.store.getUserById(rec.user_id);
  if (!user || user.status === 'suspended') return { status: 400, body: { error: 'This invitation is invalid or has expired.' } };

  await deps.store.updateUser(user.id, {
    password_hash: await hashPassword(input.password),
    status: 'active',
    email_verified_at: now.toISOString(),
    failed_attempts: 0,
    locked_until: null,
    ...(input.name ? { name: input.name } : {}),
  });
  await audit(deps, ctx, 'auth.invite_accepted', user.id, user.id);
  return { status: 200, body: { ok: true } };
}

// ── Two-factor authentication (signed-in user) ───────────────────────────

export async function twoFactorSetup(deps: Deps, auth: Authed): Promise<Result> {
  if (auth.user.totp_enabled) return { status: 409, body: { error: 'Two-factor is already on. Turn it off first.' } };
  const secret = generateSecret();
  await deps.store.updateUser(auth.user.id, { totp_secret_enc: encryptSecret(secret), totp_last_step: null });
  const otpauth = generateURI({ strategy: 'totp', issuer: 'Golden Jewelers', label: auth.user.email, secret });
  return { status: 200, body: { secret, otpauth } };
}

export async function twoFactorEnable(deps: Deps, ctx: Ctx, auth: Authed, code: string): Promise<Result> {
  const u = auth.user;
  if (u.totp_enabled) return { status: 409, body: { error: 'Two-factor is already on.' } };
  if (!u.totp_secret_enc) return { status: 400, body: { error: 'Start setup first.' } };
  const step = validStep(await verifyTotp({ strategy: 'totp', secret: decryptSecret(u.totp_secret_enc), token: code, epochTolerance: 30 }));
  if (step === null) return { status: 400, body: { error: 'That code is not valid.' } };

  const codes = Array.from({ length: LIMITS.backupCodeCount }, () => newBackupCode());
  await deps.store.replaceBackupCodes(u.id, codes.map(c => sha256(normalizeBackupCode(c))));
  await deps.store.updateUser(u.id, { totp_enabled: true, totp_last_step: step });
  await audit(deps, ctx, 'auth.2fa_enabled', u.id, u.id);
  return { status: 200, body: { backupCodes: codes } }; // shown once
}

export async function twoFactorDisable(deps: Deps, ctx: Ctx, auth: Authed, input: { password: string; code: string }): Promise<Result> {
  const u = auth.user;
  if (!u.totp_enabled || !u.totp_secret_enc || !u.password_hash) return { status: 400, body: { error: 'Two-factor is not on.' } };
  if (!(await checkPassword(u.password_hash, input.password))) return { status: 400, body: { error: 'Check your password and code.' } };
  const step = validStep(await verifyTotp({ strategy: 'totp', secret: decryptSecret(u.totp_secret_enc), token: input.code, epochTolerance: 30 }));
  if (step === null) return { status: 400, body: { error: 'Check your password and code.' } };

  await deps.store.deleteBackupCodes(u.id);
  await deps.store.updateUser(u.id, { totp_enabled: false, totp_secret_enc: null, totp_last_step: null });
  await audit(deps, ctx, 'auth.2fa_disabled', u.id, u.id);
  return { status: 200, body: { ok: true } };
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function sendLink(deps: Deps, to: string, subject: string, link: string, purpose: string) {
  try {
    await deps.mailer.send(to, subject, `Use this link to ${purpose}. It expires in one hour (or 72 hours for invitations).\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`);
  } catch (err) {
    // The link is never logged. The cause is logged without any token.
    console.error(`[mail] could not send "${subject}": ${(err as Error).message}`);
  }
}

export { safeEqual };
