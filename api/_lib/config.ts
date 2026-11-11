// Server settings from environment variables. Read once per request; throws when a
// required value is missing or too weak, so a misconfigured deploy fails loudly.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function appUrl(): string {
  return required('APP_URL').replace(/\/$/, '');
}

export function jwtSecret(): Uint8Array {
  const s = required('JWT_SECRET');
  if (s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return new TextEncoder().encode(s);
}

// 32-byte key, base64 encoded. Used to encrypt TOTP secrets at rest.
export function totpKey(): Buffer {
  const b = Buffer.from(required('TOTP_ENCRYPTION_KEY'), 'base64');
  if (b.length !== 32) throw new Error('TOTP_ENCRYPTION_KEY must decode to 32 bytes');
  return b;
}

export const TIMING = {
  accessTokenSeconds: 15 * 60,
  refreshTokenSeconds: 7 * 24 * 3600,
  mfaTokenSeconds: 5 * 60,
  resetTokenSeconds: 60 * 60,
  verifyTokenSeconds: 60 * 60,
  inviteTokenSeconds: 72 * 3600,
};

export const LIMITS = {
  minPasswordLength: 12,
  maxPasswordLength: 128,
  lockAfterFailures: 5,
  lockMinutes: 15,
  backupCodeCount: 10,
};

export const RATE = {
  loginPerIp: { windowSeconds: 900, max: 30 },
  loginPerEmail: { windowSeconds: 900, max: 10 },
  signupLikePerIp: { windowSeconds: 3600, max: 10 }, // invite accept, resend verification
  resetPerEmail: { windowSeconds: 3600, max: 5 },
  resetPerIp: { windowSeconds: 3600, max: 20 },
  verifyPerIp: { windowSeconds: 900, max: 20 },
  mfaPerUser: { windowSeconds: 900, max: 10 },
};
