// The seven plates. Light comes from the top left, so cast shadows fall bottom-right
// and the inner wall of a well is shaded on its top-left side.

import type { Shape } from './look'
import type { Rng } from './rng'
import {
  type Mark, type Pt, arcOf, echo, ellArc, ellipse, hatch, organic, rimTicks, rectPoly, resample, roundedPoly,
  shift, sketchLine, sketchLoop, wobble, xf, clipOut, occOf, pip,
} from './plate-geom'

/** Where the food goes and how big it may be. */
export interface Bed { cx: number; cy: number; s: number }
export interface PlateOut { marks: Mark[]; bed: Bed; fill: string }

const CERAMIC = '#efe2c2'
const PAPER = '#fbf6ea'

const DOWN: Pt = [1, 1.15], UP: Pt = [-1, -1.15]

/** Cast shadow: an echo of the outline bottom-right plus a few fading ticks. */
const castShadow = (outline: Pt[], r: Rng, count = 11, len = 8) => [
  ...echo(outline, r, 2.6, 3.2, false),
  ...rimTicks(outline, r, { side: DOWN, dir: DOWN, count, len, gap: 2 }),
]

/** Shading on the top-left inside of a well (the wall that faces away from the light). */
const wellShadow = (well: Pt[], r: Rng, count = 8, len = 7) => [
  ...(r.chance(0.6) ? echo(well, r, 2.4, 2.8, true) : []),
  ...rimTicks(well, r, { side: UP, dir: DOWN, count, len, gap: 1.6 }),
]

function rimmed(outer: Pt[], inner: Pt[], band: Pt[] | null, r: Rng): Mark[] {
  const thin = [...castShadow(outer, r), ...wellShadow(inner, r)]
  if (band) thin.push(band)
  return [
    { fill: [outer], ink: [sketchLoop(outer, r)] },
    { ink: [sketchLoop(inner, r)], thin },
  ]
}

function round(r: Rng): PlateOut {
  const R = r.range(115, 121), rim = r.range(21, 29), sq = r.range(0.985, 1)
  const outer = organic(ellipse(150, 135, R, R * sq, r.range(0, 180)), r, 0.9)
  const inner = organic(ellipse(150 + r.range(-1.5, 1.5), 135 + r.range(-1.5, 1.5), R - rim, (R - rim) * sq, r.range(0, 180)), r, 0.7)
  const t0 = r.range(0, 1)
  const band = r.chance(0.45) ? sketchLine(ellArc(150, 135, R - 4.5, (R - 4.5) * sq, t0, t0 + r.range(0.35, 0.6)), r, 0.3) : null
  return { marks: rimmed(outer, inner, band, r), bed: { cx: 150, cy: 135, s: 1 }, fill: CERAMIC }
}

function coupe(r: Rng): PlateOut {
  const rx = r.range(119, 125), ry = rx * r.range(0.9, 0.95), rot = r.range(-4, 4)
  const outer = organic(ellipse(150, 136, rx, ry, rot), r, 1)
  const well = organic(ellipse(151, 139, rx * 0.74, ry * 0.74, rot), r, 0.8)
  const t0 = r.range(-0.12, -0.02)
  return {
    marks: [
      { fill: [outer], ink: [sketchLoop(outer, r)] },
      {
        ink: [arcOf(well, t0, r.range(0.45, 0.55))],
        thin: [
          arcOf(well, 0.56 + r.range(0, 0.06), r.range(0.12, 0.2)),
          ...rimTicks(outer, r, { side: UP, dir: DOWN, count: 7, len: 9, gap: 4 }),
          ...castShadow(outer, r),
        ],
      },
    ],
    bed: { cx: 150, cy: 137, s: 1 },
    fill: CERAMIC,
  }
}

