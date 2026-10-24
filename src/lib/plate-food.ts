// Sauce and main component: the arrangements and five sauce styles.

import type { Kind, SauceStyle } from './look'
import type { Rng } from './rng'
import type { Bed } from './plate-plates'
import {
  type Mark, type Pt, TAU, bbox, chaikin, curve, ellArc, ellipse, hatch, mapMark, organic, quad,
  rectPoly, resample, shift, sketchLine, sketchLoop, stipple, wobble, xf, arcOf,
} from './plate-geom'

// ---- sauce ---------------------------------------------------------------------

function pool(b: Bed, r: Rng): Mark[] {
  const s = b.s, cx = b.cx + r.range(-8, 8) * s, cy = b.cy + r.range(2, 10) * s
  const rx = r.range(58, 72) * s, ry = r.range(44, 56) * s, rot = r.range(-25, 25)
  const body = organic(ellipse(cx, cy, rx, ry, rot), r, 2.2 * s, [2, 3, 4])
  const lip = sketchLine(arcOf(body.map(([x, y]) => [cx + (x - cx) * 0.86, cy + (y - cy) * 0.86] as Pt), 0.52 + r.range(0, 0.08), r.range(0.18, 0.3)), r, 0.4)
  const marks: Mark[] = [{ fill: [body], ink: [sketchLoop(body, r)], thin: [lip] }]
  if (r.chance(0.55)) {
    const a = r.range(0, TAU), d = r.range(1.08, 1.18), rr = r.range(2.6, 4.5) * s
    const drop = organic(ellipse(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rr, rr * 0.85, r.range(0, 180)), r, 0.3)
    marks.push({ fill: [drop], ink: [[...drop, drop[0]]] })
  }
  return marks
}

function swoosh(b: Bed, r: Rng): Mark[] {
  const s = b.s
  const len = r.range(150, 172) * s, W = r.range(24, 32) * s
  const th = r.range(-28, 18) + (r.chance(0.5) ? 0 : 180), bend = r.range(16, 32) * s * (r.chance(0.5) ? 1 : -1)
  const ox = b.cx + r.range(-6, 6) * s, oy = b.cy + r.range(4, 14) * s
  const c = (u: number): Pt => xf([[-len / 2 + len * u, bend * (1 - (2 * u - 1) ** 2) - bend / 2]], ox, oy, th)[0]
  const w = (u: number) => W * Math.sqrt(Math.sin(Math.PI * Math.min(1, (u + 0.08) / 1.1))) * (1 - 0.55 * u)
  const nrm = (u: number): Pt => {
    const a = c(Math.max(0, u - 0.01)), q = c(Math.min(1, u + 0.01)), l = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1
    return [-(q[1] - a[1]) / l, (q[0] - a[0]) / l]
  }
  const side = (k: number) => (u: number): Pt => { const p = c(u), n = nrm(u), h = (w(u) / 2) * k; return [p[0] + n[0] * h, p[1] + n[1] * h] }
  const left = curve(side(1), 40, false), right = curve(side(-1), 40, false).reverse()
  // round blunt start
  const p0 = c(0), n0 = nrm(0), t0: Pt = [n0[1], -n0[0]], h0 = w(0) / 2
  const cap: Pt[] = []
  for (let i = 1; i < 8; i++) {
    const a = Math.PI * (i / 8)
    cap.push([p0[0] - n0[0] * h0 * Math.cos(a) + t0[0] * h0 * Math.sin(a), p0[1] - n0[1] * h0 * Math.cos(a) + t0[1] * h0 * Math.sin(a)])
  }
  const body = wobble(resample([...left, ...right, ...cap], 2.6), 0.7, r, [3, 5], true)
  const bristles: Pt[][] = []
  for (let i = 0, k = 2 + r.int(3); i < k; i++) {
    const off = r.range(-0.32, 0.32), u0 = r.range(0.35, 0.6), u1 = r.range(0.92, 1.07)
    bristles.push(sketchLine(curve(t => {
      const u = u0 + (u1 - u0) * t, p = c(Math.min(1, u)), n = nrm(Math.min(1, u)), ww = w(Math.min(1, u)) * off
      const ext = u > 1 ? (u - 1) * len : 0, tg: Pt = [n[1], -n[0]]
      return [p[0] + n[0] * ww - tg[0] * ext, p[1] + n[1] * ww - tg[1] * ext]
    }, 10, false), r, 0.3))
  }
  return [{ fill: [body], ink: [sketchLoop(body, r)], thin: bristles }]
}

