import { useState, type ChangeEvent, type ReactNode } from 'react';
import { KARATS, METHODS, OCCASIONS, STONES, STORE, type Mode } from './data';
import { isSampleSpot, rateTime, useRates } from './rates';
import { allCadOk, allOptions, cadRules, cents, custErrors, custOk, dimOk, dimsOk, price, readyDate, validISODate, type Option } from './pricing';
import { fmtDate, isoOf, money, parseISO } from './format';
import { CadViews } from './CadViews';
import { missingForSend, newOrderNo, orderSpot, uuid } from './state';
import { buildOrderRecord, retry, submitOrder, useOutbox } from './orders';
import {
  ActionBar, Card, Choices, EmailField, Kv, MetalChips, NumField, Page, PhoneField, Proportions, StoneChips, TAX_SHORT, Total, type StepProps,
} from './shared';
import {
  IconAlert, IconArrowLeft, IconArrowRight, IconCamera, IconCheck, IconCube, IconInfo, IconPlus, IconRotate, IconRuler, IconSend, IconX,
} from './icons';

// Prices the order at its frozen rates once the price is agreed, otherwise at live rates.
function ok(s: StepProps['s']) {
  return price(s.dims, s.metal, s.stone, s.mode, s.exact, orderSpot(s));
}

function DimFields({ s, dispatch }: StepProps) {
  return (
    <div className="dims">
      <NumField label="Width" value={s.dims.w} invalid={!dimOk(s.dims.w)} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
      <NumField label="Height" value={s.dims.h} invalid={!dimOk(s.dims.h)} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
      <NumField label="Depth" value={s.dims.d} invalid={!dimOk(s.dims.d)} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
    </div>
  );
}

const mm = (v: number) => (dimOk(v) ? `${v} mm` : '—');

function DimTiles({ s }: { s: StepProps['s'] }) {
  return (
    <div className="dim-tiles">
      <div><small>Width</small><b>{mm(s.dims.w)}</b></div>
      <div><small>Height</small><b>{mm(s.dims.h)}</b></div>
      <div><small>Depth</small><b>{mm(s.dims.d)}</b></div>
    </div>
  );
}

const DIM_HELP = <div className="notice warn"><IconAlert /><span>Each side must be between 0.5 and 200 mm.</span></div>;

const METHOD_ICONS: Record<Mode, ReactNode> = { picture: <IconCamera size={22} />, dims: <IconRuler size={22} /> };

