/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { dish, type Dish } from './dish'
import { INSTRUMENTS, voice } from './instruments'
import { ARRANGEMENTS, PLATE_SHAPES, SAUCE_STYLES } from './look'
import { CUISINES } from './pantry'
import { plateLayerStats } from './plate'
import stationSource from './station.ts?raw'
import { CPM_MAX, CPM_MIN, CUISINE_SOUND, GARNISH_VOICE, LAYERS, MOTIF, dishPattern } from './station'

const part = (d: Dish, layer: string, stats?: Parameters<typeof dishPattern>[1]) =>
  dishPattern(d, stats).parts.find(p => p.layer === layer)!.code

describe('dishPattern', () => {
  it('same dish gives identical code', () => {
    expect(dishPattern(dish('leek')).code).toBe(dishPattern(dish('leek')).code)
  })

  it('every cuisine has a sound', () => {
    expect(Object.keys(CUISINE_SOUND).sort()).toEqual([...new Set(CUISINES.map(c => c.cu))].sort())
  })

  it('five parts in layer order with plate timings', () => {
    const p = dishPattern(dish('fig'))
    expect(p.parts.map(x => x.layer)).toEqual([...LAYERS])
    expect(p.parts.map(x => x.at)).toEqual([0, 0.9, 1.6, 2.4, 3])
    let from = 0
    for (let i = 0; i < 5; i++) {
      const at = p.code.indexOf(`.gain(layer(${i}))`, from)
      expect(at, `layer(${i})`).toBeGreaterThan(-1)
      from = at
    }
  })

  it('stays calm: tempo in range, one setcpm', () => {
    for (let i = 0; i < 200; i++) {
      const p = dishPattern(dish('w' + i))
      expect(p.cpm).toBeGreaterThanOrEqual(CPM_MIN)
      expect(p.cpm).toBeLessThanOrEqual(CPM_MAX)
      expect(p.code.match(/setcpm\(/g)).toHaveLength(1)
    }
  })

  it('never puts user text into the code', () => {
    for (const seed of ['"); hush(); //', 'a\nb', 'x`y', '*/', 'crème brûlée']) {
      const d = dish(seed)
      const { code } = dishPattern(d)
      expect(code).not.toContain(seed)
      expect(code).not.toContain(d.title)
      expect(code).not.toContain('`')
      expect(code).not.toContain('*/')
    }
  })

  it('radar seasons the drone', () => {
    const d = dish('leek')
    const low = { ...d, r: [d.r[0], d.r[1], d.r[2], d.r[3], 0, d.r[5]] }
    const high = { ...d, r: [d.r[0], d.r[1], d.r[2], d.r[3], 5, d.r[5]] }
    expect(part(low, 'plate')).not.toBe(part(high, 'plate'))
  })

  it('the arrangement shapes the main part', () => {
    const d = dish('leek')
    const mains = ARRANGEMENTS.map(kind => part({ ...d, kind }, 'main'))
    expect(new Set(mains).size).toBe(ARRANGEMENTS.length)
  })

  it('the plate shape sets the room', () => {
    const d = dish('leek')
    const codes = PLATE_SHAPES.map(shape => dishPattern({ ...d, shape }).code)
    expect(new Set(codes).size).toBe(PLATE_SHAPES.length)
  })

  it('the sauce style sets the bass gesture, and none is silent', () => {
    const d = dish('leek')
    const sauces = SAUCE_STYLES.map(sauceStyle => part({ ...d, sauceStyle }, 'sauce'))
    expect(new Set(sauces).size).toBe(SAUCE_STYLES.length)
    expect(part({ ...d, sauceStyle: 'none' }, 'sauce')).toMatch(/^silence\.gain\(layer\(1\)\)$/)
  })

  it('more strokes make a busier herbs part', () => {
    const d = dish('leek')
    const stats = plateLayerStats(d)
    const busy = stats.map((s, i) => (i === 4 ? { ...s, strokes: s.strokes * 4 } : s))
    const density = (c: string) => Number(/\.segment\((\d+)\)/.exec(c)?.[1] ?? NaN)
    expect(density(part(d, 'herbs', busy))).toBeGreaterThan(density(part(d, 'herbs', stats)))
  })

  it('uses only registered instruments', () => {
    const used = [
      ...Object.values(CUISINE_SOUND).flatMap(c => [c.lead, c.pad, c.bass]),
      ...Object.values(MOTIF).map(m => m.voice).filter(v => v !== 'lead'), // 'lead' = the cuisine's lead
      ...Object.values(GARNISH_VOICE),
    ]
    for (const name of used) expect(INSTRUMENTS, name).toHaveProperty(name)
    expect(() => voice('nope')).toThrow()
  })

  it('has no Math.random', () => {
    expect(stationSource).not.toContain('Math.random')
  })
})

describe('plateLayerStats', () => {
  it('gives five layers, a drawn plate, and the same numbers every time', () => {
    const d = dish('leek')
    const s = plateLayerStats(d)
    expect(s).toHaveLength(5)
    expect(s[0].strokes).toBeGreaterThan(0)
    expect(s[0].length).toBeGreaterThan(0)
    expect(plateLayerStats(d)).toEqual(s)
  })
})
