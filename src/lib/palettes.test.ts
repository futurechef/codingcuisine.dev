import { describe, expect, it } from 'vitest'
import { CUISINES } from './pantry'
import { contrast, INK, palette, PALETTES, shade, type Mode } from './palettes'

const MODES: Mode[] = ['light', 'dark']

describe('contrast', () => {
  it('matches the WCAG formula on known pairs', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })
})

describe('shade', () => {
  it('darkens with a negative amount and lightens with a positive one', () => {
    expect(contrast(shade('#808080', -0.2), '#ffffff')).toBeGreaterThan(contrast('#808080', '#ffffff'))
    expect(contrast(shade('#808080', 0.2), '#000000')).toBeGreaterThan(contrast('#808080', '#000000'))
    expect(shade('#808080', 0)).toBe('#808080')
  })
})

describe('cuisine palettes', () => {
  it('has a palette for every cuisine in the pantry, and none for cuisines that do not exist', () => {
    expect(Object.keys(PALETTES).sort()).toEqual([...CUISINES.map(c => c.cu), 'French'].sort()) // French: the Eggface easter egg
  })

  it('falls back to the default cream and rust for an unknown cuisine', () => {
    expect(palette('Martian', 'light').acc).toBe('#b8452e')
  })

  for (const cu of [...CUISINES.map(c => c.cu), 'French']) {
    for (const mode of MODES) {
      describe(`${cu} · ${mode}`, () => {
        const p = palette(cu, mode)
        it('only uses 6-digit hex colours', () => {
          for (const v of Object.values(p)) expect(v).toMatch(/^#[0-9a-f]{6}$/)
        })
        it('body text on paper passes WCAG AA (4.5:1)', () => {
          expect(contrast(INK[mode].ink, p.paper)).toBeGreaterThanOrEqual(4.5)
          expect(contrast(INK[mode].mute, p.paper)).toBeGreaterThanOrEqual(4.5)
        })
        it('accent labels on paper pass WCAG AA (4.5:1)', () => {
          expect(contrast(p.acc, p.paper)).toBeGreaterThanOrEqual(4.5)
        })
        it('button text on the button passes WCAG AA, also on hover', () => {
          expect(contrast(p.onBtn, p.btn)).toBeGreaterThanOrEqual(4.5)
          expect(contrast(p.onBtn, p.btnHover)).toBeGreaterThanOrEqual(4.5)
        })
        it('body text on the surface tone still passes AA', () => {
          expect(contrast(INK[mode].ink, p.surf)).toBeGreaterThanOrEqual(4.5)
        })
      })
    }
  }

  it('gives each cuisine a distinct accent, so pages actually differ', () => {
    for (const mode of MODES) {
      const accents = CUISINES.map(c => palette(c.cu, mode).acc)
      expect(new Set(accents).size).toBe(accents.length)
    }
  })
})
