import { describe, expect, it } from 'vitest';
import { blankOrder, reduce } from '../src/order/state';

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
  it('remembers the original design and restores it', () => {
    const s = reduce({ ...start, metal: '10K' }, { type: 'continueToEstimate' });
    const changed = reduce(s, { type: 'metal', metal: 'PT950' });
    expect(reduce(changed, { type: 'resetOriginal' }).metal).toBe('10K');
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
