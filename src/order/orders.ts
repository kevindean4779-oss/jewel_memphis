// Sends finished orders to /api/orders (which writes them to Supabase).
// Orders wait in an outbox in this browser until the server confirms them, so an order
// taken while offline, or during a server outage, is still saved once the tablet reconnects.
// The server ignores duplicate ids, so retrying is always safe.
import { useEffect, useSyncExternalStore } from 'react';
import { KARATS, MAKING, STONES, STORE } from './data';
import { isoOf } from './format';
import { cents, price, readyDate } from './pricing';
import type { OrderState } from './types';

export type SyncStatus = 'pending' | 'saved' | 'rejected';

export interface OutboxItem {
  id: string;
  orderNo: string;
  record: Record<string, unknown>;
  status: SyncStatus;
  attempts: number;
  error: string | null;
  nextTry: number; // epoch ms
}

const KEY = 'gj-order-outbox';
const KEEP_SAVED = 25; // keep a short history of confirmed orders for the status display

/** The database row for an order, priced at the rates frozen when the price was agreed. */
export function buildOrderRecord(s: OrderState, now: Date = new Date()): Record<string, unknown> {
  if (!s.lockedSpot) throw new Error('Price must be agreed before sending');
  const spot = s.lockedSpot;
  const p = price(s.dims, s.metal, s.stone, s.mode, s.exact, spot);
  const deposit = cents((p.total * s.deposit) / 100);
  const c = s.cust;
  return {
    id: s.id,
    order_no: s.orderNo,
    sent_at: s.sentAt ?? now.toISOString(),
    customer_name: c.name.trim(),
    customer_phone: c.phone.trim(),
    customer_email: c.email.trim() || null,
    ornament: c.ornament.trim(),
    occasion: c.occasion || null,
    needed_by: c.needed || null,
    notes: c.notes.trim() || null,
    design_mode: s.mode,
    width_mm: s.dims.w,
    height_mm: s.dims.h,
    depth_mm: s.dims.d,
    cad_exact: s.exact,
    metal: s.metal,
    metal_label: KARATS[s.metal].label,
    metal_grams: Math.round(p.grams * 1000) / 1000,
    metal_rate_per_gram: Math.round(p.rate * 10000) / 10000,
    stone: s.stone,
    stone_label: STONES[s.stone].label,
    stone_carats: STONES[s.stone].carat,
    metal_cost: p.metal,
    stone_cost: p.stone,
    making_cost: MAKING,
    subtotal: p.subtotal,
    tax_rate: STORE.taxRate,
    tax: p.tax,
    total: p.total,
    deposit_pct: s.deposit,
    deposit_amount: deposit,
    balance_due: cents(p.total - deposit),
    ready_date: isoOf(readyDate(s.metal, s.stone, s.mode, now)),
    spot_gold: spot.gold,
    spot_silver: spot.silver,
    spot_platinum: spot.platinum,
    rates_source: spot.source,
    rates_at: spot.updatedAt || null,
  };
}

/* ---------------- Outbox store ---------------- */

function load(): OutboxItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter(i => i && typeof i.id === 'string' && i.record) : [];
  } catch {
    return [];
  }
}

let items: OutboxItem[] = load();
const listeners = new Set<() => void>();

function save() {
  const saved = items.filter(i => i.status === 'saved');
  const keep = new Set(saved.slice(-KEEP_SAVED).map(i => i.id));
  items = items.filter(i => i.status !== 'saved' || keep.has(i.id));
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked */ }
  items = [...items];
  listeners.forEach(l => l());
}

function update(id: string, patch: Partial<OutboxItem>) {
  items = items.map(i => (i.id === id ? { ...i, ...patch } : i));
  save();
}

/** Queues an order and tries to send it straight away. Queuing the same id twice is a no-op. */
export function submitOrder(record: Record<string, unknown>): void {
  const id = String(record.id);
  if (!items.some(i => i.id === id)) {
    items = [...items, { id, orderNo: String(record.order_no), record, status: 'pending', attempts: 0, error: null, nextTry: 0 }];
    save();
  }
  void flush();
}

// Retry delay: 5 s, 10 s, 20 s … capped at 5 minutes.
const backoff = (attempts: number) => Math.min(5 * 60_000, 5000 * 2 ** Math.max(0, attempts - 1));

let flushing: Promise<void> | null = null;

/** Sends every pending order that is due. Safe to call often; runs one pass at a time. */
export function flush(force = false): Promise<void> {
  flushing ??= (async () => {
    for (const item of items.filter(i => i.status === 'pending' && (force || i.nextTry <= Date.now()))) {
      await sendOne(item);
    }
  })().finally(() => { flushing = null; });
  return flushing;
}

async function sendOne(item: OutboxItem): Promise<void> {
  const attempts = item.attempts + 1;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.record),
      signal: ctl.signal,
    });
    const body = await res.json().catch(() => null) as { error?: string; problems?: string[] } | null;
    if (res.ok) return update(item.id, { status: 'saved', attempts, error: null });
    const msg = [body?.error || `HTTP ${res.status}`, ...(body?.problems ?? [])].join(': ');
    // 400/409/413/415/422: the order itself was refused, so retrying the same data cannot help.
    if ([400, 409, 413, 415, 422].includes(res.status)) return update(item.id, { status: 'rejected', attempts, error: msg });
    update(item.id, { attempts, error: msg, nextTry: Date.now() + backoff(attempts) });
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'Timed out' : navigator.onLine === false ? 'Offline' : 'Network error';
    update(item.id, { attempts, error: msg, nextTry: Date.now() + backoff(attempts) });
  } finally {
    clearTimeout(timer);
  }
}

/** Lets staff retry a rejected order after the cause (for example server config) is fixed. */
export function retry(id: string) {
  update(id, { status: 'pending', nextTry: 0, error: null });
  void flush(true);
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => items;

export function useOutbox(): OutboxItem[] {
  return useSyncExternalStore(subscribe, snapshot);
}

/** Keeps the outbox draining: on start, when back online, when the tablet wakes, and every 30 s. */
export function useOutboxSync() {
  useEffect(() => {
    void flush(true);
    const tick = () => void flush();
    const online = () => void flush(true);
    const wake = () => { if (document.visibilityState === 'visible') void flush(true); };
    const id = window.setInterval(tick, 30_000);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', wake);
    // Other tabs on this device may change the outbox too.
    const storage = (e: StorageEvent) => { if (e.key === KEY) { items = load(); listeners.forEach(l => l()); } };
    window.addEventListener('storage', storage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('storage', storage);
    };
  }, []);
}
