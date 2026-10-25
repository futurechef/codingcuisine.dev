import { describe, expect, it } from 'vitest'
import { KITCHEN_LEVEL, KITCHEN_TC, kitchenGain, samplesIn, warmSamples } from './station-sounds'
import { PAUSE_MS } from './station-transition'

describe('samplesIn', () => {
  it('finds the recorded samples a piece uses, once each, in order of first use', () => {
    const code = 'stack(note("c3").s("cellos"), note("e4").s("piano").release(2), note("g4").s("cellos"))'
    expect(samplesIn(code)).toEqual(['cellos', 'piano'])
  })
  it('ignores synths and names that are not registered samples', () => {
    expect(samplesIn('n("0").s("sawtooth"), n("1").s("pink"), n("2").s("kazoo"), n("3").s("harp")')).toEqual(['harp'])
    expect(samplesIn('n("0").s("sine")')).toEqual([])
  })
})

describe('warmSamples', () => {
  it('a failed download never reaches the loader, so a retry can succeed', async () => {
    let attempt = 0
    const fetchOk = async (u: string) => { if (u.endsWith('b.mp3') && attempt++ === 0) throw new Error('dropped') }
    const loaded: string[] = []
    const load = async (u: string) => { loaded.push(u) }
    await expect(warmSamples(['/a.mp3', '/b.mp3'], fetchOk, load)).rejects.toThrow('dropped')
    expect(loaded).not.toContain('/b.mp3')
    await warmSamples(['/a.mp3', '/b.mp3'], fetchOk, load)
    expect(loaded).toContain('/b.mp3')
  })
})

describe('the kitchen layer level', () => {
  it('follows the pause fade closely enough to be silent when the engine stops', () => {
    expect(Math.exp(-(PAUSE_MS / 1000) / KITCHEN_TC)).toBeLessThan(0.02)
  })

  it('sits under the music and follows the station level and volume', () => {
    expect(KITCHEN_LEVEL).toBeLessThan(0.5)
    expect(kitchenGain(1, 1)).toBeCloseTo(KITCHEN_LEVEL)
    expect(kitchenGain(0.5, 0.5)).toBeCloseTo(KITCHEN_LEVEL * 0.25)
    expect(kitchenGain(0, 1)).toBe(0)
  })
})
