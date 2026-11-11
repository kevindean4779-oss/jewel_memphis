-- Run once in the Supabase SQL editor. Safe to re-run.
-- The app reaches these tables only through the Vercel API routes, which use the
-- service role key. Row-level security is on with no policies, so the public
-- (anon) key cannot read or write them.

create table if not exists public.custom_orders (
  id text primary key,                 -- order number, e.g. CO-2041
  customer_name text not null default '',
  ornament text not null default '',
  status text not null default 'draft' check (status in ('draft', 'sent')),
  data jsonb not null,                 -- full order state
  updated_at timestamptz not null default now()
);
alter table public.custom_orders enable row level security;

-- Remove the open policies from the first setup, if they exist.
drop policy if exists "counter read orders" on public.custom_orders;
drop policy if exists "counter write orders" on public.custom_orders;
drop policy if exists "counter update orders" on public.custom_orders;

create table if not exists public.metal_rates (
  id text primary key default 'spot',
  gold numeric not null,               -- USD per troy ounce
  silver numeric not null,
  platinum numeric not null,
  provider text not null,
  fetched_at timestamptz not null default now()
);
alter table public.metal_rates enable row level security;
