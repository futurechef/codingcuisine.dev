import { describe, expect, it } from 'vitest'
import { anatomy, LAYERS, layerSummary } from './anatomy'
import { dish, GUIDE_WORDS, PUN_WORDS, SURPRISE_WORDS } from './dish'
import { INGREDIENTS } from './pantry'

const WORDS = [...new Set([...INGREDIENTS.map(i => i.n), ...GUIDE_WORDS, ...PUN_WORDS, ...SURPRISE_WORDS,
  'hello world', 'bacon', 'x', '', '   ', 'A & B <c>', '</script>', 'naïve café',
  ...Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i * 9)).toISOString().slice(0, 10))])]

describe('anatomy', () => {
  it('covers at least 200 dishes', () => expect(WORDS.length).toBeGreaterThanOrEqual(200))

  it('gives five layers in drawing order, each with a label and caption', () => {
    for (const w of WORDS) {
      const a = anatomy(dish(w))
      expect(a.map(l => l.name)).toEqual(['plate', 'sauce', 'main', 'crunch', 'herbs'])
      expect(a.map(l => l.label)).toEqual(['PLATE', 'SAUCE', 'MAIN', 'CRUNCH', 'HERBS & FINISH'])
      for (const l of a) expect(l.caption.trim(), `${w}: ${l.name}`).not.toBe('')
    }
  })

  it('puts every ingredient and every step in exactly one layer', () => {
    for (const w of WORDS) {
      const d = dish(w), a = anatomy(d)
      for (const i of d.ing) expect(a.filter(l => l.ingredients.includes(i)), `${w}: ${i.name}`).toHaveLength(1)
      for (const s of d.steps) expect(a.filter(l => l.steps.includes(s)), `${w}: ${s.n}`).toHaveLength(1)
      expect(a.flatMap(l => l.ingredients)).toHaveLength(d.ing.length)
      expect(a.flatMap(l => l.steps)).toHaveLength(d.steps.length)
    }
  })

  it('is deterministic', () => {
    expect(JSON.stringify(anatomy(dish('leek')))).toBe(JSON.stringify(anatomy(dish('leek'))))
  })

  it('captions the plate by shape, the main by the dish line, the sauce by name', () => {
    const d = dish('take a leek'), a = anatomy(d)
    expect(['Round plate', 'Coupe plate', 'Square plate', 'Oval platter', 'Slate', 'Shallow bowl', 'Board']).toContain(a[0].caption)
    expect(a[1].caption).toBe(d.parts.sauce)
    expect(a[2].caption).toBe(d.l1)
    expect(a[3].caption).toBe(d.parts.crunch)
    expect(a[4].caption).toContain(d.parts.herb)
    expect(a[4].caption.toLowerCase()).toContain(d.parts.finish.toLowerCase())
  })

  it('says so when there is no sauce on the plate', () => {
    const d = { ...dish('leek'), sauceStyle: 'none' as const }
    expect(anatomy(d)[1].caption).toBe('None — it’s dressed in the pan')
  })

  it('summarises a layer in one line: ingredients with grams, then step numbers', () => {
    const d = dish('take a leek'), main = anatomy(d)[2]
    const s = layerSummary(main)
    expect(s).toContain(`${main.ingredients[0].name} ${main.ingredients[0].g} g`)
    expect(s).toContain(`${main.steps[0].n} ${main.steps[0].a}`)
    expect(layerSummary(anatomy(d)[0])).toBe('What it all sits on')
  })

  it('exports the layer names', () => expect(LAYERS).toEqual(['plate', 'sauce', 'main', 'crunch', 'herbs']))
})
