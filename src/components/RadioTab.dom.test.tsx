// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RadioTab } from './RadioTab'
import { StationProvider } from '../lib/station-state'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement, root: Root
const button = () => host.querySelector<HTMLButtonElement>('button.radio')!

function mount(loader: () => Promise<unknown>) {
  act(() => root.render(
    <StationProvider loadEngine={loader as never}>
      <nav><RadioTab /></nav>
      <main id="rest">recipe</main>
    </StationProvider>,
  ))
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('RadioTab', () => {
  it('starts as a play button', () => {
    mount(async () => ({ startEngine: vi.fn(), playCode: vi.fn(), stopEngine: vi.fn() }))
    expect(button().getAttribute('aria-label')).toBe('Play Radio')
    expect(button().getAttribute('aria-pressed')).toBe('false')
    expect(button().textContent).toContain('Radio')
  })

  it('a click loads the engine once, starts it and becomes a pause button', async () => {
    const engine = { startEngine: vi.fn(async () => {}), playCode: vi.fn(), stopEngine: vi.fn() }
    const loader = vi.fn(async () => engine)
    mount(loader)
    await act(async () => { button().click() })
    expect(loader).toHaveBeenCalledTimes(1)
    expect(engine.startEngine).toHaveBeenCalledTimes(1)
    expect(engine.playCode).toHaveBeenCalledTimes(1) // the ambient set, before any page asks for a dish
    expect(button().getAttribute('aria-label')).toBe('Pause Radio')
    expect(button().getAttribute('aria-pressed')).toBe('true')
  })

  it('a failed load says so, offers a reload, and leaves the page alone', async () => {
    mount(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')))
    await act(async () => { button().click() })
    const alert = host.querySelector('[role="alert"]')!
    expect(alert.textContent).toContain('Couldn’t load the station')
    expect(alert.querySelector('button')!.textContent).toBe('Reload')
    expect(host.querySelector('#rest')!.textContent).toBe('recipe')
  })

  it('unlocks audio inside the tap itself, before the engine has even loaded (iPhone)', async () => {
    const resumed: number[] = []
    class FakeCtx { state = 'suspended'; resume() { resumed.push(1); return Promise.resolve() } }
    ;(globalThis as { AudioContext?: unknown }).AudioContext = FakeCtx
    try {
      let release!: (e: unknown) => void
      const engine = { startEngine: vi.fn(async () => {}), playCode: vi.fn(), stopEngine: vi.fn() }
      mount(() => new Promise(r => { release = r }))
      act(() => { button().click() })
      expect(resumed).toHaveLength(1) // synchronously, in the gesture
      await act(async () => { release(engine) })
      expect((engine.startEngine.mock.calls[0] as unknown[])[1]).toBeInstanceOf(FakeCtx)
    } finally {
      delete (globalThis as { AudioContext?: unknown }).AudioContext
    }
  })

  it('a start that fails says so instead of spinning forever', async () => {
    const engine = { startEngine: vi.fn(() => Promise.reject(new Error('worklet failed'))), playCode: vi.fn(), stopEngine: vi.fn() }
    mount(async () => engine)
    await act(async () => { button().click() })
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(button().getAttribute('aria-busy')).toBeNull()
    expect(button().getAttribute('aria-pressed')).toBe('false')
  })

  it('a second press while it is still starting cancels instead of playing twice', async () => {
    let release!: (e: unknown) => void
    const engine = { startEngine: vi.fn(async () => {}), playCode: vi.fn(), stopEngine: vi.fn() }
    mount(() => new Promise(r => { release = r }))
    act(() => { button().click() })
    act(() => { button().click() })
    await act(async () => { release(engine) })
    expect(engine.playCode).not.toHaveBeenCalled()
    expect(button().getAttribute('aria-pressed')).toBe('false')
    expect(button().getAttribute('aria-busy')).toBeNull()
  })
})