function dots(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 5 + r.int(5), R = r.range(72, 84) * s
  const a0 = r.range(0, TAU), spread = r.range(0.32, 0.55) * TAU * (r.chance(0.5) ? 1 : -1)
  const big = r.range(6.5, 8.5) * s, small = r.range(2.2, 3) * s
  const fills: Pt[][] = [], ink: Pt[][] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = a0 + spread * t, rr = big + (small - big) * t
    const d = organic(ellipse(b.cx + Math.cos(a) * R * 1.05, b.cy + Math.sin(a) * R * 0.92, rr, rr * r.range(0.88, 1)), r, 0.25 * s)
    fills.push(d)
    ink.push([...d, d[0]])
  }
  return [{ fill: fills, ink }]
}

function drizzle(b: Bed, r: Rng): Mark[] {
  const s = b.s, k = 5 + r.int(3), a0 = r.range(0, TAU), turn = r.range(0.8, 1.15) * TAU * (r.chance(0.5) ? 1 : -1)
  const ctrl: Pt[] = []
  for (let i = 0; i < k; i++) {
    const a = a0 + (turn * i) / (k - 1), rad = (i % 2 ? r.range(18, 40) : r.range(56, 78)) * s
    ctrl.push([b.cx + Math.cos(a) * rad, b.cy + Math.sin(a) * rad * 0.88])
  }
  const line = wobble(resample(chaikin(ctrl, 4), 2.4, false), 0.8, r, [1.3, 2.9], false)
  const end = line[line.length - 1], dr = 2.4 * s
  const drip = organic(ellipse(end[0], end[1], dr, dr * 0.85), r, 0.15)
  return [
    { band: [line], bandW: 3.4, ink: [line], inkW: 1, occ: false },
    { fill: [drip], ink: [[...drip, drip[0]]], inkW: 1 },
  ]
}

export function drawSauce(style: SauceStyle, b: Bed, r: Rng): Mark[] {
  switch (style) {
    case 'none': return []
    case 'swoosh': return swoosh(b, r)
    case 'dots': return dots(b, r)
    case 'drizzle': return drizzle(b, r)
    default: return pool(b, r)
  }
}

// ---- main ----------------------------------------------------------------------

type Shade = 'hatch' | 'stipple' | 'none'
interface PieceOpt { shade?: Shade; d?: number; gap?: number; max?: number; detail?: Pt[][]; fine?: Pt[][] }

/** One solid piece of food: outline, colour, detail lines and a shadow crescent. */
function piece(poly: Pt[], r: Rng, o: PieceOpt): Mark {
  const thin = [...(o.fine ?? [])]
  const d = o.d ?? 5
  if (o.shade === 'hatch') thin.push(...hatch(poly, [shift(poly, -d, -d * 1.1)], r, { gap: o.gap ?? 2.8, max: o.max ?? 6, min: 1.6 }))
  else if (o.shade === 'stipple') thin.push(...stipple(poly, [shift(poly, -d, -d)], r, o.max ?? 10))
  return { fill: [poly], ink: [sketchLoop(poly, r), ...(o.detail ?? [])], thin }
}

const loc = (pts: Pt[], cx: number, cy: number, a: number) => xf(pts, cx, cy, a)

/** Scatter `n` round-ish spots in a compact cluster; returns centres+radii, back to front. */
function cluster(n: number, rad: () => number, spread: number, r: Rng, tight = 0.7): { x: number; y: number; r: number }[] {
  const out = [{ x: 0, y: 0, r: rad() }]
  for (let i = 1; i < n; i++) {
    const ri = rad()
    for (let t = 0; t < 40; t++) {
      const j = out[r.int(out.length)], a = r.range(0, TAU), d = (j.r + ri) * r.range(tight - 0.15, tight + 0.1)
      const x = j.x + Math.cos(a) * d, y = j.y + Math.sin(a) * d
      if (Math.hypot(x, y) > spread) continue
      if (out.some(o => Math.hypot(o.x - x, o.y - y) < (o.r + ri) * 0.42)) continue
      out.push({ x, y, r: ri })
      break
    }
  }
  return out.sort((a, b) => a.y - b.y)
}

