// @vitest-environment jsdom
import { act, useMemo } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StationCode } from './StationCode'
import { RadioTab } from './RadioTab'
import { dish } from '../lib/dish'
import { dishPattern } from '../lib/station'
import { StationProvider, useStation } from '../lib/station-state'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement, root: Root
const d = dish('take a leek')

function DishPage() {
  const pattern = useMemo(() => dishPattern(d), [])
  useStation({ kind: 'dish', pattern, take: 0, draws: false }, d.title)
  return <StationCode pattern={pattern} title={d.title} />
}

beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const engine = { startEngine: vi.fn(async () => {}), playCode: vi.fn(), stopEngine: vi.fn() }
  act(() => root.render(
    <StationProvider loadEngine={async () => engine as never}>
      <RadioTab />
      <DishPage />
    </StationProvider>,
  ))
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

const header = () => host.querySelector('.station-code__head')!.textContent
const layers = () => [...host.querySelectorAll<HTMLElement>('[data-layer]')]

describe('StationCode', () => {
  it('shows the dish’s code, exactly', () => {
    const code = host.querySelector('pre')!.textContent!
    expect(code).toBe(dishPattern(d).code)
    expect(code).toContain('setcpm(')
  })

  it('invites a press of Radio while the station is off', () => {
    expect(header()).toBe('PRESS RADIO TO HEAR IT')
    expect(layers()).toHaveLength(5)
    expect(layers().map(l => l.dataset.layer)).toEqual(['plate', 'sauce', 'main', 'crunch', 'herbs'])
    expect(layers().some(l => l.classList.contains('is-on'))).toBe(false)
  })

  it('names what’s playing and lights the layers that are sounding', async () => {
    await act(async () => { host.querySelector<HTMLButtonElement>('button.radio')!.click() })
    await act(async () => { vi.advanceTimersByTime(300) })
    expect(header()).toBe(`NOW PLAYING · ${d.title.toUpperCase()} · ${d.cu.toUpperCase()}`)
    expect(layers().every(l => l.classList.contains('is-on'))).toBe(true)
  })
})
