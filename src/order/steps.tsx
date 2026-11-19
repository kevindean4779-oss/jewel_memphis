import { Icon } from '../ui/Icon';
import { useEffect, useState, type ChangeEvent } from 'react';
import { saveOrderRemote } from './db';
import { KARATS, METALS, METHODS, OCCASIONS, STONE_KEYS, STONES, type Mode } from './data';
import type { StoneKey } from './data';
import { allCadOk, cadRules, custErrors, custOk, depositDue, dimsOk, parseAmount, percentOf, sizeErrors, type CustErrors, type CustKey } from './pricing';
import { buildQuote, readyDate, stoneCost } from './quote';
import { newId, newOrderNo, termsFromConfig } from './state';
import { taxLabel } from './config';
import { useMarket } from './market';
import { fmtDate, isoOf, money, parseISO } from './format';
import { CadViews } from './CadViews';
import { focusFirstInvalid, Kv, NumField, type StepProps } from './shared';

/* ============================ STEP 1: CUSTOMER ============================ */
const REQUIRED_LABEL: Record<'name' | 'phone' | 'ornament', string> = {
  name: 'Full name',
  phone: 'Phone',
  ornament: 'Ornament name',
};

export function CustomerStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const [tried, setTried] = useState(false);
  const c = s.cust;
  const errs: CustErrors = custErrors(c);
  const ready = readyDate(s.metal, s.stones, s.mode);
  const set = (key: keyof typeof c) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    dispatch({ type: 'cust', key, value: e.target.value });

  // Required fields show their message after the first Continue. An email shows as soon as it is wrong.
  const shown = (k: CustKey) => (k === 'email' ? errs.email : tried ? errs[k] : undefined);
  const missingRequired = (['name', 'phone', 'ornament'] as const).filter(k => errs[k]);
  const neededDate = c.needed ? parseISO(c.needed) : null;
  const neededEarly = Boolean(neededDate && neededDate < ready);

  const next = () => {
    setTried(true);
    if (Object.keys(errs).length > 0) {
      focusFirstInvalid();
      return;
    }
    dispatch({ type: 'go', step: 1 });
  };

  const bannerText = missingRequired.length
    ? `Fill in the required fields marked *: ${missingRequired.map(k => REQUIRED_LABEL[k]).join(', ')}.`
    : 'Check the email address.';

  return (
    <>
      {s.restored && (
        <div className="banner ok"><span className="ic"><Icon name="check" size={14} /></span><span>Draft restored. Your earlier entries are still here.</span></div>
      )}
      {tried && Object.keys(errs).length > 0 && (
        <div className="banner warn" role="alert"><span className="ic"><Icon name="alert" size={14} /></span><span>{bannerText}</span></div>
      )}
      <div className="grid2">
        <section className="card">
          <div className="sec">Customer <span className="hint"><span className="req">*</span> Required</span></div>
          <div className="fields">
            <label className="field">
              <span>Full name<span className="req" aria-hidden="true">*</span></span>
              <input id="f-name" aria-required="true" aria-invalid={shown('name') ? 'true' : undefined} aria-describedby={shown('name') ? 'f-name-err' : undefined} value={c.name} placeholder="e.g. Meera Sharma" onChange={set('name')} />
              {shown('name') && <small id="f-name-err" className="field-error">{shown('name')}</small>}
            </label>
            <label className="field">
              <span>Phone<span className="req" aria-hidden="true">*</span></span>
              <input id="f-phone" aria-required="true" inputMode="tel" aria-invalid={shown('phone') ? 'true' : undefined} aria-describedby={shown('phone') ? 'f-phone-err' : undefined} value={c.phone} placeholder="(555) 000-0000" onChange={set('phone')} />
              {shown('phone') && <small id="f-phone-err" className="field-error">{shown('phone')}</small>}
            </label>
            <label className="field full">
              <span>Email<span className="opt">optional</span></span>
              <input type="email" id="f-email" aria-invalid={shown('email') ? 'true' : undefined} aria-describedby={shown('email') ? 'f-email-err' : undefined} value={c.email} placeholder="name@example.com" onChange={set('email')} />
              {shown('email') && <small id="f-email-err" className="field-error">{shown('email')}</small>}
            </label>
          </div>
        </section>
        <section className="card">
          <div className="sec">Ornament <span className="hint"><span className="req">*</span> Required</span></div>
          <div className="fields">
            <label className="field full">
              <span>Ornament name<span className="req" aria-hidden="true">*</span></span>
              <input id="f-ornament" aria-required="true" aria-invalid={shown('ornament') ? 'true' : undefined} aria-describedby={shown('ornament') ? 'f-ornament-err' : undefined} value={c.ornament} placeholder="e.g. Lotus jhumka" onChange={set('ornament')} />
              {shown('ornament') && <small id="f-ornament-err" className="field-error">{shown('ornament')}</small>}
            </label>
            <div className="field full">
              <span>Occasion<span className="opt">optional</span></span>
              <div className="chips">
                {OCCASIONS.map(o => (
                  <button key={o} className={`chip ${c.occasion === o ? 'on' : ''}`} onClick={() => dispatch({ type: 'occasion', value: o })}>{o}</button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Needed by<span className="opt">optional</span></span>
              <input type="date" id="f-needed" min={isoOf(ready)} value={c.needed} aria-invalid={neededEarly ? 'true' : undefined} aria-describedby={neededEarly ? 'f-needed-err' : 'f-needed-hint'} onChange={set('needed')} />
              {neededEarly
                ? <small id="f-needed-err" className="field-error">Too early. Earliest ready date is {fmtDate(ready)}. Choose a later date.</small>
                : <small id="f-needed-hint">Earliest ready date: {fmtDate(ready)}</small>}
            </label>
            <label className="field">
              <span>Notes<span className="opt">optional</span></span>
              <textarea placeholder="Anything the workshop should know" value={c.notes} onChange={set('notes')} />
            </label>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="sec">How will the design be given? <span className="hint">Choose one</span></div>
        <div className="methods">
          {(Object.keys(METHODS) as Mode[]).map(k => (
            <button key={k} className={`method ${s.mode === k ? 'on' : ''}`} onClick={() => dispatch({ type: 'mode', mode: k })}>
              <span className="ic"><Icon name={METHODS[k].icon} size={20} /></span>
              <span><b>{METHODS[k].title}</b><span className="t">{METHODS[k].text}</span></span>
            </button>
          ))}
        </div>
      </section>
      <div className="actions">
        <span className={custOk(c) ? 'faint' : 'field-error'}>
          {custOk(c) ? 'All required fields are complete.' : 'Complete the fields marked * to continue.'}
        </span>
        <div className="right">
          <button className="btn primary lg" onClick={next}>
            Continue to design
          </button>
        </div>
      </div>
    </>
  );
}

/* ============================ STEP 2: DESIGN ============================ */
export function DesignStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const [sizeTried, setSizeTried] = useState(false);
  const se = sizeErrors(s.dims);
  const back = <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 0 })}><Icon name="arrowLeft" size={16} /> Back</button>;

  if (s.mode === 'picture') {
    return (
      <>
        <div className="grid2">
          {s.photo
            ? <div className="photo"><b>Photo of the ornament</b><span style={{ fontSize: 13 }}>Captured 12:01 PM ET</span></div>
            : (
              <div className="viewfinder">
                <b>Ready to capture</b>
                <span>Place the ornament flat on a plain background, with a ruler or coin in frame.</span>
              </div>
            )}
          <section className="card">
            <div className="sec">{s.photo ? 'Check the photo' : 'Before you take the photo'}</div>
            <ul className="checks">
              <li>Whole ornament in frame</li>
              <li>Ruler or coin visible for scale</li>
              <li>Sharp and well lit</li>
            </ul>
            <p className="muted">A photo can only estimate size, so the price shows as a range until the CAD model is made.</p>
            <div className="grow" />
            {s.photo
              ? (
                <div className="actions">
                  <button className="btn ghost" onClick={() => dispatch({ type: 'photo', on: false })}>Retake</button>
                  <button className="btn primary lg" onClick={() => dispatch({ type: 'go', step: 2 })}>Use this photo</button>
                </div>
              )
              : <button className="btn primary lg" onClick={() => dispatch({ type: 'photo', on: true })}>Take photo</button>}
          </section>
        </div>
        <div className="actions">{back}<span className="faint">Step 2 of 5</span></div>
      </>
    );
  }

  return (
    <>
      <div className="grid2">
        <section className="card">
          <div className="sec">Size <span className="hint">millimetres</span></div>
          <div className="size">
            <NumField id="size-w" label="Width" value={s.dims.w} error={sizeTried ? se.w : undefined} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
            <NumField id="size-h" label="Height" value={s.dims.h} error={sizeTried ? se.h : undefined} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
            <NumField id="size-d" label="Depth" value={s.dims.d} error={sizeTried ? se.d : undefined} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
          </div>
        </section>
        <section className="card">
          <div className="sec">Next</div>
          <p className="muted">On the next step you enter the metal and weight, the stones this ornament needs with their sizes and prices, any services, and the markup. The quote is worked out from those.</p>
          <div className="grow" />
          {sizeTried && !dimsOk(s.dims) && (
            <div className="banner warn" role="alert"><span className="ic"><Icon name="alert" size={14} /></span><span>Enter the width, height and depth in millimetres to continue.</span></div>
          )}
          <button
            className="btn primary lg"
            onClick={() => {
              setSizeTried(true);
              if (!dimsOk(s.dims)) { focusFirstInvalid(); return; }
              dispatch({ type: 'go', step: 2 });
            }}
          >
            Continue to estimate
          </button>
        </section>
      </div>
      <div className="actions">{back}<span className="faint">Step 2 of 5</span></div>
    </>
  );
}

