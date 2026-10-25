import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SAMPLES } from './instruments'

const DIR = 'public/station'
const MB = 1024 * 1024
const map = () => JSON.parse(readFileSync(`${DIR}/strudel.json`, 'utf8')) as Record<string, string | Record<string, string>>
const files = () => Object.entries(map()).filter(([k]) => k !== '_base').flatMap(([, v]) => Object.values(v as Record<string, string>))

describe('the recorded instruments', () => {
  it('the map names every sample, served from /station/', () => {
    const m = map()
    expect(m._base).toBe('/station/')
    expect(Object.keys(m).filter(k => k !== '_base').sort()).toEqual([...SAMPLES].sort())
    for (const s of SAMPLES) {
      const notes = Object.keys(m[s] as Record<string, string>)
      expect(notes.length, s).toBeGreaterThanOrEqual(4)
      for (const n of notes) expect(n, s).toMatch(/^[a-g]s?\d$/)
    }
  })

  it('every file in the map exists and is an mp3', () => {
    for (const f of files()) {
      expect(f).toMatch(/\.mp3$/)
      expect(existsSync(`${DIR}/${f}`), f).toBe(true)
    }
  })

  it('the full recorded set is under 4.5 MB', () => {
    const total = files().reduce((sum, f) => sum + statSync(`${DIR}/${f}`).size, 0)
    expect(total).toBeLessThan(4.5 * MB)
  })

  it('kitchen loops exist and are each under 1 MB', () => {
    const k = `${DIR}/kitchen`
    for (const name of ['rain', 'cafe']) expect(existsSync(`${k}/${name}.mp3`), name).toBe(true)
    for (const f of readdirSync(k, { recursive: true })) {
      if (statSync(`${k}/${f}`).isFile()) expect(statSync(`${k}/${f}`).size, f).toBeLessThan(MB)
    }
  })
})
