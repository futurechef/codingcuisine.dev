import { useEffect, useMemo, useRef, useState } from 'react'
import type { Kitchen } from '../App'
import { blend, byAmplitude, chain, dft, tip, type Coef, type Pt } from '../lib/fourier'
import { navigate } from '../lib/router'
import { N, plateLoop, wordmarkLoop, type Loop } from '../lib/welcome-paths'

const STEPS = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256]
const SKETCH = 16

// Timeline, seconds.
const T_SKETCH = 3.2, T_WRITE = 6.5, T_HOLD = 1.2, T_MORPH = 2.4, T_PLATE = 5.5
const AT_WRITE = T_SKETCH, AT_HOLD = AT_WRITE + T_WRITE, AT_MORPH = AT_HOLD + T_HOLD, AT_PLATE = AT_MORPH + T_MORPH, AT_END = AT_PLATE + T_PLATE

interface Shape { loop: Loop; coefs: Coef[]; ordered: Coef[] }
const shape = (loop: Loop): Shape => { const coefs = dft(loop.pts); return { loop, coefs, ordered: byAmplitude(coefs) } }

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)

/** Pen-down runs traced by the first m circles between loop times t0 and t1. */
function trace(s: Shape, m: number, t0: number, t1: number, into: Pt[][]) {
  const step = 1 / 2400
  let run: Pt[] | null = into.length ? into[into.length - 1] : null
  for (let t = t0; t <= t1 + 1e-9; t += step) {
    const down = s.loop.pen[Math.min(N - 1, Math.floor(t * N))]
    if (!down) { run = null; continue }
    if (!run) { run = []; into.push(run) }
    run.push(tip(s.ordered, m, t))
  }
  if (into.length && into[into.length - 1].length === 0) into.pop()
}

function full(s: Shape, m: number): Pt[][] {
  const out: Pt[][] = []
  trace(s, m, 0, 1 - 1e-6, out)
  return out
}

