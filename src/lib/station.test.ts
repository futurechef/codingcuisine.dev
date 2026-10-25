/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { dish, type Dish } from './dish'
import { INSTRUMENTS, RECORDED, SAMPLES, SAMPLE_STANDIN, voice } from './instruments'
import { ARRANGEMENTS, PLATE_SHAPES, SAUCE_STYLES } from './look'
import { CUISINES } from './pantry'
import { plateLayerStats } from './plate'
import { haps } from './strudel-check'
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

const LEEK_CODE = "// food, cooked by code · F lydian\nsetcpm(16)\nstack(\n  // plate: the drone\n  n(\"<0 [0,4]>\").scale(\"F2:lydian\").s(\"sawtooth\").attack(1.5).release(3).lpf(700).lpf(621).slow(4).velocity(.7).gain(layer(0)),\n  // sauce: the bass\n  n(\"4 3 2 1\").scale(\"F2:lydian\").s(\"triangle\").attack(.3).release(1.5).lpf(400).lpf(431).slow(2).velocity(.8).late(0.24).filterWhen(t => t >= 0.24).gain(layer(1)),\n  // main: the arrangement\n  n(\"0 ~ 2 ~ 4 ~ 2 ~\").scale(\"F4:lydian\").s(\"triangle\").attack(.2).release(1).release(1.34).lpf(2760).slow(1).velocity(.8).late(0.427).filterWhen(t => t >= 0.427).gain(layer(2)),\n  // crunch: soft ticks\n  n(\"0(2,16)\").scale(\"F5:lydian\").s(\"square\").decay(.03).sustain(0).lpf(1800).velocity(.4).late(0.64).filterWhen(t => t >= 0.64).gain(layer(3)),\n  // herbs: sparkle\n  n(irand(8).segment(8)).scale(\"F5:lydian\").degradeBy(.6).s(\"sine\").decay(.9).sustain(0).velocity(.5).late(0.8).filterWhen(t => t >= 0.8).gain(layer(4)),\n).room(0.2).roomsize(1.5).delay(0.15).delaytime(.375).delayfeedback(.3)"

const SYNTHS = ['sine', 'triangle', 'sawtooth', 'square', 'pink']
const soundNames = (code: string) => [...code.matchAll(/\bs\("([^"]+)"\)/g)].map(m => m[1])
const words = (n: number) => Array.from({ length: n }, (_, i) => ['leek', 'fig', 'miso', 'pear', 'okra', 'kale', 'plum', 'rice', 'dal', 'yuzu'][i % 10] + (i < 10 ? '' : String(i)))

describe('the sound setting', () => {
  it('code sound is unchanged', () => {
    expect(dishPattern(dish('leek')).code).toBe(LEEK_CODE)
    expect(dishPattern(dish('leek'), undefined, 'code').code).toBe(LEEK_CODE)
  })

  it('every instrument has a recorded voicing that starts with a registered sample or a synth', () => {
    expect(Object.keys(RECORDED).sort()).toEqual(Object.keys(INSTRUMENTS).sort())
    for (const [name, chain] of Object.entries(RECORDED)) {
      const first = /^s\("([^"]+)"\)/.exec(chain)?.[1]
      expect([...SAMPLES, ...SYNTHS], name).toContain(first)
      expect(voice(name, 'recorded')).toBe(chain)
    }
    expect(Object.keys(SAMPLE_STANDIN).sort()).toEqual([...SAMPLES].sort())
  })

  it('recorded sound uses only registered samples', () => {
    let usedSample = false
    for (const w of words(50)) {
      for (const n of soundNames(dishPattern(dish(w), undefined, 'recorded').code)) {
        expect([...SAMPLES, ...SYNTHS], w).toContain(n)
        if ((SAMPLES as readonly string[]).includes(n)) usedSample = true
      }
    }
    expect(usedSample).toBe(true)
  })

  it('recorded music still parses and plays', async () => {
    for (const w of words(20)) expect(await haps(dishPattern(dish(w), undefined, 'recorded').code, 4), w).toBeGreaterThan(0)
  }, 30_000)

  it('same word, same sound, same music', () => {
    expect(dishPattern(dish('fig'), undefined, 'recorded').code).toBe(dishPattern(dish('fig'), undefined, 'recorded').code)
    expect(dishPattern(dish('fig'), undefined, 'recorded').code).not.toBe(dishPattern(dish('fig')).code)
  })
})
