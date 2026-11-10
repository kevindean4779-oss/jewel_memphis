// Store constants. Metal prices come live from /api/rates (see src/order/rates.ts);
// stone prices and lead times below are set by the store.

export const TROY_OZ_GRAMS = 31.1035;

export const STORE = {
  taxRate: 0.0825,
  taxLabel: 'Sales tax (8.25%, store location)',
  deposits: [25, 50, 100],
  defaultDeposit: 50,
};

// Allowed outer size per side, in mm. Anything outside is treated as a typing error.
export const DIM_LIMITS = { min: 0.5, max: 200 };
// Maximum lengths for text fields (also enforced by the server and the database).
export const TEXT_LIMITS = { name: 120, phone: 30, email: 254, ornament: 120, notes: 1000 };

export const MAKING = 80; // placeholder workshop labour; replace with labour table
export const RANGE = { picture: 0.1, dims: 0.15 }; // +/- volume tolerance before CAD is generated
export const LEAD = { base: 14, queue: 3, cadPicture: 3, platinum: 7, naturalStone: 2 }; // days

// spot: which live spot price the alloy is priced from. purity: share of pure metal by weight.
export const KARATS = {
  '14K': { label: '14K gold', spot: 'gold', purity: 14 / 24, density: 13.1 },
  '10K': { label: '10K gold', spot: 'gold', purity: 10 / 24, density: 11.6 },
  S925: { label: '925 sterling silver', spot: 'silver', purity: 0.925, density: 10.36 },
  PT950: { label: 'Platinum 950', spot: 'platinum', purity: 0.95, density: 20.4 },
} as const;
export type Metal = keyof typeof KARATS;
export const METALS = Object.keys(KARATS) as Metal[];

// Stone cost per carat (USD, melee). There is no public live feed for stones:
// update these from supplier invoices.
export const STONES = {
  natural: { label: 'Natural diamond', name: 'Natural diamonds', perCt: 600, carat: 0.2 },
  lab: { label: 'Lab-grown diamond', name: 'Lab-grown diamonds', perCt: 150, carat: 0.2 },
  moissanite: { label: 'Moissanite', name: 'Moissanite', perCt: 60, carat: 0.2 },
  cz5a: { label: '5A cubic zirconia', name: '5A cubic zirconia', perCt: 10, carat: 0.2 },
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

export const DEFAULT_METAL: Metal = '14K';
export const DEFAULT_STONE: StoneKey = 'natural';

export const DRAFT_KEY = 'custom-order-draft';
