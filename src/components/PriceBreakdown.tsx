import React, { useState } from 'react';
import {
  CustomPieceConfig,
  CostBreakdown,
  ShopRates,
  SpotPrices,
  METAL_LABELS,
  STONE_LABELS,
  BACKPLATE_LABELS,
} from '../types/jewelry';
import {
  calculateCharmBudgetFixes,
  CharmBudgetFix,
} from '../utils/jewelryCalculations';
import {
  Printer,
  BookmarkPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Sparkles,
  Lock,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  rates: ShopRates;
  spotPrices: SpotPrices;
  isJewelerMode: boolean;
  onToggleJewelerMode: () => void;
  onOpenPrintModal: () => void;
  onSaveQuote: () => void;
  onApplyDiscount: (percent: number) => void;
  onApplyConfigPatch: (patch: Partial<CustomPieceConfig>) => void;
  onGoToBudgetPage: (budgetAmount: number) => void;
}

export const PriceBreakdown: React.FC<Props> = ({
  config,
  cost,
  rates,
  spotPrices,
  isJewelerMode,
  onToggleJewelerMode,
  onOpenPrintModal,
  onSaveQuote,
  onApplyDiscount,
  onApplyConfigPatch,
  onGoToBudgetPage,
}) => {
  // Local quick privacy shield toggle (Staff only eye toggle)
  const [hideStaffPrice, setHideStaffPrice] = useState<boolean>(true);
  const [showTax, setShowTax] = useState<boolean>(false);

  // Counter-offer / Target Budget input (e.g. $1500)
  const [customerBudgetInput, setCustomerBudgetInput] = useState<string>('1500');
  const [showBudgetResolver, setShowBudgetResolver] = useState<boolean>(false);

  const displayPrice = showTax ? cost.totalWithTax : cost.retailPrice;
  const depositAmount = Math.round((displayPrice * 0.5) / 10) * 10;
  const balanceDue = displayPrice - depositAmount;

  // Traditional jewelry cipher code: e.g. "J-580-2.35X"
  const wholesaleCode = `J-${Math.round(cost.totalCogs)}-${rates.targetMarkup}X`;

  const budgetNumber = parseFloat(customerBudgetInput) || 1500;
  const budgetFixesData = calculateCharmBudgetFixes(config, budgetNumber, spotPrices, rates);

  return (
    <div className="bg-neutral-900/95 rounded-2xl border border-neutral-800 p-5 shadow-2xl relative">
      {/* Top Title Strip */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-display">
            Instant Custom Quote
          </span>
        </div>

        {/* Traditional Counter Cipher (discreetly readable by jeweler even when masked) */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800"
            title="Jeweler Internal Cost Cipher Code"
          >
            Ref: {wholesaleCode}
          </span>
        </div>
      </div>

      {/* Main Pricing Box */}
      <div className="py-4">
        {/* 1. CUSTOMER PRICE (Bold, prominent, high-end presentation) */}
        <div className="bg-gradient-to-b from-neutral-950 to-neutral-900 p-4 sm:p-5 rounded-2xl border border-amber-500/20 text-center shadow-inner relative overflow-hidden">
          <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-bold block mb-1">
            Customer Retail Price
          </span>

          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl sm:text-3xl font-light text-amber-300">$</span>
            <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-white">
              {displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Tax toggle */}
          <button
            type="button"
            onClick={() => setShowTax(!showTax)}
            className="text-[11px] text-neutral-400 hover:text-amber-300 transition-colors underline mt-1.5"
          >
            {showTax ? `Includes ${rates.salesTaxPercent}% Sales Tax ($${cost.salesTax})` : '+ Add Sales Tax'}
          </button>

          {/* 50% Deposit & Balance at Pickup */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-neutral-800 text-xs">
            <div className="bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-amber-400 font-bold block uppercase">
                50% Deposit to Cast
              </span>
              <span className="font-mono font-bold text-sm text-white">
                ${depositAmount.toLocaleString()}
              </span>
              <span className="text-[9px] text-neutral-500 block">Locks spot gold price</span>
            </div>

            <div className="bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                Balance at Pickup
              </span>
              <span className="font-mono font-bold text-sm text-neutral-300">
                ${balanceDue.toLocaleString()}
              </span>
              <span className="text-[9px] text-neutral-500 block">Due upon inspection</span>
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER COUNTER-OFFER / $1,500 BUDGET MATCHER BAR */}
        <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Customer Counter-Offers or has a Budget?</span>
            </div>
            <button
              type="button"
              onClick={() => onGoToBudgetPage(budgetNumber)}
              className="text-[11px] text-amber-400 hover:text-amber-200 underline flex items-center gap-1 font-semibold"
            >
              <span>See Full ${budgetNumber.toLocaleString()} Page</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-700">
              <span className="text-xs text-neutral-400 font-bold mr-1">$</span>
              <input
                type="number"
                step="50"
                value={customerBudgetInput ?? '1500'}
                onChange={(e) => setCustomerBudgetInput(e.target.value)}
                placeholder="1500"
                className="w-20 bg-transparent text-sm font-bold text-amber-300 font-mono focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowBudgetResolver(!showBudgetResolver)}
              className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>How To Make This Charm for ${budgetNumber.toLocaleString()}</span>
              {showBudgetResolver ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Charm Budget Fixes Drawer */}
          {showBudgetResolver && (
            <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-3 animate-fadeIn">
              {/* Check if direct discount deal is viable */}
              {budgetFixesData.canAcceptDirectly ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Deal Maker: You can accept ${budgetNumber.toLocaleString()} directly!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyDiscount(Math.round(((cost.retailPrice - budgetNumber) / cost.retailPrice) * 100))}
                      className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] shrink-0"
                    >
                      Lock ${budgetNumber.toLocaleString()} Price
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-300 mt-1">
                    Your wholesale cost is <strong>${cost.totalCogs.toFixed(0)}</strong>. You still take home <strong className="text-emerald-400">+${budgetFixesData.directDealProfit.toFixed(0)} Profit</strong> ({budgetFixesData.directDealMargin}% margin) without having to change the metal or reduce the size!
                  </p>
                </div>
              ) : (
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-xs text-neutral-400">
                  <span>
                    A price of ${budgetNumber.toLocaleString()} is below your wholesale walk-away floor (${cost.minWalkAwayPrice}). To protect your profit, apply one of the material or size adjustments below:
                  </span>
                </div>
              )}

              {/* Specific Engineering Fixes for this piece */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Select a Modification to Hit ~${budgetNumber.toLocaleString()}:
                </span>

                {budgetFixesData.fixes.map((fix) => (
                  <div
                    key={fix.id}
                    className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{fix.title}</span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          (Saves ${fix.savingsVsOriginal.toLocaleString()})
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{fix.description}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-amber-300">
                          ${fix.resultingPrice.toLocaleString()}
                        </span>
                        <span className="block text-[9px] text-neutral-500">
                          {fix.resultingPrice <= budgetNumber ? 'At / Under Budget' : `+$${fix.differenceFromBudget} diff`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyConfigPatch(fix.configPatch);
                          setShowBudgetResolver(false);
                        }}
                        className="py-1.5 px-3 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 text-xs font-bold border border-amber-500/40 transition-colors"
                      >
                        Apply Fix
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Link to Full Budget Optimizer Page */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onGoToBudgetPage(budgetNumber)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Or open the full Budget Optimizer tab for ${budgetNumber.toLocaleString()}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. JEWELER / MY PRICE (Protected Staff Cost & Margin Box) */}
        <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 relative">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Staff Cost &amp; Profit (Confidential)
              </span>
            </div>

            {/* Privacy Mask Toggle Button */}
            <button
              type="button"
              onClick={() => setHideStaffPrice(!hideStaffPrice)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 transition-colors"
              title={hideStaffPrice ? "Reveal Wholesale Cost & Profit" : "Hide from Customer"}
            >
              {hideStaffPrice ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-300">Concealed (Tap to View)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[11px] font-semibold text-neutral-300">Hide Cost</span>
                </>
              )}
            </button>
          </div>

          {/* Masked vs Revealed Cost Display */}
          {hideStaffPrice ? (
            <div
              onClick={() => setHideStaffPrice(false)}
              className="py-3 px-2 flex items-center justify-between cursor-pointer group"
              title="Click to reveal Base Cost and walk-away margin"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-semibold">Base Cost:</span>
                <span className="font-mono text-xs font-bold text-neutral-500 blur-[3px] select-none group-hover:blur-none transition-all">
                  ${cost.baseCost.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-semibold">Net Profit:</span>
                <span className="font-mono text-xs font-bold text-neutral-500 blur-[3px] select-none group-hover:blur-none transition-all">
                  +${cost.grossProfitDollars.toFixed(0)} ({cost.grossProfitMarginPercent}%)
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold group-hover:underline">
                Tap to reveal Base Cost
              </span>
            </div>
          ) : (
            <div className="py-2.5 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* Base Cost */}
                <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-rose-300 block uppercase font-bold">Base Cost (COGS)</span>
                  <span className="font-mono text-base font-extrabold text-white">
                    ${cost.baseCost.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">Melt + Making + Labor</span>
                </div>

                {/* Net Profit */}
                <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">Net Profit</span>
                  <span className="font-mono text-base font-extrabold text-emerald-400">
                    +${cost.grossProfitDollars.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-emerald-500 block mt-0.5">
                    {cost.grossProfitMarginPercent}% Gross Margin
                  </span>
                </div>

                {/* Walk-Away Minimum */}
                <div className="bg-neutral-900 p-2.5 rounded-lg border border-amber-900/40">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold">Walk-Away Floor</span>
                  <span className="font-mono text-base font-extrabold text-amber-300">
                    ${cost.minWalkAwayPrice.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">Lowest Counter Price</span>
                </div>
              </div>

              {/* Itemized Base Cost Breakdown */}
              <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 font-mono text-[11px] space-y-1 text-neutral-300">
                <div className="flex justify-between">
                  <span>Raw Melt Metal ({cost.calculatedGrams}g @ spot):</span>
                  <span>${cost.metalRawCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>+ Refiner Fire Loss ({rates.refinerLossPercent}%):</span>
                  <span>+${cost.metalLossCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-semibold border-b border-neutral-800 pb-1">
                  <span>+ Making Charge ({cost.makingChargePercent}%):</span>
                  <span>+${cost.makingChargeAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Stones Wholesale ({cost.estimatedStoneCount} pcs):</span>
                  <span>+${cost.stonesWholesaleCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Setting &amp; Production Labor:</span>
                  <span>+${(cost.stoneSettingLaborCost + cost.cadAndPrintCost + cost.benchLaborCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-neutral-700 pt-1 mt-1">
                  <span className="text-rose-300 font-sans uppercase text-[10px]">Total Base Cost:</span>
                  <span className="text-rose-200">${cost.baseCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Quick Negotiation Discount Buttons */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-1 text-[11px]">
                <span className="text-neutral-400 shrink-0">Quick Close:</span>
                <div className="flex items-center gap-1.5 w-full justify-end">
                  {[
                    { label: 'Full Price', pct: 0 },
                    { label: '5% VIP', pct: 5 },
                    { label: '10% Deal Maker', pct: 10 },
                    { label: '15% Floor', pct: 15 },
                  ].map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => onApplyDiscount(d.pct)}
                      className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] font-semibold text-neutral-300 transition-colors"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Turnaround and 48-Hour Price Guarantee */}
        <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-neutral-300 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Turnaround: <strong>7-10 Business Days</strong></span>
          </div>
          <div className="flex items-center gap-1 text-amber-300 font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>48-Hr Gold Spot Lock</span>
          </div>
        </div>
      </div>

      {/* Action Buttons to Close the Sale */}
      <div className="pt-3 border-t border-neutral-800 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenPrintModal}
          className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5 text-neutral-400" />
          <span>Print Quote Sheet</span>
        </button>

        <button
          type="button"
          onClick={onSaveQuote}
          className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>Save Customer Quote</span>
        </button>
      </div>
    </div>
  );
};
