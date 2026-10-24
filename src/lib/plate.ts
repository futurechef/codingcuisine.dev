// Plate geometry as data, so the same strokes render on screen, export as
// SVG / animated SVG, and plot as HPGL.
//
// Everything is drawn from polylines (plate-geom.ts), varied deterministically from
// the look's seed: plate (plate-plates.ts), sauce and main (plate-food.ts), crunch
// and garnish (plate-garnish.ts). Ink hidden behind something drawn later is cut
// away, so pieces overlap like a pen drawing rather than a wireframe.

import {
  ARRANGEMENTS, GARNISHES, PLATE_SHAPES, SAUCE_STYLES,
  type Garnish, type Kind, type PlateLook, type SauceStyle, type Shape,
} from './look'
import { rng } from './rng'
import { type Mark, type Occ, type Pt, clipOut, occOf, orient } from './plate-geom'
import { drawPlate } from './plate-plates'
import { drawMain, drawSauce } from './plate-food'
import { drawCrunch, drawGarnish } from './plate-garnish'

interface Layer { marks: Mark[]; fill: string; fillOpacity: number; shift: [number, number]; at: number }

// Colours end up in raw markup — only ever accept hex.
const hex = (c: unknown, fallback: string) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c) ? c : fallback)
const oneOf = <T extends string>(v: unknown, all: readonly T[], fallback: T): T => (all.includes(v as T) ? (v as T) : fallback)

interface Norm {
  shape: Shape; kind: Kind; sauceStyle: SauceStyle; garnish: Garnish[]
  sauce: string; main: string; crunch: string; herb: string; seed: string
}

function normalise(look: PlateLook): Norm {
  const shape = oneOf(look.shape, PLATE_SHAPES, 'round')
  const kind = oneOf(look.kind, ARRANGEMENTS, 'logs')
  const sauceStyle = oneOf(look.sauceStyle, SAUCE_STYLES, 'pool')
  const garnish: Garnish[] = Array.isArray(look.garnish)
    ? [...new Set(look.garnish.filter(g => (GARNISHES as readonly string[]).includes(g)))].slice(0, 4)
    : ['leaf']
  const sauce = hex(look.sauce, '#e8c872'), main = hex(look.main, '#a9b87a')
  const crunch = hex(look.crunch, '#d9a95c'), herb = hex(look.herb, '#6f8f4e')
  const seed = typeof look.seed === 'string' && look.seed
    ? look.seed
    : [shape, kind, sauce, main, sauceStyle, crunch, herb, garnish.join(',')].join('|')
  return { shape, kind, sauceStyle, garnish, sauce, main, crunch, herb, seed }
}

const cache = new Map<string, Layer[]>()

/** When each layer starts drawing (seconds): plate, sauce, main, crunch, herbs. */
export const LAYER_AT: readonly number[] = [0, 0.9, 1.6, 2.4, 3.0]
/** How long each layer takes to draw (seconds). */
export const LAYER_STEP = 0.9

/** Drawing order: plate → sauce → main → crunch → herbs. `at` is the start time in seconds. */
function layers(look: PlateLook): Layer[] {
  const n = normalise(look)
  const key = JSON.stringify(n)
  const hit = cache.get(key)
  if (hit) return hit

  const plate = drawPlate(n.shape, rng(n.seed, 'plate'))
  const sauce = drawSauce(n.sauceStyle, plate.bed, rng(n.seed, 'sauce'))
  const main = drawMain(n.kind, plate.bed, rng(n.seed, 'main'))
  const ctx = {
    bed: plate.bed,
    food: main.flatMap(m => m.fill ?? []).map(occOf),
    sauce: sauce.filter(m => m.occ !== false).flatMap(m => m.fill ?? []).map(occOf),
  }
  const crunch = drawCrunch(ctx, rng(n.seed, 'crunch'))
  const herbs = drawGarnish(n.garnish, ctx, rng(n.seed, 'garnish'), { crunch: n.crunch })

  const out: Layer[] = [
    { marks: plate.marks.map(m => ({ ...m, occ: false })), fill: plate.fill, fillOpacity: 0.6, shift: [2, 4], at: LAYER_AT[0] },
    { marks: sauce, fill: n.sauce, fillOpacity: 0.65, shift: [3, 4], at: LAYER_AT[1] },
    { marks: main, fill: n.main, fillOpacity: 0.6, shift: [3, 4], at: LAYER_AT[2] },
    { marks: crunch, fill: n.crunch, fillOpacity: 0.8, shift: [1, 1.5], at: LAYER_AT[3] },
    { marks: herbs, fill: n.herb, fillOpacity: 0.6, shift: [1, 1.5], at: LAYER_AT[4] },
  ]
  hideLines(out)
  for (const ly of out) for (const m of ly.marks) if (m.fill) m.fill = m.fill.map(orient)
  if (cache.size > 200) cache.clear()
  cache.set(key, out)
  return out
}

/** Cut each mark's ink where something drawn after it (same or later layer) covers it. */
function hideLines(ls: Layer[]) {
  const flat = ls.flatMap(l => l.marks)
  const occs: Occ[][] = flat.map(m => (m.occ === false ? [] : (m.fill ?? []).map(occOf)))
  flat.forEach((m, i) => {
    const later = occs.slice(i + 1).flat()
    if (!later.length) return
    const cut = (lines?: Pt[][]) => lines?.flatMap(l => clipOut(l, later))
    m.ink = cut(m.ink)
    m.thin = cut(m.thin)
  })
}

export const DRAW_SECONDS = 3.9
const INK = '#3a2418'

