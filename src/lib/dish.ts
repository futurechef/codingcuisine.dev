// Seeded dish generator. Same word, same dish — always.
//
// The word picks an ingredient (a real one named in the word wins), a cuisine,
// and a technique that suits both; the cuisine supplies the sauce, crunch,
// herb, acid and heat. Everything downstream — title, method, timings,
// flavour radar, plate look — is derived from those choices.

import type { Garnish, PlateLook, Shape } from './look'
import { CHEESE, CUISINES, INGREDIENTS, overrideKind, SWAPS, SWEET_FRUIT, TECHNIQUES, type Crunch, type Cuisine, type F, type Ingredient as Produce, type Sauce, type Season } from './pantry'
import { hash, rng } from './rng'

export type { Kind, PlateLook, Shape } from './look'
export { hash } from './rng'

export type LayerName = 'plate' | 'sauce' | 'main' | 'crunch' | 'herbs'
export interface Ingredient { role: string; name: string; g: number; layer: LayerName }
export interface Step { n: string; a: string; t: string; l: string; layer: LayerName }

export interface Dish extends PlateLook {
  seed: string
  no: number
  cu: string
  l1: string
  l2: string
  title: string
  desc: string
  meta: string
  eyebrow: string
  chips: string[]
  /** Flavour 0–5: sweet, salty, sour, bitter, umami, heat. */
  r: number[]
  short: string[]
  ing: Ingredient[]
  steps: Step[]
  /** Names of the plate's parts, for captions: the sauce, the crunch, the herb and the finishing acid or heat. */
  parts: { sauce: string; crunch: string; herb: string; finish: string }
  /** The produce the dish is built on, and whether the word named it. */
  produce: string
  named: boolean
  /** The meat or fish word this vegetarian dish stands in for. */
  swappedFrom?: string
  /** A tongue-in-cheek line about the swap. */
  swapQuip?: string
}

export const FLAVOURS = ['Sweet', 'Salty', 'Sour', 'Bitter', 'Umami', 'Heat']
export const DEFAULT_WORD = 'take a leek'
/** Puns that land on a real ingredient. */
export const PUN_WORDS = ['lettuce celebrate', 'kale yeah', 'beet it', 'turnip the heat', "there's always mushroom", 'peas and love', "you're one in a melon", 'berry nice', 'orange you glad', 'romaine calm', 'kiwi do this', 'squash goals', 'we make a great pear', 'chard times', 'lettuce turnip the beet']

export const SURPRISE_WORDS = [...PUN_WORDS, 'fig', 'beetroot', 'miso', 'lime', 'tahini', 'radish', 'plum', 'corn', 'kale', 'peach', 'quince', 'fennel', 'shiitake', 'rhubarb', 'celeriac', 'halloumi', 'apricot', 'chicory']

// ---- Choosing ------------------------------------------------------------------

