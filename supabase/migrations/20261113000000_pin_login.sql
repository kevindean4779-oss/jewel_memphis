-- Personal PIN sign-in. The PIN is stored as a keyed hash (HMAC) so it can be looked up
-- directly; the key is the server's JWT_SECRET, so the stored value is useless on its own.
alter table public.users add column if not exists pin_lookup text;
create unique index if not exists users_pin_lookup_key on public.users (pin_lookup)
  where pin_lookup is not null and deleted_at is null;
