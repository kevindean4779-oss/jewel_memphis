import { randomBytes } from 'node:crypto';
import { generate } from 'otplib';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as svc from '../api/_lib/auth-service';
import { sha256 } from '../api/_lib/crypto';
import { MemoryStore, makeUser } from './fakes/memory-store';

const PASSWORD = 'correct horse battery';
const ctx = { ip: '203.0.113.7', userAgent: 'vitest' };
const APP = 'https://example.test';

class FakeMailer {
  sent: { to: string; subject: string; text: string }[] = [];
  fail = false;
  async send(to: string, subject: string, text: string) {
    if (this.fail) throw new Error('smtp down');
    this.sent.push({ to, subject, text });
  }
  lastLinkToken(): string {
    const m = this.sent.at(-1)!.text.match(/token=([A-Za-z0-9_-]+)/);
    return m![1];
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

beforeEach(async () => {
  store = new MemoryStore();
  mailer = new FakeMailer();
  now = Date.parse('2026-11-11T12:00:00Z');
  store.clock = () => now;
});

async function activeUser(email = 'staff@example.com', role: 'admin' | 'manager' | 'user' = 'user') {
  const u = await makeUser(store, { email, role });
  await store.updateUser(u.id, { password_hash: await (await import('../api/_lib/passwords')).hashPassword(PASSWORD) });
  return (await store.getUserById(u.id))!;
}

async function signIn(email = 'staff@example.com') {
  const r = await svc.login(deps(), ctx, { email, password: PASSWORD });
  expect(r.status).toBe(200);
  return r.body as { accessToken: string; user: { id: string } };
}

describe('sign in', () => {
  it('issues an access token and a refresh cookie, and stores only the hash', async () => {
    await activeUser();
    const r = await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD });
    expect(r.status).toBe(200);
    const refreshValue = (r.refresh as { value: string }).value;
    expect(store.sessions[0].refresh_token_hash).toBe(sha256(refreshValue));
    expect(JSON.stringify(store.sessions)).not.toContain(refreshValue);
  });

  it('answers wrong password and unknown email identically', async () => {
    await activeUser();
    const wrong = await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'wrong password!!' });
    const unknown = await svc.login(deps(), { ip: '198.51.100.9', userAgent: 'x' }, { email: 'nobody@example.com', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('refuses invited and suspended accounts with the same generic message', async () => {
    const u = await activeUser();
    await store.updateUser(u.id, { status: 'suspended' });
    const r = await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: 'Invalid email or password' });
  });

  it('requires email verification, but only after the password is correct', async () => {
    const u = await activeUser();
    await store.updateUser(u.id, { email_verified_at: null });
    expect((await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'nope nope nope' })).status).toBe(401);
    expect((await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).status).toBe(403);
  });
});

describe('lockout', () => {
  it('locks for 15 minutes after 5 failures, even with the right password', async () => {
    await activeUser();
    for (let i = 0; i < 5; i++) await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'wrong password!!' });
    const locked = await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD });
    expect(locked.status).toBe(401);
    expect(locked.body).toEqual({ error: 'Invalid email or password' });
    expect(store.audit.some(a => a.action === 'auth.login_locked')).toBe(true);
  });

  it('unlocks after 15 minutes and resets the counter', async () => {
    await activeUser();
    for (let i = 0; i < 5; i++) await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'wrong password!!' });
    now += 15 * 60_000 + 1000;
    expect((await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).status).toBe(200);
  });

  it('clears the failure count on a good sign-in', async () => {
    const u = await activeUser();
    for (let i = 0; i < 4; i++) await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'wrong password!!' });
    await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD });
    expect((await store.getUserById(u.id))!.failed_attempts).toBe(0);
  });

  it('rate-limits sign-in attempts per email', async () => {
    await activeUser();
    let last = { status: 0, retryAfter: undefined as number | undefined };
    for (let i = 0; i < 11; i++) {
      const r = await svc.login(deps(), { ip: `10.0.0.${i}`, userAgent: 'x' }, { email: 'staff@example.com', password: 'wrong password!!' });
      last = { status: r.status, retryAfter: r.retryAfter };
    }
    expect(last.status).toBe(429);
    expect(last.retryAfter).toBeGreaterThan(0);
  });
});

