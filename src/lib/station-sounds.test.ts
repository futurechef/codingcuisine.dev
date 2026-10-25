import { describe, expect, it } from 'vitest'
import { KITCHEN_LEVEL, kitchenGain, samplesIn } from './station-sounds'

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

describe('the kitchen layer level', () => {
  it('sits under the music and follows the station level and volume', () => {
    expect(KITCHEN_LEVEL).toBeLessThan(0.5)
    expect(kitchenGain(1, 1)).toBeCloseTo(KITCHEN_LEVEL)
    expect(kitchenGain(0.5, 0.5)).toBeCloseTo(KITCHEN_LEVEL * 0.25)
    expect(kitchenGain(0, 1)).toBe(0)
  })
})
