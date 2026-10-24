import { describe, expect, it } from 'vitest'
import { loadShareSheet } from './lazy-share'

describe('loadShareSheet (blank page if the chunk fails)', () => {
  it('returns the real sheet when the chunk loads', async () => {
    const Real = () => null
    const mod = await loadShareSheet(async () => ({ ShareSheet: Real }))
    expect(mod.default).toBe(Real)
  })
  it('returns a fallback component instead of throwing when the chunk fails to load', async () => {
    const mod = await loadShareSheet(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')))
    expect(typeof mod.default).toBe('function')
    expect(mod.failed).toBe(true)
  })
})
