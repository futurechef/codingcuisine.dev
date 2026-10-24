import { describe, expect, it } from 'vitest'
import { dish, type Dish } from './dish'
import { CPM_MAX, CPM_MIN, dishPattern } from './station'
import { AMBIENT, ambientPattern } from './station-tracks'
import { haps, notesIn, onsets } from './strudel-check'

/** One real dish per cuisine. */
function onePerCuisine(): Dish[] {
  const seen = new Map<string, Dish>()
  for (let i = 0; seen.size < 11 && i < 2000; i++) {
    const d = dish('w' + i)
    if (!seen.has(d.cu)) seen.set(d.cu, d)
  }
  return [...seen.values()]
}

describe('station patterns are real Strudel', () => {
  it('every cuisine makes sound, in its scale', async () => {
    const ds = onePerCuisine()
    expect(ds).toHaveLength(11)
    for (const d of ds) {
      const code = dishPattern(d).code
      expect(await haps(code, 4), d.cu).toBeGreaterThan(0)
      // scale() resolved to real notes, not NaN/undefined
      const notes = await notesIn(code, 4)
      expect(notes.length, d.cu).toBeGreaterThan(0)
      for (const n of notes) expect(Number.isFinite(n), `${d.cu}: ${n}`).toBe(true)
    }
  })

  it('200 dishes parse', async () => {
    for (let i = 0; i < 200; i++) await expect(haps(dishPattern(dish('w' + i)).code, 2)).resolves.toBeGreaterThan(0)
  }, 30_000) // evaluates 200 patterns: ~2 s here, slower on CI runners

  it('ambient tracks parse and stay calm', async () => {
    expect(AMBIENT.length).toBeGreaterThanOrEqual(5)
    expect(AMBIENT.length).toBeLessThanOrEqual(8)
    expect(new Set(AMBIENT.map(t => t.id)).size).toBe(AMBIENT.length)
    for (const t of AMBIENT) {
      expect(await haps(t.code, 4), t.id).toBeGreaterThan(0)
      const cpm = [...t.code.matchAll(/setcpm\(([\d.]+)\)/g)]
      expect(cpm, t.id).toHaveLength(1)
      expect(Number(cpm[0][1])).toBeGreaterThanOrEqual(CPM_MIN)
      expect(Number(cpm[0][1])).toBeLessThanOrEqual(CPM_MAX)
      expect(ambientPattern(t)).toMatchObject({ code: t.code, parts: [], label: 'Ambient' })
    }
  })

  it('a broken pattern fails', async () => {
    await expect(haps('stack(note("c3 [e3"))')).rejects.toThrow()
  })
})

describe('each layer enters when it is drawn', () => {
  it('a part’s first note lands at its layer’s draw time (in cycles), and the plate starts at once', async () => {
    for (const w of ['leek', 'fig', 'miso', 'w7', 'w42']) {
      const p = dishPattern(dish(w))
      const cps = p.cpm / 60
      const firsts: number[] = []
      for (const part of p.parts) {
        const evs = await onsets(part.code, 4)
        firsts.push(evs.length ? Math.min(...evs) : Infinity)
      }
      expect(firsts[0], w).toBeCloseTo(0, 3)
      p.parts.forEach((part, i) => expect(firsts[i], `${w} ${part.layer}`).toBeGreaterThanOrEqual(part.at * cps - 1e-3))
      expect(firsts[2], `${w} main`).toBeLessThan(p.parts[2].at * cps + 1) // the melody comes in within a cycle of its layer
    }
  })
})
