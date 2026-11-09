import React, { useState } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  SpotPrices,
  ShopRates,
  MetalType,
  MetalColor,
  StoneType,
} from '../types/jewelry';
import {
  Gem,
  Sparkles,
  RefreshCw,
  Ruler,
  Layers,
  Printer,
  BookmarkPlus,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  TrendingUp,
  Plus,
  Minus,
} from 'lucide-react';
import { VisualSketchSection } from './VisualSketchSection';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  spotPrices: SpotPrices;
  rates: ShopRates;
  onChangeConfig: (updates: Partial<CustomPieceConfig>) => void;
  onUpdateSpotPrices: (updated: SpotPrices) => void;
  onGoToStaffPage: () => void;
  onOpenPrintModal: () => void;
  onSaveQuote: () => void;
  onQuickBudgetTarget: (amount: number) => void;
}

export const CustomerFrontPage: React.FC<Props> = ({
  config,
  cost,
  spotPrices,
  rates,
  onChangeConfig,
  onUpdateSpotPrices,
  onGoToStaffPage,
  onOpenPrintModal,
  onSaveQuote,
  onQuickBudgetTarget,
}) => {
  const [isRefreshingSpot, setIsRefreshingSpot] = useState(false);
  const [counterBudgetInput, setCounterBudgetInput] = useState<string>('1500');
  const [showWeightStaff, setShowWeightStaff] = useState<boolean>(false);

  // Gram price calculations for quick reference
  const goldPerGram24k = (spotPrices.goldPerOz ?? 4070) / 31.1034768;
  const silverPerGram = (spotPrices.silverPerOz ?? 52) / 31.1034768;

  // Handle Dimension Presets
  const dimensionPresets = [
    { label: '1" × 1"', h: 1.0, w: 1.0, desc: 'Small Dainty Charm' },
    { label: '1.5" × 1.5"', h: 1.5, w: 1.5, desc: 'Popular Medium Pendant' },
    { label: '2" × 1"', h: 2.0, w: 1.0, desc: 'Vertical Dog Tag / Cross' },
    { label: '2" × 2"', h: 2.0, w: 2.0, desc: 'Standard Statement Charm' },
    { label: '2.5" × 2"', h: 2.5, w: 2.0, desc: 'Large Medallion' },
  ];

  // Metals specified by user: 10kt, 14kt, silver, platinum
  const primaryMetals: { id: MetalType; label: string; badge: string; desc: string }[] = [
    { id: 'gold_10k', label: '10KT Gold', badge: 'Most Durable', desc: '41.7% Pure Gold • Everyday Strength' },
    { id: 'gold_14k', label: '14KT Gold', badge: 'Best Seller', desc: '58.3% Pure Gold • Rich Warm Glow' },
    { id: 'silver_925', label: '925 Silver', badge: 'Value Choice', desc: 'Solid Sterling Silver • Rhodium Dipped' },
    { id: 'platinum_950', label: 'Platinum', badge: 'Ultra Luxury', desc: '95% Pure Platinum • Heavy Heft' },
  ];

  // Additional metals if needed
  const secondaryMetals: { id: MetalType; label: string }[] = [
    { id: 'gold_18k', label: '18KT Gold (75% Pure)' },
    { id: 'brass', label: 'Jewelers Brass' },
  ];

  // Stones specified by user: diamond, lab grown, moissanite, cz
  const stoneOptions: { id: StoneType; label: string; badge: string; desc: string }[] = [
    { id: 'natural_diamond', label: 'Natural Diamond', badge: 'Earth Mined', desc: 'VS-SI Clarity • Natural Brilliance' },
    { id: 'lab_diamond', label: 'Lab Grown Diamond', badge: '100% Real Diamond', desc: 'VS DEF Clarity • Certified Lab Mined' },
    { id: 'moissanite', label: 'Moissanite', badge: 'Passes Diamond Tester', desc: 'VVS1 D-Color • Incredible Fire' },
    { id: 'cz', label: 'Cubic Zirconia (CZ)', badge: 'Budget Shimmer', desc: '5A Brilliant Micro-Pavé Stones' },
    { id: 'none', label: 'No Stones (Plain)', badge: 'Smooth Mirror', desc: 'High-Polish Precious Metal Surface' },
  ];

  const handleRefreshSpot = async () => {
    setIsRefreshingSpot(true);
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch('https://api.gold-api.com/price/XAU'),
        fetch('https://api.gold-api.com/price/XAG'),
      ]);
      if (goldRes.ok && silverRes.ok) {
        const goldData = await goldRes.json();
        const silverData = await silverRes.json();
        onUpdateSpotPrices({
          ...spotPrices,
          goldPerOz: Math.round(Number(goldData.price) * 100) / 100,
          silverPerOz: Math.round(Number(silverData.price) * 100) / 100,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setIsRefreshingSpot(false);
    }
  };

  const deposit50 = Math.round((cost.retailPrice * 0.5) / 10) * 10;
  const balanceRemaining = cost.retailPrice - deposit50;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-16">
      {/* ATELIER TOP HEADER - Golden Jewelers Memphis */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950">
              <Gem className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight leading-none">
                Golden Jewelers Memphis
              </h1>
              <p className="text-[11px] sm:text-xs text-amber-700 font-medium tracking-wide uppercase mt-0.5">
                Custom Jewelry Counter Estimator • Real-Time Metal Pricing
              </p>
            </div>
          </div>

          {/* Right Navigation & Staff Mode Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Client Quote</span>
            </button>

            <button
              type="button"
              onClick={onGoToStaffPage}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
              title="View Wholesale Costs, Calculations & Profit Margin"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Page 2: Staff Calculations &amp; Our Cost</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>

        {/* LIVE SPOT PRICE BAR - Right below header as requested */}
        <div className="bg-amber-50/70 border-t border-amber-200/60 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Live Spot Ticker Items */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono">
              {/* Live Pulsing Badge */}
              <div className="flex items-center gap-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-full font-sans font-bold text-[10px] tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span>LIVE MARKET FEED</span>
              </div>

              {/* Gold Spot */}
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-slate-600 uppercase text-[11px]">
                  Gold Spot:
                </span>
                <span className="font-bold text-amber-700 text-sm">
                  ${(spotPrices.goldPerOz ?? 4070).toFixed(2)}/oz
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  (${goldPerGram24k.toFixed(2)}/g pure)
                </span>
              </div>

              {/* Silver Spot */}
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-slate-600 uppercase text-[11px]">
                  Silver Spot:
                </span>
                <span className="font-bold text-slate-700 text-sm">
                  ${(spotPrices.silverPerOz ?? 52).toFixed(2)}/oz
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  (${silverPerGram.toFixed(2)}/g)
                </span>
              </div>
            </div>

            {/* Quick Refresh & Last Updated */}
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-sans">
              <span>Updated: {spotPrices.lastUpdated}</span>
              <button
                type="button"
                onClick={handleRefreshSpot}
                disabled={isRefreshingSpot}
                className="flex items-center gap-1 text-amber-800 hover:text-amber-950 font-semibold px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
                title="Refresh Live Spot"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingSpot ? 'animate-spin text-amber-600' : ''}`} />
                <span>{isRefreshingSpot ? 'Fetching...' : 'Sync Live'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA - White Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: DIMENSIONS FIELD (User enters Length, Width, Depth) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                    1. Dimension Fields (Enter Measurements)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Inches &amp; mm</span>
              </div>

              {/* Quick Preset Buttons for rapid counter interactions */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Popular Counter Sizes:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {dimensionPresets.map((p) => {
                    const isSelected = config.heightInches === p.h && config.widthInches === p.w;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => onChangeConfig({ heightInches: p.h, widthInches: p.w })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-300/50'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Numerical Inputs with iPad Touch Steppers: Length, Width, Depth */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {/* Length (Height) */}
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Length</label>
                    <span className="text-[10px] text-slate-400 font-mono">in</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0.5, Math.round(((config.heightInches ?? 2.0) - 0.25) * 100) / 100);
                        onChangeConfig({ heightInches: next });
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Decrease 0.25 inch"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="6.0"
                      value={config.heightInches ?? 2.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) onChangeConfig({ heightInches: val });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg py-1 text-slate-900 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(6.0, Math.round(((config.heightInches ?? 2.0) + 0.25) * 100) / 100);
                        onChangeConfig({ heightInches: next });
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Increase 0.25 inch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Width */}
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Width</label>
                    <span className="text-[10px] text-slate-400 font-mono">in</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0.5, Math.round(((config.widthInches ?? 2.0) - 0.25) * 100) / 100);
                        onChangeConfig({ widthInches: next });
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Decrease 0.25 inch"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="6.0"
                      value={config.widthInches ?? 2.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) onChangeConfig({ widthInches: val });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg py-1 text-slate-900 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(6.0, Math.round(((config.widthInches ?? 2.0) + 0.25) * 100) / 100);
                        onChangeConfig({ widthInches: next });
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Increase 0.25 inch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Depth (Thickness) */}
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Depth</label>
                    <span className="text-[10px] text-slate-400 font-mono">mm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1.5, Math.round(((config.depthMm ?? 3.5) - 0.5) * 10) / 10);
                        onChangeConfig({ depthMm: next });
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Decrease 0.5 mm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min="1.5"
                      max="10.0"
                      value={config.depthMm ?? 3.5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) onChangeConfig({ depthMm: val });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg py-1 text-slate-900 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(10.0, Math.round(((config.depthMm ?? 3.5) + 0.5) * 10) / 10);
                        onChangeConfig({ depthMm: next });
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Increase 0.5 mm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Physical Dimension Visualizer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center font-mono font-bold text-amber-800 text-[11px]">
                    {config.heightInches}"
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block">
                      Physical Footprint: {config.heightInches}" × {config.widthInches}"
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Approx. {Math.round(config.heightInches * 25.4)}mm × {Math.round(config.widthInches * 25.4)}mm (Depth: {config.depthMm}mm)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Calculated Weight:</span>
                  {showWeightStaff ? (
                    <button
                      type="button"
                      onClick={() => setShowWeightStaff(false)}
                      className="text-sm font-bold text-slate-800 font-mono flex items-center justify-end gap-1 hover:text-amber-700"
                      title="Tap to hide/grey out weight"
                    >
                      <span>~{cost.calculatedGrams.toFixed(1)}g</span>
                      <EyeOff className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWeightStaff(true)}
                      className="bg-slate-200/90 hover:bg-slate-300 text-slate-400 hover:text-slate-600 font-mono font-medium text-xs px-2 py-0.5 rounded flex items-center justify-end gap-1 transition-colors select-none"
                      title="Customer View: Greyed Out. Tap to Reveal for Staff"
                    >
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>•••• g (Staff Tap)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Backplate & Bail Fast Options (Discreet) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-xs">
              <span className="font-semibold text-slate-700 block mb-2">Backplate &amp; Bail Style:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Backplate Type</label>
                  <select
                    value={config.backplate}
                    onChange={(e) => onChangeConfig({ backplate: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="mesh_cage">Honeycomb Breathing Grill (Luxury)</option>
                    <option value="solid_plate">Solid Polished Backplate</option>
                    <option value="open">Open Hollow Cavity (Lightweight)</option>
                    <option value="engraved_solid">Solid + Custom Laser Engraving</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Bail Size</label>
                  <select
                    value={config.bail}
                    onChange={(e) => onChangeConfig({ bail: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="medium_cuban">Medium Bail (up to 8mm chain)</option>
                    <option value="large_miami">Large Miami Bail (up to 14mm)</option>
                    <option value="iced_bail">Iced Pavé Bail (Diamond)</option>
                    <option value="standard_small">Small Loop (up to 4mm)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: METAL FIELD & STONE FIELD (User Selects) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 2. METAL FIELD (10kt, 14kt, Silver, Platinum) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                    2. Select Base Metal (10kt, 14kt, Silver, Platinum)
                  </h2>
                </div>

                {/* Metal Color Selector */}
                <div className="flex items-center gap-1.5">
                  {(['yellow', 'white', 'rose'] as MetalColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChangeConfig({ metalColor: c })}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-all border ${
                        config.metalColor === c
                          ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Main Metals in large iPad-friendly cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {primaryMetals.map((m) => {
                  const isSelected = config.metal === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeConfig({ metal: m.id })}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">
                              {m.label}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {m.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional 18KT & Brass Options */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Specialty Alloys:</span>
                <div className="flex gap-2">
                  {secondaryMetals.map((sm) => (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => onChangeConfig({ metal: sm.id })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        config.metal === sm.id
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. STONE FIELD (Diamond, Lab Grown, Moissanite, CZ) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-cyan-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                    3. Select Stones (Diamond, Lab Grown, Moissanite, CZ)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">Micro-Pavé Bust Down</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stoneOptions.map((st) => {
                  const isSelected = config.stoneType === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onChangeConfig({ stoneType: st.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-400/40 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">
                              {st.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {st.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Stone Coverage Setting (Half iced vs Full bust down) */}
              {config.stoneType !== 'none' && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium text-[11px]">Stone Coverage Density:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ stoneCoverage: 'half_iced' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                        config.stoneCoverage === 'half_iced'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Top Pavé Face (~{cost.estimatedStoneCount} Stones)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ stoneCoverage: 'full_bust_down' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                        config.stoneCoverage === 'full_bust_down'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Full 3D Bust-Down (~{Math.round(cost.estimatedStoneCount * 1.5)} Stones)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BELOW: CUSTOMER PRICE SECTION - Exact requirement */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-neutral-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
              {/* Subtle Atelier Watermark */}
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-5 pointer-events-none">
                <Gem className="w-64 h-64 text-amber-300" />
              </div>

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-sans">
                      Client Counter Quotation
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Golden Jewelers Memphis • Certified Custom Build
                  </div>
                </div>

                {/* Big Customer Price Display */}
                <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Customer Price
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-extrabold text-amber-400 font-mono tracking-tight">
                        ${cost.retailPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">USD</span>
                    </div>
                  </div>

                  {/* Payment Terms breakdown for customer reassurance */}
                  <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-1.5 sm:text-right font-mono text-xs">
                    <div className="flex sm:justify-end gap-3 text-slate-300">
                      <span>50% Deposit to Start:</span>
                      <strong className="text-amber-300 font-bold">${deposit50.toLocaleString()}</strong>
                    </div>
                    <div className="flex sm:justify-end gap-3 text-slate-400">
                      <span>Balance on Delivery:</span>
                      <strong className="text-white">${balanceRemaining.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Summary Specs Pill Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-t border-slate-800 text-xs">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Dimensions</span>
                    <span className="font-bold text-white">{config.heightInches}" × {config.widthInches}"</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Base Metal</span>
                    <span className="font-bold text-amber-300 capitalize">{config.metal.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Stones</span>
                    <span className="font-bold text-cyan-300 capitalize">{config.stoneType.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Finished Weight</span>
                    {showWeightStaff ? (
                      <button
                        type="button"
                        onClick={() => setShowWeightStaff(false)}
                        className="font-bold text-white font-mono text-xs flex items-center gap-1 hover:text-amber-300"
                        title="Tap to grey out"
                      >
                        <span>~{cost.calculatedGrams.toFixed(1)}g</span>
                        <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowWeightStaff(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors select-none"
                        title="Staff Only — Tap to Reveal"
                      >
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>•••• g</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Client Quote Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={onSaveQuote}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Save Quote</span>
                    </button>
                  </div>

                  {/* Customer Counter Offer Quick Assist */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 hidden sm:inline">Counter-Offer?</span>
                    <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-mono mr-1">$</span>
                      <input
                        type="number"
                        step="50"
                        value={counterBudgetInput}
                        onChange={(e) => setCounterBudgetInput(e.target.value)}
                        className="w-16 bg-transparent text-amber-300 font-mono font-bold text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickBudgetTarget(parseFloat(counterBudgetInput) || 1500)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1"
                    >
                      <span>Match ${counterBudgetInput}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* SECTION AT BOTTOM: VISUAL SKETCH & AI CAD GENERATOR (Device Camera & Text Description) */}
        <VisualSketchSection config={config} cost={cost} onChangeConfig={onChangeConfig} />
      </main>

      {/* IPAD FLOATING BOTTOM QUOTE DOCK - Always visible across counter */}
      <aside aria-label="Customer Quote Dock" className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                Customer Price
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono tracking-tight leading-none">
                  ${cost.retailPrice.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  (50% Deposit: ${deposit50.toLocaleString()})
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs text-slate-600 font-mono">
              <span className="font-bold text-slate-900">{config.heightInches}" × {config.widthInches}"</span>
              <span>•</span>
              <span className="capitalize">{config.metal.replace('_', ' ')}</span>
              <span>•</span>
              <span className="capitalize">{config.stoneType.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Quote</span>
            </button>

            <button
              type="button"
              onClick={onGoToStaffPage}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff Calculations</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
