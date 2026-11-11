// Fixed constants for the custom order app. Owner-editable values live in config.ts.

export const TROY_OZ_GRAMS = 31.1035;

export const MAKING_NOTE = 'Making fee is set in owner settings.';

export const LEAD = { base: 14, queue: 3, cadPicture: 3, platinum: 7, premiumStone: 2 }; // days

export type MetalFamily = 'gold' | 'platinum' | 'silver';

export const KARATS = {
  '22K': { label: '22K gold', family: 'gold', purity: 22 / 24, density: 17.7 },
  '18K': { label: '18K gold', family: 'gold', purity: 18 / 24, density: 15.5 },
  '14K': { label: '14K gold', family: 'gold', purity: 14 / 24, density: 13.1 },
  '10K': { label: '10K gold', family: 'gold', purity: 10 / 24, density: 11.6 },
  PT950: { label: 'Platinum 950', family: 'platinum', purity: 0.95, density: 20.4 },
  S925: { label: 'Sterling silver 925', family: 'silver', purity: 0.925, density: 10.36 },
} as const;
export type Metal = keyof typeof KARATS;
export const METALS = Object.keys(KARATS) as Metal[];

export const STONES = {
  natural: { label: 'Natural · standard', name: 'Natural diamonds, standard quality', perCt: 600, carat: 0.2 },
  naturalP: { label: 'Natural · premium', name: 'Natural diamonds, premium quality', perCt: 900, carat: 0.2 },
  lab: { label: 'Lab-grown', name: 'Lab-grown diamonds', perCt: 240, carat: 0.2 },
  monzonite: { label: 'Monzonite', name: 'Monzonite', perCt: 120, carat: 0.2 },
  cz: { label: 'Cubic zirconia', name: 'Cubic zirconia', perCt: 20, carat: 0.2 },
};
export type StoneKey = keyof typeof STONES;
export const STONE_KEYS = Object.keys(STONES) as StoneKey[];

export const OCCASIONS = ['Wedding', 'Festival', 'Gift', 'Everyday'];

export const METHODS = {
  picture: { title: 'Picture or CAD', text: 'Take a photo. Size is estimated from the picture.', icon: '◉' },
  dims: { title: 'Dimensions and materials', text: 'Enter width, height and depth, then choose metal and stones.', icon: '▭' },
};
export type Mode = keyof typeof METHODS;

export const STEP_NAMES = ['Customer', 'Design', 'Estimate', 'CAD', 'Confirm'];

// CAD constants (mm). Owner to confirm openwork per design.
export const CAD = {
  tray: [88, 88, 125] as const, // max width/height and depth for the print and cast tray
  minWall: 0.8, // minimum casting wall / feature, mm
  stoneDia: 3.7, // approx. diameter of a 0.20 ct round stone, mm
  openwork: 0.3634, // share of the outer envelope removed by openwork (per design)
};

export const DRAFT_KEY = 'custom-order-draft';
