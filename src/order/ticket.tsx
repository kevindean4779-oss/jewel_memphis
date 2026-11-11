import { KARATS, STONES } from './data';
import { price, readyDate } from './pricing';
import { useMarket } from './market';
import { fmtDate } from './format';
import type { OrderState } from './types';

// Workshop job ticket. Hidden on screen; printed through the browser's print dialog.
// It carries no retail prices: the bench needs metal, stones and dates.
export function WorkshopTicket({ s }: { s: OrderState }) {
  const { mk } = useMarket();
  const p = price(mk, s.dims, s.metal, s.stone, s.mode, s.exact);
  const ready = readyDate(s.metal, s.stone, s.mode);
  const needed = s.cust.needed ? new Date(s.cust.needed + 'T00:00') : null;
  return (
    <div className="print-ticket">
      <h2>Workshop ticket · {s.orderNo}</h2>
      <table>
        <tbody>
          <tr><th>Customer</th><td>{s.cust.name} · {s.cust.phone}</td></tr>
          <tr><th>Ornament</th><td>{s.cust.ornament}{s.cust.occasion ? ` · ${s.cust.occasion}` : ''}</td></tr>
          <tr><th>Size (W × H × D)</th><td>{s.dims.w} × {s.dims.h} × {s.dims.d} mm {s.exact ? '(CAD exact)' : '(estimate)'}</td></tr>
          <tr><th>Metal</th><td>{KARATS[s.metal].label}, {p.grams.toFixed(2)} g</td></tr>
          <tr><th>Stones</th><td>{STONES[s.stone].name}, 0.20 ct</td></tr>
          <tr><th>Ready by</th><td>{fmtDate(ready)}{needed ? ` · needed by ${fmtDate(needed)}` : ''}</td></tr>
          <tr><th>Deposit</th><td>{s.deposit}% collected before work starts</td></tr>
          <tr><th>Notes</th><td>{s.cust.notes || '—'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
