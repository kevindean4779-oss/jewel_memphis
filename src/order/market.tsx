import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadConfig, saveConfig, type OwnerConfig } from './config';
import { fetchLiveRates, manualRates, type Rates } from './rates';
import type { Market } from './pricing';

interface MarketContext {
  mk: Market;
  setConfig: (cfg: OwnerConfig) => void;
  refreshRates: () => void;
}

const Ctx = createContext<MarketContext | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<OwnerConfig>(loadConfig);
  const [live, setLive] = useState<Rates | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!cfg.useLivePrices) { setLive(null); return; }
    let cancelled = false;
    fetchLiveRates().then(r => { if (!cancelled) setLive(r); });
    return () => { cancelled = true; };
  }, [cfg.useLivePrices, tick]);

  const value = useMemo<MarketContext>(() => ({
    mk: { cfg, rates: live ?? manualRates(cfg) },
    setConfig: next => { saveConfig(next); setCfg(next); },
    refreshRates: () => setTick(t => t + 1),
  }), [cfg, live]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarket(): MarketContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMarket must be used inside MarketProvider');
  return v;
}
