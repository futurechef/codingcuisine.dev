import { FLAVOURS, type Dish } from './dish'
import { plateHpgl, plateSvgFile } from './plate'

export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // iOS asks before saving and reads the blob only after the tap, so keep the URL alive for a while.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function save(name: string, type: string, body: string) {
  saveBlob(name, new Blob([body], { type }))
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dish'
}

/** A dish in the ForkRecipe format (JSON). */
export function forkRecipe(d: Dish) {
  return {
    format: 'forkrecipe',
    version: 1,
    source: 'https://codingcuisine.dev/plate?w=' + encodeURIComponent(d.seed),
    seed: d.seed,
    number: d.no,
    title: d.title,
    cuisine: d.cu,
    description: d.desc,
    serves: 2,
    times: d.chips.filter(c => !c.startsWith('Serves')),
    flavour: Object.fromEntries(FLAVOURS.map((f, i) => [f.toLowerCase(), d.r[i]])),
    ingredients: d.ing.map(i => ({ role: i.role.toLowerCase(), name: i.name, grams: i.g })),
    method: d.steps.map(s => ({ action: s.a.toLowerCase(), text: s.t, lookFor: s.l })),
    plate: { shape: d.shape, main: d.kind, sauceColour: d.sauce, mainColour: d.main },
  }
}

export const DOWNLOADS = [
  { label: 'SVG', ext: '.svg', run: (d: Dish) => save(`platedraw-${d.no}-${slug(d.seed)}.svg`, 'image/svg+xml', plateSvgFile(d, d.title, false)) },
  { label: 'Animated SVG', ext: '.svg · SMIL', run: (d: Dish) => save(`platedraw-${d.no}-${slug(d.seed)}-animated.svg`, 'image/svg+xml', plateSvgFile(d, d.title, true)) },
  { label: 'Plotter file', ext: '.plt', run: (d: Dish) => save(`platedraw-${d.no}-${slug(d.seed)}.plt`, 'application/vnd.hp-hpgl', plateHpgl(d)) },
  { label: 'Recipe file', ext: '.forkrecipe', run: (d: Dish) => save(`${slug(d.seed)}.forkrecipe`, 'application/json', JSON.stringify(forkRecipe(d), null, 2) + '\n') },
]
