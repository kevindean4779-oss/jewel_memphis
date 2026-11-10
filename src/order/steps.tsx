import type { ChangeEvent } from 'react';
import { KARATS, METHODS, OCCASIONS, RATES, STONES, STORE, type Mode } from './data';
import { allCadOk, allOptions, cadRules, custOk, dimsOk, price, readyDate, type Option } from './pricing';
import { fmtDate, isoOf, money, parseISO } from './format';
import { CadViews } from './CadViews';
import { newOrderNo } from './state';
import { Kv, MetalChips, NumField, Proportions, StoneChips, TAX_SHORT, type StepProps } from './shared';

function ok(s: StepProps['s']) {
  return price(s.dims, s.metal, s.stone, s.mode, s.exact);
}

/* ============================ STEP 1: CUSTOMER ============================ */
export function CustomerStep({ s, dispatch }: StepProps) {
  const c = s.cust;
  const ready = readyDate(s.metal, s.stone, s.mode);
  const set = (key: keyof typeof c) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    dispatch({ type: 'cust', key, value: e.target.value });

  return (
    <>
      {s.restored && (
        <div className="banner ok"><span className="ic">✓</span><span>Draft restored. Your earlier entries are still here.</span></div>
      )}
      <div className="grid2">
        <section className="card">
          <div className="sec">Customer</div>
          <div className="fields">
            <label className="field"><span>Full name<span className="req">*</span></span>
              <input value={c.name} placeholder="e.g. Meera Sharma" onChange={set('name')} />
            </label>
            <label className="field"><span>Phone<span className="req">*</span></span>
              <input value={c.phone} placeholder="(555) 000-0000" onChange={set('phone')} />
            </label>
            <label className="field full"><span>Email<span className="opt">optional</span></span>
              <input type="email" value={c.email} placeholder="name@example.com" onChange={set('email')} />
            </label>
          </div>
        </section>
        <section className="card">
          <div className="sec">Ornament</div>
          <div className="fields">
            <label className="field full"><span>Ornament name<span className="req">*</span></span>
              <input value={c.ornament} placeholder="e.g. Lotus jhumka" onChange={set('ornament')} />
            </label>
            <div className="field full">
              <span>Occasion<span className="opt">optional</span></span>
              <div className="chips">
                {OCCASIONS.map(o => (
                  <button key={o} className={`chip ${c.occasion === o ? 'on' : ''}`} onClick={() => dispatch({ type: 'occasion', value: o })}>{o}</button>
                ))}
              </div>
            </div>
            <label className="field"><span>Needed by</span>
              <input type="date" min={isoOf(ready)} value={c.needed} onChange={set('needed')} />
              <small>Earliest ready date: {fmtDate(ready)}</small>
            </label>
            <label className="field"><span>Notes<span className="opt">optional</span></span>
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
              <span className="ic">{METHODS[k].icon}</span>
              <span><b>{METHODS[k].title}</b><span className="t">{METHODS[k].text}</span></span>
            </button>
          ))}
        </div>
      </section>
      <div className="actions">
        <span className="faint">Name, phone and ornament name are required</span>
        <div className="right">
          <button className="btn primary lg" disabled={!custOk(c)} onClick={() => dispatch({ type: 'go', step: 1 })}>
            Continue to design
          </button>
        </div>
      </div>
    </>
  );
}

