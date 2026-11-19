import { useEffect, useReducer, useRef, useState } from 'react';
import { DRAFT_KEY, KARATS, STONES, type Metal, type Mode } from './data';
import { DEFAULT_CONFIG } from './config';
import { allCadOk } from './pricing';
import { estimatedWeight } from './quote';
import { nowTime } from './format';
import { saveOrderRemote } from './db';
import type { CheckKey, Customer, Dims, OrderState, ServiceLine, StoneLine } from './types';

// Terms the counter starts from. The owner's settings replace these for each new order.
export interface OrderTerms {
  markup: number;
  waste: number;
  labour: number;
}

export const DEFAULT_TERMS: OrderTerms = {
  markup: DEFAULT_CONFIG.markup,
  waste: DEFAULT_CONFIG.wastePct,
  labour: DEFAULT_CONFIG.labourPerG,
};

export type Action =
  | { type: 'go'; step: number }
  | { type: 'cust'; key: keyof Customer; value: string }
  | { type: 'occasion'; value: string }
  | { type: 'mode'; mode: Mode }
  | { type: 'photo'; on: boolean }
  | { type: 'dim'; key: keyof Dims; value: number }
  | { type: 'metal'; metal: Metal }
  | { type: 'weight'; value: number | null }
  | { type: 'waste'; value: number }
  | { type: 'labour'; value: number }
  | { type: 'markup'; value: number }
  | { type: 'stoneAdd'; line: StoneLine }
  | { type: 'stoneUpdate'; id: string; patch: Partial<Omit<StoneLine, 'id'>> }
  | { type: 'stoneRemove'; id: string }
  | { type: 'serviceAdd'; line: ServiceLine }
  | { type: 'serviceUpdate'; id: string; patch: Partial<Omit<ServiceLine, 'id'>> }
  | { type: 'serviceRemove'; id: string }
  | { type: 'budget'; value: number | null }
  | { type: 'showBudget' }
  | { type: 'hideBudget' }
  | { type: 'generateCad' }
  | { type: 'deposit'; value: number | null }
  | { type: 'check'; key: CheckKey; on: boolean }
  | { type: 'send' }
  | { type: 'newOrder'; orderNo: string; terms?: OrderTerms }
  | { type: 'load'; order: OrderState };

export function newOrderNo(): string {
  // Order numbers are the database key, so they must not collide: time plus a random suffix.
  const time = Date.now().toString(36).slice(-5).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0');
  return `CO-${time}${rand}`;
}

export function blankOrder(orderNo: string, terms: OrderTerms = DEFAULT_TERMS): OrderState {
  return {
    step: 0,
    orderNo,
    cust: { name: '', phone: '', email: '', ornament: '', occasion: '', needed: '', notes: '' },
    mode: 'picture',
    photo: false,
    dims: { w: 22, h: 10, d: 5 },
    metal: '18K',
    weight: null,
    waste: terms.waste,
    labour: terms.labour,
    markup: terms.markup,
    stones: [],
    services: [],
    budget: null,
    showBudget: false,
    exact: false,
    depositAmount: null,
    checks: { details: false, design: false, price: false, deposit: false },
    sent: false,
    restored: false,
  };
}

// Fill any missing or invalid field from a blank order, so older or damaged saves still open.
export function normalizeOrder(saved: Partial<OrderState>): OrderState {
  const base = blankOrder(saved.orderNo ?? newOrderNo());
  const num = (v: unknown, fallback: number, ok: (n: number) => boolean = n => n >= 0) =>
    (typeof v === 'number' && Number.isFinite(v) && ok(v) ? v : fallback);
  const dim = (v: unknown, fallback: number) => num(v, fallback, n => n > 0);
  const step = typeof saved.step === 'number' && saved.step >= 0 && saved.step <= 4 ? saved.step : 0;
  const amount = typeof saved.depositAmount === 'number' && Number.isFinite(saved.depositAmount) && saved.depositAmount > 0
    ? saved.depositAmount
    : null;
  // Drafts saved before the metal and stone list was narrowed fall back to the nearest option.
  const metal = saved.metal && saved.metal in KARATS ? saved.metal : base.metal;
  const stones = (Array.isArray(saved.stones) ? saved.stones : base.stones).map(l => (
    l && l.type in STONES ? l : { ...l, type: 'natural' as const, perCt: STONES.natural.perCt }
  ));
  const services = Array.isArray(saved.services) ? saved.services : base.services;
  return {
    ...base,
    ...saved,
    step,
    cust: { ...base.cust, ...saved.cust },
    metal,
    dims: { w: dim(saved.dims?.w, base.dims.w), h: dim(saved.dims?.h, base.dims.h), d: dim(saved.dims?.d, base.dims.d) },
    weight: typeof saved.weight === 'number' && saved.weight > 0 ? saved.weight : null,
    waste: num(saved.waste, base.waste, n => n <= 50),
    labour: num(saved.labour, base.labour),
    markup: num(saved.markup, base.markup, n => n >= 1),
    stones,
    services,
    checks: { ...base.checks, ...saved.checks },
    depositAmount: amount,
    restored: false,
  };
}

