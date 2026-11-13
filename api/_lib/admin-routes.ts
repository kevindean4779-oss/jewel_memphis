import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticate, type Deps, type Result } from './auth-service.js';
import { bearerToken, clientIp, fail, routeFrom, send, userAgent } from './http.js';
import { ROLES } from './rbac.js';
import * as admin from './admin-service.js';

// Routes under /api/admin. Every request needs a signed-in account. Each action then
// checks its permission in the service layer, so a direct API call is refused too.

const page = z.coerce.number().int().min(1).default(1);
const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'invited', 'suspended', 'deleted']).optional(),
  sort: z.enum(['email', 'name', 'role', 'status', 'created_at', 'last_login_at']).default('created_at'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page,
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const inviteBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(ROLES).default('user'),
});
const updateBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  role: z.enum(ROLES).optional(),
}).refine(v => Object.keys(v).length > 0, 'Nothing to change');
const bootstrapBody = z.object({
  setupToken: z.string().min(20).max(200),
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(120),
  pin: z.string().regex(/^\d{4,6}$/, 'Use a PIN of 4 to 6 digits'),
});

function body(req: VercelRequest): unknown {
  return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return undefined; } })() : req.body;
}

export async function routeAdmin(
  req: VercelRequest,
  res: VercelResponse,
  deps: Deps,
  setupToken: string | undefined,
): Promise<void> {
  const route = routeFrom(req, 'admin');
  const ctx = { ip: clientIp(req), userAgent: userAgent(req) };
  const method = req.method ?? 'GET';

  if (method !== 'GET' && (req.headers.origin === undefined || req.headers['x-requested-with'] !== 'app')) {
    return fail(res, 403, 'Request not allowed');
  }

  try {
    if (method === 'POST' && route === 'bootstrap') {
      const parsed = bootstrapBody.safeParse(body(req) ?? {});
      if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);
      return reply(res, await admin.bootstrapAdmin(deps, ctx, parsed.data, setupToken));
    }

    const auth = await authenticate(deps, bearerToken(req));
    if (!auth) return fail(res, 401, 'Sign in to continue');

    const parts = route.split('/');
    const id = parts[1];
    const uuid = /^[0-9a-f-]{36}$/;

    if (method === 'GET' && route === 'users') {
      const q = listQuery.safeParse(req.query);
      if (!q.success) return fail(res, 400, q.error.issues[0].message);
      return reply(res, await admin.listUsers(deps, auth, q.data));
    }
    if (method === 'POST' && route === 'users') {
      const parsed = inviteBody.safeParse(body(req) ?? {});
      if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);
      return reply(res, await admin.createAccount(deps, ctx, auth, parsed.data));
    }
    if (parts[0] === 'users' && id && uuid.test(id)) {
      const action = parts[2];
      if (method === 'GET' && !action) return reply(res, await admin.getUser(deps, auth, id));
      if (method === 'PATCH' && !action) {
        const parsed = updateBody.safeParse(body(req) ?? {});
        if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);
        return reply(res, await admin.updateUser(deps, ctx, auth, id, parsed.data));
      }
      if (method === 'POST' && action === 'suspend') return reply(res, await admin.suspendUser(deps, ctx, auth, id));
      if (method === 'POST' && action === 'reactivate') return reply(res, await admin.reactivateUser(deps, ctx, auth, id));
      if (method === 'POST' && action === 'reset-pin') return reply(res, await admin.resetPin(deps, ctx, auth, id));
      if (method === 'DELETE' && !action) return reply(res, await admin.deleteUser(deps, ctx, auth, id));
    }
    if (method === 'GET' && route === 'audit') {
      const p = z.object({ page, pageSize: z.coerce.number().int().min(1).max(100).default(50) }).safeParse(req.query);
      if (!p.success) return fail(res, 400, p.error.issues[0].message);
      return reply(res, await admin.listAudit(deps, auth, p.data.page, p.data.pageSize));
    }
    return fail(res, 404, 'Not found');
  } catch (err) {
    console.error(`[admin] ${method} ${route} failed: ${(err as Error).message}`);
    return fail(res, 500, 'Something went wrong. Try again.');
  }
}

function reply(res: VercelResponse, r: Result) {
  const headers: Record<string, string> = {};
  if (r.retryAfter) headers['Retry-After'] = String(r.retryAfter);
  return send(res, r.status, r.body ?? {}, headers);
}