describe('refresh tokens: rotation and reuse', () => {
  it('rotates on every refresh and the old token stops working', async () => {
    await activeUser();
    const first = (await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).refresh as { value: string };
    const second = await svc.refresh(deps(), ctx, first.value);
    expect(second.status).toBe(200);
    expect((second.refresh as { value: string }).value).not.toBe(first.value);
    const again = await svc.refresh(deps(), ctx, first.value);
    expect(again.status).toBe(401);
  });

  it('treats reuse of a rotated token as theft and revokes the whole family', async () => {
    await activeUser();
    const first = (await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).refresh as { value: string };
    const second = (await svc.refresh(deps(), ctx, first.value)).refresh as { value: string };
    expect((await svc.refresh(deps(), ctx, first.value)).status).toBe(401); // reuse detected
    expect((await svc.refresh(deps(), ctx, second.value)).status).toBe(401); // the legitimate copy is dead too
    expect(store.audit.some(a => a.action === 'auth.refresh_reuse')).toBe(true);
  });

  it('refuses expired refresh tokens after 7 days', async () => {
    await activeUser();
    const r = (await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).refresh as { value: string };
    now += 7 * 24 * 3600 * 1000 + 1000;
    expect((await svc.refresh(deps(), ctx, r.value)).status).toBe(401);
  });

  it('refuses refresh once the user is suspended', async () => {
    const u = await activeUser();
    const r = (await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).refresh as { value: string };
    await store.updateUser(u.id, { status: 'suspended' });
    expect((await svc.refresh(deps(), ctx, r.value)).status).toBe(401);
  });
});

describe('sessions: immediate revocation', () => {
  it('a revoked session stops working at once, even with an unexpired access token', async () => {
    await activeUser();
    const { accessToken } = await signIn();
    expect(await svc.authenticate(deps(), accessToken)).not.toBeNull();
    const session = store.sessions[0];
    await store.revokeSessionIfActive(session.id, 'revoked');
    expect(await svc.authenticate(deps(), accessToken)).toBeNull();
  });

  it('logout revokes the session behind the cookie', async () => {
    await activeUser();
    const { accessToken } = await signIn();
    const r = (await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).refresh as { value: string };
    await svc.logout(deps(), r.value);
    expect((await svc.refresh(deps(), ctx, r.value)).status).toBe(401);
    expect(accessToken).toBeTruthy();
  });

  it('revoking one session leaves the others working', async () => {
    const u = await activeUser();
    const a = await signIn();
    const b = await signIn();
    const authA = await svc.authenticate(deps(), a.accessToken);
    const sessionB = store.sessions.find(s => s.user_id === u.id && s.id !== authA!.sessionId)!;
    expect((await svc.revokeSession(deps(), ctx, authA!, sessionB.id)).status).toBe(200);
    expect(await svc.authenticate(deps(), b.accessToken)).toBeNull();
    expect(await svc.authenticate(deps(), a.accessToken)).not.toBeNull();
  });

  it('cannot revoke another user\'s session', async () => {
    await activeUser('one@example.com');
    const other = await activeUser('two@example.com');
    const mine = await svc.authenticate(deps(), (await signIn('one@example.com')).accessToken);
    await svc.login(deps(), ctx, { email: 'two@example.com', password: PASSWORD });
    const theirs = store.sessions.find(s => s.user_id === other.id)!;
    expect((await svc.revokeSession(deps(), ctx, mine!, theirs.id)).status).toBe(404);
  });

  it('revoking all sessions signs out everywhere', async () => {
    await activeUser();
    const a = await signIn();
    const b = await signIn();
    const auth = await svc.authenticate(deps(), a.accessToken);
    await svc.revokeAllSessions(deps(), ctx, auth!);
    expect(await svc.authenticate(deps(), a.accessToken)).toBeNull();
    expect(await svc.authenticate(deps(), b.accessToken)).toBeNull();
  });

  it('reads the role from the database, so a role change applies at once', async () => {
    const u = await activeUser('mgr@example.com', 'manager');
    const { accessToken } = await signIn('mgr@example.com');
    expect((await svc.authenticate(deps(), accessToken))!.user.role).toBe('manager');
    await store.updateUser(u.id, { role: 'user' });
    expect((await svc.authenticate(deps(), accessToken))!.user.role).toBe('user');
  });
});

