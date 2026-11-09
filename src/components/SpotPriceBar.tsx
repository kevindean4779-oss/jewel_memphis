import React, { useState, useEffect } from 'react';
import { SpotPrices } from '../types/jewelry';
import { fetchLiveSpotPrices } from '../utils/jewelryCalculations';
import { RefreshCw, SlidersHorizontal, Check, Coins, Gem } from 'lucide-react';

interface Props {
  spotPrices: SpotPrices;
  onUpdateSpotPrices: (updated: SpotPrices) => void;
}

export const SpotPriceBar: React.FC<Props> = ({ spotPrices, onUpdateSpotPrices }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'live' | 'manual'>('live');
  const [activeCategory, setActiveCategory] = useState<'metals' | 'stones'>('metals');

  // Metal inputs
  const [goldVal, setGoldVal] = useState((spotPrices?.goldPerOz ?? 4070).toString());
  const [silverVal, setSilverVal] = useState((spotPrices?.silverPerOz ?? 52).toString());
  const [platVal, setPlatVal] = useState((spotPrices?.platinumPerOz ?? 1545).toString());
  const [brassVal, setBrassVal] = useState((spotPrices?.brassPerGram ?? 0.08).toString());

  // Stone inputs
  const [natDiaVal, setNatDiaVal] = useState((spotPrices?.naturalDiamondPerCarat ?? 420).toString());
  const [labDiaVal, setLabDiaVal] = useState((spotPrices?.labDiamondPerCarat ?? 110).toString());
  const [moissVal, setMoissVal] = useState((spotPrices?.moissanitePerCarat ?? 25).toString());
  const [czVal, setCzVal] = useState((spotPrices?.czPerPiece ?? 0.07).toString());

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
    const interval = setInterval(fetchPrices, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
    <div className="bg-slate-100/90 border-b border-slate-200/90 px-4 sm:px-6 py-2 text-xs text-slate-700 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Interactive Category Segmented Control & Live Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="text-slate-400">Market Feed</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
              {liveStatus === 'live' ? 'Live Feeds' : 'Refiner Override'}
            </span>
          </div>

          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveCategory('metals')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                activeCategory === 'metals'
                  ? 'bg-slate-900 text-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-3 h-3" />
              <span>Metals (4)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('stones')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                activeCategory === 'stones'
                  ? 'bg-slate-900 text-cyan-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gem className="w-3 h-3" />
              <span>Stones (4)</span>
            </button>
          </div>
        </div>

        {/* Center: Clean Ticker items with tabular numerals */}
        {activeCategory === 'metals' ? (
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs tabular-nums">
            {/* Gold */}
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-amber-800 text-[11px]">GOLD</span>
              <span className="font-bold text-slate-900">
                ${(spotPrices.goldPerOz ?? 4070).toFixed(2)}/oz
              </span>
              <span className="text-slate-500 hidden lg:inline">
                (14K: <strong className="text-slate-800 font-semibold">${goldGram14k.toFixed(2)}/g</strong> · 10K: <strong className="text-slate-800 font-semibold">${goldGram10k.toFixed(2)}/g</strong>)
              </span>
            </div>

            {/* Silver */}
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-slate-600 text-[11px]">SILVER</span>
              <span className="font-bold text-slate-900">${(spotPrices.silverPerOz ?? 52).toFixed(2)}/oz</span>
              <span className="text-slate-500 hidden sm:inline">(${silverGram.toFixed(2)}/g)</span>
            </div>

            {/* Platinum */}
            <div className="hidden md:flex items-center gap-1.5">
              <span className="font-sans font-bold text-slate-600 text-[11px]">PLATINUM</span>
              <span className="font-bold text-slate-900">${(spotPrices.platinumPerOz ?? 1545).toFixed(2)}/oz</span>
              <span className="text-slate-500 hidden lg:inline">(${platGram.toFixed(2)}/g)</span>
            </div>

            {/* Brass */}
            <div className="hidden xl:flex items-center gap-1.5">
              <span className="font-sans font-bold text-slate-500 text-[11px]">BRASS</span>
              <span className="font-bold text-slate-900">${(spotPrices.brassPerGram ?? 0.08).toFixed(2)}/g</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs tabular-nums">
            {/* Natural Diamond */}
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-cyan-800 text-[11px]">NAT DIAMOND</span>
              <span className="font-bold text-slate-900">${spotPrices.naturalDiamondPerCarat ?? 420}/ct</span>
              <span className="text-slate-500 hidden md:inline">
                (~${Math.round((spotPrices.naturalDiamondPerCarat ?? 420) / 12)}/stone)
              </span>
            </div>

            {/* Lab-Grown */}
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-emerald-800 text-[11px]">LAB GROWN</span>
              <span className="font-bold text-slate-900">${spotPrices.labDiamondPerCarat ?? 110}/ct</span>
              <span className="text-slate-500 hidden md:inline">
                (~${((spotPrices.labDiamondPerCarat ?? 110) / 10).toFixed(1)}/stone)
              </span>
            </div>

            {/* Moissanite */}
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-violet-800 text-[11px]">MOISSANITE</span>
              <span className="font-bold text-slate-900">${spotPrices.moissanitePerCarat ?? 25}/ct</span>
            </div>

            {/* 5A CZ */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="font-sans font-bold text-slate-600 text-[11px]">5A CZ</span>
              <span className="font-bold text-slate-900">${(spotPrices.czPerPiece ?? 0.07).toFixed(2)}/pc</span>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="hidden sm:inline text-slate-400">
            {spotPrices.lastUpdated}
          </span>

          <button
            type="button"
            onClick={handleSyncLive}
            disabled={isSyncing}
            className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold px-2 py-1 rounded-md hover:bg-white transition-colors disabled:opacity-50"
            title="Refresh Live Global Spot Feed"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isSyncing ? 'Pulling...' : 'Sync Feed'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-amber-800 hover:text-amber-950 font-bold px-2 py-1 rounded-md hover:bg-white transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Refiner Sheet</span>
          </button>
        </div>
      </div>

      {/* Editing Drawer Inline */}
      {isEditing && (
        <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              Workshop Refiner Sheet &amp; Benchmark Overrides
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3.5 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Apply Sheet</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Precious Metals */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-800 block">Precious Metals ($/oz):</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Gold Spot:</span>
                <input
                  type="number"
                  step="0.5"
                  value={goldVal ?? ''}
                  onChange={(e) => setGoldVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-amber-700 font-mono text-right font-bold"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Silver Spot:</span>
                <input
                  type="number"
                  step="0.1"
                  value={silverVal ?? ''}
                  onChange={(e) => setSilverVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono text-right font-bold"
                />
              </div>
            </div>

            {/* Platinum & Brass */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-800 block">Platinum &amp; Brass:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Platinum ($/oz):</span>
                <input
                  type="number"
                  step="1.0"
                  value={platVal ?? ''}
                  onChange={(e) => setPlatVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono text-right font-bold"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Brass ($/g):</span>
                <input
                  type="number"
                  step="0.01"
                  value={brassVal ?? ''}
                  onChange={(e) => setBrassVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono text-right font-bold"
                />
              </div>
            </div>

            {/* Diamonds Benchmark */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-800 block">Diamonds Benchmark ($/ct):</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Natural Earth:</span>
                <input
                  type="number"
                  step="5"
                  value={natDiaVal ?? ''}
                  onChange={(e) => setNatDiaVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-cyan-700 font-mono text-right font-bold"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Lab-Grown:</span>
                <input
                  type="number"
                  step="5"
                  value={labDiaVal ?? ''}
                  onChange={(e) => setLabDiaVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-emerald-700 font-mono text-right font-bold"
                />
              </div>
            </div>

            {/* Moissanite & CZ */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-800 block">Moissanite &amp; CZ:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">Moissanite ($/ct):</span>
                <input
                  type="number"
                  step="1"
                  value={moissVal ?? ''}
                  onChange={(e) => setMoissVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-violet-700 font-mono text-right font-bold"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px]">5A CZ ($/pc):</span>
                <input
                  type="number"
                  step="0.01"
                  value={czVal ?? ''}
                  onChange={(e) => setCzVal(e.target.value)}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono text-right font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
