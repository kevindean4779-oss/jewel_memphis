import type { Role } from './rbac';
import { serviceClient } from './supabase';

// Data access for auth. The service layer depends on this interface only, so tests
// can use an in-memory version. SupabaseStore is the production implementation.

export type UserStatus = 'invited' | 'active' | 'suspended';
export type TokenType = 'verify' | 'reset' | 'invite';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  role: Role;
  status: UserStatus;
  email_verified_at: string | null;
  totp_secret_enc: string | null;
  totp_enabled: boolean;
  totp_last_step: number | null;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  family_id: string;
  refresh_token_hash: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  ip: string | null;
  user_agent: string | null;
}

export interface TokenRow {
  id: string;
  user_id: string;
  type: TokenType;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  actor_id: string | null;
  action: string;
  target_id: string | null;
  ip: string | null;
  user_agent: string | null;
  details?: Record<string, unknown>;
}

export interface Store {
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(id: string): Promise<UserRow | null>;
  createUser(row: Partial<UserRow> & { email: string; role: Role; status: UserStatus }): Promise<UserRow>;
  updateUser(id: string, patch: Partial<UserRow>): Promise<void>;

  createSession(row: Omit<SessionRow, 'revoked_at' | 'revoke_reason'>): Promise<void>;
  getSessionByHash(hash: string): Promise<SessionRow | null>;
  getSessionById(id: string): Promise<SessionRow | null>;
  /** Revokes only if still active. Returns false if another request got there first. */
  revokeSessionIfActive(id: string, reason: string): Promise<boolean>;
  revokeFamily(familyId: string, reason: string): Promise<void>;
  revokeUserSessions(userId: string, reason: string, exceptId?: string): Promise<void>;
  listSessions(userId: string): Promise<SessionRow[]>;
  touchSession(id: string, ip: string | null, userAgent: string | null): Promise<void>;

  createToken(row: Omit<TokenRow, 'used_at'>): Promise<void>;
  getToken(hash: string, type: TokenType): Promise<TokenRow | null>;
  /** Marks a token used only if it isn't yet. Returns false if already used. */
  consumeToken(id: string): Promise<boolean>;
  invalidateTokens(userId: string, type: TokenType): Promise<void>;

  replaceBackupCodes(userId: string, hashes: string[]): Promise<void>;
  consumeBackupCode(userId: string, hash: string): Promise<boolean>;
  deleteBackupCodes(userId: string): Promise<void>;

  appendAudit(entry: AuditEntry): Promise<void>;
  rateLimit(key: string, windowSeconds: number, max: number): Promise<{ allowed: boolean; retryAfterSeconds: number }>;

  setUserAccess(
    actorId: string,
    targetId: string,
    change: { role?: Role; status?: UserStatus; delete?: boolean },
  ): Promise<void>;
}

const nowIso = () => new Date().toISOString();

export class SupabaseStore implements Store {
  private db = serviceClient();

