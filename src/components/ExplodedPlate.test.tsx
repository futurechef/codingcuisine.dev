import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplodedPlate } from './ExplodedPlate'
import { dish } from '../lib/dish'

const count = (html: string, cls: string) => (html.match(new RegExp(`class="${cls}[ "]`, 'g')) ?? []).length

afterEach(() => vi.unstubAllGlobals())

describe('ExplodedPlate', () => {
  it('draws five layers and five labels, stacked while the pen draws', () => {
    const d = dish('take a leek')
    const html = renderToStaticMarkup(<ExplodedPlate d={d} />)
    expect(count(html, 'anatomy__layer')).toBe(5)
    expect(count(html, 'anatomy__label')).toBe(5)
    expect(html).toContain(`MAIN — ${d.l1}`)
    expect(html).not.toContain('is-apart')
    expect(html).toContain('Pull it apart')
  })

  it('opens already apart when the visitor prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }))
    const html = renderToStaticMarkup(<ExplodedPlate d={dish('fig')} />)
    expect(html).toContain('is-apart')
    expect(html).toContain('Put it back together')
  })

  it('escapes odd seed words and never renders an empty caption', () => {
    for (const w of ['', '   ', 'A & B <c>', '</script><script>alert(1)</script>']) {
      const html = renderToStaticMarkup(<ExplodedPlate d={dish(w)} />)
      expect(html).not.toContain('<script>alert')
      expect(html).not.toMatch(/ — <\/span>/)
    }
  })
})
