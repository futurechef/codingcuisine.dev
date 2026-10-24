// Geometry toolkit for the plate drawings: everything is a polyline, so the same
// points become SVG paths on screen and pen moves on a plotter.

import type { Rng } from './rng'

export type Pt = [number, number]
export const TAU = Math.PI * 2
const DEG = Math.PI / 180

/**
 * One drawn thing (or a family of small things) in a layer.
 * `ink` lines are drawn at the pen width, `thin` lines (details, hatching) finer.
 * `fill` polygons go to the colour layer and, unless `occ` is false, hide ink of
 * anything drawn before them. `band` lines are colour strokes (drizzle, zest).
 */
export interface Mark {
  ink?: Pt[][]
  thin?: Pt[][]
  inkW?: number
  thinW?: number
  fill?: Pt[][]
  band?: Pt[][]
  bandW?: number
  /** Fill colour override — constants or validated hex only. */
  fc?: string
  fo?: number
  occ?: boolean
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])
export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/** Scale, rotate (degrees) then translate local points. */
export function xf(pts: Pt[], cx: number, cy: number, rot = 0, sx = 1, sy = sx): Pt[] {
  const c = Math.cos(rot * DEG), s = Math.sin(rot * DEG)
  return pts.map(([x, y]) => {
    const X = x * sx, Y = y * sy
    return [cx + X * c - Y * s, cy + X * s + Y * c] as Pt
  })
}

export const shift = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy] as Pt)

export function perimeter(pts: Pt[], closed = true): number {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i])
  if (closed && pts.length > 1) L += dist(pts[pts.length - 1], pts[0])
  return L
}

/** Sample t in [0,1) (closed) or [0,1] (open). */
export function curve(fn: (t: number) => Pt, n: number, closed = true): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < (closed ? n : n + 1); i++) out.push(fn(i / n))
  return out
}

/** Dense ellipse starting at its +x point, going clockwise on screen. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Pt[] {
  const per = Math.PI * (rx + ry)
  const n = clamp(Math.round(per / 1.5), 24, 400)
  return xf(curve(t => [rx * Math.cos(TAU * t), ry * Math.sin(TAU * t)], n), cx, cy, rot)
}

/** Part of an ellipse as an open line, t0..t1 in turns. */
export function ellArc(cx: number, cy: number, rx: number, ry: number, t0: number, t1: number, rot = 0): Pt[] {
  const n = clamp(Math.round((Math.abs(t1 - t0) * Math.PI * (rx + ry)) / 2), 4, 200)
  return xf(curve(t => {
    const a = TAU * (t0 + (t1 - t0) * t)
    return [rx * Math.cos(a), ry * Math.sin(a)]
  }, n, false), cx, cy, rot)
}

/** Polygon with filleted corners (quadratic fillets; works for concave corners too). */
export function roundedPoly(verts: Pt[], radii: number[]): Pt[] {
  const out: Pt[] = []
  const n = verts.length
  for (let i = 0; i < n; i++) {
    const P = verts[(i - 1 + n) % n], V = verts[i], N = verts[(i + 1) % n]
    const r = Math.min(radii[i] ?? 0, dist(P, V) / 2, dist(V, N) / 2)
    if (r < 0.01) { out.push(V); continue }
    const a = lerp(V, P, r / dist(P, V)), b = lerp(V, N, r / dist(V, N))
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, u = 1 - t
      out.push([u * u * a[0] + 2 * u * t * V[0] + t * t * b[0], u * u * a[1] + 2 * u * t * V[1] + t * t * b[1]])
    }
  }
  return out
}

export const rectPoly = (w: number, h: number, r: number): Pt[] =>
  roundedPoly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], [r, r, r, r])

/** Even arc-length resampling. */
export function resample(pts: Pt[], step: number, closed = true): Pt[] {
  const P = closed ? [...pts, pts[0]] : pts
  const cum = [0]
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + dist(P[i - 1], P[i]))
  const L = cum[cum.length - 1]
  if (L === 0) return pts.slice(0, 1)
  const n = Math.max(closed ? 8 : 1, Math.round(L / step))
  const out: Pt[] = []
  let j = 1
  for (let i = 0; i < (closed ? n : n + 1); i++) {
    const s = (i / n) * L
    while (j < P.length - 1 && cum[j] < s) j++
    const seg = cum[j] - cum[j - 1] || 1
    out.push(lerp(P[j - 1], P[j], (s - cum[j - 1]) / seg))
  }
  return out
}

