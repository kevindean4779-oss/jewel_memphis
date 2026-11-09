import React, { useState, useEffect } from 'react';
import { SpotPrices } from '../types/jewelry';
import { fetchLiveSpotPrices } from '../utils/jewelryCalculations';
import { RefreshCw, Edit3, Check, Gem, Coins, Sparkles, TrendingUp } from 'lucide-react';

interface Props {
  spotPrices: SpotPrices;
  onUpdateSpotPrices: (updated: SpotPrices) => void;
}

export const SpotPriceBar: React.FC<Props> = ({ spotPrices, onUpdateSpotPrices }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'live' | 'manual'>('live');
  const [activeCategory, setActiveCategory] = useState<'metals' | 'stones'>('metals');

  // Metal input state
  const [goldVal, setGoldVal] = useState((spotPrices?.goldPerOz ?? 4070).toString());
  const [silverVal, setSilverVal] = useState((spotPrices?.silverPerOz ?? 52).toString());
  const [platVal, setPlatVal] = useState((spotPrices?.platinumPerOz ?? 1545).toString());
  const [brassVal, setBrassVal] = useState((spotPrices?.brassPerGram ?? 0.08).toString());

  // Stone input state
  const [natDiaVal, setNatDiaVal] = useState((spotPrices?.naturalDiamondPerCarat ?? 420).toString());
  const [labDiaVal, setLabDiaVal] = useState((spotPrices?.labDiamondPerCarat ?? 110).toString());
  const [moissVal, setMoissVal] = useState((spotPrices?.moissanitePerCarat ?? 25).toString());
  const [czVal, setCzVal] = useState((spotPrices?.czPerPiece ?? 0.07).toString());

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
        setBrassVal(liveData.brassPerGram.toString());
        setNatDiaVal((liveData.naturalDiamondPerCarat ?? 420).toString());
        setLabDiaVal((liveData.labDiamondPerCarat ?? 110).toString());
        setMoissVal((liveData.moissanitePerCarat ?? 25).toString());
        setCzVal((liveData.czPerPiece ?? 0.07).toString());
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
  const goldGram24k = (spotPrices?.goldPerOz ?? 4070) / 31.1034768;
  const goldGram14k = goldGram24k * 0.5833;
  const goldGram10k = goldGram24k * 0.4167;
  const silverGram = (spotPrices?.silverPerOz ?? 52) / 31.1034768;
  const platGram = (spotPrices?.platinumPerOz ?? 1545) / 31.1034768;

  const handleManualSave = () => {
    const goldNum = parseFloat(goldVal) || spotPrices.goldPerOz;
    const silverNum = parseFloat(silverVal) || spotPrices.silverPerOz;
    const platNum = parseFloat(platVal) || spotPrices.platinumPerOz;
    const brassNum = parseFloat(brassVal) || spotPrices.brassPerGram;

    const natDiaNum = parseFloat(natDiaVal) || (spotPrices.naturalDiamondPerCarat ?? 420);
    const labDiaNum = parseFloat(labDiaVal) || (spotPrices.labDiamondPerCarat ?? 110);
    const moissNum = parseFloat(moissVal) || (spotPrices.moissanitePerCarat ?? 25);
    const czNum = parseFloat(czVal) || (spotPrices.czPerPiece ?? 0.07);

    onUpdateSpotPrices({
      ...spotPrices,
      goldPerOz: goldNum,
      silverPerOz: silverNum,
      platinumPerOz: platNum,
      brassPerGram: brassNum,
      naturalDiamondPerCarat: natDiaNum,
      labDiamondPerCarat: labDiaNum,
      moissanitePerCarat: moissNum,
      czPerPiece: czNum,
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
      setBrassVal(liveData.brassPerGram.toString());
      setNatDiaVal((liveData.naturalDiamondPerCarat ?? 420).toString());
      setLabDiaVal((liveData.labDiamondPerCarat ?? 110).toString());
      setMoissVal((liveData.moissanitePerCarat ?? 25).toString());
      setCzVal((liveData.czPerPiece ?? 0.07).toString());
      setLiveStatus('live');
    }
    setIsSyncing(false);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2 text-xs text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Category Switcher & Live Status */}
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 text-emerald-400 px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                liveStatus === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                liveStatus === 'live' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="hidden sm:inline">
              {liveStatus === 'live' ? 'LIVE FEEDS' : 'OVERRIDE'}
            </span>
          </div>

          {/* Toggle between Metals & Stones */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveCategory('metals')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${
                activeCategory === 'metals'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-3 h-3" />
              <span>Metals (4)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('stones')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${
                activeCategory === 'stones'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gem className="w-3 h-3" />
              <span>Stones (4)</span>
            </button>
          </div>
        </div>

        {/* Spot Ticker items */}
        {activeCategory === 'metals' ? (
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 font-mono text-xs">
            {/* Gold */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                GOLD
              </span>
              <span className="text-white font-bold text-sm">
                ${(spotPrices.goldPerOz ?? 4070).toFixed(2)}/oz
              </span>
              <span className="text-slate-400 hidden lg:inline">
                (14K: <strong className="text-amber-200 font-bold">${goldGram14k.toFixed(2)}/g</strong> · 10K: <strong className="text-amber-200 font-bold">${goldGram10k.toFixed(2)}/g</strong>)
              </span>
            </div>

            {/* Silver */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                SILVER
              </span>
              <span className="text-white font-bold">${(spotPrices.silverPerOz ?? 52).toFixed(2)}/oz</span>
              <span className="text-slate-400 hidden sm:inline">
                (${silverGram.toFixed(2)}/g)
              </span>
            </div>

            {/* Platinum */}
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                PLAT
              </span>
              <span className="text-white font-bold">${(spotPrices.platinumPerOz ?? 1545).toFixed(2)}/oz</span>
              <span className="text-slate-400 hidden lg:inline">
                (${platGram.toFixed(2)}/g)
              </span>
            </div>

            {/* Brass */}
            <div className="hidden xl:flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                BRASS
              </span>
              <span className="text-slate-300 font-bold">${(spotPrices.brassPerGram ?? 0.08).toFixed(2)}/g</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 font-mono text-xs">
            {/* Natural Diamond */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                NAT DIAMOND
              </span>
              <span className="text-white font-bold">
                ${spotPrices.naturalDiamondPerCarat ?? 420}/ct
              </span>
              <span className="text-slate-400 hidden md:inline">
                (~${Math.round((spotPrices.naturalDiamondPerCarat ?? 420) / 12)}/stone)
              </span>
            </div>

            {/* Lab-Grown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                LAB GROWN
              </span>
              <span className="text-white font-bold">
                ${spotPrices.labDiamondPerCarat ?? 110}/ct
              </span>
              <span className="text-slate-400 hidden md:inline">
                (~${((spotPrices.labDiamondPerCarat ?? 110) / 10).toFixed(1)}/stone)
              </span>
            </div>

            {/* Moissanite */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-violet-300 bg-violet-950 px-1.5 py-0.5 rounded border border-violet-800">
                MOISSANITE
              </span>
              <span className="text-white font-bold">
                ${spotPrices.moissanitePerCarat ?? 25}/ct
              </span>
            </div>

            {/* CZ */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                5A CZ
              </span>
              <span className="text-white font-bold">
                ${(spotPrices.czPerPiece ?? 0.07).toFixed(2)}/pc
              </span>
            </div>
          </div>
        )}

        {/* Spot controls */}
        <div className="flex items-center gap-2.5 text-slate-400 text-[11px]">
          <span className="hidden sm:inline text-slate-400">
            {spotPrices.lastUpdated}
          </span>

          <button
            type="button"
            onClick={handleSyncLive}
            disabled={isSyncing}
            className="flex items-center gap-1 text-slate-300 hover:text-amber-300 transition-colors disabled:opacity-50 px-2 py-1 rounded hover:bg-slate-800"
            title="Refresh Live Global Spot Feed for Metals and Stones"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSyncing ? 'Pulling...' : 'Sync Market'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded hover:bg-slate-800 font-semibold"
          >
            <Edit3 className="w-3 h-3" />
            <span>Spot Sheet</span>
          </button>
        </div>
      </div>

      {/* Editing Drawer / Modal Inline */}
      {isEditing && (
        <div className="mt-3 p-4 bg-slate-950 rounded-2xl border border-slate-700 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Refinery &amp; Gem Market Price Sheet Override:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1 shadow-sm"
              >
                <Check className="w-3 h-3" />
                <span>Apply Sheet</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Precious Metals */}
            <div className="space-y-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-amber-400 block">Precious Metals ($/oz):</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Gold:</span>
                <input
                  type="number"
                  step="0.5"
                  value={goldVal ?? ''}
                  onChange={(e) => setGoldVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Silver:</span>
                <input
                  type="number"
                  step="0.1"
                  value={silverVal ?? ''}
                  onChange={(e) => setSilverVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                />
              </div>
            </div>

            {/* Platinum & Brass */}
            <div className="space-y-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-cyan-400 block">Platinum &amp; Brass:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Platinum ($/oz):</span>
                <input
                  type="number"
                  step="1.0"
                  value={platVal ?? ''}
                  onChange={(e) => setPlatVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Brass ($/g):</span>
                <input
                  type="number"
                  step="0.01"
                  value={brassVal ?? ''}
                  onChange={(e) => setBrassVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                />
              </div>
            </div>

            {/* Diamonds Benchmark */}
            <div className="space-y-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-cyan-300 block">Diamonds Benchmark ($/ct):</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Natural Earth:</span>
                <input
                  type="number"
                  step="5"
                  value={natDiaVal ?? ''}
                  onChange={(e) => setNatDiaVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Lab-Grown:</span>
                <input
                  type="number"
                  step="5"
                  value={labDiaVal ?? ''}
                  onChange={(e) => setLabDiaVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-mono text-right"
                />
              </div>
            </div>

            {/* Moissanite & CZ */}
            <div className="space-y-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-violet-300 block">Moissanite &amp; CZ:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Moissanite ($/ct):</span>
                <input
                  type="number"
                  step="1"
                  value={moissVal ?? ''}
                  onChange={(e) => setMoissVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-violet-300 font-mono text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">5A CZ ($/pc):</span>
                <input
                  type="number"
                  step="0.01"
                  value={czVal ?? ''}
                  onChange={(e) => setCzVal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
