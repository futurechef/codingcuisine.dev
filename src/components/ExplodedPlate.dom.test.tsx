// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExplodedPlate } from './ExplodedPlate'
import { dish } from '../lib/dish'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement, root: Root
const el = () => host.querySelector('.anatomy')!
const toggle = () => host.querySelector<HTMLButtonElement>('.anatomy__actions button')!
const label = (i: number) => host.querySelectorAll<HTMLButtonElement>('.anatomy__label')[i]
const fire = (t: Element, type: string, init: object = {}) => act(() => { t.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })) })

beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<ExplodedPlate d={dish('take a leek')} />))
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('ExplodedPlate interaction', () => {
  it('never re-explodes on its own once the visitor has used the toggle', () => {
    fire(toggle(), 'click')                       // pull apart during the pen draw
    fire(toggle(), 'click')                       // …and put it back together
    expect(el().classList.contains('is-apart')).toBe(false)
    act(() => { vi.advanceTimersByTime(6000) })  // the opening timer would have fired by now
    expect(el().classList.contains('is-apart')).toBe(false)
    expect(toggle().textContent).toBe('Pull it apart')
  })

  it('a second tap on a selected label clears it, even though touch leaves the hover behind', () => {
    act(() => { vi.advanceTimersByTime(6000) })
    fire(label(2), 'mouseover')                   // touch: the tap's emulated mouseenter, no mouseleave
    fire(label(2), 'click')
    expect(el().classList.contains('has-pick')).toBe(true)
    fire(label(2), 'mouseover')
    fire(label(2), 'click')
    expect(el().classList.contains('has-pick')).toBe(false)
  })

  it('a tap on empty paper or Escape anywhere clears the selection', () => {
    act(() => { vi.advanceTimersByTime(6000) })
    fire(label(2), 'click')
    fire(host.querySelector('.anatomy__svg')!, 'click')
    expect(el().classList.contains('has-pick')).toBe(false)
    fire(label(3), 'click')
    act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(el().classList.contains('has-pick')).toBe(false)
  })
})
