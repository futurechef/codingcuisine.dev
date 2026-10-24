import { describe, expect, it } from 'vitest'
import { DEFAULT_WORD, dish, GUIDE_WORDS, PUN_WORDS, SURPRISE_WORDS } from './dish'
import { INGREDIENTS } from './pantry'
import { chipMinutes, DEFAULT_IMAGE, DEFAULT_SEO, isoDuration, jsonLdText, recipeDescription, recipeJsonLd, recipePath, routeSeo, SITE } from './seo'

const ISO = /^PT(?:[1-9]\d*H)?(?:\d+M)?$/
const minutes = (iso: string) => { const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)!; return +(m[1] ?? 0) * 60 + +(m[2] ?? 0) }
const noUndefined = (v: unknown): boolean =>
  v !== undefined && v !== null && (typeof v !== 'object' || Object.values(v as object).every(noUndefined))

// 200+ dishes: every ingredient, the guide, the puns, surprises, odd words and a year of dates.
const WORDS = [...new Set([...INGREDIENTS.map(i => i.n), ...GUIDE_WORDS, ...PUN_WORDS, ...SURPRISE_WORDS,
  'hello world', '2026-10-12', '2026-03-01', 'bacon', 'x', '', '   ', 'A & B <c>', '</script><script>alert(1)</script>', 'naïve café',
    ...Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i * 9)).toISOString().slice(0, 10))])]

describe('isoDuration', () => {
  it.each([[15, 'PT15M'], [5, 'PT5M'], [0, 'PT0M'], [60, 'PT1H'], [65, 'PT1H5M'], [135, 'PT2H15M']])('%i min → %s', (m, iso) => {
    expect(isoDuration(m)).toBe(iso)
  })
})

describe('chipMinutes', () => {
  it('reads prep and cook from the chips', () => {
    expect(chipMinutes(['Prep 15 min', 'Cook 35 min', 'Serves 2'], 'Prep')).toBe(15)
    expect(chipMinutes(['Prep 15 min', 'Cook 35 min', 'Serves 2'], 'Cook')).toBe(35)
    expect(chipMinutes(['Serves 2'], 'Cook')).toBe(0)
  })
})

describe('recipeJsonLd', () => {
  it('matches the default dish exactly where it is fixed by the spec', () => {
    const d = dish(DEFAULT_WORD)
    const ld = recipeJsonLd(d)
    expect(ld).toMatchObject({
      '@context': 'https://schema.org', '@type': 'Recipe', name: d.title, image: [DEFAULT_IMAGE],
      url: 'https://codingcuisine.dev/plate?w=take%20a%20leek',
      recipeYield: '2', recipeCategory: 'Main course', recipeCuisine: d.cu,
      suitableForDiet: 'https://schema.org/VegetarianDiet',
      author: { '@type': 'Organization', name: 'Platedraw' },
    })
    expect((ld.recipeIngredient as string[])[0]).toBe('400 g Leeks')
    expect((ld.recipeInstructions as { text: string }[])[0]).toEqual({
      '@type': 'HowToStep', position: 1, name: 'Brown', text: 'Brown the leeks well in a wide pan. Look for colour on every flat side.',
    })
    expect(ld.keywords).toBe('take a leek, leeks, North African, vegetarian')
  })

  it(`has a valid shape for ${WORDS.length} generated dishes`, () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(200)
    for (const w of WORDS) {
      const d = dish(w)
      const ld = recipeJsonLd(d)
      expect(noUndefined(ld), w).toBe(true)
      for (const k of ['prepTime', 'cookTime', 'totalTime'] as const) expect(ld[k], `${w} ${k}`).toMatch(ISO)
      expect(minutes(ld.totalTime as string)).toBe(minutes(ld.prepTime as string) + minutes(ld.cookTime as string))
      expect(minutes(ld.prepTime as string)).toBe(chipMinutes(d.chips, 'Prep'))
      expect(ld.recipeIngredient).toHaveLength(d.ing.length)
      ;(ld.recipeIngredient as string[]).forEach((s, i) => expect(s).toBe(`${d.ing[i].g} g ${d.ing[i].name}`))
      expect(ld.recipeInstructions).toHaveLength(d.steps.length)
      ;(ld.recipeInstructions as { position: number; text: string }[]).forEach((s, i) => {
        expect(s.position).toBe(i + 1)
        expect(s.text.startsWith(d.steps[i].t)).toBe(true)
        if (d.steps[i].l) expect(s.text).toContain(d.steps[i].l)
      })
      expect(ld.url).toBe(SITE + recipePath(d.seed))
      expect(() => JSON.parse(jsonLdText(ld))).not.toThrow()
    }
  })
})

