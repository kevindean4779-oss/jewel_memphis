-- Accounts created by an Admin get a temporary password. The person must choose their own on first sign-in.
alter table public.users add column if not exists must_change_password boolean not null default false;
