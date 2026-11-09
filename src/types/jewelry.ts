/**
 * Jewelry Custom Quoter Type Definitions
 */

export type MetalType = 'brass' | 'silver_925' | 'gold_10k' | 'gold_14k' | 'gold_18k' | 'platinum_950';

export type MetalColor = 'yellow' | 'white' | 'rose' | 'two_tone';

export type StoneType = 'none' | 'cz' | 'moissanite' | 'lab_diamond' | 'natural_diamond';

export type StoneCoverage = 'none' | 'accents' | 'half_iced' | 'full_bust_down';

export type BackplateType = 'open' | 'mesh_cage' | 'solid_plate' | 'engraved_solid' | 'micro_pave_back';

export type BailSize = 'standard_small' | 'medium_cuban' | 'large_miami' | 'iced_bail';

export type Solidness = 'hollow' | 'semi_solid' | 'solid';

export const METAL_LABELS: Record<MetalType, string> = {
  brass: 'Jewelers Brass (Vermeil Ready)',
  silver_925: '925 Sterling Silver',
  gold_10k: '10K Solid Gold',
  gold_14k: '14K Solid Gold',
  gold_18k: '18K Solid Gold',
  platinum_950: 'Platinum 950',
};

export const STONE_LABELS: Record<StoneType, string> = {
  none: 'Plain High-Polish (No Stones)',
  cz: '5A Brilliant Cubic Zirconia',
  moissanite: 'VVS1 D-Color Moissanite (Diamond Tester Pass)',
  lab_diamond: 'VS-SI DEF Lab-Grown Diamonds',
  natural_diamond: 'VS-SI GH Natural Earth Diamonds',
};

export const BACKPLATE_LABELS: Record<BackplateType, string> = {
  open: 'Open Cavity (Hollow Back - Lightweight)',
  mesh_cage: 'Honeycomb Cage Grill (Luxury Breathing Back)',
  solid_plate: 'Solid Mirror-Polished Backplate (Heavy Heft)',
  engraved_solid: 'Solid Backplate + Custom Laser Engraving',
  micro_pave_back: 'Dual-Sided Micro-Pavé Bust Down Back',
};

export const BAIL_LABELS: Record<BailSize, string> = {
  standard_small: 'Standard Loop / Small Rope (up to 4mm chain)',
  medium_cuban: 'Medium Cuban / Franco Bail (up to 8mm chain)',
  large_miami: 'Large Miami Cuban Bail (up to 14mm heavy chain)',
  iced_bail: 'Custom Pavé Iced-Out Bail (up to 10mm chain)',
};

export interface SpotPrices {
  goldPerOz: number;      // e.g. 2740
  silverPerOz: number;    // e.g. 32.50
  platinumPerOz: number;  // e.g. 985
  brassPerGram: number;   // e.g. 0.08
  lastUpdated: string;
}

export interface ShopRates {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  makingChargePercent: number; // Making charge percentage on precious metal/casting (default 20%)
  cadFee: number;             // Wholesale cost for CAD 3D file ($60)
  waxPrintFee: number;        // Wholesale wax print & flask setup ($35)
  castingLaborFee: number;    // Casting labor ($40)
  finishingLaborFee: number;  // Polish, clean, rodium/dip ($45)
  refinerLossPercent: number; // 8% to 10%
  targetMarkup: number;       // default 2.0x (100% profit - double cost)
  minWalkAwayMargin: number;  // default 30% gross margin minimum floor
  salesTaxPercent: number;    // e.g. 8.25%
}

export interface CustomPieceConfig {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  
  // Dimensions
  heightInches: number; // e.g. 2.0
  widthInches: number;  // e.g. 2.0
  depthMm: number;      // e.g. 3.5
  
  // Materials
  metal: MetalType;
  metalColor: MetalColor;
  solidness: Solidness;
  backplate: BackplateType;
  bail: BailSize;
  
  // Stones
  stoneType: StoneType;
  stoneCoverage: StoneCoverage;
  customStoneCountOverride?: number;
  
  // Weight Override (if jeweler has exact CAD gram weight)
  weightOverrideGrams?: number;
}

export interface CostBreakdown {
  // Estimated physical specs
  calculatedGrams: number;
  pureMetalGrams: number;
  metalPurityPercent: number;
  estimatedStoneCount: number;
  estimatedCaratWeight: number;

  // Wholesale / Base Cost
  metalRawCost: number;
  metalLossCost: number;
  metalTotalWholesaleCost: number;
  makingChargePercent: number;
  makingChargeAmount: number;
  stonesWholesaleCost: number;
  stoneSettingLaborCost: number;
  cadAndPrintCost: number;
  benchLaborCost: number;
  baseCost: number;   // Total Base Cost (COGS)
  totalCogs: number;  // Alias for baseCost

  // Customer-Facing Price & Margins
  customerFacingPrice: number; // Final customer price
  retailPrice: number;         // Alias for customerFacingPrice
  minWalkAwayPrice: number;
  grossProfitDollars: number;
  grossProfitMarginPercent: number;
  recommendedDeposit: number; // 50%
  salesTax: number;
  totalWithTax: number;
}

export interface BudgetSuggestion {
  id: string;
  title: string;
  tagline: string;
  metal: MetalType;
  metalColor: MetalColor;
  heightInches: number;
  widthInches: number;
  depthMm: number;
  solidness: Solidness;
  backplate: BackplateType;
  stoneType: StoneType;
  stoneCoverage: StoneCoverage;
  bail: BailSize;
  estimatedWeightGrams: number;
  estimatedRetailPrice: number;
  differenceFromBudget: number;
  highlights: string[];
}
