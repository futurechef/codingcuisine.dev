// @vitest-environment jsdom
/// <reference types="vite/client" />
import indexHtml from '../../index.html?raw'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySeo, DEFAULT_SEO, routeSeo, useSeo, type Seo } from './seo'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const head = () => document.head
const count = (sel: string) => head().querySelectorAll(sel).length
const content = (sel: string) => head().querySelector(sel)?.getAttribute('content')
const ld = () => head().querySelector('script[type="application/ld+json"]')

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" content="#fbf6ea">'
  document.title = ''
})

describe('applySeo', () => {
  it('writes every tag once', () => {
    applySeo(document, routeSeo('/plate', '', 'fig'))
    expect(document.title).toBe(routeSeo('/plate', '', 'fig').title)
    for (const sel of ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:description"]',
      'meta[property="og:url"]', 'meta[property="og:image"]', 'meta[property="og:type"]', 'meta[property="og:site_name"]',
      'meta[name="twitter:card"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]', 'meta[name="twitter:image"]',
      'script[type="application/ld+json"]']) expect(count(sel), sel).toBe(1)
    expect(head().querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://codingcuisine.dev/plate?w=fig')
    expect(content('meta[property="og:url"]')).toBe('https://codingcuisine.dev/plate?w=fig')
    expect(content('meta[name="twitter:card"]')).toBe('summary_large_image')
    expect(content('meta[property="og:image"]')).toBe('https://codingcuisine.dev/og/default.png')
    expect(JSON.parse(ld()!.textContent!)['@type']).toBe('Recipe')
  })

  it('does not pile up duplicates across navigations, and drops JSON-LD off recipe pages', () => {
    const routes: [string, string][] = [['/plate', ''], ['/card', '?w=kale'], ['/guide', ''], ['/plate', ''], ['/today', ''], ['/', '']]
    applySeo(document, routeSeo('/plate', '', 'fig'))
    const full = head().children.length
    for (const [p, s] of routes) applySeo(document, routeSeo(p, s, 'fig'))
    expect(count('meta[name="description"]')).toBe(1)
    expect(count('link[rel="canonical"]')).toBe(1)
    expect(count('meta[property="og:title"]')).toBe(1)
    expect(count('script[type="application/ld+json"]')).toBe(0)
    expect(head().children.length).toBe(full - 1)
    expect(count('title')).toBe(1)
  })

  it('leaves theme-color alone', () => {
    applySeo(document, routeSeo('/plate', '', 'miso'))
    expect(count('meta[name="theme-color"]')).toBe(1)
    expect(content('meta[name="theme-color"]')).toBe('#fbf6ea')
  })

  it('puts hostile seed words in as text, never markup', () => {
    const evil = '"><img src=x onerror=alert(1)></script><script>alert(2)</script>'
    applySeo(document, routeSeo('/card', '?w=' + encodeURIComponent(evil), 'fig'))
    expect(head().querySelectorAll('img, script:not([type="application/ld+json"])').length).toBe(0)
    expect(ld()!.textContent).not.toContain('<')
    expect(JSON.parse(ld()!.textContent!).url).toBe('https://codingcuisine.dev/plate?w=' + encodeURIComponent(evil.trim()))
    expect(content('meta[property="og:title"]')).toContain('· Platedraw')
  })
})

describe('useSeo', () => {
  function Page({ s }: { s: Seo }) { useSeo(s); return null }

  it('applies on mount and on change, and restores the defaults on unmount', () => {
    const el = document.createElement('div')
    const root = createRoot(el)
    const fig = routeSeo('/plate', '', 'fig'), kale = routeSeo('/card', '?w=kale', 'fig')
    act(() => root.render(createElement(Page, { s: fig })))
    expect(document.title).toBe(fig.title)
    act(() => root.render(createElement(Page, { s: kale })))
    expect(document.title).toBe(kale.title)
    expect(count('meta[property="og:title"]')).toBe(1)
    expect(count('script[type="application/ld+json"]')).toBe(1)
    act(() => root.unmount())
    expect(document.title).toBe(DEFAULT_SEO.title)
    expect(content('meta[name="description"]')).toBe(DEFAULT_SEO.description)
    expect(count('script[type="application/ld+json"]')).toBe(0)
  })
})

describe('index.html', () => {
  it('already carries exactly what applySeo(DEFAULT_SEO) writes', () => {
    const doc = new DOMParser().parseFromString(indexHtml, 'text/html')
    const before = doc.head.innerHTML
    expect(doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://codingcuisine.dev/og/default.png')
    applySeo(doc, DEFAULT_SEO)
    expect(doc.head.innerHTML).toBe(before)
    expect(doc.head.querySelectorAll('meta[name="theme-color"]').length).toBe(2)
  })
})
