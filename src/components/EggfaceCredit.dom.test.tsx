// @vitest-environment jsdom
/// <reference types="vite/client" />
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { EggfaceCredit } from './EggfaceCredit'
import { dish } from '../lib/dish'
import { COMPUTERDRAW_APP, EGGFACE_APP } from '../lib/eggface'
import appSrc from '../App.tsx?raw'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(word: string) {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(<EggfaceCredit d={dish(word)} />))
  return { host, done: () => act(() => root.unmount()) }
}

describe('credits', () => {
  it('the Eggface dish links to the game on the App Store', () => {
    const { host, done } = render('Eggface')
    const a = host.querySelector('a')!
    expect(a.getAttribute('href')).toBe(EGGFACE_APP)
    expect(host.textContent!.toLowerCase()).toContain('eggface music land')
    done()
  })

  it('other dishes show nothing', () => {
    const { host, done } = render('leek')
    expect(host.innerHTML).toBe('')
    done()
  })

  it('the footer credits Computerdraw as an inspiration for Platedraw', () => {
    expect(appSrc).toContain('COMPUTERDRAW_APP')
    expect(COMPUTERDRAW_APP).toBe('https://apps.apple.com/us/app/computerdraw/id6782483424')
  })
})
