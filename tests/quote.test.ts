import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/order/config';
import { buildQuote, caratOf, estimatedWeight, readyDate, stoneCost } from '../src/order/quote';
import { gramRate, type Market } from '../src/order/pricing';
import { KARATS, STONES } from '../src/order/data';
import { blankOrder, reduce } from '../src/order/state';
import type { StoneLine } from '../src/order/types';

// Spot price from the vendor's example: $3,727 per troy ounce of gold.
const TROY = 31.1035;
const mk: Market = {
  cfg: DEFAULT_CONFIG,
  rates: { gold24Gram: 3727 / TROY, silverGram: 50 / TROY, source: 'manual', time: 'test' },
};

const base = () => ({
  ...blankOrder('CO-1'),
  metal: '14K' as const,
  weight: 5,
  waste: 10,
  labour: 10,
  markup: 2.5,
  services: [{ id: 'p', name: 'Rhodium plating', cost: 25 }],
  stones: [{ id: 's', type: 'natural_vs1' as const, sizeMm: 1.5, qty: 5, perCt: 803, setting: 1 }],
});

describe('vendor calculator example (14K, 5 g, 5 × 1.5 mm natural, plating)', () => {
  const q = buildQuote(mk, base());

  it('prices the gold with waste and the karat factor', () => {
    expect(gramRate(mk, '14K')).toBeCloseTo(119.83 * 0.5833, 1);
    expect(q.metal).toBeCloseTo(384.42, 1);
  });

  it('prices casting labour per gram', () => {
    expect(q.labour).toBeCloseTo(50, 6);
  });

  it('prices the stones: carats × $/ct, plus a setting for each stone', () => {
    expect(caratOf(mk, 1.5)).toBe(0.015);
    expect(q.stones).toBeCloseTo(65.23, 1);
  });

  it('gives the same production cost and quote as the calculator', () => {
    expect(q.production).toBeCloseTo(524.64, 1);
    expect(q.quote).toBeCloseTo(1311.61, 1);
    expect(q.margin).toBeCloseTo(0.6, 4);
  });

  it('adds tax on top of the quote, not inside it', () => {
    expect(q.tax).toBeCloseTo(q.quote * 0.0825, 2);
    expect(q.total).toBeCloseTo(q.quote + q.tax, 2);
  });
});

describe('stones', () => {
  it('stone cost is quantity × carats × $/ct plus setting for each stone', () => {
    const line: StoneLine = { id: 'x', type: 'natural_vs1', sizeMm: 1.5, qty: 10, perCt: 800, setting: 3.5 };
    const c = stoneCost(mk, line);
    expect(c.carats).toBeCloseTo(0.15, 6);
    expect(c.total).toBeCloseTo(120 + 35, 6);
  });

  it('an unknown size has no carat weight, so it costs nothing until the table is fixed', () => {
    expect(caratOf(mk, 9)).toBe(0);
  });
});

describe('weight and terms', () => {
  it('uses the estimated weight until the counter types one', () => {
    const o = blankOrder('CO-2');
    expect(buildQuote(mk, o).weightIsEstimate).toBe(true);
    expect(buildQuote(mk, o).weight).toBeCloseTo(estimatedWeight(o.dims, o.metal), 6);
  });

  it('a typed weight replaces the estimate', () => {
    const o = reduce(blankOrder('CO-3'), { type: 'weight', value: 4.2 });
    expect(buildQuote(mk, o).weight).toBe(4.2);
    expect(buildQuote(mk, o).weightIsEstimate).toBe(false);
  });

  it('a new order starts from the owner terms', () => {
    const o = reduce(blankOrder('CO-4'), { type: 'newOrder', orderNo: 'CO-5', terms: { markup: 3, waste: 8, labour: 12, makingDesign: 40, makingWax: 15, makingPolish: 10 } });
    expect([o.markup, o.waste, o.labour, o.makingDesign, o.makingWax, o.makingPolish]).toEqual([3, 8, 12, 40, 15, 10]);
  });

  it('rejects a markup below 1 and a waste above 50%', () => {
    const o = base();
    expect(reduce(o, { type: 'markup', value: 0.5 }).markup).toBe(2.5);
    expect(reduce(o, { type: 'waste', value: 60 }).waste).toBe(10);
  });

  it('CAD keeps a weight the counter typed, and a size change keeps it too', () => {
    const typed = reduce(blankOrder('CO-6'), { type: 'weight', value: 5 });
    const cad = reduce(typed, { type: 'generateCad' });
    expect(cad.exact).toBe(true);
    expect(cad.weight).toBe(5);
    const changed = reduce(cad, { type: 'dim', key: 'w', value: 30 });
    expect(changed.exact).toBe(false);
    expect(changed.weight).toBe(5);
  });

  it('CAD fixes the estimated weight when none was typed', () => {
    const cad = reduce(blankOrder('CO-7'), { type: 'generateCad' });
    expect(cad.weight).not.toBeNull();
  });
});

describe('making charges', () => {
  it('adds design, wax and polishing to the production cost, before markup', () => {
    const base = buildQuote(mk, { ...blankOrder('CO-8'), weight: 5, metal: '14K' as const });
    const withMaking = buildQuote(mk, { ...blankOrder('CO-8'), weight: 5, metal: '14K' as const, makingDesign: 40, makingWax: 15, makingPolish: 10 });
    expect(withMaking.making).toBe(65);
    expect(withMaking.production - base.production).toBeCloseTo(65, 6);
    expect(withMaking.quote).toBeCloseTo(withMaking.production * 2.5, 2);
  });
});

describe('ready date', () => {
  it('adds time for a picture-based estimate only', () => {
    const today = new Date(2026, 0, 1);
    const dims = readyDate('14K', [], 'dims', today);
    const picture = readyDate('14K', [], 'picture', today);
    expect((picture.getTime() - dims.getTime()) / 86400000).toBe(3);
  });
});

describe('shop options', () => {
  it('offers only 18K, 14K, 10K gold and silver', () => {
    expect(Object.keys(KARATS).sort()).toEqual(['10K', '14K', '18K', 'S925']);
  });
  it('offers natural diamonds by clarity, lab-grown, moissanite and CZ', () => {
    expect(Object.keys(STONES).sort()).toEqual(['cz', 'lab', 'moissanite', 'natural_i1', 'natural_iclean', 'natural_si', 'natural_vs1', 'natural_vs2']);
  });
});