/** Smooth low-frequency noise in about [-1, 1]. Integer freqs make it periodic on [0,1]. */
export function noise(r: Rng, freqs: number[]): (u: number) => number {
  const terms = freqs.map((f, i) => ({ f, a: r.range(0.45, 1) / (1 + i * 0.7), p: r.range(0, TAU) }))
  const sum = terms.reduce((s, t) => s + t.a, 0)
  return u => terms.reduce((s, t) => s + t.a * Math.sin(TAU * t.f * u + t.p), 0) / sum
}

/** Push each point along its normal by smooth noise. */
export function wobble(pts: Pt[], amp: number, r: Rng, freqs: number[], closed: boolean): Pt[] {
  const nz = noise(r, freqs)
  const n = pts.length
  if (n < 3 || amp === 0) return pts
  return pts.map((p, i) => {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1
    const d = amp * nz(closed ? i / n : i / (n - 1))
    return [p[0] + (ty / l) * d, p[1] - (tx / l) * d] as Pt
  })
}

/** A hand-drawn closed outline from a base shape. */
export function organic(base: Pt[], r: Rng, amp: number, freqs = [2, 3, 5]): Pt[] {
  const L = perimeter(base, true)
  const step = clamp(L / 14, 1.1, 4.5)
  return wobble(resample(base, step, true), amp, r, freqs, true)
}

/** A hand-drawn open line. */
export function sketchLine(pts: Pt[], r: Rng, amp = 0.5, step = 2.5): Pt[] {
  const L = perimeter(pts, false)
  return wobble(resample(pts, clamp(L / 6, 0.8, step), false), amp, r, [0.7, 1.6], false)
}

/**
 * Ink for a closed outline: start somewhere random, and like a pen sketch sometimes
 * overshoot the start and drift off, or stop just short.
 */
export function sketchLoop(poly: Pt[], r: Rng): Pt[] {
  const n = poly.length
  const s = r.int(n)
  const ring = poly.slice(s).concat(poly.slice(0, s))
  const L = perimeter(poly)
  const m = r.next()
  if (L < 70) return [...ring, ring[0]]
  if (m < 0.5) {
    const k = Math.max(2, Math.round(n * r.range(0.03, 0.07)))
    const drift = r.range(0.9, 2) * (r.chance(0.5) ? 1 : -1)
    const out = [...ring]
    for (let i = 0; i <= k; i++) {
      const p = ring[i % n], q = ring[(i + 1) % n]
      const tx = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tx, ty) || 1
      const d = drift * (i / k) ** 1.6
      out.push([p[0] + (ty / l) * d, p[1] - (tx / l) * d])
    }
    return out
  }
  if (m < 0.68 && L > 160) return ring.slice(0, n - 1)
  return [...ring, ring[0]]
}

/** Open sub-run of a closed loop: from fraction `start`, `len` of the way round. */
export function arcOf(loop: Pt[], start: number, len: number): Pt[] {
  const n = loop.length
  const i0 = Math.floor((((start % 1) + 1) % 1) * n), m = Math.max(2, Math.round(len * n))
  const out: Pt[] = []
  for (let i = 0; i <= m; i++) out.push(loop[(i0 + i) % n])
  return out
}

export function chaikin(pts: Pt[], iters: number): Pt[] {
  let p = pts
  for (let k = 0; k < iters; k++) {
    const q: Pt[] = [p[0]]
    for (let i = 0; i < p.length - 1; i++) q.push(lerp(p[i], p[i + 1], 0.25), lerp(p[i], p[i + 1], 0.75))
    q.push(p[p.length - 1])
    p = q
  }
  return p
}

export function quad(a: Pt, c: Pt, b: Pt, n = 12): Pt[] {
  return curve(t => {
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
  }, n, false)
}

