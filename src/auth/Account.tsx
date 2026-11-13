import { useEffect, useState } from 'react';
import { authed, changeOwnPin, session, signOut } from './client';

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

        <ChangePin onChanged={() => setMsg('Your PIN is changed.')} onError={setErr} />

        <div className="actions">
          <button className="btn ghost" onClick={async () => { await signOut(); onClose(); }}>Sign out</button>
          <button className="btn dark" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ChangePin({ onChanged, onError }: { onChanged: () => void; onError: (m: string) => void }) {
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^\d{4,6}$/.test(next) && next === again;
  return (
    <>
      <div className="sec">Change my PIN</div>
      <div className="fields">
        <label className="field"><span>New PIN (4 to 6 digits)</span>
          <input type="password" inputMode="numeric" maxLength={6} value={next} onChange={e => setNext(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="field"><span>Type it again</span>
          <input type="password" inputMode="numeric" maxLength={6} value={again} onChange={e => setAgain(e.target.value.replace(/\D/g, ''))} /></label>
      </div>
      <button className="btn" disabled={busy || !valid} onClick={async () => {
        setBusy(true);
        try { await changeOwnPin(next); setNext(''); setAgain(''); onChanged(); }
        catch (e) { onError((e as Error).message || 'Could not change the PIN.'); }
        finally { setBusy(false); }
      }}>Save new PIN</button>
    </>
  );
}
