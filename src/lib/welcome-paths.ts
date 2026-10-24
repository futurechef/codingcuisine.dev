// The two loops the welcome page draws: the wordmark and a plate.
// Each is a list of pen strokes, resampled into one closed loop of N points
// with a pen-down flag per point (pen-up between strokes and on the way home).

import type { Pt } from './fourier'
import { WORDMARK } from './wordmark'

export const N = 512

export interface Loop {
  pts: Pt[]
  pen: boolean[]
}

/** Strokes → N evenly spaced points round one closed loop. */
export function resample(strokes: Pt[][], n = N): Loop {
  // Segments in drawing order, including pen-up hops between strokes and back to the start.
  const segs: { a: Pt; b: Pt; pen: boolean; len: number }[] = []
  const push = (a: Pt, b: Pt, pen: boolean) => segs.push({ a, b, pen, len: Math.hypot(b[0] - a[0], b[1] - a[1]) })
  strokes.forEach((s, i) => {
    if (i > 0) push(strokes[i - 1][strokes[i - 1].length - 1], s[0], false)
    for (let j = 1; j < s.length; j++) push(s[j - 1], s[j], true)
  })
  const last = strokes[strokes.length - 1]
  push(last[last.length - 1], strokes[0][0], false)

  const total = segs.reduce((t, s) => t + s.len, 0)
  const pts: Pt[] = [], pen: boolean[] = []
  let si = 0, acc = 0
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total
    while (si < segs.length - 1 && acc + segs[si].len < d) acc += segs[si++].len
    const s = segs[si], u = s.len ? (d - acc) / s.len : 0
    pts.push([s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u])
    pen.push(s.pen)
  }
  return { pts, pen }
}

/** Centre on the origin and scale so the larger side spans `size`. */
function fit(strokes: Pt[][], size: number): Pt[][] {
  const all = strokes.flat()
  const xs = all.map(p => p[0]), ys = all.map(p => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const k = size / Math.max(x1 - x0, y1 - y0)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return strokes.map(s => s.map(([x, y]) => [(x - cx) * k, (y - cy) * k] as Pt))
}

/** "codingcuisine", 2 units wide. */
export function wordmarkLoop(): Loop {
  return resample(fit(WORDMARK, 2))
}

// A plate in the site's style: wobbly rim, inner well line and three logs.
// Rings run a little past a full turn so the truncated series can't leave a gap where they close.
function ring(r: number, wob: number, phase: number, steps = 80): Pt[] {
  const turn = Math.PI * 2 + 0.45
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * turn - Math.PI / 2
    const rr = r * (1 + wob * Math.sin(3 * a + phase) + wob * 0.5 * Math.sin(5 * a - phase))
    return [rr * Math.cos(a), rr * Math.sin(a)] as Pt
  })
}

function capsule(cx: number, cy: number, w: number, h: number, rot: number): Pt[] {
  const r = h / 2, half = w / 2 - r, out: Pt[] = []
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; out.push([half + r * Math.cos(a), r * Math.sin(a)]) }
  for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 + (i / 12) * Math.PI; out.push([-half + r * Math.cos(a), r * Math.sin(a)]) }
  out.push(out[0])
  const c = Math.cos(rot), s = Math.sin(rot)
  return out.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as Pt)
}

export function plateLoop(): Loop {
  const strokes: Pt[][] = [
    ring(0.96, 0.012, 0.4),
    ring(0.72, 0.016, 1.9),
    capsule(-0.02, -0.22, 0.62, 0.17, -0.12),
    capsule(0.05, -0.02, 0.62, 0.17, -0.08),
    capsule(-0.04, 0.18, 0.62, 0.17, -0.14),
  ]
  return resample(fit(strokes, 2))
}
