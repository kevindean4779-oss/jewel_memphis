import { describe, expect, it } from 'vitest';
import { blankOrder, newOrderNo, normalizeOrder, reduce } from '../src/order/state';

const start = blankOrder('CO-1');

describe('order reducer', () => {
  it('moves between steps', () => {
    expect(reduce(start, { type: 'go', step: 3 }).step).toBe(3);
  });
  it('clears the CAD model when the size changes', () => {
    const exact = { ...start, exact: true };
    expect(reduce(exact, { type: 'dim', key: 'w', value: 30 }).exact).toBe(false);
  });
  it('clears the photo and CAD state when the input method changes', () => {
    const s = { ...start, photo: true, exact: true };
    const next = reduce(s, { type: 'mode', mode: 'dims' });
    expect(next.photo).toBe(false);
    expect(next.exact).toBe(false);
  });
  it('toggles an occasion off when tapped again', () => {
    const once = reduce(start, { type: 'occasion', value: 'Gift' });
    expect(once.cust.occasion).toBe('Gift');
    expect(reduce(once, { type: 'occasion', value: 'Gift' }).cust.occasion).toBe('');
  });
  it('only generates CAD when every rule passes', () => {
    const bad = { ...start, dims: { w: 22, h: 10, d: 0.5 } };
    expect(reduce(bad, { type: 'generateCad' }).exact).toBe(false);
    expect(reduce(start, { type: 'generateCad' }).exact).toBe(true);
  });
  it('adds, edits and removes stone lines', () => {
    const line = { id: 'a', type: 'natural_vs1' as const, sizeMm: 1.5, qty: 2, perCt: 800, setting: 3 };
    const added = reduce(start, { type: 'stoneAdd', line });
    expect(added.stones).toHaveLength(1);
    const edited = reduce(added, { type: 'stoneUpdate', id: 'a', patch: { qty: 4 } });
    expect(edited.stones[0].qty).toBe(4);
    expect(reduce(edited, { type: 'stoneRemove', id: 'a' }).stones).toHaveLength(0);
  });
  it('adds, edits and removes service lines', () => {
    const added = reduce(start, { type: 'serviceAdd', line: { id: 'v', name: 'Plating', cost: 25 } });
    expect(reduce(added, { type: 'serviceUpdate', id: 'v', patch: { cost: 30 } }).services[0].cost).toBe(30);
    expect(reduce(added, { type: 'serviceRemove', id: 'v' }).services).toHaveLength(0);
  });
  it('clears the budget when the matrix is hidden', () => {
    const s = reduce({ ...start, budget: 1500 }, { type: 'hideBudget' });
    expect(s.budget).toBeNull();
    expect(s.showBudget).toBe(false);
  });
  it('starts a new order with a fresh number and no customer data', () => {
    const next = reduce({ ...start, sent: true }, { type: 'newOrder', orderNo: 'CO-2' });
    expect(next.orderNo).toBe('CO-2');
    expect(next.sent).toBe(false);
    expect(next.cust.name).toBe('');
  });
  it('loads a saved order and clears its restored flag', () => {
    const saved = { ...start, cust: { ...start.cust, name: 'Ana' }, restored: true };
    const loaded = reduce(start, { type: 'load', order: saved });
    expect(loaded.cust.name).toBe('Ana');
    expect(loaded.restored).toBe(false);
  });
});


describe('order numbers and saved orders', () => {
  it('gives each new order a different number', () => {
    const nums = new Set(Array.from({ length: 2000 }, () => newOrderNo()));
    expect(nums.size).toBe(2000);
  });

  it('fills missing fields and bad sizes from a saved order', () => {
    const o = normalizeOrder({ orderNo: 'CO-1', dims: { w: NaN, h: 12, d: -3 } as never, step: 9 });
    expect(o.dims).toEqual({ w: 22, h: 12, d: 5 });
    expect(o.step).toBe(0);
    expect(o.checks.details).toBe(false);
    expect(o.cust.name).toBe('');
  });

  it('loading an order uses the same defaults and clears the restored flag', () => {
    const next = reduce(blankOrder('CO-2'), { type: 'load', order: { ...blankOrder('CO-9'), restored: true } as never });
    expect(next.orderNo).toBe('CO-9');
    expect(next.restored).toBe(false);
  });
});

describe('deposit action', () => {
  it('stores a dollar amount and keeps the previous one for invalid values', () => {
    const base = { ...blankOrder('CO-3'), depositAmount: 500 };
    expect(reduce(base, { type: 'deposit', value: 300 }).depositAmount).toBe(300);
    expect(reduce(base, { type: 'deposit', value: 0 }).depositAmount).toBe(500);
    expect(reduce(base, { type: 'deposit', value: NaN }).depositAmount).toBe(500);
    expect(reduce(base, { type: 'deposit', value: null }).depositAmount).toBeNull();
  });
});