function Back({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return <button className="btn ghost lg back" aria-label={label} onClick={onClick}><IconArrowLeft /><span className="btn-label">{label}</span></button>;
}

/* ============================ STEP 1: CUSTOMER ============================ */
export function CustomerStep({ s, dispatch }: StepProps) {
  const c = s.cust;
  const ready = readyDate(s.metal, s.stone, s.mode);
  const set = (key: keyof typeof c) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    dispatch({ type: 'cust', key, value: e.target.value });
  const can = custOk(c);
  const errs = custErrors(c);
  // Show a field's error only after the person has left it, or tried to continue.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const show = (k: keyof typeof errs) => (touched[k] || tried) && errs[k];
  const blur = (k: string) => () => setTouched(t => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errs) => show(k) ? <span className="field-error" id={`err-${k}`}>{errs[k]}</span> : null;
  const aria = (k: keyof typeof errs) => ({ 'aria-invalid': show(k) ? true : undefined, 'aria-describedby': show(k) ? `err-${k}` : undefined });
  const neededBad = c.needed !== '' && (!validISODate(c.needed) || parseISO(c.needed) < ready);

  return (
    <>
      <Page step={0} title="Customer and ornament" desc="Who the piece is for and how the design will be given.">
        {s.restored && (
          <div className="notice ok"><IconCheck /><span>Draft restored. Your earlier entries are still here.</span></div>
        )}
        <div className="grid">
          <Card title="Customer">
            <div className="fields">
              <label className="field full"><span className="field-label">Full name<span className="req">*</span></span>
                <input className="input" autoComplete="name" maxLength={120} value={c.name} placeholder="e.g. Meera Sharma" onChange={set('name')} onBlur={blur('name')} {...aria('name')} />
                {err('name')}
              </label>
              <PhoneField label="Phone" value={c.phone} onChange={v => dispatch({ type: 'cust', key: 'phone', value: v })} />
              <EmailField label="Email" value={c.email} onChange={v => dispatch({ type: 'cust', key: 'email', value: v })} />
            </div>
          </Card>
          <Card title="Ornament">
            <div className="fields">
              <label className="field full"><span className="field-label">Ornament name<span className="req">*</span></span>
                <input className="input" maxLength={120} value={c.ornament} placeholder="e.g. Lotus pendant" onChange={set('ornament')} onBlur={blur('ornament')} {...aria('ornament')} />
                {err('ornament')}
              </label>
              <div className="field full">
                <span className="field-label">Occasion<span className="opt">Optional</span></span>
                <Choices label="Occasion" options={OCCASIONS} value={c.occasion}
                  onChange={value => dispatch({ type: 'occasion', value })} render={o => o} />
              </div>
              <label className="field"><span className="field-label">Needed by<span className="opt">Optional</span></span>
                <input className="input" type="date" min={isoOf(ready)} value={c.needed} onChange={set('needed')} aria-invalid={neededBad || undefined} />
                {neededBad
                  ? <span className="field-error">Earlier than the earliest ready date ({fmtDate(ready)}). Agree a later date with the customer.</span>
                  : <span className="field-help">Earliest ready date: {fmtDate(ready)}</span>}
              </label>
              <label className="field"><span className="field-label">Notes<span className="opt">Optional</span></span>
                <textarea className="input" maxLength={1000} placeholder="Anything the workshop should know" value={c.notes} onChange={set('notes')} />
                {c.notes.length > 900 && <span className="field-help">{1000 - c.notes.length} characters left</span>}
              </label>
            </div>
          </Card>
        </div>
        <Card title="How will the design be given?" sub="Choose one">
          <div className="tiles" role="group" aria-label="Design input">
            {(Object.keys(METHODS) as Mode[]).map(k => (
              <button key={k} type="button" className="tile" aria-pressed={s.mode === k} onClick={() => dispatch({ type: 'mode', mode: k })}>
                <span className="tile-ic">{METHOD_ICONS[k]}</span>
                <span><b>{METHODS[k].title}</b><span className="t">{METHODS[k].text}</span></span>
                <span className="tick"><IconCheck size={13} strokeWidth={3} /></span>
              </button>
            ))}
          </div>
        </Card>
      </Page>
      <ActionBar info={can ? <>Ready for <b>{c.ornament.trim()}</b></> : 'Name, a 10-digit phone and the ornament name are required.'}>
        {/* Not disabled: tapping it reveals what is missing. */}
        <button className="btn primary lg" aria-disabled={!can} onClick={() => { if (can) dispatch({ type: 'go', step: 1 }); else setTried(true); }}>
          Continue to design<IconArrowRight />
        </button>
      </ActionBar>
    </>
  );
}

/* ============================ STEP 2: DESIGN ============================ */
export function DesignStep({ s, dispatch }: StepProps) {
  const back = <Back onClick={() => dispatch({ type: 'go', step: 0 })} />;

  if (s.mode === 'picture') {
    return (
      <>
        <Page step={1} title={s.photo ? 'Check the photo' : 'Photograph the ornament'} desc="Size is estimated from the picture, so the price shows as a range until the CAD model is made.">
          <div className="grid wide">
            {s.photo
              ? (
                <div className="media photo">
                  <span className="m-ic"><IconCamera size={26} /></span>
                  <b>Photo of the ornament</b>
                  <span className="faint" style={{ color: 'inherit' }}>Captured 12:01 PM ET</span>
                </div>
              )
              : (
                <div className="media capture">
                  <span className="m-ic"><IconCamera size={26} /></span>
                  <b>Ready to capture</b>
                  <span>Place the ornament flat on a plain background, with a ruler or coin in frame.</span>
                </div>
              )}
            <Card title={s.photo ? 'Does the photo pass?' : 'Before you take the photo'}>
              <ul className="tips">
                <li><IconCheck />Whole ornament in frame</li>
                <li><IconCheck />Ruler or coin visible for scale</li>
                <li><IconCheck />Sharp and well lit</li>
              </ul>
            </Card>
          </div>
        </Page>
        <ActionBar>
          {back}
          {s.photo
            ? (
              <>
                <button className="btn lg" onClick={() => dispatch({ type: 'photo', on: false })}><IconRotate />Retake</button>
                <button className="btn primary lg" onClick={() => dispatch({ type: 'continueToEstimate' })}>Use this photo<IconArrowRight /></button>
              </>
            )
            : <button className="btn primary lg" onClick={() => dispatch({ type: 'photo', on: true })}><IconCamera />Take photo</button>}
        </ActionBar>
      </>
    );
  }

  const p = ok(s);
  const valid = dimsOk(s.dims);
  return (
    <>
      <Page step={1} title="Size and materials" desc="Enter the outer size, then choose the metal and stones.">
        <div className="grid wide">
          <Card title="Size" sub="Width × height × depth, in millimetres">
            <DimFields s={s} dispatch={dispatch} />
            {!valid && DIM_HELP}
            <div className="hr" />
            <div className="section-label">Metal</div>
            <MetalChips s={s} dispatch={dispatch} />
            <div className="section-label">Stones <span>0.20 ct total</span></div>
            <StoneChips s={s} dispatch={dispatch} />
          </Card>
          <Card title="Preview" sub="Updates as you change the size, metal or stones">
            {valid
              ? <>
                <Total label="Estimated price" value={p.total} note={`incl. ${TAX_SHORT}`} />
                <Proportions share={{ metal: p.shareMetal, stone: p.shareStone, making: p.shareMaking }} />
              </>
              : <div className="notice warn"><IconAlert /><span>Enter a valid size to see the price.</span></div>}
          </Card>
        </div>
      </Page>
      <ActionBar info={valid ? <>Estimate <span className="price">{money(p.total)}</span></> : undefined}>
        {back}
        <button className="btn primary lg" disabled={!valid} onClick={() => dispatch({ type: 'continueToEstimate' })}>
          Continue to estimate<IconArrowRight />
        </button>
      </ActionBar>
    </>
  );
}

/* ============================ STEP 3: ESTIMATE ============================ */
function FitBadge({ o, b }: { o: Option; b: number | null }) {
  if (b === null) return null;
  if (o.high <= b) return <span className="badge ok">Within budget</span>;
  if (o.low <= b) return <span className="badge warn">May exceed</span>;
  return <span className="badge bad">Over by {money(o.low - b)}</span>;
}

export function EstimateStep({ s, dispatch, onShowRates }: StepProps & { onShowRates: () => void }) {
  const { spot, status } = useRates();
  const cur = ok(s);
  const isOrig = s.orig !== null && s.orig.metal === s.metal && s.orig.stone === s.stone;
  const valid = dimsOk(s.dims);
  const all = allOptions(s.dims, s.mode, s.exact, orderSpot(s));
  const b = s.budget;
  const mayFit = b === null ? [] : all.filter(o => o.low <= b);
  const sure = b === null ? [] : all.filter(o => o.high <= b);
  const list = (s.fitOnly && b !== null ? mayFit : all)
    .slice()
    .sort((x, y) => (b === null ? x.total - y.total : Math.abs(b - x.total) - Math.abs(b - y.total)));
  const curOver = b !== null && cur.low > b;
  const blocked = curOver || !valid;
  const curMay = b !== null && !curOver && cur.high > b;

  const budgetSummary = b === null
    ? 'Enter the budget to see which combinations fit.'
    : mayFit.length
      ? <><b>{sure.length} of {all.length}</b> combinations are within {money(b)}. <b>{mayFit.length - sure.length}</b> may exceed it once the CAD model is made.</>
      : <>No combination fits {money(b)}. The lowest is <b>{money(all[0].low)}</b>. Try a higher budget or a smaller size.</>;

  const bottomInfo = !valid
    ? <span style={{ color: 'var(--bad)' }}>Fix the size to continue.</span>
    : curOver
    ? <span style={{ color: 'var(--bad)' }}><b style={{ color: 'inherit' }}>{money(cur.total)}</b> is over the budget. Pick a combination that fits.</span>
    : <>
      <b>{KARATS[s.metal].label} · {STONES[s.stone].label}</b>{' '}
      <span className="price">{money(cur.total)}</span>
      {curMay && <span style={{ color: 'var(--warn)' }}> · may exceed budget after CAD</span>}
      {b !== null && !curMay && <span style={{ color: 'var(--ok)' }}> · within budget</span>}
    </>;

  return (
    <>
      <Page
        step={2}
        title="Estimate"
        desc={<>{status === 'live' ? 'Priced at live' : status === 'stale' ? 'Priced at last saved' : 'Priced at sample'} metal rates ({rateTime(spot)}). <button className="link inline" onClick={onShowRates}>View rates</button></>}
      >
        <div className="grid side">
          <div className="stack">
            <Card
              title="Price breakdown"
              action={s.exact ? <span className="badge ok"><IconCheck size={12} strokeWidth={3} />Exact · CAD</span> : <span className="badge warn">Estimate</span>}
            >
              {s.mode === 'picture'
                ? <div className="notice accent"><IconCamera /><span>Size estimated from the photo</span></div>
                : <DimTiles s={s} />}
              <div className="kv-list">
                <Kv label={`${KARATS[s.metal].label} · ${cur.grams.toFixed(2)} g`} value={money(cur.metal)} />
                <Kv label={`${STONES[s.stone].label} · 0.20 ct`} value={money(cur.stone)} />
                <Kv label="Making and setting" value={money(cur.making)} />
                <Kv label="Subtotal" value={money(cur.subtotal)} cls="soft" />
                <Kv label={STORE.taxLabel} value={money(cur.tax)} cls="soft" />
              </div>
              <Total label="Estimated price" value={cur.total} note={s.exact ? 'Locked by CAD model' : 'Final price after CAD'} />
              {!isOrig && (
                <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'resetOriginal' })}>
                  <IconRotate size={15} />Reset to original design
                </button>
              )}
            </Card>
            <Card title="Edit design">
              <DimFields s={s} dispatch={dispatch} />
              {!valid && DIM_HELP}
              <div className="section-label">Metal</div>
              <MetalChips s={s} dispatch={dispatch} />
              <div className="section-label">Stones</div>
              <StoneChips s={s} dispatch={dispatch} />
            </Card>
          </div>

          <div className="stack">
            {!s.showBudget
              ? (
                <Card title="Customer budget" sub="Optional">
                  <p className="muted">If the customer has a budget, enter it to see every metal and stone combination that fits, with its cost and proportions.</p>
                  <div><button className="btn" onClick={() => dispatch({ type: 'showBudget' })}><IconPlus />Enter customer budget</button></div>
                </Card>
              )
              : (
                <Card
                  title="Customer budget"
                  action={<button className="btn ghost icon" aria-label="Remove budget" onClick={() => dispatch({ type: 'hideBudget' })}><IconX /></button>}
                >
                  <div className="row">
                    <label className="affix prefix" style={{ flex: '1 1 200px' }}>
                      <span className="sr-only">Budget in dollars</span>
                      <span className="unit">$</span>
                      <input
                        className="input xl num"
                        type="number" inputMode="numeric" min="1" step="10" placeholder="Budget"
                        value={b ?? ''}
                        onChange={e => {
                          const n = parseFloat(e.target.value);
                          dispatch({ type: 'budget', value: Number.isFinite(n) && n > 0 ? n : null });
                        }}
                      />
                    </label>
                    <Choices label="Quick budget" options={['500', '750', '1000'] as const} value={b === null ? '' : (String(b) as '500')}
                      onChange={v => dispatch({ type: 'budget', value: Number(v) })} render={v => `$${Number(v).toLocaleString()}`} />
                  </div>
                  <p className="muted">{budgetSummary}</p>
                  <div className="segmented" role="group" aria-label="Filter combinations" style={{ alignSelf: 'flex-start' }}>
                    <button aria-pressed={s.fitOnly} onClick={() => dispatch({ type: 'fit', fitOnly: true })}>Fits budget</button>
                    <button aria-pressed={!s.fitOnly} onClick={() => dispatch({ type: 'fit', fitOnly: false })}>All combinations</button>
                  </div>
                </Card>
              )}

            {s.showBudget && valid && (
              <div className="options">
                {b !== null && s.fitOnly && mayFit.length === 0
                  ? <div className="notice bad"><IconAlert /><span>Nothing fits this budget at the current size. Raise the budget, or reduce the size on the left.</span></div>
                  : list.map(o => {
                    const over = b !== null && o.low > b;
                    const sel = s.metal === o.metalKey && s.stone === o.stoneKey;
                    return (
                      <button
                        key={`${o.metalKey}-${o.stoneKey}`}
                        type="button"
                        className="option"
                        aria-pressed={sel}
                        disabled={over}
                        onClick={() => dispatch({ type: 'select', metal: o.metalKey, stone: o.stoneKey })}
                      >
                        <div>
                          <div className="o-name">
                            {sel && <span className="o-sel"><IconCheck size={16} strokeWidth={3} /></span>}
                            {KARATS[o.metalKey].label} · {STONES[o.stoneKey].label}
                          </div>
                          <div className="o-meta num">{o.grams.toFixed(2)} g metal · 0.20 ct · metal {money(o.metal)} + stones {money(o.stone)} + making {money(o.making)}</div>
                        </div>
                        <div className="o-price"><b>{money(o.total)}</b><FitBadge o={o} b={b} /></div>
                        <div className="o-bar">
                          <Proportions legend={false} share={{ metal: o.shareMetal, stone: o.shareStone, making: o.shareMaking }} />
                        </div>
                      </button>
                    );
                  })}
                {list.length > 0 && !(b !== null && s.fitOnly && mayFit.length === 0) && (
                  <div className="legend" style={{ padding: '4px 4px 0' }}>
                    <span><i style={{ background: 'var(--metal)' }} />Metal</span>
                    <span><i style={{ background: 'var(--stone)' }} />Stones</span>
                    <span><i style={{ background: 'var(--making)' }} />Making</span>
                    <span className="spacer" />
                    <span>Breakdowns are before tax</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Page>
      <ActionBar info={bottomInfo}>
        <Back onClick={() => dispatch({ type: 'go', step: 1 })} />
        <button className="btn primary lg" disabled={blocked} onClick={() => dispatch({ type: 'go', step: 3 })}>
          Confirm and make CAD<IconArrowRight />
        </button>
      </ActionBar>
    </>
  );
}

/* ============================ STEP 4: CAD ============================ */
export function CadStep({ s, dispatch }: StepProps) {
  const p = ok(s);
  const rules = cadRules(s.dims);
  const allOk = allCadOk(s.dims);
  const banner = s.exact
    ? <div className="notice ok lg"><IconCheck /><span>CAD model ready. Exact volume and price are locked for this size.</span></div>
    : allOk
      ? <div className="notice accent lg"><IconInfo /><span>Generate the CAD model to lock the exact volume and price. Until then the price is an estimate.</span></div>
      : <div className="notice bad lg"><IconAlert /><span>A rule check failed. Change the size on the estimate page before generating the CAD model.</span></div>;

  return (
    <>
      <Page step={3} title="CAD model" desc="Check the model and the casting rules, then lock the price.">
        {banner}
        <div className="grid wide">
          <CadViews dims={s.dims} />
          <div className="stack">
            <Card title="Specification" sub="Size is fixed by the design">
              <DimTiles s={s} />
              <div className="kv-list">
                <Kv label="Metal" value={`${KARATS[s.metal].label} · ${p.grams.toFixed(2)} g`} />
                <Kv label="Stones" value={`${STONES[s.stone].label} · 0.20 ct`} />
              </div>
              <Total label="Price incl. tax" value={p.total} note={s.exact ? 'Locked by CAD model' : 'Estimate'} />
            </Card>
            <Card title="Rule checks">
              <div className="rules">
                {rules.map(r => (
                  <div className={`rule ${r.ok ? 'ok' : 'bad'}`} key={r.label}>
                    <span className="r-ic">{r.ok ? <IconCheck size={13} strokeWidth={3} /> : <IconX size={13} strokeWidth={3} />}</span>
                    <span>{r.label}</span>
                    <span className="r-detail">{r.detail}</span>
                  </div>
                ))}
              </div>
              <p className="faint">Print tolerance is ±5% (minimum ±0.35 mm). Exact volume comes from this model.</p>
            </Card>
          </div>
        </div>
      </Page>
      <ActionBar>
        <Back label="Edit estimate" onClick={() => dispatch({ type: 'go', step: 2 })} />
        {s.exact
          ? <button className="btn primary lg" onClick={() => dispatch({ type: 'go', step: 4 })}><IconCheck />Customer approves</button>
          : <button className="btn primary lg" disabled={!allOk} onClick={() => dispatch({ type: 'generateCad' })}><IconCube />Generate CAD model</button>}
      </ActionBar>
    </>
  );
}

/* ============================ STEP 5: CONFIRM ============================ */
function SyncNotice({ id }: { id: string }) {
  const item = useOutbox().find(i => i.id === id);
  if (!item) return null;
  if (item.status === 'saved') return <div className="notice ok"><IconCheck /><span>Saved to the order database.</span></div>;
  if (item.status === 'rejected') {
    return (
      <div className="notice bad">
        <IconAlert />
        <span style={{ flex: 1 }}>The database refused this order: {item.error}. It is kept on this tablet.</span>
        <button className="btn" onClick={() => retry(id)}>Retry</button>
      </div>
    );
  }
  return (
    <div className="notice warn">
      <IconInfo />
      <span style={{ flex: 1 }}>
        {item.attempts === 0 ? 'Saving to the order database…' : `Not saved yet (${item.error}). It is kept on this tablet and will retry automatically.`}
      </span>
      {item.attempts > 0 && <button className="btn" onClick={() => retry(id)}>Retry now</button>}
    </div>
  );
}

export function ConfirmStep({ s, dispatch }: StepProps) {
  const { spot: liveSpot, status: rateStatus } = useRates();
  const [sending, setSending] = useState(false);
  const o = ok(s);
  const c = s.cust;
  const ready = readyDate(s.metal, s.stone, s.mode);
  const needed = c.needed && validISODate(c.needed) ? parseISO(c.needed) : null;
  const dateOk = !needed || needed >= ready;
  const depositAmt = cents((o.total * s.deposit) / 100);
  const balance = cents(o.total - depositAmt);
  const src = s.mode === 'picture' ? 'Photo, size estimated' : 'Dimensions entered';
  const missing = missingForSend(s);
  const sampleRates = s.lockedSpot ? isSampleSpot(s.lockedSpot) : isSampleSpot(liveSpot);

  const send = async () => {
    if (missing.length) return;
    setSending(true);
    try {
      const at = new Date().toISOString();
      // Queue the row first, then mark the order sent; the outbox keeps it until Supabase confirms.
      submitOrder(buildOrderRecord({ ...s, sentAt: at }));
      dispatch({ type: 'send', at });
    } finally {
      setSending(false);
    }
  };

  const checkItem = (key: keyof typeof s.checks, text: ReactNode, disabled = false) => (
    <label className="check">
      <input
        type="checkbox"
        checked={s.checks[key]}
        disabled={s.sent || disabled}
        onChange={e => dispatch({ type: 'check', key, on: e.target.checked })}
      />
      <span>{text}</span>
    </label>
  );
  const done = Object.values(s.checks).filter(Boolean).length;

  return (
    <>
      <Page step={4} title="Review and send" desc="Confirm the details with the customer, collect the deposit, then send to the workshop.">
        {s.sent && (
          <div className="notice ok lg">
            <IconCheck />
            <span>Order #{s.orderNo} sent to the workshop for {c.ornament}. Ready by {fmtDate(ready)}.</span>
          </div>
        )}
        {s.sent && <SyncNotice id={s.id} />}
        <div className="grid">
          <div className="stack">
            <Card title="Customer">
              <div className="kv-list">
                <Kv label="Name" value={c.name} />
                <Kv label="Phone" value={c.phone} />
                {c.email && <Kv label="Email" value={c.email} />}
                {c.occasion && <Kv label="Occasion" value={c.occasion} />}
                {needed && <Kv label="Needed by" value={fmtDate(needed)} />}
              </div>
              {c.notes && <div className="notice" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.notes}</div>}
            </Card>
            <Card title={c.ornament} sub={src}>
              <DimTiles s={s} />
              <div className="kv-list">
                <Kv label="Metal" value={`${KARATS[s.metal].label} · ${o.grams.toFixed(2)} g`} />
                <Kv label="Stones" value={`${STONES[s.stone].label} · 0.20 ct`} />
              </div>
              <div className="section-label">Proportions <span>fixed by design</span></div>
              <Proportions share={{ metal: o.shareMetal, stone: o.shareStone, making: o.shareMaking }} />
            </Card>
            <Card title="Workshop schedule">
              <Kv label="Earliest ready date" value={fmtDate(ready)} />
              {c.needed && !validISODate(c.needed)
                ? <div className="notice bad"><IconAlert /><span>The needed-by date is not a valid date. Fix it on the customer page.</span></div>
                : needed && !dateOk
                  ? <div className="notice bad"><IconAlert /><span>The needed-by date ({fmtDate(needed)}) is earlier than the earliest ready date. Change the date on the customer page, or agree a later date with the customer.</span></div>
                  : <div className="notice ok"><IconCheck /><span>{needed ? 'Needed-by date is achievable.' : 'No needed-by date set.'}</span></div>}
            </Card>
          </div>

          <div className="stack">
            <Card
              title="Price"
              action={s.lockedSpot ? <span className="badge ok">Locked</span> : <span className="badge warn">Live rates</span>}
            >
              <div className="kv-list">
                <Kv label="Metal" value={money(o.metal)} />
                <Kv label="Stones" value={money(o.stone)} />
                <Kv label="Making and setting" value={money(o.making)} />
                <Kv label="Subtotal" value={money(o.subtotal)} cls="soft" />
                <Kv label={STORE.taxLabel} value={money(o.tax)} cls="soft" />
              </div>
              <Total label="Total" value={o.total} />
              <p className="faint">
                {s.lockedSpot
                  ? <>Locked at metal rates from {rateTime(s.lockedSpot)} ({s.lockedSpot.source}).</>
                  : <>Follows live metal rates until the price is agreed below{rateStatus !== 'live' ? ' (rates are not live right now)' : ''}.</>}
              </p>
            </Card>

            <Card title="Deposit" sub="Due before the workshop starts">
              <div className="segmented" role="group" aria-label="Deposit percentage" style={{ alignSelf: 'flex-start' }}>
                {STORE.deposits.map(p => (
                  <button key={p} aria-pressed={s.deposit === p} disabled={s.sent} onClick={() => dispatch({ type: 'deposit', value: p })}>{p}%</button>
                ))}
              </div>
              <div className="kv-list">
                <Kv label={`Deposit (${s.deposit}%)`} value={money(depositAmt)} />
                <Kv label="Balance due at pickup" value={money(balance)} cls="soft" />
              </div>
            </Card>

            <Card title="Cross-check before sending" action={<span className={`badge ${done === 4 ? 'ok' : ''}`}>{done} of 4</span>}>
              {!s.exact && <div className="notice warn"><IconAlert /><span>Generate the CAD model on the previous step before sending.</span></div>}
              {sampleRates && !s.sent && <div className="notice bad"><IconAlert /><span>Live metal rates are not available, so this order cannot be priced yet. Check the connection, then open Rates and tap Refresh.</span></div>}
              <div className="checklist">
                {checkItem('details', 'Customer name, phone and dates are correct')}
                {checkItem('design', 'Ornament size, metal and stones are approved')}
                {checkItem('price', <>Price of <b>{money(o.total)}</b> is agreed</>, sampleRates && !s.checks.price)}
                {checkItem('deposit', <>Deposit of <b>{money(depositAmt)}</b> collected</>, !s.checks.price)}
              </div>
            </Card>
          </div>
        </div>
      </Page>
      <ActionBar info={s.sent ? <>Sent · ready by <b>{fmtDate(ready)}</b></> : missing.length ? <>Missing: {missing.join(', ')}</> : <b>Ready to send</b>}>
        {s.sent
          ? <button className="btn dark lg" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo(), id: uuid() })}><IconPlus />Start a new order</button>
          : (
            <>
              <Back onClick={() => dispatch({ type: 'go', step: 3 })} />
              <button className="btn primary lg" disabled={missing.length > 0 || sending} onClick={send}>
                {sending ? <><IconRotate /><span>Sending...</span></> : <><IconSend />Send to workshop</>}
              </button>
            </>
          )}
      </ActionBar>
    </>
  );
}
