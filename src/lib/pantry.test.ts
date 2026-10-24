import { describe, expect, it } from 'vitest'
import { dish } from './dish'
import { INGREDIENTS, SWAPS, TECHNIQUES, type Season } from './pantry'

/** Same plural/singular expansion dish.ts uses when matching words. */
function forms(k: string): string[] {
  const out = [k, k + 's', k + 'es']
  if (k.endsWith('ies')) out.push(k.slice(0, -3) + 'y')
  else if (k.endsWith('es')) out.push(k.slice(0, -2), k.slice(0, -1))
  else if (k.endsWith('s')) out.push(k.slice(0, -1))
  if (k.endsWith('y')) out.push(k.slice(0, -1) + 'ies')
  return out
}

// Everyday vegetarian food words: singular and plural, US and UK, a few phrases.
const WORDS = [
  // greens & salad
  'spinach', 'baby spinach', 'chard', 'swiss chard', 'kale', 'cavolo nero', 'lettuce', 'little gem', 'romaine', 'watercress',
  'rocket', 'arugula', 'radicchio', 'endive', 'chicory', 'puntarelle', 'bok choy', 'pak choi', 'collard greens', 'spring greens',
  'cabbage', 'red cabbage', 'savoy cabbage', 'brussels sprouts', 'sprouts', 'broccoli', 'broccolini', 'cauliflower', 'romanesco', 'samphire',
  // stems, bulbs, alliums
  'celery', 'artichoke', 'globe artichokes', 'jerusalem artichokes', 'sunchokes', 'fennel', 'asparagus', 'leek', 'leeks', 'onion',
  'onions', 'red onion', 'shallots', 'scallions', 'spring onions', 'garlic', 'spring garlic', 'wild garlic', 'ramps', 'hearts of palm',
  'okra',
  // roots & squash
  'carrot', 'carrots', 'beetroot', 'beets', 'parsnips', 'turnip', 'swede', 'rutabaga', 'celeriac', 'celery root',
  'potato', 'potatoes', 'new potatoes', 'chips', 'sweet potato', 'sweet potatoes', 'yams', 'radishes', 'daikon', 'kohlrabi',
  'salsify', 'squash', 'butternut squash', 'pumpkin', 'delicata', 'kabocha',
  // summer veg
  'tomato', 'tomatoes', 'cherry tomatoes', 'aubergine', 'eggplant', 'zucchini', 'courgettes', 'courgette flowers', 'peppers', 'bell pepper',
  'padron peppers', 'shishito peppers', 'corn', 'sweetcorn', 'peas', 'sugar snaps', 'broad beans', 'fava beans', 'green beans', 'runner beans',
  'edamame', 'cucumber', 'tomatillos',
  // mushrooms
  'mushrooms', 'mushroom', 'oyster mushrooms', 'king oyster mushrooms', 'portobello', 'maitake', 'hen of the woods', 'shiitake', 'chanterelles', 'morels',
  // fruit
  'avocado', 'avocados', 'mango', 'mangoes', 'pineapple', 'melon', 'cantaloupe', 'watermelon', 'strawberry', 'strawberries',
  'raspberries', 'blueberries', 'blackberries', 'berries', 'gooseberries', 'cranberries', 'lemon', 'lemons', 'orange', 'oranges',
  'blood orange', 'grapefruit', 'clementines', 'banana', 'bananas', 'plantain', 'kiwi', 'pomegranate', 'coconut', 'papaya',
  'figs', 'plums', 'peach', 'nectarine', 'pears', 'apple', 'apricots', 'quince', 'cherries', 'rhubarb',
  'grapes', 'persimmon', 'jackfruit', 'chestnuts',
  // eggs, dairy, proteins
  'eggs', 'egg', 'duck eggs', 'paneer', 'feta', 'ricotta', 'burrata', 'mozzarella', "goat's cheese", 'goat cheese',
  'halloumi', 'tofu', 'silken tofu', 'smoked tofu', 'tempeh', 'seitan',
  // grains, noodles, bread
  'rice', 'basmati', 'fried rice', 'risotto', 'wild rice', 'polenta', 'grits', 'barley', 'farro', 'freekeh',
  'quinoa', 'bulgur', 'couscous', 'giant couscous', 'noodles', 'soba', 'udon', 'rice noodles', 'pasta', 'spaghetti',
  'rigatoni', 'orecchiette', 'gnocchi', 'bread', 'sourdough', 'toast', 'flatbread', 'naan',
  // pulses
  'lentils', 'dal', 'chickpeas', 'garbanzo beans', 'hummus', 'white beans', 'butter beans', 'cannellini beans', 'borlotti beans', 'black beans',
  'kidney beans',
]

