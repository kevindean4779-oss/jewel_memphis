import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST, insertOrder, toRow, validateOrder } from '../api/orders';
import { buildOrderRecord } from '../src/order/orders';
import { blankOrder, reduce, type Action } from '../src/order/state';
import { KARATS, METALS, STONES, STONE_KEYS } from '../src/order/data';
import { METALS as API_METALS, STONES as API_STONES } from '../api/orders';
import type { OrderState } from '../src/order/types';

const live = { gold: 4000, silver: 50, platinum: 1600, updatedAt: '2026-11-10T12:00:00Z', source: 'metalpriceapi.com' };

function order(patch: Partial<OrderState> = {}): OrderState {
  const s = ([
    { type: 'cust', key: 'name', value: 'Meera Sharma' },
    { type: 'cust', key: 'phone', value: '901 555 0123' },
    { type: 'cust', key: 'ornament', value: 'Lotus pendant' },
    { type: 'mode', mode: 'dims' },
    { type: 'continueToEstimate' },
    { type: 'generateCad' },
  ] as Action[]).reduce(reduce, blankOrder('CO-261110-ABCD'));
  return { ...s, checks: { details: true, design: true, price: true, deposit: true }, lockedSpot: live, sentAt: '2026-11-10T18:00:00.000Z', ...patch };
}

const rec = (patch: Partial<OrderState> = {}) => buildOrderRecord(order(patch), new Date(2026, 10, 10)) as Record<string, any>;

afterEach(() => { vi.unstubAllGlobals(); });

describe('app record ↔ server validation', () => {
  it('server and app offer the same materials', () => {
    expect([...API_METALS].sort()).toEqual([...METALS].sort());
    expect([...API_STONES].sort()).toEqual([...STONE_KEYS].sort());
  });

  it('every metal, stone, deposit and mode the app can send passes validation', () => {
    for (const metal of METALS) for (const stone of STONE_KEYS) for (const deposit of [25, 50, 100]) for (const mode of ['dims', 'picture'] as const) {
      const r = rec({ metal, stone, deposit, mode });
      expect(validateOrder(r), `${metal}/${stone}/${deposit}/${mode}`).toEqual([]);
      expect(r.metal_label).toBe(KARATS[metal].label);
      expect(r.stone_label).toBe(STONES[stone].label);
    }
  });

  it('extreme valid sizes and long text still pass', () => {
    const big = rec({ dims: { w: 88, h: 88, d: 125 }, metal: 'PT950', cust: { ...order().cust, notes: 'x'.repeat(1000), name: 'N'.repeat(120) } });
    expect(validateOrder(big)).toEqual([]);
    expect(validateOrder(rec({ dims: { w: 4.5, h: 4.5, d: 4.5 } }))).toEqual([]);
  });

  it('refuses an order priced at sample rates', () => {
    expect(validateOrder(rec({ lockedSpot: { ...live, source: 'sample values' } }))).toContain('order must be priced at live rates');
  });

  it('refuses tampered totals', () => {
    const r = rec();
    expect(validateOrder({ ...r, total: r.total - 100 })).toContain('total does not add up');
    expect(validateOrder({ ...r, deposit_amount: 1 })).toContain('deposit_amount does not match deposit_pct');
    expect(validateOrder({ ...r, metal_cost: r.metal_cost / 2, subtotal: r.subtotal - r.metal_cost / 2 })).toEqual(expect.arrayContaining([expect.stringMatching(/metal_cost|tax|total/)]));
  });

  it('refuses bad shapes and values', () => {
    const r = rec();
    for (const [k, v] of [
      ['id', 'not-a-uuid'], ['order_no', 'CO-1'], ['customer_phone', '123'], ['customer_email', 'nope'],
      ['metal', '18K'], ['stone', 'ruby'], ['width_mm', 0], ['depth_mm', 500], ['deposit_pct', 33],
      ['needed_by', '2026-02-30'], ['cad_exact', false], ['spot_gold', 1], ['total', -1], ['total', NaN],
      ['customer_name', ''], ['notes', 'x'.repeat(1001)], ['sent_at', 'yesterday'],
    ] as const) {
      expect(validateOrder({ ...r, [k]: v }).length, `${k}=${String(v)}`).toBeGreaterThan(0);
    }
    for (const junk of [null, [], 'x', 5]) expect(validateOrder(junk).length).toBeGreaterThan(0);
  });

  it('only known columns reach the database', () => {
    const row = toRow({ ...rec(), is_admin: true, status: 'picked_up', created_at: '1999-01-01' });
    expect(row).not.toHaveProperty('is_admin');
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('created_at');
  });

  it('blank optional text is stored as null', () => {
    const row = toRow(rec({ cust: { ...order().cust, email: '  ', notes: '' } }));
    expect(row.customer_email).toBeNull();
    expect(row.notes).toBeNull();
  });
});

