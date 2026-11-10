import { beforeEach, describe, expect, it, vi } from 'vitest';

const record = (id = '6f1c2a9e-4b7d-4c1e-9a2b-3c4d5e6f7a8b') => ({ id, order_no: 'CO-261110-ABCD', total: 10 });

async function fresh() {
  vi.resetModules();
  return import('../src/order/orders');
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('order outbox', () => {
  it('marks an order saved when the server accepts it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: true }, { status: 201 })));
    const ob = await fresh();
    ob.submitOrder(record());
    await ob.flush(true);
    expect(JSON.parse(localStorage.getItem('gj-order-outbox')!)[0].status).toBe('saved');
  });

  it('keeps an order pending through outages and retries later', async () => {
    const f = vi.fn(async () => Response.json({ error: 'Supabase error (HTTP 500)' }, { status: 503 }));
    vi.stubGlobal('fetch', f);
    const ob = await fresh();
    ob.submitOrder(record());
    await ob.flush(true);
    let item = JSON.parse(localStorage.getItem('gj-order-outbox')!)[0];
    expect(item.status).toBe('pending');
    expect(item.nextTry).toBeGreaterThan(Date.now());
    await ob.flush(); // not due yet: no new request
    const calls = f.mock.calls.length;
    await ob.flush();
    expect(f.mock.calls.length).toBe(calls);

    f.mockImplementation(async () => Response.json({ ok: true }, { status: 201 }));
    await ob.flush(true);
    item = JSON.parse(localStorage.getItem('gj-order-outbox')!)[0];
    expect(item.status).toBe('saved');
  });

  it('survives a network failure (offline)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const ob = await fresh();
    ob.submitOrder(record());
    await ob.flush(true);
    const item = JSON.parse(localStorage.getItem('gj-order-outbox')!)[0];
    expect(item.status).toBe('pending');
    expect(item.error).toMatch(/Network error|Offline/);
  });

  it('stops retrying an order the server refuses, until staff retry', async () => {
    const f = vi.fn(async () => Response.json({ error: 'Order failed validation', problems: ['total does not add up'] }, { status: 400 }));
    vi.stubGlobal('fetch', f);
    const ob = await fresh();
    ob.submitOrder(record());
    await ob.flush(true);
    const item = JSON.parse(localStorage.getItem('gj-order-outbox')!)[0];
    expect(item.status).toBe('rejected');
    expect(item.error).toContain('total does not add up');
    await ob.flush(true);
    expect(f).toHaveBeenCalledTimes(1);
    f.mockImplementation(async () => Response.json({ ok: true }, { status: 201 }));
    ob.retry(record().id);
    await ob.flush(true);
    expect(JSON.parse(localStorage.getItem('gj-order-outbox')!)[0].status).toBe('saved');
  });

  it('queuing the same order twice sends it once', async () => {
    const f = vi.fn(async () => Response.json({ ok: true }, { status: 201 }));
    vi.stubGlobal('fetch', f);
    const ob = await fresh();
    ob.submitOrder(record());
    ob.submitOrder(record());
    await ob.flush(true);
    expect(JSON.parse(localStorage.getItem('gj-order-outbox')!)).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('unsent orders survive a page reload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    let ob = await fresh();
    ob.submitOrder(record('11111111-1111-4111-8111-111111111111'));
    await ob.flush(true);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: true }, { status: 201 })));
    ob = await fresh(); // simulates reopening the app
    await ob.flush(true);
    expect(JSON.parse(localStorage.getItem('gj-order-outbox')!)[0].status).toBe('saved');
  });

  it('ignores a corrupted outbox', async () => {
    localStorage.setItem('gj-order-outbox', '{not json');
    const ob = await fresh();
    expect(() => ob.submitOrder(record())).not.toThrow();
  });
});