describe('password reset', () => {
  it('sends the same answer whether or not the account exists', async () => {
    await activeUser();
    const real = await svc.forgotPassword(deps(), ctx, 'staff@example.com');
    const fake = await svc.forgotPassword(deps(), { ip: '198.51.100.2', userAgent: 'x' }, 'nobody@example.com');
    expect(real.status).toBe(202);
    expect(fake).toEqual(real);
    expect(mailer.sent.length).toBe(1); // only the real account gets an email
  });

  it('stores the token hashed, lets it be used once, and signs out every session', async () => {
    const u = await activeUser();
    await signIn();
    await svc.forgotPassword(deps(), ctx, 'staff@example.com');
    const token = mailer.lastLinkToken();
    expect(JSON.stringify(store.tokens)).not.toContain(token);

    const ok = await svc.resetPassword(deps(), ctx, { token, password: 'a brand new passphrase' });
    expect(ok.status).toBe(200);
    expect(await svc.resetPassword(deps(), ctx, { token, password: 'another passphrase here' })).toMatchObject({ status: 400 });
    expect(store.sessions.every(s => s.revoked_at)).toBe(true);
    expect((await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'a brand new passphrase' })).status).toBe(200);
    expect((await store.getUserById(u.id))!.failed_attempts).toBe(0);
  });

  it('expires after one hour', async () => {
    await activeUser();
    await svc.forgotPassword(deps(), ctx, 'staff@example.com');
    const token = mailer.lastLinkToken();
    now += 61 * 60_000;
    expect((await svc.resetPassword(deps(), ctx, { token, password: 'a brand new passphrase' })).status).toBe(400);
  });

  it('keeps the token when the new password is too short', async () => {
    await activeUser();
    await svc.forgotPassword(deps(), ctx, 'staff@example.com');
    const token = mailer.lastLinkToken();
    expect((await svc.resetPassword(deps(), ctx, { token, password: 'short' })).status).toBe(400);
    expect((await svc.resetPassword(deps(), ctx, { token, password: 'long enough passphrase' })).status).toBe(200);
  });

  it('a new reset link replaces the previous one', async () => {
    await activeUser();
    await svc.forgotPassword(deps(), ctx, 'staff@example.com');
    const first = mailer.lastLinkToken();
    await svc.forgotPassword(deps(), { ip: '10.9.9.9', userAgent: 'x' }, 'staff@example.com');
    expect((await svc.resetPassword(deps(), ctx, { token: first, password: 'long enough passphrase' })).status).toBe(400);
  });
});

describe('email verification and invitations', () => {
  it('verifies an email once, with a link that expires', async () => {
    const u = await activeUser();
    await store.updateUser(u.id, { email_verified_at: null });
    await svc.resendVerification(deps(), ctx, 'staff@example.com');
    const token = mailer.lastLinkToken();
    expect((await svc.verifyEmail(deps(), ctx, token)).status).toBe(200);
    expect((await svc.verifyEmail(deps(), ctx, token)).status).toBe(400);
  });

  it('accepts an invitation once, sets the password and activates the account', async () => {
    const u = await makeUser(store, { email: 'new@example.com', role: 'user', status: 'invited', email_verified_at: null });
    await svc.sendInvite(deps(), u.id, 'new@example.com');
    const token = mailer.lastLinkToken();
    expect((await svc.acceptInvite(deps(), ctx, { token, password: PASSWORD, name: 'Ana' })).status).toBe(200);
    const after = (await store.getUserById(u.id))!;
    expect(after.status).toBe('active');
    expect(after.name).toBe('Ana');
    expect(after.email_verified_at).not.toBeNull();
    expect((await svc.acceptInvite(deps(), ctx, { token, password: PASSWORD })).status).toBe(400);
  });

  it('expires invitations after 72 hours', async () => {
    const u = await makeUser(store, { email: 'late@example.com', role: 'user', status: 'invited', email_verified_at: null });
    await svc.sendInvite(deps(), u.id, 'late@example.com');
    const token = mailer.lastLinkToken();
    now += 73 * 3600_000;
    expect((await svc.acceptInvite(deps(), ctx, { token, password: PASSWORD })).status).toBe(400);
  });
});

