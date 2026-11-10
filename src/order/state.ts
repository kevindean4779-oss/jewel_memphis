import { useEffect, useReducer, useState } from 'react';
import { DEFAULT_METAL, DEFAULT_STONE, DRAFT_KEY, KARATS, STEP_NAMES, STONES, STORE, TEXT_LIMITS, type Metal, type StoneKey, type Mode } from './data';
import { allCadOk, custOk, dimsOk, price, readyDate, validISODate } from './pricing';
import { nowTime } from './format';
import { getSpot, isSampleSpot, isSpot } from './rates';
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
  | { type: 'send'; at: string }
  | { type: 'newOrder'; orderNo: string; id: string };

/** RFC 4122 v4 UUID. Falls back to getRandomValues, because randomUUID only exists on HTTPS pages. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Human-readable order number: CO-YYMMDD-XXXX (XXXX from an unambiguous alphabet). */
export function newOrderNo(now: Date = new Date()): string {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const r = new Uint8Array(4);
  crypto.getRandomValues(r);
  const tail = [...r].map(x => A[x % A.length]).join('');
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `CO-${ymd}-${tail}`;
}

export function blankOrder(orderNo: string, id: string = uuid()): OrderState {
  return {
    id,
    step: 0,
    orderNo,
    cust: { name: '', phone: '', email: '', ornament: '', occasion: '', needed: '', notes: '' },
    mode: 'picture',
    photo: false,
    dims: { w: 22, h: 10, d: 5 },
    metal: DEFAULT_METAL,
    stone: DEFAULT_STONE,
    orig: null,
    budget: null,
    fitOnly: true,
    showBudget: false,
    exact: false,
    deposit: STORE.defaultDeposit,
    checks: { details: false, design: false, price: false, deposit: false },
    lockedSpot: null,
    sent: false,
    sentAt: null,
    restored: false,
  };
}

// Any change to the design or price withdraws the approvals that depended on it.
function unagree(s: OrderState): OrderState {
  return { ...s, checks: { ...s.checks, design: false, price: false, deposit: false }, lockedSpot: null };
}

const LIMITS: Partial<Record<keyof Customer, number>> = {
  name: TEXT_LIMITS.name, phone: TEXT_LIMITS.phone, email: TEXT_LIMITS.email, ornament: TEXT_LIMITS.ornament, notes: TEXT_LIMITS.notes,
};

/** The spot rates the order is priced at: frozen once the price is agreed, live before that. */
export const orderSpot = (s: OrderState) => s.lockedSpot ?? undefined;

export function reduce(s: OrderState, a: Action): OrderState {
  // A sent order is final: only starting a new order changes it.
  if (s.sent && a.type !== 'newOrder') return s;

  switch (a.type) {
    case 'go':
      return { ...s, step: Math.max(0, Math.min(STEP_NAMES.length - 1, Math.trunc(a.step))) };
    case 'cust': {
      const max = LIMITS[a.key];
      const value = max ? a.value.slice(0, max) : a.value;
      return { ...s, cust: { ...s.cust, [a.key]: value }, checks: { ...s.checks, details: false } };
    }
    case 'occasion':
      return { ...s, cust: { ...s.cust, occasion: s.cust.occasion === a.value ? '' : a.value }, checks: { ...s.checks, details: false } };
    case 'mode':
      return s.mode === a.mode ? s : unagree({ ...s, mode: a.mode, photo: false, exact: false });
    case 'photo':
      return unagree({ ...s, photo: a.on, exact: a.on ? s.exact : false });
    case 'dim':
      if (s.dims[a.key] === a.value) return s;
      // Any size change invalidates the CAD model.
      return unagree({ ...s, dims: { ...s.dims, [a.key]: a.value }, exact: false });
    case 'metal':
      return s.metal === a.metal ? s : unagree({ ...s, metal: a.metal });
    case 'stone':
      return s.stone === a.stone ? s : unagree({ ...s, stone: a.stone });
    case 'budget':
      return { ...s, budget: a.value !== null && Number.isFinite(a.value) && a.value > 0 ? a.value : null };
    case 'showBudget':
      return { ...s, showBudget: true };
    case 'hideBudget':
      return { ...s, showBudget: false, budget: null };
    case 'fit':
      return { ...s, fitOnly: a.fitOnly };
    case 'select': {
      const o = price(s.dims, a.metal, a.stone, s.mode, s.exact, orderSpot(s));
      if (s.budget !== null && o.low > s.budget) return s;
      if (s.metal === a.metal && s.stone === a.stone) return s;
      return unagree({ ...s, metal: a.metal, stone: a.stone });
    }
    case 'resetOriginal':
      return s.orig ? unagree({ ...s, metal: s.orig.metal, stone: s.orig.stone }) : s;
    case 'continueToEstimate':
      if (s.mode === 'dims' ? !dimsOk(s.dims) : !s.photo) return s;
      return { ...s, orig: { metal: s.metal, stone: s.stone }, step: 2 };
    case 'generateCad':
      return allCadOk(s.dims) ? { ...s, exact: true } : s;
    case 'deposit':
      if (!STORE.deposits.includes(a.value) || s.deposit === a.value) return s;
      return { ...s, deposit: a.value, checks: { ...s.checks, deposit: false } };
    case 'check': {
      const checks = { ...s.checks, [a.key]: a.on };
      if (a.key !== 'price') return { ...s, checks };
      // Agreeing the price freezes today's metal rates for this order; withdrawing it
      // releases them, and the deposit (a share of that price) must be confirmed again.
      return a.on
        ? { ...s, checks, lockedSpot: getSpot() }
        : { ...s, checks: { ...checks, deposit: false }, lockedSpot: null };
    }
    case 'send':
      if (!readyToSend(s)) return s;
      return { ...s, sent: true, sentAt: a.at };
    case 'newOrder':
      return blankOrder(a.orderNo, a.id);
  }
}

