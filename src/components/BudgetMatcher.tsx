import React, { useState } from 'react';
import { SpotPrices, ShopRates, BudgetSuggestion, CustomPieceConfig } from '../types/jewelry';
import { generateBudgetSuggestions, METAL_LABELS, STONE_LABELS, BACKPLATE_LABELS } from '../utils/jewelryCalculations';
import { DollarSign, Check, ArrowRight, Sparkles, Scale, Layers } from 'lucide-react';

interface Props {
  spotPrices: SpotPrices;
  rates: ShopRates;
  onApplySuggestion: (configUpdates: Partial<CustomPieceConfig>) => void;
  currentBudget: number;
  onBudgetChange: (budget: number) => void;
}

export const BudgetMatcher: React.FC<Props> = ({
  spotPrices,
  rates,
  onApplySuggestion,
  currentBudget,
  onBudgetChange,
}) => {
  const [budgetInput, setBudgetInput] = useState<string>((currentBudget ?? 1500).toString());

  const suggestions = generateBudgetSuggestions(currentBudget, spotPrices, rates);

  const quickBudgets = [600, 1000, 1500, 2500, 4000, 7500];

  const handleSetBudget = (val: number) => {
    onBudgetChange(val);
    setBudgetInput(val.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudgetInput(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed) && parsed > 0) {
      onBudgetChange(parsed);
    }
  };

  return (
    <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white font-display">
              Smart Budget Optimizer
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Customer gives you a target budget? Instantly generate custom configurations matching their price point.
          </p>
        </div>

        {/* Current Budget Input Field */}
        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-700">
          <span className="text-neutral-400 font-bold">$</span>
          <input
            type="number"
            step="50"
            value={budgetInput ?? '1500'}
            onChange={handleInputChange}
            className="w-24 sm:w-28 bg-transparent text-lg font-bold font-mono text-amber-400 focus:outline-none"
            placeholder="1500"
          />
          <span className="text-[11px] text-neutral-500 uppercase font-semibold">Budget</span>
        </div>
      </div>

      {/* Quick Budget Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 py-3 border-b border-neutral-800/60">
        <span className="text-xs text-neutral-400 font-medium">Quick Targets:</span>
        {quickBudgets.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleSetBudget(amt)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors border ${
              currentBudget === amt
                ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
            }`}
          >
            ${amt.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Suggested Configurations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {suggestions.map((sug) => {
          const isUnder = sug.differenceFromBudget <= 0;
          return (
            <div
              key={sug.id}
              className="bg-neutral-950/80 rounded-xl border border-neutral-800 hover:border-amber-500/50 p-4 flex flex-col justify-between transition-all group relative overflow-hidden"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {sug.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{sug.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold font-mono text-amber-400">
                      ${sug.estimatedRetailPrice.toLocaleString()}
                    </span>
                    <span
                      className={`block text-[10px] font-mono ${
                        isUnder ? 'text-emerald-400' : 'text-neutral-400'
                      }`}
                    >
                      {isUnder
                        ? `$${Math.abs(sug.differenceFromBudget)} under budget`
                        : `+$${sug.differenceFromBudget} over budget`}
                    </span>
                  </div>
                </div>

                {/* Specs Pill List */}
                <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                  <div className="bg-neutral-900/90 rounded p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Dimensions</span>
                    <span className="font-semibold text-neutral-200">
                      {sug.heightInches}&quot; × {sug.widthInches}&quot;
                    </span>
                  </div>
                  <div className="bg-neutral-900/90 rounded p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Approx. Weight</span>
                    <span className="font-semibold text-amber-300 font-mono">
                      ~{sug.estimatedWeightGrams} grams
                    </span>
                  </div>
                  <div className="bg-neutral-900/90 rounded p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Base Metal</span>
                    <span className="font-semibold text-neutral-200 truncate block">
                      {METAL_LABELS[sug.metal]}
                    </span>
                  </div>
                  <div className="bg-neutral-900/90 rounded p-2 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Stones / Diamonds</span>
                    <span className="font-semibold text-cyan-300 truncate block">
                      {STONE_LABELS[sug.stoneType].split('(')[0]}
                    </span>
                  </div>
                </div>

                {/* Bullet highlights */}
                <ul className="space-y-1 mb-4 text-xs text-neutral-400">
                  {sug.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 1-Click Apply Button */}
              <button
                type="button"
                onClick={() => {
                  onApplySuggestion({
                    metal: sug.metal,
                    metalColor: sug.metalColor,
                    heightInches: sug.heightInches,
                    widthInches: sug.widthInches,
                    depthMm: sug.depthMm,
                    solidness: sug.solidness,
                    backplate: sug.backplate,
                    stoneType: sug.stoneType,
                    stoneCoverage: sug.stoneCoverage,
                    bail: sug.bail,
                    weightOverrideGrams: undefined, // reset any manual override to recalculate accurately
                  });
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-neutral-950 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:text-neutral-950"
              >
                <span>Load This Build &amp; Fine-Tune</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