/* ============================ STEP 2: DESIGN ============================ */
export function DesignStep({ s, dispatch }: StepProps) {
  const back = <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 0 })}>← Back</button>;

  if (s.mode === 'picture') {
    return (
      <>
        <div className="grid2">
          {s.photo
            ? <div className="photo"><b>Photo of the ornament</b><span style={{ fontSize: 13 }}>Captured 12:01 PM ET</span></div>
            : (
              <div className="viewfinder">
                <b style={{ font: "600 22px 'Cormorant Garamond', serif", color: 'var(--ink)' }}>Ready to capture</b>
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
                  <button className="btn primary lg" onClick={() => dispatch({ type: 'continueToEstimate' })}>Use this photo</button>
                </div>
              )
              : <button className="btn primary lg" onClick={() => dispatch({ type: 'photo', on: true })}>Take photo</button>}
          </section>
        </div>
        <div className="actions">{back}<span className="faint">Step 2 of 5</span></div>
      </>
    );
  }

  const p = ok(s);
  return (
    <>
      <div className="grid2">
        <section className="card">
          <div className="sec">Size <span className="hint">millimetres</span></div>
          <div className="size">
            <NumField label="Width" value={s.dims.w} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
            <NumField label="Height" value={s.dims.h} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
            <NumField label="Depth" value={s.dims.d} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
          </div>
          <div className="sec" style={{ marginTop: 6 }}>Metal</div>
          <MetalChips s={s} dispatch={dispatch} />
          <div className="sec" style={{ marginTop: 6 }}>Stones <span className="hint">0.20 ct total</span></div>
          <StoneChips s={s} dispatch={dispatch} />
        </section>
        <section className="card">
          <div className="sec">Preview price</div>
          <div className="kv total">
            <span>Estimated price</span>
            <b>{money(p.total)}<small>incl. {TAX_SHORT}</small></b>
          </div>
          <p className="muted">Updates as you change the size, metal or stones.</p>
          <div className="grow" />
          <button className="btn primary lg" disabled={!dimsOk(s.dims)} onClick={() => dispatch({ type: 'continueToEstimate' })}>
            Continue to estimate
          </button>
        </section>
      </div>
      <div className="actions">{back}<span className="faint">Step 2 of 5</span></div>
    </>
  );
}

/* ============================ STEP 3: ESTIMATE ============================ */
function FitPill({ o, b }: { o: Option; b: number | null }) {
  if (b === null) return null;
  if (o.high <= b) return <span className="pill ok">Within budget</span>;
  if (o.low <= b) return <span className="pill warn">May exceed budget</span>;
  return <span className="pill bad">Over by {money(o.low - b)}</span>;
}

