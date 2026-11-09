import React, { useState } from 'react';
import { ShopRates } from '../types/jewelry';
import { X, Settings, RotateCcw, Check } from 'lucide-react';
import { DEFAULT_SHOP_RATES } from '../utils/jewelryCalculations';

interface Props {
  rates: ShopRates;
  onSaveRates: (rates: ShopRates) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ rates, onSaveRates, onClose }) => {
  const [form, setForm] = useState<ShopRates>(() => ({
    ...DEFAULT_SHOP_RATES,
    ...rates,
    storeName: rates?.storeName ?? DEFAULT_SHOP_RATES.storeName,
    storePhone: rates?.storePhone ?? DEFAULT_SHOP_RATES.storePhone,
    storeAddress: rates?.storeAddress ?? DEFAULT_SHOP_RATES.storeAddress,
    makingChargePercent: rates?.makingChargePercent ?? DEFAULT_SHOP_RATES.makingChargePercent ?? 20,
    salesTaxPercent: rates?.salesTaxPercent ?? DEFAULT_SHOP_RATES.salesTaxPercent,
    targetMarkup: rates?.targetMarkup ?? DEFAULT_SHOP_RATES.targetMarkup,
    minWalkAwayMargin: rates?.minWalkAwayMargin ?? DEFAULT_SHOP_RATES.minWalkAwayMargin,
    cadFee: rates?.cadFee ?? DEFAULT_SHOP_RATES.cadFee,
    waxPrintFee: rates?.waxPrintFee ?? DEFAULT_SHOP_RATES.waxPrintFee,
    castingLaborFee: rates?.castingLaborFee ?? DEFAULT_SHOP_RATES.castingLaborFee,
    finishingLaborFee: rates?.finishingLaborFee ?? DEFAULT_SHOP_RATES.finishingLaborFee,
    refinerLossPercent: rates?.refinerLossPercent ?? DEFAULT_SHOP_RATES.refinerLossPercent,
  }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRates(form);
    onClose();
  };

  const handleResetDefaults = () => {
    setForm({ ...DEFAULT_SHOP_RATES });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-display">Workshop Rates &amp; Atelier Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 py-4 text-xs">
          {/* Store Identification */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
              Store Information (Shown on Quotes)
            </span>
            <div>
              <label className="text-neutral-400 block mb-1">Store / Atelier Name</label>
              <input
                type="text"
                value={form.storeName ?? ''}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-neutral-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.storePhone ?? ''}
                  onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Sales Tax (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.salesTaxPercent ?? 0}
                  onChange={(e) => setForm({ ...form, salesTaxPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Store Address</label>
              <input
                type="text"
                value={form.storeAddress ?? ''}
                onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Pricing & Markup multipliers */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
              Pricing Multipliers &amp; Profit Margins
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                <label className="text-neutral-400 block mb-1">Target Retail Markup</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="1.2"
                    max="5.0"
                    value={form.targetMarkup ?? 2.0}
                    onChange={(e) => setForm({ ...form, targetMarkup: parseFloat(e.target.value) || 2.0 })}
                    className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                  />
                  <span className="text-neutral-500">x COGS</span>
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">Default: 2.0x (Double Cost / 100% Profit)</span>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                <label className="text-neutral-400 block mb-1">Min Walk-Away Margin</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    min="15"
                    max="60"
                    value={form.minWalkAwayMargin ?? 30}
                    onChange={(e) => setForm({ ...form, minWalkAwayMargin: parseFloat(e.target.value) || 30 })}
                    className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                  />
                  <span className="text-neutral-500">%</span>
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">Negotiation counter floor</span>
              </div>
            </div>
          </div>

          {/* Manufacturing bench costs */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
              Bench &amp; Production Costs ($)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                <label className="text-neutral-400 text-[10px] block">CAD 3D Fee</label>
                <input
                  type="number"
                  value={form.cadFee ?? 65}
                  onChange={(e) => setForm({ ...form, cadFee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-white font-mono text-xs"
                />
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                <label className="text-neutral-400 text-[10px] block">3D Wax Print</label>
                <input
                  type="number"
                  value={form.waxPrintFee ?? 35}
                  onChange={(e) => setForm({ ...form, waxPrintFee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-white font-mono text-xs"
                />
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                <label className="text-neutral-400 text-[10px] block">Casting Labor</label>
                <input
                  type="number"
                  value={form.castingLaborFee ?? 40}
                  onChange={(e) => setForm({ ...form, castingLaborFee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-white font-mono text-xs"
                />
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                <label className="text-neutral-400 text-[10px] block">Polish &amp; Dip</label>
                <input
                  type="number"
                  value={form.finishingLaborFee ?? 45}
                  onChange={(e) => setForm({ ...form, finishingLaborFee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 mt-2 flex items-center justify-between">
              <div>
                <span className="text-neutral-300 font-medium block">Standard Making Charge</span>
                <span className="text-[10px] text-neutral-500">Handling and craftsmanship fee on metal alloy</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={form.makingChargePercent ?? 20}
                  onChange={(e) => setForm({ ...form, makingChargePercent: parseFloat(e.target.value) || 0 })}
                  className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-right"
                />
                <span className="text-neutral-400">%</span>
              </div>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 mt-2 flex items-center justify-between">
              <div>
                <span className="text-neutral-300 font-medium block">Refiner &amp; Casting Fire Loss</span>
                <span className="text-[10px] text-neutral-500">Loss during lost-wax spruing and polishing</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={form.refinerLossPercent ?? 9}
                  onChange={(e) => setForm({ ...form, refinerLossPercent: parseFloat(e.target.value) || 8 })}
                  className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-right"
                />
                <span className="text-neutral-400">%</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standards</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Workshop Rates</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
