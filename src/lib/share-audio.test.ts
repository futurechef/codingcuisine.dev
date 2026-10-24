/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { AUDIO_PEAK, canAddAudio, fadeTail, normalise } from './share-audio'
import shareVideoSrc from './share-video.ts?raw'

const ch = (n: number, v = 0.2) => new Float32Array(n).fill(v)

describe('share video audio', () => {
  it('fades the last half second to silence and leaves the rest alone', () => {
    const sr = 1000, data = [ch(7000), ch(7000)]
    fadeTail(data, sr, 0.5)
    for (const c of data) {
      expect(c[0]).toBeCloseTo(0.2)
      expect(c[6499]).toBeCloseTo(0.2)
      expect(c[6750]).toBeCloseTo(0.1, 2)
      expect(c[6999]).toBeLessThan(0.001)
    }
  })

  it('brings the loudest moment to a set peak, across both channels', () => {
    const l = ch(10, 0.1), r = ch(10, 0.05)
    r[3] = -0.25
    normalise([l, r])
    expect(Math.max(...[...l, ...r].map(Math.abs))).toBeCloseTo(AUDIO_PEAK)
    expect(r[3]).toBeCloseTo(-AUDIO_PEAK)
  })

  it('leaves silence silent', () => {
    const s = ch(10, 0)
    normalise([s])
    expect([...s].every(v => v === 0)).toBe(true)
  })

  it('only adds audio where AAC can be encoded, and never throws', async () => {
    expect(await canAddAudio(async () => true)).toBe(true)
    expect(await canAddAudio(async () => false)).toBe(false)
    expect(await canAddAudio(() => Promise.reject(new Error('no WebCodecs')))).toBe(false)
  })

  it('loads Strudel for the video only on demand', () => {
    expect(shareVideoSrc).not.toMatch(/from ['"]@strudel/)
    expect(shareVideoSrc).not.toMatch(/from ['"]\.\/station-render['"]/)
    expect(shareVideoSrc).toContain("import('./station-render')")
  })
})
