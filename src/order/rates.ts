// Live metal spot prices for the app.
// Fetched from /api/rates (a server function that holds the API key), refreshed every
// 10 minutes, and kept in this browser so the counter still prices offline.
import { useEffect, useSyncExternalStore } from 'react';

export interface Spot {
  gold: number; // USD per troy ounce
  silver: number;
  platinum: number;
  updatedAt: string; // ISO
  source: string;
}

export type RateStatus = 'loading' | 'live' | 'stale' | 'sample';

interface RateState {
  spot: Spot;
  status: RateStatus; // live: fetched this session; stale: last saved prices; sample: never fetched
  error: string | null;
}

const CACHE_KEY = 'gj-spot-rates';
const REFRESH_MS = 10 * 60 * 1000;
const LIVE_FOR_MS = 30 * 60 * 1000;
let lastOk = 0;

// Used only until the first successful fetch. Shown with a "Sample" badge.
const SAMPLE_SOURCE = 'sample values';
const SAMPLE: Spot = { gold: 4057.1, silver: 48.5, platinum: 1459.3, updatedAt: '', source: SAMPLE_SOURCE };

// Plausible USD-per-ounce ranges. A value outside them is treated as a bad quote, not a price.
export const SPOT_BOUNDS = { gold: [500, 20000], silver: [5, 500], platinum: [200, 10000] } as const;

export function isSpot(v: unknown): v is Spot {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (['gold', 'silver', 'platinum'] as const).every(k => {
    const n = s[k];
    return typeof n === 'number' && Number.isFinite(n) && n >= SPOT_BOUNDS[k][0] && n <= SPOT_BOUNDS[k][1];
  }) && typeof s.updatedAt === 'string' && typeof s.source === 'string';
}

export const isSampleSpot = (s: Spot) => s.source === SAMPLE_SOURCE;

function loadCached(): Spot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const s: unknown = raw ? JSON.parse(raw) : null;
    return isSpot(s) && !isSampleSpot(s) ? s : null;
  } catch {
    return null;
  }
}

const cached = loadCached();
let state: RateState = { spot: cached ?? SAMPLE, status: cached ? 'stale' : 'sample', error: null };
const listeners = new Set<() => void>();

function set(next: Partial<RateState>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

/** Current spot prices, for pricing code outside React. */
export function getSpot(): Spot {
  return state.spot;
}

let inflight: Promise<void> | null = null;

export function refreshRates(): Promise<void> {
  inflight ??= doRefresh().finally(() => { inflight = null; });
  return inflight;
}

async function doRefresh(): Promise<void> {
  try {
    // AbortController rather than AbortSignal.timeout, which older iPads lack.
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    const res = await fetch('/api/rates', { headers: { Accept: 'application/json' }, signal: ctl.signal }).finally(() => clearTimeout(timer));
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.error) throw new Error(body?.error || `HTTP ${res.status}`);
    if (!isSpot(body)) throw new Error('Prices out of range');
    const spot = body;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(spot)); } catch { /* storage unavailable */ }
    lastOk = Date.now();
    set({ spot, status: 'live', error: null });
  } catch (e) {
    // Prices count as live only while the last good fetch is recent.
    const fresh = lastOk > 0 && Date.now() - lastOk < LIVE_FOR_MS;
    const message = e instanceof Error ? (e.name === 'AbortError' ? 'Timed out' : e.message) : 'Rates unavailable';
    set({ status: fresh ? 'live' : isSampleSpot(state.spot) ? 'sample' : 'stale', error: message });
  }
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Subscribes the component to rate changes and keeps the feed refreshed while mounted. */
export function useRates(autoRefresh = false): RateState {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!autoRefresh) return;
    refreshRates();
    const id = window.setInterval(refreshRates, REFRESH_MS);
    const onFocus = () => { if (document.visibilityState === 'visible') refreshRates(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onFocus); };
  }, [autoRefresh]);
  return s;
}

export function rateTime(spot: Spot): string {
  if (!spot.updatedAt) return 'not yet updated';
  const d = new Date(spot.updatedAt);
  if (Number.isNaN(d.getTime())) return spot.updatedAt;
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString('en-US', sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
