// Browser side of the auth API. The access token lives in memory only; the refresh
// token is an HttpOnly cookie that scripts can't read.

export interface Me {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  status: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  mustChangePassword: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) {
    super(message);
  }
}

let accessToken: string | null = null;
let me: Me | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());

export const session = {
  get user() { return me; },
  get token() { return accessToken; },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function setSession(token: string | null, user: Me | null) {
  accessToken = token;
  me = user;
  emit();
}

const HEADERS = { 'content-type': 'application/json', 'x-requested-with': 'app' };

async function call<T>(path: string, init: RequestInit = {}, withToken = true): Promise<T> {
  const headers: Record<string, string> = { ...HEADERS, ...(init.headers as Record<string, string> ?? {}) };
  if (withToken && accessToken) headers.authorization = `Bearer ${accessToken}`;
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? 'Something went wrong. Try again.', Number(res.headers.get('retry-after')) || undefined);
  }
  return body as T;
}

// Calls a protected route; on an expired access token, refreshes once and retries.
export async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await call<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && (await refresh())) {
      return call<T>(path, init);
    }
    throw err;
  }
}

export async function refresh(): Promise<boolean> {
  try {
    const r = await call<{ accessToken: string; user: Me }>('/api/auth/refresh', { method: 'POST' }, false);
    setSession(r.accessToken, r.user);
    return true;
  } catch {
    setSession(null, null);
    return false;
  }
}

export async function loadSession(): Promise<void> {
  if (!(await refresh())) return;
}

export type SignInResult = { done: true } | { done: false; mfaToken: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: HEADERS, credentials: 'same-origin', body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 202) return { done: false, mfaToken: String(body.mfaToken) };
  if (!res.ok) throw new ApiError(res.status, (body.error as string) ?? 'Sign-in failed', Number(res.headers.get('retry-after')) || undefined);
  setSession(body.accessToken as string, body.user as Me);
  return { done: true };
}

export async function signInWithCode(mfaToken: string, code: string, backup: boolean): Promise<void> {
  const body = backup ? { mfaToken, backupCode: code } : { mfaToken, code };
  const r = await call<{ accessToken: string; user: Me }>('/api/auth/login/2fa', { method: 'POST', body: JSON.stringify(body) }, false);
  setSession(r.accessToken, r.user);
}

export async function signOut(): Promise<void> {
  try {
    await call('/api/auth/logout', { method: 'POST' }, false);
  } finally {
    setSession(null, null);
  }
}

export const post = <T,>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) }, false);

// Replaces the password and clears the forced change. Other devices are signed out.
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await authed('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
  await refresh();
}
