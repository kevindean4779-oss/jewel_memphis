import { useEffect, useState } from 'react';
import { STEP_NAMES } from './order/data';
import { useOrder } from './order/state';
import { CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep } from './order/steps';
import { RatesModal, SettingsModal, OrdersModal } from './order/modals';
import { MarketProvider, useMarket } from './order/market';
import { WorkshopTicket } from './order/ticket';
import { newOrderNo } from './order/state';
import { supabase } from './order/db';

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
              {supabase && syncError && <> · <span style={{ color: 'var(--bad)' }}>{syncError}</span></>}
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

      <div className="toolbar">
        <button className="btn" onClick={() => setModal('orders')}>Orders</button>
        <button className="btn" onClick={() => setModal('rates')}>
          Rates <span className="faint">{mk.rates.source === 'live' ? 'live' : 'owner'}</span>
        </button>
        <button className="btn" onClick={() => setModal('settings')}>Settings</button>
        <button className="btn" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo() })}>New order</button>
      </div>

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

export default function App() {
  return (
    <MarketProvider>
      <Counter />
    </MarketProvider>
  );
}
