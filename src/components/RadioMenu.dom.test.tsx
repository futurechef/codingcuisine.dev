// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RadioTab } from './RadioTab'
import { StationProvider } from '../lib/station-state'
import { tracksFor } from '../lib/station-tracks'
import { readFileSync } from 'node:fs'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement, root: Root
const $ = <T extends Element = HTMLElement>(sel: string) => host.querySelector<T & HTMLElement>(sel)
const more = () => $<HTMLButtonElement>('button.radio-more')!
const menu = () => $('.radio-menu')

function engine(ensure: () => Promise<void> = async () => {}) {
  return { startEngine: vi.fn(async () => {}), playCode: vi.fn(), stopEngine: vi.fn(), setVolume: vi.fn(), setKitchen: vi.fn(async () => {}), ensureSounds: vi.fn(ensure) }
}

function mount(e = engine()) {
  act(() => root.render(
    <StationProvider loadEngine={(async () => e) as never}>
      <nav><RadioTab /></nav>
      <main id="outside">recipe</main>
    </StationProvider>,
  ))
  return e
}

const open = () => act(() => { more().click() })
const change = (el: HTMLInputElement | HTMLSelectElement, value: string | boolean) => act(() => {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    el.click()
  } else {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, String(value))
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
})

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

describe('the Radio menu', () => {
  it('▾ opens and closes the menu; Escape and a click outside close it; focus returns to ▾', () => {
    mount()
    expect(more().getAttribute('aria-label')).toBe('Radio settings')
    expect(more().getAttribute('aria-expanded')).toBe('false')
    expect(menu()).toBeNull()
    open()
    expect(menu()).not.toBeNull()
    expect(more().getAttribute('aria-expanded')).toBe('true')
    open()
    expect(menu()).toBeNull()

    open()
    act(() => { menu()!.querySelector('input')!.focus() })
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(menu()).toBeNull()
    expect(document.activeElement).toBe(more())

    open()
    act(() => { $('#outside')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })) })
    expect(menu()).toBeNull()
  })

  it('every control has a label', () => {
    mount()
    open()
    const controls = menu()!.querySelectorAll('input, select, button')
    expect(controls.length).toBe(8) // 2 sound, style, 3 kitchen, follow, volume
    for (const c of controls) {
      const id = c.getAttribute('id')
      const labelled = c.closest('label') || (id && menu()!.querySelector(`label[for="${id}"]`)) || c.getAttribute('aria-label') || (c.tagName === 'BUTTON' && c.textContent!.trim())
      expect(labelled, c.outerHTML).toBeTruthy()
    }
    for (const text of ['Sound', 'Code', 'Recorded', 'Style', 'Kitchen', 'Off', 'Rain', 'Café', 'Follow the page', 'Volume']) {
      expect(menu()!.textContent, text).toContain(text)
    }
  })

  it('changing a setting changes the station and is remembered', () => {
    mount()
    open()
    change(menu()!.querySelector<HTMLSelectElement>('select')!, 'eno')
    change(menu()!.querySelector<HTMLInputElement>('input[value="rain"]')!, true)
    change(menu()!.querySelector<HTMLInputElement>('input[type="checkbox"]')!, false)
    change(menu()!.querySelector<HTMLInputElement>('input[type="range"]')!, '0.4')
    const saved = JSON.parse(localStorage.getItem('station-settings')!)
    expect(saved).toMatchObject({ style: 'eno', kitchen: 'rain', follow: false, volume: 0.4 })
    expect(tracksFor('eno').map(t => t.title)).toContain(menu()!.querySelector('.radio-menu__now')!.textContent!.replace(/^Now:\s*/, '').split(' · ')[0])
  })

  it('shows what is playing, with its source', () => {
    localStorage.setItem('station-settings', JSON.stringify({ style: 'chefs-table' }))
    mount()
    open()
    const now = menu()!.querySelector('.radio-menu__now')!.textContent!
    expect(now).toMatch(/ · after (Vivaldi|Bach|Satie|Debussy|Chopin)/)
  })

  it('shows loading and failure messages for the recorded instruments, with a retry', async () => {
    let fail!: (e: Error) => void
    const e = mount(engine(() => new Promise((_, reject) => { fail = reject })))
    await act(async () => { $<HTMLButtonElement>('button.radio')!.click() })
    open()
    change(menu()!.querySelector<HTMLInputElement>('input[value="recorded"]')!, true)
    expect(menu()!.textContent).toContain('Loading instruments…')
    await act(async () => { fail(new Error('offline')) })
    expect(menu()!.textContent).toContain('Couldn’t load the recorded instruments.')
    const retry = [...menu()!.querySelectorAll('button')].find(b => b.textContent === 'Try again')!
    act(() => { retry.click() })
    expect(e.ensureSounds).toHaveBeenCalledTimes(2)
  })

  it('Radio still plays and pauses with one tap', async () => {
    mount()
    const radio = $<HTMLButtonElement>('button.radio')!
    expect(radio.getAttribute('aria-label')).toBe('Play Radio')
    await act(async () => { radio.click() })
    expect(radio.getAttribute('aria-label')).toBe('Pause Radio')
    expect(menu()).toBeNull()
  })

  it('the menu is fixed to the viewport so it fits on a phone', () => {
    mount()
    open()
    expect(menu()!.classList.contains('radio-menu')).toBe(true)
    const css = readFileSync('src/styles.css', 'utf8') // vitest stubs CSS imports, so read the file
    const rule = /\.radio-menu\s*\{([^}]*)\}/.exec(css)
    expect(rule?.[1]).toMatch(/position:\s*fixed/)
    const more = /\.radio-more\s*\{([^}]*)\}/.exec(css)
    expect(Number(/min-width:\s*(\d+)px/.exec(more?.[1] ?? '')?.[1])).toBeGreaterThanOrEqual(32) // a thumb-sized target beside Radio
  })
})
