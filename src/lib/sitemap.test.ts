// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { DEFAULT_WORD, GUIDE_WORDS, PUN_WORDS } from './dish'
import { INGREDIENTS } from './pantry'
import { recipePath, SITE } from './seo'
import { sitemapUrls, sitemapWords, sitemapXml, STATIC_PATHS, xmlEscape } from './sitemap'

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml')

describe('sitemap', () => {
  it('escapes the five XML specials', () => {
    expect(xmlEscape(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;')
  })
  it('lists the static routes and a /plate URL for every ingredient, guide and pun word, once each', () => {
    const urls = sitemapUrls()
    const words = new Set([DEFAULT_WORD, ...GUIDE_WORDS, ...PUN_WORDS, ...INGREDIENTS.map(i => i.n)])
    expect(sitemapWords()).toEqual([...words])
    expect(urls).toHaveLength(STATIC_PATHS.length + words.size)
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls).toContain(SITE + '/')
    expect(urls).toContain(SITE + recipePath("there's always mushroom"))
    for (const i of INGREDIENTS) expect(urls).toContain(SITE + recipePath(i.n))
    expect(urls.length).toBeGreaterThan(150)
  })
  it('is valid sitemap XML whose <loc>s read back as the URLs', () => {
    const urls = sitemapUrls()
    const doc = parse(sitemapXml(urls))
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(doc.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
    expect([...doc.getElementsByTagName('loc')].map(l => l.textContent)).toEqual(urls)
  })
  it('escapes & and apostrophes inside URLs', () => {
    const xml = sitemapXml(['https://codingcuisine.dev/x?a=1&b=2', SITE + recipePath("there's always mushroom")])
    expect(xml).toContain('<loc>https://codingcuisine.dev/x?a=1&amp;b=2</loc>')
    expect(xml).toContain('there&apos;s%20always%20mushroom')
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
    expect(parse(xml).getElementsByTagName('loc')[0].textContent).toBe('https://codingcuisine.dev/x?a=1&b=2')
  })
})