export const newId = () => Math.random().toString(36).slice(2, 10);

export function reduce(s: OrderState, a: Action): OrderState {
  switch (a.type) {
    case 'go':
      return { ...s, step: a.step };
    case 'cust':
      return { ...s, cust: { ...s.cust, [a.key]: a.value } };
    case 'occasion':
      return { ...s, cust: { ...s.cust, occasion: s.cust.occasion === a.value ? '' : a.value } };
    case 'mode':
      return { ...s, mode: a.mode, photo: false, exact: false, weight: null };
    case 'photo':
      return { ...s, photo: a.on };
    case 'dim':
      // A size change makes the CAD model out of date. A weight the counter typed is kept.
      return { ...s, dims: { ...s.dims, [a.key]: a.value }, exact: false };
    case 'metal':
      return { ...s, metal: a.metal };
    case 'weight':
      return { ...s, weight: a.value !== null && Number.isFinite(a.value) && a.value > 0 ? a.value : null };
    case 'waste':
      return Number.isFinite(a.value) && a.value >= 0 && a.value <= 50 ? { ...s, waste: a.value } : s;
    case 'labour':
      return Number.isFinite(a.value) && a.value >= 0 ? { ...s, labour: a.value } : s;
    case 'markup':
      return Number.isFinite(a.value) && a.value >= 1 && a.value <= 10 ? { ...s, markup: a.value } : s;
    case 'stoneAdd':
      return { ...s, stones: [...s.stones, a.line] };
    case 'stoneUpdate':
      return { ...s, stones: s.stones.map(l => (l.id === a.id ? { ...l, ...a.patch } : l)) };
    case 'stoneRemove':
      return { ...s, stones: s.stones.filter(l => l.id !== a.id) };
    case 'serviceAdd':
      return { ...s, services: [...s.services, a.line] };
    case 'serviceUpdate':
      return { ...s, services: s.services.map(v => (v.id === a.id ? { ...v, ...a.patch } : v)) };
    case 'serviceRemove':
      return { ...s, services: s.services.filter(v => v.id !== a.id) };
    case 'budget':
      return { ...s, budget: a.value };
    case 'showBudget':
      return { ...s, showBudget: true };
    case 'hideBudget':
      return { ...s, showBudget: false, budget: null };
    case 'generateCad':
      // The CAD model locks the size. A weight the counter typed (from a scale) is not replaced.
      return allCadOk(s.dims) ? { ...s, exact: true, weight: s.weight ?? estimatedWeight(s.dims, s.metal) } : s;
    case 'deposit':
      // A deposit is a positive dollar amount, rounded to cents. The total limit is checked on screen.
      if (a.value === null) return { ...s, depositAmount: null };
      return Number.isFinite(a.value) && a.value > 0 ? { ...s, depositAmount: Math.round(a.value * 100) / 100 } : s;
    case 'check':
      return { ...s, checks: { ...s.checks, [a.key]: a.on } };
    case 'send':
      return { ...s, sent: true };
    case 'newOrder':
      return blankOrder(a.orderNo, a.terms);
    case 'load':
      return normalizeOrder(a.order);
  }
}

function loadInitial(): OrderState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<OrderState> | null;
      if (saved && !saved.sent) {
        return { ...normalizeOrder(saved), restored: true };
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
