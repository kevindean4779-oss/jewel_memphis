import React, { useState } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  SpotPrices,
  ShopRates,
  METAL_LABELS,
  STONE_LABELS,
  BACKPLATE_LABELS,
  BAIL_LABELS,
} from '../types/jewelry';
import {
  calculateCharmBudgetFixes,
} from '../utils/jewelryCalculations';
import {
  ArrowLeft,
  DollarSign,
  ShieldAlert,
  Percent,
  Sliders,
  Sparkles,
  Printer,
  CheckCircle2,
  Lock,
  Layers,
  Wrench,
  TrendingUp,
  Scale,
  Zap,
} from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  spotPrices: SpotPrices;
  rates: ShopRates;
  onChangeConfig: (updates: Partial<CustomPieceConfig>) => void;
  onUpdateSpotPrices: (updated: SpotPrices) => void;
  onUpdateRates: (updated: ShopRates) => void;
  onBackToCustomerPage: () => void;
  onOpenPrintModal: () => void;
  onOpenSettingsModal: () => void;
  onApplyDiscount: (percent: number) => void;
}

export const StaffCalculationsPage: React.FC<Props> = ({
  config,
  cost,
  spotPrices,
  rates,
  onChangeConfig,
  onUpdateSpotPrices,
  onUpdateRates,
  onBackToCustomerPage,
  onOpenPrintModal,
  onOpenSettingsModal,
  onApplyDiscount,
}) => {
  const [budgetTargetInput, setBudgetTargetInput] = useState<string>('1500');
  const targetBudget = parseFloat(budgetTargetInput) || 1500;
  const budgetFixes = calculateCharmBudgetFixes(config, targetBudget, spotPrices, rates);

  const profitAmount = cost.retailPrice - cost.totalCogs;
  const marginPercent = ((profitAmount / cost.retailPrice) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased font-sans pb-16">
      {/* Workshop Navigation Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToCustomerPage}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-2 shadow transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to Customer Front Page</span>
            </button>
            <div className="border-l border-neutral-700 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                  Page 2: Staff Workshop &amp; Calculation Sheet
                </span>
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  CONFIDENTIAL / STAFF ONLY
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Golden Jewelers Memphis • Master Cost Engine &amp; Wholesale Breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Shop Rates &amp; Bench Fees</span>
            </button>
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Workshop Ticket</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* TOP METRICS ROW: Our Cost vs Customer Price vs Profit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* OUR WHOLESALE COST (COGS) */}
          <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-red-400 font-bold uppercase tracking-wider">
                Our Wholesale Cost (COGS)
              </span>
              <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-900 font-mono">
                Store Cost
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-white mt-1">
              ${cost.totalCogs.toFixed(2)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Raw metal alloy (${cost.metalRawCost.toFixed(2)}) + making fee (${cost.makingChargeAmount.toFixed(2)}) + bench labor (${(rates.castingLaborFee + rates.cadFee + rates.waxPrintFee + rates.finishingLaborFee).toFixed(2)}) + stones (${(cost.stonesWholesaleCost + cost.stoneSettingLaborCost).toFixed(2)})
            </p>
          </div>

          {/* CUSTOMER PRICE */}
          <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-400 font-bold uppercase tracking-wider">
                Customer Facing Price
              </span>
              <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-900 font-mono">
                {rates.targetMarkup}x (100% Profit • Double Cost)
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1">
              ${cost.retailPrice.toLocaleString()}
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Shown to customer on Front Page. With tax: ${cost.totalWithTax.toFixed(2)}
            </p>
          </div>

          {/* OUR NET PROFIT */}
          <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                Our Net Profit
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-900 font-mono">
                {marginPercent}% Margin
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
              +${profitAmount.toFixed(2)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Total store profit after paying refiner, caster, and stone setter.
            </p>
          </div>

          {/* MINIMUM WALK-AWAY FLOOR */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-400 font-bold uppercase tracking-wider">
                Walk-Away Deal Floor
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-mono">
                Min {rates.minWalkAwayMargin}%
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-neutral-200 mt-1">
              ${cost.minWalkAwayPrice.toFixed(0)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Never negotiate below this price to guarantee minimum 30% margin.
            </p>
          </div>

        </div>

        {/* MID SECTION: COMPLETE ITEMIZED CALCULATION BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 7 COLS: ITEMIZED COST TABLE */}
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Full Manufacturing Cost Breakdown
                </h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                Formula: Weight × Purity × Spot + Making % + Bench Labor
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <th className="py-2.5">Component</th>
                    <th className="py-2.5">Specification / Rate</th>
                    <th className="py-2.5 text-right">Wholesale Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  <tr>
                    <td className="py-3 font-sans">
                      <strong className="text-white block">Raw Casting Metal</strong>
                      <span className="text-[10px] text-neutral-400">
                        {cost.calculatedGrams.toFixed(1)}g total alloy • {METAL_LABELS[config.metal]}
                      </span>
                    </td>
                    <td className="py-3">
                      <div>${(cost.pureMetalGrams * (spotPrices.goldPerOz / 31.1034768)).toFixed(2)} raw pure</div>
                      <div className="text-[10px] text-neutral-500">+{rates.refinerLossPercent}% fire loss</div>
                    </td>
                    <td className="py-3 text-right font-bold text-amber-300">
                      ${cost.metalRawCost.toFixed(2)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-sans">
                      <strong className="text-white block">Making Charge (Handling &amp; Alloy)</strong>
                      <span className="text-[10px] text-neutral-400">
                        Standard refiner/manufacturer making fee
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={rates.makingChargePercent ?? 20}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) onUpdateRates({ ...rates, makingChargePercent: val });
                          }}
                          className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-emerald-400 text-right text-xs"
                        />
                        <span className="text-neutral-400">% on alloy</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-400">
                      +${cost.makingChargeAmount.toFixed(2)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-sans">
                      <strong className="text-white block">CAD 3D Modeling Fee</strong>
                      <span className="text-[10px] text-neutral-400">Custom 3D Matrix / Rhino render design</span>
                    </td>
                    <td className="py-3 text-neutral-400">Fixed Design Fee</td>
                    <td className="py-3 text-right font-bold text-white">
                      ${rates.cadFee.toFixed(2)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-sans">
                      <strong className="text-white block">3D High-Res Wax Print</strong>
                      <span className="text-[10px] text-neutral-400">EnvisionTEC / Asiga photopolymer wax</span>
                    </td>
                    <td className="py-3 text-neutral-400">Wax printing fee</td>
                    <td className="py-3 text-right font-bold text-white">
                      ${rates.waxPrintFee.toFixed(2)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-sans">
                      <strong className="text-white block">Lost-Wax Casting Labor</strong>
                      <span className="text-[10px] text-neutral-400">Flask burnout, vacuum induction casting</span>
                    </td>
                    <td className="py-3 text-neutral-400">Foundry labor</td>
                    <td className="py-3 text-right font-bold text-white">
                      ${rates.castingLaborFee.toFixed(2)}
                    </td>
                  </tr>

                  {config.stoneType !== 'none' && (
                    <tr>
                      <td className="py-3 font-sans">
                        <strong className="text-white block">Stone Sourcing &amp; Micro-Pavé Setting</strong>
                        <span className="text-[10px] text-neutral-400">
                          ~{cost.estimatedStoneCount} stones ({cost.estimatedCaratWeight.toFixed(2)} ctw) • {STONE_LABELS[config.stoneType]}
                        </span>
                      </td>
                      <td className="py-3 text-neutral-400">
                        <div>Stones: ${cost.stonesWholesaleCost.toFixed(2)}</div>
                        <div>Labor: ${cost.stoneSettingLaborCost.toFixed(2)}</div>
                      </td>
                      <td className="py-3 text-right font-bold text-cyan-300">
                        ${(cost.stonesWholesaleCost + cost.stoneSettingLaborCost).toFixed(2)}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-3 font-sans">
                      <strong className="text-white block">Bench Clean, Polish &amp; Rhodium Dip</strong>
                      <span className="text-[10px] text-neutral-400">High-luster wheel polish &amp; ultrasonic</span>
                    </td>
                    <td className="py-3 text-neutral-400">Bench finishing</td>
                    <td className="py-3 text-right font-bold text-white">
                      ${rates.finishingLaborFee.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="bg-neutral-950 font-bold text-sm">
                    <td className="py-3.5 px-2 text-white">TOTAL WHOLESALE COST (COGS)</td>
                    <td className="py-3.5 text-neutral-400">Your Actual Cost</td>
                    <td className="py-3.5 px-2 text-right text-red-400 font-mono">
                      ${cost.totalCogs.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="bg-amber-500/10 font-bold text-base">
                    <td className="py-3.5 px-2 text-amber-300">RECOMMENDED RETAIL PRICE</td>
                    <td className="py-3.5 text-amber-200 text-xs">{rates.targetMarkup}x Markup Multiplier</td>
                    <td className="py-3.5 px-2 text-right text-amber-400 font-mono">
                      ${cost.retailPrice.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick Discount Bargaining Buttons */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Counter Discount Buttons:</span>
              <div className="flex gap-1.5">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onApplyDiscount(pct)}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs border border-neutral-700 transition-colors"
                  >
                    -{pct}% (${Math.round(cost.retailPrice * (1 - pct / 100))})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: DEAL MAKER & $1,500 BUDGET SOLVER */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* DEAL MAKER / BUDGET SOLVER */}
            <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                    Deal Maker: Customer Offers Target Budget
                  </h3>
                </div>
              </div>

              {/* Budget input field */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-700 flex-1">
                  <span className="text-neutral-400 font-bold mr-1">$</span>
                  <input
                    type="number"
                    step="50"
                    value={budgetTargetInput}
                    onChange={(e) => setBudgetTargetInput(e.target.value)}
                    className="w-full bg-transparent text-base font-bold font-mono text-amber-400 focus:outline-none"
                    placeholder="1500"
                  />
                  <span className="text-[11px] text-neutral-500 uppercase">Target</span>
                </div>

                <div className="flex gap-1">
                  {[1000, 1500, 2000].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudgetTargetInput(b.toString())}
                      className={`px-2 py-2 rounded-lg text-xs font-bold border ${
                        budgetTargetInput === b.toString()
                          ? 'bg-amber-500 text-neutral-950 border-amber-500'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      ${b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deal Status Card */}
              {budgetFixes.canAcceptDirectly ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>You Can Accept ${targetBudget.toLocaleString()} Directly!</span>
                  </div>
                  <p className="text-neutral-300 text-[11px]">
                    Wholesale cost is <strong>${cost.totalCogs.toFixed(0)}</strong>. You still take home <strong className="text-emerald-400">+${budgetFixes.directDealProfit.toFixed(0)} profit</strong> ({budgetFixes.directDealMargin}% margin) without needing to shrink the charm or downgrade metal!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const discountPct = Math.round(((cost.retailPrice - targetBudget) / cost.retailPrice) * 100);
                      onApplyDiscount(discountPct);
                    }}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs text-center transition-colors shadow"
                  >
                    Lock ${targetBudget.toLocaleString()} Customer Price
                  </button>
                </div>
              ) : (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-400">
                  A price of ${targetBudget.toLocaleString()} is below your walk-away floor (${cost.minWalkAwayPrice.toFixed(0)}). Apply one of the 1-click material/size adjustments below to protect your profit:
                </div>
              )}

              {/* Alternative adjustments to hit target budget */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 block uppercase">
                  1-Click Adjustments to Hit ${targetBudget.toLocaleString()}:
                </span>
                {budgetFixes.fixes.map((sug, i) => (
                  <div
                    key={sug.id || i}
                    className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="text-white font-bold block">{sug.title}</span>
                      <span className="text-[11px] text-neutral-400">{sug.description}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChangeConfig(sug.configPatch)}
                      className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE SPOT OVERRIDE & SETTINGS QUICK DRAWER */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-bold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Manual Spot Price &amp; Rate Overrides
                </span>
                <span className="text-neutral-500 text-[10px]">Active Session</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block text-[10px] mb-1">Gold Spot ($/oz)</label>
                  <input
                    type="number"
                    step="1"
                    value={spotPrices.goldPerOz ?? 4070}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) onUpdateSpotPrices({ ...spotPrices, goldPerOz: val });
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block text-[10px] mb-1">Silver Spot ($/oz)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={spotPrices.silverPerOz ?? 52}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) onUpdateSpotPrices({ ...spotPrices, silverPerOz: val });
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
