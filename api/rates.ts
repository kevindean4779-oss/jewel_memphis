import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/supabase';

// Live spot prices, cached in Supabase so cold starts don't spend the provider's quota.
const TROY_OZ_GRAMS = 31.1035;
const TTL_HOURS = Number(process.env.RATE_TTL_HOURS ?? 24);

// Sanity bounds in USD per troy ounce. A value outside these is rejected, so a
// wrong response shape can't put nonsense prices into quotes.
// After a provider failure, don't retry for a while: keeps a flaky provider from spending quota.
const RETRY_AFTER_MS = 10 * 60_000;
let lastFailureAt = 0;

const BOUNDS = { gold: [500, 10000], silver: [5, 200], platinum: [300, 5000] } as const;

interface SpotOz { gold: number; silver: number; platinum: number }

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`provider ${res.status}`);
  return res.json();
}

// Providers that quote currency per unit (rate = ounces per USD), so price = 1 / rate.
async function fromRateApi(base: string, key: string): Promise<SpotOz> {
  const body = await getJson(`${base}/v1/latest?api_key=${encodeURIComponent(key)}&base=USD&currencies=XAU,XAG,XPT`);
  const r = body?.rates ?? {};
  return { gold: 1 / r.XAU, silver: 1 / r.XAG, platinum: 1 / r.XPT };
}

// goldapi.io quotes USD per troy ounce in `price`, one symbol per request.
async function fromGoldApi(key: string): Promise<SpotOz> {
  const headers = { 'x-access-token': key };
  const [gold, silver, platinum] = await Promise.all(
    ['XAU', 'XAG', 'XPT'].map(s => getJson(`https://www.goldapi.io/api/${s}/USD`, headers).then(b => b.price)),
  );
  return { gold, silver, platinum };
}

async function fetchSpot(): Promise<{ oz: SpotOz; provider: string }> {
  const key = process.env.METALS_API_KEY;
  const provider = (process.env.METALS_API_PROVIDER ?? 'metalpriceapi').toLowerCase();
  if (!key) throw new Error('METALS_API_KEY is not set');
  let oz: SpotOz;
  if (provider === 'metalpriceapi') oz = await fromRateApi('https://api.metalpriceapi.com', key);
  else if (provider === 'metals-api') oz = await fromRateApi('https://metals-api.com', key);
  else if (provider === 'goldapi' || provider === 'gold-api') oz = await fromGoldApi(key);
  else throw new Error(`unsupported METALS_API_PROVIDER: ${provider}`);
  for (const k of Object.keys(BOUNDS) as (keyof SpotOz)[]) {
    const [lo, hi] = BOUNDS[k];
    if (!(oz[k] >= lo && oz[k] <= hi)) throw new Error(`${k} price out of range: ${oz[k]}`);
  }
  return { oz, provider };
}

function toClient(row: { gold: number; silver: number; platinum: number; fetched_at: string }, stale = false) {
  return {
    source: 'live' as const,
    gold24Gram: row.gold / TROY_OZ_GRAMS,
    silverGram: row.silver / TROY_OZ_GRAMS,
    platinumGram: row.platinum / TROY_OZ_GRAMS,
    time: new Date(row.fetched_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + (stale ? ' (cached)' : ''),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sb = serviceClient();
    const { data, error } = await sb.from('metal_rates').select('gold, silver, platinum, fetched_at').eq('id', 'spot').maybeSingle();
    if (error) throw error;
    if (data && Date.now() - Date.parse(data.fetched_at) < TTL_HOURS * 3600_000) {
      return res.json(toClient(data));
    }
    if (data && Date.now() - lastFailureAt < RETRY_AFTER_MS) {
      return res.json(toClient(data, true));
    }
    try {
      const { oz, provider } = await fetchSpot();
      const row = { id: 'spot', gold: oz.gold, silver: oz.silver, platinum: oz.platinum, provider, fetched_at: new Date().toISOString() };
      const { error: upErr } = await sb.from('metal_rates').upsert(row, { onConflict: 'id' });
      if (upErr) throw upErr;
      return res.json(toClient(row));
    } catch (providerErr) {
      console.error('rate refresh failed', providerErr);
      lastFailureAt = Date.now();
      if (data) return res.json(toClient(data, true)); // last good prices
      return res.status(503).json({ error: 'Live rates unavailable' });
    }
  } catch (err) {
    console.error('rates unavailable', err);
    return res.status(503).json({ error: 'Live rates unavailable' });
  }
}
