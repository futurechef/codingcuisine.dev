// Crunch and the small finishing marks on top.

import type { Garnish } from './look'
import type { Rng } from './rng'
import type { Bed } from './plate-plates'
import { type Mark, type Pt, type Occ, TAU, ellipse, inOcc, organic, quad, xf, bbox } from './plate-geom'

export interface Ctx { bed: Bed; food: Occ[]; sauce: Occ[] }

const onFood = (c: Ctx, p: Pt) => c.food.some(o => inOcc(o, p))

/** A random point on the food (falls back to near the bed centre). */
function spotOnFood(c: Ctx, r: Rng, inset = 0.8): Pt {
  if (c.food.length) {
    const b = bbox(c.food.map(o => o.pts))
    const mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2
    for (let t = 0; t < 60; t++) {
      const p: Pt = [mx + (r.range(b.x0, b.x1) - mx) * inset, my + (r.range(b.y0, b.y1) - my) * inset]
      if (onFood(c, p)) return p
    }
  }
  return [c.bed.cx + r.range(-20, 20) * c.bed.s, c.bed.cy + r.range(-20, 20) * c.bed.s]
}

/** Just off the edge of the food, on the plate. */
function spotAround(c: Ctx, r: Rng): Pt {
  const { cx, cy, s } = c.bed
  for (let t = 0; t < 40; t++) {
    const a = r.range(0, TAU)
    // walk outward from the centre until off the food
    let d = 10 * s
    while (d < 100 * s && onFood(c, [cx + Math.cos(a) * d, cy + Math.sin(a) * d])) d += 3
    d += r.range(3, 9) * s
    const p: Pt = [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.92]
    if (d < 96 * s && !onFood(c, p)) return p
  }
  const a = r.range(0, TAU)
  return [cx + Math.cos(a) * 70 * s, cy + Math.sin(a) * 64 * s]
}

/** In the sauce, clear of the food; else around the food. */
function spotInSauce(c: Ctx, r: Rng): Pt {
  if (c.sauce.length) {
    const b = bbox(c.sauce.map(o => o.pts))
    for (let t = 0; t < 80; t++) {
      const p: Pt = [r.range(b.x0, b.x1), r.range(b.y0, b.y1)]
      if (c.sauce.some(o => inOcc(o, p)) && !onFood(c, p)) return p
    }
  }
  return spotAround(c, r)
}

const closed = (p: Pt[]) => [...p, p[0]]

export function drawCrunch(c: Ctx, r: Rng): Mark[] {
  const fill: Pt[][] = []
  for (let i = 0, n = 5 + r.int(5); i < n; i++) {
    const p = r.chance(0.4) ? spotAround(c, r) : spotOnFood(c, r)
    const sz = r.range(2.4, 4.2)
    fill.push(organic(ellipse(p[0], p[1], sz, sz * r.range(0.7, 0.95), r.range(0, 180)), r, sz * 0.16, [2, 3]))
  }
  return [{ fill, ink: fill.map(closed), inkW: 1.1 }]
}

const lens = (L: number, W: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 20; i++) {
    const a = (TAU * i) / 20, sn = Math.sin(a)
    out.push([(L / 2) * Math.cos(a), (W / 2) * sn * Math.abs(sn) ** 0.6])
  }
  return out
}

type Colours = { crunch: string }

function leaf(c: Ctx, r: Rng): Mark {
  const fill: Pt[][] = [], thin: Pt[][] = []
  for (let i = 0, n = 3 + r.int(3); i < n; i++) {
    const p = spotOnFood(c, r, 0.7), L = r.range(11, 16), W = L * r.range(0.4, 0.5), a = r.range(0, 360)
    const poly = xf(lens(L, W), p[0], p[1], a)
    fill.push(poly)
    thin.push(xf([[-L * 0.42, 0], [L * 0.38, 0]], p[0], p[1], a))
  }
  return { fill, ink: fill.map(closed), inkW: 1.1, thin, thinW: 0.7 }
}

function micro(c: Ctx, r: Rng): Mark {
  const fill: Pt[][] = [], ink: Pt[][] = []
  for (let i = 0, n = 2 + r.int(3); i < n; i++) {
    const p = spotOnFood(c, r, 0.7), a = r.range(0, 360), L = r.range(12, 17), bend = r.range(-3, 3)
    ink.push(xf(quad([0, 0], [L * 0.5, bend], [L, 0], 6), p[0], p[1], a))
    for (let k = 0; k < 3; k++) {
      const t = 0.55 + k * 0.22, side = k % 2 ? 1 : -1
      const lf = xf(ellipse(0, 0, 3.4, 1.7).filter((_, j) => j % 2 === 0), L * t, side * 1.8, side * r.range(35, 60))
      fill.push(xf(lf, p[0], p[1], a))
    }
  }
  return { fill, ink: [...ink, ...fill.map(closed)], inkW: 0.85 }
}

function seed(c: Ctx, r: Rng): Mark {
  const dark = r.chance(0.3), fill: Pt[][] = []
  for (let i = 0, n = 8 + r.int(7); i < n; i++) {
    const p = r.chance(0.75) ? spotOnFood(c, r) : spotAround(c, r)
    fill.push(ellipse(p[0], p[1], 1.8, 1, r.range(0, 180)).filter((_, k) => k % 2 === 0))
  }
  return { fill, ink: fill.map(closed), inkW: 0.75, fc: dark ? '#3a2418' : '#f6ecd2', fo: dark ? 0.85 : 0.95 }
}

