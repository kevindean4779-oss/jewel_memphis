import { hash, verify } from '@node-rs/argon2';

// 2 is Argon2id in @node-rs/argon2 (its Algorithm enum is a const enum, which the build can't import).
const ARGON2ID = 2;
import { LIMITS } from './config';

// Argon2id. Parameters are the library defaults (memory-hard, OWASP-recommended family).
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < LIMITS.minPasswordLength) return `Use at least ${LIMITS.minPasswordLength} characters`;
  if (password.length > LIMITS.maxPasswordLength) return `Use at most ${LIMITS.maxPasswordLength} characters`;
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, { algorithm: ARGON2ID });
}

export async function checkPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

// Used when no account matches, so login takes the same time either way.
let dummyHash: Promise<string> | null = null;
export function burnPasswordTime(password: string): Promise<boolean> {
  dummyHash ??= hashPassword('timing-equalizer-not-a-real-password');
  return dummyHash.then(h => checkPassword(h, password));
}
