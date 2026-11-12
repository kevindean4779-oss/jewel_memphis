import { useEffect, useState } from 'react';
import { ApiError, authed, refresh, session, signOut } from './client';
import SetupLink from './SetupLink';

interface SessionRow { id: string; createdAt: string; lastUsedAt: string; ip: string | null; userAgent: string | null; current: boolean }

function describeUa(ua: string | null) {
  if (!ua) return 'Unknown device';
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Browser';
}

export function AccountModal({ onClose }: { onClose: () => void }) {
  const me = session.user!;
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => authed<{ sessions: SessionRow[] }>('/api/auth/sessions').then(r => setSessions(r.sessions)).catch(e => setErr(String(e.message)));
  useEffect(() => { void reload(); }, []);

  const revoke = async (id: string) => {
    setErr(null);
    try { await authed(`/api/auth/sessions/${id}`, { method: 'DELETE' }); await reload(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <div className="sec">Your account <span className="hint">{me.email}</span></div>
        {err && <div className="note bad">{err}</div>}
        {msg && <div className="note ok">{msg}</div>}

        <div className="sec">Signed-in devices</div>
        {sessions.map(s => (
          <div className="kv" key={s.id} style={{ alignItems: 'center' }}>
            <span>{describeUa(s.userAgent)}{s.current ? ' · this device' : ''}<br /><small>Last used {new Date(s.lastUsedAt).toLocaleString()}</small></span>
            {!s.current && <button className="btn" onClick={() => revoke(s.id)}>Sign out</button>}
          </div>
        ))}
        <button className="link" style={{ alignSelf: 'flex-start' }} onClick={async () => {
          try { await authed('/api/auth/sessions', { method: 'DELETE' }); } catch { /* signed out below */ }
          await signOut();
        }}>Sign out everywhere</button>

        <TwoFactor enabled={me.totpEnabled} onChanged={() => setMsg('Two-factor settings saved.')} onError={setErr} />

        <div className="actions">
          <button className="btn ghost" onClick={async () => { await signOut(); onClose(); }}>Sign out</button>
          <button className="btn dark" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function TwoFactor({ enabled, onChanged, onError }: { enabled: boolean; onChanged: () => void; onError: (m: string) => void }) {
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const fail = (e: unknown) => onError(e instanceof ApiError || e instanceof Error ? e.message : 'Something went wrong.');

  if (backupCodes) {
    return (
      <>
        <div className="sec">Backup codes</div>
        <p className="muted">Save these somewhere safe. Each works once, and they won't be shown again.</p>
        <div className="fields">{backupCodes.map(c => <code key={c} style={{ fontSize: 16 }}>{c}</code>)}</div>
        <button className="btn primary" onClick={() => { setBackupCodes(null); onChanged(); }}>I have saved them</button>
      </>
    );
  }

  if (enabled) {
    return (
      <>
        <div className="sec">Two-factor sign-in <span className="hint">on</span></div>
        <div className="fields">
          <label className="field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="field"><span>Current code</span><input inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} /></label>
        </div>
        <button className="btn" disabled={busy || !password || !code} onClick={async () => {
          setBusy(true);
          try { await authed('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password, code }) }); setPassword(''); setCode(''); await refresh(); onChanged(); }
          catch (e) { fail(e); } finally { setBusy(false); }
        }}>Turn off two-factor</button>
      </>
    );
  }

  if (!setup) {
    return (
      <>
        <div className="sec">Two-factor sign-in <span className="hint">off</span></div>
        <p className="muted">Ask for a code from an authenticator app each time you sign in.</p>
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { setSetup(await authed<{ secret: string; otpauth: string }>('/api/auth/2fa/setup', { method: 'POST' })); }
          catch (e) { fail(e); } finally { setBusy(false); }
        }}>Set up two-factor</button>
      </>
    );
  }

  return (
    <>
      <div className="sec">Set up two-factor</div>
      <p className="muted">Add this key to an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.</p>
      <SetupLink text={setup.otpauth} />
      <code style={{ wordBreak: 'break-all' }}>{setup.secret}</code>
      <label className="field"><span>6-digit code</span><input inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} /></label>
      <button className="btn primary" disabled={busy || code.length !== 6} onClick={async () => {
        setBusy(true);
        try {
          const r = await authed<{ backupCodes: string[] }>('/api/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
          setSetup(null); setCode(''); setBackupCodes(r.backupCodes); await refresh();
        } catch (e) { fail(e); } finally { setBusy(false); }
      }}>Turn on two-factor</button>
    </>
  );
}