/* ============================ STEP 3: ESTIMATE (vendor-style quote) ============================ */
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// A number box that accepts blanks, so the counter can clear a value and type a new one.
function Num({ id, label, value, onChange, step = 'any', min = '0', suffix, hint, placeholder }: {
  id: string; label: string; value: number | null; onChange: (n: number | null) => void;
  step?: string; min?: string; suffix?: string; hint?: string; placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="affix">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => {
            const t = e.target.value;
            onChange(t.trim() === '' ? null : Number(t));
          }}
        />
        {suffix && <span className="unit">{suffix}</span>}
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function EstimateStep({ s, dispatch, onShowRates }: StepProps & { onShowRates: () => void }) {
  const { mk, liveState } = useMarket();
  const q = buildQuote(mk, s);
  const [budgetErr, setBudgetErr] = useState<string | null>(null);
  const sizes = Object.keys(mk.cfg.sizeCt).map(Number).sort((x, y) => x - y);
  const b = s.budget;
  const overBy = b !== null && q.total > b ? q.total - b : 0;

  const addStone = () => dispatch({
    type: 'stoneAdd',
    line: { id: newId(), type: 'natural_vs2', sizeMm: sizes[0] ?? 1, qty: 1, perCt: mk.cfg.stonePerCt.natural_vs2, setting: mk.cfg.settingPerStone },
  });
  const addService = () => dispatch({ type: 'serviceAdd', line: { id: newId(), name: '', cost: 0 } });

  const top = s.mode === 'picture'
    ? <div className="photo" style={{ minHeight: 180 }}><b>Photo of the ornament</b><span style={{ fontSize: 13 }}>Size estimated from the photo</span></div>
    : (
      <section className="card">
        <div className="sec">Size</div>
        <div className="big-num">{s.dims.w} × {s.dims.h} × {s.dims.d} mm</div>
        <p className="muted">Width × height × depth</p>
      </section>
    );

  return (
    <>
      <div className="grid2 l">
        <div className="col">
          {top}

          <section className="card">
            <div className="sec">Metal</div>
            <div className="chips" role="group" aria-label="Metal and karat">
              {METALS.map(k => (
                <button key={k} className={`chip ${s.metal === k ? 'on' : ''}`} onClick={() => dispatch({ type: 'metal', metal: k })}>{KARATS[k].label}</button>
              ))}
            </div>
            <div className="fields">
              <Num
                id="weight-input"
                label="Finished weight, g"
                value={s.weight}
                placeholder={q.weight.toFixed(2)}
                onChange={v => dispatch({ type: 'weight', value: v })}
                step="0.01"
                suffix="g"
                hint={q.weightIsEstimate ? `Estimated from size: ${q.weight.toFixed(2)} g. Type the weight from your scale.` : 'Weight entered for this ornament.'}
              />
              <Num id="waste-input" label="Waste / loss" value={s.waste} onChange={v => v !== null && dispatch({ type: 'waste', value: v })} step="0.5" suffix="%" hint="5% fabrication · 8–12% casting" />
              <Num id="labour-input" label="Casting cost per gram" value={s.labour} onChange={v => v !== null && dispatch({ type: 'labour', value: v })} step="0.5" suffix="$/g" />
            </div>
            {!q.weightIsEstimate && <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'weight', value: null })}>Use the estimated weight</button>}
            <div className="faint">{mk.rates.source === 'live' ? 'Live spot rates' : 'Owner rates'}, {mk.rates.time} · <button className="link inline" onClick={onShowRates}>Show prices</button></div>
          </section>

          <section className="card">
            <div className="sec">Stones for this ornament <span className="hint">{s.stones.length} stone{s.stones.length === 1 ? '' : 's'}</span></div>
            {s.stones.length === 0 && <p className="muted">No stones yet. Add each stone type and size this ornament needs.</p>}
            {s.stones.map(l => {
              const c = stoneCost(mk, l);
              return (
                <div className="line-row" key={l.id}>
                  <div className="row-a">
                    <label className="field"><span>Stone</span>
                      <select value={l.type} onChange={e => dispatch({ type: 'stoneUpdate', id: l.id, patch: { type: e.target.value as StoneKey, perCt: mk.cfg.stonePerCt[e.target.value as StoneKey] } })}>
                        {STONE_KEYS.map(k => <option key={k} value={k}>{STONES[k].label}</option>)}
                      </select>
                    </label>
                    <label className="field"><span>Size, mm</span>
                      <select value={l.sizeMm} onChange={e => dispatch({ type: 'stoneUpdate', id: l.id, patch: { sizeMm: Number(e.target.value) } })}>
                        {sizes.map(z => <option key={z} value={z}>{z} mm · {mk.cfg.sizeCt[String(z)]} ct</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="row-b">
                    <Num id={`qty-${l.id}`} label="Qty" value={l.qty} onChange={v => dispatch({ type: 'stoneUpdate', id: l.id, patch: { qty: Math.max(0, Math.floor(v ?? 0)) } })} step="1" min="0" />
                    <Num id={`ct-${l.id}`} label="$ per carat" value={l.perCt} onChange={v => dispatch({ type: 'stoneUpdate', id: l.id, patch: { perCt: v ?? 0 } })} step="1" suffix="$" />
                    <Num id={`set-${l.id}`} label="Setting each" value={l.setting} onChange={v => dispatch({ type: 'stoneUpdate', id: l.id, patch: { setting: v ?? 0 } })} step="0.5" suffix="$" />
                  </div>
                  <div className="row-c">
                    <span className="faint">{c.carats.toFixed(3)} ct total · line cost <b className="line-amt">{money(c.total)}</b></span>
                    <button className="btn ghost" aria-label="Remove stone" onClick={() => dispatch({ type: 'stoneRemove', id: l.id })}><Icon name="close" size={16} /> Remove</button>
                  </div>
                </div>
              );
            })}
            <div><button className="btn" onClick={addStone}>Add stone</button></div>
          </section>

          <section className="card">
            <div className="sec">Making charges <span className="hint">flat, per ornament</span></div>
            <div className="fields">
              <Num id="making-design" label="Design" value={s.makingDesign} onChange={v => v !== null && dispatch({ type: 'making', field: 'makingDesign', value: v })} step="1" suffix="$" />
              <Num id="making-wax" label="Wax design" value={s.makingWax} onChange={v => v !== null && dispatch({ type: 'making', field: 'makingWax', value: v })} step="1" suffix="$" />
              <Num id="making-polish" label="Polishing and finishing" value={s.makingPolish} onChange={v => v !== null && dispatch({ type: 'making', field: 'makingPolish', value: v })} step="1" suffix="$" />
            </div>
          </section>

          <section className="card">
            <div className="sec">Services <span className="hint">flat charges, such as plating or CAD</span></div>
            {s.services.length === 0 && <p className="muted">No services. Add plating, engraving or design time here.</p>}
            {s.services.map(v => (
              <div className="line-row" key={v.id}>
                <div className="row-a">
                  <label className="field"><span>Service</span>
                    <input value={v.name} placeholder="e.g. Rhodium plating" onChange={e => dispatch({ type: 'serviceUpdate', id: v.id, patch: { name: e.target.value } })} />
                  </label>
                </div>
                <div className="row-c">
                  <div className="row-cost">
                    <Num id={`svc-${v.id}`} label="Cost" value={v.cost} onChange={n => dispatch({ type: 'serviceUpdate', id: v.id, patch: { cost: n ?? 0 } })} step="1" suffix="$" />
                  </div>
                  <button className="btn ghost" aria-label="Remove service" onClick={() => dispatch({ type: 'serviceRemove', id: v.id })}><Icon name="close" size={16} /> Remove</button>
                </div>
              </div>
            ))}
            <div><button className="btn" onClick={addService}>Add service</button></div>
          </section>

          <section className="card">
            <div className="sec">Edit size <span className="hint">millimetres</span></div>
            <div className="size">
              <NumField id="est-w" label="Width" value={s.dims.w} error={sizeErrors(s.dims).w} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
              <NumField id="est-h" label="Height" value={s.dims.h} error={sizeErrors(s.dims).h} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
              <NumField id="est-d" label="Depth" value={s.dims.d} error={sizeErrors(s.dims).d} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card quote">
            <div className="sec">Quote breakdown</div>
            <div>
              <span className={`pill ${s.exact ? 'ok' : 'warn'}`}>{s.exact ? 'Size locked by CAD' : 'Estimate until CAD is made'}</span>
            </div>
            <Kv label={`${KARATS[s.metal].label}, ${q.weight.toFixed(2)} g + ${s.waste}% waste`} value={money(q.metal)} />
            <Kv label={`Casting cost, ${q.weight.toFixed(2)} g × $${s.labour}`} value={money(q.labour)} />
            <Kv label={`Stones (${s.stones.length})`} value={money(q.stones)} />
            <Kv label={`Services (${s.services.length})`} value={money(q.services)} />
            <Kv label="Making charges (design, wax, polishing)" value={money(q.making)} />
            <div className="kv total sub-total"><span>Production cost</span><b>{money(q.production)}</b></div>
            <div className="markup-row">
              <Num id="markup-input" label="Markup multiplier" value={s.markup} onChange={v => v !== null && dispatch({ type: 'markup', value: v })} step="0.1" min="1" suffix="×" hint={`Quote = production × ${s.markup}. Gross margin ${pct(q.margin)}.`} />
            </div>
            <Kv label="Quote before tax" value={money(q.quote)} />
            <div className="kv total"><span>Total incl. sales tax</span><b>{money(q.total)}</b></div>
            <p className="faint">Tax is added on top of the quote: {money(q.tax)} at {(mk.cfg.taxRate * 100).toFixed(2)}%.{liveState === 'failed' ? ' Live prices could not be reached; owner rates are in use.' : ''}</p>
          </section>

          <section className="card">
            <div className="sec">Customer budget <span className="hint">optional</span></div>
            {b === null && (
              <div><button className="btn" onClick={() => dispatch({ type: 'showBudget' })}>Enter customer budget</button></div>
            )}
            {b !== null && (
              <>
                <div className="budget-top">
                  <div className="moneyin">
                    <span>$</span>
                    <input
                      type="number" inputMode="numeric" min="1" step="10" placeholder="Enter budget"
                      value={b} id="budget-input"
                      aria-invalid={budgetErr ? 'true' : undefined}
                      aria-describedby={budgetErr ? 'budget-err' : undefined}
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        const ok = Number.isFinite(n) && n > 0;
                        setBudgetErr(e.target.value.trim() !== '' && !ok ? 'Enter a budget above $0.' : null);
                        dispatch({ type: 'budget', value: ok ? n : null });
                      }}
                    />
                  </div>
                  <button className="link" onClick={() => dispatch({ type: 'hideBudget' })}>Remove</button>
                </div>
                {budgetErr && <small id="budget-err" className="field-error">{budgetErr}</small>}
                {overBy > 0
                  ? <div className="note bad" role="status">Over budget by {money(overBy)}. Reduce the stones, the services or the markup, or raise the budget.</div>
                  : <div className="note ok" role="status">Within budget, with {money(b - q.total)} to spare.</div>}
              </>
            )}
          </section>
        </div>
      </div>
      <div className="bottombar">
        <div className="info">Quote <b>{money(q.quote)}</b> before tax · total <b>{money(q.total)}</b></div>
        <div className="right">
          <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 1 })}><Icon name="arrowLeft" size={16} /> Back</button>
          <button className="btn primary lg" onClick={() => dispatch({ type: 'go', step: 3 })}>Confirm and make CAD</button>
        </div>
      </div>
    </>
  );
}

