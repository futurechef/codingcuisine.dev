// Head tags for each screen: title, description, canonical, Open Graph, Twitter and
// Recipe JSON-LD. The builder is pure; applySeo writes through DOM APIs only.
import { useEffect } from 'react'
import { DEFAULT_WORD, dish, GUIDE_WORDS, type Dish } from './dish'

export const SITE = 'https://codingcuisine.dev'
export const SITE_NAME = 'Platedraw'
export const DEFAULT_IMAGE = SITE + '/og/default.png'

export interface Seo {
  title: string
  description: string
  /** Path and query, made absolute against SITE for canonical and og:url. */
  path: string
  image?: string
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown>
}

export const DEFAULT_SEO: Seo = {
  title: 'Platedraw · Food, drawn by code',
  description: 'Give it a word, get a dish. Platedraw turns any word into a vegetarian recipe and a pen-line drawing of the plate.',
  path: '/',
  image: DEFAULT_IMAGE,
  type: 'website',
}

export const recipePath = (word: string) => '/plate?w=' + encodeURIComponent(word)

export function isoDuration(min: number): string {
  const m = Math.max(0, Math.round(min)), h = Math.floor(m / 60), r = m % 60
  return 'PT' + (h ? h + 'H' : '') + (r || !h ? r + 'M' : '')
}

export function chipMinutes(chips: string[], label: 'Prep' | 'Cook'): number {
  const c = chips.find(c => c.startsWith(label + ' '))
  return c ? parseInt(c.replace(/\D+/g, ''), 10) || 0 : 0
}

export function recipeDescription(d: Dish): string {
  return `${d.desc} ${d.cu} · prep ${chipMinutes(d.chips, 'Prep')} min · cook ${chipMinutes(d.chips, 'Cook')} min · serves 2.`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

export function recipeJsonLd(d: Dish, image = DEFAULT_IMAGE): Record<string, unknown> {
  const prep = chipMinutes(d.chips, 'Prep'), cook = chipMinutes(d.chips, 'Cook')
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: d.title,
    description: d.desc,
    image: [image],
    url: SITE + recipePath(d.seed),
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE },
    prepTime: isoDuration(prep),
    cookTime: isoDuration(cook),
    totalTime: isoDuration(prep + cook),
    recipeYield: '2',
    recipeCategory: 'Main course',
    recipeCuisine: d.cu,
    keywords: [...new Set([d.seed, d.produce, d.cu, 'vegetarian'])].join(', '),
    suitableForDiet: 'https://schema.org/VegetarianDiet',
    recipeIngredient: d.ing.map(i => `${i.g} g ${i.name}`),
    recipeInstructions: d.steps.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1, name: cap(s.a), text: s.l ? `${s.t} Look for ${s.l}.` : s.t,
    })),
  }
}

export function recipeSeo(d: Dish, view: 'plate' | 'card'): Seo {
  return {
    title: `${d.title}${view === 'card' ? ' recipe card' : ''} · ${SITE_NAME}`,
    description: recipeDescription(d),
    path: recipePath(d.seed),
    image: DEFAULT_IMAGE,
    type: 'article',
    jsonLd: recipeJsonLd(d),
  }
}

/** The anatomy view: its own title, but the canonical recipe page is /plate. */
export function anatomySeo(d: Dish): Seo {
  return {
    title: `Anatomy of ${d.title} · ${SITE_NAME}`,
    description: `${recipeDescription(d)} Layer by layer: what’s in it and how it’s made.`,
    path: recipePath(d.seed),
    image: DEFAULT_IMAGE,
    type: 'article',
  }
}

const TODAY: Seo = {
  title: `Dish of the day · ${SITE_NAME}`,
  description: 'A new vegetarian dish every day. The date is the seed, and the produce stays in season.',
  path: '/today', image: DEFAULT_IMAGE, type: 'website',
}

const realDate = (s: string) => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.toISOString().slice(0, 10) === s
}

