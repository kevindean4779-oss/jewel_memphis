import type { Dispatch, ReactNode } from 'react';
import { KARATS, METALS, STONES, STONE_KEYS, type Metal, type StoneKey } from './data';
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

export const TAX_SHORT = 'sales tax';
