/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { loadEngine } from './station-state'
import appSrc from '../App.tsx?raw'
import stateSrc from './station-state.tsx?raw'
import radioSrc from '../components/RadioTab.tsx?raw'
import stationSrc from './station.ts?raw'
import transitionSrc from './station-transition.ts?raw'
import tracksSrc from './station-tracks.ts?raw'

describe('loadEngine (the site keeps working if the station chunk fails)', () => {
  it('returns the engine when the chunk loads', async () => {
    const fake = { startEngine: async () => {}, playCode: () => {}, stopEngine: () => {} }
    expect((await loadEngine(async () => fake)).engine).toBe(fake)
  })
  it('returns failed instead of throwing when the chunk fails to load', async () => {
    const r = await loadEngine(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')))
    expect(r.failed).toBe(true)
    expect(r.engine).toBeUndefined()
  })
})

describe('Strudel stays out of the first page load', () => {
  it('only station-engine imports @strudel, and nothing imports it statically', () => {
    for (const [name, src] of Object.entries({ appSrc, stateSrc, radioSrc, stationSrc, transitionSrc, tracksSrc })) {
      expect(src, name).not.toMatch(/from ['"]@strudel/)
      expect(src, name).not.toMatch(/from ['"]\.\/station-engine['"]/)
    }
    expect(stateSrc).toContain("import('./station-engine')")
  })
})
