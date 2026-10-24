import { describe, expect, it } from 'vitest'
import { dish } from './dish'
import { overrideKind } from './pantry'
import { plateMarkup } from './plate'
import type { Kind, PlateLook } from './look'

describe('ingredient arrangement overrides', () => {
  it.each(['soba noodles', 'udon noodles', 'rice noodles', 'egg noodles', 'pasta'])('%s is drawn as a nest of strands', n => {
    expect(overrideKind(n, 'tossed')).toBe('nest')
  })
  it.each(['rice', 'wild rice', 'quinoa', 'bulgur', 'couscous', 'giant couscous', 'freekeh', 'farro', 'pearl barley'])('%s is drawn as a grain mound', n => {
    expect(overrideKind(n, 'warm-salad')).toBe('mound')
  })
  it('creamy grains are drawn as a spoon-swirled mound', () => {
    expect(overrideKind('risotto rice', 'risotto')).toBe('swirl')
    expect(overrideKind('farro', 'risotto')).toBe('swirl')
    expect(overrideKind('polenta', 'soft')).toBe('swirl')
  })
  it('grilled or seared polenta keeps its technique shape', () => {
    expect(overrideKind('polenta', 'grilled')).toBeUndefined()
  })
  it('eggs follow the technique: fried egg or jammy halves', () => {
    expect(overrideKind('eggs', 'fried')).toBe('egg')
    expect(overrideKind('eggs', 'jammy')).toBe('halves')
  })
  it('ordinary ingredients have no override', () => {
    expect(overrideKind('leeks', 'charred')).toBeUndefined()
  })
  it('generated dishes use the override (the soba bug)', () => {
    expect(dish('soba').kind).toBe('nest')
    expect(dish('rice').kind).toBe('mound')
    expect(dish('risotto').kind).toBe('swirl')
  })
})

describe('new arrangements draw well', () => {
  const kinds: Kind[] = ['nest', 'mound', 'swirl', 'egg', 'halves']
  for (const kind of kinds) {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const look: PlateLook = { shape: 'round', kind, sauce: '#d9b47a', main: '#e8d090', seed, sauceStyle: 'pool', garnish: ['leaf', 'seed'] }
      it(`${kind} · ${seed}: deterministic, in budget, every ink path draws`, () => {
        const a = plateMarkup(look, { kind: 'static' })
        expect(plateMarkup(look, { kind: 'static' })).toBe(a)
        expect(a.length).toBeLessThan(40_000)
        expect((a.match(/</g) ?? []).length).toBeLessThan(350)
        const inkGroups = [...a.matchAll(/<g class="dr[^"]*"[^>]*>(.*?)<\/g>/g)].map(m => m[1]).join('')
        const inks = inkGroups.match(/<path [^>]*>/g) ?? []
        expect(inks.length).toBeGreaterThan(0)
        for (const p of inks) expect(p).toContain('pathLength="1"')
        expect(a).not.toMatch(/NaN|undefined/)
      })
    }
  }
})
