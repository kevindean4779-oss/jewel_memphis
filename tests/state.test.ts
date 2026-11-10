import { describe, expect, it } from 'vitest';
import { blankOrder, missingForSend, newOrderNo, reduce, sanitizeDraft, uuid, type Action } from '../src/order/state';
import { price } from '../src/order/pricing';
import { getSpot } from '../src/order/rates';
import type { OrderState } from '../src/order/types';

const run = (s: OrderState, ...actions: Action[]) => actions.reduce(reduce, s);
const live = { gold: 4000, silver: 50, platinum: 1600, updatedAt: '2026-11-10T12:00:00Z', source: 'metalpriceapi.com' };

function readyOrder(): OrderState {
  const s = run(blankOrder('CO-261110-ABCD'),
    { type: 'cust', key: 'name', value: 'Meera Sharma' },
    { type: 'cust', key: 'phone', value: '901 555 0123' },
    { type: 'cust', key: 'ornament', value: 'Lotus pendant' },
    { type: 'mode', mode: 'dims' },
    { type: 'continueToEstimate' },
    { type: 'generateCad' },
    { type: 'go', step: 4 },
    { type: 'check', key: 'details', on: true },
    { type: 'check', key: 'design', on: true },
  );
  // Agree the price at live (non-sample) rates.
  return run({ ...s, checks: { ...s.checks, price: true }, lockedSpot: live }, { type: 'check', key: 'deposit', on: true });
}