  private async one<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
    const { data, error } = await p;
    if (error) throw new Error(error.message);
    return data;
  }

  private async ok(p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
    const { error } = await p;
    if (error) throw new Error(error.message);
  }

  getUserByEmail(email: string) {
    return this.one<UserRow>(this.db.from('users').select('*').eq('email', email).is('deleted_at', null).maybeSingle());
  }

  getUserById(id: string) {
    return this.one<UserRow>(this.db.from('users').select('*').eq('id', id).is('deleted_at', null).maybeSingle());
  }

  async createUser(row: Partial<UserRow> & { email: string; role: Role; status: UserStatus }) {
    const created = await this.one<UserRow>(this.db.from('users').insert(row).select('*').single());
    if (!created) throw new Error('user insert returned no row');
    return created;
  }

  updateUser(id: string, patch: Partial<UserRow>) {
    return this.ok(this.db.from('users').update({ ...patch, updated_at: nowIso() }).eq('id', id));
  }

  createSession(row: Omit<SessionRow, 'revoked_at' | 'revoke_reason'>) {
    return this.ok(this.db.from('sessions').insert(row));
  }

  getSessionByHash(hash: string) {
    return this.one<SessionRow>(this.db.from('sessions').select('*').eq('refresh_token_hash', hash).maybeSingle());
  }

  getSessionById(id: string) {
    return this.one<SessionRow>(this.db.from('sessions').select('*').eq('id', id).maybeSingle());
  }

  async revokeSessionIfActive(id: string, reason: string) {
    const { data, error } = await this.db
      .from('sessions')
      .update({ revoked_at: nowIso(), revoke_reason: reason })
      .eq('id', id)
      .is('revoked_at', null)
      .select('id');
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) === 1;
  }

  revokeFamily(familyId: string, reason: string) {
    return this.ok(
      this.db.from('sessions').update({ revoked_at: nowIso(), revoke_reason: reason }).eq('family_id', familyId).is('revoked_at', null),
    );
  }

  revokeUserSessions(userId: string, reason: string, exceptId?: string) {
    let q = this.db.from('sessions').update({ revoked_at: nowIso(), revoke_reason: reason }).eq('user_id', userId).is('revoked_at', null);
    if (exceptId) q = q.neq('id', exceptId);
    return this.ok(q);
  }

  async listSessions(userId: string) {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .gt('expires_at', nowIso())
      .order('last_used_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SessionRow[];
  }

  touchSession(id: string, ip: string | null, userAgent: string | null) {
    return this.ok(this.db.from('sessions').update({ last_used_at: nowIso(), ip, user_agent: userAgent }).eq('id', id));
  }

  createToken(row: Omit<TokenRow, 'used_at'>) {
    return this.ok(this.db.from('auth_tokens').insert(row));
  }

  getToken(hash: string, type: TokenType) {
    return this.one<TokenRow>(this.db.from('auth_tokens').select('*').eq('token_hash', hash).eq('type', type).maybeSingle());
  }

  async consumeToken(id: string) {
    const { data, error } = await this.db
      .from('auth_tokens')
      .update({ used_at: nowIso() })
      .eq('id', id)
      .is('used_at', null)
      .select('id');
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) === 1;
  }

  invalidateTokens(userId: string, type: TokenType) {
    return this.ok(this.db.from('auth_tokens').update({ used_at: nowIso() }).eq('user_id', userId).eq('type', type).is('used_at', null));
  }

  async replaceBackupCodes(userId: string, hashes: string[]) {
    await this.deleteBackupCodes(userId);
    return this.ok(this.db.from('backup_codes').insert(hashes.map(code_hash => ({ user_id: userId, code_hash }))));
  }

  async consumeBackupCode(userId: string, hash: string) {
    const { data, error } = await this.db
      .from('backup_codes')
      .update({ used_at: nowIso() })
      .eq('user_id', userId)
      .eq('code_hash', hash)
      .is('used_at', null)
      .select('id');
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) === 1;
  }

  deleteBackupCodes(userId: string) {
    return this.ok(this.db.from('backup_codes').delete().eq('user_id', userId));
  }

  appendAudit(entry: AuditEntry) {
    return this.ok(this.db.from('audit_log').insert({ ...entry, details: entry.details ?? {} }));
  }

  async rateLimit(key: string, windowSeconds: number, max: number) {
    const { data, error } = await this.db.rpc('rate_limit_hit', { p_key: key, p_window_seconds: windowSeconds, p_max: max });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return { allowed: Boolean(row?.allowed), retryAfterSeconds: Number(row?.retry_after_seconds ?? windowSeconds) };
  }

  async setUserAccess(actorId: string, targetId: string, change: { role?: Role; status?: UserStatus; delete?: boolean }) {
    const { error } = await this.db.rpc('update_user_access', {
      p_actor: actorId,
      p_target: targetId,
      p_role: change.role ?? null,
      p_status: change.status ?? null,
      p_delete: Boolean(change.delete),
    });
    if (error) throw new Error(error.message);
  }
}
