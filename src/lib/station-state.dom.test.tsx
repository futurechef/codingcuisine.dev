// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StationProvider, useStation, useStationSound, useStationStatus, type StationStatus } from './station-state'
import { trackCode, tracksFor } from './station-tracks'
import type { StationPattern } from './station'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement, root: Root
let status: StationStatus
let sound: string
let goTo: (page: 'ambient' | 'dish') => void

const DISH: StationPattern = { code: 'setcpm(16)\nn("0").s("sine")', parts: [], cpm: 16, label: 'Test' }

function Probe() {
  status = useStationStatus()
  sound = useStationSound()
  return null
}
function Page() {
  const [page, setPage] = useState<'ambient' | 'dish'>('ambient')
  goTo = setPage
  useStation(page === 'dish' ? { kind: 'dish', pattern: DISH, take: 0, draws: false } : { kind: 'ambient' }, page === 'dish' ? 'Test dish' : undefined)
  return null
}

function fakeEngine() {
  let settle: { resolve: () => void; reject: (e: Error) => void } | undefined
  return {
    startEngine: vi.fn(async () => {}),
    playCode: vi.fn(),
    stopEngine: vi.fn(),
    setVolume: vi.fn(),
    setKitchen: vi.fn(async () => {}),
    ensureSounds: vi.fn(() => new Promise<void>((resolve, reject) => { settle = { resolve, reject } })),
    settle: () => settle!,
  }
}

function mount(engine: ReturnType<typeof fakeEngine>) {
  act(() => root.render(
    <StationProvider loadEngine={(async () => engine) as never}>
      <Probe /><Page />
    </StationProvider>,
  ))
}

const ambientCodes = (style: Parameters<typeof tracksFor>[0], s: 'code' | 'recorded') => tracksFor(style).map(t => trackCode(t, s))

beforeEach(() => {
  localStorage.clear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the station follows your settings', () => {
  it('plays the chosen style’s tracks, with their names', () => {
    localStorage.setItem('station-settings', JSON.stringify({ style: 'chefs-table' }))
    mount(fakeEngine())
    expect(ambientCodes('chefs-table', 'code')).toContain(status.code)
    const track = tracksFor('chefs-table').find(t => trackCode(t, 'code') === status.code)!
    expect(status.nowPlaying).toBe(track.title)
    expect(status.nowAfter).toBe(track.after)
    act(() => status.setSettings({ style: 'eno' }))
    expect(ambientCodes('eno', 'code')).toContain(status.code)
    expect(status.nowAfter).toBeUndefined()
  })

  it('no sound starts on mount, even with saved settings', () => {
    localStorage.setItem('station-settings', JSON.stringify({ sound: 'recorded', kitchen: 'rain' }))
    const engine = fakeEngine()
    mount(engine)
    expect(engine.startEngine).not.toHaveBeenCalled()
    expect(engine.ensureSounds).not.toHaveBeenCalled()
    expect(status.playing).toBe(false)
  })

  it('stays on code until the samples are ready, and says so if they fail', async () => {
    const engine = fakeEngine()
    mount(engine)
    await act(async () => { status.toggle() })
    expect(engine.setVolume).toHaveBeenCalledWith(0.8)
    act(() => status.setSettings({ sound: 'recorded' }))
    expect(engine.ensureSounds).toHaveBeenCalledTimes(1)
    expect(status.soundLoading).toBe(true)
    expect(sound).toBe('code')
    expect(ambientCodes('mix', 'code')).toContain(status.code)
    await act(async () => { engine.settle().resolve() })
    expect(status.soundLoading).toBe(false)
    expect(sound).toBe('recorded')
    expect(ambientCodes('mix', 'recorded')).toContain(status.code)

    // a fresh visit where loading fails
    act(() => root.unmount())
    root = createRoot(host)
    const broken = fakeEngine()
    mount(broken)
    await act(async () => { status.toggle() })
    expect(broken.ensureSounds).toHaveBeenCalledTimes(1) // saved setting: loads once playing starts
    await act(async () => { broken.settle().reject(new Error('offline')) })
    expect(status.soundFailed).toBe(true)
    expect(status.soundLoading).toBe(false)
    expect(sound).toBe('code')
    expect(JSON.parse(localStorage.getItem('station-settings')!).sound).toBe('recorded') // not persisted as code
    act(() => status.retrySound())
    expect(broken.ensureSounds).toHaveBeenCalledTimes(2)
    expect(status.soundFailed).toBe(false)
  })

  it('follow off keeps the music; follow on again plays the page you are on', () => {
    mount(fakeEngine())
    const ambient = status.code
    act(() => status.setSettings({ follow: false }))
    act(() => goTo('dish'))
    expect(status.code).toBe(ambient)
    act(() => status.setSettings({ follow: true }))
    expect(status.code).toBe(DISH.code)
    expect(status.nowPlaying).toBe('Test dish')
  })

  it('volume and kitchen go straight to the engine once it is running', async () => {
    const engine = fakeEngine()
    mount(engine)
    await act(async () => { status.toggle() })
    act(() => status.setSettings({ volume: 0.3, kitchen: 'cafe' }))
    expect(engine.setVolume).toHaveBeenLastCalledWith(0.3)
    expect(engine.setKitchen).toHaveBeenLastCalledWith('cafe')
  })

  it('settings survive a remount', () => {
    mount(fakeEngine())
    act(() => status.setSettings({ style: 'eno', volume: 0.4 }))
    act(() => root.unmount())
    root = createRoot(host)
    mount(fakeEngine())
    expect(status.settings).toMatchObject({ style: 'eno', volume: 0.4 })
  })
})
