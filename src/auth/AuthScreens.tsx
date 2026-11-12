import { useState, type FormEvent } from 'react';
import { ApiError, changePassword, post, signIn, signInWithCode } from './client';

// Screens for sign-in, password reset, email verification and invitations.
// Links from email arrive as ?auth=<screen>&token=<one-time token>.

type Screen = 'login' | 'forgot' | 'reset' | 'invite' | 'verify';

export function screenFromUrl(): { screen: Screen; token: string | null } {
  const p = new URLSearchParams(window.location.search);
  const a = p.get('auth');
  const screen: Screen = a === 'reset' || a === 'invite' || a === 'verify' || a === 'forgot' ? a : 'login';
  return { screen, token: p.get('token') };
}

function clearUrl() {
  window.history.replaceState({}, '', window.location.pathname);
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app" style={{ justifyContent: 'center', minHeight: '100dvh' }}>
      <main style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>
        <section className="card">
          <div className="sec">Golden Jewelers</div>
          <h2 style={{ font: "600 26px 'Cormorant Garamond', serif", margin: 0 }}>{title}</h2>
          {children}
        </section>
      </main>
    </div>
  );
}

function Err({ msg }: { msg: string | null }) {
  return msg ? <div className="note bad">{msg}</div> : null;
}

function ErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429 && e.retryAfter) return `Too many attempts. Try again in ${Math.ceil(e.retryAfter / 60)} minutes.`;
    return e.message;
  }
  return 'Something went wrong. Try again.';
}

export function AuthScreen({ screen: initial, token }: { screen: Screen; token: string | null }) {
  const [screen, setScreen] = useState<Screen>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [backup, setBackup] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try { await fn(); } catch (e) { setErr(ErrorText(e)); } finally { setBusy(false); }
  };

  const submit = (fn: () => Promise<void>) => (e: FormEvent) => { e.preventDefault(); void run(fn); };

  if (screen === 'login' && mfaToken) {
    return (
      <Shell title="Enter your code">
        <p className="muted">{backup ? 'Enter one of your backup codes.' : 'Enter the 6-digit code from your authenticator app.'}</p>
        <form onSubmit={submit(async () => { await signInWithCode(mfaToken, code, backup); clearUrl(); })} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field"><span>{backup ? 'Backup code' : 'Code'}</span>
            <input inputMode={backup ? 'text' : 'numeric'} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></label>
          <Err msg={err} />
          <button className="btn primary lg" disabled={busy || !code}>Sign in</button>
          <button type="button" className="link" onClick={() => { setBackup(!backup); setCode(''); }}>{backup ? 'Use the app code instead' : 'Use a backup code'}</button>
        </form>
      </Shell>
    );
  }

  if (screen === 'login') {
    return (
      <Shell title="Sign in">
        <form onSubmit={submit(async () => {
          const r = await signIn(email, password);
          if (!r.done) setMfaToken(r.mfaToken);
          else clearUrl();
        })} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <Err msg={err} />
          <button className="btn primary lg" disabled={busy || !email || !password}>Sign in</button>
          <button type="button" className="link" onClick={() => { setErr(null); setScreen('forgot'); }}>Forgot your password?</button>
        </form>
      </Shell>
    );
  }

  if (screen === 'forgot') {
    return (
      <Shell title="Reset your password">
        {note ? <p className="muted">{note}</p> : (
          <form onSubmit={submit(async () => { await post('/api/auth/forgot-password', { email }); setNote('If an account exists for that email, we sent a link. Check your inbox.'); })} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
            <Err msg={err} />
            <button className="btn primary lg" disabled={busy || !email}>Send reset link</button>
          </form>
        )}
        <button className="link" style={{ marginTop: 14 }} onClick={() => { setNote(null); setScreen('login'); }}>Back to sign in</button>
      </Shell>
    );
  }

  if (screen === 'reset' || screen === 'invite') {
    const isInvite = screen === 'invite';
    return (
      <Shell title={isInvite ? 'Welcome — set your password' : 'Choose a new password'}>
        {note ? (
          <>
            <p className="muted">{note}</p>
            <button className="btn primary lg" onClick={() => { clearUrl(); setNote(null); setScreen('login'); }}>Go to sign in</button>
          </>
        ) : (
          <form onSubmit={submit(async () => {
            if (isInvite) await post('/api/auth/accept-invite', { token, password, name: code || undefined });
            else await post('/api/auth/reset-password', { token, password });
            setNote('Your password is set. You can sign in now.');
          })} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isInvite && <label className="field"><span>Your name</span><input value={code} onChange={e => setCode(e.target.value)} /></label>}
            <label className="field"><span>New password (12 characters or more)</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
            <Err msg={err} />
            <button className="btn primary lg" disabled={busy || password.length < 12 || !token}>{isInvite ? 'Set password' : 'Save password'}</button>
          </form>
        )}
      </Shell>
    );
  }

  // verify
  return (
    <Shell title="Verify your email">
      {note ? <p className="muted">{note}</p> : (
        <>
          <Err msg={err} />
          <button className="btn primary lg" disabled={busy || !token} onClick={() => run(async () => { await post('/api/auth/verify-email', { token }); setNote('Your email is verified. Sign in to continue.'); })}>Confirm my email</button>
        </>
      )}
      <button className="link" style={{ marginTop: 14 }} onClick={() => { clearUrl(); setScreen('login'); }}>Back to sign in</button>
    </Shell>
  );
}

// Shown after sign-in with a temporary password (set by an Admin). The app is locked until it's changed.
export function ChangePasswordScreen({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mismatch = next.length > 0 && again.length > 0 && next !== again;
  return (
    <Shell title="Choose your password">
      <p className="muted">Your Admin gave you a temporary password. Choose your own to continue.</p>
      <form onSubmit={async e => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try { await changePassword(current, next); onDone(); }
        catch (x) { setErr(ErrorText(x)); }
        finally { setBusy(false); }
      }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="field"><span>Temporary password</span><input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} /></label>
        <label className="field"><span>New password (12 characters or more)</span><input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} /></label>
        <label className="field"><span>Type it again</span><input type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} /></label>
        {mismatch && <div className="note warn">The two passwords don't match.</div>}
        <Err msg={err} />
        <button className="btn primary lg" disabled={busy || !current || next.length < 12 || mismatch || next !== again}>Save and continue</button>
      </form>
    </Shell>
  );
}