function logs(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 2 + r.int(3), th = r.range(-25, 25)
  const L = r.range(84, 102) * s, T = r.range(20, 25) * s
  const detail = r.pick(['char', 'cut', 'seam'] as const)
  const sp = T * r.range(1.02, 1.18)
  const ps = Array.from({ length: n }, (_, i) => {
    const off = (i - (n - 1) / 2) * sp, along = r.range(-12, 12) * s, a = th * (Math.PI / 180)
    return { x: b.cx + Math.cos(a) * along - Math.sin(a) * off, y: b.cy + Math.sin(a) * along + Math.cos(a) * off, a: th + r.range(-7, 7), L: L * r.range(0.88, 1.05) }
  }).sort((p, q) => p.y - q.y)
  return ps.map(p => {
    const poly = organic(loc(rectPoly(p.L, T, T / 2), p.x, p.y, p.a), r, 0.6)
    const det: Pt[][] = [], fine: Pt[][] = []
    if (detail === 'char') {
      const k = 3 + r.int(2)
      for (let j = 0; j < k; j++) {
        const x = -p.L * 0.3 + (j * p.L * 0.6) / (k - 1) + r.range(-2, 2)
        det.push(sketchLine(loc([[x - T * 0.16, -T * 0.3], [x + T * 0.16, T * 0.3]], p.x, p.y, p.a), r, 0.2))
      }
    } else if (detail === 'cut') {
      const ex = p.L / 2 - T * 0.34
      const face = ellipse(0, 0, T * 0.17, T * 0.42)
      det.push(loc([...face, face[0]].map(([x, y]) => [x + ex, y] as Pt), p.x, p.y, p.a))
      fine.push(loc(ellipse(ex, 0, T * 0.08, T * 0.2).concat([[ex + T * 0.08, 0]]), p.x, p.y, p.a))
    } else {
      fine.push(sketchLine(loc([[-p.L * 0.38, -T * 0.16], [0, -T * 0.22], [p.L * 0.3, -T * 0.16]], p.x, p.y, p.a), r, 0.4))
    }
    return piece(poly, r, { shade: 'hatch', d: T * 0.24, gap: 2.6, max: 7, detail: det, fine })
  })
}

function pile(b: Bed, r: Rng): Mark[] {
  const s = b.s, shade: Shade = r.chance(0.5) ? 'stipple' : 'hatch'
  return cluster(3 + r.int(4), () => r.range(15, 26) * s, 40 * s, r).map(c => {
    const rr = c.r, rot = r.range(0, 180), x = b.cx + c.x, y = b.cy + c.y
    const poly = organic(ellipse(x, y, rr, rr * r.range(0.88, 0.98), rot), r, 0.7)
    const hl = sketchLine(ellArc(x - rr * 0.08, y - rr * 0.08, rr * 0.64, rr * 0.6, 0.56, 0.7 + r.range(0, 0.05)), r, 0.15)
    return piece(poly, r, { shade, d: rr * 0.32, gap: 2.6, max: shade === 'stipple' ? 9 : 5, fine: [hl] })
  })
}

/** Teardrop: round end at +x, point at -x. */
const teardrop = (L: number, W: number): Pt[] =>
  curve(t => { const a = TAU * t; return [(L / 2) * Math.cos(a), ((W / 2) * Math.sin(a) * Math.abs(Math.cos(a / 2))) / 0.77] }, 60)

