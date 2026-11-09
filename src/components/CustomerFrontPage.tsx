import React, { useState } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  SpotPrices,
  ShopRates,
  MetalType,
  MetalColor,
  StoneType,
  FixedBudgetCombination,
} from '../types/jewelry';
import {
  Gem,
  Sparkles,
  Ruler,
  Layers,
  Printer,
  BookmarkPlus,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Plus,
  Minus,
  Target,
  ShieldCheck,
} from 'lucide-react';
import { VisualSketchSection } from './VisualSketchSection';
import { SpotPriceBar } from './SpotPriceBar';
import { FixedBudgetMatrixModal } from './FixedBudgetMatrixModal';

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
}) => {
  const [counterBudgetInput, setCounterBudgetInput] = useState<string>('1500');
  const [showWeightStaff, setShowWeightStaff] = useState<boolean>(false);
  const [isFixedBudgetMatrixOpen, setIsFixedBudgetMatrixOpen] = useState<boolean>(false);
  const [targetBudget, setTargetBudget] = useState<number>(1500);

  const handleSelectCombination = (comb: FixedBudgetCombination) => {
    // CRITICAL: Dimensions (height, width, depth) remain STRICTLY LOCKED
    onChangeConfig({
      metal: comb.metal,
      metalColor: comb.metalColor,
      stoneType: comb.stoneType,
      stoneCoverage: comb.stoneCoverage,
      backplate: comb.backplate,
    });
    setIsFixedBudgetMatrixOpen(false);
  };

  // Dimension Presets
  const dimensionPresets = [
    { label: '1" × 1"', h: 1.0, w: 1.0, desc: 'Dainty Charm' },
    { label: '1.5" × 1.5"', h: 1.5, w: 1.5, desc: 'Medium Pendant' },
    { label: '2" × 1"', h: 2.0, w: 1.0, desc: 'Dog Tag / Cross' },
    { label: '2" × 2"', h: 2.0, w: 2.0, desc: 'Statement Charm' },
    { label: '2.5" × 2"', h: 2.5, w: 2.0, desc: 'Large Medallion' },
  ];

  // Primary Metals
  const primaryMetals: { id: MetalType; label: string; purity: string; desc: string }[] = [
    { id: 'gold_10k', label: '10KT Solid Gold', purity: '41.7% Pure Gold', desc: 'Maximum structural durability for everyday wear.' },
    { id: 'gold_14k', label: '14KT Solid Gold', purity: '58.3% Pure Gold', desc: 'Atelier best seller with rich warm luster.' },
    { id: 'silver_925', label: '925 Sterling Silver', purity: 'Solid Silver', desc: 'Rhodium dipped bright precious metal.' },
    { id: 'platinum_950', label: 'Platinum 950', purity: '95.0% Pure Platinum', desc: 'Ultra-dense heft, naturally hypoallergenic.' },
  ];

  // Specialty Alloys
  const secondaryMetals: { id: MetalType; label: string }[] = [
    { id: 'gold_18k', label: '18KT Solid Gold (75% Pure)' },
    { id: 'brass', label: 'Jewelers Brass (Vermeil Ready)' },
  ];

  // Stone Choices
  const stoneOptions: { id: StoneType; label: string; grade: string; desc: string }[] = [
    { id: 'natural_diamond', label: 'Natural Earth Diamond', grade: 'VS-SI Clarity · Natural Mined', desc: 'Authentic conflict-free earth mined diamonds with natural fire.' },
    { id: 'lab_diamond', label: 'Certified Lab-Grown Diamond', grade: 'DEF Color · VS Clarity', desc: '100% chemically & optically identical diamond at accessible cost.' },
    { id: 'moissanite', label: 'VVS1 D-Color Moissanite', grade: 'Passes Diamond Tester', desc: 'Exceptional brilliance and refractive fire with maximum hardness.' },
    { id: 'cz', label: '5A Cubic Zirconia', grade: 'Brilliant Micro-Pavé', desc: 'Crisp precision-cut faceted stones for accessible shine.' },
    { id: 'none', label: 'Plain High-Polish Mirror', grade: 'Solid Metal Finish', desc: 'Hand-lapped mirror surface without stones.' },
  ];

  const deposit50 = Math.round((cost.retailPrice * 0.5) / 10) * 10;
  const balanceRemaining = cost.retailPrice - deposit50;

  // Aspect ratio calculations for interactive footprint box
  const boxWidthRatio = Math.min(100, Math.max(30, (config.widthInches / 3.0) * 80));
  const boxHeightRatio = Math.min(100, Math.max(30, (config.heightInches / 3.0) * 80));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-24 selection:bg-amber-500/20 selection:text-amber-900">
      
      {/* 1. TOP BAR CONTRACT - Pure 3-Zone Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Gem className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-serif font-bold tracking-tight text-slate-950 block leading-tight">
                Golden Jewelers Memphis
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">
                Bespoke Atelier Counter Quoter
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Single-line, quiet hover) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#quoter" className="text-amber-800 font-bold whitespace-nowrap">
              Counter Estimator
            </a>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <a href="#studio-sketch" className="hover:text-slate-950 transition-colors whitespace-nowrap">
              3D Sketch &amp; CAD
            </a>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => {
                const budget = parseFloat(counterBudgetInput) || 1500;
                setTargetBudget(budget);
                setIsFixedBudgetMatrixOpen(true);
              }}
              className="hover:text-slate-950 transition-colors whitespace-nowrap"
            >
              Budget Combinations
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print Quote</span>
            </button>

            <button
              type="button"
              onClick={onGoToStaffPage}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95"
              title="Staff Workshop Calculations & Wholesale COGS"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Workshop Cost Sheet</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Real-Time Spot Bar for All Metals and Stones */}
        <SpotPriceBar spotPrices={spotPrices} onUpdateSpotPrices={onUpdateSpotPrices} />
      </header>

      {/* 2. MAIN ATELIER CONTENT CANVAS */}
      <main id="quoter" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: DIMENSIONS & PHYSICAL FOOTPRINT */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Step 1: Dimensions Card */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-amber-700" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                    1. Piece Dimensions (Inches &amp; mm)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Standard Bounding Box</span>
              </div>

              {/* Quick Dimension Presets */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Counter Standard Sizes:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {dimensionPresets.map((p) => {
                    const isSelected = config.heightInches === p.h && config.widthInches === p.w;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => onChangeConfig({ heightInches: p.h, widthInches: p.w })}
                        className={`py-2 px-1.5 rounded-lg text-xs font-bold text-center border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Numerical Inputs with 44px iPad Touch Steppers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Length (Height) */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-slate-700">
                    <span>Height</span>
                    <span className="text-slate-400 font-mono">in</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0.5, Math.round(((config.heightInches ?? 2.0) - 0.25) * 100) / 100);
                        onChangeConfig({ heightInches: next });
                      }}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
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
                      className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-slate-900 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-600 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(6.0, Math.round(((config.heightInches ?? 2.0) + 0.25) * 100) / 100);
                        onChangeConfig({ heightInches: next });
                      }}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Increase 0.25 inch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Width */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-slate-700">
                    <span>Width</span>
                    <span className="text-slate-400 font-mono">in</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0.5, Math.round(((config.widthInches ?? 2.0) - 0.25) * 100) / 100);
                        onChangeConfig({ widthInches: next });
                      }}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
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
                      className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-slate-900 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-600 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(6.0, Math.round(((config.widthInches ?? 2.0) + 0.25) * 100) / 100);
                        onChangeConfig({ widthInches: next });
                      }}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Increase 0.25 inch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Depth (Thickness) */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-slate-700">
                    <span>Depth</span>
                    <span className="text-slate-400 font-mono">mm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1.5, Math.round(((config.depthMm ?? 3.5) - 0.5) * 10) / 10);
                        onChangeConfig({ depthMm: next });
                      }}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
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
                      className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-slate-900 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-600 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(10.0, Math.round(((config.depthMm ?? 3.5) + 0.5) * 10) / 10);
                        onChangeConfig({ depthMm: next });
                      }}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                      title="Increase 0.5 mm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Physical Dimension Silhouette Box */}
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    style={{ width: `${boxWidthRatio}px`, height: `${boxHeightRatio}px` }}
                    className="max-w-[70px] max-h-[70px] min-w-[32px] min-h-[32px] rounded-lg border-2 border-dashed border-amber-600/70 bg-amber-500/10 flex items-center justify-center text-[10px] font-mono font-bold text-amber-900 transition-all duration-300"
                  >
                    {config.heightInches}"
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Proportional Blueprint Footprint
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {Math.round(config.heightInches * 25.4)}mm × {Math.round(config.widthInches * 25.4)}mm · {config.depthMm}mm depth
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Finished Casting
                  </span>
                  {showWeightStaff ? (
                    <button
                      type="button"
                      onClick={() => setShowWeightStaff(false)}
                      className="text-xs font-bold text-slate-900 font-mono flex items-center justify-end gap-1 hover:text-amber-700"
                      title="Tap to hide weight"
                    >
                      <span>~{cost.calculatedGrams.toFixed(1)}g</span>
                      <EyeOff className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWeightStaff(true)}
                      className="bg-slate-200/80 hover:bg-slate-300 text-slate-500 font-mono text-[11px] px-2 py-0.5 rounded-md flex items-center justify-end gap-1 transition-colors select-none"
                      title="Client View: Masked. Staff Tap to Reveal"
                    >
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>•••• g</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Backplate & Bail Fast Settings */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Backplate Type</label>
                  <select
                    value={config.backplate}
                    onChange={(e) => onChangeConfig({ backplate: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:border-amber-600"
                  >
                    <option value="mesh_cage">Honeycomb Grill (Luxury)</option>
                    <option value="solid_plate">Solid Mirror Backplate</option>
                    <option value="open">Open Hollow Cavity</option>
                    <option value="engraved_solid">Solid + Laser Engraving</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chain Bail Size</label>
                  <select
                    value={config.bail}
                    onChange={(e) => onChangeConfig({ bail: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:border-amber-600"
                  >
                    <option value="medium_cuban">Medium Bail (up to 8mm)</option>
                    <option value="large_miami">Large Miami Bail (up to 14mm)</option>
                    <option value="iced_bail">Iced Pavé Bail (Diamond)</option>
                    <option value="standard_small">Standard Loop (up to 4mm)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: BASE METAL & STONE SELECTION */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Step 2: Precious Base Metal */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                    2. Select Precious Base Metal
                  </h2>
                </div>

                {/* Metal Color Selector with Clean Metallic Swatches */}
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'yellow' as MetalColor, label: 'Yellow Gold', colorClass: 'bg-amber-400 border-amber-600' },
                    { id: 'white' as MetalColor, label: 'White Gold', colorClass: 'bg-slate-200 border-slate-400' },
                    { id: 'rose' as MetalColor, label: 'Rose Gold', colorClass: 'bg-rose-300 border-rose-500' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onChangeConfig({ metalColor: c.id })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        config.metalColor === c.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full border ${c.colorClass}`} />
                      <span className="capitalize">{c.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Primary Metals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {primaryMetals.map((m) => {
                  const isSelected = config.metal === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeConfig({ metal: m.id })}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {m.label}
                          </div>
                          <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                            {m.purity}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {m.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Specialty Alloys */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] font-medium">Specialty Alloys:</span>
                <div className="flex gap-2">
                  {secondaryMetals.map((sm) => (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => onChangeConfig({ metal: sm.id })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        config.metal === sm.id
                          ? 'bg-slate-900 text-amber-300 border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sm.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 3: Stones Selection */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-cyan-700" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                    3. Select Diamonds &amp; Gemstones
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Micro-Pavé Setting</span>
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
                          ? 'bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-400/40 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {st.label}
                          </div>
                          <div className="text-[11px] text-cyan-800 font-semibold mt-0.5">
                            {st.grade}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {st.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Stone Coverage Setting */}
              {config.stoneType !== 'none' && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium text-[11px]">Stone Coverage Density:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ stoneCoverage: 'half_iced' })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        config.stoneCoverage === 'half_iced'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Top Face Pavé (~{cost.estimatedStoneCount} Stones)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ stoneCoverage: 'full_bust_down' })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        config.stoneCoverage === 'full_bust_down'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Full 3D Bust-Down (~{Math.round(cost.estimatedStoneCount * 1.5)} Stones)
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 4. THE CLIENT COUNTER QUOTATION (The Master Focal Anchor) */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="relative z-10">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-sans">
                      Client Counter Quotation
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Golden Jewelers Memphis · Guaranteed Double-Cost Keystone
                  </div>
                </div>

                {/* Big Customer Price Display */}
                <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Customer Price
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-extrabold text-amber-400 font-mono tracking-tight tabular-nums">
                        ${cost.retailPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">USD</span>
                    </div>
                  </div>

                  {/* Payment Terms breakdown */}
                  <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-1.5 sm:text-right font-mono text-xs">
                    <div className="flex sm:justify-end gap-3 text-slate-300">
                      <span>50% Deposit to Cast:</span>
                      <strong className="text-amber-300 font-bold tabular-nums">${deposit50.toLocaleString()}</strong>
                    </div>
                    <div className="flex sm:justify-end gap-3 text-slate-400">
                      <span>Balance on Delivery:</span>
                      <strong className="text-white tabular-nums">${balanceRemaining.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Summary Specs Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-t border-slate-800/80 text-xs font-mono">
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Dimensions</span>
                    <span className="font-bold text-white">{config.heightInches}" × {config.widthInches}"</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Base Metal</span>
                    <span className="font-bold text-amber-300 capitalize">{config.metal.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Stones</span>
                    <span className="font-bold text-cyan-300 capitalize">{config.stoneType.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Finished Weight</span>
                    {showWeightStaff ? (
                      <button
                        type="button"
                        onClick={() => setShowWeightStaff(false)}
                        className="font-bold text-white text-xs flex items-center gap-1 hover:text-amber-300"
                        title="Tap to grey out"
                      >
                        <span>~{cost.calculatedGrams.toFixed(1)}g</span>
                        <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowWeightStaff(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors select-none"
                        title="Staff Only — Tap to Reveal"
                      >
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>•••• g</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* THE FIXED BUDGET DIMENSION LOCK CALLOUT */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      const budget = parseFloat(counterBudgetInput) || cost.retailPrice || 1500;
                      setTargetBudget(budget);
                      setIsFixedBudgetMatrixOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-transform active:scale-[0.99]"
                  >
                    <Target className="w-4 h-4 text-slate-950" />
                    <span>Lock Dimensions ({config.heightInches}" × {config.widthInches}") &amp; Browse Fixed Price Builds</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                </div>

                {/* Actions & Fixed Budget Counter Quick Assist */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
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

                  {/* Customer Fixed Budget Quick Assist */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 hidden sm:inline">Fixed Budget?</span>
                    <div className="flex items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                      <span className="text-amber-400 font-mono mr-1">$</span>
                      <input
                        type="number"
                        step="50"
                        value={counterBudgetInput}
                        onChange={(e) => setCounterBudgetInput(e.target.value)}
                        className="w-16 bg-transparent text-amber-300 font-mono font-bold text-xs focus:outline-none tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const budget = parseFloat(counterBudgetInput) || 1500;
                        setTargetBudget(budget);
                        setIsFixedBudgetMatrixOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                      title="Open combinations of all metals and stones at this fixed budget"
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

        {/* SECTION 5: VISUAL SKETCH & AI CAD GENERATOR */}
        <div id="studio-sketch" className="mt-8">
          <VisualSketchSection config={config} cost={cost} onChangeConfig={onChangeConfig} />
        </div>

      </main>

      {/* IPAD FLOATING BOTTOM QUOTE DOCK - Fixed within 15% Viewport Cap */}
      <aside aria-label="Customer Quote Dock" className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                Customer Price
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight leading-none tabular-nums">
                  ${cost.retailPrice.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  (50% Deposit: ${deposit50.toLocaleString()})
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs text-slate-600 font-mono">
              <span className="font-bold text-slate-900">{config.heightInches}" × {config.widthInches}"</span>
              <span>·</span>
              <span className="capitalize">{config.metal.replace('_', ' ')}</span>
              <span>·</span>
              <span className="capitalize">{config.stoneType.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const budget = parseFloat(counterBudgetInput) || cost.retailPrice || 1500;
                setTargetBudget(budget);
                setIsFixedBudgetMatrixOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
            >
              <Target className="w-3.5 h-3.5 text-slate-950" />
              <span>Budget Matrix</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print Quote</span>
            </button>

            <button
              type="button"
              onClick={onGoToStaffPage}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Workshop Cost</span>
            </button>
          </div>
        </div>
      </aside>

      {/* FIXED BUDGET COMBINATION MATRIX MODAL */}
      <FixedBudgetMatrixModal
        config={config}
        spotPrices={spotPrices}
        rates={rates}
        targetBudget={targetBudget}
        isOpen={isFixedBudgetMatrixOpen}
        onClose={() => setIsFixedBudgetMatrixOpen(false)}
        onSelectCombination={handleSelectCombination}
        onUpdateTargetBudget={setTargetBudget}
      />
    </div>
  );
};