export function area(poly: Pt[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

/** Same winding for every fill polygon, so merged fills union instead of cancelling. */
export const orient = (poly: Pt[]): Pt[] => (area(poly) < 0 ? poly.slice().reverse() : poly)

// ---- inside tests --------------------------------------------------------------

export interface Occ { pts: Pt[]; x0: number; y0: number; x1: number; y1: number }

export function occOf(pts: Pt[]): Occ {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  return { pts, x0, y0, x1, y1 }
}

export function pip(poly: Pt[], [x, y]: Pt): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export const inOcc = (o: Occ, p: Pt) => p[0] >= o.x0 && p[0] <= o.x1 && p[1] >= o.y0 && p[1] <= o.y1 && pip(o.pts, p)

export function bbox(polys: Pt[][]): Occ {
  return occOf(polys.flat())
}

// ---- shading -------------------------------------------------------------------

/**
 * Parallel hatch strokes at `ang` degrees inside `region` but outside every `minus`
 * polygon. Using region minus a copy of itself shifted towards the light gives a
 * shadow crescent; capped at `max` strokes so small drawings stay quiet.
 */
export function hatch(region: Pt[], minus: Pt[][], r: Rng, o: { ang?: number; gap?: number; max?: number; min?: number } = {}): Pt[][] {
  const a = (o.ang ?? 45) * DEG, ca = Math.cos(a), sa = Math.sin(a)
  const gap = o.gap ?? 3, minLen = o.min ?? 2
  const rotate = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x * ca + y * sa, -x * sa + y * ca])
  const back = (u: number, v: number): Pt => [u * ca - v * sa, u * sa + v * ca]
  const R = rotate(region), M = minus.map(rotate)
  // even-odd spans of a polygon along the horizontal line at v
  const spans = (P: Pt[], v: number): [number, number][] => {
    const xs: number[] = []
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length]
      if ((p[1] <= v) !== (q[1] <= v)) xs.push(p[0] + ((v - p[1]) / (q[1] - p[1])) * (q[0] - p[0]))
    }
    xs.sort((x, y) => x - y)
    const out: [number, number][] = []
    for (let k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]])
    return out
  }
  let v0 = Infinity, v1 = -Infinity
  for (const p of R) { v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]) }
  const segs: Pt[][] = []
  for (let v = v0 + gap * r.range(0.3, 1); v < v1; v += gap * r.range(0.85, 1.15)) {
    let keep = spans(R, v)
    for (const P of M) {
      for (const [m0, m1] of spans(P, v)) {
        keep = keep.flatMap(([k0, k1]): [number, number][] => {
          if (m1 <= k0 || m0 >= k1) return [[k0, k1]]
          const out: [number, number][] = []
          if (m0 > k0) out.push([k0, m0])
          if (m1 < k1) out.push([m1, k1])
          return out
        })
      }
    }
    for (let [u0, u1] of keep) {
      const len = u1 - u0
      if (len < minLen) continue
      u0 += len * r.range(0, 0.18)
      u1 -= len * r.range(0, 0.18)
      segs.push([back(u0, v), back(u1, v)])
    }
  }
  if (o.max != null && segs.length > o.max) {
    const keep: Pt[][] = []
    for (let i = 0; i < o.max; i++) keep.push(segs[Math.floor(((i + 0.5) * segs.length) / o.max)])
    return keep
  }
  return segs
}

/** Tiny dots (very short strokes) inside region minus `minus`. */
export function stipple(region: Pt[], minus: Pt[][], r: Rng, count: number): Pt[][] {
  const o = occOf(region), M = minus.map(occOf)
  const out: Pt[][] = []
  for (let t = 0; t < count * 25 && out.length < count; t++) {
    const p: Pt = [r.range(o.x0, o.x1), r.range(o.y0, o.y1)]
    if (pip(region, p) && !M.some(m => inOcc(m, p))) out.push([p, [p[0] + 0.35, p[1] + 0.3]])
  }
  return out
}

// ---- hidden-line removal -------------------------------------------------------

