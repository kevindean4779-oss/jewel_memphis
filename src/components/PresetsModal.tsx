import React from 'react';
import { CustomPieceConfig, MetalType, StoneType, BackplateType, BailSize, Solidness } from '../types/jewelry';
import { ArrowRight, Sparkles, Gem } from 'lucide-react';

interface PresetItem {
  id: string;
  title: string;
  description: string;
  image: string;
  config: Partial<CustomPieceConfig>;
  typicalTurnaround: string;
}

interface Props {
  onSelectPreset: (config: Partial<CustomPieceConfig>) => void;
}

export const PresetsModal: React.FC<Props> = ({ onSelectPreset }) => {
  const presets: PresetItem[] = [
    {
      id: 'custom_initial_pendant',
      title: 'Iced-Out Letter / Initials Pendant',
      description: 'Handcrafted custom initials with 3D baguette accents, micropave halo, and luxury honeycomb breathing backplate.',
      image: '/src/assets/images/jewelry_custom_pendant_1794179774215.jpg',
      typicalTurnaround: '7-10 Days',
      config: {
        title: "INITIAL 'M'",
        heightInches: 1.75,
        widthInches: 1.75,
        depthMm: 4.5,
        metal: 'gold_10k',
        metalColor: 'yellow',
        solidness: 'semi_solid',
        backplate: 'mesh_cage',
        bail: 'medium_cuban',
        stoneType: 'moissanite',
        stoneCoverage: 'full_bust_down',
        weightOverrideGrams: undefined,
      },
    },
    {
      id: 'memory_picture_medallion',
      title: 'Memory Picture / Photo Medallion',
      description: 'Heirloom round medallion with photo bezel, rope-edge border, micropave diamond circle, and solid engraved back.',
      image: '/src/assets/images/jewelry_memory_medallion_1794179774188.jpg',
      typicalTurnaround: '5-7 Days',
      config: {
        title: 'PHOTO MEDALLION',
        heightInches: 2.0,
        widthInches: 2.0,
        depthMm: 3.5,
        metal: 'gold_14k',
        metalColor: 'yellow',
        solidness: 'solid',
        backplate: 'engraved_solid',
        bail: 'medium_cuban',
        stoneType: 'moissanite',
        stoneCoverage: 'half_iced',
        weightOverrideGrams: undefined,
      },
    },
    {
      id: 'bench_craftsmanship_charm',
      title: 'Master Jeweler 3D Logo / Icon Charm',
      description: 'High-relief 3D sculpted company logo or family crest with mirror high-polish, precision bail, and solid heft.',
      image: '/src/assets/images/jewelry_bench_craftsmanship_1794179774321.jpg',
      typicalTurnaround: '8-12 Days',
      config: {
        title: '3D LOGO CREST',
        heightInches: 2.25,
        widthInches: 1.75,
        depthMm: 4.5,
        metal: 'gold_10k',
        metalColor: 'yellow',
        solidness: 'solid',
        backplate: 'solid_plate',
        bail: 'large_miami',
        stoneType: 'cz',
        stoneCoverage: 'accents',
        weightOverrideGrams: undefined,
      },
    },
    {
      id: 'silver_street_bustdown',
      title: 'Solid Silver 925 + VVS Bust Down',
      description: 'Heavyweight sterling silver base encrusted with VVS1 D-color Moissanites that pass thermal diamond testers.',
      image: '/src/assets/images/jewelry_custom_pendant_1794179774215.jpg',
      typicalTurnaround: '7 Days',
      config: {
        title: 'SILVER VVS CHARM',
        heightInches: 2.5,
        widthInches: 2.0,
        depthMm: 4.5,
        metal: 'silver_925',
        metalColor: 'white',
        solidness: 'solid',
        backplate: 'mesh_cage',
        bail: 'large_miami',
        stoneType: 'moissanite',
        stoneCoverage: 'full_bust_down',
        weightOverrideGrams: undefined,
      },
    },
  ];

  return (
    <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl">
      <div className="pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Gem className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-white font-display">
            Showroom Popular Presets
          </h2>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          Select any popular custom style to instantly populate all parameters into the quoter and customize on the fly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="bg-neutral-950 rounded-xl border border-neutral-800 hover:border-amber-500/50 overflow-hidden transition-all group flex flex-col justify-between"
          >
            <div>
              {/* Product Photo */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-900">
                <img
                  src={preset.image}
                  alt={preset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-white drop-shadow">
                    {preset.config.heightInches}&quot; × {preset.config.widthInches}&quot; · {preset.config.metal?.toUpperCase().replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 bg-neutral-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                    {preset.typicalTurnaround}
                  </span>
                </div>
              </div>

              {/* Text Description */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {preset.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>
            </div>

            {/* Load Button */}
            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => onSelectPreset(preset.config)}
                className="w-full py-2.5 px-4 rounded-lg bg-neutral-900 group-hover:bg-amber-500 text-neutral-200 group-hover:text-neutral-950 text-xs font-bold border border-neutral-800 group-hover:border-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                <span>Load Into Quoter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