function crumb(c: Ctx, r: Rng, col: Colours): Mark {
  const fill: Pt[][] = []
  for (let i = 0, n = 7 + r.int(6); i < n; i++) {
    const p = r.chance(0.45) ? spotAround(c, r) : spotOnFood(c, r)
    const k = 4 + r.int(2), sz = r.range(0.9, 1.8), a0 = r.range(0, TAU)
    fill.push(Array.from({ length: k }, (_, j) => {
      const a = a0 + (j * TAU) / k, d = sz * r.range(0.6, 1.2)
      return [p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d] as Pt
    }))
  }
  return { fill, ink: fill.map(closed), inkW: 0.75, fc: col.crunch, fo: 0.9 }
}

function oil(c: Ctx, r: Rng): Mark {
  const fill: Pt[][] = []
  for (let i = 0, n = 3 + r.int(4); i < n; i++) {
    const p = spotInSauce(c, r), rr = r.range(1.6, 3.6)
    fill.push(ellipse(p[0], p[1], rr, rr * 0.9).filter((_, k) => k % 2 === 0))
  }
  return { fill, ink: fill.map(closed), inkW: 0.75, fc: '#e8c35a', fo: 0.6, occ: false }
}

function flake(c: Ctx, r: Rng): Mark {
  const fill: Pt[][] = []
  for (let i = 0, n = 4 + r.int(5); i < n; i++) {
    const p = spotOnFood(c, r), k = 3 + r.int(2), sz = r.range(2.2, 3.6), a0 = r.range(0, TAU)
    fill.push(Array.from({ length: k }, (_, j) => {
      const a = a0 + (j * TAU) / k + r.range(-0.3, 0.3), d = sz * r.range(0.55, 1)
      return [p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d] as Pt
    }))
  }
  return { fill, ink: fill.map(closed), inkW: 0.75, fc: '#ffffff', fo: 0.9 }
}

function zest(c: Ctx, r: Rng): Mark {
  const ink: Pt[][] = []
  for (let i = 0, n = 4 + r.int(4); i < n; i++) {
    const p = r.chance(0.7) ? spotOnFood(c, r) : spotAround(c, r)
    const R = r.range(2.8, 4.2), sweep = r.range(0.55, 0.85) * TAU, a0 = r.range(0, TAU), dir = r.chance(0.5) ? 1 : -1
    const pts: Pt[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, a = a0 + dir * sweep * t, rr = R * (1 - 0.45 * t)
      pts.push([p[0] + Math.cos(a) * rr, p[1] + Math.sin(a) * rr])
    }
    ink.push(pts)
  }
  return { band: ink, bandW: 2, ink, inkW: 0.85, fc: '#e9b43c', fo: 0.85, occ: false }
}

function chilli(c: Ctx, r: Rng): Mark {
  const fill: Pt[][] = [], thin: Pt[][] = []
  for (let i = 0, n = 3 + r.int(4); i < n; i++) {
    const p = r.chance(0.7) ? spotOnFood(c, r) : spotAround(c, r), R = r.range(2.6, 3.5)
    const ring = organic(ellipse(p[0], p[1], R, R * r.range(0.85, 1), r.range(0, 180)), r, 0.2)
    fill.push(ring)
    const core = ellipse(p[0] + r.range(-0.3, 0.3), p[1] + r.range(-0.3, 0.3), R * 0.42, R * 0.38).filter((_, k) => k % 2 === 0)
    thin.push(closed(core))
  }
  return { fill, ink: fill.map(closed), inkW: 0.95, thin, thinW: 0.6, fc: '#c8442f', fo: 0.75 }
}

/** Chive green, for the face. */
export const CHIVE = '#5f8f3a'

/**
 * Eggface's face, in chives, on the middle of the food: two raised brows, two round eyes
 * (a dot of black pepper in each), a little nose and a small mouth.
 */
function face(c: Ctx, r: Rng): Mark[] {
  const b = c.food.length ? bbox(c.food.map(o => o.pts)) : null
  const cx = b ? (b.x0 + b.x1) / 2 : c.bed.cx, cy = b ? (b.y0 + b.y1) / 2 : c.bed.cy
  const k = ((b ? Math.min(b.x1 - b.x0, (b.y1 - b.y0) * 1.6) : 80) / 80) * 1.7 // fill most of the food
  const line = (pts: Pt[]) => pts.map(([x, y]) => [cx + x * k, cy + y * k] as Pt)
  const brow = (dx: number) => line(quad([dx - 7, -9], [dx, -13 - r.range(0, 1.2)], [dx + 7, -10]))
  const chives = [brow(-11), brow(11), line(quad([0.5, 1.5], [2.2, 5], [-0.5, 6.5])), line(quad([-4, 11], [0, 12.5], [4, 10.6]))]
  const eyes = [-10, 10].map(dx => line(ellipse(dx, -2, 4.2, 4.6)))
  const pupils = [-9, 11].map(dx => line(ellipse(dx, -1.4, 1.5, 1.6)))
  return [
    { band: chives, bandW: 2.4 * Math.max(0.8, k), ink: chives, inkW: 0.85, fc: CHIVE, fo: 0.9, occ: false },
    { fill: eyes, ink: eyes.map(closed), inkW: 0.85, fc: '#fbf6ea', fo: 1, occ: false },
    { fill: pupils, ink: pupils.map(closed), inkW: 0.75, fc: '#3a2418', fo: 1, occ: false },
  ]
}

export function drawGarnish(list: Garnish[], c: Ctx, r: Rng, col: Colours): Mark[] {
  return list.flatMap(g => {
    switch (g) {
      case 'micro': return micro(c, r)
      case 'seed': return seed(c, r)
      case 'crumb': return crumb(c, r, col)
      case 'oil': return oil(c, r)
      case 'flake': return flake(c, r)
      case 'zest': return zest(c, r)
      case 'chilli': return chilli(c, r)
      case 'face': return face(c, r)
      default: return leaf(c, r)
    }
  })
}

