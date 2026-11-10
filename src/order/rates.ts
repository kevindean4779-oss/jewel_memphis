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

// Live spot prices from goldapi.io (free tier). The key is read from the build,
// so it is visible to anyone who opens the page: move the call behind a
// server function before wide use.
const API_KEY = import.meta.env.VITE_GOLDAPI_KEY as string | undefined;
const CACHE_KEY = 'custom-order-live-rates';
const TTL_HOURS = Number(import.meta.env.VITE_RATE_TTL_HOURS ?? 24);

interface Cached { at: number; rates: Rates }

async function fetchGram(symbol: 'XAU' | 'XAG' | 'XPT'): Promise<number> {
  const res = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
    headers: { 'x-access-token': API_KEY ?? '', 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${symbol} ${res.status}`);
  const body = (await res.json()) as { price_gram_24k?: number };
  if (!(body.price_gram_24k && body.price_gram_24k > 0)) throw new Error(`${symbol} no price`);
  return body.price_gram_24k;
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

// Returns fresh live rates, cached rates within the TTL, or null when unavailable.
export async function fetchLiveRates(): Promise<Rates | null> {
  const cached = readCache();
  const fresh = cached && Date.now() - cached.at < TTL_HOURS * 3600_000;
  if (fresh) return { ...cached.rates, source: 'live' };
  if (!API_KEY) return cached ? { ...cached.rates, source: 'live' } : null;
  try {
    const [gold24Gram, silverGram, platinumGram] = await Promise.all([
      fetchGram('XAU'), fetchGram('XAG'), fetchGram('XPT'),
    ]);
    const time = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const rates: Rates = { gold24Gram, silverGram, platinumGram, source: 'live', time };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rates } satisfies Cached));
    return rates;
  } catch {
    // Offline or quota reached: fall back to the last good live rates, if any.
    return cached ? { ...cached.rates, source: 'live', time: `${cached.rates.time} (cached)` } : null;
  }
}