function fan(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 4 + r.int(4), L = r.range(74, 88) * s, W = r.range(12, 16) * s
  const span = r.range(55, 95), mid = r.range(-80, -20) + (r.chance(0.3) ? 180 : 0)
  const detail = r.pick(['mid', 'rind'] as const)
  const base = teardrop(L, W)
  const marks: Mark[] = []
  for (let i = 0; i < n; i++) {
    const a = mid - span / 2 + (i * span) / (n - 1) + r.range(-3, 3)
    const ar = a * (Math.PI / 180), d = L * 0.55
    const x = b.cx + Math.cos(ar) * d, y = b.cy + Math.sin(ar) * d
    const poly = organic(loc(base, x, y, a), r, 0.5)
    const line = detail === 'mid'
      ? sketchLine(loc([[-L * 0.22, 0], [L * 0.38, W * 0.04]], x, y, a), r, 0.3)
      : sketchLine(loc(curve(t => {
        const q = TAU * (0.06 + 0.36 * t)
        return [(L / 2) * Math.cos(q) * 0.92, ((W / 2) * Math.sin(q) * Math.abs(Math.cos(q / 2))) / 0.77 * 0.62]
      }, 14, false), x, y, a), r, 0.2)
    marks.push(piece(poly, r, { shade: 'hatch', d: W * 0.28, gap: 2.4, max: 4, fine: [line] }))
  }
  return marks
}

const egg = (L: number, W: number): Pt[] =>
  curve(t => {
    const a = TAU * t, sn = Math.sin(a)
    return [(L / 2) * Math.cos(a), (W / 2) * sn * (0.72 + 0.28 * Math.abs(sn)) * (1 + 0.1 * Math.cos(a))]
  }, 60)

function quenelle(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 1 + r.int(3), L = r.range(50, 60) * s * (n === 1 ? 1.25 : 1), W = L * r.range(0.5, 0.58)
  const a0 = r.range(-35, 35)
  let ps: { x: number; y: number; a: number }[]
  if (n === 1) ps = [{ x: 0, y: 0, a: a0 }]
  else if (n === 2) {
    const ar = (a0 * Math.PI) / 180, o = W * 0.62
    ps = [-1, 1].map(k => ({ x: -Math.sin(ar) * o * k + r.range(-6, 6) * s, y: Math.cos(ar) * o * k, a: a0 + k * r.range(5, 14) }))
  } else {
    const phi = r.range(0, 360)
    ps = [0, 1, 2].map(k => {
      const a = phi + k * 120, ar = (a * Math.PI) / 180
      return { x: Math.cos(ar) * L * 0.42, y: Math.sin(ar) * L * 0.42, a }
    })
  }
  ps.sort((p, q) => p.y - q.y)
  return ps.map(p => {
    const x = b.cx + p.x, y = b.cy + p.y
    const poly = organic(loc(egg(L, W), x, y, p.a), r, 0.5)
    // spoon creases: one long facet edge off to one side, one short one
    const ridge = [
      sketchLine(loc(quad([-L * 0.46, W * 0.02], [-L * 0.05, -W * 0.42], [L * 0.4, -W * 0.16]), x, y, p.a), r, 0.2),
      sketchLine(loc(quad([-L * 0.08, W * 0.3], [L * 0.16, W * 0.22], [L * 0.36, W * 0.08]), x, y, p.a), r, 0.2),
    ]
    return piece(poly, r, { shade: 'stipple', d: W * 0.24, max: 12, fine: ridge })
  })
}

/** A French omelette: one plump roll, lying a little askew, with its fold seam along one side. */
function omelette(b: Bed, r: Rng): Mark[] {
  const s = b.s, L = r.range(118, 126) * s, W = L * 0.44, a = r.range(-12, -6)
  const x = b.cx + r.range(-3, 3) * s, y = b.cy + r.range(-2, 3) * s
  const poly = organic(loc(egg(L, W), x, y, a), r, 0.6)
  const fold = [
    sketchLine(loc(quad([-L * 0.42, W * 0.18], [0, W * 0.36], [L * 0.42, W * 0.16]), x, y, a), r, 0.25),
    sketchLine(loc(quad([-L * 0.3, W * 0.26], [-L * 0.1, W * 0.33], [L * 0.06, W * 0.31]), x, y, a), r, 0.2),
  ]
  return [piece(poly, r, { shade: 'stipple', d: W * 0.2, max: 10, fine: fold })]
}

