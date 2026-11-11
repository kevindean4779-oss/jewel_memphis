import { SignJWT, jwtVerify } from 'jose';
import { TIMING, jwtSecret } from './config';
import type { Role } from './rbac';

export interface AccessClaims {
  sub: string; // user id
  sid: string; // session id
  role: Role;
  typ: 'access';
}

export interface MfaClaims {
  sub: string;
  typ: 'mfa';
}

// Access token: 15 minutes. Its session id is checked against the database on every request.
export function signAccessToken(userId: string, sessionId: string, role: Role): Promise<string> {
  return new SignJWT({ sid: sessionId, role, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TIMING.accessTokenSeconds}s`)
    .sign(jwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ['HS256'] });
    if (payload.typ !== 'access' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
    return { sub: payload.sub, sid: payload.sid as string, role: payload.role as Role, typ: 'access' };
  } catch {
    return null;
  }
}

// Short-lived token between a correct password and the 2FA code.
export function signMfaToken(userId: string): Promise<string> {
  return new SignJWT({ typ: 'mfa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TIMING.mfaTokenSeconds}s`)
    .sign(jwtSecret());
}

export async function verifyMfaToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ['HS256'] });
    if (payload.typ !== 'mfa' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}
