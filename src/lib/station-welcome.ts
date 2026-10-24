// The welcome page's music: the spinning circles that write "codingcuisine" are a
// Fourier series, the same maths as additive synthesis. Each of the largest circles
// becomes a soft sine tone: its speed sets the pitch, its size the loudness.

import { byAmplitude, dft, type Coef } from './fourier'
import { MAX_PART_GAIN, type StationPattern } from './station'
import { plateLoop, wordmarkLoop } from './welcome-paths'

/** Only the biggest circles are heard: plenty for the shape, kind to the CPU and the ear. */
export const MAX_PARTIALS = 16
const BASE = 110 // A2: a circle turning once per loop
const TOP = 1760

export type WelcomeShape = 'word' | 'plate'
const circles: Partial<Record<WelcomeShape, Coef[]>> = {}
/** A loop's circles, largest first (no fixed offset). Computed once per shape. */
const ordered = (shape: WelcomeShape) =>
  (circles[shape] ??= byAmplitude(dft((shape === 'word' ? wordmarkLoop() : plateLoop()).pts)).filter(c => c.freq !== 0))

/** A circle's speed as a pitch, folded down by octaves into the calm band. */
function pitch(freq: number): number {
  let f = BASE * Math.abs(freq)
  while (f > TOP) f /= 2
  return Math.round(f * 100) / 100
}

/** The welcome music for the circle count on the slider (4–256): the word while it's written, then the plate it morphs into. */
export function welcomePattern(count: number, shape: WelcomeShape = 'word'): StationPattern {
  const cs = ordered(shape).slice(0, Math.max(1, Math.min(count, MAX_PARTIALS)))
  const total = cs.reduce((t, c) => t + c.amp, 0) || 1
  const floor3 = (v: number) => Math.floor(v * 1000) / 1000 // never round a sum up past the ceiling
  const tones = cs.map(c => `  freq(${pitch(c.freq)}).s("sine").attack(3).release(4).gain(${floor3((MAX_PART_GAIN * c.amp) / total)}),`)
  const code = [
    shape === 'word' ? '// welcome: the circles that write the word, as tones' : '// welcome: the circles that draw the plate, settling',
    '// each circle turns at its own speed (pitch); its size sets how loud',
    'setcpm(15)',
    'stack(',
    ...tones,
    shape === 'word' ? ').slow(2).room(.6).roomsize(5)' : ').slow(4).room(.7).roomsize(6)',
  ].join('\n')
  return { code, parts: [], cpm: 15, label: 'Welcome' }
}
