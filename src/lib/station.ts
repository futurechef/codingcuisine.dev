// Food, cooked by code: the plate drawing plays the music.
// A dish becomes Strudel source code with five parts, one per drawn layer
// (plate, sauce, main, crunch, herbs). The cuisine sets the key and instruments; the
// drawing sets the rest: arrangement → melody, plate shape → room, sauce style → bass,
// garnishes → sparkle, strokes → note density and length, colours → tone.
//
// Pure: no DOM, no Strudel. The code string is what the page shows and what gets played.
// Only fixed tokens and numbers go into it, never the seed word or titles.
// These tables are first drafts, meant to be tuned by ear.

import type { Dish } from './dish'
import { voice, type Instrument } from './instruments'
import type { Garnish, Kind, SauceStyle, Shape } from './look'
import { LAYER_AT, plateLayerStats, type LayerStats } from './plate'
import { rng } from './rng'

export type LayerName = 'plate' | 'sauce' | 'main' | 'crunch' | 'herbs'
export const LAYERS: readonly LayerName[] = ['plate', 'sauce', 'main', 'crunch', 'herbs']

export const MAX_PART_GAIN = 0.35
export const MASTER_GAIN = 0.5
/** Cycles per minute; at four beats a cycle, 60–80 bpm. */
export const CPM_MIN = 15
export const CPM_MAX = 20

export interface PatternPart { layer: LayerName; at: number; code: string }
export interface StationPattern { code: string; parts: PatternPart[]; cpm: number; label: string }

export interface CuisineSound {
  /** Root note and mode, Strudel style (colons, no spaces): 'D:minor:pentatonic'. */
  root: string
  mode: string
  cpm: [number, number]
  lead: Instrument
  pad: Instrument
  bass: Instrument
}

export const CUISINE_SOUND: Record<string, CuisineSound> = {
  'Farmers-market': { root: 'G', mode: 'major:pentatonic', cpm: [17, 20], lead: 'pluck', pad: 'pad', bass: 'bass' },
  Indian: { root: 'D', mode: 'mixolydian', cpm: [15, 17], lead: 'pluck', pad: 'tanpura', bass: 'bass' },
  Italian: { root: 'F', mode: 'lydian', cpm: [16, 19], lead: 'warm', pad: 'pad', bass: 'bass' },
  Japanese: { root: 'D', mode: 'minor:pentatonic', cpm: [15, 17], lead: 'koto', pad: 'drone', bass: 'bass' },
  Korean: { root: 'Eb', mode: 'major:pentatonic', cpm: [16, 18], lead: 'koto', pad: 'drone', bass: 'bass' },
  Levantine: { root: 'D', mode: 'phrygian:dominant', cpm: [15, 18], lead: 'pluck', pad: 'drone', bass: 'bass' },
  Mediterranean: { root: 'A', mode: 'dorian', cpm: [16, 19], lead: 'warm', pad: 'pad', bass: 'bass' },
  Mexican: { root: 'G', mode: 'mixolydian', cpm: [17, 20], lead: 'pluck', pad: 'pad', bass: 'bass' },
  Nordic: { root: 'E', mode: 'aeolian', cpm: [15, 16], lead: 'glass', pad: 'drone', bass: 'bass' },
  'North African': { root: 'A', mode: 'harmonic:minor', cpm: [15, 18], lead: 'pluck', pad: 'drone', bass: 'bass' },
  'Southeast Asian': { root: 'C', mode: 'major:pentatonic', cpm: [16, 19], lead: 'bell', pad: 'drone', bass: 'bass' },
}
const FALLBACK = CUISINE_SOUND['Farmers-market']

/** Arrangement → the main part's melody: scale degrees in mini-notation, and its voice. */
export const MOTIF: Record<Kind, { notes: string; voice: Instrument | 'lead' }> = {
  logs: { notes: '0 ~ 2 ~ 4 ~ 2 ~', voice: 'lead' },
  pile: { notes: '[0,2] ~ [1,4] ~', voice: 'lead' },
  fan: { notes: '0 1 2 3 4 5 ~ ~', voice: 'glass' },
  quenelle: { notes: '<0 4> ~ ~ 2', voice: 'glass' },
  scatter: { notes: '0? ~ ~ 3? ~ 5? ~ ~ ~ 1? ~ ~', voice: 'bell' },
  stack: { notes: '[0,2,4] ~ [1,3,5] ~', voice: 'pad' },
  slices: { notes: '2 2 2 2', voice: 'lead' },
  torn: { notes: '0 ~ 3 ~ ~ 1 ~ ~ 4 ~', voice: 'koto' },
  nest: { notes: '{0 2 4, 1 3 5 7}', voice: 'koto' },
  mound: { notes: '0 ~ 0 ~', voice: 'warm' },
  swirl: { notes: '0 2 4 7 4 2', voice: 'glass' },
  egg: { notes: '4 ~ ~ ~ ~ ~ ~ ~', voice: 'bell' },
  halves: { notes: '<[0 2 4 ~] [4 2 0 ~]>', voice: 'lead' },
}

/** Plate shape → the room the dish plays in. */
export const ROOM: Record<Shape, { room: number; size: number; delay: number }> = {
  round: { room: 0.5, size: 4, delay: 0.15 },
  coupe: { room: 0.3, size: 2, delay: 0.1 },
  square: { room: 0.35, size: 3, delay: 0.05 },
  oval: { room: 0.5, size: 5, delay: 0.3 },
  slate: { room: 0.25, size: 2, delay: 0.2 },
  bowl: { room: 0.6, size: 3, delay: 0.1 },
  board: { room: 0.2, size: 1.5, delay: 0.15 },
}

