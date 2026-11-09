import {
  CustomPieceConfig,
  CostBreakdown,
  SpotPrices,
  ShopRates,
  BudgetSuggestion,
  MetalType,
  StoneType,
  BackplateType,
  Solidness,
  BailSize,
  METAL_LABELS,
  STONE_LABELS,
  BACKPLATE_LABELS,
  BAIL_LABELS,
} from '../types/jewelry';

export const DEFAULT_SPOT_PRICES: SpotPrices = {
  goldPerOz: 4070.00,      // Verified live gold spot price per troy oz
  silverPerOz: 52.00,       // Verified live silver spot price per troy oz
  platinumPerOz: 1545.00,   // Verified live platinum spot price per troy oz
  brassPerGram: 0.08,
  lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

/**
 * Fetches real-time precious metal market spot prices directly from global feeds
 */
export async function fetchLiveSpotPrices(): Promise<SpotPrices | null> {
  try {
    const [goldRes, silverRes, platRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU'),
      fetch('https://api.gold-api.com/price/XAG'),
      fetch('https://api.gold-api.com/price/XPT'),
    ]);

    if (!goldRes.ok || !silverRes.ok || !platRes.ok) {
      return null;
    }

    const goldData = await goldRes.json();
    const silverData = await silverRes.json();
    const platData = await platRes.json();

    const goldPerOz = Math.round(Number(goldData.price) * 100) / 100;
    const silverPerOz = Math.round(Number(silverData.price) * 100) / 100;
    const platinumPerOz = Math.round(Number(platData.price) * 100) / 100;

    return {
      goldPerOz: goldPerOz > 0 ? goldPerOz : 4070.00,
      silverPerOz: silverPerOz > 0 ? silverPerOz : 52.00,
      platinumPerOz: platinumPerOz > 0 ? platinumPerOz : 1545.00,
      brassPerGram: 0.08,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  } catch (err) {
    console.warn('Real-time spot price fetcher warning:', err);
    return null;
  }
}

export const DEFAULT_SHOP_RATES: ShopRates = {
  storeName: "Golden Jewelers Memphis",
  storePhone: "(901) 555-GOLD",
  storeAddress: "Memphis, TN",
  makingChargePercent: 20, // 20% industry standard making fee
  cadFee: 65,
  waxPrintFee: 35,
  castingLaborFee: 40,
  finishingLaborFee: 45,
  refinerLossPercent: 9.0, // 9% fire loss
  targetMarkup: 2.0,      // 2.0x wholesale cost (100% profit - double cost only)
  minWalkAwayMargin: 30,  // minimum 30% margin
  salesTaxPercent: 8.875, // NYC standard
};

// Metal Densities in grams per cubic centimeter (g/cm³)
export const METAL_DENSITIES: Record<MetalType, number> = {
  brass: 8.45,
  silver_925: 10.36,
  gold_10k: 11.57,
  gold_14k: 13.07,
  gold_18k: 15.58,
  platinum_950: 21.45,
};

// Precious metal purity ratios
export const METAL_PURITY: Record<MetalType, number> = {
  brass: 0.0,
  silver_925: 0.925,
  gold_10k: 0.4167, // 10/24
  gold_14k: 0.5833, // 14/24
  gold_18k: 0.7500, // 18/24
  platinum_950: 0.950,
};

export {
  METAL_LABELS,
  STONE_LABELS,
  BACKPLATE_LABELS,
  BAIL_LABELS,
} from '../types/jewelry';

/**
 * Calculates accurate physical grams based on dimensions and density
 */
export function calculatePieceWeight(
  config: CustomPieceConfig
): { calculatedGrams: number; pureMetalGrams: number } {
  if (config.weightOverrideGrams && config.weightOverrideGrams > 0) {
    const purity = METAL_PURITY[config.metal];
    return {
      calculatedGrams: config.weightOverrideGrams,
      pureMetalGrams: config.weightOverrideGrams * purity,
    };
  }

  // Convert dimensions to centimeters
  const heightCm = config.heightInches * 2.54;
  const widthCm = config.widthInches * 2.54;
  const depthCm = config.depthMm / 10;

  // Typical letter / custom charm silhouette fills ~52% of bounding box
  const silhouetteFactor = 0.52;
  const boundingVolumeCm3 = heightCm * widthCm * depthCm * silhouetteFactor;

  // Solidness internal ratio
  const solidnessMultipliers: Record<Solidness, number> = {
    hollow: 0.38,
    semi_solid: 0.62,
    solid: 0.88,
  };
  const coreVolume = boundingVolumeCm3 * solidnessMultipliers[config.solidness];

  // Backplate volume addition
  const backplateMultipliers: Record<BackplateType, number> = {
    open: 0.0,
    mesh_cage: 0.16,
    solid_plate: 0.32,
    engraved_solid: 0.35,
    micro_pave_back: 0.40,
  };
  const backplateVolume = boundingVolumeCm3 * backplateMultipliers[config.backplate];

  // Base bail volume in cm3 (relative to metal density)
  const bailBaseVolumes: Record<BailSize, number> = {
    standard_small: 0.15,
    medium_cuban: 0.32,
    large_miami: 0.65,
    iced_bail: 0.45,
  };

  const totalVolumeCm3 = coreVolume + backplateVolume + bailBaseVolumes[config.bail];
  const density = METAL_DENSITIES[config.metal];
  const totalGrams = Math.round(totalVolumeCm3 * density * 10) / 10;
  const purity = METAL_PURITY[config.metal];

  return {
    calculatedGrams: Math.max(1.0, totalGrams),
    pureMetalGrams: Math.round(totalGrams * purity * 10) / 10,
  };
}

/**
 * Calculates stone counts and total estimated carats
 */
export function calculateStoneDetails(config: CustomPieceConfig): {
  count: number;
  caratWeight: number;
} {
  if (config.customStoneCountOverride !== undefined && config.customStoneCountOverride >= 0) {
    const count = config.customStoneCountOverride;
    const caratWeight = Math.round(count * 0.015 * 100) / 100;
    return { count, caratWeight };
  }

  if (config.stoneType === 'none' || config.stoneCoverage === 'none') {
    return { count: 0, caratWeight: 0 };
  }

  // Base stones per square inch for 1.3mm - 1.5mm micro-pave
  const surfaceAreaSqIn = config.heightInches * config.widthInches;
  const stonesPerSqIn = 72; // dense custom charm pavé

  const coverageRatios = {
    none: 0,
    accents: 0.22,
    half_iced: 0.50,
    full_bust_down: 0.90,
  };

  let count = Math.round(surfaceAreaSqIn * stonesPerSqIn * coverageRatios[config.stoneCoverage]);

  if (config.bail === 'iced_bail') {
    count += 28; // Bail iced stones
  }

  if (config.backplate === 'micro_pave_back') {
    count = Math.round(count * 1.55); // Additional back pave stones
  }

  // Carat weight (~0.015 ct average per 1.5mm melee stone)
  const caratWeight = Math.round(count * 0.015 * 100) / 100;

  return { count, caratWeight };
}

/**
 * Full master pricing calculation engine
 */
export function calculateCompleteCost(
  config: CustomPieceConfig,
  spotPrices: SpotPrices,
  rates: ShopRates
): CostBreakdown {
  const { calculatedGrams, pureMetalGrams } = calculatePieceWeight(config);
  const { count: estimatedStoneCount, caratWeight: estimatedCaratWeight } = calculateStoneDetails(config);

  // Spot price per gram pure
  let spotPerGram = 0;
  if (config.metal === 'gold_10k' || config.metal === 'gold_14k' || config.metal === 'gold_18k') {
    spotPerGram = spotPrices.goldPerOz / 31.1034768;
  } else if (config.metal === 'silver_925') {
    spotPerGram = spotPrices.silverPerOz / 31.1034768;
  } else if (config.metal === 'platinum_950') {
    spotPerGram = spotPrices.platinumPerOz / 31.1034768;
  } else {
    // Brass / base alloy
    spotPerGram = spotPrices.brassPerGram;
  }

  // Pure metal raw melt cost
  const metalPurity = METAL_PURITY[config.metal];
  const metalRawCost = config.metal === 'brass'
    ? calculatedGrams * spotPerGram
    : calculatedGrams * metalPurity * spotPerGram;

  // Refiner & Casting Fire Loss (8% - 10%)
  const metalLossCost = metalRawCost * (rates.refinerLossPercent / 100);
  const metalTotalWholesaleCost = metalRawCost + metalLossCost;

  // Wholesale stone costs per piece
  const wholesaleStoneCostPerPiece: Record<StoneType, number> = {
    none: 0,
    cz: 0.07,
    moissanite: 2.30,
    lab_diamond: 11.50,
    natural_diamond: 35.00,
  };

  // Bench stone setting labor per piece
  const stoneSettingLaborPerPiece: Record<StoneType, number> = {
    none: 0,
    cz: 0.85,
    moissanite: 1.35,
    lab_diamond: 2.10,
    natural_diamond: 2.65,
  };

  const stonesWholesaleCost = estimatedStoneCount * wholesaleStoneCostPerPiece[config.stoneType];
  const stoneSettingLaborCost = estimatedStoneCount * stoneSettingLaborPerPiece[config.stoneType];

  // Workshop CAD, 3D printing & Bench Casting/Polishing fees
  const cadAndPrintCost = rates.cadFee + rates.waxPrintFee;
  let benchLaborCost = rates.castingLaborFee + rates.finishingLaborFee;
  
  if (config.backplate === 'engraved_solid') {
    benchLaborCost += 30; // Custom fiber laser deep engraving fee
  }

  // Making charge percentage on metal & casting (industry standard making fee e.g. 20%)
  const makingChargePercent = rates.makingChargePercent ?? 20;
  const makingChargeAmount = Math.round((metalTotalWholesaleCost * (makingChargePercent / 100)) * 100) / 100;

  // Total Base Cost (Cost of Goods Sold / COGS)
  const baseCost = metalTotalWholesaleCost + makingChargeAmount + stonesWholesaleCost + stoneSettingLaborCost + cadAndPrintCost + benchLaborCost;
  const totalCogs = baseCost;

  // Customer-Facing Price (Retail Price) - Double Total Wholesale Cost (100% profit)
  const rawRetail = baseCost * (rates.targetMarkup ?? 2.0);
  let retailPrice = Math.round(rawRetail);
  if (retailPrice === 0) retailPrice = 50;
  const customerFacingPrice = retailPrice;

  // Walk-away minimum (lowest price jeweler can negotiate to still maintain healthy store profit)
  const minMarkupMultiplier = 1 / (1 - (rates.minWalkAwayMargin / 100));
  const minWalkAwayPrice = Math.round((baseCost * minMarkupMultiplier) / 10) * 10;

  const grossProfitDollars = Math.round((retailPrice - baseCost) * 100) / 100;
  const grossProfitMarginPercent = Math.round((grossProfitDollars / retailPrice) * 1000) / 10;

  const recommendedDeposit = Math.round((retailPrice * 0.5) / 10) * 10; // 50% deposit
  const salesTax = Math.round((retailPrice * (rates.salesTaxPercent / 100)) * 100) / 100;
  const totalWithTax = Math.round((retailPrice + salesTax) * 100) / 100;

  return {
    calculatedGrams,
    pureMetalGrams,
    metalPurityPercent: Math.round(metalPurity * 100),
    estimatedStoneCount,
    estimatedCaratWeight,
    metalRawCost: Math.round(metalRawCost * 100) / 100,
    metalLossCost: Math.round(metalLossCost * 100) / 100,
    metalTotalWholesaleCost: Math.round(metalTotalWholesaleCost * 100) / 100,
    makingChargePercent,
    makingChargeAmount,
    stonesWholesaleCost: Math.round(stonesWholesaleCost * 100) / 100,
    stoneSettingLaborCost: Math.round(stoneSettingLaborCost * 100) / 100,
    cadAndPrintCost,
    benchLaborCost,
    baseCost: Math.round(baseCost * 100) / 100,
    totalCogs: Math.round(totalCogs * 100) / 100,
    customerFacingPrice,
    retailPrice,
    minWalkAwayPrice,
    grossProfitDollars,
    grossProfitMarginPercent,
    recommendedDeposit,
    salesTax,
    totalWithTax,
  };
}

/**
 * Reverse Budget Matcher Algorithm
 * When a customer says: "I have a budget of $1500", this engine generates 4 realistic,
 * attractive builds tailored to that price point with distinct value propositions.
 */
export function generateBudgetSuggestions(
  budget: number,
  spotPrices: SpotPrices,
  rates: ShopRates
): BudgetSuggestion[] {
  const suggestions: BudgetSuggestion[] = [];

  // Candidate archetype 1: Solid Gold Daily Wear (10K or 14K Gold + CZ or Clean Polish)
  const goldMetal: MetalType = budget >= 3000 ? 'gold_14k' : 'gold_10k';
  const goldDim = budget >= 2500 ? 1.75 : budget >= 1200 ? 1.4 : 1.0;
  const config1: CustomPieceConfig = {
    id: 'sug-1',
    title: 'Solid Gold Signature',
    customerName: '',
    customerPhone: '',
    notes: '',
    heightInches: goldDim,
    widthInches: goldDim,
    depthMm: 3.5,
    metal: goldMetal,
    metalColor: 'yellow',
    solidness: 'semi_solid',
    backplate: 'mesh_cage',
    bail: 'medium_cuban',
    stoneType: budget >= 2000 ? 'moissanite' : 'cz',
    stoneCoverage: 'half_iced',
  };
  const cost1 = calculateCompleteCost(config1, spotPrices, rates);

  suggestions.push({
    id: 'sug-1',
    title: `Real ${goldMetal === 'gold_14k' ? '14K' : '10K'} Solid Gold Classic`,
    tagline: 'Real solid gold heirloom with luxury honeycomb cage back',
    metal: goldMetal,
    metalColor: 'yellow',
    heightInches: goldDim,
    widthInches: goldDim,
    depthMm: 3.5,
    solidness: 'semi_solid',
    backplate: 'mesh_cage',
    stoneType: config1.stoneType,
    stoneCoverage: 'half_iced',
    bail: 'medium_cuban',
    estimatedWeightGrams: cost1.calculatedGrams,
    estimatedRetailPrice: cost1.retailPrice,
    differenceFromBudget: cost1.retailPrice - budget,
    highlights: [
      `Genuine ${goldMetal === 'gold_14k' ? '14K' : '10K'} Solid Gold (~${cost1.calculatedGrams}g)`,
      `${goldDim}" x ${goldDim}" custom charm size`,
      'Honeycomb breathing back cage included',
      'Medium Cuban / Franco link bail',
    ],
  });

  // Candidate archetype 2: "Maximum Ice & Size" in 925 Solid Silver + VVS Moissanite
  // Huge visual statement, passes diamond testers, fits right at or under budget!
  const silverDim = budget >= 2000 ? 2.5 : budget >= 1200 ? 2.0 : 1.5;
  const config2: CustomPieceConfig = {
    id: 'sug-2',
    title: 'Maximum Ice Bust Down',
    customerName: '',
    customerPhone: '',
    notes: '',
    heightInches: silverDim,
    widthInches: silverDim,
    depthMm: 4.5,
    metal: 'silver_925',
    metalColor: 'yellow',
    solidness: 'solid',
    backplate: 'mesh_cage',
    bail: 'large_miami',
    stoneType: 'moissanite',
    stoneCoverage: 'full_bust_down',
  };
  const cost2 = calculateCompleteCost(config2, spotPrices, rates);

  suggestions.push({
    id: 'sug-2',
    title: 'Solid Silver 925 + VVS Moissanite Bust Down',
    tagline: 'Massive surface area, passes thermal diamond tester, heavy silver heft',
    metal: 'silver_925',
    metalColor: 'yellow',
    heightInches: silverDim,
    widthInches: silverDim,
    depthMm: 4.5,
    solidness: 'solid',
    backplate: 'mesh_cage',
    stoneType: 'moissanite',
    stoneCoverage: 'full_bust_down',
    bail: 'large_miami',
    estimatedWeightGrams: cost2.calculatedGrams,
    estimatedRetailPrice: cost2.retailPrice,
    differenceFromBudget: cost2.retailPrice - budget,
    highlights: [
      `Heavy Solid 925 Silver (~${cost2.calculatedGrams}g)`,
      `Huge ${silverDim}" x ${silverDim}" statement dimensions`,
      `${cost2.estimatedStoneCount}x VVS1 D-Color Moissanite stones (~${cost2.estimatedCaratWeight} ctw)`,
      'Full bust-down iced coverage with Miami bail',
    ],
  });

  // Candidate archetype 3: "Lab-Grown Diamond Luxury" (Real diamonds, 10K or 14K Gold, sleek dimensions)
  const labDim = budget >= 3000 ? 1.5 : budget >= 1400 ? 1.2 : 0.9;
  const config3: CustomPieceConfig = {
    id: 'sug-3',
    title: 'Certified Lab Diamond Charm',
    customerName: '',
    customerPhone: '',
    notes: '',
    heightInches: labDim,
    widthInches: labDim,
    depthMm: 3.0,
    metal: 'gold_10k',
    metalColor: 'white',
    solidness: 'semi_solid',
    backplate: 'open',
    bail: 'standard_small',
    stoneType: 'lab_diamond',
    stoneCoverage: budget >= 2500 ? 'half_iced' : 'accents',
  };
  const cost3 = calculateCompleteCost(config3, spotPrices, rates);

  suggestions.push({
    id: 'sug-3',
    title: '10K White Gold + Certified Lab Diamonds',
    tagline: '100% genuine carbon diamonds with modern sleek profile',
    metal: 'gold_10k',
    metalColor: 'white',
    heightInches: labDim,
    widthInches: labDim,
    depthMm: 3.0,
    solidness: 'semi_solid',
    backplate: 'open',
    stoneType: 'lab_diamond',
    stoneCoverage: config3.stoneCoverage,
    bail: 'standard_small',
    estimatedWeightGrams: cost3.calculatedGrams,
    estimatedRetailPrice: cost3.retailPrice,
    differenceFromBudget: cost3.retailPrice - budget,
    highlights: [
      'VS-SI DEF Lab-Grown Diamonds (GIA/IGI standards)',
      'Solid 10K White Gold mirror finish',
      `${cost3.estimatedStoneCount} handset stones (~${cost3.estimatedCaratWeight} ctw)`,
      'High-end boutique look without breaking budget',
    ],
  });

  // Candidate archetype 4: "Heavyweight Solid Plate Statement"
  const solidPlateDim = budget >= 2000 ? 1.8 : 1.3;
  const config4: CustomPieceConfig = {
    id: 'sug-4',
    title: 'Solid Engraved Plate Medallion',
    customerName: '',
    customerPhone: '',
    notes: '',
    heightInches: solidPlateDim,
    widthInches: solidPlateDim,
    depthMm: 4.0,
    metal: budget >= 1800 ? 'gold_10k' : 'silver_925',
    metalColor: 'yellow',
    solidness: 'solid',
    backplate: 'engraved_solid',
    bail: 'medium_cuban',
    stoneType: 'cz',
    stoneCoverage: 'accents',
  };
  const cost4 = calculateCompleteCost(config4, spotPrices, rates);

  suggestions.push({
    id: 'sug-4',
    title: `${config4.metal === 'gold_10k' ? '10K Gold' : '925 Silver'} Solid Engraved Medallion`,
    tagline: 'Substantial solid backplate with custom laser message/photo engraving',
    metal: config4.metal,
    metalColor: 'yellow',
    heightInches: solidPlateDim,
    widthInches: solidPlateDim,
    depthMm: 4.0,
    solidness: 'solid',
    backplate: 'engraved_solid',
    stoneType: 'cz',
    stoneCoverage: 'accents',
    bail: 'medium_cuban',
    estimatedWeightGrams: cost4.calculatedGrams,
    estimatedRetailPrice: cost4.retailPrice,
    differenceFromBudget: cost4.retailPrice - budget,
    highlights: [
      `Heavy Solid Backplate (~${cost4.calculatedGrams}g total weight)`,
      'Custom laser engraving on back included',
      'Solid metal hand-feel and durability',
      'Accent stones border detailing',
    ],
  });

  return suggestions;
}

export interface CharmBudgetFix {
  id: string;
  strategy: 'deal_close' | 'metal_swap' | 'size_scale' | 'stone_swap' | 'relief_open';
  title: string;
  description: string;
  resultingPrice: number;
  savingsVsOriginal: number;
  differenceFromBudget: number;
  configPatch: Partial<CustomPieceConfig>;
  isViable: boolean;
  profitEstimate?: number;
  marginPercent?: number;
}

/**
 * Specifically takes the CURRENT charm the customer is looking at,
 * and calculates exact ways to adjust it to match their $1500 counter-offer.
 */
export function calculateCharmBudgetFixes(
  currentConfig: CustomPieceConfig,
  targetBudget: number,
  spotPrices: SpotPrices,
  rates: ShopRates
): {
  canAcceptDirectly: boolean;
  directDealProfit: number;
  directDealMargin: number;
  fixes: CharmBudgetFix[];
} {
  const currentCost = calculateCompleteCost(currentConfig, spotPrices, rates);
  const fixes: CharmBudgetFix[] = [];

  // 1. Direct Deal check: Is $1500 above walk-away floor?
  const canAcceptDirectly = targetBudget >= currentCost.minWalkAwayPrice;
  const directDealProfit = Math.round((targetBudget - currentCost.totalCogs) * 10) / 10;
  const directDealMargin = Math.round((directDealProfit / targetBudget) * 1000) / 10;

  // Strategy A: Metal Swap (e.g. 14k/18k to 10k, or 10k to 925 Silver)
  let candidateMetal: MetalType | null = null;
  if (currentConfig.metal === 'gold_18k') candidateMetal = 'gold_14k';
  else if (currentConfig.metal === 'gold_14k') candidateMetal = 'gold_10k';
  else if (currentConfig.metal === 'gold_10k') candidateMetal = 'silver_925';

  if (candidateMetal) {
    const patch: Partial<CustomPieceConfig> = { metal: candidateMetal };
    const costTest = calculateCompleteCost({ ...currentConfig, ...patch }, spotPrices, rates);
    fixes.push({
      id: 'fix-metal',
      strategy: 'metal_swap',
      title: `Switch Base Metal to ${candidateMetal === 'gold_10k' ? '10K Solid Gold' : candidateMetal === 'silver_925' ? '925 Solid Silver' : '14K Gold'}`,
      description: `Keep the exact same ${currentConfig.heightInches}" × ${currentConfig.widthInches}" dimensions and stones, but cast in ${METAL_LABELS[candidateMetal]}.`,
      resultingPrice: costTest.retailPrice,
      savingsVsOriginal: currentCost.retailPrice - costTest.retailPrice,
      differenceFromBudget: costTest.retailPrice - targetBudget,
      configPatch: patch,
      isViable: Math.abs(costTest.retailPrice - targetBudget) <= 250,
      profitEstimate: costTest.grossProfitDollars,
      marginPercent: costTest.grossProfitMarginPercent,
    });
  }

  // Strategy B: Proportional Size Scale (e.g. 2.0" down to 1.5" or 1.6")
  if (currentCost.retailPrice > targetBudget) {
    // Volume scales with cube of dimensions; surface area with square. Scale factor ~ sqrt(target/current)
    const ratio = Math.sqrt(targetBudget / currentCost.retailPrice);
    const rawH = Math.round(currentConfig.heightInches * ratio * 4) / 4; // round to nearest 0.25"
    const rawW = Math.round(currentConfig.widthInches * ratio * 4) / 4;
    const newH = Math.max(0.75, rawH);
    const newW = Math.max(0.75, rawW);

    if (newH !== currentConfig.heightInches || newW !== currentConfig.widthInches) {
      const patch: Partial<CustomPieceConfig> = { heightInches: newH, widthInches: newW };
      const costTest = calculateCompleteCost({ ...currentConfig, ...patch }, spotPrices, rates);
      fixes.push({
        id: 'fix-size',
        strategy: 'size_scale',
        title: `Scale Dimensions to ${newH}" × ${newW}"`,
        description: `Keep ${METAL_LABELS[currentConfig.metal]} and ${STONE_LABELS[currentConfig.stoneType].split('(')[0]}, but scale the outer profile down slightly to reduce gold gram weight.`,
        resultingPrice: costTest.retailPrice,
        savingsVsOriginal: currentCost.retailPrice - costTest.retailPrice,
        differenceFromBudget: costTest.retailPrice - targetBudget,
        configPatch: patch,
        isViable: true,
        profitEstimate: costTest.grossProfitDollars,
        marginPercent: costTest.grossProfitMarginPercent,
      });
    }
  }

  // Strategy C: Stone Type Swap (if using Lab Diamond or Natural, swap to Moissanite or CZ)
  if (currentConfig.stoneType === 'natural_diamond' || currentConfig.stoneType === 'lab_diamond') {
    const patch: Partial<CustomPieceConfig> = { stoneType: 'moissanite' };
    const costTest = calculateCompleteCost({ ...currentConfig, ...patch }, spotPrices, rates);
    fixes.push({
      id: 'fix-stones-moiss',
      strategy: 'stone_swap',
      title: 'Upgrade/Swap to VVS1 D-Color Moissanite',
      description: 'Moissanite passes thermal diamond testers and provides identical brilliance, saving hundreds in gemstone melee cost.',
      resultingPrice: costTest.retailPrice,
      savingsVsOriginal: currentCost.retailPrice - costTest.retailPrice,
      differenceFromBudget: costTest.retailPrice - targetBudget,
      configPatch: patch,
      isViable: true,
      profitEstimate: costTest.grossProfitDollars,
      marginPercent: costTest.grossProfitMarginPercent,
    });
  } else if (currentConfig.stoneType === 'moissanite') {
    const patch: Partial<CustomPieceConfig> = { stoneType: 'cz' };
    const costTest = calculateCompleteCost({ ...currentConfig, ...patch }, spotPrices, rates);
    fixes.push({
      id: 'fix-stones-cz',
      strategy: 'stone_swap',
      title: 'Swap to 5A Brilliant Cubic Zirconia',
      description: 'Keep full gold casting weight and size, setting AAA crystal cubic zirconia instead.',
      resultingPrice: costTest.retailPrice,
      savingsVsOriginal: currentCost.retailPrice - costTest.retailPrice,
      differenceFromBudget: costTest.retailPrice - targetBudget,
      configPatch: patch,
      isViable: true,
      profitEstimate: costTest.grossProfitDollars,
      marginPercent: costTest.grossProfitMarginPercent,
    });
  }

  // Strategy D: Backplate Relief (open hollow back instead of heavy solid/mesh)
  if (currentConfig.backplate !== 'open') {
    const patch: Partial<CustomPieceConfig> = { backplate: 'open', solidness: 'hollow' };
    const costTest = calculateCompleteCost({ ...currentConfig, ...patch }, spotPrices, rates);
    fixes.push({
      id: 'fix-relief',
      strategy: 'relief_open',
      title: 'Hollow Back Cavity Relief',
      description: 'Casting with an open recessed cavity reduces solid metal mass by 25-30% while maintaining the exact same front face appearance.',
      resultingPrice: costTest.retailPrice,
      savingsVsOriginal: currentCost.retailPrice - costTest.retailPrice,
      differenceFromBudget: costTest.retailPrice - targetBudget,
      configPatch: patch,
      isViable: true,
      profitEstimate: costTest.grossProfitDollars,
      marginPercent: costTest.grossProfitMarginPercent,
    });
  }

  return {
    canAcceptDirectly,
    directDealProfit,
    directDealMargin,
    fixes,
  };
}