function scatter(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 6 + r.int(6), R = 56 * s
  const ps: { x: number; y: number; r: number }[] = []
  for (let t = 0; t < n * 50 && ps.length < n; t++) {
    const rr = r.range(8, 14) * s, a = r.range(0, TAU), d = Math.sqrt(r.next()) * R
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9
    if (ps.some(p => Math.hypot(p.x - x, p.y - y) < (p.r + rr) * 0.85)) continue
    ps.push({ x, y, r: rr })
  }
  ps.sort((p, q) => p.y - q.y)
  return ps.map(p => {
    const x = b.cx + p.x, y = b.cy + p.y, rot = r.range(0, 180)
    const poly = organic(ellipse(x, y, p.r, p.r * r.range(0.65, 0.95), rot), r, p.r * 0.14, [2, 3, 5])
    const fine = r.chance(0.5) ? [sketchLine(loc([[-p.r * 0.4, 0], [p.r * 0.35, -p.r * 0.1]], x, y, rot + r.range(-30, 30)), r, 0.2)] : []
    return piece(poly, r, { shade: p.r > 10 * s ? 'hatch' : 'none', d: p.r * 0.35, gap: 2.2, max: 3, fine })
  })
}

function stack(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 2 + r.int(3), R0 = r.range(50, 58) * s, h = r.range(10, 15) * s, sq = r.range(0.34, 0.42)
  const marks: Mark[] = []
  let rx = R0
  for (let i = 0; i < n; i++) {
    const ry = rx * sq, cx = b.cx + r.range(-3, 3) * s, top = b.cy + (n * h) / 2 - (i + 1) * h
    const sil = organic([...ellArc(cx, top, rx, ry, 0.5, 1), ...ellArc(cx, top + h, rx, ry, 0, 0.5)], r, 0.5)
    const face = ellipse(cx, top, rx, ry)
    const front = sketchLine(ellArc(cx, top, rx, ry, 0.02, 0.48), r, 0.3)
    const ticks: Pt[][] = []
    for (let k = 0, m = 3 + r.int(4); k < m; k++) {
      const t = r.range(0.06, 0.44), x = cx + rx * Math.cos(TAU * t), y = top + ry * Math.sin(TAU * t)
      ticks.push([[x, y + h * 0.18], [x + r.range(-0.6, 0.6), y + h * r.range(0.45, 0.75)]])
    }
    const shade = hatch(sil, [shift(sil, -10 * s, 0), face], r, { gap: 2.6, max: 6, min: 1.5 })
    marks.push({ fill: [sil], ink: [sketchLoop(sil, r), front], thin: [...ticks, ...shade] })
    rx -= r.range(3, 8) * s
  }
  return marks
}

function slices(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 4 + r.int(4), rr = r.range(20, 26) * s
  const style = r.pick(['ring', 'radial', 'seeds'] as const)
  const ringLayout = n >= 6 && r.chance(0.4)
  const cs: Pt[] = []
  if (ringLayout) {
    const Rr = (rr * 1.3) / (2 * Math.sin(Math.PI / n)), a0 = r.range(0, TAU)
    for (let i = 0; i < n; i++) cs.push([b.cx + Math.cos(a0 + (i * TAU) / n) * Rr, b.cy + Math.sin(a0 + (i * TAU) / n) * Rr])
  } else {
    const th = r.range(-35, 35) * (Math.PI / 180), step = Math.min(rr * 1.05, (120 * s) / (n - 1)), bow = r.range(-14, 14) * s
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), along = (i - (n - 1) / 2) * step, off = bow * (1 - (2 * u - 1) ** 2)
      cs.push([b.cx + Math.cos(th) * along - Math.sin(th) * off, b.cy + Math.sin(th) * along + Math.cos(th) * off])
    }
  }
  return cs.map(([x, y]) => {
    const ri = rr * r.range(0.93, 1.05), rot = r.range(0, 180)
    const poly = organic(ellipse(x, y, ri, ri * 0.97, rot), r, 0.5)
    const fine: Pt[][] = []
    const ring = (k: number) => { const e = ellipse(x, y, ri * k, ri * k * 0.97, rot); return sketchLine([...e, e[0]], r, 0.25) }
    if (style === 'ring') fine.push(ring(0.8))
    else if (style === 'radial') {
      fine.push(ring(0.84))
      const m = 6 + r.int(3), a0 = r.range(0, TAU)
      for (let k = 0; k < m; k++) {
        const a = a0 + (k * TAU) / m
        fine.push([[x + Math.cos(a) * ri * 0.16, y + Math.sin(a) * ri * 0.16], [x + Math.cos(a) * ri * 0.72, y + Math.sin(a) * ri * 0.72]])
      }
    } else {
      fine.push(ring(0.8))
      const m = 3 + r.int(3), a0 = r.range(0, TAU)
      for (let k = 0; k < m; k++) {
        const a = a0 + (k * TAU) / m, e = xf(ellipse(0, 0, 1.8 * s, 1 * s), x + Math.cos(a) * ri * 0.45, y + Math.sin(a) * ri * 0.45, (a * 180) / Math.PI)
        fine.push([...e, e[0]])
      }
    }
    return piece(poly, r, { shade: 'hatch', d: ri * 0.22, gap: 2.4, max: 4, fine })
  })
}

