import { beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { csrfOk, cookieValue, refreshCookie, clearRefreshCookie } from '../api/_lib/http';
import { decryptSecret, encryptSecret, normalizeBackupCode, newBackupCode } from '../api/_lib/crypto';
import { signAccessToken, verifyAccessToken, verifyMfaToken, signMfaToken } from '../api/_lib/tokens';
import { can, PERMISSIONS } from '../api/_lib/rbac';
import { passwordProblem } from '../api/_lib/passwords';
import { schemas } from '../api/_lib/schemas';
import type { VercelRequest } from '@vercel/node';

beforeAll(() => {
  process.env.APP_URL = 'https://app.example.test';
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.TOTP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
});

const req = (headers: Record<string, string>) => ({ headers }) as unknown as VercelRequest;

describe('CSRF check', () => {
  it('accepts the app origin with the custom header', () => {
    expect(csrfOk(req({ origin: 'https://app.example.test', 'x-requested-with': 'app' }))).toBe(true);
  });
  it('rejects another origin, a missing header, or a missing origin', () => {
    expect(csrfOk(req({ origin: 'https://evil.test', 'x-requested-with': 'app' }))).toBe(false);
    expect(csrfOk(req({ origin: 'https://app.example.test' }))).toBe(false);
    expect(csrfOk(req({ 'x-requested-with': 'app' }))).toBe(false);
  });
});

describe('refresh cookie', () => {
  it('is HttpOnly, Secure, SameSite=Lax and limited to the auth path', () => {
    const c = refreshCookie('abc');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Path=/api/auth');
    expect(c).toContain('Max-Age=604800');
  });
  it('clears with Max-Age=0', () => {
    expect(clearRefreshCookie()).toContain('Max-Age=0');
  });
  it('reads the cookie back out of the request header', () => {
    expect(cookieValue(req({ cookie: 'other=1; gj_refresh=tok%2Bx; more=2' }), 'gj_refresh')).toBe('tok+x');
    expect(cookieValue(req({}), 'gj_refresh')).toBeNull();
  });
});

describe('tokens', () => {
  it('access token round-trips and rejects a token of the wrong type', async () => {
    const t = await signAccessToken('user-1', 'session-1', 'manager');
    expect(await verifyAccessToken(t)).toMatchObject({ sub: 'user-1', sid: 'session-1', role: 'manager' });
    const mfa = await signMfaToken('user-1');
    expect(await verifyAccessToken(mfa)).toBeNull();
    expect(await verifyMfaToken(t)).toBeNull();
  });
  it('rejects a tampered token', async () => {
    const t = await signAccessToken('user-1', 'session-1', 'user');
    expect(await verifyAccessToken(t.slice(0, -2) + 'xx')).toBeNull();
  });
});

describe('secret encryption and backup codes', () => {
  it('encrypts a TOTP secret and decrypts it back', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('uses a fresh IV each time', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });
  it('backup codes are normalised so spacing and case do not matter', () => {
    const c = newBackupCode();
    expect(normalizeBackupCode(c.toLowerCase().replace('-', ' '))).toBe(normalizeBackupCode(c));
    expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
  });
});

describe('RBAC', () => {
  it('admin has every permission; user only uses orders', () => {
    for (const p of PERMISSIONS) expect(can('admin', p)).toBe(true);
    expect(can('user', 'orders:use')).toBe(true);
    expect(can('user', 'users:read')).toBe(false);
  });
  it('manager can invite and edit but cannot change roles, suspend or delete', () => {
    expect(can('manager', 'users:invite')).toBe(true);
    expect(can('manager', 'users:edit')).toBe(true);
    expect(can('manager', 'users:role')).toBe(false);
    expect(can('manager', 'users:suspend')).toBe(false);
    expect(can('manager', 'users:delete')).toBe(false);
    expect(can('manager', 'audit:read')).toBe(false);
  });
  it('unknown roles have no permissions', () => {
    expect(can('root' as never, 'orders:use')).toBe(false);
  });
});

describe('validation', () => {
  it('requires 12 to 128 characters for passwords', () => {
    expect(passwordProblem('short')).toMatch(/12/);
    expect(passwordProblem('x'.repeat(129))).toMatch(/128/);
    expect(passwordProblem('exactly twelve')).toBeNull();
  });
  it('lowercases and trims emails, and rejects malformed ones', () => {
    expect(schemas.login.safeParse({ email: '  Staff@Example.COM ', password: 'x' }).success).toBe(true);
    expect((schemas.login.parse({ email: '  Staff@Example.COM ', password: 'x' })).email).toBe('staff@example.com');
    expect(schemas.login.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
  it('requires a 6-digit code for 2FA', () => {
    expect(schemas.totpEnable.safeParse({ code: '12345' }).success).toBe(false);
    expect(schemas.totpEnable.safeParse({ code: '123456' }).success).toBe(true);
  });
});