/* ============================ STEP 4: CAD ============================ */
export function CadStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const q = buildQuote(mk, s);
  const rules = cadRules(s.dims);
  const allOk = allCadOk(s.dims);
  const banner = s.exact
    ? <div className="banner ok"><span className="ic"><Icon name="check" size={14} /></span><span>CAD model ready. The size is locked for this design.</span></div>
    : allOk
      ? <div className="banner warn"><span className="ic"><Icon name="alert" size={14} /></span><span>Generate the CAD model to lock the size. Until then the size can still change.</span></div>
      : <div className="banner warn"><span className="ic"><Icon name="alert" size={14} /></span><span>A rule check failed. Change the size on the estimate page before generating the CAD model.</span></div>;

  return (
    <>
      {banner}
      <div className="grid2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <CadViews dims={s.dims} />
        <section className="card">
          <div className="sec">Size <span className="hint">fixed by design</span></div>
          <div className="dims3">
            <div><small>Width</small><b>{s.dims.w} mm</b></div>
            <div><small>Height</small><b>{s.dims.h} mm</b></div>
            <div><small>Depth</small><b>{s.dims.d} mm</b></div>
          </div>
          <Kv label="Metal" value={`${KARATS[s.metal].label}, ${q.weight.toFixed(2)} g`} />
          <Kv label="Stones" value={`${s.stones.length} type${s.stones.length === 1 ? '' : 's'} listed`} />
          <div className="kv total"><span>Total incl. sales tax</span><b>{money(q.total)}</b></div>
          <div className="sec" style={{ marginTop: 14 }}>Rule checks</div>
          <div className="rule-list">
            {rules.map(r => (
              <div className={`rule ${r.ok ? '' : 'fail'}`} key={r.label}>
                <span className="rule-text"><Icon name={r.ok ? 'check' : 'close'} size={15} /> {r.label}</span>
                <b>{r.detail}</b>
              </div>
            ))}
          </div>
          <p className="muted">The model uses the same width, height and depth as the quote. The weight entered on the estimate is kept. Print tolerance is ±5% (minimum ±0.35 mm).</p>
          <div className="grow" />
          <div className="actions">
            <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 2 })}><Icon name="arrowLeft" size={16} /> Edit estimate</button>
            {s.exact
              ? <button className="btn primary lg" onClick={() => dispatch({ type: 'go', step: 4 })}>Customer approves</button>
              : (
                <div className="actions-stack">
                  {!allOk && (
                    <div className="note bad" role="alert">
                      Generate is off until every rule check passes. Fix: {rules.filter(r => !r.ok).map(r => r.label).join('; ')}.
                    </div>
                  )}
                  <button className="btn primary lg" disabled={!allOk} onClick={() => dispatch({ type: 'generateCad' })}>Generate CAD model</button>
                </div>
              )}
          </div>
        </section>
      </div>
    </>
  );
}

