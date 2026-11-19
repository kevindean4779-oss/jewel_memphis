import type { Metal, Mode, StoneKey } from './data';

// One stone type and size needed for this ornament, priced like the vendor calculator.
export interface StoneLine {
  id: string;
  type: StoneKey;
  sizeMm: number;
  qty: number;
  perCt: number; // $ per carat
  setting: number; // $ per stone
}

// A flat charge, such as plating or CAD design time.
export interface ServiceLine {
  id: string;
  name: string;
  cost: number;
}

export interface Dims {
  w: number;
  h: number;
  d: number;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  ornament: string;
  occasion: string;
  needed: string;
  notes: string;
}

export interface Checks {
  details: boolean;
  design: boolean;
  price: boolean;
  deposit: boolean;
}
export type CheckKey = keyof Checks;

export interface OrderState {
  step: number;
  orderNo: string;
  cust: Customer;
  mode: Mode;
  photo: boolean;
  dims: Dims;
  metal: Metal;
  weight: number | null; // finished grams; null = estimated from the size
  waste: number; // waste %, added to the weight
  labour: number; // casting cost $ per gram
  makingDesign: number; // flat making charges for this ornament, $
  makingWax: number;
  makingPolish: number;
  markup: number; // quote = production cost × markup
  stones: StoneLine[];
  services: ServiceLine[];
  budget: number | null;
  showBudget: boolean;
  exact: boolean; // true once the CAD model is generated for the current size
  depositAmount: number | null; // dollars paid now; null = not chosen yet (uses the default %)
  checks: Checks;
  sent: boolean;
  restored: boolean;
}