describe('Supabase insert', () => {
  const env = { SUPABASE_URL: 'https://proj.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' };
  const row = toRow(rec());

  it('upserts on id, ignoring duplicates, with the secret key in apikey only', async () => {
    const f = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', f);
    const res = await insertOrder(row, env);
    expect(res.status).toBe(201);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://proj.supabase.co/rest/v1/orders?on_conflict=id');
    const h = init.headers as Record<string, string>;
    expect(h.apikey).toBe('sb_secret_abc');
    expect(h.Authorization).toBeUndefined();
    expect(h.Prefer).toContain('resolution=ignore-duplicates');
    expect(JSON.parse(init.body as string).id).toBe(row.id);
  });

  it('sends a legacy service_role JWT as a bearer token too', async () => {
    const f = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', f);
    await insertOrder(row, { SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOi.x.y' });
    expect(((f.mock.calls[0] as any)[1].headers as Record<string, string>).Authorization).toBe('Bearer eyJhbGciOi.x.y');
  });

  it('is unavailable (503, retryable) when not configured', async () => {
    expect((await insertOrder(row, {})).status).toBe(503);
  });

  it('maps errors: duplicate order number 409, bad row 422, bad key 503, network 503', async () => {
    const cases: [() => Promise<Response>, number][] = [
      [async () => Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 }), 409],
      [async () => Response.json({ code: '23514', message: 'violates check constraint' }, { status: 400 }), 422],
      [async () => Response.json({ message: 'Invalid API key' }, { status: 401 }), 503],
      [async () => new Response('oops', { status: 500 }), 503],
      [async () => { throw new TypeError('fetch failed'); }, 503],
    ];
    for (const [impl, status] of cases) {
      vi.stubGlobal('fetch', vi.fn(impl));
      const res = await insertOrder(row, env);
      expect(res.status).toBe(status);
      expect(JSON.stringify(await res.json())).not.toContain('sb_secret_abc');
    }
  });
});

describe('POST /api/orders', () => {
  const req = (body: string, type = 'application/json') => new Request('http://x/api/orders', { method: 'POST', headers: { 'content-type': type }, body });

  it('rejects non-JSON, bad JSON, oversized and invalid bodies', async () => {
    expect((await POST(req('{}', 'text/plain'))).status).toBe(415);
    expect((await POST(req('{nope'))).status).toBe(400);
    expect((await POST(req(JSON.stringify({ notes: 'x'.repeat(40000) })))).status).toBe(413);
    const bad = await POST(req(JSON.stringify({ id: 'x' })));
    expect(bad.status).toBe(400);
    expect((await bad.json()).problems.length).toBeGreaterThan(3);
  });

  it('stores a valid order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 201 })));
    process.env.SUPABASE_URL = 'https://p.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_x';
    try {
      const res = await POST(req(JSON.stringify(rec())));
      expect(res.status).toBe(201);
      expect((await res.json()).order_no).toBe('CO-261110-ABCD');
    } finally {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });
});
