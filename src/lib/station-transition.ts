// How the station moves between pieces: fade out, swap, fade in, or build with the drawing.
// Pure and clock-driven: no timers, no Strudel. The engine polls levels(), which also
// fires the swap (evaluate) when a fade-out ends.

import { MASTER_GAIN, MAX_PART_GAIN, type StationPattern } from './station'

export type Target =
  | { kind: 'dish'; pattern: StationPattern; take: number; draws: boolean }
  | { kind: 'ambient'; pattern: StationPattern }
  | { kind: 'welcome'; pattern: StationPattern }

/** master drives the output gain; parts say which layers are sounding (for the code highlight). */
export interface Levels { master: number; parts: number[] }

/** Arriving on a drawing: the old music dips out quickly so the build-up carries the moment. */
export const OUT_TO_DRAWING_MS = 1200
/** Any other change fades out, then in, over these. */
export const OUT_MS = 3000
export const IN_MS = 3000
export const PAUSE_MS = 1000
const LAYER_MS = 900

type Phase =
  | { kind: 'silent' }
  | { kind: 'in'; start: number; build: number[] | null } // build: layer start offsets (ms), or none
  | { kind: 'out'; start: number; from: number; dur: number }
  | { kind: 'stopping'; start: number; from: number; parts: number[] }

const FULL = () => Array(5).fill(MAX_PART_GAIN) as number[]
const ramp = (elapsed: number, dur: number) => Math.min(1, Math.max(0, elapsed / dur))

function same(a: Target | null, b: Target | null) {
  if (!a || !b || a.kind !== b.kind || a.pattern.code !== b.pattern.code) return false
  return a.kind !== 'dish' || b.kind !== 'dish' || a.take === b.take
}

const drawsIn = (t: Target) => t.kind === 'dish' && t.draws && t.pattern.parts.length === 5

export class Transitioner {
  private want: Target | null = null
  private current: Target | null = null
  private phase: Phase = { kind: 'silent' }
  private on = false
  private readonly evaluate: (code: string) => void
  private readonly now: () => number

  constructor(opts: { evaluate: (code: string) => void; now: () => number }) {
    this.evaluate = opts.evaluate
    this.now = opts.now
  }

  get playing() { return this.on }
  /** What the station is following now (playing or not). */
  get target() { return this.want }

  set(target: Target): void {
    this.want = target
    if (!this.on) return
    if (this.phase.kind !== 'out' && same(target, this.current)) return
    if (!this.current) return this.swap(this.now(), false)
    const l = this.levels()
    this.phase = { kind: 'out', start: this.now(), from: l.master, dur: drawsIn(target) ? OUT_TO_DRAWING_MS : OUT_MS }
  }

  play(): void {
    this.on = true
    if (this.want) this.swap(this.now(), false)
  }

  pause(): void {
    if (!this.on) return
    const l = this.levels()
    this.on = false
    this.phase = { kind: 'stopping', start: this.now(), from: l.master, parts: l.parts }
  }

  levels(): Levels {
    const now = this.now()
    const p = this.phase
    switch (p.kind) {
      case 'silent':
        return { master: 0, parts: FULL() }
      case 'stopping': {
        const k = ramp(now - p.start, PAUSE_MS)
        if (k >= 1) this.phase = { kind: 'silent' }
        return { master: p.from * (1 - k), parts: p.parts }
      }
      case 'out': {
        const k = ramp(now - p.start, p.dur)
        // The outgoing piece reads as silent layers, so the incoming code doesn't light up early.
        if (k < 1) return { master: p.from * (1 - k), parts: [0, 0, 0, 0, 0] }
        this.swap(p.start + p.dur, drawsIn(this.want!))
        return this.levels()
      }
      case 'in': {
        const el = now - p.start
        if (!p.build) return { master: MASTER_GAIN * ramp(el, IN_MS), parts: FULL() }
        return { master: MASTER_GAIN, parts: p.build.map(at => MAX_PART_GAIN * ramp(el - at, LAYER_MS)) }
      }
    }
  }

  private swap(start: number, build: boolean) {
    const t = this.want!
    this.current = t
    this.evaluate(t.pattern.code)
    this.phase = { kind: 'in', start, build: build ? t.pattern.parts.map(x => x.at * 1000) : null }
  }
}
