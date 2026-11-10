-- Run once in the Supabase SQL editor.
-- Orders are shared by anyone holding the app's anon key. Add sign-in and
-- tighter policies before the app is used outside the store.

create table if not exists public.custom_orders (
  id text primary key,                 -- order number, e.g. CO-2041
  customer_name text not null default '',
  ornament text not null default '',
  status text not null default 'draft' check (status in ('draft', 'sent')),
  data jsonb not null,                 -- full order state
  updated_at timestamptz not null default now()
);

alter table public.custom_orders enable row level security;

create policy "counter read orders" on public.custom_orders
  for select to anon using (true);

create policy "counter write orders" on public.custom_orders
  for insert to anon with check (true);

create policy "counter update orders" on public.custom_orders
  for update to anon using (true) with check (true);