/** Sauce style → the bass line's gesture (scale degrees, how slow). `none` is silence. */
export const SAUCE_GESTURE: Record<Exclude<SauceStyle, 'none'>, { notes: string; slow: number }> = {
  pool: { notes: '0', slow: 4 },
  swoosh: { notes: '0 4', slow: 4 },
  dots: { notes: '0 ~ 4 ~', slow: 2 },
  drizzle: { notes: '4 3 2 1', slow: 2 },
}

/** Garnish → the herbs part's sparkle voice (the first garnish leads). */
export const GARNISH_VOICE: Record<Garnish, Instrument> = {
  leaf: 'glass',
  micro: 'sparkle',
  seed: 'tick',
  crumb: 'tick',
  oil: 'glass',
  flake: 'bell',
  zest: 'sparkle',
  chilli: 'warm',
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const r2 = (v: number) => Math.round(v * 100) / 100

/** Hex colour → lightness 0–1 and whether its hue is warm (reds, oranges, yellows). */
function tone(hex: string): { light: number; warm: boolean } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h.slice(0, 6)
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
  if ([r, g, b].some(Number.isNaN)) return { light: 0.5, warm: true }
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hue = 0
  if (max !== min) {
    const d = max - min
    hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  return { light: (max + min) / 2, warm: hue < 70 || hue > 320 }
}

/** Low-pass cutoff from a layer's colour: lighter opens it, warm hues pull it down a touch. */
function cutoff(hex: string, lo: number, hi: number): number {
  const t = tone(hex)
  return Math.round((lo + (hi - lo) * t.light) * (t.warm ? 0.85 : 1))
}

const scale = (s: CuisineSound, octave: number) => `"${s.root}${octave}:${s.mode}"`

/** The dish's music. `stats` defaults to the dish's own drawing (a seam for tests). */
export function dishPattern(d: Dish, stats: LayerStats[] = plateLayerStats(d)): StationPattern {
  const s = CUISINE_SOUND[d.cu] ?? FALLBACK
  const r = rng(d.seed, 'station')
  const [, , sour, , umami] = d.r
  const cpm = clamp(Math.round(r.range(s.cpm[0], s.cpm[1]) * 2) / 2, CPM_MIN, CPM_MAX)
  const room = ROOM[d.shape] ?? ROOM.round

  // plate: the drone. Umami sinks it and closes the filter.
  const deep = umami >= 3
  const plate = `n("<0 [0,4]>").scale(${scale(s, deep ? 2 : 3)}).${voice(s.pad)}.lpf(${cutoff(stats[0].colour, deep ? 300 : 500, deep ? 900 : 1600)}).slow(4).velocity(.7)`

  // sauce: the bass gesture.
  const g = d.sauceStyle && d.sauceStyle !== 'none' ? SAUCE_GESTURE[d.sauceStyle] : null
  const sauce = g
    ? `n("${g.notes}").scale(${scale(s, 2)}).${voice(s.bass)}.lpf(${cutoff(stats[1].colour, 250, 700)}).slow(${g.slow}).velocity(.8)`
    : 'silence'

  // main: the arrangement's melody. Long strokes hold notes longer; sour adds a little waver.
  const m = MOTIF[d.kind] ?? MOTIF.logs
  const release = r2(clamp(stats[2].meanLength / 20, 0.2, 2))
  const waver = sour >= 3 ? `.vib(4).vibmod(${r2(sour * 0.03)})` : ''
  const slow = r.pick([1, 2])
  const main = `n("${m.notes}").scale(${scale(s, 4)}).${voice(m.voice === 'lead' ? s.lead : m.voice)}.release(${release}).lpf(${cutoff(stats[2].colour, 900, 4000)})${waver}.slow(${slow}).velocity(.8)`

  // crunch: soft ticks, as many as the crunch has strokes (within reason).
  const hits = clamp(Math.round(stats[3].strokes / 4), 1, 5)
  const crunch = `n("0(${hits},16)").scale(${scale(s, 5)}).${voice('tick')}.velocity(.4)`

  // herbs: sparkle. Busier garnish, more notes.
  const density = clamp(Math.round(stats[4].strokes / 3), 2, 16)
  const sparkle = GARNISH_VOICE[d.garnish?.[0] ?? 'leaf'] ?? 'sparkle'
  const herbs = `n(irand(8).segment(${density})).scale(${scale(s, 5)}).degradeBy(.6).${voice(sparkle)}.velocity(.5)`

  // Each layer comes in when it's drawn: its first note is shifted to the layer's draw time
  // (the engine restarts the cycle at every change, so cycle 0 is when the drawing starts).
  // Anything that would have sounded before then (the tail of the shifted cycle) is filtered out.
  const late = (i: number) => {
    const at = Math.round(LAYER_AT[i] * (cpm / 60) * 1000) / 1000
    return at ? `.late(${at}).filterWhen(t => t >= ${at})` : ''
  }
  const codes = [plate, sauce, main, crunch, herbs].map((c, i) => `${c}${c === 'silence' ? '' : late(i)}.gain(layer(${i}))`)
  const notes = ['plate: the drone', 'sauce: the bass', 'main: the arrangement', 'crunch: soft ticks', 'herbs: sparkle']
  const parts = LAYERS.map((layer, i) => ({ layer, at: LAYER_AT[i], code: codes[i] }))

  const code = [
    `// food, cooked by code · ${s.root} ${s.mode.replace(/:/g, ' ')}`,
    `setcpm(${cpm})`,
    'stack(',
    ...parts.map((p, i) => `  // ${notes[i]}\n  ${p.code},`),
    `).room(${room.room}).roomsize(${room.size}).delay(${room.delay}).delaytime(.375).delayfeedback(.3)`,
  ].join('\n')

  return { code, parts, cpm, label: d.cu }
}
