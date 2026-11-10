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

// Used only until the first successful fetch. Shown with a "Sample" badge.
const SAMPLE: Spot = { gold: 4057.1, silver: 48.5, platinum: 1459.3, updatedAt: '', source: 'sample values' };

function loadCached(): Spot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const s = raw ? (JSON.parse(raw) as Spot) : null;
    return s && s.gold > 0 && s.silver > 0 && s.platinum > 0 ? s : null;
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

export async function refreshRates(): Promise<void> {
  try {
    const res = await fetch('/api/rates', { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.error) throw new Error(body?.error || `HTTP ${res.status}`);
    const spot = body as Spot;
    if (!(spot.gold > 0 && spot.silver > 0 && spot.platinum > 0)) throw new Error('Incomplete prices');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(spot)); } catch { /* storage unavailable */ }
    set({ spot, status: 'live', error: null });
  } catch (e) {
    set({ status: state.status === 'live' ? 'live' : state.spot === SAMPLE ? 'sample' : 'stale', error: e instanceof Error ? e.message : 'Rates unavailable' });
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
