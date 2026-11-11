import { createClient } from '@supabase/supabase-js';

// Server-side only: the service role key bypasses row-level security.
// It must be set in Vercel as SUPABASE_SERVICE_ROLE_KEY, never with a VITE_ prefix.
export function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}