/* ============================ STEP 5: CONFIRM ============================ */
interface Todo {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  fixStep?: number; // step to go back to, when the fix is made on another screen
}

export function ConfirmStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const o = buildQuote(mk, s);
  const c = s.cust;
  const ready = readyDate(s.metal, s.stones, s.mode);
  const needed = c.needed ? parseISO(c.needed) : null;
  const dateOk = !needed || needed >= ready;
  // The deposit that applies, in dollars. A deposit is never more than the total or less than zero.
  const dep = depositDue(o.total, s.depositAmount, mk.cfg.defaultDeposit);
  const depositAmt = dep;
  const src = s.mode === 'picture' ? 'Picture, size estimated from the photo' : 'Size entered from the design';
  const locked = s.sent;
  const balance = o.total - dep;
  const depPct = o.total > 0 ? Math.round((dep / o.total) * 1000) / 10 : 0;
  const presets = mk.cfg.deposits;
  const overTotal = s.depositAmount !== null && s.depositAmount > o.total + 0.005;

  // The box shows dollars. It keeps what the user typed while they type; invalid text is not saved.
  const [depositText, setDepositText] = useState(() => dep.toFixed(2));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // The order is only marked sent once the shared list has saved it. On failure nothing changes.
  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      await saveOrderRemote({ ...s, sent: true });
      dispatch({ type: 'send' });
    } catch (e) {
      const locked = e instanceof Error && e.message === 'Locked';
      setSendError(locked
        ? 'Your counter is locked. Enter the PIN, then send again. The order was not sent.'
        : 'The order could not be sent. Check the connection and try again. The order was not sent.');
    } finally {
      setSending(false);
    }
  };
  const typedAmt = parseAmount(depositText);
  const depError = typedAmt === null
    ? (depositText.trim() === '' ? 'Enter the deposit amount in dollars.' : 'Enter an amount above $0.')
    : typedAmt > o.total
      ? `The deposit cannot be more than the order total, ${money(o.total)}.`
      : null;

  // First time on this screen, record the default deposit so the amount on screen is the amount saved.
  useEffect(() => {
    if (!locked && s.depositAmount === null) {
      dispatch({ type: 'deposit', value: dep });
      setDepositText(dep.toFixed(2));
    }
    // Runs once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Items the app can check itself: each open one has a Fix link to the screen that completes it.
  const automatic: Todo[] = [
    {
      key: 'details', label: 'Customer details are complete',
      detail: custOk(c) ? `${c.name} · ${c.phone}` : 'Name, phone and ornament name are required.',
      done: custOk(c), fixStep: 0,
    },
    {
      key: 'cad', label: 'CAD model is generated',
      detail: s.exact ? 'The size is locked for this design.' : 'Until then the size can still change.',
      done: s.exact, fixStep: 3,
    },
    {
      key: 'deposit-limit', label: 'Deposit is within the order total',
      detail: overTotal
        ? `The deposit is more than the total of ${money(o.total)}. Enter a lower amount below.`
        : `${money(dep)} of ${money(o.total)} total (${depPct}%).`,
      done: !overTotal,
    },
    {
      key: 'date', label: 'Needed-by date is achievable',
      detail: !needed
        ? 'No needed-by date set.'
        : dateOk
          ? `Needed by ${fmtDate(needed)}.`
          : `Needed by ${fmtDate(needed)} is earlier than the earliest ready date, ${fmtDate(ready)}.`,
      done: dateOk, fixStep: 0,
    },
  ];

  // Items the owner confirms with the customer.
  const confirmations: { key: keyof typeof s.checks; label: string }[] = [
    { key: 'details', label: 'The customer has checked their name, phone and dates' },
    { key: 'design', label: 'The customer has approved the size, metal and stones' },
    { key: 'price', label: 'The customer has agreed to the price' },
    { key: 'deposit', label: `The deposit of ${money(dep)} has been collected` },
  ];

  const openCount = automatic.filter(t => !t.done).length + confirmations.filter(t => !s.checks[t.key]).length;

  const todoRow = (t: Todo) => (
    <div key={t.key} className={`todo ${t.done ? 'done' : 'open'}`}>
      <span className="todo-ic" aria-hidden="true"><Icon name={t.done ? 'check' : 'alert'} size={14} /></span>
      <div className="todo-body">
        <b>{t.label}</b>
        <small>{t.detail}</small>
      </div>
      {!t.done && !locked && t.fixStep !== undefined && (
        <button className="link" onClick={() => dispatch({ type: 'go', step: t.fixStep! })}>Fix</button>
      )}
    </div>
  );

  const confirmRow = (key: keyof typeof s.checks, text: string) => (
    <label key={key} className={`todo confirm ${s.checks[key] ? 'done' : 'open'}`}>
      <input
        type="checkbox"
        checked={s.checks[key]}
        disabled={locked}
        onChange={e => dispatch({ type: 'check', key, on: e.target.checked })}
      />
      <div className="todo-body"><b>{text}</b></div>
    </label>
  );

  return (
    <>
      {locked && (
        <div className="banner ok" role="status">
          <span className="ic"><Icon name="check" size={14} /></span>
          <span>Order {s.orderNo} was sent to the workshop for {c.ornament}. Ready by {fmtDate(ready)}.</span>
        </div>
      )}

      <section className="card summary">
        <div className="summary-head">
          <div>
            <div className="sec">Order {s.orderNo}</div>
            <h2 className="summary-title">{c.ornament}</h2>
            <div className="muted">{c.name} · {c.phone}{c.occasion ? ` · ${c.occasion}` : ''}</div>
          </div>
          <div className={`pill ${s.exact ? 'ok' : 'warn'}`}>
            {s.exact ? 'Final price (CAD made)' : 'Estimate (CAD not made yet)'}
          </div>
        </div>
        <div className="summary-grid">
          <div><small>Total</small><b>{money(o.total)}</b></div>
          <div><small>Deposit due now</small><b>{money(depositAmt)}</b></div>
          <div><small>Balance due at pickup</small><b>{money(balance)}</b></div>
          <div><small>Ready by</small><b>{fmtDate(ready)}</b></div>
        </div>
      </section>

      <div className="grid2">
        <div className="col">
          <section className="card">
            <div className="sec">Before you send</div>
            <p className="muted">Each item must be done. Use Fix to go to the screen that completes it.</p>
            <div className="todo-list">
              {automatic.map(todoRow)}
            </div>
            <div className="sec" style={{ marginTop: 6 }}>Confirm with the customer</div>
            <div className="todo-list">
              {confirmations.map(t => confirmRow(t.key, t.label))}
            </div>
          </section>

          <section className="card">
            <div className="sec">Order details</div>
            <Kv label="Customer" value={c.name} />
            <Kv label="Phone" value={c.phone} />
            {c.email && <Kv label="Email" value={c.email} />}
            {c.occasion && <Kv label="Occasion" value={c.occasion} />}
            <Kv label="Needed by" value={needed ? fmtDate(needed) : 'Not set'} />
            <div className="divider" />
            <Kv label="Ornament" value={c.ornament} />
            <Kv label="How the design was given" value={src} />
            <Kv label="Size (width × height × depth)" value={`${s.dims.w} × ${s.dims.h} × ${s.dims.d} mm`} />
            <Kv label="Metal" value={`${KARATS[s.metal].label}, ${o.weight.toFixed(2)} g${o.weightIsEstimate ? ' (estimated from size)' : ' (entered)'}`} />
            <div className="sec" style={{ marginTop: 6 }}>Stones needed</div>
            {s.stones.length === 0 && <p className="muted">No stones for this ornament.</p>}
            {s.stones.map(l => {
              const c = stoneCost(mk, l);
              return (
                <Kv key={l.id} label={`${l.qty} × ${l.sizeMm} mm ${STONES[l.type].name} (${c.carats.toFixed(3)} ct)`} value={money(c.total)} />
              );
            })}
            <div className="sec" style={{ marginTop: 6 }}>Services</div>
            {s.services.length === 0 && <p className="muted">No services.</p>}
            {s.services.map(v => <Kv key={v.id} label={v.name || 'Service'} value={money(v.cost)} />)}
            {c.notes && <div className="note neutral">Notes for the workshop: {c.notes}</div>}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <div className="sec">Price breakdown</div>
            <Kv label={`Metal, incl. ${s.waste}% waste`} value={money(o.metal)} />
            <Kv label="Casting cost" value={money(o.labour)} />
            <Kv label="Making charges (design, wax, polishing)" value={money(o.making)} />
            <Kv label="Stones and setting" value={money(o.stones)} />
            <Kv label="Services" value={money(o.services)} />
            <Kv label="Production cost" value={money(o.production)} />
            <Kv label="Markup" value={`× ${s.markup}`} />
            <Kv label="Gross margin" value={`${(o.margin * 100).toFixed(1)}%`} cls="sub2" />
            <Kv label="Quote before tax" value={money(o.quote)} />
            <Kv label={taxLabel(mk.cfg)} value={money(o.tax)} />
            <div className="kv total"><span>Total</span><b>{money(o.total)}</b></div>
            <div className="divider" />
            <div className="sec">Deposit <span className="hint">paid before the workshop starts</span></div>
            <div className="chips" role="group" aria-label="Deposit presets">
              {presets.map(p => {
                const amt = percentOf(o.total, p);
                const on = s.depositAmount !== null && Math.abs(dep - amt) < 0.005;
                return (
                  <button
                    key={p}
                    className={`chip ${on ? 'on' : ''}`}
                    disabled={locked}
                    onClick={() => { setDepositText(amt.toFixed(2)); dispatch({ type: 'deposit', value: amt }); }}
                  >
                    {p}% · {money(amt)}
                  </button>
                );
              })}
            </div>
            <label className="field deposit-custom">
              <span>Or type the deposit amount</span>
              <div className="affix prefix">
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={locked}
                  placeholder="0.00"
                  id="deposit-input"
                  aria-invalid={depError ? 'true' : undefined}
                  aria-describedby={depError ? 'deposit-err' : undefined}
                  value={depositText}
                  onChange={e => {
                    const t = e.target.value;
                    setDepositText(t);
                    const v = parseAmount(t);
                    if (v !== null && v <= o.total) dispatch({ type: 'deposit', value: v });
                  }}
                  onBlur={() => setDepositText(dep.toFixed(2))}
                />
                <span className="unit">$</span>
              </div>
              {depError && <small id="deposit-err" className="field-error">{depError}</small>}
            </label>
            <Kv label={`Deposit due now (${depPct}% of total)`} value={money(dep)} />
            <Kv label="Balance due at pickup" value={money(balance)} />
          </section>

          <section className="card">
            <div className="sec">Send</div>
            {!s.exact && !locked && <div className="note warn">The price is an estimate. Generate the CAD model on the CAD step to make it final.</div>}
            <div className="actions-stack">
              {locked
                ? <button className="btn dark lg" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo(), terms: termsFromConfig(mk.cfg) })}>Start a new order</button>
                : (
                  <>
                    {sendError && <div className="note bad" role="alert">{sendError}</div>}
                    <button className="btn primary lg" disabled={openCount > 0 || sending} onClick={send}>
                      {sending ? 'Sending…' : openCount > 0 ? `Finish ${openCount} item${openCount === 1 ? '' : 's'} to send` : 'Send to workshop'}
                    </button>
                  </>
                )}
              <button className="btn lg" onClick={() => window.print()}>Print workshop ticket</button>
              {!locked && (
                <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 3 })}>
                  <Icon name="arrowLeft" size={16} /> Back to CAD
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
