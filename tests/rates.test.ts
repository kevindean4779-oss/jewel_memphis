import { describe, expect, it } from 'vitest';
import { isSpot } from '../src/order/rates';
import { valid } from '../api/rates';

const ok = { gold: 4000, silver: 50, platinum: 1600, updatedAt: '', source: 'x' };

describe('rate sanity checks', () => {
  it('accepts plausible prices and rejects glitches', () => {
    expect(isSpot(ok)).toBe(true);
    expect(valid(ok)).toBe(true);
    for (const bad of [{ gold: 0 }, { gold: 0.00025 }, { silver: 5000 }, { platinum: NaN }, { gold: '4000' }]) {
      expect(isSpot({ ...ok, ...bad })).toBe(false);
      expect(valid({ ...ok, ...bad } as any)).toBe(false);
    }
    expect(isSpot(null)).toBe(false);
    expect(isSpot({ gold: 4000, silver: 50, platinum: 1600 })).toBe(false); // missing source/time
  });
});
