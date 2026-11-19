import { Icon } from './ui/Icon';
import { useEffect, useState } from 'react';
import { STEP_NAMES } from './order/data';
import { useOrder } from './order/state';
import { CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep } from './order/steps';
import { RatesModal, SettingsModal, OrdersModal } from './order/modals';
import { MarketProvider, useMarket } from './order/market';
import { WorkshopTicket } from './order/ticket';
import { newOrderNo, termsFromConfig } from './order/state';
import { isUnlocked, lockCounter } from './lock/client';
import { LockScreen } from './lock/LockScreen';

const STEPS = [CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep];
type Modal = 'rates' | 'settings' | 'orders' | null;

function Counter() {
  const { mk } = useMarket();
  const { state: s, dispatch, savedAt, syncError } = useOrder();
  const [modal, setModal] = useState<Modal>(null);
  const Step = STEPS[s.step];
  const title = s.cust.ornament.trim() || 'New custom order';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [s.step]);

  async function lockNow() {
    await lockCounter();
    window.location.reload();
  }

  return (
    <div className="app">
      <header>
        <div className="header-inner">
          <div className="brand">
            <div className="mark" aria-hidden="true">GJ</div>
            <div className="brand-text">
              <div className="title">{title}</div>
              <div className="sub">
                Order #{s.orderNo} · {s.cust.name.trim() || 'Customer'}
                {savedAt && <> · <span className="faint">Saved {savedAt}</span></>}
              </div>
            </div>
          </div>
          <div className="toolbar">
            <button className="btn ghost" onClick={() => setModal('orders')}>Orders</button>
            <button className="btn ghost" onClick={() => setModal('rates')}>
              <span className={`dot-live ${mk.rates.source === 'live' ? 'on' : ''}`} aria-hidden="true" />
              Rates
            </button>
            <button className="btn ghost" onClick={() => setModal('settings')}>Settings</button>
            <button className="btn ghost" onClick={lockNow}>Lock</button>
            <button className="btn dark" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo(), terms: termsFromConfig(mk.cfg) })}>New order</button>
          </div>
        </div>
        <div className="steps-bar">
          <nav className="stepper" aria-label="Order steps">
            {STEP_NAMES.map((name, i) => {
              const cls = i === s.step ? 'on' : i < s.step ? 'done' : '';
              return (
                <span key={name} style={{ display: 'contents' }}>
                  <span className={`st ${cls}`} aria-current={i === s.step ? 'step' : undefined}>
                    <span className="dot">{i < s.step ? <Icon name="check" size={13} /> : i + 1}</span>
                    <span className="lbl">{name}</span>
                  </span>
                  {i < STEP_NAMES.length - 1 && <span className={`sep ${i < s.step ? 'done' : ''}`} />}
                </span>
              );
            })}
          </nav>
        </div>
        <div className="step-count">Step {s.step + 1} of {STEP_NAMES.length} · {STEP_NAMES[s.step]}</div>
      </header>

      {syncError && (
        <div className="banner warn sync-banner" role="alert">
          <span className="ic"><Icon name="alert" size={14} /></span>
          <span>Not saved to the shared list. Your changes are kept on this device. Check the connection; they will save when it is back.</span>
        </div>
      )}

      <main>
        <Step s={s} dispatch={dispatch} onShowRates={() => setModal('rates')} />
      </main>

      <WorkshopTicket s={s} />

      {modal === 'rates' && <RatesModal mk={mk} onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'orders' && (
        <OrdersModal
          onOpen={order => { dispatch({ type: 'load', order }); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// The counter is behind the PIN lock. The check runs once on load.
function Gate() {
  const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking');
  useEffect(() => {
    void isUnlocked().then(ok => setState(ok ? 'open' : 'locked'));
  }, []);
  if (state === 'checking') return <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}><p className="muted">Loading…</p></div>;
  if (state === 'locked') return <LockScreen onUnlocked={() => setState('open')} />;
  return <Counter />;
}

export default function App() {
  return (
    <MarketProvider>
      <Gate />
    </MarketProvider>
  );
}
