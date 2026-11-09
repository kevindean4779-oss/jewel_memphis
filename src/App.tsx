/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CustomPieceConfig,
  SpotPrices,
  ShopRates,
} from './types/jewelry';
import {
  DEFAULT_SPOT_PRICES,
  DEFAULT_SHOP_RATES,
  calculateCompleteCost,
} from './utils/jewelryCalculations';
import { CustomerFrontPage } from './components/CustomerFrontPage';
import { StaffCalculationsPage } from './components/StaffCalculationsPage';
import { PrintQuoteModal } from './components/PrintQuoteModal';
import { SettingsModal } from './components/SettingsModal';
import { SavedQuotesModal, SavedQuoteRecord } from './components/SavedQuotesModal';

const INITIAL_CONFIG: CustomPieceConfig = {
  id: 'current-piece',
  title: "CUSTOM CHARM 'M'",
  customerName: 'Marcus Vance',
  customerPhone: '(901) 555-8901',
  notes: 'High polish with honeycomb back cage. Clean pave setting.',
  heightInches: 2.0,
  widthInches: 2.0,
  depthMm: 3.5,
  metal: 'gold_10k',
  metalColor: 'yellow',
  solidness: 'semi_solid',
  backplate: 'mesh_cage',
  bail: 'medium_cuban',
  stoneType: 'moissanite',
  stoneCoverage: 'half_iced',
  weightOverrideGrams: undefined,
};

