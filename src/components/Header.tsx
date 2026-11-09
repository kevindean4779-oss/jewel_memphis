import React from 'react';
import { Gem, Lock, Unlock, Settings, Bookmark } from 'lucide-react';

interface Props {
  activeTab: 'configurator' | 'budget' | 'presets' | 'quotes';
  onSelectTab: (tab: 'configurator' | 'budget' | 'presets' | 'quotes') => void;
  isJewelerMode: boolean;
  onToggleJewelerMode: () => void;
  onOpenSettings: () => void;
  savedQuotesCount: number;
}

export const Header: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isJewelerMode,
  onToggleJewelerMode,
  onOpenSettings,
  savedQuotesCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <Gem className="w-4 h-4" />
        </div>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('configurator');
          }}
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap hover:text-amber-200 transition-colors"
        >
          CaratCraft Custom Quoter
        </a>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-300">
        <button
          type="button"
          onClick={() => onSelectTab('configurator')}
          className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'configurator' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          Custom Builder
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('budget')}
          className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'budget' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          Budget Optimizer
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('presets')}
          className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'presets' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          Popular Presets
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('quotes')}
          className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1.5 ${
            activeTab === 'quotes' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          <span>Saved Quotes</span>
          {savedQuotesCount > 0 && (
            <span className="font-mono text-[10px] bg-neutral-800 text-amber-300 px-1.5 py-0.2 rounded-full">
              {savedQuotesCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: 1 primary action & discreet mode switch */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          title="Store Rates &amp; Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleJewelerMode}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isJewelerMode
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-neutral-950'
          }`}
        >
          {isJewelerMode ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Staff Mode</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
