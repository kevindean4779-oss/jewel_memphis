// Vercel serverless function: POST /api/orders
// Validates a sent order and stores it as one row in the Supabase `orders` table.
//
// Environment variables (Vercel → Project → Settings → Environment Variables, or .env.local):
//   SUPABASE_URL                https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   the secret key (sb_secret_… or the legacy service_role JWT).
//                               Server-only: never prefix it with VITE_.
//
// The row's primary key is the order's UUID, and the insert ignores duplicates, so the
// tablet can safely retry a send (after a timeout, or from its offline queue) without
// ever creating a second row.
//
// Kept self-contained (no imports from src/) so Vercel bundles it without path issues.

export const METALS = ['14K', '10K', 'S925', 'PT950'] as const;
export const STONES = ['natural', 'lab', 'moissanite', 'cz5a'] as const;
const MODES = ['picture', 'dims'] as const;
const DEPOSITS = [25, 50, 100] as const;
const DIM = { min: 0.5, max: 200 };
const SPOT = { gold: [500, 20000], silver: [5, 500], platinum: [200, 10000] } as const;
const MAX_MONEY = 1_000_000;
const MAX_BODY = 32 * 1024;

export interface OrderRow {
  id: string;
  order_no: string;
  sent_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  ornament: string;
  occasion: string | null;
  needed_by: string | null;
  notes: string | null;
  design_mode: (typeof MODES)[number];
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  cad_exact: boolean;
  metal: (typeof METALS)[number];
  metal_label: string;
  metal_grams: number;
  metal_rate_per_gram: number;
  stone: (typeof STONES)[number];
  stone_label: string;
  stone_carats: number;
  metal_cost: number;
  stone_cost: number;
  making_cost: number;
  subtotal: number;
  tax_rate: number;
  tax: number;
  total: number;
  deposit_pct: number;
  deposit_amount: number;
  balance_due: number;
  ready_date: string;
  spot_gold: number;
  spot_silver: number;
  spot_platinum: number;
  rates_source: string;
  rates_at: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_NO = /^CO-\d{6}-[A-Z0-9]{4}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isStr = (v: unknown, max: number, min = 0): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const isNum = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const optStr = (v: unknown, max: number) => v === null || v === undefined || v === '' || isStr(v, max);
const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

function realDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const realTime = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Returns a list of problems; an empty list means the row can be stored. */
export function validateOrder(o: any): string[] {
  const e: string[] = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) return ['Body must be a JSON object'];

  if (!isStr(o.id, 36) || !UUID.test(o.id)) e.push('id must be a UUID');
  if (!isStr(o.order_no, 20) || !ORDER_NO.test(o.order_no)) e.push('order_no is invalid');
  if (!realTime(o.sent_at)) e.push('sent_at must be a timestamp');

  if (!isStr(o.customer_name, 120, 1)) e.push('customer_name is required (max 120)');
  if (!isStr(o.customer_phone, 30, 1) || (o.customer_phone.replace(/\D/g, '').length < 10)) e.push('customer_phone needs at least 10 digits');
  if (!optStr(o.customer_email, 254) || (o.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.customer_email))) e.push('customer_email is invalid');
  if (!isStr(o.ornament, 120, 1)) e.push('ornament is required (max 120)');
  if (!optStr(o.occasion, 40)) e.push('occasion is too long');
  if (!(o.needed_by === null || o.needed_by === undefined || realDate(o.needed_by))) e.push('needed_by must be YYYY-MM-DD');
  if (!optStr(o.notes, 1000)) e.push('notes are too long (max 1000)');

  if (!MODES.includes(o.design_mode)) e.push('design_mode is invalid');
  for (const k of ['width_mm', 'height_mm', 'depth_mm']) if (!isNum(o[k], DIM.min, DIM.max)) e.push(`${k} must be ${DIM.min}–${DIM.max}`);
  if (o.cad_exact !== true) e.push('the CAD model must be generated before sending');

  if (!METALS.includes(o.metal)) e.push('metal is not offered');
  if (!STONES.includes(o.stone)) e.push('stone is not offered');
  if (!isStr(o.metal_label, 60, 1) || !isStr(o.stone_label, 60, 1)) e.push('material labels are required');
  if (!isNum(o.metal_grams, 0, 20000)) e.push('metal_grams is invalid'); // a solid platinum piece filling the print tray is ~10 kg
  if (!isNum(o.metal_rate_per_gram, 0, 1000)) e.push('metal_rate_per_gram is invalid');
  if (!isNum(o.stone_carats, 0, 100)) e.push('stone_carats is invalid');

  const money = ['metal_cost', 'stone_cost', 'making_cost', 'subtotal', 'tax', 'total', 'deposit_amount', 'balance_due'];
  const moneyOk = money.every(k => isNum(o[k], 0, MAX_MONEY));
  if (!moneyOk) e.push('amounts must be between 0 and 1,000,000');
  if (!isNum(o.tax_rate, 0, 0.25)) e.push('tax_rate is invalid');
  if (!DEPOSITS.includes(o.deposit_pct)) e.push('deposit_pct must be 25, 50 or 100');
  if (moneyOk && e.length === 0) {
    if (!near(o.subtotal, o.metal_cost + o.stone_cost + o.making_cost)) e.push('subtotal does not add up');
    if (!near(o.tax, o.subtotal * o.tax_rate)) e.push('tax does not match tax_rate');
    if (!near(o.total, o.subtotal + o.tax)) e.push('total does not add up');
    if (!near(o.deposit_amount, (o.total * o.deposit_pct) / 100)) e.push('deposit_amount does not match deposit_pct');
    if (!near(o.balance_due, o.total - o.deposit_amount)) e.push('balance_due does not add up');
    if (!near(o.metal_cost, o.metal_grams * o.metal_rate_per_gram, Math.max(0.05, o.metal_cost * 0.001))) e.push('metal_cost does not match weight × rate');
  }

  if (!realDate(o.ready_date)) e.push('ready_date must be YYYY-MM-DD');
  if (!isNum(o.spot_gold, ...SPOT.gold) || !isNum(o.spot_silver, ...SPOT.silver) || !isNum(o.spot_platinum, ...SPOT.platinum)) e.push('spot rates are missing or implausible');
  if (!isStr(o.rates_source, 60, 1) || o.rates_source === 'sample values') e.push('order must be priced at live rates');
  if (!(o.rates_at === null || o.rates_at === undefined || realTime(o.rates_at))) e.push('rates_at must be a timestamp');
  return e;
}

