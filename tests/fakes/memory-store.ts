import { randomUUID } from 'node:crypto';
import type { AdminUserQuery, AuditEntry, AuditRow, SessionRow, Store, TokenRow, TokenType, UserRow, UserStatus } from '../../api/_lib/store';
import type { Role } from '../../api/_lib/rbac';

// In-memory Store for service tests. Behaves like the Postgres version
// (conditional updates, last-Admin guard, append-only audit).
export class MemoryStore implements Store {
  users: UserRow[] = [];
  sessions: SessionRow[] = [];
  tokens: TokenRow[] = [];
  backup: { user_id: string; code_hash: string; used: boolean }[] = [];
  audit: AuditEntry[] = [];
  private hits = new Map<string, { count: number; start: number }>();
  clock = () => Date.now();

  async listUsers(q: AdminUserQuery) {
    let rows = this.users.filter(u => (q.status === 'deleted' ? Boolean(u.deleted_at) : !u.deleted_at));
    if (q.status && q.status !== 'deleted') rows = rows.filter(u => u.status === q.status);
    if (q.role) rows = rows.filter(u => u.role === q.role);
    if (q.search) {
      const term = q.search.toLowerCase();
      rows = rows.filter(u => u.email.includes(term) || u.name.toLowerCase().includes(term));
    }
    const key = q.sort;
    rows = [...rows].sort((a, b) => {
      const x = (a[key as keyof UserRow] ?? '') as string;
      const y = (b[key as keyof UserRow] ?? '') as string;
      return (x < y ? -1 : x > y ? 1 : 0) * (q.dir === 'asc' ? 1 : -1);
    });
    const from = (q.page - 1) * q.pageSize;
    return { rows: rows.slice(from, from + q.pageSize), total: rows.length };
  }
  async listAudit(page: number, pageSize: number) {
    const all: AuditRow[] = this.audit.map((a, i) => ({ ...a, id: i + 1, occurred_at: new Date(this.clock()).toISOString() }));
    const rows = [...all].reverse();
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length };
  }
  async countActiveAdmins() {
    return this.users.filter(u => u.role === 'admin' && u.status === 'active' && !u.deleted_at).length;
  }

  async getUserByEmail(email: string) {
    return this.users.find(u => u.email === email && !u.deleted_at) ?? null;
  }
  async findUserByPinLookup(lookup: string) {
    return this.users.find(u => u.pin_lookup === lookup && !u.deleted_at) ?? null;
  }
  async getUserById(id: string) {
    return this.users.find(u => u.id === id && !u.deleted_at) ?? null;
  }
  async createUser(row: Partial<UserRow> & { email: string; role: Role; status: UserStatus }) {
    const u: UserRow = {
      id: randomUUID(), name: '', password_hash: null, email_verified_at: null, totp_secret_enc: null,
      totp_enabled: false, totp_last_step: null, must_change_password: false, pin_lookup: null, failed_attempts: 0, locked_until: null, last_login_at: null,
      deleted_at: null, created_at: new Date().toISOString(), ...row,
    };
    this.users.push(u);
    return u;
  }
  async updateUser(id: string, patch: Partial<UserRow>) {
    const u = this.users.find(x => x.id === id);
    if (u) Object.assign(u, patch);
  }
  async createSession(row: Omit<SessionRow, 'revoked_at' | 'revoke_reason'>) {
    this.sessions.push({ ...row, revoked_at: null, revoke_reason: null });
  }
  async getSessionByHash(hash: string) {
    return this.sessions.find(s => s.refresh_token_hash === hash) ?? null;
  }
  async getSessionById(id: string) {
    return this.sessions.find(s => s.id === id) ?? null;
  }
  async revokeSessionIfActive(id: string, reason: string) {
    const s = this.sessions.find(x => x.id === id);
    if (!s || s.revoked_at) return false;
    s.revoked_at = new Date().toISOString();
    s.revoke_reason = reason;
    return true;
  }
  async revokeFamily(familyId: string, reason: string) {
    for (const s of this.sessions) if (s.family_id === familyId && !s.revoked_at) { s.revoked_at = new Date().toISOString(); s.revoke_reason = reason; }
  }
  async revokeUserSessions(userId: string, reason: string, exceptId?: string) {
    for (const s of this.sessions) if (s.user_id === userId && !s.revoked_at && s.id !== exceptId) { s.revoked_at = new Date().toISOString(); s.revoke_reason = reason; }
  }
  async listSessions(userId: string) {
    return this.sessions.filter(s => s.user_id === userId && !s.revoked_at && new Date(s.expires_at) > new Date());
  }
  async touchSession(id: string, ip: string | null, userAgent: string | null) {
    const s = this.sessions.find(x => x.id === id);
    if (s) { s.last_used_at = new Date().toISOString(); s.ip = ip; s.user_agent = userAgent; }
  }
  async createToken(row: Omit<TokenRow, 'used_at'>) {
    this.tokens.push({ ...row, used_at: null });
  }
  async getToken(hash: string, type: TokenType) {
    return this.tokens.find(t => t.token_hash === hash && t.type === type) ?? null;
  }
  async consumeToken(id: string) {
    const t = this.tokens.find(x => x.id === id);
    if (!t || t.used_at) return false;
    t.used_at = new Date().toISOString();
    return true;
  }
  async invalidateTokens(userId: string, type: TokenType) {
    for (const t of this.tokens) if (t.user_id === userId && t.type === type && !t.used_at) t.used_at = new Date().toISOString();
  }
  async replaceBackupCodes(userId: string, hashes: string[]) {
    this.backup = this.backup.filter(b => b.user_id !== userId);
    for (const h of hashes) this.backup.push({ user_id: userId, code_hash: h, used: false });
  }
  async consumeBackupCode(userId: string, hash: string) {
    const b = this.backup.find(x => x.user_id === userId && x.code_hash === hash && !x.used);
    if (!b) return false;
    b.used = true;
    return true;
  }
  async deleteBackupCodes(userId: string) {
    this.backup = this.backup.filter(b => b.user_id !== userId);
  }
  async appendAudit(entry: AuditEntry) {
    this.audit.push({ ...entry });
  }
  async rateLimit(key: string, windowSeconds: number, max: number) {
    const now = this.clock();
    const cur = this.hits.get(key);
    if (!cur || now - cur.start >= windowSeconds * 1000) {
      this.hits.set(key, { count: 1, start: now });
      return { allowed: 1 <= max, retryAfterSeconds: windowSeconds };
    }
    cur.count += 1;
    const retry = Math.max(0, Math.ceil((cur.start + windowSeconds * 1000 - now) / 1000));
    return { allowed: cur.count <= max, retryAfterSeconds: retry };
  }
  async setUserAccess(actorId: string, targetId: string, change: { role?: Role; status?: UserStatus; delete?: boolean }) {
    void actorId;
    const target = this.users.find(u => u.id === targetId && !u.deleted_at);
    if (!target) throw new Error('not_found');
    const isActiveAdmin = (u: UserRow) => u.role === 'admin' && u.status === 'active' && !u.deleted_at;
    const leavesAdminRole = change.delete || (change.role && change.role !== 'admin') || (change.status && change.status !== 'active');
    if (isActiveAdmin(target) && leavesAdminRole) {
      const others = this.users.filter(u => isActiveAdmin(u) && u.id !== targetId);
      if (others.length === 0) throw new Error('last_admin');
    }
    if (change.delete) Object.assign(target, { deleted_at: new Date().toISOString(), status: 'suspended' });
    else Object.assign(target, { ...(change.role ? { role: change.role } : {}), ...(change.status ? { status: change.status } : {}) });
  }
}

export function makeUser(store: MemoryStore, partial: Partial<UserRow> & { email: string; role?: Role; status?: UserStatus }) {
  return store.createUser({
    role: 'user',
    status: 'active',
    email_verified_at: new Date().toISOString(),
    ...partial,
    name: partial.name ?? 'Test',
  } as Partial<UserRow> & { email: string; role: Role; status: UserStatus });
}