const EXPECT: Record<string, string> = {
  spinach: 'spinach', 'baby spinach': 'spinach', arugula: 'rocket', rocket: 'rocket', eggplant: 'aubergine', zucchini: 'courgettes',
  lettuce: 'little gem', romaine: 'little gem', 'bok choy': 'pak choi', scallions: 'spring onions', onion: 'red onions',
  artichoke: 'globe artichokes', 'jerusalem artichokes': 'Jerusalem artichokes', 'celery root': 'celeriac', celery: 'celery',
  garlic: 'garlic', 'wild garlic': 'wild garlic', ramps: 'wild garlic', 'spring garlic': 'spring garlic',
  potato: 'potatoes', chips: 'potatoes', 'new potatoes': 'new potatoes', 'sweet potatoes': 'sweet potato', yams: 'sweet potato',
  pumpkin: 'squash', delicata: 'delicata squash', 'cherry tomatoes': 'tomatoes', 'bell pepper': 'peppers', 'padron peppers': 'padron peppers',
  'shishito peppers': 'padron peppers', corn: 'sweetcorn', 'fava beans': 'broad beans', 'runner beans': 'green beans',
  'king oyster mushrooms': 'king oyster mushrooms', 'oyster mushrooms': 'oyster mushrooms', portobello: 'portobello mushrooms', 'hen of the woods': 'maitake',
  avocados: 'avocado', mangoes: 'mango', strawberry: 'strawberries', berries: 'strawberries', lemon: 'lemons', orange: 'oranges', 'blood orange': 'blood oranges',
  banana: 'bananas', egg: 'eggs', 'duck eggs': 'eggs', 'goat cheese': "goat's cheese", 'silken tofu': 'silken tofu', 'smoked tofu': 'smoked tofu', tofu: 'tofu',
  rice: 'rice', 'fried rice': 'rice', risotto: 'risotto rice', 'wild rice': 'wild rice', grits: 'polenta', barley: 'pearl barley',
  couscous: 'couscous', 'giant couscous': 'giant couscous', noodles: 'egg noodles', soba: 'soba noodles', udon: 'udon noodles', 'rice noodles': 'rice noodles',
  spaghetti: 'pasta', rigatoni: 'pasta', bread: 'sourdough', toast: 'sourdough', naan: 'flatbread',
  dal: 'lentils', 'garbanzo beans': 'chickpeas', hummus: 'chickpeas', 'butter beans': 'white beans', 'black beans': 'black beans', 'borlotti beans': 'borlotti beans',
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

describe('coverage', () => {
  it('has a long list of everyday words', () => {
    expect(new Set(WORDS).size).toBeGreaterThanOrEqual(150)
  })

  it.each(WORDS)('recognises "%s"', w => {
    const d = dish(w)
    expect(d.named).toBe(true)
    expect(d.swappedFrom).toBeUndefined()
  })

  it.each(Object.entries(EXPECT))('"%s" is built on %s', (w, n) => {
    expect(dish(w).produce).toBe(n)
  })
})

describe('vegetarian swaps', () => {
  it.each(Object.entries(SWAPS))('"%s" becomes %o', (k, s) => {
    const d = dish(k)
    expect(d.swappedFrom).toBe(k)
    expect(d.produce).toBe(s.to)
    expect(d.named).toBe(true)
    if (s.tech) expect(d.l1).toBe(TECHNIQUES[s.tech].title(s.to))
  })

  it('every swap has a short, unique quip', () => {
    const quips = Object.entries(SWAPS).map(([k, s]) => {
      expect(s.quip, k).toBeTruthy()
      expect(s.quip!.length, `${k}: ${s.quip}`).toBeLessThanOrEqual(60)
      return s.quip!.toLowerCase()
    })
    expect(new Set(quips).size).toBe(quips.length)
  })

  it('every swap points at a real ingredient and one of its techniques', () => {
    for (const [k, s] of Object.entries(SWAPS)) {
      const p = INGREDIENTS.find(i => i.n === s.to)
      expect(p, k).toBeDefined()
      if (s.tech) expect(p!.tech, k).toContain(s.tech)
      expect(k, k).toBe(k.toLowerCase())
    }
  })
})

describe('pantry integrity', () => {
  const keyOwner = new Map<string, string>()
  for (const p of INGREDIENTS) for (const k of [p.n, ...(p.alias ?? [])]) {
    const lk = k.toLowerCase()
    if (!keyOwner.has(lk)) keyOwner.set(lk, p.n)
  }

  it('has unique ingredient names', () => {
    const names = INGREDIENTS.map(p => p.n.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('never lets two ingredients claim the same word', () => {
    const seen = new Map<string, string>()
    for (const p of INGREDIENTS) {
      for (const k of new Set([p.n, ...(p.alias ?? [])].map(s => s.toLowerCase()))) {
        expect(seen.get(k) ?? p.n, `"${k}" claimed by ${seen.get(k)} and ${p.n}`).toBe(p.n)
        seen.set(k, p.n)
      }
    }
  })

  it('keeps swap keys apart from ingredient names and aliases (including plurals)', () => {
    const words = new Set<string>()
    for (const k of keyOwner.keys()) for (const f of forms(k)) words.add(f)
    for (const k of Object.keys(SWAPS)) for (const f of forms(k)) expect(words.has(f), `swap "${k}" collides via "${f}"`).toBe(false)
  })

  it('only uses techniques that exist, with an arrangement for the ingredient form', () => {
    for (const p of INGREDIENTS) {
      expect(p.tech.length, p.n).toBeGreaterThan(0)
      for (const t of p.tech) {
        const T = TECHNIQUES[t]
        expect(T, `${p.n}: ${t}`).toBeDefined()
        expect(T.kinds[p.form]?.length ?? 0, `${t} has no kinds for ${p.form} (${p.n})`).toBeGreaterThan(0)
      }
    }
  })

  it('has sane colours, seasons, grams and flavours', () => {
    for (const p of INGREDIENTS) {
      expect(p.colour, p.n).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.seasons.length, p.n).toBeGreaterThan(0)
      for (const s of p.seasons) expect(SEASONS, p.n).toContain(s)
      expect(p.g, p.n).toBeGreaterThan(0)
      expect(p.f, p.n).toHaveLength(6)
    }
  })

  it('techniques are well formed', () => {
    for (const [id, T] of Object.entries(TECHNIQUES)) {
      expect(T.id).toBe(id)
      expect(T.steps.length, id).toBeGreaterThan(0)
      expect(T.steps.some(([, s]) => s.includes('{x}')), id).toBe(true)
      expect(T.steps.some(([, s]) => s.includes('Finish with')), id).toBe(false)
    }
  })

  it.each(SEASONS)('has at least 15 ingredients in %s', s => {
    expect(INGREDIENTS.filter(p => p.seasons.includes(s)).length).toBeGreaterThanOrEqual(15)
  })
})

describe('generated dishes', () => {
  const SYL = ['ka', 'lo', 'mi', 'ber', 'tan', 'sol', 'ru', 'vex', 'pa', 'dor', 'en', 'qui', 'zo', 'lim', 'tra']
  const gen: string[] = []
  for (let i = 0; i < 300; i++) gen.push(SYL[i % 15] + SYL[(i * 7) % 15] + SYL[(i * 11 + 3) % 15] + (i % 4 ? '' : ' ' + SYL[i % 13]))
  const words = [...gen, ...WORDS, ...Object.keys(SWAPS), ...INGREDIENTS.map(p => p.n), '2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']

  it('covers ~500 words', () => {
    expect(words.length).toBeGreaterThanOrEqual(500)
  })

  it('is fully filled in and tidy', () => {
    for (const w of words) {
      const a = dish(w)
      const text = [a.title, a.desc, a.l1, a.l2, ...a.short, ...a.steps.flatMap(s => [s.a, s.t, s.l])].join(' | ')
      expect(text, w).not.toMatch(/\{[xsch]\}/)
      for (const s of a.steps) expect((s.t.match(/Finish with/g) ?? []).length, `${w}: ${s.t}`).toBeLessThanOrEqual(1)
      const names = a.ing.map(r => r.name.toLowerCase())
      expect(new Set(names).size, `${w}: ${names.join(', ')}`).toBe(names.length)
    }
  })

  it('is deterministic: a fresh module gives the same dishes', async () => {
    const before = words.map(w => JSON.stringify(dish(w)))
    const { vi } = await import('vitest')
    vi.resetModules()
    const fresh = await import('./dish')
    expect(words.map(w => JSON.stringify(fresh.dish(w)))).toEqual(before)
  })
})
