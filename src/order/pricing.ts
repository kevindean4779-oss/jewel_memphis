import { CAD, KARATS, type Metal } from './data';
import type { OwnerConfig } from './config';
import type { Rates } from './rates';
import type { Customer, Dims } from './types';

export interface Market {
  cfg: OwnerConfig;
  rates: Rates;
}

// Price per gram of this karat/alloy: spot rate of its metal family × purity factor.
export function gramRate(mk: Market, m: Metal): number {
  const k = KARATS[m];
  const base = k.family === 'gold' ? mk.rates.gold24Gram : mk.rates.silverGram;
  return base * k.purity;
}

// Estimated finished volume (cm³) of the ornament from its width, height and depth.
export function cadVolumeCm3(d: Dims): number {
  return (Math.PI * (d.w / 2) * (d.h / 2) * d.d * (1 - CAD.openwork)) / 1000;
}

// Largest size the counter accepts. Nothing in this range is a real ornament.
export const MAX_DIM_MM = 300;

export type SizeKey = keyof Dims;
export type SizeErrors = Partial<Record<SizeKey, string>>;

// Each required size, with the message shown under its box.
export function sizeErrors(d: Dims): SizeErrors {
  const out: SizeErrors = {};
  (['w', 'h', 'd'] as const).forEach(k => {
    const v = d[k];
    if (!Number.isFinite(v) || v <= 0) out[k] = 'Required. Enter a size above 0.';
    else if (v > MAX_DIM_MM) out[k] = `Too large. The limit is ${MAX_DIM_MM} mm.`;
  });
  return out;
}

export function dimsOk(d: Dims): boolean {
  return Object.keys(sizeErrors(d)).length === 0;
}

// A phone number needs at least 7 digits. Email is optional, but if given it must look like one.
export function phoneOk(p: string): boolean {
  return p.replace(/\D/g, '').length >= 7;
}

export function emailOk(e: string): boolean {
  const v = e.trim();
  return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export type CustKey = 'name' | 'phone' | 'ornament' | 'email';
export type CustErrors = Partial<Record<CustKey, string>>;

// Required fields (name, phone, ornament) and the one optional field that must be valid if filled.
export function custErrors(c: Customer): CustErrors {
  const out: CustErrors = {};
  if (!c.name.trim()) out.name = 'Required. Enter the customer’s full name.';
  if (!c.phone.trim()) out.phone = 'Required. Enter a phone number.';
  else if (!phoneOk(c.phone)) out.phone = 'Enter a phone number with at least 7 digits.';
  if (!c.ornament.trim()) out.ornament = 'Required. Name the ornament, for example “Lotus jhumka”.';
  if (!emailOk(c.email)) out.email = 'Enter a complete email, for example name@example.com.';
  return out;
}

const cents = (n: number) => Math.round(n * 100) / 100;

// A deposit typed in dollars, such as "300", "$1,250.50". Null when it is not a positive amount.
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/[$,\s]/g, '');
  if (clean === '') return null;
  const v = Number(clean);
  return Number.isFinite(v) && v > 0 ? cents(v) : null;
}

// The deposit that applies: the saved amount, or the default percentage of the total when none is saved.
// Always within 0 and the total, rounded to cents.
export function depositDue(total: number, saved: number | null, defaultPct: number): number {
  const raw = saved ?? (total * defaultPct) / 100;
  return cents(Math.min(Math.max(raw, 0), total));
}

// Dollar amount for a percentage of the total, e.g. 25% of $1,073.32 = $268.33.
export function percentOf(total: number, pct: number): number {
  return cents((total * pct) / 100);
}

export function custOk(c: Customer): boolean {
  return Object.keys(custErrors(c)).length === 0;
}

export interface CadRule {
  label: string;
  ok: boolean;
  detail: string;
}

export function cadRules(d: Dims): CadRule[] {
  const minSide = Math.min(d.w, d.h, d.d);
  const need = CAD.stoneDia + CAD.minWall;
  return [
    { label: 'Thinnest side at least 0.8 mm (casting wall)', ok: minSide >= CAD.minWall, detail: `${minSide} mm` },
    {
      label: 'Fits the 88 × 88 × 125 mm print tray',
      ok: Math.max(d.w, d.h) <= CAD.tray[0] && d.d <= CAD.tray[2],
      detail: `${d.w} × ${d.h} × ${d.d} mm`,
    },
    { label: 'Depth holds the 0.20 ct stone seat', ok: d.d >= need, detail: `needs ≥ ${need.toFixed(1)} mm` },
  ];
}

export function allCadOk(d: Dims): boolean {
  return cadRules(d).every(r => r.ok);
}
