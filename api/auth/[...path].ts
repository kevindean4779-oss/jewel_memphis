import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appUrl } from '../_lib/config.js';
import { clearRefreshCookie, clientIp, cookieValue, csrfOk, fail, REFRESH_COOKIE, refreshCookie, routeFrom, send, userAgent } from '../_lib/http.js';
import { defaultMailer } from '../_lib/mailer.js';
import { SupabaseStore } from '../_lib/store.js';
import { schemas } from '../_lib/schemas.js';
import * as svc from '../_lib/auth-service.js';

// Routes: /api/auth/<action>. Every state-changing request needs the app's Origin
// and X-Requested-With header (CSRF defence). Protected routes need a Bearer token.

function bearer(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7) : null;
}

function bodyOf(req: VercelRequest): unknown {
  return typeof req.body === 'string' ? safeJson(req.body) : req.body;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

// Returns the parsed body, or responds 400 with the first validation message.
function parse<T>(res: VercelResponse, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, req: VercelRequest): T | null {
  const r = schema.safeParse(bodyOf(req) ?? {});
  if (!r.success) {
    fail(res, 400, r.error.issues[0]?.message ?? 'Invalid request');
    return null;
  }
  return r.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = routeFrom(req, 'auth');
  const ctx = { ip: clientIp(req), userAgent: userAgent(req) };
  const mutating = req.method && req.method !== 'GET';

  try {
    if (mutating && !csrfOk(req)) return fail(res, 403, 'Request not allowed');

    const deps = { store: new SupabaseStore(), mailer: defaultMailer(), appUrl: appUrl() };
    const refreshValue = cookieValue(req, REFRESH_COOKIE);
    let result: svc.Result | null = null;

    // Signed-out routes
    if (req.method === 'POST' && route === 'login') {
      const input = parse(res, schemas.login, req);
      if (!input) return;
      result = await svc.login(deps, ctx, input);
    } else if (req.method === 'POST' && route === 'login/2fa') {
      const input = parse(res, schemas.mfaLogin, req);
      if (!input) return;
      result = await svc.loginWithTwoFactor(deps, ctx, input);
    } else if (req.method === 'POST' && route === 'refresh') {
      result = await svc.refresh(deps, ctx, refreshValue);
    } else if (req.method === 'POST' && route === 'logout') {
      result = await svc.logout(deps, refreshValue);
    } else if (req.method === 'POST' && route === 'forgot-password') {
      const input = parse(res, schemas.forgotPassword, req);
      if (!input) return;
      result = await svc.forgotPassword(deps, ctx, input.email);
    } else if (req.method === 'POST' && route === 'reset-password') {
      const input = parse(res, schemas.resetPassword, req);
      if (!input) return;
      result = await svc.resetPassword(deps, ctx, input);
    } else if (req.method === 'POST' && route === 'verify-email') {
      const input = parse(res, schemas.verifyEmail, req);
      if (!input) return;
      result = await svc.verifyEmail(deps, ctx, input.token);
    } else if (req.method === 'POST' && route === 'resend-verification') {
      const input = parse(res, schemas.resendVerification, req);
      if (!input) return;
      result = await svc.resendVerification(deps, ctx, input.email);
    } else if (req.method === 'POST' && route === 'accept-invite') {
      const input = parse(res, schemas.acceptInvite, req);
      if (!input) return;
      result = await svc.acceptInvite(deps, ctx, input);
    } else {
      // Signed-in routes: the access token is checked against the database every time.
      const onlyPasswordChange = route === 'me' || route === 'change-password';
      const auth = await svc.authenticate(deps, bearer(req), onlyPasswordChange);
      if (!auth) return fail(res, 401, 'Sign in to continue');

      if (req.method === 'GET' && route === 'me') result = await svc.me(deps, auth);
      else if (req.method === 'POST' && route === 'change-password') {
        const input = parse(res, schemas.changePassword, req);
        if (!input) return;
        result = await svc.changePassword(deps, ctx, auth, input);
      }
      else if (req.method === 'GET' && route === 'sessions') result = await svc.listSessions(deps, auth);
      else if (req.method === 'DELETE' && route === 'sessions') result = await svc.revokeAllSessions(deps, ctx, auth);
      else if (req.method === 'DELETE' && /^sessions\/[0-9a-f-]{36}$/.test(route)) {
        result = await svc.revokeSession(deps, ctx, auth, route.split('/')[1]);
      } else if (req.method === 'POST' && route === '2fa/setup') result = await svc.twoFactorSetup(deps, auth);
      else if (req.method === 'POST' && route === '2fa/enable') {
        const input = parse(res, schemas.totpEnable, req);
        if (!input) return;
        result = await svc.twoFactorEnable(deps, ctx, auth, input.code);
      } else if (req.method === 'POST' && route === '2fa/disable') {
        const input = parse(res, schemas.totpDisable, req);
        if (!input) return;
        result = await svc.twoFactorDisable(deps, ctx, auth, input);
      } else {
        return fail(res, 404, 'Not found');
      }
    }

    const headers: Record<string, string> = {};
    if (result.retryAfter) headers['Retry-After'] = String(result.retryAfter);
    if (result.refresh) {
      res.setHeader('Set-Cookie', result.refresh === 'clear' ? clearRefreshCookie() : refreshCookie(result.refresh.value));
    }
    return send(res, result.status, result.body ?? {}, headers);
  } catch (err) {
    // Log the failure without request bodies, tokens or passwords.
    console.error(`[auth] ${req.method} ${route} failed: ${(err as Error).message}`);
    return fail(res, 500, 'Something went wrong. Try again.');
  }
}
