import { CAD, KARATS, LEAD, MAKING, METALS, RANGE, STONES, STONE_KEYS, STORE, TODAY, TROY_OZ_GRAMS, type Metal, type Mode, type StoneKey } from './data';
import type { Customer, Dims } from './types';
import { getSpot } from './rates';

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

/** Pure metal price per gram (USD) from the live spot feed. */
export function spotPerGram(spot: 'gold' | 'silver' | 'platinum'): number {
  return getSpot()[spot] / TROY_OZ_GRAMS;
}

/** Alloy price per gram: pure metal price × purity. */
export function metalRate(m: Metal): number {
  return spotPerGram(KARATS[m].spot) * KARATS[m].purity;
}

export function leadDays(m: Metal, s: StoneKey, mode: Mode): number {
  return LEAD.base + LEAD.queue
    + (mode === 'picture' ? LEAD.cadPicture : 0)
    + (m === 'PT950' ? LEAD.platinum : 0)
    + (s === 'natural' ? LEAD.naturalStone : 0);
}

export function readyDate(m: Metal, s: StoneKey, mode: Mode): Date {
  return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + leadDays(m, s, mode));
}

export function cadVolumeCm3(d: Dims): number {
  return (Math.PI * (d.w / 2) * (d.h / 2) * d.d * (1 - CAD.openwork)) / 1000;
}

// Volume-based price. Until CAD exists, the metal weight carries a tolerance band.
export function price(d: Dims, m: Metal, s: StoneKey, mode: Mode, exact: boolean): Price {
  const grams = cadVolumeCm3(d) * KARATS[m].density;
  const rate = metalRate(m);
  const metal = grams * rate;
  const stone = STONES[s].perCt * STONES[s].carat;
  const subtotal = metal + stone + MAKING;
  const tax = subtotal * STORE.taxRate;
  const total = subtotal + tax;
  const tol = exact ? 0 : RANGE[mode];
  const low = (metal * (1 - tol) + stone + MAKING) * (1 + STORE.taxRate);
  const high = (metal * (1 + tol) + stone + MAKING) * (1 + STORE.taxRate);
  return {
    grams, rate, metal, stone, making: MAKING, subtotal, tax, total, low, high, tol,
    shareMetal: (metal / subtotal) * 100,
    shareStone: (stone / subtotal) * 100,
    shareMaking: (MAKING / subtotal) * 100,
  };
}

export function allOptions(d: Dims, mode: Mode, exact: boolean): Option[] {
  const out: Option[] = [];
  METALS.forEach(m => STONE_KEYS.forEach(s =>
    out.push({ ...price(d, m, s, mode, exact), metalKey: m, stoneKey: s })));
  return out.sort((a, b) => a.total - b.total);
}

export function dimsOk(d: Dims): boolean {
  return (['w', 'h', 'd'] as const).every(k => Number.isFinite(d[k]) && d[k] > 0);
}

export function custOk(c: Customer): boolean {
  return Boolean(c.name.trim() && c.phone.trim() && c.ornament.trim());
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