export default function App() {
  // Page toggle: 'customer' (Page 1 - Front Page in White) vs 'staff' (Page 2 - Calculations & Our Cost)
  const [activePage, setActivePage] = useState<'customer' | 'staff'>('customer');

  // Custom piece configuration
  const [config, setConfig] = useState<CustomPieceConfig>(() => {
    const saved = localStorage.getItem('caratcraft_active_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_CONFIG,
          ...parsed,
          title: parsed.title ?? INITIAL_CONFIG.title,
          customerName: parsed.customerName ?? INITIAL_CONFIG.customerName,
          customerPhone: parsed.customerPhone ?? INITIAL_CONFIG.customerPhone,
        };
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_CONFIG;
  });

  // Spot prices
  const [spotPrices, setSpotPrices] = useState<SpotPrices>(() => {
    const saved = localStorage.getItem('caratcraft_spot_prices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.goldPerOz || parsed.goldPerOz < 3500) {
          return DEFAULT_SPOT_PRICES;
        }
        return {
          ...DEFAULT_SPOT_PRICES,
          ...parsed,
        };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SPOT_PRICES;
  });

  // Shop Rates
  const [rates, setRates] = useState<ShopRates>(() => {
    const saved = localStorage.getItem('caratcraft_shop_rates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SHOP_RATES,
          ...parsed,
          storeName: parsed.storeName ?? 'Golden Jewelers Memphis',
          makingChargePercent: parsed.makingChargePercent ?? DEFAULT_SHOP_RATES.makingChargePercent ?? 20,
          targetMarkup: (parsed.targetMarkup === 2.35 || !parsed.targetMarkup) ? 2.0 : parsed.targetMarkup,
        };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SHOP_RATES;
  });

  // Saved Quotes in localStorage
  const [savedQuotes, setSavedQuotes] = useState<SavedQuoteRecord[]>(() => {
    const saved = localStorage.getItem('caratcraft_saved_quotes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'quote-sample-1',
        quoteNumber: 'CQ-2026-1048',
        savedAt: 'Today at 2:15 PM',
        config: {
          ...INITIAL_CONFIG,
          title: "CUSTOM MEDALLION 'M'",
          customerName: 'Marcus Vance',
          metal: 'gold_10k',
          heightInches: 2.0,
          widthInches: 2.0,
        },
        retailPrice: 1450,
      },
    ];
  });

  // Modals
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSavedQuotesModal, setShowSavedQuotesModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('caratcraft_active_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('caratcraft_spot_prices', JSON.stringify(spotPrices));
  }, [spotPrices]);

  useEffect(() => {
    localStorage.setItem('caratcraft_shop_rates', JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem('caratcraft_saved_quotes', JSON.stringify(savedQuotes));
  }, [savedQuotes]);

  // Master Instant Calculation - recalculates dynamically on any change
  const costBreakdown = useMemo(() => {
    return calculateCompleteCost(config, spotPrices, rates);
  }, [config, spotPrices, rates]);

  // Update Config
  const handleUpdateConfig = (updates: Partial<CustomPieceConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Quick In-Store Negotiation Discount
  const handleApplyDiscount = (percent: number) => {
    if (percent === 0) {
      setRates((prev) => ({ ...prev, targetMarkup: DEFAULT_SHOP_RATES.targetMarkup }));
      triggerNotification('Pricing reset to standard catalog markup.');
    } else {
      const discountFactor = 1 - (percent / 100);
      const newMarkup = Math.max(1.4, Math.round(DEFAULT_SHOP_RATES.targetMarkup * discountFactor * 100) / 100);
      setRates((prev) => ({ ...prev, targetMarkup: newMarkup }));
      triggerNotification(`Applied ${percent}% counter discount.`);
    }
  };

  // Save current quote
  const handleSaveQuote = () => {
    const newRecord: SavedQuoteRecord = {
      id: `quote-${Date.now()}`,
      quoteNumber: `CQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      config: { ...config },
      retailPrice: costBreakdown.retailPrice,
    };
    setSavedQuotes((prev) => [newRecord, ...prev]);
    triggerNotification(`Quote ${newRecord.quoteNumber} saved successfully!`);
  };

  // Load a saved quote
  const handleLoadSavedQuote = (record: SavedQuoteRecord) => {
    setConfig({ ...record.config });
    setShowSavedQuotesModal(false);
    triggerNotification(`Loaded quote ${record.quoteNumber} for ${record.config.customerName || 'customer'}`);
  };

  // Delete saved quote
  const handleDeleteSavedQuote = (id: string) => {
    setSavedQuotes((prev) => prev.filter((q) => q.id !== id));
    triggerNotification('Quote removed from history.');
  };

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  return (
    <div className="min-h-screen">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-amber-300 border border-amber-500/40 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>{notification}</span>
        </div>
      )}

      {/* RENDER PAGE 1 (CUSTOMER FRONT PAGE IN WHITE) OR PAGE 2 (STAFF CALCULATIONS) */}
      {activePage === 'customer' ? (
        <CustomerFrontPage
          config={config}
          cost={costBreakdown}
          spotPrices={spotPrices}
          rates={rates}
          onChangeConfig={handleUpdateConfig}
          onUpdateSpotPrices={setSpotPrices}
          onGoToStaffPage={() => setActivePage('staff')}
          onOpenPrintModal={() => setShowPrintModal(true)}
          onSaveQuote={handleSaveQuote}
          onQuickBudgetTarget={(amt) => {
            setActivePage('staff');
            triggerNotification(`Opened Deal Maker for $${amt.toLocaleString()} budget.`);
          }}
        />
      ) : (
        <StaffCalculationsPage
          config={config}
          cost={costBreakdown}
          spotPrices={spotPrices}
          rates={rates}
          onChangeConfig={handleUpdateConfig}
          onUpdateSpotPrices={setSpotPrices}
          onUpdateRates={setRates}
          onBackToCustomerPage={() => setActivePage('customer')}
          onOpenPrintModal={() => setShowPrintModal(true)}
          onOpenSettingsModal={() => setShowSettingsModal(true)}
          onApplyDiscount={handleApplyDiscount}
        />
      )}

      {/* Printable Quote Sheet Modal */}
      {showPrintModal && (
        <PrintQuoteModal
          config={config}
          cost={costBreakdown}
          rates={rates}
          spotPrices={spotPrices}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Shop Rates & Bench Fees Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          rates={rates}
          onSaveRates={(newRates: ShopRates) => {
            setRates(newRates);
            setShowSettingsModal(false);
            triggerNotification('Workshop bench rates & markup updated.');
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Saved Quotes Modal */}
      {showSavedQuotesModal && (
        <SavedQuotesModal
          savedQuotes={savedQuotes}
          onLoadQuote={handleLoadSavedQuote}
          onDeleteQuote={handleDeleteSavedQuote}
          onClose={() => setShowSavedQuotesModal(false)}
        />
      )}
    </div>
  );
}