function torn(b: Bed, r: Rng): Mark[] {
  const s = b.s, sub = r.pick(['leaf', 'crumb'] as const)
  return cluster(3 + r.int(4), () => r.range(20, 31) * s, 44 * s, r, 0.75).map(c => {
    const x = b.cx + c.x, y = b.cy + c.y, rot = r.range(0, 180), rx = c.r, ry = c.r * r.range(0.6, 0.82)
    let poly = organic(ellipse(x, y, rx, ry, rot), r, rx * 0.12, [3, 5, 8])
    poly = wobble(resample(poly, 2), 0.9, r, [17, 23, 31], true)
    const fine: Pt[][] = [], det: Pt[][] = []
    if (sub === 'leaf') {
      const bow = r.range(-0.15, 0.15) * ry
      det.push(sketchLine(loc(quad([-rx * 0.78, 0], [0, bow], [rx * 0.72, 0]), x, y, rot), r, 0.2))
      for (let k = 0, m = 2 + r.int(2); k < m; k++) {
        const t = -0.45 + (k * 0.9) / Math.max(1, m - 1) * 0.9, side = k % 2 ? 1 : -1
        fine.push(loc([[rx * t, bow * 0.6], [rx * (t + 0.28), side * ry * 0.55]], x, y, rot))
      }
    } else {
      for (let k = 0, m = 3 + r.int(3); k < m; k++) {
        const hr = r.range(1.1, 2.1) * s, e = ellipse(...loc([[r.range(-0.5, 0.5) * rx, r.range(-0.4, 0.4) * ry]], x, y, rot)[0], hr, hr * 0.8, r.range(0, 180))
        fine.push([...e, e[0]])
      }
    }
    return piece(poly, r, { shade: 'hatch', d: rx * 0.24, gap: 2.5, max: 5, detail: det, fine })
  })
}

// ---- noodles, grains, eggs -----------------------------------------------------

/** A small closed loop — cheap enough to use for dozens of grains. */
const blob = (x: number, y: number, rx: number, ry: number, rot: number, n = 6): Pt[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = (k / n) * TAU, c = Math.cos(rot), sn = Math.sin(rot)
    const px = Math.cos(a) * rx, py = Math.sin(a) * ry
    return [x + px * c - py * sn, y + px * sn + py * c] as Pt
  })

