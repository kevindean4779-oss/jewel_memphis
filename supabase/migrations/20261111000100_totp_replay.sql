-- Stores the last accepted TOTP time step, so a code can't be used twice.
alter table public.users add column if not exists totp_last_step bigint;
