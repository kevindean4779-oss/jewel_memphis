import type { OrderState } from './types';

// Shared orders go through the /api/orders route, which checks the staff PIN and
// holds the database key. Orders always stay in this device's draft even when sync fails.
const PIN_KEY = 'custom-order-staff-pin';

export interface OrderRow {
  id: string;
  customer_name: string;
  ornament: string;
  status: 'draft' | 'sent';
  data: OrderState;
  updated_at: string;
}

export function getPin(): string | null {
  try { return localStorage.getItem(PIN_KEY); } catch { return null; }
}

export function setPin(pin: string): void {
  try { localStorage.setItem(PIN_KEY, pin); } catch { /* keep for this session only */ }
}

export function clearPin(): void {
  try { localStorage.removeItem(PIN_KEY); } catch { /* nothing to clear */ }
}

export class PinError extends Error {}

async function api(path: string, init: RequestInit = {}, pin: string): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-staff-pin': pin, ...(init.headers ?? {}) },
  });
  if (res.status === 401) throw new PinError('Wrong PIN');
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}

export async function saveOrderRemote(s: OrderState, pin: string): Promise<void> {
  await api('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      id: s.orderNo,
      customer_name: s.cust.name.trim(),
      ornament: s.cust.ornament.trim(),
      status: s.sent ? 'sent' : 'draft',
      data: s,
    }),
  }, pin);
}

export async function listOrdersRemote(pin: string): Promise<OrderRow[]> {
  const res = await api('/api/orders', { method: 'GET' }, pin);
  return (await res.json()) as OrderRow[];
}
