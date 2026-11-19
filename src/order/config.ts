import { STONES, STONE_KEYS, TROY_OZ_GRAMS, type StoneKey } from './data';

// Owner-editable settings. Stored on this device until a shared settings table exists.
export interface OwnerConfig {
  taxRate: number;
  markup: number; // quote = production cost × markup (2.5 is the usual custom-work multiplier)
  wastePct: number; // metal lost to sprues, filings and polishing
  labourPerG: number; // casting cost, $ per gram of finished weight
  settingPerStone: number; // setting cost for each stone, $
  designCharge: number; // design, flat per ornament, $
  waxCharge: number; // wax design, flat per ornament, $
  polishingCharge: number; // polishing and finishing, flat per ornament, $
  sizeCt: Record<string, number>; // stone diameter in mm → carat weight
  deposits: number[];
  defaultDeposit: number;
  stonePerCt: Record<StoneKey, number>;
  manualOz: { gold24: number; silver: number }; // USD per troy ounce
  useLivePrices: boolean;
}

// Carat weights by diameter. 1.5 mm = 0.015 ct is the vendor's figure; the others are approximate
// round-brilliant weights. Replace them with your vendor's table in Settings.
export const DEFAULT_SIZE_CT: Record<string, number> = {
  '1': 0.005,
  '1.25': 0.009,
  '1.5': 0.015,
  '1.75': 0.024,
  '2': 0.036,
  '2.25': 0.051,
  '2.5': 0.07,
  '2.75': 0.094,
  '3': 0.121,
};

export const DEFAULT_CONFIG: OwnerConfig = {
  taxRate: 0.0825,
  markup: 2.5,
  wastePct: 10,
  labourPerG: 10,
  settingPerStone: 3.5,
  designCharge: 0,
  waxCharge: 0,
  polishingCharge: 0,
  sizeCt: DEFAULT_SIZE_CT,
  deposits: [25, 50, 100],
  defaultDeposit: 50,
  stonePerCt: Object.fromEntries(STONE_KEYS.map(k => [k, STONES[k].perCt])) as Record<StoneKey, number>,
  manualOz: { gold24: 130.44 * TROY_OZ_GRAMS, silver: 50 },
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
      sizeCt: { ...DEFAULT_CONFIG.sizeCt, ...saved.sizeCt },
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

// Returns the first problem with the owner settings, or null when they can be saved.
export function settingsProblem(c: OwnerConfig): string | null {
  if (!Number.isFinite(c.markup) || c.markup < 1 || c.markup > 10) return 'Markup must be between 1 and 10 (2.5 is typical).';
  if (!Number.isFinite(c.wastePct) || c.wastePct < 0 || c.wastePct > 50) return 'Waste must be between 0% and 50%.';
  if (!Number.isFinite(c.labourPerG) || c.labourPerG < 0) return 'Labour per gram must be a number, zero or more.';
  if (!Number.isFinite(c.settingPerStone) || c.settingPerStone < 0) return 'Setting cost per stone must be a number, zero or more.';
  if (![c.designCharge, c.waxCharge, c.polishingCharge].every(v => Number.isFinite(v) && v >= 0)) return 'Design, wax and polishing charges must be zero or more.';
  if (Object.values(c.sizeCt).some(v => !Number.isFinite(v) || v <= 0)) return 'Every stone size needs a carat weight above 0.'; 
  if (!Number.isFinite(c.taxRate) || c.taxRate < 0 || c.taxRate > 0.25) return 'Sales tax must be between 0% and 25%.';
  if (Object.values(c.stonePerCt).some(v => !Number.isFinite(v) || v < 0)) return 'Stone prices must be numbers, zero or more.';
  const { gold24, silver } = c.manualOz;
  if (![gold24, silver].every(v => Number.isFinite(v) && v > 0)) return 'Manual metal prices must be above zero.';
  return null;
}

export const taxLabel = (cfg: OwnerConfig): string =>
  `Sales tax (${(cfg.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%, store location)`;
