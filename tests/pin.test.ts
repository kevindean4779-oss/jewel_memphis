import { randomBytes } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as svc from '../api/_lib/auth-service.js';
import { pinLookup, pinProblem, randomPin } from '../api/_lib/pin.js';
import { MemoryStore, makeUser } from './fakes/memory-store.js';

const ctx = { ip: '203.0.113.9', userAgent: 'vitest' };
let store: MemoryStore;
const deps = () => ({ store, mailer: { send: async () => {} }, appUrl: 'https://x.example' });

beforeAll(() => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
});
beforeEach(() => {
  store = new MemoryStore();
});

describe('PIN format', () => {
  it('accepts 4 to 6 digits only', () => {
    expect(pinProblem('1234')).toBeNull();
    expect(pinProblem('123456')).toBeNull();
    expect(pinProblem('123')).not.toBeNull();
    expect(pinProblem('1234567')).not.toBeNull();
    expect(pinProblem('12a4')).not.toBeNull();
    expect(pinProblem(1234)).not.toBeNull();
  });
  it('generates 4-digit PINs', () => {
    for (let i = 0; i < 50; i++) expect(randomPin()).toMatch(/^\d{4}$/);
  });
});

describe('PIN storage', () => {
  it('stores a keyed hash, never the PIN, and it is repeatable', () => {
    const a = pinLookup('4821');
    expect(a).not.toContain('4821');
    expect(pinLookup('4821')).toBe(a);
    expect(pinLookup('4822')).not.toBe(a);
  });
});

describe('changing a PIN', () => {
  it('refuses a PIN another account already uses', async () => {
    const a = await makeUser(store, { email: 'a@example.com', role: 'user' });
    const b = await makeUser(store, { email: 'b@example.com', role: 'user' });
    await store.updateUser(a.id, { pin_lookup: pinLookup('1111') });
    const session = await store.createSession({ id: 's1', user_id: b.id, family_id: 'f', refresh_token_hash: 'h', created_at: '', last_used_at: '', expires_at: new Date(Date.now() + 3.6e6).toISOString(), ip: null, user_agent: null });
    void session;
    const auth = { user: (await store.getUserById(b.id))!, sessionId: 's1' };
    expect((await svc.changePin(deps(), ctx, auth, { pin: '1111' })).status).toBe(409);
    expect((await svc.changePin(deps(), ctx, auth, { pin: '2222' })).status).toBe(200);
    expect((await svc.pinLogin(deps(), ctx, { pin: '2222' })).status).toBe(200);
  });

  it('keeps the same PIN for the same person', async () => {
    const a = await makeUser(store, { email: 'a@example.com', role: 'user' });
    await store.updateUser(a.id, { pin_lookup: pinLookup('3333') });
    const auth = { user: (await store.getUserById(a.id))!, sessionId: 'none' };
    expect((await svc.changePin(deps(), ctx, auth, { pin: '3333' })).status).toBe(200);
  });
});
