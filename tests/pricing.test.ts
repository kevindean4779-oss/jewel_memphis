import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OwnerConfig } from '../src/order/config';
import { allCadOk, allOptions, cadRules, custOk, dimsOk, gramRate, leadDays, price, readyDate, type Market } from '../src/order/pricing';
import { TROY_OZ_GRAMS } from '../src/order/data';

const rates = { gold24Gram: 130, silverGram: 1.6, platinumGram: 47, source: 'manual' as const, time: 'test' };
const mk: Market = { cfg: DEFAULT_CONFIG, rates };
const dims = { w: 22, h: 10, d: 5 };

describe('gramRate', () => {
  it('scales the 24K spot price by karat purity', () => {
    expect(gramRate(mk, '18K')).toBeCloseTo(130 * 18 / 24);
    expect(gramRate(mk, '10K')).toBeCloseTo(130 * 10 / 24);
  });
  it('uses the platinum and silver spot prices for their families', () => {
    expect(gramRate(mk, 'PT950')).toBeCloseTo(47 * 0.95);
    expect(gramRate(mk, 'S925')).toBeCloseTo(1.6 * 0.925);
  });
});

describe('price', () => {
  it('adds making fee, stones and tax to the metal cost', () => {
    const p = price(mk, dims, '18K', 'natural', 'dims', true);
    expect(p.making).toBe(DEFAULT_CONFIG.makingFee);
    expect(p.stone).toBeCloseTo(DEFAULT_CONFIG.stonePerCt.natural * 0.2);
    expect(p.subtotal).toBeCloseTo(p.metal + p.stone + p.making);
    expect(p.tax).toBeCloseTo(p.subtotal * DEFAULT_CONFIG.taxRate);
    expect(p.total).toBeCloseTo(p.subtotal + p.tax);
  });
  it('has no tolerance once CAD is generated, and a band before', () => {
    const exact = price(mk, dims, '18K', 'natural', 'dims', true);
    expect(exact.low).toBeCloseTo(exact.high);
    const estimate = price(mk, dims, '18K', 'natural', 'dims', false);
    expect(estimate.low).toBeLessThan(estimate.total);
    expect(estimate.high).toBeGreaterThan(estimate.total);
    expect(estimate.tol).toBe(0.15);
    expect(price(mk, dims, '18K', 'natural', 'picture', false).tol).toBe(0.1);
  });
  it('shares add up to 100%', () => {
    const p = price(mk, dims, '14K', 'lab', 'dims', true);
    expect(p.shareMetal + p.shareStone + p.shareMaking).toBeCloseTo(100);
  });
  it('uses owner-set stone prices', () => {
    const cfg: OwnerConfig = { ...DEFAULT_CONFIG, stonePerCt: { ...DEFAULT_CONFIG.stonePerCt, cz: 50 } };
    expect(price({ cfg, rates }, dims, '10K', 'cz', 'dims', true).stone).toBeCloseTo(50 * 0.2);
  });
});

describe('allOptions', () => {
  it('lists every metal and stone combination, cheapest first', () => {
    const all = allOptions(mk, dims, 'dims', true);
    expect(all).toHaveLength(6 * 5);
    for (let i = 1; i < all.length; i++) expect(all[i].total).toBeGreaterThanOrEqual(all[i - 1].total);
  });
});

describe('CAD rules', () => {
  it('accepts the standard size', () => {
    expect(allCadOk(dims)).toBe(true);
  });
  it('rejects a wall thinner than 0.8 mm', () => {
    expect(allCadOk({ w: 22, h: 10, d: 0.5 })).toBe(false);
  });
  it('rejects a piece that is too big for the print tray', () => {
    expect(cadRules({ w: 100, h: 10, d: 5 })[1].ok).toBe(false);
  });
  it('rejects a depth too shallow for the stone seat', () => {
    expect(cadRules({ w: 22, h: 10, d: 4 })[2].ok).toBe(false);
  });
});

describe('lead times and ready date', () => {
  it('adds platinum, premium stone and photo-CAD days', () => {
    expect(leadDays('18K', 'natural', 'dims')).toBe(17);
    expect(leadDays('PT950', 'naturalP', 'picture')).toBe(17 + 3 + 7 + 2);
  });
  it('works out the ready date from the given day', () => {
    const d = readyDate('18K', 'natural', 'dims', new Date(2026, 10, 10));
    expect(d.getDate()).toBe(10 + 17);
  });
});

describe('input checks', () => {
  it('rejects empty or zero sizes', () => {
    expect(dimsOk({ w: 0, h: 10, d: 5 })).toBe(false);
    expect(dimsOk({ w: NaN, h: 10, d: 5 })).toBe(false);
    expect(dimsOk(dims)).toBe(true);
  });
  it('needs name, phone and ornament', () => {
    const c = { name: 'A', phone: '1', email: '', ornament: 'X', occasion: '', needed: '', notes: '' };
    expect(custOk(c)).toBe(true);
    expect(custOk({ ...c, phone: ' ' })).toBe(false);
  });
});

it('converts troy ounces to grams for manual rates', () => {
  expect(TROY_OZ_GRAMS).toBeCloseTo(31.1035);
});
