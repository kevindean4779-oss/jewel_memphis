import type { OrderState } from './types';
import { authed, session } from '../auth/client';

// Shared orders go through /api/orders with the signed-in session. The server checks the
// orders permission on every request.

export interface OrderRow {
  id: string;
  customer_name: string;
  ornament: string;
  status: 'draft' | 'sent';
  data: OrderState;
  updated_at: string;
}

export const isSignedIn = (): boolean => session.user !== null;

export async function saveOrderRemote(s: OrderState): Promise<void> {
  await authed('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      id: s.orderNo,
      customer_name: s.cust.name.trim(),
      ornament: s.cust.ornament.trim(),
      status: s.sent ? 'sent' : 'draft',
      data: s,
    }),
  });
}

export async function listOrdersRemote(): Promise<OrderRow[]> {
  return authed<OrderRow[]>('/api/orders', { method: 'GET' });
}
