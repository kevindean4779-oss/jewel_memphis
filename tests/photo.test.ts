import { describe, expect, it } from 'vitest';
import { isOrderNo, isPhotoPath, newPhotoPath } from '../api/_lib/photo';
import { reduce, blankOrder } from '../src/order/state';

describe('order photo paths', () => {
  it('accepts order numbers and stored photo paths only', () => {
    expect(isOrderNo('CO-2041')).toBe(true);
    expect(isOrderNo('CO-2041/../x')).toBe(false);
    expect(isOrderNo('2041')).toBe(false);
    expect(isPhotoPath('CO-2041/1767000000000.jpg')).toBe(true);
    expect(isPhotoPath('CO-2041/../../secret.jpg')).toBe(false);
    expect(isPhotoPath('CO-2041/123.png')).toBe(false);
  });

  it('builds a path under the order number', () => {
    expect(newPhotoPath('CO-2041', 1767000000000)).toBe('CO-2041/1767000000000.jpg');
    expect(isPhotoPath(newPhotoPath('CO-2041'))).toBe(true);
  });
});

describe('photoPath reducer', () => {
  it('stores the path and marks the photo as taken', () => {
    const s = reduce(blankOrder('CO-2041'), { type: 'photoPath', path: 'CO-2041/1767000000000.jpg' });
    expect(s.photoPath).toBe('CO-2041/1767000000000.jpg');
    expect(s.photo).toBe(true);
  });

  it('clears the photo when retaken', () => {
    const taken = reduce(blankOrder('CO-2041'), { type: 'photoPath', path: 'CO-2041/1767000000000.jpg' });
    const s = reduce(taken, { type: 'photoPath', path: null });
    expect(s.photoPath).toBeNull();
    expect(s.photo).toBe(false);
  });

  it('clears the photo when the job type changes', () => {
    const taken = reduce(blankOrder('CO-2041'), { type: 'photoPath', path: 'CO-2041/1767000000000.jpg' });
    expect(reduce(taken, { type: 'mode', mode: 'dims' }).photoPath).toBeNull();
  });
});
