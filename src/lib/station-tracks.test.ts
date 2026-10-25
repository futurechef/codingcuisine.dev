import { describe, expect, it } from 'vitest'
import { SAMPLES } from './instruments'
import { startIndex, trackCode, TRACKS, tracksFor } from './station-tracks'

const SYNTHS = ['sine', 'triangle', 'sawtooth', 'square', 'pink', 'white', 'brown']
const soundNames = (code: string) => [...code.matchAll(/\bs\("([^"]+)"\)/g)].map(m => m[1])
const ORIGINAL_IDS = ['simmer', 'proving', 'mise', 'low-oven', 'steam', 'rest']

describe('the ambient styles', () => {
  it('each style has its tracks', () => {
    expect(tracksFor('chefs-table').length).toBeGreaterThanOrEqual(5)
    expect(tracksFor('eno').length).toBeGreaterThanOrEqual(4)
    expect(tracksFor('mix').length).toBeGreaterThanOrEqual(4)
    expect(tracksFor('originals').map(t => t.id)).toEqual(ORIGINAL_IDS)
    for (const style of ['mix', 'chefs-table', 'eno', 'originals'] as const) {
      for (const t of tracksFor(style)) expect(t.style).toBe(style)
    }
  })

  it('chefs-table tracks credit their public-domain source', () => {
    for (const t of tracksFor('chefs-table')) {
      expect(t.after, t.id).toMatch(/^after (Vivaldi|Bach|Satie|Debussy|Chopin|Pachelbel|Handel|Schubert|Fauré|Ravel), \S/)
    }
  })

  it('every track only uses registered sample names or synths', () => {
    let samples = 0
    for (const t of TRACKS) {
      for (const n of soundNames(t.code)) {
        expect([...SAMPLES, ...SYNTHS], `${t.id}: ${n}`).toContain(n)
        if ((SAMPLES as readonly string[]).includes(n)) samples++
      }
    }
    expect(samples).toBeGreaterThan(20)
  })

  it('new styles are written for the recorded instruments', () => {
    for (const t of TRACKS.filter(t => t.style !== 'originals')) {
      expect(soundNames(t.code).some(n => (SAMPLES as readonly string[]).includes(n)), t.id).toBe(true)
    }
  })

  it('code sound has no sample names left', () => {
    for (const t of TRACKS) {
      for (const n of soundNames(trackCode(t, 'code'))) expect(SYNTHS, `${t.id}: ${n}`).toContain(n)
    }
  })

  it('recorded sound is the code as written', () => {
    for (const t of TRACKS) expect(trackCode(t, 'recorded')).toBe(t.code)
  })

  it('house rules: one setcpm from 15 to 20, a title and a length', () => {
    for (const t of TRACKS) {
      const cpm = [...t.code.matchAll(/setcpm\(([\d.]+)\)/g)]
      expect(cpm, t.id).toHaveLength(1)
      expect(Number(cpm[0][1]), t.id).toBeGreaterThanOrEqual(15)
      expect(Number(cpm[0][1]), t.id).toBeLessThanOrEqual(20)
      expect(t.title.length, t.id).toBeGreaterThan(2)
      expect(t.minutes, t.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('ids are unique', () => {
    expect(new Set(TRACKS.map(t => t.id)).size).toBe(TRACKS.length)
  })

  it('startIndex is stable for a day and stays in range', () => {
    expect(startIndex(5, 20000)).toBe(startIndex(5, 20000))
    expect(startIndex(5, 20001)).not.toBe(startIndex(5, 20000))
    for (let d = 0; d < 30; d++) {
      const i = startIndex(4, d)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(4)
    }
    expect(startIndex(0, 3)).toBe(0)
  })
})
