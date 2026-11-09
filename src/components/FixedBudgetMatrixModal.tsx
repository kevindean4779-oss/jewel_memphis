import React, { useState, useMemo } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  SpotPrices,
  ShopRates,
  FixedBudgetCombination,
  CombinationSortOption,
  METAL_LABELS,
  STONE_LABELS,
  BACKPLATE_LABELS,
} from '../types/jewelry';
import {
  generateFixedDimensionCombinations,
} from '../utils/jewelryCalculations';
import {
  X,
  Target,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Gem,
  Layers,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  spotPrices: SpotPrices;
  rates: ShopRates;
  targetBudget: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectCombination: (comb: FixedBudgetCombination) => void;
  onUpdateTargetBudget: (budget: number) => void;
}

export const FixedBudgetMatrixModal: React.FC<Props> = ({
  config,
  spotPrices,
  rates,
  targetBudget,
  isOpen,
  onClose,
  onSelectCombination,
  onUpdateTargetBudget,
}) => {
  const [budgetInput, setBudgetInput] = useState<string>(targetBudget.toString());
  const [sortBy, setSortBy] = useState<CombinationSortOption>('closest_budget');
  const [filterType, setFilterType] = useState<'all' | 'under_budget' | 'exact' | 'gold_only' | 'silver_only' | 'iced_only'>('all');
  const [showWeightStaff, setShowWeightStaff] = useState<boolean>(false);

  const activeBudgetNumber = parseFloat(budgetInput) || targetBudget;

  // Generate combinations for the EXACT dimensions
  const allCombinations = useMemo(() => {
    return generateFixedDimensionCombinations(
      config,
      activeBudgetNumber,
      spotPrices,
      rates,
      sortBy
    );
  }, [config, activeBudgetNumber, spotPrices, rates, sortBy]);

  // Filter combinations based on user selection
  const filteredCombinations = useMemo(() => {
    return allCombinations.filter((c) => {
      if (filterType === 'under_budget') {
        return c.differenceFromBudget <= 0;
      }
      if (filterType === 'exact') {
        return Math.abs(c.differenceFromBudget) <= 60;
      }
      if (filterType === 'gold_only') {
        return c.metal.includes('gold');
      }
      if (filterType === 'silver_only') {
        return c.metal === 'silver_925';
      }
      if (filterType === 'iced_only') {
        return c.stoneType !== 'none';
      }
      return true;
    });
  }, [allCombinations, filterType]);

  const quickBudgetTargets = [800, 1000, 1200, 1500, 2000, 2500, 3500];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto antialiased">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col text-slate-900">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900 tracking-tight">
                Fixed Budget Combination Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical Dimensions locked at <strong className="text-slate-800">{config.heightInches}" × {config.widthInches}"</strong> (Depth: {config.depthMm}mm). Below are all metal and stone combinations tailored to your target price.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TARGET BUDGET ADJUSTER & QUICK CHIPS */}
        <div className="py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 -mx-5 sm:-mx-7 px-5 sm:px-7">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customer Target Budget:
            </span>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-sm font-bold text-amber-600 mr-1">$</span>
              <input
                type="number"
                step="50"
                value={budgetInput}
                onChange={(e) => {
                  setBudgetInput(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) {
                    onUpdateTargetBudget(parsed);
                  }
                }}
                className="w-24 bg-transparent font-mono font-bold text-slate-900 text-base focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Target Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Select:</span>
            {quickBudgetTargets.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setBudgetInput(amt.toString());
                  onUpdateTargetBudget(amt);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  activeBudgetNumber === amt
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* SORT & FILTER TOOLBAR */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filter:
            </span>
            {[
              { id: 'all', label: `All (${allCombinations.length})` },
              { id: 'under_budget', label: `≤ $${activeBudgetNumber}` },
              { id: 'exact', label: `Exact Matches (±$60)` },
              { id: 'gold_only', label: 'Gold Builds' },
              { id: 'silver_only', label: 'Silver Builds' },
              { id: 'iced_only', label: 'With Stones' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  filterType === f.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CombinationSortOption)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="closest_budget">Closest to ${activeBudgetNumber}</option>
              <option value="price_low_high">Price: Low to High</option>
              <option value="price_high_low">Price: High to Low</option>
              <option value="metal_tier">Highest Metal Quality</option>
              <option value="stone_tier">Highest Stone Quality</option>
            </select>
          </div>
        </div>

        {/* COMBINATIONS GRID LIST */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 my-1">
          {filteredCombinations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No combinations matched the current filter criteria for ${activeBudgetNumber}. Try selecting "All".
            </div>
          ) : (
            filteredCombinations.map((c) => {
              const isUnder = c.differenceFromBudget <= 0;
              const isExact = Math.abs(c.differenceFromBudget) <= 60;
              const deposit = Math.round((c.customerPrice * 0.5) / 10) * 10;

              return (
                <div
                  key={c.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isExact
                      ? 'bg-amber-50/60 border-amber-400 ring-1 ring-amber-300/40 shadow-xs'
                      : isUnder
                      ? 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Left: Build Specs */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {METAL_LABELS[c.metal]}
                      </span>

                      {/* Match Badge */}
                      {isExact ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-amber-700" />
                          Exact Target Fit
                        </span>
                      ) : isUnder ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                          ${Math.abs(c.differenceFromBudget)} Under Budget
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          +${c.differenceFromBudget} Stretch
                        </span>
                      )}

                      {c.isPopular && (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          Customer Favorite
                        </span>
                      )}
                    </div>

                    {/* Secondary Specs Details */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Gem className="w-3.5 h-3.5 text-cyan-600" />
                        <span className="font-semibold text-slate-800">
                          {c.stoneType === 'none' ? 'Plain High-Polish (No Stones)' : STONE_LABELS[c.stoneType].split('(')[0]}
                        </span>
                        {c.stoneType !== 'none' && (
                          <span className="text-[11px] text-slate-400">
                            (~{c.estimatedStoneCount} stones • {c.stoneCoverage === 'full_bust_down' ? 'Full Bust Down' : 'Top Pavé Face'})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Base: {BACKPLATE_LABELS[c.backplate].split('(')[0]}</span>
                      </div>
                    </div>

                    {/* Dimensions reminder & Staff weight toggle */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>Dimensions Locked: <strong>{config.heightInches}" × {config.widthInches}"</strong></span>
                      <span>•</span>
                      {showWeightStaff ? (
                        <button
                          type="button"
                          onClick={() => setShowWeightStaff(false)}
                          className="font-mono text-slate-700 font-bold flex items-center gap-1 hover:text-amber-700"
                        >
                          <span>~{c.calculatedGrams.toFixed(1)}g</span>
                          <EyeOff className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowWeightStaff(true)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-mono px-1.5 py-0.2 rounded flex items-center gap-1 transition-colors"
                          title="Tap to Reveal for Staff"
                        >
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          <span>•••• g</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Price & One-Click Apply */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-slate-100 sm:pl-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
                        ${c.customerPrice.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        50% Deposit: ${deposit.toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCombination(c)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0"
                    >
                      <span>Select This Build</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Exact 1:1 Scale Dimensions Preserved</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
          >
            Close Matrix
          </button>
        </div>

      </div>
    </div>
  );
};