function square(r: Rng): PlateOut {
  const S = r.range(226, 238), cr = r.range(20, 34), rim = r.range(20, 27), rot = r.range(-2.5, 2.5)
  const outer = organic(xf(rectPoly(S, S, cr), 150, 135, rot), r, 0.9, [2, 3, 4])
  const inner = organic(xf(rectPoly(S - 2 * rim, S - 2 * rim, Math.max(6, cr - rim * 0.6)), 150 + r.range(-1.5, 1.5), 135 + r.range(-1.5, 1.5), rot + r.range(-0.6, 0.6)), r, 0.7, [2, 3, 4])
  const band = r.chance(0.4) ? sketchLine(arcOf(resample(xf(rectPoly(S - 9, S - 9, cr - 4), 150, 135, rot), 3), r.range(0, 1), r.range(0.3, 0.55)), r, 0.3) : null
  return { marks: rimmed(outer, inner, band, r), bed: { cx: 150, cy: 135, s: 1 }, fill: CERAMIC }
}

function oval(r: Rng): PlateOut {
  const rx = r.range(131, 137), ry = r.range(99, 105), rot = r.range(-3, 3), rim = r.range(19, 25)
  const outer = organic(ellipse(150, 133, rx, ry, rot), r, 0.9)
  const inner = organic(ellipse(150 + r.range(-1.5, 1.5), 133 + r.range(-1, 1), rx - rim, ry - rim * 0.92, rot + r.range(-1, 1)), r, 0.7)
  const band = r.chance(0.35) ? sketchLine(ellArc(150, 133, rx - 4.5, ry - 4.5, 0.05 + r.range(0, 0.2), 0.5 + r.range(0, 0.25), rot), r, 0.3) : null
  return { marks: rimmed(outer, inner, band, r), bed: { cx: 150, cy: 133, s: 1 }, fill: CERAMIC }
}

function slate(r: Rng): PlateOut {
  const W = r.range(250, 262), H = r.range(176, 190), rot = r.range(-3, 3)
  const base = resample(xf(rectPoly(W, H, r.range(3, 6)), 150, 132, rot), 2.6)
  let outer = wobble(base, 1, r, [3, 7, 13], true)
  // A few chips knocked out of the edge.
  const n = outer.length
  for (let c = 0, k = 2 + r.int(4); c < k; c++) {
    const at = r.int(n), w = 2 + r.int(3), depth = r.range(1.4, 3)
    outer = outer.map((p, i) => {
      const d = Math.min(Math.abs(i - at), n - Math.abs(i - at))
      if (d > w) return p
      const f = depth * (1 - d / (w + 1)), dx = 150 - p[0], dy = 132 - p[1], l = Math.hypot(dx, dy)
      return [p[0] + (dx / l) * f, p[1] + (dy / l) * f] as Pt
    })
  }
  // The slab's thickness, visible along the bottom and right edges.
  const under = shift(outer, 2, 3.2)
  const edge = clipOut([...under, under[0]], [occOf(outer)])
  const streaks: Pt[][] = []
  for (let i = 0, k = 5 + r.int(4); i < k; i++) {
    const p: Pt = [150 + r.range(-W / 2 + 18, W / 2 - 18), 132 + r.range(-H / 2 + 14, H / 2 - 14)]
    const len = r.range(12, 40), a = rot + r.range(-8, 8)
    streaks.push(sketchLine(xf([[-len / 2, 0], [len / 2, 0]], p[0], p[1], a), r, 0.6))
  }
  return {
    marks: [
      { fill: [outer], ink: [sketchLoop(outer, r), ...edge] },
      { thin: [...streaks, ...castShadow(under, r, 12, 7)] },
    ],
    bed: { cx: 150, cy: 132, s: 0.95 },
    fill: '#bfc1b9',
  }
}