const num = (v: number) => String(Math.round(v * 10) / 10)
const pathD = (ls: Pt[][], close: boolean) =>
  ls.filter(l => l.length > 1)
    .map(l => 'M' + num(l[0][0]) + ' ' + num(l[0][1]) + 'L' + l.slice(1).map(p => num(p[0]) + ' ' + num(p[1])).join(' ') + (close ? 'Z' : ''))
    .join('')

function fillSvg(m: Mark, ly: Layer): string {
  let s = ''
  const col = hex(m.fc, ly.fill)
  const op = Math.round((m.fo ?? ly.fillOpacity) * 100) / 100
  if (m.band?.length) {
    s += `<path d="${pathD(m.band, false)}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="${num(m.bandW ?? 3)}" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  if (m.fill?.length) s += `<path d="${pathD(m.fill, true)}"${m.fc ? ` fill="${col}"` : ''}${m.fo != null ? ` fill-opacity="${op}"` : ''}/>`
  return s
}

function inkSvg(m: Mark): string {
  const w = (v: number) => (v === 1.3 ? '' : ` stroke-width="${num(v)}"`)
  let s = ''
  if (m.ink?.length) s += `<path d="${pathD(m.ink, false)}" pathLength="1"${w(m.inkW ?? 1.3)}/>`
  if (m.thin?.length) s += `<path d="${pathD(m.thin, false)}" pathLength="1"${w(m.thinW ?? 0.75)}/>`
  return s
}

export type DrawMode =
  /** Fully drawn, no motion. */
  | { kind: 'static' }
  /** CSS-animated pen drawing (the page). */
  | { kind: 'draw' }
  /** Frozen partway through the drawing at `t` seconds (style guide). */
  | { kind: 'frozen'; t: number }
  /** SMIL-animated, for the downloadable animated SVG. */
  | { kind: 'smil' }

/** Inner markup for a 300×270 viewBox, one string per layer: plate, sauce, main, crunch, herbs. */
export function plateLayersMarkup(look: PlateLook, mode: DrawMode): string[] {
  return layers(look).map((ly, i) => {
    const fills = ly.marks.map(m => fillSvg(m, ly)).join('')
    const inks = ly.marks.map(inkSvg).join('')
    const k = mode.kind === 'frozen' ? Math.min(1, Math.max(0, (mode.t - ly.at) / LAYER_STEP)) : 1
    const op = mode.kind === 'smil' ? 0 : k
    const off = mode.kind === 'smil' ? 1 : 1 - k
    const shift = ` transform="translate(${ly.shift[0]} ${ly.shift[1]})"`
    const smilFill = mode.kind === 'smil'
      ? `<animate attributeName="opacity" from="0" to="1" begin="${ly.at}s" dur="${LAYER_STEP}s" fill="freeze"/>` : ''
    const smilDraw = mode.kind === 'smil'
      ? `<animate attributeName="stroke-dashoffset" from="1" to="0" begin="${ly.at}s" dur="${LAYER_STEP}s" fill="freeze" calcMode="spline" keySplines=".42 0 .58 1" keyTimes="0;1"/>` : ''
    return (
      `<g class="tn d${i}" opacity="${op}" fill="${hex(ly.fill, '#efe2c2')}" fill-opacity="${ly.fillOpacity}" stroke="none"${shift}>${smilFill}${fills}</g>` +
      `<g class="dr d${i}" stroke-dasharray="1" stroke-dashoffset="${off}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${smilDraw}${inks}</g>`
    )
  })
}

export interface LayerStats {
  /** Visible pen strokes (ink, thin and colour bands). */
  strokes: number
  /** Their total length, in drawing units (the 300×270 viewBox). */
  length: number
  meanLength: number
  /** The layer's fill colour (hex). */
  colour: string
}

const lineLength = (l: Pt[]) => l.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0)

/** How much pen each layer uses, in drawing order: what the station turns into notes. */
export function plateLayerStats(look: PlateLook): LayerStats[] {
  return layers(look).map(ly => {
    const lines = ly.marks.flatMap(m => [...(m.ink ?? []), ...(m.thin ?? []), ...(m.band ?? [])]).filter(l => l.length > 1)
    const length = lines.reduce((t, l) => t + lineLength(l), 0)
    return { strokes: lines.length, length, meanLength: lines.length ? length / lines.length : 0, colour: hex(ly.fill, '#efe2c2') }
  })
}

/** Inner markup for a 300×270 viewBox. */
export function plateMarkup(look: PlateLook, mode: DrawMode): string {
  return plateLayersMarkup(look, mode).join('')
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A standalone SVG file of the plate. */
export function plateSvgFile(look: PlateLook, title: string, animated: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 270" width="600" height="540">
<title>${esc(title)}</title>
<rect width="300" height="270" fill="#fbf6ea"/>
${plateMarkup(look, animated ? { kind: 'smil' } : { kind: 'static' })}
</svg>
`
}

// ---- HPGL plotter output ------------------------------------------------------

/** HPGL for a pen plotter: 1 viewBox unit = 0.5 mm (20 plotter units), y flipped. */
export function plateHpgl(look: PlateLook): string {
  const S = 20, W = 300, H = 270
  const xy = ([x, y]: Pt) => `${Math.round(Math.min(W, Math.max(0, x)) * S)},${Math.round((H - Math.min(H, Math.max(0, y))) * S)}`
  const cmds = ['IN', 'SP1']
  for (const ly of layers(look)) {
    for (const m of ly.marks) {
      for (const pts of [...(m.ink ?? []), ...(m.thin ?? [])]) {
        if (pts.length < 2) continue
        cmds.push('PU' + xy(pts[0]), 'PD' + pts.slice(1).map(xy).join(','))
      }
    }
  }
  cmds.push('PU', 'SP0')
  return cmds.join(';\n') + ';\n'
}