describe('ids and order numbers', () => {
  it('uuid is v4 and unique', () => {
    const ids = new Set(Array.from({ length: 2000 }, uuid));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('uuid works without crypto.randomUUID (plain-HTTP pages)', () => {
    const orig = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try { expect(uuid()).toMatch(/^[0-9a-f-]{36}$/); } finally { Object.defineProperty(crypto, 'randomUUID', { value: orig, configurable: true }); }
  });

  it('order numbers are dated and rarely collide', () => {
    expect(newOrderNo(new Date(2026, 10, 10))).toMatch(/^CO-261110-[A-Z0-9]{4}$/);
    const nos = new Set(Array.from({ length: 1000 }, () => newOrderNo()));
    expect(nos.size).toBeGreaterThan(990);
  });
});

describe('reducer edge cases', () => {
  it('clamps step navigation', () => {
    expect(run(blankOrder('x'), { type: 'go', step: 99 }).step).toBe(4);
    expect(run(blankOrder('x'), { type: 'go', step: -2 }).step).toBe(0);
  });

  it('truncates over-long text', () => {
    const s = run(blankOrder('x'), { type: 'cust', key: 'notes', value: 'a'.repeat(5000) });
    expect(s.cust.notes).toHaveLength(1000);
  });

  it('ignores a zero, negative or NaN budget', () => {
    for (const v of [0, -10, NaN, Infinity]) expect(run(blankOrder('x'), { type: 'budget', value: v }).budget).toBeNull();
    expect(run(blankOrder('x'), { type: 'budget', value: 750 }).budget).toBe(750);
  });

  it('refuses a combination over the budget', () => {
    const s = run(blankOrder('x'), { type: 'mode', mode: 'dims' }, { type: 'budget', value: 50 });
    expect(run(s, { type: 'select', metal: 'PT950', stone: 'natural' }).metal).toBe(s.metal);
  });

  it('cannot reach the estimate without a photo or a valid size', () => {
    expect(run(blankOrder('x'), { type: 'continueToEstimate' }).step).toBe(0);
    expect(run(blankOrder('x'), { type: 'mode', mode: 'dims' }, { type: 'dim', key: 'w', value: NaN }, { type: 'continueToEstimate' }).step).toBe(0);
    expect(run(blankOrder('x'), { type: 'photo', on: true }, { type: 'continueToEstimate' }).step).toBe(2);
  });

  it('a size change discards the CAD model', () => {
    const s = readyOrder();
    expect(run(s, { type: 'dim', key: 'w', value: 23 }).exact).toBe(false);
  });

  it('changing metal, stone, size or mode withdraws design, price and deposit approval', () => {
    const s = readyOrder();
    for (const a of [
      { type: 'metal', metal: '10K' }, { type: 'stone', stone: 'lab' }, { type: 'dim', key: 'h', value: 11 },
      { type: 'mode', mode: 'picture' }, { type: 'select', metal: 'S925', stone: 'cz5a' },
    ] as Action[]) {
      const t = reduce(s, a);
      expect(t.checks).toMatchObject({ details: true, design: false, price: false, deposit: false });
      expect(t.lockedSpot).toBeNull();
    }
  });

  it('re-choosing the same value does not withdraw approval', () => {
    const s = readyOrder();
    expect(reduce(s, { type: 'metal', metal: s.metal }).checks.price).toBe(true);
  });

  it('editing customer details withdraws only the details check', () => {
    const t = reduce(readyOrder(), { type: 'cust', key: 'phone', value: '901 555 9999' });
    expect(t.checks).toMatchObject({ details: false, design: true, price: true, deposit: true });
  });

  it('changing the deposit share requires confirming the deposit again', () => {
    const t = reduce(readyOrder(), { type: 'deposit', value: 100 });
    expect(t.checks.deposit).toBe(false);
    expect(reduce(readyOrder(), { type: 'deposit', value: 33 }).deposit).toBe(50); // not an offered share
  });

  it('agreeing the price freezes rates; un-agreeing releases them and the deposit', () => {
    const s = run(blankOrder('x'), { type: 'check', key: 'price', on: true });
    expect(s.lockedSpot).toEqual(getSpot());
    const t = run({ ...s, checks: { ...s.checks, deposit: true } }, { type: 'check', key: 'price', on: false });
    expect(t.lockedSpot).toBeNull();
    expect(t.checks.deposit).toBe(false);
  });

  it('a locked price does not move when market rates change', () => {
    const s = readyOrder();
    const locked = price(s.dims, s.metal, s.stone, s.mode, s.exact, s.lockedSpot!);
    const moved = price(s.dims, s.metal, s.stone, s.mode, s.exact, { ...live, gold: 5000 });
    expect(moved.total).not.toBe(locked.total);
    expect(price(s.dims, s.metal, s.stone, s.mode, s.exact, s.lockedSpot!).total).toBe(locked.total);
  });
});

describe('sending', () => {
  it('a complete order is ready', () => {
    expect(missingForSend(readyOrder())).toEqual([]);
  });

  it('lists everything missing', () => {
    const m = missingForSend(blankOrder('x'));
    expect(m).toEqual(expect.arrayContaining(['customer details', 'CAD model', 'customer check', 'design approval', 'price agreement', 'deposit']));
  });

  it('refuses sample rates', () => {
    const s = readyOrder();
    expect(missingForSend({ ...s, lockedSpot: { ...live, source: 'sample values' } })).toContain('live metal rates');
  });

  it('refuses an invalid or too-early needed-by date', () => {
    const s = readyOrder();
    expect(missingForSend({ ...s, cust: { ...s.cust, needed: '2026-02-30' } })).toContain('needed-by date');
    expect(missingForSend({ ...s, cust: { ...s.cust, needed: '2026-11-11' } }, new Date(2026, 10, 10))).toContain('needed-by date');
    expect(missingForSend({ ...s, cust: { ...s.cust, needed: '2027-03-01' } }, new Date(2026, 10, 10))).toEqual([]);
  });

  it('the reducer will not send an incomplete order', () => {
    expect(reduce(blankOrder('x'), { type: 'send', at: 'now' }).sent).toBe(false);
  });

  it('a sent order is frozen until a new order starts', () => {
    const sent = reduce(readyOrder(), { type: 'send', at: '2026-11-10T12:00:00Z' });
    expect(sent.sent).toBe(true);
    for (const a of [{ type: 'metal', metal: '10K' }, { type: 'go', step: 0 }, { type: 'check', key: 'price', on: false }, { type: 'send', at: 'again' }] as Action[]) {
      expect(reduce(sent, a)).toBe(sent);
    }
    const fresh = reduce(sent, { type: 'newOrder', orderNo: 'CO-261110-ZZZZ', id: uuid() });
    expect(fresh.sent).toBe(false);
    expect(fresh.id).not.toBe(sent.id);
  });
});

describe('draft restore', () => {
  it('returns null for junk and for sent orders', () => {
    for (const junk of [null, 42, 'x', [], { sent: true }]) expect(sanitizeDraft(junk)).toBeNull();
  });

  it('repairs removed materials, bad numbers and bad ids', () => {
    const s = sanitizeDraft({ id: 'nope', metal: '18K', stone: 'naturalP', orig: { metal: '22K', stone: 'lab' }, dims: { w: 'x', h: null }, deposit: 33, budget: -5, cust: { name: 7 } })!;
    expect(s.metal).toBe('14K');
    expect(s.stone).toBe('natural');
    expect(s.orig).toBeNull();
    expect(s.dims).toEqual({ w: 22, h: 10, d: 5 });
    expect(s.deposit).toBe(50);
    expect(s.budget).toBeNull();
    expect(s.cust.name).toBe('');
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('never restores onto a step whose earlier steps are incomplete', () => {
    expect(sanitizeDraft({ step: 4, cust: {} })!.step).toBe(0);
    const cust = { name: 'A', phone: '9015550123', ornament: 'Ring' };
    expect(sanitizeDraft({ step: 3, cust, mode: 'picture', photo: false })!.step).toBe(1);
    expect(sanitizeDraft({ step: 4, cust, mode: 'dims', dims: { w: 22, h: 10, d: 5 }, exact: false })!.step).toBe(3);
    expect(sanitizeDraft({ step: 4, cust, mode: 'dims', dims: { w: 22, h: 10, d: 5 }, exact: true })!.step).toBe(4);
  });

  it('drops a price agreement that has no frozen rates', () => {
    const s = sanitizeDraft({ checks: { price: true, deposit: true }, lockedSpot: null })!;
    expect(s.checks.price).toBe(false);
    expect(s.checks.deposit).toBe(false);
  });

  it('keeps the CAD model only if the size still passes the rules', () => {
    expect(sanitizeDraft({ exact: true, dims: { w: 22, h: 10, d: 2 } })!.exact).toBe(false);
  });
});
