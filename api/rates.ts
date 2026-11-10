// Vercel serverless function: GET /api/rates
// Fetches live spot prices on the server so the API key never reaches the browser.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables,
// or in a local .env.local file, which git ignores):
//   METALS_API_KEY       your key for the provider below
//   METALS_API_PROVIDER  metalpriceapi | metals-api | metals-dev | goldapi | gold-api
//                        (gold-api needs no key; it is used when no key is set)
//
// Response: { gold, silver, platinum } in USD per troy ounce, plus updatedAt and source.

export interface SpotRates {
  gold: number;
  silver: number;
  platinum: number;
  updatedAt: string; // ISO time of the provider's quote
  source: string;
}

type Fetcher = (key: string) => Promise<SpotRates>;

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(`Provider returned HTTP ${res.status}`);
  return body;
}

const iso = (seconds?: number) => new Date(seconds ? seconds * 1000 : Date.now()).toISOString();

// metalpriceapi.com and metals-api.com share one format: rates are metal units per 1 USD,
// with USDXAU-style keys giving USD per ounce directly when available.
function perOunce(rates: Record<string, number>, sym: string): number {
  const direct = rates[`USD${sym}`];
  if (direct) return direct;
  if (rates[sym]) return 1 / rates[sym];
  throw new Error(`Provider did not return ${sym}`);
}

const PROVIDERS: Record<string, Fetcher> = {
  metalpriceapi: async key => {
    const j = await getJson(`https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(key)}&base=USD&currencies=XAU,XAG,XPT`);
    if (j.success === false) throw new Error(j.error?.info || j.error?.message || 'Provider error');
    return { gold: perOunce(j.rates, 'XAU'), silver: perOunce(j.rates, 'XAG'), platinum: perOunce(j.rates, 'XPT'), updatedAt: iso(j.timestamp), source: 'metalpriceapi.com' };
  },
  'metals-api': async key => {
    const j = await getJson(`https://metals-api.com/api/latest?access_key=${encodeURIComponent(key)}&base=USD&symbols=XAU,XAG,XPT`);
    if (j.success === false) throw new Error(j.error?.info || 'Provider error');
    return { gold: perOunce(j.rates, 'XAU'), silver: perOunce(j.rates, 'XAG'), platinum: perOunce(j.rates, 'XPT'), updatedAt: iso(j.timestamp), source: 'metals-api.com' };
  },
  'metals-dev': async key => {
    const j = await getJson(`https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(key)}&currency=USD&unit=toz`);
    if (j.status !== 'success') throw new Error(j.error_message || 'Provider error');
    return { gold: j.metals.gold, silver: j.metals.silver, platinum: j.metals.platinum, updatedAt: j.timestamps?.metal || iso(), source: 'metals.dev' };
  },
  goldapi: async key => {
    const one = (sym: string) => getJson(`https://www.goldapi.io/api/${sym}/USD`, { 'x-access-token': key });
    const [g, s, p] = await Promise.all([one('XAU'), one('XAG'), one('XPT')]);
    return { gold: g.price, silver: s.price, platinum: p.price, updatedAt: iso(g.timestamp), source: 'goldapi.io' };
  },
  'gold-api': async key => {
    const headers: Record<string, string> = key ? { 'x-api-key': key } : {};
    const one = (sym: string) => getJson(`https://api.gold-api.com/price/${sym}`, headers);
    const [g, s, p] = await Promise.all([one('XAU'), one('XAG'), one('XPT')]);
    return { gold: g.price, silver: s.price, platinum: p.price, updatedAt: g.updatedAt || iso(), source: 'gold-api.com' };
  },
};

function valid(r: SpotRates): boolean {
  return [r.gold, r.silver, r.platinum].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
}

// Reused for 10 minutes by a warm server (and by `npm run dev`), on top of Vercel's edge cache.
const TTL_MS = 10 * 60 * 1000;
let memo: { at: number; rates: SpotRates } | null = null;

export async function fetchSpot(env: Record<string, string | undefined>): Promise<SpotRates> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.rates;
  const key = (env.METALS_API_KEY || '').trim();
  const name = (env.METALS_API_PROVIDER || (key ? 'metalpriceapi' : 'gold-api')).trim().toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown METALS_API_PROVIDER "${name}"`);
  if (!key && name !== 'gold-api') throw new Error('METALS_API_KEY is not set');
  const r = await provider(key);
  if (!valid(r)) throw new Error('Provider returned incomplete prices');
  memo = { at: Date.now(), rates: r };
  return r;
}

export async function GET(): Promise<Response> {
  try {
    const rates = await fetchSpot(process.env);
    return Response.json(rates, {
      // Vercel's edge cache serves one provider call to every tablet for 10 minutes,
      // which keeps free-plan request limits safe.
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    });
  } catch (e) {
    // Never echo the key; only the message.
    const message = e instanceof Error ? e.message : 'Rates unavailable';
    return Response.json({ error: message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
