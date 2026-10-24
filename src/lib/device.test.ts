import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersShareSheet } from './device'

afterEach(() => vi.unstubAllGlobals())

describe('prefersShareSheet', () => {
  it('is true on a coarse pointer (phones, tablets)', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }))
    expect(prefersShareSheet()).toBe(true)
  })
  it('is false on a fine pointer (desktop)', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(prefersShareSheet()).toBe(false)
  })
  it('is false where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersShareSheet()).toBe(false)
  })
})
