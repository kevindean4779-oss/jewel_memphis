// Fixed constants for the custom order app. Owner-editable values live in config.ts.

export const TROY_OZ_GRAMS = 31.1035;

export const MAKING_NOTE = 'Making fee is set in owner settings.';

export const LEAD = { base: 14, queue: 3, cadPicture: 3 }; // days

export type MetalFamily = 'gold' | 'silver';

// Purity factors as published in the vendor's jewelry pricing calculator.
// The metals this shop quotes: 18K, 14K and 10K gold, and sterling silver.
export const KARATS = {
  '18K': { label: '18K gold', family: 'gold', purity: 0.75, density: 15.5 },
  '14K': { label: '14K gold', family: 'gold', purity: 0.5833, density: 13.1 },
  '10K': { label: '10K gold', family: 'gold', purity: 0.4167, density: 11.6 },
  S925: { label: 'Sterling silver 925', family: 'silver', purity: 0.925, density: 10.36 },
} as const;
export type Metal = keyof typeof KARATS;
export const METALS = Object.keys(KARATS) as Metal[];

// The stones this shop sets: natural diamond, lab-grown diamond, moissanite and cubic zirconia.
export const STONES = {
  natural: { label: 'Natural diamond', name: 'Natural diamonds', perCt: 600, carat: 0.2 },
  lab: { label: 'Lab-grown diamond', name: 'Lab-grown diamonds', perCt: 240, carat: 0.2 },
  moissanite: { label: 'Moissanite', name: 'Moissanite', perCt: 120, carat: 0.2 },
  cz: { label: 'Cubic zirconia', name: 'Cubic zirconia', perCt: 20, carat: 0.2 },
};
export type StoneKey = keyof typeof STONES;
export const STONE_KEYS = Object.keys(STONES) as StoneKey[];

export const OCCASIONS = ['Wedding', 'Festival', 'Gift', 'Everyday'];

export const METHODS = {
  picture: { title: 'Picture or CAD', text: 'Take a photo. Size is estimated from the picture.', icon: 'camera' as const },
  dims: { title: 'Dimensions and materials', text: 'Enter width, height and depth, then choose metal and stones.', icon: 'ruler' as const },
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
