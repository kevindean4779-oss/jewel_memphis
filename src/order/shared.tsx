import { useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { KARATS, METALS, STEP_NAMES, STONES, STONE_KEYS, STORE, type Metal, type StoneKey } from './data';
import { metalRate } from './pricing';
import { rateTime, refreshRates, useRates, type RateStatus } from './rates';
import { money } from './format';
import { IconRotate, IconX } from './icons';
import type { Action } from './state';
import type { OrderState } from './types';

export interface StepProps {
  s: OrderState;
  dispatch: Dispatch<Action>;
}

/* ---------- Layout ---------- */

export function Page({ step, title, desc, aside, children }: {
  step: number; title: ReactNode; desc?: ReactNode; aside?: ReactNode; children: ReactNode;
}) {
  return (
    <main id="main">
      <div className="page-head">
        <div>
          <div className="eyebrow">Step {step + 1} of {STEP_NAMES.length}</div>
          <h1>{title}</h1>
          {desc && <p>{desc}</p>}
        </div>
        {aside}
      </div>
      {children}
    </main>
  );
}

export function ActionBar({ info, children }: { info?: ReactNode; children: ReactNode }) {
  return (
    <div className="actionbar">
      <div className="actionbar-inner">
        <div className="info" aria-live="polite">{info}</div>
        {children}
      </div>
    </div>
  );
}

export function Card({ title, sub, action, children, className = '' }: {
  title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Data display ---------- */

export function Kv({ label, value, cls = '' }: { label: ReactNode; value: ReactNode; cls?: string }) {
  return (
    <div className={`kv ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function Total({ label, value, note }: { label: ReactNode; value: number; note?: ReactNode }) {
  return (
    <div className="total">
      <span className="t-label">{label}</span>
      <div>
        <div className="t-value">{money(value)}</div>
        {note && <div className="t-note">{note}</div>}
      </div>
    </div>
  );
}

export function Proportions({ share, legend = true }: { share: { metal: number; stone: number; making: number }; legend?: boolean }) {
  return (
    <>
      <div className="bar" role="img" aria-label={`Metal ${share.metal.toFixed(0)}%, stones ${share.stone.toFixed(0)}%, making ${share.making.toFixed(0)}%`}>
        <i style={{ flex: share.metal, background: 'var(--metal)' }} />
        <i style={{ flex: share.stone, background: 'var(--stone)' }} />
        <i style={{ flex: share.making, background: 'var(--making)' }} />
      </div>
      {legend && (
        <div className="legend">
          <span><i style={{ background: 'var(--metal)' }} />Metal {share.metal.toFixed(0)}%</span>
          <span><i style={{ background: 'var(--stone)' }} />Stones {share.stone.toFixed(0)}%</span>
          <span><i style={{ background: 'var(--making)' }} />Making {share.making.toFixed(0)}%</span>
        </div>
      )}
    </>
  );
}

/* ---------- Inputs ---------- */

// Keeps the typed text locally, so partial input such as "12." or an empty field is not
// overwritten while typing; the parsed number (NaN when empty) is reported on every change.
export function NumField({ label, value, unit = 'mm', invalid = false, onChange }: {
  label: string; value: number; unit?: string; invalid?: boolean; onChange: (n: number) => void;
}) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
  useEffect(() => {
    // Follow outside changes (e.g. a restored draft) without fighting the person typing.
    setText(t => (parseFloat(t) === value || (!Number.isFinite(value) && t.trim() === '') ? t : Number.isFinite(value) ? String(value) : ''));
  }, [value]);
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="affix">
        <input
          className="input num"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern="[0-9]*[.,]?[0-9]*"
          aria-invalid={invalid || undefined}
          value={text}
          onChange={e => {
            const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 7);
            setText(raw);
            onChange(raw === '' || raw === '.' ? NaN : parseFloat(raw));
          }}
          onBlur={() => { if (Number.isFinite(value)) setText(String(value)); }}
        />
        <span className="unit">{unit}</span>
      </span>
    </label>
  );
}

export function Choices<T extends string>({ label, options, value, onChange, render }: {
  label: string; options: readonly T[]; value: T | ''; onChange: (v: T) => void; render: (v: T) => ReactNode;
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {options.map(k => (
        <button key={k} type="button" className="choice" aria-pressed={value === k} onClick={() => onChange(k)}>
          {render(k)}
        </button>
      ))}
    </div>
  );
}

export function MetalChips({ s, dispatch }: StepProps) {
  return (
    <Choices<Metal> label="Metal" options={METALS} value={s.metal}
      onChange={metal => dispatch({ type: 'metal', metal })} render={k => KARATS[k].label} />
  );
}

export function StoneChips({ s, dispatch }: StepProps) {
  return (
    <Choices<StoneKey> label="Stones" options={STONE_KEYS} value={s.stone}
      onChange={stone => dispatch({ type: 'stone', stone })} render={k => STONES[k].label} />
  );
}

/* ---------- Dialog ---------- */

export function RatesModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { spot, status, error } = useRates();
  const spotRows: [string, number][] = [
    ['Gold', spot.gold],
    ['Silver', spot.silver],
    ['Platinum', spot.platinum],
  ];
  return (
    <div className="scrim" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="rates-title" onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <div>
            <h2 id="rates-title">Metal rates</h2>
            <div className="card-sub">USD · {spot.source} · {rateTime(spot)}</div>
          </div>
          <button ref={closeRef} className="btn ghost icon" aria-label="Close" onClick={onClose}><IconX /></button>
        </div>
        <div className="row"><RateBadge status={status} /><span className="spacer" />
          <button className="btn" onClick={() => refreshRates()}><IconRotate size={16} />Refresh</button>
        </div>
        <div className="section-label">Your metals <span>per gram</span></div>
        <table className="table">
          <tbody>
            {METALS.map(m => (
              <tr key={m}><td>{KARATS[m].label}</td><td className="n">{money(metalRate(m))}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="section-label">Spot <span>per troy ounce</span></div>
        <table className="table">
          <tbody>
            {spotRows.map(([label, v]) => (
              <tr key={label}><td>{label}</td><td className="n">{money(v)}</td></tr>
            ))}
          </tbody>
        </table>
        {status === 'sample' && <p className="notice warn">Live prices could not be loaded{error ? ` (${error})` : ''}. These are sample values; check prices before quoting.</p>}
        {status === 'stale' && <p className="notice warn">Showing the last saved prices from {rateTime(spot)}{error ? `. Live feed: ${error}` : ''}.</p>}
        <p className="faint">Stone prices are set by the store and do not change with the market.</p>
      </div>
    </div>
  );
}

const STATUS_TEXT: Record<RateStatus, [string, string]> = {
  live: ['ok', 'Live'],
  stale: ['warn', 'Last saved'],
  sample: ['bad', 'Sample prices'],
  loading: ['', 'Loading'],
};

export function RateBadge({ status }: { status: RateStatus }) {
  const [cls, text] = STATUS_TEXT[status];
  return <span className={`badge ${cls}`}><span className="live-dot" />{text}</span>;
}

export const TAX_SHORT = STORE.taxLabel.split(' (')[0].toLowerCase();