export function EstimateStep({ s, dispatch, onShowRates }: StepProps & { onShowRates: () => void }) {
  const cur = ok(s);
  const isOrig = s.orig !== null && s.orig.metal === s.metal && s.orig.stone === s.stone;
  const all = allOptions(s.dims, s.mode, s.exact);
  const b = s.budget;
  const mayFit = b === null ? [] : all.filter(o => o.low <= b);
  const sure = b === null ? [] : all.filter(o => o.high <= b);
  const list = (s.fitOnly && b !== null ? mayFit : all)
    .slice()
    .sort((x, y) => (b === null ? x.total - y.total : Math.abs(b - x.total) - Math.abs(b - y.total)));
  const curOver = b !== null && cur.low > b;
  const curMay = b !== null && !curOver && cur.high > b;

  const budgetSummary = b === null
    ? 'Enter the budget to see which combinations fit.'
    : mayFit.length
      ? <><b>{sure.length} of {all.length}</b> combinations are within {money(b)}. <b>{mayFit.length - sure.length}</b> may exceed it once the CAD model is made.</>
      : <>No combination fits {money(b)}. The lowest is <b>{money(all[0].low)}</b>. Try a higher budget or a smaller size.</>;

  const bottomInfo = b === null
    ? <>Selected: <b>{KARATS[s.metal].label}, {STONES[s.stone].name}</b> · {money(cur.total)}</>
    : curOver
      ? <>Selected: <b>{money(cur.total)}</b> is over the budget. Pick a combination that fits.</>
      : <>Selected: <b>{KARATS[s.metal].label}, {STONES[s.stone].label}</b> · {money(cur.total)}{curMay
        ? <span style={{ color: 'var(--warn)' }}> · may exceed budget after CAD</span>
        : ' · within budget'}</>;

  const volNote = s.exact
    ? <span className="pill ok">Exact · from CAD</span>
    : <span className="pill warn">Estimate · final price after CAD</span>;

  const top = s.mode === 'picture'
    ? <div className="photo" style={{ minHeight: 220 }}><b>Photo of the ornament</b><span style={{ fontSize: 13 }}>Size estimated from the photo</span></div>
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
            <div className="sec">Estimate <span className="hint">{s.cust.ornament.trim() || 'This design'}</span></div>
            <div>{volNote}</div>
            <Kv label={`${KARATS[s.metal].label}, ${cur.grams.toFixed(2)} g`} value={money(cur.metal)} />
            <Kv label={`${STONES[s.stone].name}, 0.20 ct`} value={money(cur.stone)} />
            <Kv label="Making and setting" value={money(cur.making)} />
            <Kv label="Subtotal" value={money(cur.subtotal)} cls="sub2" />
            <Kv label={STORE.taxLabel} value={money(cur.tax)} cls="sub2" />
            <div className="kv total">
              <span>Estimated price</span>
              <b>{money(cur.total)}</b>
            </div>
            <div className="actions">
              <span className="faint">Live USA rates, {RATES.time}</span>
              <button className="link" onClick={onShowRates}>Show live prices</button>
            </div>
            {!isOrig && <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'resetOriginal' })}>Reset to original design</button>}
          </section>
          <section className="card">
            <div className="sec">Edit design</div>
            <div className="size">
              <NumField label="Width mm" value={s.dims.w} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
              <NumField label="Height mm" value={s.dims.h} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
              <NumField label="Depth mm" value={s.dims.d} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
            </div>
            <div className="sec" style={{ marginTop: 6 }}>Metal</div>
            <MetalChips s={s} dispatch={dispatch} />
            <div className="sec" style={{ marginTop: 6 }}>Stones</div>
            <StoneChips s={s} dispatch={dispatch} />
          </section>
        </div>

        <div className="col" style={{ minHeight: 0 }}>
          {!s.showBudget && (
            <section className="card">
              <div className="sec">Customer budget <span className="hint">optional</span></div>
              <p className="muted">If the customer has a budget, enter it to see every metal and stone combination that fits, with its cost and proportions.</p>
              <div><button className="btn" onClick={() => dispatch({ type: 'showBudget' })}>Enter customer budget</button></div>
            </section>
          )}
          {s.showBudget && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
              <section className="card">
                <div className="sec">Customer budget <button className="link" onClick={() => dispatch({ type: 'hideBudget' })}>Remove</button></div>
                <div className="budget-top">
                  <div className="moneyin">
                    <span>$</span>
                    <input
                      type="number" inputMode="numeric" min="1" step="10" placeholder="Enter budget"
                      value={b ?? ''}
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        dispatch({ type: 'budget', value: Number.isFinite(n) && n > 0 ? n : null });
                      }}
                    />
                  </div>
                  <div className="chips">
                    {[500, 750, 1000].map(v => (
                      <button key={v} className={`chip ${b === v ? 'on' : ''}`} onClick={() => dispatch({ type: 'budget', value: v })}>${v}</button>
                    ))}
                  </div>
                </div>
                <div className="bsum">{budgetSummary}</div>
                <div className="seg" style={{ alignSelf: 'flex-start' }}>
                  <button className={`chip ${s.fitOnly ? 'on' : ''}`} onClick={() => dispatch({ type: 'fit', fitOnly: true })}>Fits budget</button>
                  <button className={`chip ${s.fitOnly ? '' : 'on'}`} onClick={() => dispatch({ type: 'fit', fitOnly: false })}>All combinations</button>
                </div>
              </section>
              <div className="optlist">
                {b !== null && s.fitOnly && mayFit.length === 0
                  ? <div className="note bad">Nothing fits this budget at the current size. Raise the budget, or reduce the size on the left.</div>
                  : list.map(o => {
                    const over = b !== null && o.low > b;
                    const sel = s.metal === o.metalKey && s.stone === o.stoneKey;
                    return (
                      <div
                        key={`${o.metalKey}-${o.stoneKey}`}
                        className={`opt-card ${sel ? 'sel' : ''} ${over ? 'over' : ''}`}
                        onClick={() => { if (!over) dispatch({ type: 'select', metal: o.metalKey, stone: o.stoneKey }); }}
                      >
                        <div className="oh">
                          <div>
                            <b>{KARATS[o.metalKey].label} · {STONES[o.stoneKey].label}</b>
                            <div className="meta">Metal {o.grams.toFixed(2)} g · 0.20 ct stones</div>
                          </div>
                          <div className="op"><b>{money(o.total)}</b><FitPill o={o} b={b} /></div>
                        </div>
                        <Proportions share={{ metal: o.shareMetal, stone: o.shareStone, making: o.shareMaking }} />
                        <div className="oc">
                          <span>Metal {money(o.metal)} + stones {money(o.stone)} + making {money(o.making)}, before tax</span>
                          {sel && <span className="picked">✓ Selected</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bottombar">
        <div className="info">{bottomInfo}</div>
        <div className="right">
          <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 1 })}>← Back</button>
          <button className="btn primary lg" disabled={curOver} onClick={() => dispatch({ type: 'go', step: 3 })}>
            Confirm and make CAD
          </button>
        </div>
      </div>
    </>
  );
}

