import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { anatomy, layerSummary, type AnatomyLayer } from '../lib/anatomy'
import type { Dish } from '../lib/dish'
import { DRAW_SECONDS, plateLayersMarkup } from '../lib/plate'
import { StepItem } from '../screens/Home'

// The plate's 300×270 drawing sits at x 0–300; leaders run on to x 400. y −75 clears the herbs
// lifted 4 × 46 above a half-height plate; 255 the flat, stacked plate's foot (drawings keep a margin).
const VB_TOP = -75, VB_H = 330, CY = 135, GAP_WIDE = 46
/** Where each layer's leader line starts: the plate is wider than the food on it. */
const LEAD = [287, 232, 232, 220, 220]

const query = (q: string, fallback: boolean) => (typeof matchMedia === 'function' ? matchMedia(q).matches : fallback)
const prefersStill = () => query('(prefers-reduced-motion: reduce)', false)
// Labels sit beside the plate only where the column is tall enough for them not to collide.
const WIDE = '(min-width: 960px)'

/** Wide screens get label leaders to the right of the plate; narrow ones list the labels below. */
function useWide(): boolean {
  const [wide, setWide] = useState(() => query(WIDE, true))
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(WIDE), on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

const v = (i: number) => ({ '--i': i }) as CSSProperties

export function ExplodedPlate({ d }: { d: Dish }) {
  const parts = useMemo(() => anatomy(d), [d])
  const [still] = useState(prefersStill)
  const wide = useWide()
  const markup = useMemo(() => plateLayersMarkup(d, still ? { kind: 'static' } : { kind: 'draw' }), [d, still])
  const [apart, setApart] = useState(still)
  const [drawn, setDrawn] = useState(still)
  const [picked, setPicked] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const opening = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (still) return
    opening.current = setTimeout(() => { setDrawn(true); setApart(true) }, DRAW_SECONDS * 1000 + 300)
    return () => clearTimeout(opening.current)
  }, [still])

  // Escape clears a selection wherever focus is (a tapped layer focuses nothing).
  useEffect(() => {
    if (picked == null) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setPicked(null); setHover(null) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [picked])

  const active = picked ?? hover
  // Touch leaves a hover behind after a tap, so a pick always clears it.
  const pick = (i: number) => { setHover(null); setPicked(p => (p === i ? null : i)) }
  const toggle = () => { clearTimeout(opening.current); setDrawn(true); setApart(a => !a) }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setPicked(null); setHover(null); return }
    const i = buttons.current.findIndex(b => b === document.activeElement)
    if (i < 0) return
    const next = e.key === 'ArrowUp' ? i + 1 : e.key === 'ArrowDown' ? i - 1 : -1
    if (next >= 0 && next < parts.length) { e.preventDefault(); buttons.current[next]?.focus(); setPicked(next) }
  }

  return (
    <div
      className={'anatomy' + (still ? '' : ' draw') + (drawn ? ' is-drawn' : '') + (apart ? ' is-apart' : '') + (active != null ? ' has-pick' : '')}
      onKeyDown={onKey}
    >
      <div
        className="anatomy__stage"
        onClick={e => { if (!(e.target as Element).closest('.anatomy__layer, .anatomy__label')) { setPicked(null); setHover(null) } }}
      >
        <svg className="anatomy__svg" viewBox={`0 ${VB_TOP} ${wide ? 400 : 300} ${VB_H}`} role="img" aria-label={`Exploded drawing of ${d.title}, in five layers`}>
          {markup.map((m, i) => (
            // Markup is plate.ts geometry only — numbers and hex colours, never dish text.
            <g
              key={i}
              className={'anatomy__layer' + (active === i ? ' is-on' : '')}
              style={v(i)}
              onClick={() => pick(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              dangerouslySetInnerHTML={{ __html: m }}
            />
          ))}
          <g className="anatomy__leaders" aria-hidden="true">
            {parts.map((_, i) => <line key={i} x1={LEAD[i]} x2={400} y1={CY} y2={CY} style={v(i)} />)}
          </g>
          <g className="anatomy__badges" aria-hidden="true">
            {parts.map((_, i) => (
              <g key={i} style={v(i)}>
                <circle cx={14} cy={CY} r={8} />
                <text x={14} y={CY + 3.5} textAnchor="middle">{i + 1}</text>
              </g>
            ))}
          </g>
        </svg>
        <ol className="anatomy__labels">
          {parts.map((p, i) => (
            <li key={p.name} style={{ ...v(i), top: `${((CY - i * GAP_WIDE - VB_TOP) / VB_H) * 100}%` }}>
              <button
                type="button"
                ref={el => { buttons.current[i] = el }}
                className={'anatomy__label' + (active === i ? ' is-on' : '')}
                aria-pressed={picked === i}
                onClick={() => pick(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="anatomy__n">{i + 1}</span>
                <span className="anatomy__name">{p.label} — {p.caption}</span>
                <span className="anatomy__line">{layerSummary(p)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="anatomy__actions">
        <button type="button" className="btn btn--secondary" onClick={toggle}>
          {apart ? 'Put it back together' : 'Pull it apart'}
        </button>
      </div>
      {active != null && <LayerDetail p={parts[active]} />}
    </div>
  )
}

function LayerDetail({ p }: { p: AnatomyLayer }) {
  return (
    <section className="anatomy__detail" aria-live="polite">
      <h3 className="section-label">{p.label} · {p.caption}</h3>
      {p.ingredients.length > 0 && (
        <ul className="ingredients">
          {p.ingredients.map(i => (
            <li key={i.role + i.name}><span className="role">{i.role}</span><span>{i.name}</span><span className="grams">{i.g} g</span></li>
          ))}
        </ul>
      )}
      {p.steps.length > 0 && <ol className="steps">{p.steps.map(s => <StepItem key={s.n} {...s} />)}</ol>}
      {!p.ingredients.length && !p.steps.length && <p className="lede">{p.caption}. Everything else sits on it.</p>}
    </section>
  )
}