/** Copies only known columns, so extra fields in the request never reach the database. */
export function toRow(o: any): OrderRow {
  const blank = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    id: o.id.toLowerCase(), order_no: o.order_no, sent_at: o.sent_at,
    customer_name: o.customer_name.trim(), customer_phone: o.customer_phone.trim(), customer_email: blank(o.customer_email),
    ornament: o.ornament.trim(), occasion: blank(o.occasion), needed_by: o.needed_by || null, notes: blank(o.notes),
    design_mode: o.design_mode, width_mm: o.width_mm, height_mm: o.height_mm, depth_mm: o.depth_mm, cad_exact: true,
    metal: o.metal, metal_label: o.metal_label, metal_grams: o.metal_grams, metal_rate_per_gram: o.metal_rate_per_gram,
    stone: o.stone, stone_label: o.stone_label, stone_carats: o.stone_carats,
    metal_cost: o.metal_cost, stone_cost: o.stone_cost, making_cost: o.making_cost, subtotal: o.subtotal,
    tax_rate: o.tax_rate, tax: o.tax, total: o.total,
    deposit_pct: o.deposit_pct, deposit_amount: o.deposit_amount, balance_due: o.balance_due,
    ready_date: o.ready_date, spot_gold: o.spot_gold, spot_silver: o.spot_silver, spot_platinum: o.spot_platinum,
    rates_source: o.rates_source, rates_at: o.rates_at || null,
  };
}

function supabaseHeaders(key: string): Record<string, string> {
  // New-style secret keys go in `apikey` only; legacy JWT keys also go in Authorization.
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function insertOrder(row: OrderRow, env: Record<string, string | undefined>): Promise<Response> {
  const url = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '').trim();
  if (!url || !key) return json({ error: 'Supabase is not configured on the server' }, 503);

  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/orders?on_conflict=id`, {
      method: 'POST',
      headers: { ...supabaseHeaders(key), Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return json({ error: `Could not reach Supabase (${e instanceof Error ? e.name : 'network error'})` }, 503);
  }
  if (res.ok) return json({ ok: true, id: row.id, order_no: row.order_no }, 201);

  const detail = await res.json().catch(() => null) as { code?: string; message?: string } | null;
  // 23505: unique violation on order_no for a different order id. Not retryable as-is.
  if (detail?.code === '23505') return json({ error: 'Order number already used by another order', code: 'duplicate_order_no' }, 409);
  // 4xx from PostgREST other than auth means the row itself was refused (constraint, schema).
  if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) {
    return json({ error: detail?.message || `Supabase refused the order (HTTP ${res.status})` }, 422);
  }
  return json({ error: res.status === 401 || res.status === 403 ? 'Supabase rejected the server key' : `Supabase error (HTTP ${res.status})` }, 503);
}

export async function POST(request: Request): Promise<Response> {
  // Check staff PIN (optional Vercel env secret, for protecting from public access)
  const staffPin = (process.env.STAFF_PIN || '').trim();
  if (staffPin) {
    const provided = (request.headers.get('x-staff-pin') || '').trim();
    if (provided !== staffPin) return json({ error: 'Unauthorized' }, 401);
  }

  if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ error: 'Send JSON' }, 415);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'Order is too large' }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const problems = validateOrder(body);
  if (problems.length) return json({ error: 'Order failed validation', problems }, 400);
  return insertOrder(toRow(body), process.env);
}
