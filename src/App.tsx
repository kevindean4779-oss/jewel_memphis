import { useCallback, useEffect, useState } from 'react';
import { STEP_NAMES } from './order/data';
import { useOrder } from './order/state';
import { CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep } from './order/steps';
import { RatesModal } from './order/shared';
import { useRates } from './order/rates';
import { IconCheck, IconCloud, IconTrend } from './order/icons';

const STEPS = [CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep];

export default function App() {
  const { state: s, dispatch, savedAt } = useOrder();
  const { status: rateStatus } = useRates(true); // keeps prices live and re-prices on change
  const [ratesOpen, setRatesOpen] = useState(false);
  const Step = STEPS[s.step];
  const title = s.cust.ornament.trim() || 'New custom order';
  const openRates = useCallback(() => setRatesOpen(true), []);
  const closeRates = useCallback(() => setRatesOpen(false), []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [s.step]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo" aria-hidden="true">GJ</div>
            <div className="brand-text">
              <div className="brand-title">{title}</div>
              <div className="brand-meta">
                <span className="num">#{s.orderNo}</span>
                <span className="dot-sep" />
                <span>{s.cust.name.trim() || 'No customer yet'}</span>
                {savedAt && <span className="saved"><span className="dot-sep" /><IconCloud size={14} />Saved {savedAt}</span>}
              </div>
            </div>
          </div>

          <nav aria-label="Order progress">
            <ol className="stepper">
              {STEP_NAMES.map((name, i) => {
                const done = i < s.step;
                const cls = i === s.step ? 'current' : done ? 'done' : '';
                return (
                  <li key={name}>
                    {i > 0 && <span className={`line ${i <= s.step ? 'done' : ''}`} aria-hidden="true" />}
                    <button
                      type="button"
                      className={`step ${cls}`}
                      disabled={!done || s.sent}
                      aria-current={i === s.step ? 'step' : undefined}
                      title={done ? `Back to ${name}` : name}
                      onClick={() => dispatch({ type: 'go', step: i })}
                    >
                      <span className="bullet">{done ? <IconCheck size={14} strokeWidth={3} /> : i + 1}</span>
                      <span className="s-name">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <button type="button" className="btn ghost" onClick={openRates} aria-label={`Show metal rates (${rateStatus})`}>
            <IconTrend size={18} /><span className="rates-label">Rates</span>
            <span className={`rate-dot ${rateStatus}`} aria-hidden="true" />
          </button>

          <div className="progress" aria-hidden="true">
            <div className="p-label"><span>Step {s.step + 1} of {STEP_NAMES.length}</span><span>{STEP_NAMES[s.step]}</span></div>
            <div className="p-track">{STEP_NAMES.map((n, i) => <i key={n} className={i <= s.step ? 'on' : ''} />)}</div>
          </div>
        </div>
      </header>

      <Step s={s} dispatch={dispatch} onShowRates={openRates} />

      {ratesOpen && <RatesModal onClose={closeRates} />}
    </div>
  );
}