/* ============================ STEP 4: CAD ============================ */
export function CadStep({ s, dispatch }: StepProps) {
  const p = ok(s);
  const rules = cadRules(s.dims);
  const allOk = allCadOk(s.dims);
  const banner = s.exact
    ? <div className="banner ok"><span className="ic">✓</span><span>CAD model ready. Exact volume and price are locked for this size.</span></div>
    : allOk
      ? <div className="banner warn"><span className="ic">!</span><span>Generate the CAD model to lock the exact volume and price. Until then the price is an estimate.</span></div>
      : <div className="banner warn"><span className="ic">!</span><span>A rule check failed. Change the size on the estimate page before generating the CAD model.</span></div>;

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
          <Kv label="Metal" value={`${KARATS[s.metal].label}, ${p.grams.toFixed(2)} g`} />
          <Kv label="Stones" value={`${STONES[s.stone].name}, 0.20 ct`} />
          <div className="kv total"><span>Price incl. tax</span><b>{money(p.total)}</b></div>
          <div className="sec" style={{ marginTop: 14 }}>Rule checks</div>
          <div>
            {rules.map(r => (
              <div className="kv" key={r.label}><span>{r.ok ? '✓' : '✕'} {r.label}</span><b>{r.detail}</b></div>
            ))}
          </div>
          <p className="muted">The model uses the same width, height and depth as the price. Exact volume comes from this model. Print tolerance is ±5% (minimum ±0.35 mm).</p>
          <div className="grow" />
          <div className="actions">
            <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 2 })}>← Edit estimate</button>
            {s.exact
              ? <button className="btn primary lg" onClick={() => dispatch({ type: 'go', step: 4 })}>Customer approves</button>
              : <button className="btn primary lg" disabled={!allOk} style={!allOk ? { opacity: 0.5, cursor: 'not-allowed' } : undefined} onClick={() => dispatch({ type: 'generateCad' })}>Generate CAD model</button>}
          </div>
        </section>
      </div>
    </>
  );
}

