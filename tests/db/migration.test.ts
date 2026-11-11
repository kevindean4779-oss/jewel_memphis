import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261111000000_auth_admin.sql'), 'utf8');

let db: PGlite;

async function addUser(email: string, role: string, status = 'active') {
  const r = await db.query<{ id: string }>(
    `insert into public.users (email, role, status) values ($1, $2, $3) returning id`,
    [email, role, status],
  );
  return r.rows[0].id;
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(sql);
});

describe('audit log is append-only', () => {
  it('rejects UPDATE and DELETE', async () => {
    await db.query(`insert into public.audit_log (action) values ('user.create')`);
    await expect(db.query(`update public.audit_log set action = 'x'`)).rejects.toThrow(/append-only/);
    await expect(db.query(`delete from public.audit_log`)).rejects.toThrow(/append-only/);
  });
  it('rejects TRUNCATE', async () => {
    await expect(db.exec(`truncate public.audit_log`)).rejects.toThrow(/append-only/);
  });
  it('accepts INSERT', async () => {
    await db.query(`insert into public.audit_log (action, details) values ('user.role_change', '{"from":"user","to":"manager"}')`);
    const r = await db.query<{ n: number }>(`select count(*)::int as n from public.audit_log`);
    expect(r.rows[0].n).toBe(1);
  });
});

describe('rate limiter', () => {
  it('allows up to the max and then blocks', async () => {
    const results = [];
    for (let i = 0; i < 6; i++) {
      const r = await db.query<{ allowed: boolean; retry_after_seconds: number }>(
        `select * from public.rate_limit_hit('login:1.2.3.4', 900, 5)`,
      );
      results.push(r.rows[0]);
    }
    expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
    expect(results[5].allowed).toBe(false);
    expect(results[5].retry_after_seconds).toBeGreaterThan(0);
  });
  it('keeps separate counters per key', async () => {
    for (let i = 0; i < 5; i++) await db.query(`select * from public.rate_limit_hit('reset:a', 900, 5)`);
    const other = await db.query<{ allowed: boolean }>(`select * from public.rate_limit_hit('reset:b', 900, 5)`);
    expect(other.rows[0].allowed).toBe(true);
  });
});

describe('last-Admin guard', () => {
  it('blocks demoting the only active Admin', async () => {
    const admin = await addUser('owner@example.com', 'admin');
    await expect(
      db.query(`select public.update_user_access($1, $1, 'user', null, false)`, [admin]),
    ).rejects.toThrow(/last_admin/);
  });
  it('blocks suspending or deleting the only active Admin', async () => {
    const admin = await addUser('owner@example.com', 'admin');
    await expect(db.query(`select public.update_user_access($1, $1, null, 'suspended', false)`, [admin])).rejects.toThrow(/last_admin/);
    await expect(db.query(`select public.update_user_access($1, $1, null, null, true)`, [admin])).rejects.toThrow(/last_admin/);
  });
  it('allows the change when another active Admin remains', async () => {
    const a = await addUser('a@example.com', 'admin');
    const b = await addUser('b@example.com', 'admin');
    await db.query(`select public.update_user_access($1, $2, 'user', null, false)`, [a, b]);
    const r = await db.query<{ role: string }>(`select role from public.users where id = $1`, [b]);
    expect(r.rows[0].role).toBe('user');
  });
  it('lets a manager be changed freely', async () => {
    const admin = await addUser('owner@example.com', 'admin');
    const m = await addUser('m@example.com', 'manager');
    await db.query(`select public.update_user_access($1, $2, 'user', null, false)`, [admin, m]);
    const r = await db.query<{ role: string }>(`select role from public.users where id = $1`, [m]);
    expect(r.rows[0].role).toBe('user');
  });
});

describe('schema defaults and constraints', () => {
  it('defaults new users to User role and invited status', async () => {
    await db.query(`insert into public.users (email) values ('new@example.com')`);
    const r = await db.query<{ role: string; status: string }>(`select role, status from public.users`);
    expect(r.rows[0]).toEqual({ role: 'user', status: 'invited' });
  });
  it('rejects unknown roles and non-lowercase emails', async () => {
    await expect(db.query(`insert into public.users (email, role) values ('x@example.com', 'root')`)).rejects.toThrow();
    await expect(db.query(`insert into public.users (email) values ('Mixed@Example.com')`)).rejects.toThrow();
  });
  it('enables row-level security on every auth table', async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relname in ('users','sessions','auth_tokens','backup_codes','audit_log','rate_limits')`,
    );
    expect(r.rows.length).toBe(6);
    expect(r.rows.every(x => x.relrowsecurity)).toBe(true);
  });
});
