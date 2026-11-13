import { createHmac, randomInt } from 'node:crypto';
import { jwtSecret } from './config.js';

// Personal PINs: 4 to 6 digits. Stored as a keyed hash, so a database copy can't be used
// to sign in without the server key.
export const PIN_PATTERN = /^\d{4,6}$/;

export function pinProblem(pin: unknown): string | null {
  return typeof pin === 'string' && PIN_PATTERN.test(pin) ? null : 'Use a PIN of 4 to 6 digits';
}

export function pinLookup(pin: string): string {
  return createHmac('sha256', jwtSecret()).update(`pin:${pin}`).digest('hex');
}

// A random 4-digit PIN. The caller checks that no active account already uses it.
export function randomPin(): string {
  return String(randomInt(1000, 10000));
}