/* ============================ STEP 5: CONFIRM ============================ */
export function ConfirmStep({ s, dispatch }: StepProps) {
  const o = ok(s);
  const c = s.cust;
  const ready = readyDate(s.metal, s.stone, s.mode);
  const needed = c.needed ? parseISO(c.needed) : null;
  const dateOk = !needed || needed >= ready;
  const depositAmt = (o.total * s.deposit) / 100;
  const balance = o.total - depositAmt;
  const src = s.mode === 'picture' ? 'Picture, size estimated from photo' : 'Dimensions entered by owner';

  const missing: string[] = [];
  if (!s.exact) missing.push('CAD model');
  if (!s.checks.details) missing.push('customer check');
  if (!s.checks.design) missing.push('design approval');
  if (!s.checks.price) missing.push('price agreement');
  if (!s.checks.deposit) missing.push('deposit');
  if (needed && needed < ready) missing.push('needed-by date');

  const checkItem = (key: keyof typeof s.checks, text: string) => (
    <label className={`check ${s.checks[key] ? 'on' : ''}`}>
      <input
        type="checkbox"
        checked={s.checks[key]}
        disabled={s.sent}
        onChange={e => dispatch({ type: 'check', key, on: e.target.checked })}
      />
      <span>{text}</span>
    </label>
  );

  return (
    <>
      {s.sent && (
        <div className="banner ok">
          <span className="ic">✓</span>
          <span>Order #{s.orderNo} sent to the workshop for {c.ornament}. Ready by {fmtDate(ready)}.</span>
        </div>
      )}
      <div className="grid2">
        <div className="col">
          <section className="card">
            <div className="sec">Customer</div>
            <Kv label="Name" value={c.name} />
            <Kv label="Phone" value={c.phone} />
            {c.email && <Kv label="Email" value={c.email} />}
            {c.occasion && <Kv label="Occasion" value={c.occasion} />}
            {needed && <Kv label="Needed by" value={fmtDate(needed)} />}
            {c.notes && <div className="note neutral">{c.notes}</div>}
          </section>
          <section className="card">
            <div className="sec">Ornament · {c.ornament}</div>
            <Kv label="Design input" value={src} />
            <Kv label="Size (W × H × D)" value={`${s.dims.w} × ${s.dims.h} × ${s.dims.d} mm`} />
            <Kv label="Metal" value={`${KARATS[s.metal].label}, ${o.grams.toFixed(2)} g`} />
            <Kv label="Stones" value={`${STONES[s.stone].name}, 0.20 ct`} />
            <div className="divider" />
            <div className="sec">Proportions <span className="hint">fixed by design</span></div>
            <Proportions share={{ metal: o.shareMetal, stone: o.shareStone, making: o.shareMaking }} />
          </section>
        </div>

        <div className="col">
          <section className="card">
            <div className="sec">Price</div>
            <Kv label="Metal" value={money(o.metal)} />
            <Kv label="Stones" value={money(o.stone)} />
            <Kv label="Making and setting" value={money(o.making)} />
            <Kv label="Subtotal" value={money(o.subtotal)} />
            <Kv label={STORE.taxLabel} value={money(o.tax)} />
            <div className="kv total"><span>Total</span><b>{money(o.total)}</b></div>
            <div className="divider" />
            <div className="sec">Deposit <span className="hint">due before the workshop starts</span></div>
            <div className="chips">
              {STORE.deposits.map(p => (
                <button key={p} className={`chip ${s.deposit === p ? 'on' : ''}`} disabled={s.sent} onClick={() => dispatch({ type: 'deposit', value: p })}>{p}%</button>
              ))}
            </div>
            <Kv label={`Deposit (${s.deposit}%)`} value={money(depositAmt)} />
            <Kv label="Balance due at pickup" value={money(balance)} />
          </section>

          <section className="card">
            <div className="sec">Workshop schedule</div>
            <Kv label="Earliest ready date" value={fmtDate(ready)} />
            {needed && !dateOk
              ? <div className="note bad">The needed-by date ({fmtDate(needed)}) is earlier than the earliest ready date. Change the date on the customer page, or agree a later date with the customer.</div>
              : <div className="note ok">{needed ? 'Needed-by date is achievable.' : 'No needed-by date set.'}</div>}
          </section>

          <section className="card">
            <div className="sec">Cross-check before sending</div>
            {!s.exact && <div className="note warn">Generate the CAD model on the previous step before sending.</div>}
            <div className="checks-block">
              {checkItem('details', 'Customer name, phone and dates are correct')}
              {checkItem('design', 'Ornament size, metal and stones are approved')}
              {checkItem('price', 'Price and proportions are agreed')}
              {checkItem('deposit', `Deposit of ${money(depositAmt)} collected`)}
            </div>
            <div className="grow" />
            {s.sent
              ? <button className="btn dark lg" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo() })}>Start a new order</button>
              : (
                <>
                  <button className="btn primary lg" disabled={missing.length > 0} onClick={() => dispatch({ type: 'send' })}>Send to workshop</button>
                  <div className="actions">
                    <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 3 })}>← Back</button>
                    <span className="faint">{missing.length ? `Missing: ${missing.join(', ')}` : 'Ready to send'}</span>
                  </div>
                </>
              )}
          </section>
        </div>
      </div>
    </>
  );
}
