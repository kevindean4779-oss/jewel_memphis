-- Accounts, sessions, one-time tokens, 2FA backup codes, audit log and rate limits.
-- Apply once. Safe to inspect first. The app reaches these tables only through
-- the server routes with the service role key. Row-level security is on with
-- no policies, so the public (anon) key has no access.

-- ── Users ────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  password_hash text,                       -- Argon2id; null until the invite is accepted
  role text not null default 'user' check (role in ('admin', 'manager', 'user')),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  email_verified_at timestamptz,
  totp_secret_enc text,                     -- AES-GCM ciphertext; null until 2FA is set up
  totp_enabled boolean not null default false,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  deleted_at timestamptz,                   -- soft delete keeps audit history intact
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_lowercase check (email = lower(email))
);
create unique index if not exists users_email_active_key on public.users (email) where deleted_at is null;

-- ── Sessions (refresh tokens, stored hashed) ─────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  family_id uuid not null,                  -- all rotations of one login share a family
  refresh_token_hash text not null unique,  -- SHA-256 of the cookie value
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoke_reason text,                       -- 'logout' | 'rotated' | 'reuse' | 'revoked' | 'suspended' | 'password_reset' | 'deleted'
  ip text,
  user_agent text
);
create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists sessions_family_idx on public.sessions (family_id);

-- ── One-time tokens: email verification, password reset, invitation ──────
create table if not exists public.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('verify', 'reset', 'invite')),
  token_hash text not null unique,          -- SHA-256 of the emailed token
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auth_tokens_user_idx on public.auth_tokens (user_id);

-- ── 2FA backup codes (hashed, single use) ────────────────────────────────
create table if not exists public.backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists backup_codes_user_idx on public.backup_codes (user_id);

-- ── Audit log: append-only ───────────────────────────────────────────────
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  target_id uuid,
  ip text,
  user_agent text,
  details jsonb not null default '{}'::jsonb
);

create or replace function public.audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_immutable();

-- ── Rate limits (fixed window, atomic) ───────────────────────────────────
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null,
  window_start timestamptz not null
);

create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql as $$
declare
  v_hits integer;
  v_start timestamptz;
begin
  insert into public.rate_limits as r (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning r.hits, r.window_start into v_hits, v_start;

  allowed := v_hits <= p_max;
  retry_after_seconds := greatest(0, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::integer);
  return next;
end;
$$;

-- ── Admin changes with the last-Admin guard ──────────────────────────────
-- Locks the active Admin rows, so two Admins acting at once can't both remove
-- the last Admin. Raises 'last_admin' if the change would leave no active Admin.
create or replace function public.update_user_access(
  p_actor uuid,
  p_target uuid,
  p_role text,
  p_status text,
  p_delete boolean
) returns void
language plpgsql as $$
declare
  v_target public.users%rowtype;
  v_remaining integer;
begin
  select * into v_target from public.users where id = p_target for update;
  if not found then raise exception 'not_found'; end if;

  if v_target.role = 'admin' and v_target.status = 'active' and v_target.deleted_at is null
     and (p_delete or p_role <> 'admin' or p_status <> 'active') then
    perform 1 from public.users where role = 'admin' and status = 'active' and deleted_at is null for update;
    select count(*) into v_remaining from public.users
      where role = 'admin' and status = 'active' and deleted_at is null and id <> p_target;
    if v_remaining = 0 then raise exception 'last_admin'; end if;
  end if;

  if p_delete then
    update public.users set deleted_at = now(), status = 'suspended', updated_at = now() where id = p_target;
  else
    update public.users set role = coalesce(p_role, role), status = coalesce(p_status, status), updated_at = now()
      where id = p_target;
  end if;
end;
$$;

-- ── Row-level security: on, with no public policies ──────────────────────
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.auth_tokens enable row level security;
alter table public.backup_codes enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
