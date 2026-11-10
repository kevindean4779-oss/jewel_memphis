import type { Metal, Mode, StoneKey } from './data';

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
  stone: StoneKey;
  orig: { metal: Metal; stone: StoneKey } | null;
  budget: number | null;
  fitOnly: boolean;
  showBudget: boolean;
  exact: boolean; // true once the CAD model is generated for the current size
  deposit: number;
  checks: Checks;
  sent: boolean;
  restored: boolean;
}
