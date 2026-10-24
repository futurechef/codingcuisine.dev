import { describe, expect, it } from 'vitest'
import { MASTER_GAIN, MAX_PART_GAIN, type StationPattern } from './station'
import { Transitioner, type Target } from './station-transition'

const pat = (code: string, layered = true): StationPattern => ({
  code,
  cpm: 16,
  label: 'x',
  parts: layered ? [0, 0.9, 1.6, 2.4, 3].map((at, i) => ({ layer: (['plate', 'sauce', 'main', 'crunch', 'herbs'] as const)[i], at, code: '' })) : [],
})
const dishT = (code: string, take = 0, draws = true): Target => ({ kind: 'dish', pattern: pat(code), take, draws })
const ambientT = (code: string): Target => ({ kind: 'ambient', pattern: pat(code, false) })

function rig() {
  let t = 0
  const evaluated: string[] = []
  const tr = new Transitioner({ evaluate: c => evaluated.push(c), now: () => t })
  /** Advance the clock in 10 ms steps, polling levels like the engine does, and return the peak levels seen. */
  const run = (ms: number) => {
    let master = 0, part = 0
    for (let end = t + ms; t < end; t += 10) {
      const l = tr.levels()
      master = Math.max(master, l.master)
      part = Math.max(part, ...l.parts)
    }
    return { master, part }
  }
  return { tr, evaluated, run, at: (ms: number) => { t = ms }, now: () => t }
}

describe('Transitioner', () => {
  it('first play evaluates at once and fades the master in over 3 s, all parts full', () => {
    const { tr, evaluated, run } = rig()
    tr.set(ambientT('A'))
    expect(evaluated).toEqual([])
    tr.play()
    expect(evaluated).toEqual(['A'])
    run(1500)
    expect(tr.levels().master).toBeCloseTo(MASTER_GAIN / 2, 1)
    run(1600)
    expect(tr.levels()).toEqual({ master: MASTER_GAIN, parts: Array(5).fill(MAX_PART_GAIN) })
  })

  it('a dish with a drawing: 1.2 s out, then the parts build with the layers', () => {
    const { tr, evaluated, run } = rig()
    tr.set(ambientT('A'))
    tr.play()
    run(4000)
    tr.set(dishT('D'))
    run(600)
    expect(tr.levels().master).toBeCloseTo(MASTER_GAIN / 2, 1)
    run(600)
    tr.levels()
    expect(evaluated).toEqual(['A', 'D'])
    // just after evaluate: master is up, parts start silent
    expect(tr.levels().master).toBe(MASTER_GAIN)
    expect(tr.levels().parts[0]).toBeLessThan(0.05)
    run(450) // plate half drawn, sauce not started
    const mid = tr.levels().parts
    expect(mid[0]).toBeCloseTo(MAX_PART_GAIN / 2, 1)
    expect(mid[1]).toBe(0)
    run(4500)
    expect(tr.levels().parts).toEqual(Array(5).fill(MAX_PART_GAIN))
  })

  it('any other change: 3 s out, evaluate, 3 s in with full parts', () => {
    const { tr, evaluated, run } = rig()
    tr.set(dishT('D', 0, false))
    tr.play()
    run(4000)
    tr.set(ambientT('A'))
    run(2900)
    expect(evaluated).toEqual(['D'])
    run(200)
    expect(evaluated).toEqual(['D', 'A'])
    expect(tr.levels().parts).toEqual(Array(5).fill(MAX_PART_GAIN))
    run(3100)
    expect(tr.levels().master).toBe(MASTER_GAIN)
  })

  it('latest target wins, evaluated once, master never above its ceiling', () => {
    const { tr, evaluated, run } = rig()
    tr.set(ambientT('A'))
    tr.play()
    run(4000)
    tr.set(ambientT('B'))
    run(500)
    tr.set(dishT('C'))
    let peak = run(300).master
    tr.set(ambientT('E'))
    peak = Math.max(peak, run(10000).master)
    expect(evaluated).toEqual(['A', 'E'])
    expect(peak).toBeLessThanOrEqual(MASTER_GAIN)
  })

  it('replaying the drawing restarts the build-up and never overshoots', () => {
    const { tr, evaluated, run } = rig()
    tr.set(dishT('D', 0))
    tr.play()
    run(5000)
    let peak = 0
    for (let take = 1; take <= 5; take++) {
      tr.set(dishT('D', take))
      peak = Math.max(peak, run(200).part)
    }
    peak = Math.max(peak, run(1300).part)
    expect(evaluated).toEqual(['D', 'D'])
    expect(tr.levels().parts[4]).toBe(0) // herbs wait for their layer again
    peak = Math.max(peak, run(5000).part)
    expect(peak).toBeLessThanOrEqual(MAX_PART_GAIN)
    expect(tr.levels().parts).toEqual(Array(5).fill(MAX_PART_GAIN))
  })

  it('during a fade-out the old piece’s layers read as silent (nothing lights early)', () => {
    const { tr, run } = rig()
    tr.set(ambientT('A'))
    tr.play()
    run(4000)
    tr.set(dishT('D'))
    run(300)
    expect(tr.levels().parts).toEqual([0, 0, 0, 0, 0])
  })

  it('the same target again changes nothing', () => {
    const { tr, evaluated, run } = rig()
    tr.set(dishT('D', 3))
    tr.play()
    run(5000)
    tr.set(dishT('D', 3))
    run(5000)
    expect(evaluated).toEqual(['D'])
  })

  it('paused: changes are only recorded; play gives the full loop with no build-up', () => {
    const { tr, evaluated, run } = rig()
    tr.set(ambientT('A'))
    tr.play()
    run(4000)
    tr.pause()
    run(1000)
    expect(tr.levels().master).toBe(0)
    expect(tr.playing).toBe(false)
    tr.set(dishT('D'))
    run(3000)
    expect(evaluated).toEqual(['A'])
    tr.play()
    expect(evaluated).toEqual(['A', 'D'])
    expect(tr.levels().parts).toEqual(Array(5).fill(MAX_PART_GAIN))
    run(3100)
    expect(tr.levels().master).toBe(MASTER_GAIN)
  })

  it('pause fades the master to silence over 1 s', () => {
    const { tr, run } = rig()
    tr.set(ambientT('A'))
    tr.play()
    run(4000)
    tr.pause()
    run(500)
    expect(tr.levels().master).toBeCloseTo(MASTER_GAIN / 2, 1)
    run(600)
    expect(tr.levels().master).toBe(0)
  })
})