/** Noodles or long pasta twirled into a nest, with a fork-turn spiral and a few loose ends. */
function nest(b: Bed, r: Rng): Mark[] {
  const s = b.s, R = r.range(46, 54) * s, sq = r.range(0.78, 0.9), rot = r.range(0, 180)
  const outline = organic(ellipse(b.cx, b.cy, R, R * sq, rot), r, R * 0.06, [3, 5, 7])
  const strands: Pt[][] = []
  for (let i = 0, n = 9 + r.int(4); i < n; i++) {
    const k = r.range(0.22, 0.9), a0 = r.range(0, TAU), sweep = r.range(0.45, 0.85) * TAU * (r.chance(0.5) ? 1 : -1)
    const wob = r.range(0.04, 0.09), f = 2 + r.int(3), ph = r.range(0, TAU)
    strands.push(sketchLine(curve(t => {
      const a = a0 + sweep * t, rr = R * (k + wob * Math.sin(f * a + ph))
      return [b.cx + Math.cos(a) * rr, b.cy + Math.sin(a) * rr * sq]
    }, 36, false), r, 0.3, 4))
  }
  const turn = r.chance(0.5) ? 1 : -1
  strands.push(sketchLine(curve(t => {
    const a = turn * t * TAU * 1.6, rr = R * (0.07 + 0.22 * t)
    return [b.cx + Math.cos(a) * rr, b.cy - R * 0.05 + Math.sin(a) * rr * sq]
  }, 40, false), r, 0.2, 3))
  const ends: Pt[][] = []
  for (let i = 0, m = 2 + r.int(2); i < m; i++) {
    const a = r.range(0, TAU), x0 = b.cx + Math.cos(a) * R * 0.94, y0 = b.cy + Math.sin(a) * R * sq * 0.94
    const out = r.range(14, 24) * s, bend = r.chance(0.5) ? 0.7 : -0.7
    ends.push(sketchLine(quad([x0, y0], [x0 + Math.cos(a + bend) * out * 0.7, y0 + Math.sin(a + bend) * out * 0.7], [x0 + Math.cos(a) * out, y0 + Math.sin(a) * out]), r, 0.2))
  }
  const shade = hatch(outline, [shift(outline, -R * 0.2, -R * 0.22)], r, { gap: 2.6, max: 7, min: 1.6 })
  return [{ fill: [outline], ink: [sketchLoop(outline, r), ...strands, ...ends], thin: shade }]
}

/** Rice, couscous and other grains heaped into a soft mound, stippled with grains. */
function mound(b: Bed, r: Rng): Mark[] {
  const s = b.s, rx = r.range(50, 58) * s, ry = rx * r.range(0.62, 0.72), rot = r.range(-12, 12)
  const body = organic(ellipse(b.cx, b.cy, rx, ry, rot), r, rx * 0.05, [3, 5, 7])
  const grains: Pt[][] = []
  for (let i = 0, n = 44 + r.int(18); i < n; i++) {
    const a = r.range(0, TAU), d = Math.sqrt(r.next()) * 0.84
    grains.push(blob(b.cx + Math.cos(a) * rx * d, b.cy + Math.sin(a) * ry * d, r.range(2.2, 3.1) * s, r.range(0.9, 1.3) * s, r.range(0, Math.PI)))
  }
  const crest = sketchLine(ellArc(b.cx, b.cy, rx * 0.86, ry * 0.86, 0.56, 0.84, rot), r, 0.3)
  const shade = hatch(body, [shift(body, -rx * 0.22, -ry * 0.32)], r, { gap: 2.4, max: 8, min: 1.5 })
  return [{ fill: [body], ink: [sketchLoop(body, r), crest], thin: [...grains, ...shade] }]
}

/** Risotto or soft polenta: a smooth mound with the swirl a spoon leaves on top. */
function swirl(b: Bed, r: Rng): Mark[] {
  const rx = r.range(52, 60) * b.s, sq = r.range(0.66, 0.76), rot = r.range(-10, 10)
  const body = organic(ellipse(b.cx, b.cy, rx, rx * sq, rot), r, rx * 0.035, [3, 4, 6])
  const a0 = r.range(0, TAU), turn = r.chance(0.5) ? 1 : -1
  const spoon = sketchLine(curve(t => {
    const a = a0 + turn * t * TAU * 2.1, rr = rx * (0.05 + 0.6 * t)
    return [b.cx + Math.cos(a) * rr, b.cy + Math.sin(a) * rr * sq]
  }, 60, false), r, 0.25, 3)
  const gloss = sketchLine(ellArc(b.cx - rx * 0.1, b.cy - rx * sq * 0.12, rx * 0.5, rx * sq * 0.42, 0.58, 0.74), r, 0.2)
  const dots = stipple(body, [shift(body, -rx * 0.16, -rx * sq * 0.2)], r, 14)
  return [{ fill: [body], ink: [sketchLoop(body, r), spoon], thin: [gloss, ...dots] }]
}

const WHITE = '#fbf7ee', YOLK = '#f2a52c', JAMMY = '#f08a1c'

