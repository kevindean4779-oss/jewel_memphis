import { useState } from 'react';
import { ApiError, pinSignIn } from './client';

// The only sign-in screen: a personal PIN on a large keypad.

const MIN = 4;
const MAX = 6;

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429 && e.retryAfter) return `Too many attempts. Try again in ${Math.ceil(e.retryAfter / 60)} minutes.`;
    return e.message;
  }
  return 'Something went wrong. Try again.';
}

export function PinScreen() {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (value.length < MIN || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await pinSignIn(value);
    } catch (e) {
      setErr(errorText(e));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (pin.length >= MAX || busy) return;
    setErr(null);
    setPin(pin + digit);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="app pin-screen">
      <main className="pin-main">
        <section className="card pin-card" aria-labelledby="pin-title">
          <div className="pin-brand" aria-hidden="true">GJ</div>
          <div className="sec">Golden Jewelers</div>
          <h1 id="pin-title" className="pin-title">Enter your PIN</h1>
          <p className="muted">Use the personal PIN your manager gave you.</p>

          <div className="pin-dots" role="status" aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: MAX }, (_, i) => (
              <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
            ))}
          </div>

          {err && <div className="note bad" role="alert">{err}</div>}

          <div className="pin-keys" role="group" aria-label="PIN keypad">
            {keys.map((k, i) => k === ''
              ? <span key={i} />
              : k === '⌫'
                ? <button key={i} className="pin-key ghost" aria-label="Delete last digit" onClick={() => { setPin(pin.slice(0, -1)); setErr(null); }} disabled={busy || pin.length === 0}>⌫</button>
                : <button key={i} className="pin-key" onClick={() => press(k)} disabled={busy}>{k}</button>)}
          </div>

          <button className="btn primary lg pin-submit" disabled={busy || pin.length < MIN} onClick={() => submit(pin)}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <p className="faint pin-hint">{MIN} to {MAX} digits. Ask your manager if you've forgotten your PIN.</p>
        </section>
      </main>
    </div>
  );
}