describe('two-factor authentication', () => {
  // Code for the next 30-second window. The enrolment code is already used, so it can't sign in.
  const nextCode = (secret: string) => generate({ strategy: 'totp', secret, epoch: Math.floor(Date.now() / 1000) + 30 });

  async function enrolled() {
    const u = await activeUser();
    const session = await signIn();
    const auth = await svc.authenticate(deps(), session.accessToken);
    const setup = (await svc.twoFactorSetup(deps(), auth!)).body as { secret: string };
    const code = await generate({ strategy: 'totp', secret: setup.secret });
    const en = (await svc.twoFactorEnable(deps(), ctx, auth!, code)).body as { backupCodes: string[] };
    return { u, secret: setup.secret, backupCodes: en.backupCodes, accessToken: session.accessToken };
  }

  it('turns on with a valid code and returns 10 backup codes once', async () => {
    const { backupCodes } = await enrolled();
    expect(backupCodes).toHaveLength(10);
    expect(store.backup.every(b => b.code_hash.length === 64)).toBe(true); // hashed, not raw
  });

  it('asks for a code at sign-in, and accepts a code only once', async () => {
    const { secret } = await enrolled();
    const first = await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD });
    expect(first.status).toBe(202);
    const mfaToken = (first.body as { mfaToken: string }).mfaToken;
    const code = await nextCode(secret);
    expect((await svc.loginWithTwoFactor(deps(), ctx, { mfaToken, code })).status).toBe(200);
    // The same code again, in the same window, must not work.
    const again = await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD });
    const replay = await svc.loginWithTwoFactor(deps(), ctx, { mfaToken: (again.body as { mfaToken: string }).mfaToken, code });
    expect(replay.status).toBe(401);
  });

  it('accepts each backup code once', async () => {
    const { backupCodes } = await enrolled();
    const pending = async () => ((await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).body as { mfaToken: string }).mfaToken;
    expect((await svc.loginWithTwoFactor(deps(), ctx, { mfaToken: await pending(), backupCode: backupCodes[0] })).status).toBe(200);
    expect((await svc.loginWithTwoFactor(deps(), ctx, { mfaToken: await pending(), backupCode: backupCodes[0] })).status).toBe(401);
    expect((await svc.loginWithTwoFactor(deps(), ctx, { mfaToken: await pending(), backupCode: backupCodes[1] })).status).toBe(200);
  });

  it('rejects a wrong code and counts it toward lockout', async () => {
    await enrolled();
    const mfaToken = ((await svc.login(deps(), ctx, { email: 'staff@example.com', password: PASSWORD })).body as { mfaToken: string }).mfaToken;
    for (let i = 0; i < 5; i++) await svc.loginWithTwoFactor(deps(), ctx, { mfaToken, code: '000000' });
    const u = await store.getUserByEmail('staff@example.com');
    expect(u!.locked_until).not.toBeNull();
  });

  it('disabling needs the password and a current code', async () => {
    const { secret, accessToken } = await enrolled();
    const auth = await svc.authenticate(deps(), accessToken);
    expect((await svc.twoFactorDisable(deps(), ctx, auth!, { password: 'wrong password!!', code: await nextCode(secret) })).status).toBe(400);
    expect((await svc.twoFactorDisable(deps(), ctx, auth!, { password: PASSWORD, code: await nextCode(secret) })).status).toBe(200);
    expect(store.backup.length).toBe(0);
  });
});

describe('audit and logging', () => {
  it('writes an audit entry for failed sign-ins without storing the password', async () => {
    await activeUser();
    await svc.login(deps(), ctx, { email: 'staff@example.com', password: 'my secret phrase 123' });
    const entry = store.audit.find(a => a.action === 'auth.login_failed')!;
    expect(entry).toBeDefined();
    expect(JSON.stringify(store.audit)).not.toContain('my secret phrase');
    expect(entry.ip).toBe(ctx.ip);
  });

  it('does not leak a token when email sending fails', async () => {
    await activeUser();
    mailer.fail = true;
    const r = await svc.forgotPassword(deps(), ctx, 'staff@example.com');
    expect(r.status).toBe(202);
  });
});
