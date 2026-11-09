import React, { useState } from 'react';
import { CustomPieceConfig, CostBreakdown, METAL_LABELS, STONE_LABELS, BACKPLATE_LABELS } from '../types/jewelry';
import { Eye, ShieldCheck, Scale, Sparkles, Layers, RotateCcw } from 'lucide-react';

interface Props {
  config: CustomPieceConfig;
  cost: CostBreakdown;
  onUpdateConfig: (updates: Partial<CustomPieceConfig>) => void;
}

export const VisualCharmPreview: React.FC<Props> = ({ config, cost, onUpdateConfig }) => {
  const [viewMode, setViewMode] = useState<'front' | 'back' | 'scale'>('front');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Metal color styling
  const metalGradients: Record<string, { bg: string; border: string; glow: string; text: string }> = {
    yellow: {
      bg: 'linear-gradient(135deg, #fef08a 0%, #eab308 35%, #ca8a04 70%, #a16207 100%)',
      border: '#fde047',
      glow: 'rgba(234, 179, 8, 0.35)',
      text: 'text-amber-300',
    },
    white: {
      bg: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 35%, #94a3b8 70%, #64748b 100%)',
      border: '#e2e8f0',
      glow: 'rgba(203, 213, 225, 0.4)',
      text: 'text-slate-200',
    },
    rose: {
      bg: 'linear-gradient(135deg, #ffe4e6 0%, #fda4af 35%, #f43f5e 70%, #be123c 100%)',
      border: '#fecdd3',
      glow: 'rgba(251, 113, 133, 0.35)',
      text: 'text-rose-300',
    },
    two_tone: {
      bg: 'linear-gradient(135deg, #fef08a 0%, #cbd5e1 45%, #ca8a04 70%, #94a3b8 100%)',
      border: '#fde047',
      glow: 'rgba(234, 179, 8, 0.3)',
      text: 'text-amber-200',
    },
  };

  const currentTheme = metalGradients[config.metalColor] || metalGradients.yellow;

  // Visual aspect ratio calculation for preview container
  const maxDim = Math.max(config.heightInches, config.widthInches);
  const visualScale = Math.min(1.8, Math.max(0.65, (maxDim / 2.0))) * zoomLevel;

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div 
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: currentTheme.border }}
      />
      
      {/* Top Controls Strip */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Interactive Blueprint
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-xs font-medium text-amber-400">
            {config.heightInches}&quot; × {config.widthInches}&quot;
          </span>
        </div>

        {/* View mode segmented buttons */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('front')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'front' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Front Face
          </button>
          <button
            type="button"
            onClick={() => setViewMode('back')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'back' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Backplate
          </button>
          <button
            type="button"
            onClick={() => setViewMode('scale')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'scale' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Scale 1:1
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative min-h-[300px] sm:min-h-[340px] flex items-center justify-center py-6 px-4">
        {viewMode === 'scale' ? (
          /* Real-World Reference Scale comparison (US Quarter & Credit Card) */
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 w-full animate-fadeIn">
            {/* US Quarter Coin (Exact 1.0 inch / 24.26mm standard) */}
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-20 h-20 rounded-full border-2 border-neutral-500/60 bg-gradient-to-br from-neutral-300 via-neutral-400 to-neutral-500 flex flex-col items-center justify-center shadow-lg text-neutral-800 text-[10px] font-bold text-center leading-tight p-2 select-none"
              >
                <span>US QUARTER</span>
                <span className="text-[9px] font-mono font-normal">1.00&quot; (24.3mm)</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-medium">Standard Reference Coin</span>
            </div>

            {/* Custom Charm Proportional Silhouette */}
            <div className="flex flex-col items-center gap-2">
              <div 
                className="relative rounded-2xl flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border border-amber-400/30"
                style={{
                  width: `${Math.round(config.widthInches * 80)}px`,
                  height: `${Math.round(config.heightInches * 80)}px`,
                  background: currentTheme.bg,
                  boxShadow: `0 15px 35px -5px ${currentTheme.glow}`,
                }}
              >
                {/* Bail Top */}
                <div className="absolute -top-4 w-7 h-5 rounded-t-lg bg-neutral-900 border-2 border-amber-300/80" />
                
                {/* Visual Face */}
                <div className="text-center p-2 bg-neutral-950/70 rounded-xl backdrop-blur-xs border border-white/10 m-1.5 flex flex-col items-center justify-center h-[calc(100%-12px)] w-[calc(100%-12px)]">
                  <span className="text-xs font-bold text-amber-200">
                    {config.heightInches}&quot; × {config.widthInches}&quot;
                  </span>
                  <span className="text-[10px] font-mono text-neutral-300">
                    ~{cost.calculatedGrams}g {config.metal.replace('gold_', '').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-medium">Your Custom Piece</span>
            </div>
          </div>
        ) : viewMode === 'back' ? (
          /* Backplate & Cage Structure Inspection */
          <div className="flex flex-col items-center justify-center animate-fadeIn relative">
            <div 
              className="relative rounded-2xl flex flex-col items-center justify-center shadow-2xl border-2 transition-all duration-300 overflow-hidden"
              style={{
                width: `${Math.round(config.widthInches * 105 * visualScale)}px`,
                height: `${Math.round(config.heightInches * 105 * visualScale)}px`,
                background: config.metalColor === 'white' ? '#334155' : '#451a03',
                borderColor: currentTheme.border,
                boxShadow: `0 20px 40px -10px ${currentTheme.glow}`,
              }}
            >
              {/* Backplate pattern based on selection */}
              {config.backplate === 'open' && (
                <div className="w-full h-full bg-neutral-950/90 flex flex-col items-center justify-center p-4 border border-dashed border-neutral-700/60 rounded-xl m-2">
                  <Layers className="w-8 h-8 text-neutral-600 mb-1" />
                  <span className="text-xs font-semibold text-neutral-400">Open Recessed Cavity</span>
                  <span className="text-[10px] text-neutral-500 text-center">Lightweight hollow rear relief</span>
                </div>
              )}

              {config.backplate === 'mesh_cage' && (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center p-4 rounded-xl m-2 relative overflow-hidden"
                  style={{
                    backgroundImage: `radial-gradient(circle, ${currentTheme.border} 25%, transparent 26%), radial-gradient(circle, ${currentTheme.border} 25%, transparent 26%)`,
                    backgroundPosition: '0 0, 8px 8px',
                    backgroundSize: '16px 16px',
                    backgroundColor: 'rgba(10, 10, 10, 0.85)',
                  }}
                >
                  <div className="bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/40 text-center">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                      Honeycomb Breath Cage
                    </span>
                    <span className="text-[10px] text-neutral-400">Protects stone culets &amp; adds rigid support</span>
                  </div>
                </div>
              )}

              {config.backplate === 'solid_plate' && (
                <div className="w-full h-full bg-gradient-to-tr from-amber-600/40 via-amber-400/20 to-neutral-900 flex flex-col items-center justify-center p-4 rounded-xl m-2 border border-amber-300/40">
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">
                    Mirror Solid Backplate
                  </span>
                  <span className="text-[10px] text-amber-300/80 text-center mt-1">High Polish Heavyweight Heft</span>
                </div>
              )}

              {config.backplate === 'engraved_solid' && (
                <div className="w-full h-full bg-gradient-to-tr from-amber-600/40 via-amber-400/20 to-neutral-900 flex flex-col items-center justify-center p-4 rounded-xl m-2 border border-amber-300/40 text-center">
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">
                    Laser Engraved Solid Plate
                  </span>
                  <p className="font-serif italic text-sm text-amber-100 mt-2 px-2 border-b border-amber-400/30 pb-1">
                    &quot;Forever In My Heart 2026&quot;
                  </p>
                  <span className="text-[9px] text-neutral-400 mt-1">Deep fiber laser engraving hallmark</span>
                </div>
              )}

              {config.backplate === 'micro_pave_back' && (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center p-4 rounded-xl m-2 relative overflow-hidden"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1.5px, transparent 1.5px)',
                    backgroundSize: '8px 8px',
                    backgroundColor: '#171717',
                  }}
                >
                  <div className="bg-neutral-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/50 text-center">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                      Dual-Sided Bust Down
                    </span>
                    <span className="text-[10px] text-neutral-300">Rear pavé stones fully handset</span>
                  </div>
                </div>
              )}
            </div>
            <span className="text-xs text-neutral-400 mt-3 font-medium">
              Rear Structure: {BACKPLATE_LABELS[config.backplate]}
            </span>
          </div>
        ) : (
          /* Front Realistic Metal & Pave Rendering */
          <div className="flex flex-col items-center justify-center animate-fadeIn relative">
            {/* Bail Top */}
            <div 
              className={`rounded-t-xl border-t-2 border-x-2 transition-all duration-300 flex items-center justify-center relative z-20 ${
                config.bail === 'iced_bail' ? 'border-amber-300' : 'border-neutral-700'
              }`}
              style={{
                width: config.bail === 'large_miami' ? '46px' : config.bail === 'medium_cuban' ? '36px' : '28px',
                height: config.bail === 'large_miami' ? '28px' : config.bail === 'medium_cuban' ? '22px' : '18px',
                background: currentTheme.bg,
                marginBottom: '-4px',
              }}
            >
              <div className="w-3 h-2 rounded-full bg-neutral-950/80 border border-white/20" />
            </div>

            {/* Custom Charm Silhouette Frame */}
            <div 
              className="relative rounded-2xl flex flex-col items-center justify-center shadow-2xl transition-all duration-300 overflow-hidden p-3 border-2"
              style={{
                width: `${Math.round(config.widthInches * 105 * visualScale)}px`,
                height: `${Math.round(config.heightInches * 105 * visualScale)}px`,
                background: currentTheme.bg,
                borderColor: currentTheme.border,
                boxShadow: `0 25px 50px -12px ${currentTheme.glow}`,
              }}
            >
              {/* Internal recessed body with pavé gem mesh if stones selected */}
              <div 
                className="w-full h-full rounded-xl flex flex-col items-center justify-center relative overflow-hidden transition-all"
                style={{
                  background: config.stoneCoverage === 'none' 
                    ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 70%)'
                    : '#0a0a0a',
                  backgroundImage: config.stoneCoverage !== 'none'
                    ? `radial-gradient(circle, ${
                        config.stoneType === 'cz' 
                          ? 'rgba(255,255,255,0.85)' 
                          : config.stoneType === 'moissanite' 
                          ? '#a5f3fc' 
                          : '#ffffff'
                      } 2px, transparent 2px)`
                    : undefined,
                  backgroundSize: config.stoneCoverage !== 'none' ? '9px 9px' : undefined,
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
                }}
              >
                {/* Centered Monogram / Custom Motif preview */}
                <div className="relative z-10 text-center px-3 py-2 bg-neutral-950/75 backdrop-blur-xs rounded-xl border border-white/10 flex flex-col items-center">
                  <span className="font-display text-lg sm:text-2xl font-bold tracking-wider text-white drop-shadow-md">
                    {config.title || "CUSTOM"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {config.stoneCoverage !== 'none' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-200">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-300 animate-pulse" />
                        {cost.estimatedStoneCount} Stones ({cost.estimatedCaratWeight} ctw)
                      </span>
                    )}
                  </div>
                </div>

                {/* Shimmer light beam across the metal */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-tr from-transparent via-white to-transparent transform -translate-x-full hover:translate-x-full transition-transform duration-1000"
                />
              </div>
            </div>

            {/* Spec caption below visualizer */}
            <div className="text-center mt-3">
              <span className="text-xs font-semibold text-neutral-200 block">
                {METAL_LABELS[config.metal]} · {config.heightInches}&quot; × {config.widthInches}&quot;
              </span>
              <span className="text-[11px] text-neutral-400">
                Estimated Finished Weight: <strong className="text-amber-400 font-mono">~{cost.calculatedGrams} grams</strong>
                {cost.pureMetalGrams > 0 && ` (${cost.pureMetalGrams}g pure metal)`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Visual Tool Strip */}
      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span 
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: currentTheme.border }}
            />
            {config.metalColor.toUpperCase()} FINISH
          </span>
          <span>·</span>
          <span>DEPTH: {config.depthMm}mm</span>
        </div>

        {/* Quick Zoom slider */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500">Zoom</span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.7, Math.round((z - 0.15) * 100) / 100))}
            className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center font-bold text-xs"
          >
            -
          </button>
          <span className="font-mono text-[10px] text-neutral-300 w-8 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.4, Math.round((z + 0.15) * 100) / 100))}
            className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center font-bold text-xs"
          >
            +
          </button>
          <button
            type="button"
            title="Reset Zoom"
            onClick={() => setZoomLevel(1)}
            className="text-neutral-500 hover:text-neutral-300 ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
