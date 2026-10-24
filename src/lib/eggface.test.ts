import { describe, expect, it } from 'vitest'
import { dish } from './dish'
import { forkRecipe } from './download'
import { EGGFACE_APP, isEggface } from './eggface'
import { contrast, palette } from './palettes'
import { plateLayerStats, plateMarkup } from './plate'
import { dishPattern } from './station'
import { haps, onsets } from './strudel-check'

describe('the Eggface easter egg', () => {
  it('answers to Eggface however it is typed', () => {
    for (const w of ['Eggface', 'eggface', ' EGGFACE ', 'egg face', 'Egg Face', 'egg-face']) expect(isEggface(w), w).toBe(true)
    for (const w of ['egg', 'eggs', 'face', 'eggfaces', 'egg face off', 'leek']) expect(isEggface(w), w).toBe(false)
  })

  it('is an omelette aux fines herbes, French, the same however it is typed', () => {
    const d = dish('egg face')
    expect(d.title).toBe('Omelette aux fines herbes')
    expect(d.cu).toBe('French')
    expect(d.easter).toBe('eggface')
    expect(d.kind).toBe('omelette')
    expect(d.garnish).toContain('face')
    expect(dish('Eggface')).toEqual(d)
    expect(d.seed).toBe('Eggface')
  })

  it('has a real recipe: eggs, butter and the four fines herbes, in three steps', () => {
    const d = dish('Eggface')
    const names = d.ing.map(i => i.name.toLowerCase())
    for (const n of ['eggs', 'butter', 'chives', 'chervil', 'parsley', 'tarragon']) expect(names.join('|'), n).toContain(n)
    expect(d.steps).toHaveLength(3)
    expect(d.r.every(v => v >= 0 && v <= 5)).toBe(true)
    for (const i of d.ing) expect(i.layer).toMatch(/^(plate|sauce|main|crunch|herbs)$/)
  })

  it('leaves every other word alone', () => {
    expect(dish('leek').easter).toBeUndefined()
    expect(dish('egg').cu).not.toBe('French')
  })

  it('downloads as a forkrecipe', () => {
    const f = forkRecipe(dish('Eggface'))
    expect(f).toMatchObject({ title: 'Omelette aux fines herbes', cuisine: 'French', seed: 'Eggface' })
  })

  it('draws a rolled omelette with a chive face on top', () => {
    const d = dish('Eggface')
    const stats = plateLayerStats(d)
    expect(stats[2].strokes).toBeGreaterThan(0) // the omelette
    expect(stats[4].strokes).toBeGreaterThanOrEqual(6) // brows, eyes, nose, mouth
    expect(plateMarkup(d, { kind: 'static' })).toContain('#5f8f3a') // chive green
  })

  it('has a colour world that passes contrast like the others', () => {
    for (const mode of ['light', 'dark'] as const) {
      const p = palette('French', mode)
      expect(p.acc).not.toBe(palette('Martian', mode).acc)
      expect(contrast(p.btn, p.onBtn)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('plays E G G F A C E, entering with the omelette, the last E with the face', async () => {
    const p = dishPattern(dish('Eggface'))
    expect(p.code).toContain('note("e4 g4 g4 f4 a4 c5 e5')
    expect(p.parts.map(x => x.layer)).toEqual(['plate', 'sauce', 'main', 'crunch', 'herbs'])
    expect(await haps(p.code, 4)).toBeGreaterThan(0)
    const main = p.parts[2]
    const cps = p.cpm / 60
    const evs = (await onsets(main.code, 2)).sort((a, b) => a - b)
    expect(evs[0]).toBeCloseTo(1.6 * cps, 2) // the melody starts as the omelette draws
    expect(evs.length).toBeGreaterThanOrEqual(7)
    const lastE = evs[6] / cps // seconds
    expect(lastE).toBeGreaterThanOrEqual(3.0) // the face starts drawing at 3.0 s…
    expect(lastE).toBeLessThanOrEqual(3.9) // …and is done by 3.9 s
  })

  it('credits the game with a real App Store link', () => {
    expect(EGGFACE_APP).toBe('https://apps.apple.com/us/app/eggface-music-land/id6817093907')
  })
})
