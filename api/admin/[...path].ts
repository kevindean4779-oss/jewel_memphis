import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appUrl } from '../_lib/config';
import { defaultMailer } from '../_lib/mailer';
import { SupabaseStore } from '../_lib/store';
import { routeAdmin } from '../_lib/admin-routes';
import { fail } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const deps = { store: new SupabaseStore(), mailer: defaultMailer(), appUrl: appUrl() };
    return await routeAdmin(req, res, deps, process.env.SETUP_TOKEN);
  } catch (err) {
    console.error(`[admin] setup failed: ${(err as Error).message}`);
    return fail(res, 500, 'Something went wrong. Try again.');
  }
}
