import { describe, expect, it } from 'vitest';
import {
  allOptions, cadRules, cents, custErrors, custOk, dimOk, dimsOk, emailOk, phoneOk, price, readyDate, today, validISODate,
} from '../src/order/pricing';
import { METALS, STONE_KEYS } from '../src/order/data';

const spot = { gold: 4000, silver: 50, platinum: 1600, updatedAt: '2026-11-10T12:00:00Z', source: 'test' };
const dims = { w: 22, h: 10, d: 5 };
const cust = { name: 'Meera Sharma', phone: '(901) 555-0123', email: '', ornament: 'Lotus pendant', occasion: '', needed: '', notes: '' };

describe('money', () => {
  it('rounds to cents without float drift', () => {
    expect(cents(0.1 + 0.2)).toBe(0.3);
    expect(cents(1.005)).toBe(1.01);
    expect(cents(2.675)).toBe(2.68);
  });

  it('totals always equal the sum of their rounded parts', () => {
    for (const m of METALS) for (const s of STONE_KEYS) {
      const p = price(dims, m, s, 'dims', true, spot);
      expect(cents(p.metal + p.stone + p.making)).toBe(p.subtotal);
      expect(cents(p.subtotal + p.tax)).toBe(p.total);
      expect(p.low).toBe(p.total);
      expect(p.high).toBe(p.total);
    }
  });

  it('prices 14K at spot × purity', () => {
    const p = price(dims, '14K', 'natural', 'dims', true, spot);
    expect(p.rate).toBeCloseTo((4000 / 31.1035) * (14 / 24), 6);
  });

  it('never produces NaN for an empty or invalid size', () => {
    for (const bad of [{ w: NaN, h: 10, d: 5 }, { w: 0, h: 10, d: 5 }, { w: -3, h: 10, d: 5 }, { w: 1e9, h: 10, d: 5 }]) {
      const p = price(bad, '14K', 'natural', 'dims', false, spot);
      expect(Number.isFinite(p.total)).toBe(true);
      expect(p.metal).toBe(0);
    }
  });

  it('estimate ranges widen before CAD and every option is finite', () => {
    const opts = allOptions(dims, 'picture', false, spot);
    expect(opts).toHaveLength(16);
    for (const o of opts) {
      expect(o.low).toBeLessThan(o.total);
      expect(o.high).toBeGreaterThan(o.total);
    }
    expect(opts.map(o => o.total)).toEqual([...opts.map(o => o.total)].sort((a, b) => a - b));
  });
});

describe('size validation', () => {
  it('accepts 0.5–200 mm only', () => {
    expect(dimOk(0.5)).toBe(true);
    expect(dimOk(200)).toBe(true);
    expect(dimOk(0.49)).toBe(false);
    expect(dimOk(200.01)).toBe(false);
    expect(dimOk(NaN)).toBe(false);
    expect(dimOk(Infinity)).toBe(false);
    expect(dimsOk({ w: 1, h: 1, d: NaN })).toBe(false);
  });

  it('CAD rules fail cleanly for an invalid size', () => {
    const r = cadRules({ w: NaN, h: 10, d: 5 });
    expect(r.every(x => !x.ok)).toBe(true);
    expect(r.map(x => x.detail).join()).not.toContain('NaN');
  });

  it('CAD rules catch thin, oversized and shallow designs', () => {
    expect(cadRules({ w: 22, h: 10, d: 0.6 })[0].ok).toBe(false);
    expect(cadRules({ w: 90, h: 10, d: 5 })[1].ok).toBe(false);
    expect(cadRules({ w: 22, h: 10, d: 4 })[2].ok).toBe(false);
    expect(cadRules({ w: 22, h: 10, d: 4.5 }).every(x => x.ok)).toBe(true);
  });
});

describe('customer validation', () => {
  it('needs name, ornament and a real phone number', () => {
    expect(custOk(cust)).toBe(true);
    expect(custOk({ ...cust, name: '   ' })).toBe(false);
    expect(custOk({ ...cust, ornament: '' })).toBe(false);
    expect(custErrors({ ...cust, phone: 'abc' }).phone).toBeTruthy();
    expect(custErrors({ ...cust, phone: '555-0123' }).phone).toBeTruthy();
  });

  it('phone: 10–15 digits in any format', () => {
    expect(phoneOk('9015550123')).toBe(true);
    expect(phoneOk('+1 (901) 555-0123')).toBe(true);
    expect(phoneOk('123456789')).toBe(false);
    expect(phoneOk('1234567890123456')).toBe(false);
  });

  it('email is optional but must look like an address', () => {
    expect(emailOk('')).toBe(true);
    expect(emailOk('  ')).toBe(true);
    expect(emailOk('a@b.co')).toBe(true);
    expect(emailOk('a@b')).toBe(false);
    expect(emailOk('a b@c.com')).toBe(false);
  });
});

describe('dates', () => {
  it('rejects impossible calendar dates', () => {
    expect(validISODate('2026-02-28')).toBe(true);
    expect(validISODate('2028-02-29')).toBe(true);
    expect(validISODate('2026-02-29')).toBe(false);
    expect(validISODate('2026-13-01')).toBe(false);
    expect(validISODate('26-1-1')).toBe(false);
    expect(validISODate('')).toBe(false);
  });

  it('ready date counts from the real current day, not a fixed date', () => {
    const a = readyDate('14K', 'lab', 'dims', new Date(2026, 11, 30, 23, 59));
    expect(a).toEqual(new Date(2027, 0, 16)); // 17 days later, across the year end
    expect(today(new Date(2026, 5, 1, 18, 30))).toEqual(new Date(2026, 5, 1));
  });

  it('adds platinum, photo and natural-stone lead time', () => {
    const base = readyDate('14K', 'lab', 'dims', new Date(2026, 0, 1)).getTime();
    const slow = readyDate('PT950', 'natural', 'picture', new Date(2026, 0, 1)).getTime();
    expect((slow - base) / 86_400_000).toBe(7 + 2 + 3);
  });
});
