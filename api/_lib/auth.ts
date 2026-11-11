import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

// Staff PIN check for the order routes. Denies everything when STAFF_PIN is not set.
export function hasStaffPin(req: VercelRequest): boolean {
  const expected = process.env.STAFF_PIN;
  const given = req.headers['x-staff-pin'];
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
