import { STONES, STONE_KEYS, TROY_OZ_GRAMS, type StoneKey } from './data';

// Owner-editable settings. Stored on this device until a shared settings table exists.
export interface OwnerConfig {
  makingFee: number;
  taxRate: number;
  deposits: number[];
  defaultDeposit: number;
  stonePerCt: Record<StoneKey, number>;
  manualOz: { gold24: number; silver: number; platinum: number }; // USD per troy ounce
  useLivePrices: boolean;
}

export const DEFAULT_CONFIG: OwnerConfig = {
  makingFee: 80,
  taxRate: 0.0825,
  deposits: [25, 50, 100],
  defaultDeposit: 50,
  stonePerCt: Object.fromEntries(STONE_KEYS.map(k => [k, STONES[k].perCt])) as Record<StoneKey, number>,
  manualOz: { gold24: 130.44 * TROY_OZ_GRAMS, silver: 50, platinum: 1459.3 },
  useLivePrices: true,
};

const KEY = 'custom-order-settings';

export function loadConfig(): OwnerConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Partial<OwnerConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      stonePerCt: { ...DEFAULT_CONFIG.stonePerCt, ...saved.stonePerCt },
      manualOz: { ...DEFAULT_CONFIG.manualOz, ...saved.manualOz },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: OwnerConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}

export const taxLabel = (cfg: OwnerConfig): string =>
  `Sales tax (${(cfg.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%, store location)`;