/** Everything that must be true before the order can be sent. Returns what is missing. */
export function missingForSend(s: OrderState, now: Date = new Date()): string[] {
  const missing: string[] = [];
  if (!custOk(s.cust)) missing.push('customer details');
  if (!dimsOk(s.dims)) missing.push('valid size');
  if (!s.exact) missing.push('CAD model');
  if (!s.checks.details) missing.push('customer check');
  if (!s.checks.design) missing.push('design approval');
  if (!s.checks.price || !s.lockedSpot) missing.push('price agreement');
  if (!s.checks.deposit) missing.push('deposit');
  if (s.lockedSpot && isSampleSpot(s.lockedSpot)) missing.push('live metal rates');
  if (s.cust.needed) {
    if (!validISODate(s.cust.needed)) missing.push('needed-by date');
    else {
      const [y, m, d] = s.cust.needed.split('-').map(Number);
      if (new Date(y, m - 1, d) < readyDate(s.metal, s.stone, s.mode, now)) missing.push('needed-by date');
    }
  }
  return missing;
}

export const readyToSend = (s: OrderState, now?: Date) => missingForSend(s, now).length === 0;

/* ---------------- Draft restore ---------------- */

const str = (v: unknown, max = 1000) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Rebuilds a saved draft field by field, so a damaged or outdated draft can never crash the app. */
export function sanitizeDraft(saved: unknown): OrderState | null {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
  const d = saved as Record<string, any>;
  if (d.sent) return null; // a sent order is finished; start fresh
  const base = blankOrder(typeof d.orderNo === 'string' && d.orderNo ? d.orderNo : newOrderNo(),
    typeof d.id === 'string' && /^[0-9a-f-]{36}$/i.test(d.id) ? d.id : uuid());
  const knownMetal = (m: unknown): m is Metal => typeof m === 'string' && m in KARATS;
  const knownStone = (k: unknown): k is StoneKey => typeof k === 'string' && k in STONES;
  const c = d.cust ?? {};
  const s: OrderState = {
    ...base,
    cust: {
      name: str(c.name, TEXT_LIMITS.name), phone: str(c.phone, TEXT_LIMITS.phone), email: str(c.email, TEXT_LIMITS.email),
      ornament: str(c.ornament, TEXT_LIMITS.ornament), occasion: str(c.occasion, 40), needed: str(c.needed, 10), notes: str(c.notes, TEXT_LIMITS.notes),
    },
    mode: d.mode === 'dims' || d.mode === 'picture' ? d.mode : base.mode,
    photo: d.photo === true,
    dims: { w: num(d.dims?.w, base.dims.w), h: num(d.dims?.h, base.dims.h), d: num(d.dims?.d, base.dims.d) },
    metal: knownMetal(d.metal) ? d.metal : DEFAULT_METAL,
    stone: knownStone(d.stone) ? d.stone : DEFAULT_STONE,
    orig: d.orig && knownMetal(d.orig.metal) && knownStone(d.orig.stone) ? { metal: d.orig.metal, stone: d.orig.stone } : null,
    budget: typeof d.budget === 'number' && d.budget > 0 && Number.isFinite(d.budget) ? d.budget : null,
    fitOnly: d.fitOnly !== false,
    showBudget: d.showBudget === true,
    exact: d.exact === true && allCadOk({ w: num(d.dims?.w, NaN), h: num(d.dims?.h, NaN), d: num(d.dims?.d, NaN) }),
    deposit: STORE.deposits.includes(d.deposit) ? d.deposit : STORE.defaultDeposit,
    checks: {
      details: d.checks?.details === true, design: d.checks?.design === true,
      price: d.checks?.price === true && isSpot(d.lockedSpot), deposit: d.checks?.deposit === true && isSpot(d.lockedSpot),
    },
    lockedSpot: d.checks?.price === true && isSpot(d.lockedSpot) ? d.lockedSpot : null,
    restored: true,
  };
  // Never restore onto a step whose earlier steps are no longer complete.
  let step = Math.max(0, Math.min(STEP_NAMES.length - 1, Math.trunc(num(d.step, 0))));
  if (step > 0 && !custOk(s.cust)) step = 0;
  if (step > 1 && (s.mode === 'dims' ? !dimsOk(s.dims) : !s.photo)) step = 1;
  if (step > 3 && !s.exact) step = 3;
  return { ...s, step };
}

function loadInitial(): OrderState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const s = raw ? sanitizeDraft(JSON.parse(raw)) : null;
    if (s) return s;
  } catch {
    /* ignore a damaged draft */
  }
  return blankOrder(newOrderNo());
}

// Holds the order and autosaves the draft to this browser.
export function useOrder() {
  const [state, dispatch] = useReducer(reduce, undefined, loadInitial);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      // A sent order lives in the outbox (see orders.ts); clear the draft so a reload
      // cannot bring back the unsent copy and send it twice.
      if (state.sent) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...state, restored: false }));
      setSavedAt(state.sent ? null : nowTime());
    } catch {
      /* storage unavailable: keep working without autosave */
    }
  }, [state]);

  return { state, dispatch, savedAt };
}
