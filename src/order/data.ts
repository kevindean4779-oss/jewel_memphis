// Constants ported from the Custom Order tablet prototype.
// Rates and lead times are sample values until a live feed and labour table are connected.

export const TODAY = new Date(2026, 10, 10);
export const RATES = { gold24Gram: 130.44, platinumOz: 1459.3, time: '12:04 PM ET' };
export const TROY_OZ_GRAMS = 31.1035;

export const STORE = {
  taxRate: 0.0825,
  taxLabel: 'Sales tax (8.25%, store location)',
  deposits: [25, 50, 100],
  defaultDeposit: 50,
};

export const MAKING = 80; // placeholder workshop labour; replace with labour table
export const RANGE = { picture: 0.1, dims: 0.15 }; // +/- volume tolerance before CAD is generated
export const LEAD = { base: 14, queue: 3, cadPicture: 3, platinum: 7, premiumStone: 2 }; // days

export const KARATS = {
  '22K': { label: '22K gold', purity: 22 / 24, density: 17.7 },
  '18K': { label: '18K gold', purity: 18 / 24, density: 15.5 },
  '14K': { label: '14K gold', purity: 14 / 24, density: 13.1 },
  '10K': { label: '10K gold', purity: 10 / 24, density: 11.6 },
  PT950: { label: 'Platinum 950', purity: 0.95, density: 20.4 },
};
export type Metal = keyof typeof KARATS;
export const METALS = Object.keys(KARATS) as Metal[];

export const STONES = {
  natural: { label: 'Natural · standard', name: 'Natural diamonds, standard quality', perCt: 600, carat: 0.2 },
  naturalP: { label: 'Natural · premium', name: 'Natural diamonds, premium quality', perCt: 900, carat: 0.2 },
  lab: { label: 'Lab-grown', name: 'Lab-grown diamonds', perCt: 240, carat: 0.2 },
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
