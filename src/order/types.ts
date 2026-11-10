import type { Metal, Mode, StoneKey } from './data';
import type { Spot } from './rates';

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
  id: string; // UUID; the database row key, so a resend never creates a duplicate row
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
  // Metal rates frozen when the customer agrees the price, so a rate refresh
  // cannot change an agreed quote. Cleared when the design or price changes.
  lockedSpot: Spot | null;
  sent: boolean;
  sentAt: string | null; // ISO
  restored: boolean;
}