describe('jsonLdText', () => {
  it('cannot close the script element or open a comment', () => {
    const d = dish('</script><script>alert(1)</script><!--')
    const text = jsonLdText(recipeJsonLd(d))
    expect(text).not.toContain('<')
    expect(text).toContain('\\u003c/script>')
    expect(JSON.parse(text).url).toBe(SITE + '/plate?w=' + encodeURIComponent(d.seed))
    expect(JSON.parse(jsonLdText({ s: '</script> \u2028 \u2029' })).s).toBe('</script> \u2028 \u2029')
    expect(jsonLdText({ s: '\u2028\u2029' })).toBe('{"s":"\\u2028\\u2029"}')
  })
})

describe('routeSeo', () => {
  const leek = dish(DEFAULT_WORD), fig = dish('fig')
  it('/ uses the site defaults', () => {
    expect(routeSeo('/', '', DEFAULT_WORD)).toEqual(DEFAULT_SEO)
    expect(DEFAULT_SEO.title).toBe('Platedraw · Food, drawn by code')
    expect(DEFAULT_SEO.description.startsWith('Give it a word, get a dish')).toBe(true)
  })
  it('/plate is the plated dish, with the recipe canonical and JSON-LD', () => {
    const s = routeSeo('/plate', '?w=fig', 'fig')
    expect(s.title).toBe(`${fig.title} · Platedraw`)
    expect(s.description).toBe(recipeDescription(fig))
    expect(s.path).toBe('/plate?w=fig')
    expect(s.jsonLd?.['@type']).toBe('Recipe')
    expect(routeSeo('/plate', '', DEFAULT_WORD).path).toBe('/plate?w=take%20a%20leek')
  })
  it('recipe descriptions add cuisine, times and serves 2', () => {
    expect(recipeDescription(leek)).toBe(`${leek.desc} North African · prep 15 min · cook 35 min · serves 2.`)
  })
  it('/card has its own title but the /plate canonical and description', () => {
    const s = routeSeo('/card', '?w=fig', DEFAULT_WORD)
    expect(s.title).toBe(`${fig.title} recipe card · Platedraw`)
    expect(s.description).toBe(recipeDescription(fig))
    expect(s.path).toBe('/plate?w=fig')
    expect(s.jsonLd).toEqual(routeSeo('/plate', '', 'fig').jsonLd)
    expect(routeSeo('/card', '', 'fig').path).toBe('/plate?w=fig')
  })
  it('the other screens have a title and sentence of their own', () => {
    const others = [routeSeo('/forks', '?w=fig', 'leek'), routeSeo('/guide', '', 'leek'), routeSeo('/today', '', 'leek'),
      routeSeo('/day/2026-10-12', '', 'leek'), routeSeo('/parts', '', 'leek')]
    expect(others.map(s => s.path)).toEqual(['/forks?w=fig', '/guide', '/today', '/day/2026-10-12', '/parts'])
    expect(new Set(others.map(s => s.title)).size).toBe(others.length)
    expect(new Set(others.map(s => s.description)).size).toBe(others.length)
    for (const s of others) {
      expect(s.title.endsWith(' · Platedraw')).toBe(true)
      expect(s.title).not.toBe(DEFAULT_SEO.title)
      expect(s.jsonLd).toBeUndefined()
    }
    expect(others[0].title).toBe('Forks of “fig” · Platedraw')
    expect(others[3].description).toContain(dish('2026-10-12').title)
  })
  it('an invalid /day/ date falls back to /today', () => {
    expect(routeSeo('/day/2026-02-30', '', 'leek')).toEqual(routeSeo('/today', '', 'leek'))
  })
  it('unknown paths get the defaults', () => {
    expect(routeSeo('/nope', '', 'leek')).toEqual(DEFAULT_SEO)
  })
})

describe('routeSeo /anatomy', () => {
  it('has its own title, points canonical at the /plate page and carries no JSON-LD', () => {
    const d = dish('leek')
    const s = routeSeo('/anatomy', '?w=leek', 'fig')
    expect(s.title).toBe(`Anatomy of ${d.title} · Platedraw`)
    expect(s.description).toBe(`${recipeDescription(d)} Layer by layer: what’s in it and how it’s made.`)
    expect(s.path).toBe('/plate?w=leek')
    expect(s.jsonLd).toBeUndefined()
  })
  it('falls back to the plated word without ?w=', () => {
    expect(routeSeo('/anatomy', '', 'fig').path).toBe('/plate?w=fig')
  })
})
