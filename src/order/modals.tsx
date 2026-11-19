import { useEffect, useState, type ReactNode } from 'react';
import { KARATS, METALS, STONES, STONE_KEYS, TROY_OZ_GRAMS, type StoneKey } from './data';
import { DEFAULT_CONFIG, settingsProblem, taxLabel, type OwnerConfig } from './config';
import { gramRate, type Market } from './pricing';
import { money, fmtDate } from './format';
import { listOrdersRemote, type OrderRow } from './db';
import { useMarket } from './market';
import type { OrderState } from './types';

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ maxHeight: '90vh', overflow: 'auto' }}>{children}</div>
    </div>
  );
}

export function RatesModal({ mk, onClose }: { mk: Market; onClose: () => void }) {
  const { liveState } = useMarket();
  const rows: [string, number][] = [
    ['24K gold, per gram', mk.rates.gold24Gram],
    ...(['18K', '14K', '10K', 'S925'] as const).map(k =>
      [`${KARATS[k].label}, per gram`, gramRate(mk, k)] as [string, number]),
    ['Gold spot, per troy ounce', mk.rates.gold24Gram * TROY_OZ_GRAMS],
    ['Silver spot, per troy ounce', mk.rates.silverGram * TROY_OZ_GRAMS],
  ];
  return (
    <Overlay onClose={onClose}>
      <div className="sec">
        {mk.rates.source === 'live' ? 'Live spot rates' : 'Owner rates'} <span className="hint">{mk.rates.time}</span>
      </div>
      <table className="rates"><tbody>
        {rows.map(([label, v]) => <tr key={label}><td>{label}</td><td className="n">{money(v)}</td></tr>)}
      </tbody></table>
      {liveState === 'failed' && (
        <div className="note warn" role="alert">Live prices could not be reached. Owner rates are in use.</div>
      )}
      <p className="muted">
        {mk.rates.source === 'live'
          ? 'Gold and silver are live spot prices. Stone prices are set in owner settings.'
          : 'Showing owner-entered rates. Change them in Settings.'}
      </p>
      <div className="actions"><span /><button className="btn dark" onClick={onClose}>Close</button></div>
    </Overlay>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { mk, setConfig, refreshRates } = useMarket();
  const [draft, setDraft] = useState<OwnerConfig>(mk.cfg);
  const [depositsText, setDepositsText] = useState(mk.cfg.deposits.join(', '));
  // An empty box is NaN, not 0, so a blank field is flagged instead of saved as zero.
  const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; };
  const show = (v: number) => (Number.isFinite(v) ? v : '');
  const depositEntries = depositsText.split(',').map(x => x.trim()).filter(x => x !== '');
  const depositProblem = depositEntries.length === 0
    || depositEntries.some(x => { const n = Number(x); return !Number.isFinite(n) || n <= 0 || n > 100; })
    ? 'Deposit options must be percentages from 1 to 100, separated by commas, for example 25, 50, 100.'
    : null;
  const problem = settingsProblem(draft) ?? depositProblem;
  const set = <K extends keyof OwnerConfig>(k: K, v: OwnerConfig[K]) => setDraft({ ...draft, [k]: v });

  const save = () => {
    if (problem) return;
    const deposits = depositsText.split(',').map(x => parseFloat(x)).filter(x => x > 0 && x <= 100);
    const next: OwnerConfig = {
      ...draft,
      deposits: deposits.length ? deposits : DEFAULT_CONFIG.deposits,
      defaultDeposit: deposits.includes(draft.defaultDeposit) ? draft.defaultDeposit : deposits[0] ?? DEFAULT_CONFIG.defaultDeposit,
    };
    setConfig(next);
    refreshRates();
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="sec">Owner settings <span className="hint">this device</span></div>
      <div className="fields">
        <label className="field"><span>Markup multiplier (quote = production × this)</span>
          <input type="number" step="0.1" value={show(draft.markup)} onChange={e => set('markup', num(e.target.value))} /></label>
        <label className="field"><span>Waste / loss, %</span>
          <input type="number" step="0.5" value={show(draft.wastePct)} onChange={e => set('wastePct', num(e.target.value))} /></label>
        <label className="field"><span>Casting labour, $ per gram</span>
          <input type="number" step="0.5" value={show(draft.labourPerG)} onChange={e => set('labourPerG', num(e.target.value))} /></label>
        <label className="field"><span>Setting charge, $ per stone</span>
          <input type="number" step="0.5" value={show(draft.settingPerStone)} onChange={e => set('settingPerStone', num(e.target.value))} /></label>
        <label className="field"><span>Sales tax, %</span>
          <input type="number" step="0.01" value={show(+(draft.taxRate * 100).toFixed(4))} onChange={e => set('taxRate', num(e.target.value) / 100)} /></label>
        <label className="field full"><span>Deposit options, % (comma separated)</span>
          <input value={depositsText} onChange={e => setDepositsText(e.target.value)} /></label>
      </div>
      <div className="sec">Stone sizes, carat weight per stone <span className="hint">from your vendor table</span></div>
      <div className="fields">
        {Object.keys(draft.sizeCt).map(k => (
          <label className="field" key={k}><span>{k} mm</span>
            <input type="number" step="0.001" value={show(draft.sizeCt[k])} onChange={e => set('sizeCt', { ...draft.sizeCt, [k]: num(e.target.value) })} /></label>
        ))}
      </div>
      <div className="sec">Stone prices, $ per carat</div>
      <div className="fields">
        {STONE_KEYS.map((k: StoneKey) => (
          <label className="field" key={k}><span>{STONES[k].name}</span>
            <input type="number" value={show(draft.stonePerCt[k])} onChange={e => set('stonePerCt', { ...draft.stonePerCt, [k]: num(e.target.value) })} /></label>
        ))}
      </div>
      <div className="sec">Metal prices</div>
      <label className="check"><input type="checkbox" checked={draft.useLivePrices} onChange={e => set('useLivePrices', e.target.checked)} />
        <span>Use live spot prices for gold and silver</span></label>
      <p className="muted">Used when live prices are off or unavailable. Spot prices, in USD per troy ounce:</p>
      <div className="fields">
        <label className="field"><span>Gold 24K</span>
          <input type="number" value={show(+draft.manualOz.gold24.toFixed(2))} onChange={e => set('manualOz', { ...draft.manualOz, gold24: num(e.target.value) })} /></label>
        <label className="field"><span>Silver</span>
          <input type="number" value={show(draft.manualOz.silver)} onChange={e => set('manualOz', { ...draft.manualOz, silver: num(e.target.value) })} /></label>
      </div>
      <p className="faint">{taxLabel(draft)} · Metals: {METALS.map(m => KARATS[m].label).join(', ')}</p>
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        {problem && <div className="note bad" role="alert">{problem}</div>}
        <button className="btn primary lg" onClick={save} disabled={Boolean(problem)}>Save settings</button>
      </div>
    </Overlay>
  );
}

export function OrdersModal({ onOpen, onClose }: { onOpen: (o: OrderState) => void; onClose: () => void }) {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listOrdersRemote().then(setRows).catch((e: Error) => setErr(e.message || 'Could not load orders.'));
  }, []);

  return (
    <Overlay onClose={onClose}>
      <div className="sec">Orders <span className="hint">shared</span></div>
      {err && <div className="note bad">{err}</div>}
      {!rows && !err && <p className="muted">Loading…</p>}
      {rows && rows.length === 0 && <p className="muted">No orders yet.</p>}
      {rows?.map(r => (
        <div className="kv" key={r.id} style={{ alignItems: 'center' }}>
          <span>
            <b style={{ color: 'var(--text)' }}>{r.id}</b> · {r.customer_name || 'No name'} · {r.ornament || 'No ornament'}
            <br /><small>{r.status === 'sent' ? 'Sent to workshop' : 'Draft'} · {fmtDate(new Date(r.updated_at))}</small>
          </span>
          <button className="btn" onClick={() => onOpen(r.data)}>Open</button>
        </div>
      ))}
      <div className="actions"><span /><button className="btn dark" onClick={onClose}>Close</button></div>
    </Overlay>
  );
}