/** Head data for a route. `plated` is the word on the Plate screen; /card and /forks prefer ?w=. */
export function routeSeo(path: string, search: string, plated: string): Seo {
  const w = new URLSearchParams(search).get('w')?.trim() || plated || DEFAULT_WORD
  const page = (title: string, description: string, p: string): Seo =>
    ({ title: `${title} · ${SITE_NAME}`, description, path: p, image: DEFAULT_IMAGE, type: 'website' })
  if (path === '/plate') return recipeSeo(dish(plated || DEFAULT_WORD), 'plate')
  if (path === '/card') return recipeSeo(dish(w), 'card')
  if (path === '/anatomy') return anatomySeo(dish(w))
  if (path === '/forks') return page(`Forks of “${w}”`, `One dish, forked: “${w}” as first plated, then with a new sauce, then with a new crunch.`, '/forks?w=' + encodeURIComponent(w))
  if (path === '/guide') return page('Field guide', `A field guide of ${GUIDE_WORDS.length} seeded plates from the Platedraw kitchen, filterable by cuisine.`, '/guide')
  if (path === '/today') return TODAY
  if (path.startsWith('/day/')) {
    const date = path.slice(5)
    if (!realDate(date)) return TODAY
    const d = dish(date)
    return page(`Dish of the day, ${date}`, `${d.title}. ${recipeDescription(d)}`, path)
  }
  if (path === '/parts') return page('Parts', 'The Platedraw component sheet: the plates, sauces, crunches and herbs every drawing is built from.', '/parts')
  return DEFAULT_SEO
}

/** JSON for a <script type="application/ld+json">: no `<` survives, so `</script>` and `<!--` can't break out. */
export function jsonLdText(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

/** The one element matching `sel`, made (with its fixed key attributes) if missing. */
function upsert(doc: Document, tag: string, sel: string, key: Record<string, string>): Element {
  let el = doc.head.querySelector(sel)
  if (!el) {
    el = doc.createElement(tag)
    for (const [k, v] of Object.entries(key)) el.setAttribute(k, v)
    doc.head.appendChild(el)
  }
  return el
}

const meta = (doc: Document, attr: 'name' | 'property', key: string, value: string) =>
  upsert(doc, 'meta', `meta[${attr}="${key}"]`, { [attr]: key }).setAttribute('content', value)

const LD = 'script[type="application/ld+json"]'

/** Writes the head tags for `s`, reusing existing elements so nothing duplicates. Never touches theme-color. */
export function applySeo(doc: Document, s: Seo): void {
  const url = SITE + s.path
  const image = s.image ?? DEFAULT_IMAGE
  doc.title = s.title
  meta(doc, 'name', 'description', s.description)
  upsert(doc, 'link', 'link[rel="canonical"]', { rel: 'canonical' }).setAttribute('href', url)
  meta(doc, 'property', 'og:site_name', SITE_NAME)
  meta(doc, 'property', 'og:type', s.type ?? 'website')
  meta(doc, 'property', 'og:title', s.title)
  meta(doc, 'property', 'og:description', s.description)
  meta(doc, 'property', 'og:url', url)
  meta(doc, 'property', 'og:image', image)
  meta(doc, 'property', 'og:image:width', '1200')
  meta(doc, 'property', 'og:image:height', '630')
  meta(doc, 'name', 'twitter:card', 'summary_large_image')
  meta(doc, 'name', 'twitter:title', s.title)
  meta(doc, 'name', 'twitter:description', s.description)
  meta(doc, 'name', 'twitter:image', image)
  if (s.jsonLd) upsert(doc, 'script', LD, { type: 'application/ld+json' }).textContent = jsonLdText(s.jsonLd)
  else doc.head.querySelector(LD)?.remove()
}

/** Sets the head tags while the caller is mounted; the site defaults come back on unmount. */
export function useSeo(s: Seo): void {
  const key = JSON.stringify(s)
  useEffect(() => {
    applySeo(document, s)
    return () => applySeo(document, DEFAULT_SEO)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
