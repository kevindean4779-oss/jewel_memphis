// The quote, worked out the same way as the vendor's jewelry pricing calculator:
//   metal (weight + waste) × spot per gram × karat factor
// + casting labour (per gram) + stones (carat × $/ct + setting per stone) + services
// = production cost; quote before tax = production cost × markup.
import { KARATS, LEAD, type Metal, type Mode } from './data';
import { cadVolumeCm3, gramRate, type Market } from './pricing';
import type { Dims, OrderState, StoneLine } from './types';

const cents = (n: number) => Math.round(n * 100) / 100;

// Carat weight for a stone diameter, from the owner's size table.
export function caratOf(mk: Market, sizeMm: number): number {
  return mk.cfg.sizeCt[String(sizeMm)] ?? 0;
}

export function stoneCost(mk: Market, l: StoneLine) {
  const ct = caratOf(mk, l.sizeMm);
  const carats = l.qty * ct;
  const stones = carats * l.perCt;
  const setting = l.qty * l.setting;
  return { ct, carats, stones, setting, total: stones + setting };
}

// Weight the ornament should weigh, estimated from its size and metal until CAD gives the exact figure.
export function estimatedWeight(d: Dims, m: Metal): number {
  return cents(cadVolumeCm3(d) * KARATS[m].density);
}

// Grams used for the quote: the counter's entry, or the estimate.
export function weightOf(s: OrderState): number {
  return s.weight ?? estimatedWeight(s.dims, s.metal);
}

export interface Quote {
  weight: number;
  weightIsEstimate: boolean;
  wasteG: number;
  metal: number;
  labour: number;
  stones: number;
  services: number;
  production: number;
  markup: number;
  quote: number; // before tax
  margin: number; // gross margin: (quote − production) ÷ quote
  tax: number;
  total: number; // quote + tax
}

export function buildQuote(mk: Market, s: OrderState): Quote {
  const weight = weightOf(s);
  const wasteG = weight * (s.waste / 100);
  // Lines keep full precision, as the vendor calculator does; only the final quote is rounded to cents.
  const metal = (weight + wasteG) * gramRate(mk, s.metal);
  const labour = weight * s.labour;
  const stones = s.stones.reduce((t, l) => t + stoneCost(mk, l).total, 0);
  const services = s.services.reduce((t, v) => t + (Number.isFinite(v.cost) ? v.cost : 0), 0);
  const production = metal + labour + stones + services;
  const quoteAmt = cents(production * s.markup);
  const margin = quoteAmt > 0 ? (quoteAmt - production) / quoteAmt : 0;
  const tax = cents(quoteAmt * mk.cfg.taxRate);
  return {
    weight,
    weightIsEstimate: s.weight === null,
    wasteG,
    metal,
    labour,
    stones,
    services,
    production,
    markup: s.markup,
    quote: quoteAmt,
    margin,
    tax,
    total: cents(quoteAmt + tax),
  };
}

// Earliest ready date: base time, plus extra days for a picture-based estimate.
export function leadDays(_metal: Metal, _stones: StoneLine[], mode: Mode): number {
  return LEAD.base + LEAD.queue + (mode === 'picture' ? LEAD.cadPicture : 0);
}

export function readyDate(metal: Metal, stones: StoneLine[], mode: Mode, today = new Date()): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + leadDays(metal, stones, mode));
}
