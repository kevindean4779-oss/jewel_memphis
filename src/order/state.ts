import { useEffect, useReducer, useRef, useState } from 'react';
import { DRAFT_KEY, type Metal, type StoneKey, type Mode } from './data';
import { DEFAULT_CONFIG } from './config';
import { allCadOk } from './pricing';
import { nowTime } from './format';
import { isSignedIn, saveOrderRemote } from './db';
import type { CheckKey, Customer, Dims, OrderState } from './types';

export type Action =
  | { type: 'go'; step: number }
  | { type: 'cust'; key: keyof Customer; value: string }
  | { type: 'occasion'; value: string }
  | { type: 'mode'; mode: Mode }
  | { type: 'photo'; on: boolean }
  | { type: 'dim'; key: keyof Dims; value: number }
  | { type: 'metal'; metal: Metal }
  | { type: 'stone'; stone: StoneKey }
  | { type: 'budget'; value: number | null }
  | { type: 'showBudget' }
  | { type: 'hideBudget' }
  | { type: 'fit'; fitOnly: boolean }
  | { type: 'select'; metal: Metal; stone: StoneKey }
  | { type: 'resetOriginal' }
  | { type: 'continueToEstimate' }
  | { type: 'generateCad' }
  | { type: 'deposit'; value: number }
  | { type: 'check'; key: CheckKey; on: boolean }
  | { type: 'send' }
  | { type: 'newOrder'; orderNo: string }
  | { type: 'load'; order: OrderState };

export function newOrderNo(): string {
  return 'CO-' + (2042 + Math.floor(Math.random() * 500));
}

export function blankOrder(orderNo: string): OrderState {
  return {
    step: 0,
    orderNo,
    cust: { name: '', phone: '', email: '', ornament: '', occasion: '', needed: '', notes: '' },
    mode: 'picture',
    photo: false,
    dims: { w: 22, h: 10, d: 5 },
    metal: '18K',
    stone: 'natural',
    orig: null,
    budget: null,
    fitOnly: true,
    showBudget: false,
    exact: false,
    deposit: DEFAULT_CONFIG.defaultDeposit,
    checks: { details: false, design: false, price: false, deposit: false },
    sent: false,
    restored: false,
  };
}

export function reduce(s: OrderState, a: Action): OrderState {
  switch (a.type) {
    case 'go':
      return { ...s, step: a.step };
    case 'cust':
      return { ...s, cust: { ...s.cust, [a.key]: a.value } };
    case 'occasion':
      return { ...s, cust: { ...s.cust, occasion: s.cust.occasion === a.value ? '' : a.value } };
    case 'mode':
      return { ...s, mode: a.mode, photo: false, exact: false };
    case 'photo':
      return { ...s, photo: a.on };
    case 'dim':
      // Any size change invalidates the CAD model (the prototype only did this for valid sizes).
      return { ...s, dims: { ...s.dims, [a.key]: a.value }, exact: false };
    case 'metal':
      return { ...s, metal: a.metal };
    case 'stone':
      return { ...s, stone: a.stone };
    case 'budget':
      return { ...s, budget: a.value };
    case 'showBudget':
      return { ...s, showBudget: true };
    case 'hideBudget':
      return { ...s, showBudget: false, budget: null };
    case 'fit':
      return { ...s, fitOnly: a.fitOnly };
    case 'select':
      return { ...s, metal: a.metal, stone: a.stone };
    case 'resetOriginal':
      return s.orig ? { ...s, metal: s.orig.metal, stone: s.orig.stone } : s;
    case 'continueToEstimate':
      return { ...s, orig: { metal: s.metal, stone: s.stone }, step: 2 };
    case 'generateCad':
      return allCadOk(s.dims) ? { ...s, exact: true } : s;
    case 'deposit':
      return { ...s, deposit: a.value };
    case 'check':
      return { ...s, checks: { ...s.checks, [a.key]: a.on } };
    case 'send':
      return { ...s, sent: true };
    case 'newOrder':
      return blankOrder(a.orderNo);
    case 'load':
      return { ...a.order, restored: false };
  }
}

function loadInitial(): OrderState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<OrderState> | null;
      if (saved && !saved.sent) {
        const base = blankOrder(saved.orderNo ?? newOrderNo());
        return {
          ...base,
          ...saved,
          cust: { ...base.cust, ...saved.cust },
          checks: { ...base.checks, ...saved.checks },
          restored: true,
        } as OrderState;
      }
    }
  } catch {
    /* ignore a damaged draft */
  }
  return blankOrder(newOrderNo());
}

// Holds the order. Autosaves the draft to this device, and syncs to Supabase when configured.
export function useOrder() {
  const [state, dispatch] = useReducer(reduce, undefined, loadInitial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.sent) return; // a sent order is not autosaved locally, as in the prototype
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      setSavedAt(nowTime());
    } catch {
      /* storage unavailable: keep working without autosave */
    }
  }, [state]);

  useEffect(() => {
    if (!isSignedIn()) return; // signed out: orders stay on this device
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveOrderRemote(state)
        .then(() => setSyncError(null))
        .catch(() => setSyncError('Not synced. Changes are saved on this device.'));
    }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [state]);

  return { state, dispatch, savedAt, syncError };
}
