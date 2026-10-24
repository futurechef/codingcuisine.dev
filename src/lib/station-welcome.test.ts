import { describe, expect, it } from 'vitest'
import { MAX_PART_GAIN } from './station'
import { MAX_PARTIALS, welcomePattern } from './station-welcome'
import { haps } from './strudel-check'

const nums = (code: string, fn: string) => code.split(fn + '(').slice(1).map(rest => parseFloat(rest))

describe('welcomePattern: the circles play the word they write', () => {
  it('one partial per circle, up to 16', () => {
    expect(nums(welcomePattern(4).code, 'freq')).toHaveLength(4)
    expect(nums(welcomePattern(12).code, 'freq')).toHaveLength(12)
    expect(nums(welcomePattern(256).code, 'freq')).toHaveLength(MAX_PARTIALS)
    expect(MAX_PARTIALS).toBe(16)
  })

  it('is deterministic', () => {
    expect(welcomePattern(64).code).toBe(welcomePattern(64).code)
  })

  it('stays quiet: gains sum to at most 0.35 and fall with circle size', () => {
    const g = nums(welcomePattern(256).code, 'gain')
    expect(g.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(MAX_PART_GAIN + 1e-9)
    for (let i = 1; i < g.length; i++) expect(g[i]).toBeLessThanOrEqual(g[i - 1])
  })

  it('keeps every tone in a calm band', () => {
    for (const f of nums(welcomePattern(256).code, 'freq')) {
      expect(f).toBeGreaterThanOrEqual(110)
      expect(f).toBeLessThanOrEqual(1760)
    }
  })

  it('after the morph it settles on the plate’s circles', async () => {
    const word = welcomePattern(32, 'word'), plate = welcomePattern(32, 'plate')
    expect(plate.code).not.toBe(word.code)
    expect(welcomePattern(32).code).toBe(word.code) // the word first
    expect(nums(plate.code, 'freq')).toHaveLength(16)
    expect(await haps(plate.code, 4)).toBeGreaterThan(0)
  })

  it('is real Strudel', async () => {
    const p = welcomePattern(32)
    expect(p).toMatchObject({ parts: [], label: 'Welcome' })
    expect(await haps(p.code, 4)).toBeGreaterThan(0)
  })
})
