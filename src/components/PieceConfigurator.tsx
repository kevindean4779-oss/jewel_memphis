import React, { useState } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  SpotPrices,
  ShopRates,
  MetalType,
  MetalColor,
  StoneType,
  BackplateType,
  BailSize,
  METAL_LABELS,
  STONE_LABELS,
  BACKPLATE_LABELS,
  BAIL_LABELS,
} from '../types/jewelry';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Ruler,
  Diamond,
  CircleDot,
  Sliders,
  TrendingUp,
  Percent,
  DollarSign,
} from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  spotPrices: SpotPrices;
  rates: ShopRates;
  onChange: (updates: Partial<CustomPieceConfig>) => void;
  onUpdateSpotPrices: (updated: SpotPrices) => void;
  onUpdateRates: (updated: ShopRates) => void;
}

export const PieceConfigurator: React.FC<Props> = ({
  config,
  cost,
  spotPrices,
  rates,
  onChange,
  onUpdateSpotPrices,
  onUpdateRates,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Dimension presets for instant 1-tap quote (2x2, 1.5x1.5, 2x1, 1x1, 2.5x2)
  const dimensionPresets = [
    { label: '2.0" × 2.0"', h: 2.0, w: 2.0 },
    { label: '1.5" × 1.5"', h: 1.5, w: 1.5 },
    { label: '2.0" × 1.0"', h: 2.0, w: 1.0 },
    { label: '1.0" × 1.0"', h: 1.0, w: 1.0 },
    { label: '2.5" × 2.0"', h: 2.5, w: 2.0 },
    { label: '3.0" × 2.0"', h: 3.0, w: 2.0 },
  ];

  return (
    <div className="space-y-4">
      {/* 0. Real-Time Benchmark Rates: Spot Gold Price & Making Charge % */}
      <div className="bg-neutral-900/90 rounded-xl border border-amber-500/30 p-3.5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Spot Gold Price &amp; Making Charge Percentage
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">Dynamic Real-Time Rate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {/* Current Spot Gold Price Field */}
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-neutral-300 font-semibold">
                Current Spot Gold Price:
              </label>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                ${((spotPrices.goldPerOz ?? 4070) / 31.1034768).toFixed(2)}/g (24K)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-neutral-400">$</span>
              <input
                type="number"
                step="1"
                value={spotPrices.goldPerOz ?? 4070}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    onUpdateSpotPrices({
                      ...spotPrices,
                      goldPerOz: val,
                      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    });
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-mono text-neutral-400">/oz</span>
            </div>
          </div>

          {/* Making Charge Percentage Field */}
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-neutral-300 font-semibold">
                Making Charge Percentage:
              </label>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                +${cost.makingChargeAmount.toFixed(2)} fee
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={rates.makingChargePercent ?? 20}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    onUpdateRates({ ...rates, makingChargePercent: val });
                  }
                }}
                className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-sm font-mono font-bold text-emerald-400 text-right focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-mono text-neutral-400">%</span>

              {/* Quick making charge buttons: 15%, 20%, 25%, 30% */}
              <div className="flex items-center gap-1 ml-auto">
                {[15, 20, 25, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onUpdateRates({ ...rates, makingChargePercent: pct })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                      rates.makingChargePercent === pct
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Base Metal Selection */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <CircleDot className="w-4 h-4 text-amber-400" />
            1. Base Metal
          </label>
          <span className="text-xs font-mono text-neutral-300">
            {METAL_LABELS[config.metal]}
          </span>
        </div>

        {/* 4 Core Metals requested: Brass, Silver, 10k Gold, 14k Gold (+ 18k & Platinum) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(
            [
              { id: 'brass', name: 'Brass / Bronze', badge: 'Custom Vermeil Base' },
              { id: 'silver_925', name: '925 Silver', badge: 'Solid Sterling Silver' },
              { id: 'gold_10k', name: '10K Gold', badge: '41.7% Pure Solid Gold' },
              { id: 'gold_14k', name: '14K Gold', badge: '58.3% Pure Solid Gold' },
              { id: 'gold_18k', name: '18K Gold', badge: '75.0% Pure Solid Gold' },
              { id: 'platinum_950', name: 'Platinum 950', badge: '95.0% Pure Platinum' },
            ] as const
          ).map((m) => {
            const isSelected = config.metal === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ metal: m.id as MetalType })}
                className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm">{m.name}</span>
                  {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                </div>
                <span className="text-[11px] text-neutral-400 mt-0.5">{m.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Metal Tone / Color */}
        <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium">Metal Finish &amp; Tone:</span>
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(
              [
                { id: 'yellow', label: 'Yellow Gold' },
                { id: 'white', label: 'White / Rhodium' },
                { id: 'rose', label: 'Rose Gold' },
                { id: 'two_tone', label: 'Two-Tone' },
              ] as const
            ).map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => onChange({ metalColor: tone.id as MetalColor })}
                className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${
                  config.metalColor === tone.id
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Stone Selection */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Diamond className="w-4 h-4 text-cyan-400" />
            2. Stone Selection
          </label>
          <span className="text-xs font-mono text-cyan-300">
            {cost.estimatedStoneCount > 0 ? (
              <span>{cost.estimatedStoneCount} Stones (~{cost.estimatedCaratWeight} ctw)</span>
            ) : (
              <span className="text-neutral-500">Plain High-Polish</span>
            )}
          </span>
        </div>

        {/* 4 Stones requested: Diamond, CZ, Lab-Grown, Moissanite (+ None) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(
            [
              { id: 'natural_diamond', title: 'Natural Diamond', sub: 'Earth-Mined VS-SI GH Melee' },
              { id: 'cz', title: 'CZ (Cubic Zirconia)', sub: '5A Brilliant Crystal Shine' },
              { id: 'lab_diamond', title: 'Lab-Grown Diamond', sub: '100% Genuine Carbon DEF' },
              { id: 'moissanite', title: 'Moissanite', sub: 'VVS1 (Passes Diamond Tester)' },
              { id: 'none', title: 'Plain Polish (No Stones)', sub: 'High-Mirror Solid Metal ($0)' },
            ] as const
          ).map((s) => {
            const isSelected = config.stoneType === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange({ stoneType: s.id as StoneType })}
                className={`flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span className="text-xs font-bold">{s.title}</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">{s.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Dimensions (e.g. 2x2, 1.5x1.5, 2x1 inches) */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-amber-400" />
            3. Piece Dimensions
          </label>
          <span className="text-xs font-mono text-neutral-400">
            Estimated Weight: <strong className="text-amber-400">~{cost.calculatedGrams} grams</strong>
          </span>
        </div>

        {/* 1-Tap Quick Size Buttons featuring 2x2, 1.5x1.5, 2x1, 1x1 */}
        <div className="mb-3">
          <span className="text-[11px] text-neutral-400 block mb-1.5 font-medium">Quick Dimension Presets:</span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {dimensionPresets.map((preset) => {
              const active = config.heightInches === preset.h && config.widthInches === preset.w;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange({ heightInches: preset.h, widthInches: preset.w })}
                  className={`py-2 px-1 rounded-lg text-xs font-mono font-bold border transition-colors text-center ${
                    active
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Height and Width Dropdowns */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-neutral-400 font-semibold">Height (Inches)</span>
              <span className="font-mono text-xs font-bold text-amber-400">{config.heightInches}&quot;</span>
            </div>
            <select
              value={config.heightInches}
              onChange={(e) => onChange({ heightInches: parseFloat(e.target.value) })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5, 4.0].map((val) => (
                <option key={val} value={val}>
                  {val.toFixed(2)}&quot; ({Math.round(val * 25.4)}mm)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-neutral-400 font-semibold">Width (Inches)</span>
              <span className="font-mono text-xs font-bold text-amber-400">{config.widthInches}&quot;</span>
            </div>
            <select
              value={config.widthInches}
              onChange={(e) => onChange({ widthInches: parseFloat(e.target.value) })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5, 4.0].map((val) => (
                <option key={val} value={val}>
                  {val.toFixed(2)}&quot; ({Math.round(val * 25.4)}mm)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Collapsible Advanced Settings (Backplate, Bail, Thickness, Manual Gram Override) */}
      <div className="bg-neutral-900/60 rounded-xl border border-neutral-800/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Sliders className="w-3.5 h-3.5" />
            <span>More Specifications (Backplate, Bail, Thickness, CAD Weight)</span>
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-2 border-t border-neutral-800 space-y-3 text-xs animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">Rear Backplate Style</label>
                <select
                  value={config.backplate}
                  onChange={(e) => onChange({ backplate: e.target.value as BackplateType })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                >
                  <option value="mesh_cage">Honeycomb Cage Grill (Luxury Standard)</option>
                  <option value="open">Open Cavity (Lightweight Hollow)</option>
                  <option value="solid_plate">Solid Mirror-Polished Backplate</option>
                  <option value="engraved_solid">Solid + Custom Laser Engraving</option>
                  <option value="micro_pave_back">Dual-Sided Bust Down (Stones on Back)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Chain Bail Size</label>
                <select
                  value={config.bail}
                  onChange={(e) => onChange({ bail: e.target.value as BailSize })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                >
                  <option value="medium_cuban">Medium Cuban / Franco (up to 8mm)</option>
                  <option value="standard_small">Standard Loop (up to 4mm)</option>
                  <option value="large_miami">Large Miami Cuban (up to 14mm)</option>
                  <option value="iced_bail">Iced-Out Pavé Bail</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-neutral-400 block mb-1">Depth / Thickness</label>
                <select
                  value={config.depthMm}
                  onChange={(e) => onChange({ depthMm: parseFloat(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                >
                  <option value={2.5}>2.5mm (Light profile)</option>
                  <option value={3.5}>3.5mm (Standard charm)</option>
                  <option value={4.5}>4.5mm (3D Embossed)</option>
                  <option value={6.0}>6.0mm (Deep 3D block)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Manual Gram Override (Optional)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={`Auto: ${cost.calculatedGrams}g`}
                    value={config.weightOverrideGrams ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChange({ weightOverrideGrams: isNaN(val) ? undefined : val });
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-right"
                  />
                  {config.weightOverrideGrams && (
                    <button
                      type="button"
                      onClick={() => onChange({ weightOverrideGrams: undefined })}
                      className="text-[10px] text-amber-400 underline whitespace-nowrap"
                    >
                      Reset Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
