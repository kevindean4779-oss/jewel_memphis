import { afterEach, describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { hasStaffPin } from '../api/_lib/auth';

const req = (pin?: string) => ({ headers: pin === undefined ? {} : { 'x-staff-pin': pin } }) as unknown as VercelRequest;

afterEach(() => { delete process.env.STAFF_PIN; });

describe('staff PIN check', () => {
  it('refuses everything when STAFF_PIN is not set', () => {
    expect(hasStaffPin(req('1234'))).toBe(false);
  });
  it('accepts the right PIN and refuses the wrong one or none', () => {
    process.env.STAFF_PIN = '1234';
    expect(hasStaffPin(req('1234'))).toBe(true);
    expect(hasStaffPin(req('0000'))).toBe(false);
    expect(hasStaffPin(req('12345'))).toBe(false);
    expect(hasStaffPin(req())).toBe(false);
  });
});
