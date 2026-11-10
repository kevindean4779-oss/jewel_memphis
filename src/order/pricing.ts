import { CAD, DIM_LIMITS, KARATS, LEAD, MAKING, METALS, RANGE, STONES, STONE_KEYS, STORE, TROY_OZ_GRAMS, type Metal, type Mode, type StoneKey } from './data';
import type { Customer, Dims } from './types';
import { getSpot, type Spot } from './rates';

export interface Price {
  grams: number;
  rate: number;
  metal: number;
  stone: number;
  making: number;
  subtotal: number;
  tax: number;
  total: number;
  low: number;
  high: number;
  tol: number;
  shareMetal: number;
  shareStone: number;
  shareMaking: number;
}

export interface Option extends Price {
  metalKey: Metal;
  stoneKey: StoneKey;
}

/** Rounds a dollar amount to cents, so displayed and stored values agree. */
export const cents = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** Pure metal price per gram (USD). Uses the given spot snapshot, or the live feed. */
export function spotPerGram(metal: 'gold' | 'silver' | 'platinum', spot: Spot = getSpot()): number {
  return spot[metal] / TROY_OZ_GRAMS;
}

/** Alloy price per gram: pure metal price × purity. */
export function metalRate(m: Metal, spot?: Spot): number {
  return spotPerGram(KARATS[m].spot, spot) * KARATS[m].purity;
}

export function leadDays(m: Metal, s: StoneKey, mode: Mode): number {
  return LEAD.base + LEAD.queue
    + (mode === 'picture' ? LEAD.cadPicture : 0)
    + (m === 'PT950' ? LEAD.platinum : 0)
    + (s === 'natural' ? LEAD.naturalStone : 0);
}

/** Today at local midnight. Computed on each call so a tablet left on overnight stays correct. */
export function today(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function readyDate(m: Metal, s: StoneKey, mode: Mode, now: Date = new Date()): Date {
  const t = today(now);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + leadDays(m, s, mode));
}

export function cadVolumeCm3(d: Dims): number {
  return (Math.PI * (d.w / 2) * (d.h / 2) * d.d * (1 - CAD.openwork)) / 1000;
}

// Volume-based price. Until CAD exists, the metal weight carries a tolerance band.
// Invalid sizes price at zero metal rather than NaN, and callers block progress with dimsOk.
export function price(d: Dims, m: Metal, s: StoneKey, mode: Mode, exact: boolean, spot?: Spot): Price {
  const grams = dimsOk(d) ? cadVolumeCm3(d) * KARATS[m].density : 0;
  const rate = metalRate(m, spot);
  const metal = cents(grams * rate);
  const stone = cents(STONES[s].perCt * STONES[s].carat);
  const subtotal = cents(metal + stone + MAKING);
  const tax = cents(subtotal * STORE.taxRate);
  const total = cents(subtotal + tax);
  const tol = exact ? 0 : RANGE[mode];
  const low = cents((metal * (1 - tol) + stone + MAKING) * (1 + STORE.taxRate));
  const high = cents((metal * (1 + tol) + stone + MAKING) * (1 + STORE.taxRate));
  return {
    grams, rate, metal, stone, making: MAKING, subtotal, tax, total, low, high, tol,
    shareMetal: (metal / subtotal) * 100,
    shareStone: (stone / subtotal) * 100,
    shareMaking: (MAKING / subtotal) * 100,
  };
}

export function allOptions(d: Dims, mode: Mode, exact: boolean, spot?: Spot): Option[] {
  const out: Option[] = [];
  METALS.forEach(m => STONE_KEYS.forEach(s =>
    out.push({ ...price(d, m, s, mode, exact, spot), metalKey: m, stoneKey: s })));
  return out.sort((a, b) => a.total - b.total);
}

/* ---------------- Validation ---------------- */

export function dimOk(v: number): boolean {
  return Number.isFinite(v) && v >= DIM_LIMITS.min && v <= DIM_LIMITS.max;
}

export function dimsOk(d: Dims): boolean {
  return dimOk(d.w) && dimOk(d.h) && dimOk(d.d);
}

export const phoneDigits = (p: string): string => p.replace(/\D/g, '');

export function phoneOk(p: string): boolean {
  const n = phoneDigits(p).length;
  return n >= 10 && n <= 15;
}

export function emailOk(e: string): boolean {
  const v = e.trim();
  return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export interface CustErrors {
  name?: string;
  phone?: string;
  email?: string;
  ornament?: string;
}

export function custErrors(c: Customer): CustErrors {
  const e: CustErrors = {};
  if (!c.name.trim()) e.name = 'Enter the customer name';
  if (!c.phone.trim()) e.phone = 'Enter a phone number';
  else if (!phoneOk(c.phone)) e.phone = 'Enter a 10-digit phone number';
  if (!emailOk(c.email)) e.email = 'Check the email address';
  if (!c.ornament.trim()) e.ornament = 'Name the ornament';
  return e;
}

export function custOk(c: Customer): boolean {
  return Object.keys(custErrors(c)).length === 0;
}

/** A needed-by value is usable when it is a real calendar date. */
export function validISODate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/* ---------------- CAD rules ---------------- */

export interface CadRule {
  label: string;
  ok: boolean;
  detail: string;
}

export function cadRules(d: Dims): CadRule[] {
  const valid = dimsOk(d);
  const minSide = Math.min(d.w, d.h, d.d);
  const need = CAD.stoneDia + CAD.minWall;
  const size = valid ? `${d.w} × ${d.h} × ${d.d} mm` : 'size incomplete';
  return [
    { label: 'Thinnest side at least 0.8 mm (casting wall)', ok: valid && minSide >= CAD.minWall, detail: valid ? `${minSide} mm` : '—' },
    {
      label: 'Fits the 88 × 88 × 125 mm print tray',
      ok: valid && Math.max(d.w, d.h) <= CAD.tray[0] && d.d <= CAD.tray[2],
      detail: size,
    },
    { label: 'Depth holds the 0.20 ct stone seat', ok: valid && d.d >= need, detail: `needs ≥ ${need.toFixed(1)} mm` },
  ];
}

export function allCadOk(d: Dims): boolean {
  return cadRules(d).every(r => r.ok);
}
