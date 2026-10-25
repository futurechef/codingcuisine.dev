import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings } from './station-settings'

function memory(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set('station-settings', initial)
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, data }
}

describe('station settings', () => {
  it('defaults when nothing is stored', () => {
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS).toEqual({ sound: 'code', style: 'mix', kitchen: 'off', follow: true, volume: 0.8 })
  })

  it('keeps good fields and drops bad ones', () => {
    const s = parseSettings({ sound: 'recorded', style: 'jazz', kitchen: 'cafe', follow: 'yes', volume: 7 })
    expect(s).toEqual({ sound: 'recorded', style: 'mix', kitchen: 'cafe', follow: true, volume: 1 })
    expect(parseSettings({ volume: -2 }).volume).toBe(0)
    expect(parseSettings({ volume: 'loud' }).volume).toBe(0.8)
    expect(parseSettings({ follow: false }).follow).toBe(false)
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings([1, 2])).toEqual(DEFAULT_SETTINGS)
  })

  it('non-JSON and a throwing storage give defaults', () => {
    expect(loadSettings(memory('{not json'))).toEqual(DEFAULT_SETTINGS)
    const throwing = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow()
  })

  it('round-trips through save and load', () => {
    const m = memory()
    const s = { sound: 'recorded', style: 'eno', kitchen: 'rain', follow: false, volume: 0.35 } as const
    saveSettings(s, m)
    expect(loadSettings(m)).toEqual(s)
  })

  it('never stores a playing flag', () => {
    const m = memory()
    saveSettings({ ...DEFAULT_SETTINGS, playing: true } as never, m)
    expect(Object.keys(JSON.parse(m.data.get('station-settings')!)).sort()).toEqual(['follow', 'kitchen', 'sound', 'style', 'volume'])
  })
})
