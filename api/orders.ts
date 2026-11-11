import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/supabase';
import { hasStaffPin } from './_lib/auth';
import { authenticate } from './_lib/auth-service';
import { bearerToken } from './_lib/http';
import { SupabaseStore } from './_lib/store';
import { defaultMailer } from './_lib/mailer';
import { appUrl } from './_lib/config';
import { can } from './_lib/rbac';

// Shared orders. Every request needs the staff PIN in the x-staff-pin header.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  // Signed-in staff with the orders permission, or the shared staff PIN while it is still
  // in use. Remove STAFF_PIN once every staff member has an account.
  try {
    const deps = { store: new SupabaseStore(), mailer: defaultMailer(), appUrl: appUrl() };
    const auth = await authenticate(deps, bearerToken(req));
    const allowed = (auth && can(auth.user.role, 'orders:use')) || hasStaffPin(req);
    if (!allowed) return res.status(401).json({ error: 'Sign in to continue' });

    const sb = serviceClient();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('custom_orders')
        .select('id, customer_name, ornament, status, data, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return res.json(data ?? []);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body.id !== 'string' || typeof body.data !== 'object') {
        return res.status(400).json({ error: 'Invalid order' });
      }
      const row = {
        id: body.id.slice(0, 40),
        customer_name: String(body.customer_name ?? '').slice(0, 200),
        ornament: String(body.ornament ?? '').slice(0, 200),
        status: body.status === 'sent' ? 'sent' : 'draft',
        data: body.data,
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from('custom_orders').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders request failed', err);
    return res.status(500).json({ error: 'Order request failed' });
  }
}
