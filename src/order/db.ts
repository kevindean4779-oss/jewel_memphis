import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { OrderState } from './types';

// Shared order storage. Without Supabase settings the app keeps orders on this device only.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export interface OrderRow {
  id: string;
  customer_name: string;
  ornament: string;
  status: 'draft' | 'sent';
  data: OrderState;
  updated_at: string;
}

export async function saveOrderRemote(s: OrderState): Promise<void> {
  if (!supabase) return;
  const row = {
    id: s.orderNo,
    customer_name: s.cust.name.trim(),
    ornament: s.cust.ornament.trim(),
    status: s.sent ? 'sent' : 'draft',
    data: s,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('custom_orders').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function listOrdersRemote(): Promise<OrderRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('custom_orders')
    .select('id, customer_name, ornament, status, data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}
