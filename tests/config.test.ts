import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, taxLabel } from '../src/order/config';
import { STONE_KEYS } from '../src/order/data';

describe('owner config defaults', () => {
  it('prices every stone type', () => {
    for (const k of STONE_KEYS) expect(DEFAULT_CONFIG.stonePerCt[k]).toBeGreaterThan(0);
  });
  it('keeps the placeholder making fee and tax', () => {
    expect(DEFAULT_CONFIG.makingFee).toBe(80);
    expect(DEFAULT_CONFIG.taxRate).toBeCloseTo(0.0825);
  });
  it('labels the tax rate', () => {
    expect(taxLabel(DEFAULT_CONFIG)).toBe('Sales tax (8.25%, store location)');
  });
});