const norm = (s: string) => ' ' + s.toLowerCase().replace(/[^a-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim() + ' '

/** A key plus its simple plural/singular forms ("berry" ↔ "berries", "leek" ↔ "leeks"). */
function forms(k: string): string[] {
  const out = [k, k + 's', k + 'es']
  if (k.endsWith('ies')) out.push(k.slice(0, -3) + 'y')
  else if (k.endsWith('es')) out.push(k.slice(0, -2), k.slice(0, -1))
  else if (k.endsWith('s')) out.push(k.slice(0, -1))
  if (k.endsWith('y')) out.push(k.slice(0, -1) + 'ies')
  return out
}

const BY_NAME = new Map(INGREDIENTS.map(p => [p.n, p]))

interface Hit { produce: Produce; swappedFrom?: string; tech?: string }

/** The ingredient (or vegetarian swap) named in the word, preferring the longest match ("white beans" over "beans"). */
function named(word: string): Hit | undefined {
  const w = norm(word)
  let best: Hit | undefined, len = 0
  const consider = (key: string, hit: () => Hit | undefined) => {
    for (const f of forms(key.toLowerCase())) {
      if (f.length > len && w.includes(' ' + f + ' ')) { const h = hit(); if (h) { best = h; len = f.length } }
    }
  }
  for (const p of INGREDIENTS) for (const c of [p.n, ...(p.alias ?? [])]) consider(c, () => ({ produce: p }))
  for (const [k, s] of Object.entries(SWAPS)) {
    consider(k, () => { const p = BY_NAME.get(s.to); return p && { produce: p, swappedFrom: k, tech: s.tech && p.tech.includes(s.tech) ? s.tech : undefined } })
  }
  return best
}

/** Words that aren't produce but clearly point at a kitchen. */
const CUISINE_WORDS: Record<string, string> = {
  miso: 'Japanese', soba: 'Japanese', ramen: 'Japanese', yuzu: 'Japanese', sushi: 'Japanese', dashi: 'Japanese', udon: 'Japanese', matcha: 'Japanese',
  kimchi: 'Korean', gochujang: 'Korean', bibimbap: 'Korean', seoul: 'Korean',
  tahini: 'Levantine', hummus: 'Levantine', falafel: 'Levantine', zaatar: "Levantine", sumac: 'Levantine', beirut: 'Levantine',
  harissa: 'North African', tagine: 'North African', couscous: 'North African', marrakech: 'North African',
  curry: 'Indian', masala: 'Indian', dal: 'Indian', dhal: 'Indian', paneer: 'Indian', chai: 'Indian', tikka: 'Indian',
  taco: 'Mexican', tacos: 'Mexican', tortilla: 'Mexican', mole: 'Mexican', salsa: 'Mexican', chipotle: 'Mexican',
  pho: 'Southeast Asian', satay: 'Southeast Asian', lemongrass: 'Southeast Asian', bangkok: 'Southeast Asian', hanoi: 'Southeast Asian',
  pasta: 'Italian', pesto: 'Italian', risotto: 'Italian', burrata: 'Italian', roma: 'Italian', nonna: 'Italian',
  feta: 'Mediterranean', olive: 'Mediterranean', greek: 'Mediterranean', athens: 'Mediterranean',
  rye: 'Nordic', dill: 'Nordic', hygge: 'Nordic', fjord: 'Nordic', copenhagen: 'Nordic',
  market: 'Farmers-market', allotment: 'Farmers-market', garden: 'Farmers-market', farm: 'Farmers-market',
}

function namedCuisine(word: string): Cuisine | undefined {
  const words = norm(word).trim().split(' ').map(w => w.replace(/['-]/g, ''))
  for (let i = words.length - 1; i >= 0; i--) {
    const cu = CUISINE_WORDS[words[i]]
    if (cu) return CUISINES.find(c => c.cu === cu)
  }
}

const SEASON_BY_MONTH: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

/** YYYY-MM-DD words are dish-of-the-day seeds: keep them seasonal. */
function seasonOf(word: string): Season | undefined {
  const m = word.trim().match(/^\d{4}-(\d{2})-\d{2}$/)
  return m ? SEASON_BY_MONTH[(+m[1] - 1) % 12] : undefined
}

// ---- Pairing rules: no repeats on a plate, no savoury sauces on sweet fruit --------

const stem = (n: string) => n.toLowerCase().split(' ').pop()!.replace(/ies$/, 'y').replace(/(?<=[^aeiou])es$|s$/, '')

function sauceFits(s: Sauce, p: Produce, tech: string): boolean {
  const text = (s.n + ' ' + s.rows.map(r => r[1]).join(' ')).toLowerCase()
  if (text.includes(stem(p.n))) return false
  if (tech === 'brown-butter' && /brown butter/.test(s.n)) return false
  if (CHEESE.has(p.n) && s.rows.some(r => r[0] === 'Cream')) return false
  if (SWEET_FRUIT.has(p.n) && (s.f[4] >= 2 || s.f[5] >= 3)) return false
  return true
}

const crunchFits = (c: Crunch, p: Produce) => !c.n.toLowerCase().includes(stem(p.n))

/** Indices of the items that fit, or all of them if none do. */
function fitting<T>(list: T[], ok: (t: T) => boolean): number[] {
  const idx = list.map((_, i) => i).filter(i => ok(list[i]))
  return idx.length ? idx : list.map((_, i) => i)
}

const titleCase = (s: string) => s[0].toUpperCase() + s.slice(1)
const add = (a: F, b: F): F => a.map((v, i) => v + b[i]) as F
const clampF = (v: F) => v.map(x => Math.max(0, Math.min(5, Math.round(x))))

interface Choice {
  word: string
  produce: Produce
  isNamed: boolean
  swappedFrom?: string
  swapQuip?: string
  cuisine: Cuisine
  tech: string
  sauce: number
  crunch: number
  herb: number
  acid: number
  heat: number | null
  shape: Shape
}

function choose(word: string): Choice {
  const r = rng(word, 'dish')
  const hit = named(word)
  const season = seasonOf(word)
  const pool = season ? INGREDIENTS.filter(p => p.seasons.includes(season)) : INGREDIENTS
  const produce = hit?.produce ?? r.pick(pool)

  // A cuisine whose techniques overlap the ingredient's and that has a sauce that suits it.
  const fits = CUISINES.filter(c => c.tech.some(t => produce.tech.includes(t)) && c.sauces.some(x => sauceFits(x, produce, '')))
  const cuisine = namedCuisine(word) ?? r.pick(fits.length ? fits : CUISINES)

  // Prefer a technique both the kitchen and the ingredient like.
  const both = produce.tech.filter(t => cuisine.tech.includes(t))
  const pickTech = both.length && r.chance(0.75) ? r.pick(both) : r.pick(produce.tech)
  const tech = hit?.tech ?? pickTech

  return {
    word, produce, isNamed: !!hit, swappedFrom: hit?.swappedFrom, swapQuip: hit?.swappedFrom ? SWAPS[hit.swappedFrom].quip : undefined, cuisine, tech,
    sauce: r.pick(fitting(cuisine.sauces, s => sauceFits(s, produce, tech))),
    crunch: r.pick(fitting(cuisine.crunch, c => crunchFits(c, produce))),
    herb: r.int(cuisine.herbs.length),
    acid: r.int(cuisine.acids.length),
    heat: r.chance(0.55) ? r.int(cuisine.heat.length) : null,
    shape: r.pick(cuisine.shapes),
  }
}

// ---- Composing ----------------------------------------------------------------

const ASSEMBLE: Record<string, [string, string, string]> = {
  pool: ['Spoon the {s} into a wide pool, set the {x} on top, then add the {c} and {h}.', 'a pool just showing round the edges', 'Pool, place, scatter. Eat.'],
  swoosh: ['Swoosh the {s} across the plate, lay the {x} over, then scatter the {c} and {h}.', 'a plate that looks a little wild', 'Swoosh, lay, scatter. Eat.'],
  dots: ['Arrange the {x}, dot the {s} around the plate, then add the {c} and {h}.', 'dots that sit up, not spread', 'Arrange, dot, finish. Eat.'],
  drizzle: ['Arrange the {x}, drizzle the {s} over loosely, then the {c} and {h}.', 'a loose line, not a flood', 'Arrange, drizzle, scatter. Eat.'],
}

function compose(c: Choice): Dish {
  const { produce: p, cuisine: cu } = c
  const T = TECHNIQUES[c.tech]
  const sauce = cu.sauces[c.sauce]
  const crunch = cu.crunch[c.crunch]
  const herb = cu.herbs[c.herb]
  const acid = cu.acids[c.acid]
  const heat = c.heat == null ? null : cu.heat[c.heat]
  const x = p.n
  const h = hash(c.word)
  const no = 1000 + (h % 9000)

  const l1 = T.title(x)
  const l2 = `${sauce.n}, ${crunch.short}`
  const title = `${l1}, ${sauce.n}, ${crunch.n}`
  const desc = `${T.texture}, ${sauce.feel}, ${(heat ?? acid).finish}.`

  const fat = T.fat ?? [cu.fat, 30]
  const ing: Ingredient[] = [
    { role: 'Base', name: titleCase(x), g: p.g, layer: 'main' },
    { role: 'Fat', name: fat[0], g: fat[1], layer: 'main' },
    ...sauce.rows.map(([role, name, g]): Ingredient => ({ role, name, g, layer: 'sauce' })),
    { role: 'Crunch', name: titleCase(crunch.n), g: crunch.g, layer: 'crunch' },
    { role: 'Herb', name: titleCase(herb.n), g: herb.g, layer: 'herbs' },
  ]
  if (!sauce.rows.some(([role]) => role === 'Acid')) ing.push({ role: 'Acid', name: acid.row[0], g: acid.row[1], layer: 'herbs' })
  if (heat) ing.push({ role: 'Heat', name: heat.row[0], g: heat.row[1], layer: 'herbs' })
  // One row per thing: the cooking fat and the sauce's oil are often the same.
  for (let i = ing.length - 1; i > 0; i--) {
    const j = ing.findIndex(o => o.name.toLowerCase() === ing[i].name.toLowerCase())
    if (j < i) { ing[j].g += ing[i].g; ing.splice(i, 1) }
  }

  const style = sauce.style === 'none' ? 'pool' : sauce.style
  const [aT, aL, aQ] = ASSEMBLE[style]
  const fill = (s: string) => s.replace(/\{x\}/g, x).replace(/\{s\}/g, sauce.n).replace(/\{c\}/g, crunch.n).replace(/\{h\}/g, herb.n)
  const raw: [string, string, string, LayerName][] = [
    ...T.steps.map(([a, t, l]) => [a, fill(t), l, 'main'] as [string, string, string, LayerName]),
    [...sauce.step, 'sauce'] as [string, string, string, LayerName],
    ['ASSEMBLE', fill(aT) + (heat ? ` Finish with ${heat.row[0].toLowerCase()}.` : ` Finish with ${acid.row[0].toLowerCase()}.`), aL, 'herbs'],
  ]
  const steps = raw.map(([a, t, l, layer], k) => ({ n: String(k + 1).padStart(2, '0'), a, t, l, layer }))

  let f: F = [0, 1, 0, 0, 0, 0]
  for (const v of [p.f, T.f, sauce.f, crunch.f, [0, 0, 2, 0, 0, 0] as F, heat ? [0, 0, 0, 0, 0, 2] as F : [0, 0, 0, 0, 0, 0] as F]) f = add(f, v)
  // Squash into 0–5 while keeping the shape: the strongest note lands on 4–5.
  const peak = Math.max(...f)
  const r = clampF(f.map(v => (peak > 5 ? (v * 5) / peak : v)) as F)

  const kinds = T.kinds[p.form] ?? Object.values(T.kinds)[0] ?? ['pile']
  const garnish = [...new Set<Garnish>([herb.garnish, crunch.garnish, ...(heat?.garnish ? [heat.garnish] : []), ...(acid.garnish ? [acid.garnish] : [])])].slice(0, 3)

  return {
    seed: c.word, no, cu: cu.cu, produce: x, named: c.isNamed, swappedFrom: c.swappedFrom, swapQuip: c.swapQuip,
    shape: c.shape, kind: overrideKind(p.n, c.tech) ?? rng(c.word, 'kind').pick(kinds), sauce: sauce.colour, main: p.colour,
    sauceStyle: sauce.style, crunch: crunch.colour, herb: herb.colour, garnish,
    l1, l2, title, desc,
    meta: 'PLATEDRAW · NO. ' + no + ' · ' + cu.cu.toUpperCase(),
    eyebrow: 'RECIPE · ' + cu.cu.toUpperCase() + ' · SERVES 2',
    chips: [`Prep ${T.prep + 5} min`, `Cook ${Math.max(5, T.cook)} min`, 'Serves 2'],
    r, ing, steps,
    parts: { sauce: sauce.n, crunch: crunch.n, herb: herb.n, finish: (heat ?? acid).row[0] },
    short: [T.q, sauce.q, aQ],
  }
}

const cache = new Map<string, Dish>()

export function dish(word: string): Dish {
  const w = (word || 'leek').trim() || 'leek'
  let d = cache.get(w)
  if (!d) {
    d = compose(choose(w))
    if (cache.size > 500) cache.clear()
    cache.set(w, d)
  }
  return d
}

// ---- Forks --------------------------------------------------------------------

export interface Fork { dish: Dish; tag: string; note?: string; seed: string }

/** Parent, then a fork that swaps the sauce, then one that also swaps the crunch. */
export function lineage(word: string): Fork[] {
  const w = (word || 'leek').trim() || 'leek'
  const base = choose(w)
  const r = rng(w, 'fork')
  // A different item that still fits the dish, if there is one.
  const other = (ok: number[], all: number, cur: number) => {
    const pool = ok.filter(i => i !== cur)
    return pool.length ? r.pick(pool) : all < 2 ? cur : (cur + 1 + r.int(all - 1)) % all
  }
  const cu = base.cuisine
  const f1 = { ...base, sauce: other(fitting(cu.sauces, s => sauceFits(s, base.produce, base.tech)), cu.sauces.length, base.sauce) }
  const f2 = { ...f1, crunch: other(fitting(cu.crunch, c => crunchFits(c, base.produce)), cu.crunch.length, base.crunch) }
  const d0 = compose(base), d1 = compose(f1), d2 = compose(f2)
  // Forks keep the parent's drawing seed so only the changed part moves.
  const same = { seed: d0.seed, no: d0.no, shape: d0.shape, kind: d0.kind }
  return [
    { dish: d0, tag: 'PARENT', seed: w },
    { dish: { ...d1, ...same }, tag: 'FORK 1', note: 'new sauce: ' + base.cuisine.sauces[f1.sauce].n, seed: w + '′' },
    { dish: { ...d2, ...same }, tag: 'FORK 2', note: 'new crunch: ' + base.cuisine.crunch[f2.crunch].n, seed: w + '′′' },
  ]
}

// ---- Field guide ----------------------------------------------------------------

export const GUIDE_WORDS = ['fig', 'aubergine', 'leek', 'miso mushrooms', 'kimchi cabbage', 'corn', 'tomatillo', 'tahini carrots', 'chickpea', 'celeriac', 'beetroot', 'radish']

export function guidePlates(): Dish[] {
  return GUIDE_WORDS.map(dish)
}