/** One or two fried eggs: lacy whites, round yolks with a highlight. */
function friedEgg(b: Bed, r: Rng): Mark[] {
  const n = r.chance(0.55) ? 2 : 1, marks: Mark[] = []
  const R = r.range(n === 2 ? 34 : 46, n === 2 ? 40 : 54) * b.s, th = r.range(0, TAU)
  for (let i = 0; i < n; i++) {
    const off = n === 2 ? (i ? 1 : -1) * R * 0.72 : 0
    const cx = b.cx + Math.cos(th) * off, cy = b.cy + Math.sin(th) * off * 0.7
    let white = organic(ellipse(cx, cy, R, R * r.range(0.74, 0.86), r.range(0, 180)), r, R * 0.12, [3, 4, 6])
    white = wobble(resample(white, 2), 1.1, r, [11, 17, 23], true)
    const lace = hatch(white, [shift(white, -R * 0.12, -R * 0.12)], r, { gap: 2.8, max: 5, min: 1.4 })
    const yr = R * r.range(0.32, 0.38), yx = cx + r.range(-0.15, 0.15) * R, yy = cy + r.range(-0.12, 0.08) * R
    const yolk = organic(ellipse(yx, yy, yr, yr * 0.94), r, 0.4)
    const hl = sketchLine(ellArc(yx - yr * 0.12, yy - yr * 0.12, yr * 0.6, yr * 0.55, 0.58, 0.76), r, 0.1)
    marks.push({ fill: [white], fc: WHITE, fo: 0.9, ink: [sketchLoop(white, r)], thin: lace })
    marks.push({ fill: [yolk], fc: YOLK, fo: 0.9, ink: [sketchLoop(yolk, r)], thin: [hl] })
  }
  return marks
}

/** Jammy eggs halved lengthways, glossy orange yolks. */
function halves(b: Bed, r: Rng): Mark[] {
  const s = b.s, n = 2 + r.int(3), L = r.range(36, 42) * s, W = L * 0.74, th = r.range(-30, 30)
  const marks: Mark[] = []
  for (const p of cluster(n, () => L * 0.56, 38 * s, r, 0.85)) {
    const x = b.cx + p.x, y = b.cy + p.y, a = th + r.range(-25, 25)
    const white = organic(loc(egg(L, W), x, y, a), r, 0.5)
    const [yx, yy] = loc([[L * 0.06, 0]], x, y, a)[0]
    const yolk = organic(ellipse(yx, yy, L * 0.24, W * 0.3, a), r, 0.3)
    const hl = sketchLine(ellArc(yx - L * 0.04, yy - W * 0.06, L * 0.13, W * 0.14, 0.58, 0.78, a), r, 0.1)
    marks.push({ fill: [white], fc: WHITE, fo: 0.9, ink: [sketchLoop(white, r)], thin: stipple(white, [shift(white, -L * 0.1, -W * 0.12)], r, 6) })
    marks.push({ fill: [yolk], fc: JAMMY, fo: 0.92, ink: [sketchLoop(yolk, r)], thin: [hl] })
  }
  return marks
}

const MAINS: Record<Kind, (b: Bed, r: Rng) => Mark[]> = { logs, pile, fan, quenelle, scatter, stack, slices, torn, nest, mound, swirl, egg: friedEgg, halves, omelette }

/** Draw the main and settle it on the bed: centred, and never bigger than the bed allows. */
export function drawMain(kind: Kind, b: Bed, r: Rng): Mark[] {
  const marks = (MAINS[kind] ?? logs)(b, r)
  const box = bbox(marks.flatMap(m => m.fill ?? []))
  const w = box.x1 - box.x0, h = box.y1 - box.y0
  // grow small arrangements towards the bed size, shrink big ones to fit
  const k = Math.min(1.6, (172 * b.s) / w, (150 * b.s) / h, Math.max(1, (122 * b.s) / Math.max(w, h)))
  const mx = (box.x0 + box.x1) / 2, my = (box.y0 + box.y1) / 2
  const tx = b.cx + r.range(-4, 4) * b.s, ty = b.cy + r.range(-3, 3) * b.s
  return marks.map(m => mapMark(m, ([x, y]) => [tx + (x - mx) * k, ty + (y - my) * k]))
}
