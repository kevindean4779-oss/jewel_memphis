import React, { useState, useEffect } from 'react';
import { SpotPrices } from '../types/jewelry';
import { fetchLiveSpotPrices } from '../utils/jewelryCalculations';
import { RefreshCw, Edit3, Check, Globe } from 'lucide-react';

interface Props {
  spotPrices: SpotPrices;
  onUpdateSpotPrices: (updated: SpotPrices) => void;
}

export const SpotPriceBar: React.FC<Props> = ({ spotPrices, onUpdateSpotPrices }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'live' | 'manual'>('live');
  const [goldVal, setGoldVal] = useState((spotPrices?.goldPerOz ?? 4070).toString());
  const [silverVal, setSilverVal] = useState((spotPrices?.silverPerOz ?? 52).toString());
  const [platVal, setPlatVal] = useState((spotPrices?.platinumPerOz ?? 1545).toString());

  // Automatically fetch live spot prices on initial mount
  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      setIsSyncing(true);
      const liveData = await fetchLiveSpotPrices();
      if (isMounted && liveData) {
        onUpdateSpotPrices(liveData);
        setGoldVal(liveData.goldPerOz.toString());
        setSilverVal(liveData.silverPerOz.toString());
        setPlatVal(liveData.platinumPerOz.toString());
        setLiveStatus('live');
      }
      if (isMounted) setIsSyncing(false);
    };

    fetchPrices();

    // Auto-refresh spot prices every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Gram calculations
  const goldGram24k = spotPrices.goldPerOz / 31.1034768;
  const goldGram14k = goldGram24k * 0.5833;
  const goldGram10k = goldGram24k * 0.4167;
  const silverGram = spotPrices.silverPerOz / 31.1034768;

  const handleManualSave = () => {
    const goldNum = parseFloat(goldVal) || spotPrices.goldPerOz;
    const silverNum = parseFloat(silverVal) || spotPrices.silverPerOz;
    const platNum = parseFloat(platVal) || spotPrices.platinumPerOz;

    onUpdateSpotPrices({
      ...spotPrices,
      goldPerOz: goldNum,
      silverPerOz: silverNum,
      platinumPerOz: platNum,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setLiveStatus('manual');
    setIsEditing(false);
  };

  const handleSyncLive = async () => {
    setIsSyncing(true);
    const liveData = await fetchLiveSpotPrices();
    if (liveData) {
      onUpdateSpotPrices(liveData);
      setGoldVal(liveData.goldPerOz.toString());
      setSilverVal(liveData.silverPerOz.toString());
      setPlatVal(liveData.platinumPerOz.toString());
      setLiveStatus('live');
    }
    setIsSyncing(false);
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-4 sm:px-6 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Spot Ticker items */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono">
          {/* Gold */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              GOLD SPOT
            </span>
            <span className="text-white font-bold text-sm">
              ${spotPrices.goldPerOz.toFixed(2)}/oz
            </span>
            <span className="text-neutral-400 hidden md:inline">
              (14K: <strong className="text-amber-200 font-bold">${goldGram14k.toFixed(2)}/g</strong> · 10K: <strong className="text-amber-200 font-bold">${goldGram10k.toFixed(2)}/g</strong>)
            </span>
          </div>

          {/* Silver */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
              SILVER
            </span>
            <span className="text-white font-bold">${spotPrices.silverPerOz.toFixed(2)}/oz</span>
            <span className="text-neutral-400 hidden sm:inline">
              (${silverGram.toFixed(2)}/g)
            </span>
          </div>

          {/* Platinum */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
              PLATINUM
            </span>
            <span className="text-white font-bold">${spotPrices.platinumPerOz.toFixed(2)}/oz</span>
          </div>
        </div>

        {/* Spot controls */}
        <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
          {/* Live Status indicator */}
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                liveStatus === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                liveStatus === 'live' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="text-[10px] uppercase font-medium">
              {liveStatus === 'live' ? 'Live API Feed' : 'Refiner Override'}
            </span>
          </div>

          <span className="hidden sm:inline text-neutral-500">
            {spotPrices.lastUpdated}
          </span>

          <button
            type="button"
            onClick={handleSyncLive}
            disabled={isSyncing}
            className="flex items-center gap-1 text-neutral-300 hover:text-amber-300 transition-colors disabled:opacity-50"
            title="Refresh Live Global Spot Price"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSyncing ? 'Updating...' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>Refiner Sheet</span>
          </button>
        </div>
      </div>

      {/* Editing Drawer / Modal Inline */}
      {isEditing && (
        <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-700 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-neutral-300">
              Refinery Sheet Override ($/oz):
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-400">Gold: $</span>
              <input
                type="number"
                step="0.5"
                value={goldVal ?? ''}
                onChange={(e) => setGoldVal(e.target.value)}
                className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-amber-300 font-mono"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-400">Silver: $</span>
              <input
                type="number"
                step="0.1"
                value={silverVal ?? ''}
                onChange={(e) => setSilverVal(e.target.value)}
                className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 font-mono"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-400">Platinum: $</span>
              <input
                type="number"
                step="1.0"
                value={platVal ?? ''}
                onChange={(e) => setPlatVal(e.target.value)}
                className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>Apply Sheet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
