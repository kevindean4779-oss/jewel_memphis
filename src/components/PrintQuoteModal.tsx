import React from 'react';
import { CustomPieceConfig, CostBreakdown, ShopRates, SpotPrices, METAL_LABELS, STONE_LABELS, BACKPLATE_LABELS, BAIL_LABELS } from '../types/jewelry';
import { Printer, X, ShieldCheck, CheckCircle2, Gem } from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  rates: ShopRates;
  spotPrices: SpotPrices;
  onClose: () => void;
}

export const PrintQuoteModal: React.FC<Props> = ({ config, cost, rates, spotPrices, onClose }) => {
  const quoteNumber = `CQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const quoteDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Modal Action Controls (hidden on print) */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-display">Client Quote &amp; Commission Ticket</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE QUOTE DOCUMENT AREA */}
        <div className="bg-white text-neutral-900 p-6 sm:p-8 rounded-xl mt-4 shadow-md font-sans">
          {/* Atelier Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-neutral-900 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Gem className="w-6 h-6 text-neutral-900" />
                <span className="text-xl font-bold tracking-tight font-serif uppercase">
                  {rates.storeName}
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">{rates.storeAddress}</p>
              <p className="text-xs text-neutral-600">Tel: {rates.storePhone}</p>
            </div>

            <div className="mt-3 sm:mt-0 text-left sm:text-right font-mono">
              <span className="text-xs uppercase tracking-widest text-neutral-500 block">Official Quote #</span>
              <span className="text-base font-bold text-neutral-900">{quoteNumber}</span>
              <span className="text-xs text-neutral-600 block mt-0.5">{quoteDate}</span>
            </div>
          </div>

          {/* Client & Spot Price Lock Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-neutral-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Commissioned For:</span>
              <span className="text-sm font-bold text-neutral-900">
                {config.customerName || "Valued Client"}
              </span>
              {config.customerPhone && (
                <span className="text-xs text-neutral-600 block mt-0.5">{config.customerPhone}</span>
              )}
              <span className="text-xs text-neutral-700 block mt-1 font-medium">
                Piece: &quot;{config.title || "Custom Charm Pendant"}&quot;
              </span>
            </div>

            <div className="bg-neutral-100 p-3 rounded-lg border border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-600 block">
                Gold Market Benchmark:
              </span>
              <span className="font-mono text-xs font-semibold text-neutral-800">
                Gold Spot: ${spotPrices.goldPerOz.toFixed(2)}/oz
              </span>
              <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">
                *Prices guaranteed for <strong>48 hours</strong> from quote date against precious metal market movements.
              </p>
            </div>
          </div>

          {/* Technical Specifications Table */}
          <div className="py-4 border-b border-neutral-200">
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-700 block mb-2">
              Item Manufacturing Specifications:
            </span>

            <table className="w-full text-xs text-left">
              <tbody>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-500 font-medium">Precious Metal Alloy</td>
                  <td className="py-1.5 text-neutral-900 font-semibold">{METAL_LABELS[config.metal]}</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-500 font-medium">Color Tone &amp; Finish</td>
                  <td className="py-1.5 text-neutral-900 font-semibold capitalize">{config.metalColor} Gold / High Mirror Polish</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-500 font-medium">Physical Dimensions</td>
                  <td className="py-1.5 text-neutral-900 font-semibold font-mono">
                    {config.heightInches}&quot; H × {config.widthInches}&quot; W (Depth: {config.depthMm}mm)
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-500 font-medium">Estimated Casting Weight</td>
                  <td className="py-1.5 text-neutral-900 font-semibold font-mono">~{cost.calculatedGrams} grams</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-500 font-medium">Stones Embellishment</td>
                  <td className="py-1.5 text-neutral-900 font-semibold">
                    {cost.estimatedStoneCount > 0
                      ? `${cost.estimatedStoneCount}x ${STONE_LABELS[config.stoneType].split('(')[0]} (~${cost.estimatedCaratWeight} ctw)`
                      : 'High-Polish Plain Metal (Zero Stones)'}
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-1.5 text-neutral-500 font-medium">Rear Structural Finish</td>
                  <td className="py-1.5 text-neutral-900 font-semibold">{BACKPLATE_LABELS[config.backplate]}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-neutral-500 font-medium">Chain Bail Fitting</td>
                  <td className="py-1.5 text-neutral-900 font-semibold">{BAIL_LABELS[config.bail]}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Investment & Deposit Table */}
          <div className="py-4 border-b-2 border-neutral-900">
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-neutral-700">Custom Commission Subtotal:</span>
              <span className="font-mono font-bold text-neutral-900">${cost.retailPrice.toLocaleString()}</span>
            </div>
            {cost.salesTax > 0 && (
              <div className="flex justify-between items-center text-xs py-1 text-neutral-600">
                <span>Estimated Sales Tax ({rates.salesTaxPercent}%):</span>
                <span className="font-mono">${cost.salesTax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base py-2 font-bold border-t border-neutral-300 mt-2">
              <span className="font-serif">Total Commission Investment:</span>
              <span className="font-mono text-xl text-neutral-900">
                ${cost.retailPrice.toLocaleString()}
              </span>
            </div>

            {/* Deposit Terms */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-dashed border-neutral-300 text-xs">
              <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">50% Production Deposit:</span>
                <span className="text-base font-bold font-mono text-neutral-900">
                  ${cost.recommendedDeposit.toLocaleString()}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Due upon CAD approval</span>
              </div>
              <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Final Pickup Balance:</span>
                <span className="text-base font-bold font-mono text-neutral-900">
                  ${(cost.retailPrice - cost.recommendedDeposit).toLocaleString()}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Due at final delivery</span>
              </div>
            </div>
          </div>

          {/* Signature & Authorization Section */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="border-b border-neutral-400 pb-6 mb-1" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Customer Signature &amp; Approval</span>
            </div>
            <div>
              <div className="border-b border-neutral-400 pb-6 mb-1" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Authorized Master Jeweler</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
