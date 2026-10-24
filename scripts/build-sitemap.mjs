// Writes dist/sitemap.xml. Runs after `vite build` (see the npm build script).
// Loads src/lib/sitemap.ts through Vite's SSR loader so the word lists have one home.
import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
try {
  const { sitemapUrls, sitemapXml } = await vite.ssrLoadModule('/src/lib/sitemap.ts')
  const urls = sitemapUrls()
  writeFileSync(new URL('../dist/sitemap.xml', import.meta.url), sitemapXml(urls))
  console.log(`sitemap: ${urls.length} URLs → dist/sitemap.xml`)
} finally {
  await vite.close()
}
