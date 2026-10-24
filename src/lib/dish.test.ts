import { describe, expect, it } from 'vitest'
import { dish, GUIDE_WORDS, lineage, PUN_WORDS, SURPRISE_WORDS } from './dish'
import { CHEESE, CUISINES, INGREDIENTS, SWAPS, SWEET_FRUIT } from './pantry'

const WORDS = [...Array(800)].map((_, i) => 'w' + i * 7919)
const stem = (n: string) => n.toLowerCase().split(' ').pop()!.replace(/ies$/, 'y').replace(/(?<=[^aeiou])es$|s$/, '')
const sauceOf = (cu: string, name: string) => CUISINES.find(c => c.cu === cu)!.sauces.find(s => s.n === name)!

describe('pun surprise words', () => {
  it.each(PUN_WORDS)('"%s" lands on a real ingredient', w => {
    expect(dish(w).named).toBe(true)
  })
})

describe('vegetarian swaps', () => {
  it('carry their quip onto the dish', () => {
    for (const [k, s] of Object.entries(SWAPS)) {
      const d = dish(k)
      expect(d.swappedFrom).toBe(k)
      expect(d.swapQuip).toBe(s.quip)
    }
  })
})

describe('pairing rules', () => {
  const dishes = [...WORDS, ...Object.keys(SWAPS), 'burrata', 'ricotta', 'feta', 'chickpeas', 'kiwi', 'mango', 'grapefruit', 'trout'].map(dish)

  it('never repeats the main in the sauce or crunch', () => {
    for (const d of dishes) {
      const s = sauceOf(d.cu, d.title.split(', ')[1])
      const text = (s.n + ' ' + s.rows.map(r => r[1]).join(' ')).toLowerCase()
      const crunch = d.title.split(', ').slice(2).join(', ').toLowerCase()
      expect(text.includes(stem(d.produce)), `${d.seed}: ${d.title}`).toBe(false)
      expect(crunch.includes(stem(d.produce)), `${d.seed}: ${d.title}`).toBe(false)
    }
  })

  it('keeps cheese mains away from creamy sauces', () => {
    for (const d of dishes.filter(d => CHEESE.has(d.produce))) {
      expect(sauceOf(d.cu, d.title.split(', ')[1]).rows.some(r => r[0] === 'Cream'), d.title).toBe(false)
    }
  })

  it('keeps sweet fruit away from strongly savoury or hot sauces', () => {
    for (const d of dishes.filter(d => SWEET_FRUIT.has(d.produce))) {
      const s = sauceOf(d.cu, d.title.split(', ')[1])
      expect(s.f[4] >= 2 || s.f[5] >= 3, d.title).toBe(false)
    }
  })

  it('no brown-butter sauce on a brown-butter technique', () => {
    for (const d of dishes.filter(d => / in brown butter,/.test(d.title))) {
      expect(/brown butter/.test(d.title.split(', ')[1]), d.title).toBe(false)
    }
  })
})

describe('forks', () => {
  it('fork 1 changes the sauce and fork 2 the crunch, within the rules', () => {
    for (const w of WORDS.slice(0, 200)) {
      const [p, f1, f2] = lineage(w)
      const sauce = (t: string) => t.split(', ')[1]
      const crunch = (t: string) => t.split(', ').slice(2).join(', ')
      if (f1.note) expect(sauce(f1.dish.title)).not.toBe(sauce(p.dish.title))
      if (f2.note) expect(crunch(f2.dish.title)).not.toBe(crunch(f1.dish.title))
      expect(f1.dish.title.toLowerCase().split(', ').slice(1).join(' ').includes(stem(p.dish.produce)), f1.dish.title).toBe(false)
    }
  })
})

const LAYER_WORDS = [...new Set([...INGREDIENTS.map(i => i.n), ...GUIDE_WORDS, ...PUN_WORDS, ...SURPRISE_WORDS,
  'hello world', 'bacon', 'x', '', '   ', 'A & B <c>', 'naïve café', '2026-10-12'])]

describe('layer tags', () => {
  it('every ingredient and step says which layer owns it', () => {
    const ok = ['plate', 'sauce', 'main', 'crunch', 'herbs']
    for (const w of LAYER_WORDS) {
      const d = dish(w)
      for (const i of d.ing) expect(ok, `${w}: ${i.name}`).toContain(i.layer)
      for (const s of d.steps) expect(ok, `${w}: ${s.n}`).toContain(s.layer)
    }
  })
  it('follows the ownership rules', () => {
    for (const w of LAYER_WORDS) {
      const d = dish(w)
      expect(d.ing[0]).toMatchObject({ role: 'Base', layer: 'main' })
      // The crunch topping is its own layer; a crunchy sauce row (almonds in romesco) stays in the sauce.
      expect(d.ing.find(i => i.name.toLowerCase() === d.parts.crunch.toLowerCase())?.layer, w).toBe('crunch')
      for (const i of d.ing.filter(i => i.role === 'Crunch' && i.layer !== 'crunch')) expect(i.layer).toBe('sauce')
      const last = d.steps[d.steps.length - 1], sauceStep = d.steps[d.steps.length - 2]
      expect(last).toMatchObject({ a: 'ASSEMBLE', layer: 'herbs' })
      expect(sauceStep.layer).toBe('sauce')
      for (const s of d.steps.slice(0, -2)) expect(s.layer).toBe('main')
    }
  })
  it('names the parts', () => {
    for (const w of LAYER_WORDS) {
      const d = dish(w)
      for (const k of ['sauce', 'crunch', 'herb', 'finish'] as const) expect(d.parts[k], `${w}: ${k}`).toBeTruthy()
      expect(d.title).toContain(d.parts.sauce)
    }
  })
})
