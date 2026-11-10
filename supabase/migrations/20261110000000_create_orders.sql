-- One row per custom order sent to the workshop from the counter app.
-- Rows are written only by the /api/orders server function using the secret key;
-- row level security is on with no policies, so the public (anon) key can neither
-- read nor write this table.

create table if not exists public.orders (
  id                   uuid primary key,                 -- generated on the tablet; makes retries idempotent
  order_no             text not null unique check (order_no ~ '^CO-[0-9]{6}-[A-Z0-9]{4}$'),
  created_at           timestamptz not null default now(),
  sent_at              timestamptz not null,
  status               text not null default 'sent'
                         check (status in ('sent', 'in_workshop', 'ready', 'picked_up', 'cancelled')),

  customer_name        text not null check (char_length(customer_name) between 1 and 120),
  customer_phone       text not null check (char_length(customer_phone) between 1 and 30),
  customer_email       text check (customer_email is null or char_length(customer_email) <= 254),
  ornament             text not null check (char_length(ornament) between 1 and 120),
  occasion             text check (occasion is null or char_length(occasion) <= 40),
  needed_by            date,
  notes                text check (notes is null or char_length(notes) <= 1000),

  design_mode          text not null check (design_mode in ('picture', 'dims')),
  width_mm             numeric(7,2) not null check (width_mm  between 0.5 and 200),
  height_mm            numeric(7,2) not null check (height_mm between 0.5 and 200),
  depth_mm             numeric(7,2) not null check (depth_mm  between 0.5 and 200),
  cad_exact            boolean not null default false,

  metal                text not null check (metal in ('14K', '10K', 'S925', 'PT950')),
  metal_label          text not null,
  metal_grams          numeric(10,3) not null check (metal_grams >= 0),
  metal_rate_per_gram  numeric(10,4) not null check (metal_rate_per_gram >= 0),
  stone                text not null check (stone in ('natural', 'lab', 'moissanite', 'cz5a')),
  stone_label          text not null,
  stone_carats         numeric(8,3) not null check (stone_carats >= 0),

  metal_cost           numeric(12,2) not null check (metal_cost  >= 0),
  stone_cost           numeric(12,2) not null check (stone_cost  >= 0),
  making_cost          numeric(12,2) not null check (making_cost >= 0),
  subtotal             numeric(12,2) not null check (subtotal    >= 0),
  tax_rate             numeric(6,4)  not null check (tax_rate between 0 and 0.25),
  tax                  numeric(12,2) not null check (tax         >= 0),
  total                numeric(12,2) not null check (total       >= 0),
  deposit_pct          smallint not null check (deposit_pct in (25, 50, 100)),
  deposit_amount       numeric(12,2) not null check (deposit_amount >= 0),
  balance_due          numeric(12,2) not null check (balance_due    >= 0),
  ready_date           date not null,

  -- Metal spot prices (USD per troy ounce) the quote was frozen at.
  spot_gold            numeric(12,4) not null,
  spot_silver          numeric(12,4) not null,
  spot_platinum        numeric(12,4) not null,
  rates_source         text not null,
  rates_at             timestamptz
);

create index if not exists orders_sent_at_idx on public.orders (sent_at desc);
create index if not exists orders_phone_idx   on public.orders (customer_phone);

alter table public.orders enable row level security;
