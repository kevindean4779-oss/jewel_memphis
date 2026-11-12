import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appUrl, TIMING } from './config.js';

export function clientIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || (req.socket?.remoteAddress ?? null);
}

export function userAgent(req: VercelRequest): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua.slice(0, 300) : null;
}

export function cookieValue(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export const REFRESH_COOKIE = 'gj_refresh';

export function bearerToken(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7) : null;
}

export function refreshCookie(value: string): string {
  return `${REFRESH_COOKIE}=${encodeURIComponent(value)}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${TIMING.refreshTokenSeconds}`;
}

export function clearRefreshCookie(): string {
  return `${REFRESH_COOKIE}=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// CSRF defence for state-changing requests: the browser must send the app's own
// Origin, plus a custom header that cross-site forms cannot set.
export function csrfOk(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  let expected: string;
  try {
    expected = new URL(appUrl()).origin;
  } catch {
    return false;
  }
  return origin === expected && req.headers['x-requested-with'] === 'app';
}

export function send(res: VercelResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.status(status).json(body);
}

export function fail(res: VercelResponse, status: number, error: string, extra: Record<string, string> = {}) {
  send(res, status, { error }, extra);
}
