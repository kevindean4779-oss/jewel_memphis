import type { Dispatch, ReactNode } from 'react';
import { KARATS, METALS, RATES, STONES, STONE_KEYS, STORE, type Metal, type StoneKey } from './data';
import { metalRate } from './pricing';
import { money } from './format';
import type { Action } from './state';
import type { OrderState } from './types';

export interface StepProps {
  s: OrderState;
  dispatch: Dispatch<Action>;
}

export function Kv({ label, value, cls = '' }: { label: ReactNode; value: ReactNode; cls?: string }) {
  return (
    <div className={`kv ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min="0.5"
        step="0.5"
        value={Number.isFinite(value) ? value : ''}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function MetalChips({ s, dispatch }: StepProps) {
  return (
    <div className="chips">
      {METALS.map((k: Metal) => (
        <button key={k} className={`chip ${s.metal === k ? 'on' : ''}`} onClick={() => dispatch({ type: 'metal', metal: k })}>
          {KARATS[k].label}
        </button>
      ))}
    </div>
  );
}

export function StoneChips({ s, dispatch }: StepProps) {
  return (
    <div className="chips">
      {STONE_KEYS.map((k: StoneKey) => (
        <button key={k} className={`chip ${s.stone === k ? 'on' : ''}`} onClick={() => dispatch({ type: 'stone', stone: k })}>
          {STONES[k].label}
        </button>
      ))}
    </div>
  );
}

export function Proportions({ share }: { share: { metal: number; stone: number; making: number } }) {
  return (
    <>
      <div className="bar">
        <div className="m" style={{ flex: share.metal }} />
        <div className="s" style={{ flex: share.stone }} />
        <div className="k" style={{ flex: share.making }} />
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--metal)' }} />Metal {share.metal.toFixed(0)}%</span>
        <span><i style={{ background: 'var(--stone)' }} />Stones {share.stone.toFixed(0)}%</span>
        <span><i style={{ background: 'var(--making)' }} />Making {share.making.toFixed(0)}%</span>
      </div>
    </>
  );
}

export function RatesModal({ onClose }: { onClose: () => void }) {
  const rows: [string, number][] = [
    ['24K gold, per gram', RATES.gold24Gram],
    ['22K gold, per gram', metalRate('22K')],
    ['18K gold, per gram', metalRate('18K')],
    ['14K gold, per gram', metalRate('14K')],
    ['10K gold, per gram', metalRate('10K')],
    ['Platinum 950, per gram', metalRate('PT950')],
    ['Gold spot, per troy ounce', RATES.gold24Gram * 31.1035],
  ];
  return (
    <div className="modal">
      <div className="sheet">
        <div className="sec">Live USA metal rates <span className="hint">{RATES.time}</span></div>
        <table className="rates">
          <tbody>
            {rows.map(([label, v]) => (
              <tr key={label}><td>{label}</td><td className="n">{money(v)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          These are sample values until a live USA price feed is connected. Every estimate and combination uses these rates.
        </p>
        <div className="actions">
          <span />
          <button className="btn dark" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export const TAX_SHORT = STORE.taxLabel.split(' (')[0].toLowerCase();
