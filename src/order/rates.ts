import { TROY_OZ_GRAMS } from './data';
import type { OwnerConfig } from './config';

// Spot prices in USD per gram of pure metal.
export interface Rates {
  gold24Gram: number;
  silverGram: number;
  platinumGram: number;
  source: 'live' | 'manual';
  time: string;
}

export function manualRates(cfg: OwnerConfig): Rates {
  return {
    gold24Gram: cfg.manualOz.gold24 / TROY_OZ_GRAMS,
    silverGram: cfg.manualOz.silver / TROY_OZ_GRAMS,
    platinumGram: cfg.manualOz.platinum / TROY_OZ_GRAMS,
    source: 'manual',
    time: 'owner rates',
  };
}

// Live prices come from /api/rates, which caches them on the server.
// Returns null when the server or provider is unavailable, so the caller falls back to owner rates.
export async function fetchLiveRates(): Promise<Rates | null> {
  try {
    const res = await fetch('/api/rates', { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as Omit<Rates, 'source'> & { source: 'live' };
    if (!(body.gold24Gram > 0 && body.silverGram > 0 && body.platinumGram > 0)) return null;
    return { gold24Gram: body.gold24Gram, silverGram: body.silverGram, platinumGram: body.platinumGram, source: 'live', time: body.time };
  } catch {
    return null;
  }
}
