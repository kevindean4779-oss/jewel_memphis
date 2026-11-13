import { useEffect, useState, useSyncExternalStore } from 'react';
import { STEP_NAMES } from './order/data';
import { useOrder } from './order/state';
import { CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep } from './order/steps';
import { RatesModal, SettingsModal, OrdersModal } from './order/modals';
import { MarketProvider, useMarket } from './order/market';
import { WorkshopTicket } from './order/ticket';
import { newOrderNo } from './order/state';
import { loadSession, session } from './auth/client';
import { AuthScreen, ChangePasswordScreen, screenFromUrl } from './auth/AuthScreens';
import { AccountModal } from './auth/Account';
import { TeamModal } from './auth/Team';

const STEPS = [CustomerStep, DesignStep, EstimateStep, CadStep, ConfirmStep];
type Modal = 'rates' | 'settings' | 'orders' | 'account' | 'team' | null;

function Counter() {
  const { mk } = useMarket();
  const me = useSyncExternalStore(session.subscribe, () => session.user);
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
              {syncError && <> · <span style={{ color: 'var(--bad)' }}>{syncError}</span></>}
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
        <button className="btn ghost" onClick={() => setModal('orders')}>Orders</button>
        <button className="btn ghost status" onClick={() => setModal('rates')}>
          <span className={`dot-live ${mk.rates.source === 'live' ? 'on' : ''}`} aria-hidden="true" />
          Rates <span className="faint">{mk.rates.source === 'live' ? 'live' : 'owner'}</span>
        </button>
        <button className="btn ghost" onClick={() => setModal('settings')}>Settings</button>
        {me && (me.role === 'admin' || me.role === 'manager') && <button className="btn ghost" onClick={() => setModal('team')}>Team</button>}
        <button className="btn ghost" onClick={() => setModal('account')}>{me?.name || me?.email}</button>
        <button className="btn outline" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo() })}>New order</button>
      </div>

      <main>
        <Step s={s} dispatch={dispatch} onShowRates={() => setModal('rates')} />
      </main>

      <WorkshopTicket s={s} />

      {modal === 'rates' && <RatesModal mk={mk} onClose={() => setModal(null)} />}
      {modal === 'account' && <AccountModal onClose={() => setModal(null)} />}
      {modal === 'team' && <TeamModal onClose={() => setModal(null)} />}
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

// The counter is behind sign-in. Email links (reset, invite, verify) open their own screen.
function Gate() {
  const [ready, setReady] = useState(false);
  const user = useSyncExternalStore(session.subscribe, () => session.user);
  useEffect(() => {
    void loadSession().finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}><p className="muted">Loading…</p></div>;
  if (!user) {
    const { screen, token } = screenFromUrl();
    return <AuthScreen key={screen + token} screen={screen} token={token} />;
  }
  if (user.mustChangePassword) return <ChangePasswordScreen onDone={() => { /* session is refreshed */ }} />;
  return <Counter />;
}

export default function App() {
  return (
    <MarketProvider>
      <Gate />
    </MarketProvider>
  );
}