/** Cut away the parts of a polyline that fall inside any occluder. */
export function clipOut(line: Pt[], occs: Occ[]): Pt[][] {
  if (!occs.length || line.length < 2) return [line]
  const inside = (p: Pt) => occs.some(o => inOcc(o, p))
  const out: Pt[][] = []
  let cur: Pt[] = []
  let prev = line[0], prevIn = inside(prev)
  if (!prevIn) cur.push(prev)
  const edge = (a: Pt, b: Pt, aIn: boolean): Pt => {
    let lo = 0, hi = 1
    for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (inside(lerp(a, b, m)) === aIn) lo = m; else hi = m }
    return lerp(a, b, (lo + hi) / 2)
  }
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i]
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1])
    const near = occs.some(o => x1 >= o.x0 && x0 <= o.x1 && y1 >= o.y0 && y0 <= o.y1)
    const steps = near ? Math.max(1, Math.ceil(dist(a, b) / 1)) : 1
    prev = a
    for (let s = 1; s <= steps; s++) {
      const p = s === steps ? b : lerp(a, b, s / steps)
      const pIn = near ? inside(p) : false
      if (pIn !== prevIn) {
        const q = edge(prev, p, prevIn)
        if (pIn) { cur.push(q); if (cur.length > 1) out.push(cur); cur = [] }
        else cur = [q]
      }
      if (!pIn && s === steps) cur.push(p)
      prev = p
      prevIn = pIn
    }
  }
  if (cur.length > 1) out.push(cur)
  return out.filter(l => perimeter(l, false) > 1.6)
}

/** Apply a point transform to every coordinate of a mark. */
export function mapMark(m: Mark, f: (p: Pt) => Pt): Mark {
  const g = (ls?: Pt[][]) => ls?.map(l => l.map(f))
  return { ...m, ink: g(m.ink), thin: g(m.thin), fill: g(m.fill), band: g(m.band) }
}

/**
 * Shadow ticks along one side of an outline: short parallel strokes in direction
 * `dir`, placed where the outline faces `side`, longest where it faces it squarely
 * and fading out to nothing, so they read as shading rather than a ruler.
 */
export function rimTicks(outline: Pt[], r: Rng, o: { side: Pt; dir: Pt; count: number; len: number; gap?: number }): Pt[][] {
  const n = outline.length
  let cx = 0, cy = 0
  for (const p of outline) { cx += p[0]; cy += p[1] }
  cx /= n; cy /= n
  const sl = Math.hypot(...o.side), sx = o.side[0] / sl, sy = o.side[1] / sl
  const dl = Math.hypot(...o.dir), dx = o.dir[0] / dl, dy = o.dir[1] / dl
  const facing: { i: number; w: number }[] = []
  outline.forEach((p, i) => {
    const a = outline[(i - 1 + n) % n], b = outline[(i + 1) % n]
    let nx = b[1] - a[1], ny = -(b[0] - a[0])
    const l = Math.hypot(nx, ny) || 1
    nx /= l; ny /= l
    if (nx * (p[0] - cx) + ny * (p[1] - cy) < 0) { nx = -nx; ny = -ny }
    const w = nx * sx + ny * sy
    if (w > 0.35) facing.push({ i, w })
  })
  if (!facing.length) return []
  // walk the facing run in order, evenly spaced picks
  const out: Pt[][] = []
  const step = facing.length / o.count
  for (let k = 0; k < o.count; k++) {
    const f = facing[Math.min(facing.length - 1, Math.floor((k + r.range(0.3, 0.7)) * step))]
    const p = outline[f.i], g = o.gap ?? 1.6
    const L = o.len * ((f.w - 0.35) / 0.65) ** 1.3 * r.range(0.75, 1.1)
    if (L < 1.5) continue
    out.push([[p[0] + dx * g, p[1] + dy * g], [p[0] + dx * (g + L), p[1] + dy * (g + L)]])
  }
  return out
}

/** A second, offset run of an outline on its shadow side — the pen going round again. */
export function echo(outline: Pt[], r: Rng, dx: number, dy: number, inside: boolean): Pt[][] {
  const moved = shift(outline, dx, dy)
  const o = occOf(outline)
  const loop = [...moved, moved[0]]
  let parts: Pt[][]
  if (inside) {
    // keep the runs that stay inside the outline
    parts = []
    let cur: Pt[] = []
    for (const p of loop) { if (inOcc(o, p)) cur.push(p); else { if (cur.length > 1) parts.push(cur); cur = [] } }
    if (cur.length > 1) parts.push(cur)
  } else parts = clipOut(loop, [o])
  return parts
    .filter(p => perimeter(p, false) > 24)
    .map(p => { const m = p.length, a = Math.floor(m * r.range(0.12, 0.25)), b = Math.ceil(m * r.range(0.75, 0.88)); return p.slice(a, b) })
    .filter(p => p.length > 1)
}
