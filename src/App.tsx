import { useEffect, useState } from 'react';
import { STEP_NAMES } from './order/data';
import { useOrder } from './order/state';
import { CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep } from './order/steps';
import { RatesModal } from './order/shared';

const STEPS = [CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep];

export default function App() {
  const { state: s, dispatch, savedAt } = useOrder();
  const [ratesOpen, setRatesOpen] = useState(false);
  const Step = STEPS[s.step];
  const title = s.cust.ornament.trim() || 'New custom order';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [s.step]);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="mark">GJ</div>
          <div style={{ minWidth: 0 }}>
            <div className="title">{title}</div>
            <div className="sub">
              Order #{s.orderNo} · {s.cust.name.trim() || 'Customer'}
              {savedAt && <> · <span style={{ color: 'var(--faint)' }}>Draft saved {savedAt}</span></>}
            </div>
          </div>
        </div>
        <nav className="stepper">
          {STEP_NAMES.map((name, i) => {
            const cls = i === s.step ? 'on' : i < s.step ? 'done' : '';
            return (
              <span key={name} style={{ display: 'contents' }}>
                <span className={`st ${cls}`}>
                  <span className="dot">{i < s.step ? '✓' : i + 1}</span>
                  <span>{name}</span>
                </span>
                {i < STEP_NAMES.length - 1 && <span className="sep" />}
              </span>
            );
          })}
        </nav>
      </header>

      <main>
        <Step s={s} dispatch={dispatch} onShowRates={() => setRatesOpen(true)} />
      </main>

      {ratesOpen && <RatesModal onClose={() => setRatesOpen(false)} />}
    </div>
  );
}
