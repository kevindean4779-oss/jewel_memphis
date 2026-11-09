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
  ArrowLeft,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Plus,
  Minus,
  Target,
  Wand2,
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

export type QuoterStep = 1 | 2 | 3 | 4 | 5;

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
  // Step state: Only one step is visible at a time
  const [currentStep, setCurrentStep] = useState<QuoterStep>(1);
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
    // Move directly to the quotation step to see the result
    setCurrentStep(4);
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

  // Step definitions
  const stepsList = [
    { num: 1, title: 'Dimensions', shortDesc: `${config.heightInches}" × ${config.widthInches}"` },
    { num: 2, title: 'Base Metal', shortDesc: `${config.metalColor} ${config.metal.replace('_', ' ')}` },
    { num: 3, title: 'Stones & Setting', shortDesc: config.stoneType.replace('_', ' ') },
    { num: 4, title: 'Customer Quote', shortDesc: `$${cost.retailPrice.toLocaleString()}` },
    { num: 5, title: '3D CAD & Sketch', shortDesc: 'Visual Studio' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-28 selection:bg-amber-500/20 selection:text-amber-900">
      
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
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`transition-colors whitespace-nowrap ${currentStep <= 4 ? 'text-amber-800 font-bold' : 'hover:text-slate-950'}`}
            >
              Step-by-Step Quoter
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className={`transition-colors whitespace-nowrap ${currentStep === 5 ? 'text-amber-800 font-bold' : 'hover:text-slate-950'}`}
            >
              3D Sketch &amp; CAD
            </button>
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
              Budget Matrix
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

      {/* 2. STEP PROGRESS STEPPER - Highly visible on iPad */}
      <div className="bg-white border-b border-slate-200/90 py-3 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
          {stepsList.map((st, idx) => {
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;

            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(st.num as QuoterStep)}
                  className={`flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-slate-900 text-amber-300 shadow-sm ring-2 ring-slate-900/10'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {isCompleted ? '✓' : st.num}
                  </span>
                  <div className="hidden sm:block">
                    <span className="block leading-none text-xs">{st.title}</span>
                    <span className={`text-[10px] font-normal font-mono block mt-0.5 truncate max-w-[90px] ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {st.shortDesc}
                    </span>
                  </div>
                </button>

                {idx < stepsList.length - 1 && (
                  <div className="hidden sm:block w-4 h-0.5 bg-slate-200 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. STEP CONTENT CONTAINER - Only ONE Step rendered at once */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">

        {/* ========================================================================= */}
        {/* STEP 1: DIMENSIONS & PHYSICAL SCALE */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block mb-1">
                Step 1 of 4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-950 tracking-tight">
                Define Piece Dimensions &amp; Size
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter exact measurements or select a standard counter size. Physical dimensions remain strictly locked for all calculations.
              </p>
            </div>

            {/* Quick Dimension Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Popular Counter Size Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {dimensionPresets.map((p) => {
                  const isSelected = config.heightInches === p.h && config.widthInches === p.w;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => onChangeConfig({ heightInches: p.h, widthInches: p.w })}
                      className={`p-3 rounded-xl text-center border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs ring-2 ring-slate-900/10'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-sm">{p.label}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-200/80' : 'text-slate-400'}`}>
                        {p.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Numerical Inputs with 48px iPad Touch Steppers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Length (Height) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700">
                  <span>Height (Length)</span>
                  <span className="text-slate-400 font-mono">inches</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0.5, Math.round(((config.heightInches ?? 2.0) - 0.25) * 100) / 100);
                      onChangeConfig({ heightInches: next });
                    }}
                    className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                    title="Decrease 0.25 inch"
                  >
                    <Minus className="w-4 h-4" />
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
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 text-slate-900 font-mono font-bold text-lg text-center focus:outline-none focus:border-amber-600 tabular-nums shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(6.0, Math.round(((config.heightInches ?? 2.0) + 0.25) * 100) / 100);
                      onChangeConfig({ heightInches: next });
                    }}
                    className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                    title="Increase 0.25 inch"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Width */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700">
                  <span>Width</span>
                  <span className="text-slate-400 font-mono">inches</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0.5, Math.round(((config.widthInches ?? 2.0) - 0.25) * 100) / 100);
                      onChangeConfig({ widthInches: next });
                    }}
                    className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                    title="Decrease 0.25 inch"
                  >
                    <Minus className="w-4 h-4" />
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
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 text-slate-900 font-mono font-bold text-lg text-center focus:outline-none focus:border-amber-600 tabular-nums shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(6.0, Math.round(((config.widthInches ?? 2.0) + 0.25) * 100) / 100);
                      onChangeConfig({ widthInches: next });
                    }}
                    className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                    title="Increase 0.25 inch"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Depth (Thickness) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700">
                  <span>Depth (Casting)</span>
                  <span className="text-slate-400 font-mono">mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1.5, Math.round(((config.depthMm ?? 3.5) - 0.5) * 10) / 10);
                      onChangeConfig({ depthMm: next });
                    }}
                    className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                    title="Decrease 0.5 mm"
                  >
                    <Minus className="w-4 h-4" />
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
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 text-slate-900 font-mono font-bold text-lg text-center focus:outline-none focus:border-amber-600 tabular-nums shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(10.0, Math.round(((config.depthMm ?? 3.5) + 0.5) * 10) / 10);
                      onChangeConfig({ depthMm: next });
                    }}
                    className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-2xs shrink-0"
                    title="Increase 0.5 mm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Proportional Silhouette Blueprint Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  style={{ width: `${boxWidthRatio}px`, height: `${boxHeightRatio}px` }}
                  className="max-w-[80px] max-h-[80px] min-w-[36px] min-h-[36px] rounded-xl border-2 border-dashed border-amber-600 bg-amber-500/10 flex items-center justify-center text-xs font-mono font-bold text-amber-900 transition-all duration-300 shadow-xs"
                >
                  {config.heightInches}"
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-sm">
                    Interactive Scale Silhouette
                  </span>
                  <span className="text-xs text-slate-500 font-mono block mt-0.5">
                    {Math.round(config.heightInches * 25.4)}mm tall × {Math.round(config.widthInches * 25.4)}mm wide · {config.depthMm}mm thickness
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Calculated Gram Weight
                </span>
                {showWeightStaff ? (
                  <button
                    type="button"
                    onClick={() => setShowWeightStaff(false)}
                    className="text-sm font-bold text-slate-900 font-mono flex items-center sm:justify-end gap-1 hover:text-amber-700"
                    title="Tap to hide weight"
                  >
                    <span>~{cost.calculatedGrams.toFixed(1)}g</span>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWeightStaff(true)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-mono text-xs px-2.5 py-1 rounded-md flex items-center sm:justify-end gap-1.5 transition-colors select-none mt-0.5"
                    title="Client View: Masked. Staff Tap to Reveal"
                  >
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>•••• g (Staff Tap)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Step Navigation Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Step 1 of 4: Dimensions
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <span>Continue to Base Metal</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BASE PRECIOUS METAL & TONE */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block mb-1">
                Step 2 of 4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-950 tracking-tight">
                Select Base Precious Metal Alloy
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Choose the solid precious metal for the piece body and your preferred gold color tone.
              </p>
            </div>

            {/* Gold Color Selector */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  Gold Tone &amp; Luster Finish:
                </span>
                <span className="text-[11px] text-slate-500">
                  Applies across all solid karat golds and alloys
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { id: 'yellow' as MetalColor, label: 'Yellow Gold', colorClass: 'bg-amber-400 border-amber-600' },
                  { id: 'white' as MetalColor, label: 'White Gold', colorClass: 'bg-slate-200 border-slate-400' },
                  { id: 'rose' as MetalColor, label: 'Rose Gold', colorClass: 'bg-rose-300 border-rose-500' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChangeConfig({ metalColor: c.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                      config.metalColor === c.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border ${c.colorClass}`} />
                    <span className="capitalize">{c.id} Gold</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Main Metals in Large iPad Touch Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {primaryMetals.map((m) => {
                const isSelected = config.metal === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeConfig({ metal: m.id })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-base">
                          {m.label}
                        </div>
                        <div className="text-xs text-amber-800 font-semibold mt-0.5">
                          {m.purity}
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Specialty Alloys */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Specialty Alloys Available:</span>
              <div className="flex gap-2">
                {secondaryMetals.map((sm) => (
                  <button
                    key={sm.id}
                    type="button"
                    onClick={() => onChangeConfig({ metal: sm.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      config.metal === sm.id
                        ? 'bg-slate-900 text-amber-300 border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Step Navigation Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back to Dimensions</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <span>Continue to Stones &amp; Setting</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: DIAMONDS, STONES & BACKPLATE */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block mb-1">
                Step 3 of 4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-950 tracking-tight">
                Select Diamonds, Stones &amp; Backplate
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Choose stone grade, pavé density, backplate structure, and bail chain compatibility.
              </p>
            </div>

            {/* 5 Stone Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stoneOptions.map((st) => {
                const isSelected = config.stoneType === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onChangeConfig({ stoneType: st.id })}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-50/80 border-cyan-500 ring-2 ring-cyan-400/40 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm sm:text-base">
                          {st.label}
                        </div>
                        <div className="text-xs text-cyan-800 font-semibold mt-0.5">
                          {st.grade}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stone Coverage Density */}
            {config.stoneType !== 'none' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Micro-Pavé Setting Density:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Hand-set stones per master workshop specs
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ stoneCoverage: 'half_iced' })}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      config.stoneCoverage === 'half_iced'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Top Face Pavé (~{cost.estimatedStoneCount} Stones)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ stoneCoverage: 'full_bust_down' })}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      config.stoneCoverage === 'full_bust_down'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Full 3D Bust-Down (~{Math.round(cost.estimatedStoneCount * 1.5)} Stones)
                  </button>
                </div>
              </div>
            )}

            {/* Backplate & Bail Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Backplate Structure:
                </label>
                <select
                  value={config.backplate}
                  onChange={(e) => onChangeConfig({ backplate: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-amber-600"
                >
                  <option value="mesh_cage">Honeycomb Breathing Grill (Luxury)</option>
                  <option value="solid_plate">Solid Mirror Backplate (Heavy)</option>
                  <option value="open">Open Hollow Cavity (Lightweight)</option>
                  <option value="engraved_solid">Solid + Custom Laser Engraving</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Chain Bail Loop:
                </label>
                <select
                  value={config.bail}
                  onChange={(e) => onChangeConfig({ bail: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-amber-600"
                >
                  <option value="medium_cuban">Medium Bail (up to 8mm chain)</option>
                  <option value="large_miami">Large Miami Bail (up to 14mm chain)</option>
                  <option value="iced_bail">Iced Pavé Bail (Diamond)</option>
                  <option value="standard_small">Standard Loop (up to 4mm chain)</option>
                </select>
              </div>
            </div>

            {/* Bottom Step Navigation Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back to Base Metal</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <span>Generate Customer Quote</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: CUSTOMER QUOTATION & FIXED BUDGET DEAL MAKER */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            {/* The Master Customer Price Card */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-sans">
                      Step 4 of 4: Customer Quotation
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Golden Jewelers Memphis · Certified Custom Build
                  </div>
                </div>

                {/* Big Customer Price Display */}
                <div className="py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Customer Price
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-extrabold text-amber-400 font-mono tracking-tight tabular-nums">
                        ${cost.retailPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">USD</span>
                    </div>
                  </div>

                  {/* Payment Terms breakdown */}
                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1.5 sm:text-right font-mono text-xs">
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

                {/* 4 Summary Specs Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-t border-slate-800 text-xs font-mono">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Dimensions</span>
                    <span className="font-bold text-white">{config.heightInches}" × {config.widthInches}"</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Base Metal</span>
                    <span className="font-bold text-amber-300 capitalize">{config.metal.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Stones</span>
                    <span className="font-bold text-cyan-300 capitalize">{config.stoneType.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Finished Weight</span>
                    {showWeightStaff ? (
                      <button
                        type="button"
                        onClick={() => setShowWeightStaff(false)}
                        className="font-bold text-white text-xs flex items-center gap-1 hover:text-amber-300"
                        title="Tap to hide weight"
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
                <div className="pt-2">
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
                    <span>Customer Stated a Fixed Budget? Lock Dimensions &amp; Browse All Metal/Stone Builds</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                </div>

                {/* Actions & Fixed Budget Counter Quick Assist */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Quote Sheet</span>
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
                    <span className="text-slate-400 hidden sm:inline">Target Budget?</span>
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
                    >
                      <span>Match ${counterBudgetInput} Matrix</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Step Navigation Bar */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Modify Specifications</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <span>Open 3D CAD &amp; Sketch Studio</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: 3D CAD & SKETCH STUDIO */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block mb-0.5">
                  Step 5 of 5
                </span>
                <h2 className="text-xl font-serif font-bold text-slate-950 tracking-tight">
                  Atelier 3D CAD &amp; Napkin Sketch Studio
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Quote (${cost.retailPrice.toLocaleString()})</span>
              </button>
            </div>

            <VisualSketchSection config={config} cost={cost} onChangeConfig={onChangeConfig} />
          </div>
        )}

      </main>

      {/* IPAD FLOATING BOTTOM QUOTE DOCK - Fixed within 15% Viewport Cap */}
      <aside aria-label="Customer Quote Dock" className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                {currentStep === 4 ? 'Customer Quotation' : 'Current Real-Time Price'}
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
            {currentStep !== 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <span>Jump to Final Quote</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
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
            )}

            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={onGoToStaffPage}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff Cost</span>
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