export function Welcome({ k }: { k: Kitchen }) {
  const word = useMemo(() => shape(wordmarkLoop()), [])
  const plate = useMemo(() => shape(plateLoop()), [])
  const canvas = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState(STEPS.indexOf(128))
  const [label, setLabel] = useState('')
  const [run, setRun] = useState(0)
  const [seed, setSeed] = useState('')
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // Slider changes after the run has finished (or with reduced motion) redraw the final frame.
  const settled = useRef(false)
  const m = STEPS[step]

  useEffect(() => {
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    let raf = 0, start = 0, last = 0
    const ghost: Pt[][] = [], wordInk: Pt[][] = [], plateInk: Pt[][] = []
    const finished = settled.current || reduced
    // Reduced motion shows the finished wordmark; a completed run rests on the plate.
    let staticFinal: 'word' | 'plate' | null = finished ? (reduced ? 'word' : 'plate') : null
    let shown = ''
    const say = (l: string) => { if (l !== shown) { shown = l; setLabel(l) } }

    const colours = () => {
      const cs = getComputedStyle(document.documentElement)
      const v = (n: string) => cs.getPropertyValue(n).trim()
      return { ink: v('--ink'), rule: v('--rule'), mute: v('--mute'), acc: v('--acc') }
    }
    let col = colours()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => { col = colours(); if (staticFinal) drawStatic() }
    mq.addEventListener('change', onScheme)

    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr)
      return { W: cv.width, H: cv.height, dpr }
    }
    let dim = size()
    const ro = new ResizeObserver(() => { dim = size(); if (staticFinal) drawStatic() })
    ro.observe(cv)

    // Shape units → pixels. The wordmark spans the width; the plate fits the height.
    const scaleFor = (which: 'word' | 'plate') =>
      which === 'word' ? Math.min((dim.W * 0.88) / 2, (dim.H * 0.9) / 0.5) : (Math.min(dim.W, dim.H) * 0.84) / 2

    const lines = (runs: Pt[][], s: number, colour: string, width: number, alpha = 1) => {
      if (alpha <= 0) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = colour
      ctx.lineWidth = width * dim.dpr
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath()
      for (const r of runs) {
        r.forEach(([x, y], i) => (i ? ctx.lineTo(dim.W / 2 + x * s, dim.H / 2 + y * s) : ctx.moveTo(dim.W / 2 + x * s, dim.H / 2 + y * s)))
      }
      ctx.stroke()
      ctx.restore()
    }

    const circles = (ordered: Coef[], count: number, t: number, s: number) => {
      const c = chain(ordered, count, t)
      const px = (p: Pt): Pt => [dim.W / 2 + p[0] * s, dim.H / 2 + p[1] * s]
      ctx.save()
      ctx.lineWidth = 1 * dim.dpr
      for (let i = 1; i < c.length; i++) {
        const r = ordered[i - 1].amp * s
        if (ordered[i - 1].freq === 0 || r < 0.8 * dim.dpr) continue
        const [x, y] = px(c[i - 1])
        ctx.globalAlpha = Math.max(0.08, 0.38 - i * 0.004)
        ctx.strokeStyle = col.mute
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = col.acc
      ctx.beginPath()
      c.forEach((p, i) => { const [x, y] = px(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
      ctx.stroke()
      const [tx, ty] = px(c[c.length - 1])
      ctx.globalAlpha = 1
      ctx.fillStyle = col.acc
      ctx.beginPath(); ctx.arc(tx, ty, 3 * dim.dpr, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    function drawStatic() {
      ctx.clearRect(0, 0, dim.W, dim.H)
      const which = staticFinal!
      const s = which === 'word' ? word : plate
      lines(full(s, m), scaleFor(which), col.ink, 1.6)
      say(`${m} CIRCLES · ${which === 'word' ? 'HANDWRITING' : 'PLATE'}`)
    }

    if (staticFinal) { drawStatic() } else {
      const frame = (now: number) => {
        if (!start) { start = now; last = 0 }
        const T = (now - start) / 1000
        ctx.clearRect(0, 0, dim.W, dim.H)
        const sw = scaleFor('word'), sp = scaleFor('plate')

        if (T < AT_WRITE) {
          const t = T / T_SKETCH
          trace(word, SKETCH, last / T_SKETCH, t, ghost)
          lines(ghost, sw, col.mute, 1.2, 0.55)
          circles(word.ordered, SKETCH, t, sw)
          say(`${SKETCH} CIRCLES · SKETCH`)
        } else if (T < AT_HOLD) {
          const t = (T - AT_WRITE) / T_WRITE, t0 = Math.max(0, (last - AT_WRITE) / T_WRITE)
          trace(word, m, t0, t, wordInk)
          lines(ghost, sw, col.rule, 1.2, 0.8)
          lines(wordInk, sw, col.ink, 1.6)
          circles(word.ordered, m, t, sw)
          say(`${m} CIRCLES · HANDWRITING`)
        } else if (T < AT_MORPH) {
          lines(ghost, sw, col.rule, 1.2, 0.8)
          lines(wordInk, sw, col.ink, 1.6)
          circles(word.ordered, m, 0, sw)
        } else if (T < AT_PLATE) {
          const u = ease((T - AT_MORPH) / T_MORPH)
          lines(ghost, sw, col.rule, 1.2, 0.8 * (1 - u * 1.6))
          lines(wordInk, sw, col.ink, 1.6, 1 - u * 1.4)
          const mixed = byAmplitude(blend(word.coefs, plate.coefs, u))
          circles(mixed, m, 0, sw + (sp - sw) * u)
          say('MORPHING')
        } else if (T < AT_END) {
          const t = (T - AT_PLATE) / T_PLATE, t0 = Math.max(0, (last - AT_PLATE) / T_PLATE)
          trace(plate, m, t0, t, plateInk)
          lines(plateInk, sp, col.ink, 1.6)
          circles(plate.ordered, m, t, sp)
          say(`${m} CIRCLES · PLATE`)
        } else {
          settled.current = true
          staticFinal = 'plate'
          drawStatic()
          return
        }
        last = T
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }

    return () => { cancelAnimationFrame(raf); ro.disconnect(); mq.removeEventListener('change', onScheme) }
  }, [word, plate, run, reduced, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const plateIt = () => {
    const w = seed.trim() || k.word
    navigate('/plate?w=' + encodeURIComponent(w))
    k.plate(w)
  }

  return (
    <main className="screen welcome">
      <div className="eyebrow">CODINGCUISINE.DEV · PLATEDRAW</div>
      <figure className="epicycles">
        <canvas
          ref={canvas}
          className="epicycles__canvas"
          role="img"
          aria-label={`Animation: ${m} spinning circles linked tip to tail write “codingcuisine”, then morph and draw a plate.`}
        />
        <figcaption className="epicycles__bar">
          <span className="mono-label" aria-live="off">{label}</span>
          <label className="epicycles__slider">
            <span className="mono-label">CIRCLES</span>
            <input
              type="range" min={0} max={STEPS.length - 1} step={1} value={step}
              aria-valuetext={`${m} circles`}
              onChange={e => { setStep(+e.target.value); if (!settled.current && !reduced) settled.current = true }}
            />
            <span className="mono-label epicycles__count">{m}</span>
          </label>
          {!reduced && (
            <button type="button" className="btn btn--ghost" onClick={() => { settled.current = false; setRun(r => r + 1) }}>
              Replay
            </button>
          )}
        </figcaption>
      </figure>

      <div className="welcome__intro">
        <h1 className="display display--flush">Food, drawn by code.</h1>
        <p className="lede">
          {m} spinning circles, each with its own size, speed and starting angle, linked tip to tail.
          The last tip writes the name, then draws a plate. Fewer circles, rougher line; more circles, finer hand.
        </p>
        <p className="lede lede--mute">
          Every dish here is drawn by code too. Give it a word and you get a recipe and a pen drawing of the plate. Same word, same dish, always.
        </p>
        <form className="welcome__form" onSubmit={e => { e.preventDefault(); plateIt() }}>
          <label htmlFor="welcome-seed" className="sr-only">Seed word</label>
          <input
            id="welcome-seed" className="seed-input welcome__input" value={seed} onChange={e => setSeed(e.target.value)}
            placeholder="take a leek" autoComplete="off" spellCheck={false} maxLength={60}
          />
          <button type="submit" className="btn btn--primary">Plate it</button>
        </form>
        <nav className="welcome__links" aria-label="More">
          <a href="/today" onClick={e => { e.preventDefault(); navigate('/today') }}>Today’s dish →</a>
          <a href="/guide" onClick={e => { e.preventDefault(); navigate('/guide') }}>Field guide →</a>
        </nav>
      </div>
    </main>
  )
}