function bowl(r: Rng): PlateOut {
  const cy = 120, rx = r.range(113, 119), ry = rx * r.range(0.82, 0.86), rimW = r.range(9, 12), depth = r.range(17, 22)
  const rimOuter = organic(ellipse(150, cy, rx, ry), r, 0.7)
  const rimInner = organic(ellipse(150, cy + 1.5, rx - rimW, ry - rimW * 0.9), r, 0.6)
  const body = sketchLine(ellArc(150, cy, rx, ry + depth, 0, 0.5), r, 0.6)
  const top = rimOuter.filter(p => p[1] <= cy)
  // order the upper half left → right so it joins the body (right → bottom → left)
  top.sort((a, b) => a[0] - b[0])
  const silhouette: Pt[] = [...body, ...top]
  const footY = cy + ry + depth - 5
  const foot = sketchLine(ellArc(150, footY, 44, 9, 0.02, 0.48), r, 0.4)
  return {
    marks: [
      { fill: [silhouette], ink: [sketchLoop(rimOuter, r), body, foot] },
      {
        fill: [rimInner],
        ink: [sketchLoop(rimInner, r)],
        thin: [
          ...wellShadow(rimInner, r, 10, 12),
          ...hatch(silhouette, [rimOuter, shift(silhouette, -16, -4)], r, { ang: -60, gap: 3.4, max: 7, min: 3 }),
          ...castShadow(silhouette, r, 9, 7),
        ],
      },
    ],
    bed: { cx: 150, cy: cy + 10, s: 0.84 },
    fill: CERAMIC,
  }
}

function board(r: Rng): PlateOut {
  const W = r.range(200, 214), H = r.range(158, 172), th = r.range(16, 20), tl = r.range(38, 46)
  const hw = W / 2, hh = H / 2, cr = r.range(8, 14), right = r.chance(0.6), rot = r.range(-3, 3)
  let v: Pt[] = [[-hw, -hh], [hw, -hh], [hw, -th], [hw + tl, -th], [hw + tl, th], [hw, th], [hw, hh], [-hw, hh]]
  const radii = [cr, cr, 6, th * 0.9, th * 0.9, 6, cr, cr]
  if (!right) v = v.map(([x, y]) => [-x, y] as Pt)
  const bx = 150 - (right ? tl / 2 : -tl / 2), by = 134
  const outer = organic(xf(roundedPoly(v, radii), bx, by, rot), r, 0.8, [2, 3, 4])
  const hole = organic(ellipse(...xf([[(right ? 1 : -1) * (hw + tl * 0.58), 0]], bx, by, rot)[0], 4.6, 4.6), r, 0.2)
  // Grain: long gently-waving lines, bending round a knot.
  const knot: Pt | null = r.chance(0.55) ? [r.range(-hw + 30, hw - 30), r.range(-hh + 25, hh - 25)] : null
  const grain: Pt[][] = []
  const lines = 5 + r.int(4)
  for (let i = 0; i < lines; i++) {
    const y0 = -hh + ((i + 0.5 + r.range(-0.3, 0.3)) * H) / lines
    const x0 = r.range(-hw + 8, -hw + 60), x1 = r.range(hw - 70, hw - 8)
    const A = r.range(1, 3), lam = r.range(25, 45), ph = r.range(0, 6.3)
    const pts: Pt[] = []
    for (let x = x0; x <= x1; x += 5) {
      let y = y0 + A * Math.sin(x / lam + ph)
      if (knot) {
        const dy = y - knot[1], g = Math.exp(-(((x - knot[0]) / 22) ** 2))
        if (Math.abs(dy) < 30) y += Math.sign(dy || 1) * g * Math.max(0, 14 - Math.abs(dy) * 0.4)
      }
      pts.push([x, y])
    }
    if (pts.length > 1) grain.push(sketchLine(xf(pts, bx, by, rot), r, 0.3))
  }
  const knots: Pt[][] = knot
    ? [ellipse(...xf([knot], bx, by, rot)[0], 7, 3, rot), ellipse(...xf([knot], bx, by, rot)[0], 3.2, 1.3, rot)].map(e => [...e, e[0]])
    : []
  const inside = grain.flatMap(g => clipOut(g, [occOf(hole)])).filter(g => g.every(p => pip(outer, p)))
  return {
    marks: [
      { fill: [outer], ink: [sketchLoop(outer, r)] },
      { fill: [hole], fc: PAPER, fo: 1, ink: [[...hole, hole[0]]], thin: [...inside, ...knots, ...castShadow(outer, r)] },
    ],
    bed: { cx: bx, cy: by, s: 0.86 },
    fill: '#e2c28c',
  }
}

const PLATES: Record<Shape, (r: Rng) => PlateOut> = { round, coupe, square, oval, slate, bowl, board }

export function drawPlate(shape: Shape, r: Rng): PlateOut {
  return (PLATES[shape] ?? round)(r)
}
