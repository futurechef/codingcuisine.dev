// The sitemap: static routes plus a /plate page for every word we know reads well.
// scripts/build-sitemap.mjs writes it to dist/sitemap.xml after `vite build`.
import { DEFAULT_WORD, GUIDE_WORDS, PUN_WORDS } from './dish'
import { INGREDIENTS } from './pantry'
import { recipePath, SITE } from './seo'

export const STATIC_PATHS = ['/', '/guide', '/today', '/parts']

export function sitemapWords(): string[] {
  return [...new Set([DEFAULT_WORD, ...GUIDE_WORDS, ...PUN_WORDS, ...INGREDIENTS.map(i => i.n)])]
}

export function sitemapUrls(): string[] {
  return [...new Set([...STATIC_PATHS, ...sitemapWords().map(recipePath)].map(p => SITE + p))]
}

const XML: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
export const xmlEscape = (s: string) => s.replace(/[&<>"']/g, c => XML[c])

export function sitemapXml(urls: string[]): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => `  <url><loc>${xmlEscape(u)}</loc></url>\n`).join('') + '</urlset>\n'
}
