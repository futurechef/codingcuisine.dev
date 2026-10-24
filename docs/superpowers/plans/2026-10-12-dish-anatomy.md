# Dish Anatomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Platedraw dish gets an `/anatomy?w=` view: the plate pen-draws, then tilts and lifts apart into five labelled layers you can tap for ingredients and method.

**Architecture:** `dish.ts` tags every ingredient and step with the layer that owns it and exposes the part names; a pure `anatomy.ts` groups them into five layers with captions; `plate.ts` exposes its existing per-layer markup so `ExplodedPlate.tsx` can wrap each layer in a `<g>` that CSS tilts (`scaleY(.5)`) and lifts (`translateY`). A new `Anatomy` screen, nav tab and SEO entry wire it into the site.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Vitest 3 (node env; `react-dom/server` for render tests). Repo: `C:\Users\cookd\gitty\codingcuisine.dev`, branch `feat/anatomy`.

**Spec:** `docs/superpowers/specs/2026-10-12-dish-anatomy-design.md`

## Global Constraints

- Layers, in drawing order: `plate`, `sauce`, `main`, `crunch`, `herbs`. Labels: `PLATE`, `SAUCE`, `MAIN`, `CRUNCH`, `HERBS & FINISH`.
- Ownership: Base, Fat → `main`; every sauce row → `sauce`; Crunch → `crunch`; Herb, the separate Acid finish, Heat → `herbs`. Technique steps → `main`; the sauce step → `sauce`; ASSEMBLE → `herbs`. Merged duplicate rows keep the surviving (earlier) row's layer.
- Sauce caption when `sauceStyle === 'none'`: `None — it’s dressed in the pan`.
- Plate captions: round `Round plate`, coupe `Coupe plate`, square `Square plate`, oval `Oval platter`, slate `Slate`, bowl `Shallow bowl`, board `Board`.
- Route `/anatomy?w=<word>`; nav tab label `Anatomy`, placed after `Card`.
- SEO: title `Anatomy of <dish title> · Platedraw`; description = `recipeDescription(d)` + ` Layer by layer: what’s in it and how it’s made.`; canonical path = `recipePath(d.seed)` (the `/plate?w=` URL); no JSON-LD; not in the sitemap.
- Motion: pen draw as `/plate` (`DRAW_SECONDS` 3.9 s) + 300 ms, then tilt + lift over 1.2 s, top layer first, 120 ms stagger; labels fade in from 1.2 s, 100 ms apart. Lift gap 46 px (≥ 720 px wide), 34 px below. Reduced motion: opens exploded, no transitions.
- Toggle button copy: `Put it back together` / `Pull it apart`. Plate-page link copy: `See its anatomy`.
- Markup injected with `dangerouslySetInnerHTML` is only ever plate.ts geometry (numbers + hex) — never dish text.
- Commits: `git commit -s`, message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `npm test` and `npm run build` must pass before each commit.

## Plan decisions (deviations from the spec, ruled here)

- `Ingredient.layer` / `Step.layer` are **required**, not optional: `dish.ts` is the only place either is built (checked with grep), so required catches a missed tag at compile time.
- `Dish` gains `parts: { sauce: string; crunch: string; herb: string; finish: string }` — the sauce's name isn't in the ingredient list, so captions need it.
- The component file is `src/components/ExplodedPlate.tsx` (export `ExplodedPlate`), so it doesn't clash with the screen `src/screens/Anatomy.tsx` (export `Anatomy`).
- Screenshots for the manual browser check are committed to `docs/screens/` and linked from the PR body.

## Review Focus

1. Odd seed words (`''`, `'   '`, `'A & B <c>'`, `'</script>'`) — the page renders, text is escaped, captions non-empty. Pinned in Task 2 and Task 5 tests.
2. Reduced motion — opens exploded with labels visible. Pinned in Task 5 (matchMedia stub).
3. Changing the word (Plate → Anatomy for another word, back/forward) — the drawing replays for the new dish and no timer from the old one fires. `key={word}` in Task 5; checked by hand in Task 6.
4. Tapping a layer mid-animation, or toggling twice quickly — selection still works and the stack ends in the state the button names. Checked by hand in Task 6.
5. Phone width (375 px) — labels become a list under the drawing, no horizontal scroll. Checked by hand in Task 6.

---

### Task 1: Layer tags and part names on the dish

**Files:**
- Modify: `src/lib/dish.ts` (interfaces at :15-41; `ing` at :210-222; `raw`/`steps` at :228-233; returned object at :~245)
- Test: `src/lib/dish.test.ts`

**Interfaces:**
- Produces: `export type LayerName = 'plate' | 'sauce' | 'main' | 'crunch' | 'herbs'`; `Ingredient { role; name; g; layer: LayerName }`; `Step { n; a; t; l; layer: LayerName }`; `Dish.parts: { sauce: string; crunch: string; herb: string; finish: string }`.

- [ ] **Step 1: Write the failing test** — append to `src/lib/dish.test.ts` (add `GUIDE_WORDS, PUN_WORDS, SURPRISE_WORDS` and `INGREDIENTS` imports if not already imported):

```ts
import { INGREDIENTS } from './pantry'

const LAYER_WORDS = [...new Set([...INGREDIENTS.map(i => i.n), ...GUIDE_WORDS, ...PUN_WORDS, ...SURPRISE_WORDS,
  'hello world', 'bacon', 'x', '', '   ', 'A & B <c>', 'naïve café', '2026-10-12'])]

describe('layer tags', () => {
  it('every ingredient and step says which layer owns it', () => {
    const ok = ['plate', 'sauce', 'main', 'crunch', 'herbs']
    for (const w of LAYER_WORDS) {
      const d = dish(w)
      for (const i of d.ing) expect(ok, `${w}: ${i.name}`).toContain(i.layer)
      for (const s of d.steps) expect(ok, `${w}: ${s.n}`).toContain(s.layer)
    }
  })
  it('follows the ownership rules', () => {
    for (const w of LAYER_WORDS) {
      const d = dish(w)
      expect(d.ing[0]).toMatchObject({ role: 'Base', layer: 'main' })
      for (const i of d.ing.filter(i => i.role === 'Crunch')) expect(i.layer).toBe('crunch')
      const last = d.steps[d.steps.length - 1], sauceStep = d.steps[d.steps.length - 2]
      expect(last).toMatchObject({ a: 'ASSEMBLE', layer: 'herbs' })
      expect(sauceStep.layer).toBe('sauce')
      for (const s of d.steps.slice(0, -2)) expect(s.layer).toBe('main')
    }
  })
  it('names the parts', () => {
    for (const w of LAYER_WORDS) {
      const d = dish(w)
      for (const k of ['sauce', 'crunch', 'herb', 'finish'] as const) expect(d.parts[k], `${w}: ${k}`).toBeTruthy()
      expect(d.title).toContain(d.parts.sauce)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/dish.test.ts`
Expected: FAIL — `layer` is `undefined`, `d.parts` is undefined.

- [ ] **Step 3: Implement** in `src/lib/dish.ts`:

```ts
export type LayerName = 'plate' | 'sauce' | 'main' | 'crunch' | 'herbs'
export interface Ingredient { role: string; name: string; g: number; layer: LayerName }
export interface Step { n: string; a: string; t: string; l: string; layer: LayerName }
```

Add to `interface Dish` (after `steps: Step[]`):

```ts
  /** Names of the plate's parts, for captions: the sauce, the crunch, the herb and the finishing acid or heat. */
  parts: { sauce: string; crunch: string; herb: string; finish: string }
```

Replace the `ing` construction:

```ts
  const ing: Ingredient[] = [
    { role: 'Base', name: titleCase(x), g: p.g, layer: 'main' },
    { role: 'Fat', name: fat[0], g: fat[1], layer: 'main' },
    ...sauce.rows.map(([role, name, g]): Ingredient => ({ role, name, g, layer: 'sauce' })),
    { role: 'Crunch', name: titleCase(crunch.n), g: crunch.g, layer: 'crunch' },
    { role: 'Herb', name: titleCase(herb.n), g: herb.g, layer: 'herbs' },
  ]
  if (!sauce.rows.some(([role]) => role === 'Acid')) ing.push({ role: 'Acid', name: acid.row[0], g: acid.row[1], layer: 'herbs' })
  if (heat) ing.push({ role: 'Heat', name: heat.row[0], g: heat.row[1], layer: 'herbs' })
```

(The merge loop below it is unchanged: it adds grams onto the earlier row `j`, which keeps its own layer.)

Replace `raw` and `steps`:

```ts
  const raw: [string, string, string, LayerName][] = [
    ...T.steps.map(([a, t, l]) => [a, fill(t), l, 'main'] as [string, string, string, LayerName]),
    [...sauce.step, 'sauce'] as [string, string, string, LayerName],
    ['ASSEMBLE', fill(aT) + (heat ? ` Finish with ${heat.row[0].toLowerCase()}.` : ` Finish with ${acid.row[0].toLowerCase()}.`), aL, 'herbs'],
  ]
  const steps = raw.map(([a, t, l, layer], k) => ({ n: String(k + 1).padStart(2, '0'), a, t, l, layer }))
```

In the returned object, after `r, ing, steps,` add:

```ts
    parts: { sauce: sauce.n, crunch: crunch.n, herb: herb.n, finish: (heat ?? acid).row[0] },
```

- [ ] **Step 4: Run the tests and the build**

Run: `npx vitest run src/lib/dish.test.ts` → PASS. Then `npm test` → all pass; `npm run build` → succeeds (JSX spreads `{...s}` into `StepItem` accept the extra `layer` prop).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dish.ts src/lib/dish.test.ts
git commit -s -m "feat(dish): tag every ingredient and step with the plate layer that owns it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `anatomy()` — five captioned layers

**Files:**
- Create: `src/lib/anatomy.ts`
- Test: `src/lib/anatomy.test.ts`

**Interfaces:**
- Consumes: `Dish`, `Ingredient`, `Step`, `LayerName`, `Dish.parts` (Task 1); `Shape` from `./look`.
- Produces: `export interface AnatomyLayer { name: LayerName; label: string; caption: string; ingredients: Ingredient[]; steps: Step[] }`; `export const LAYERS: readonly LayerName[]`; `export function anatomy(d: Dish): AnatomyLayer[]`; `export function layerSummary(p: AnatomyLayer): string`.

- [ ] **Step 1: Write the failing test** — `src/lib/anatomy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { anatomy, LAYERS, layerSummary } from './anatomy'
import { dish, GUIDE_WORDS, PUN_WORDS, SURPRISE_WORDS } from './dish'
import { INGREDIENTS } from './pantry'

const WORDS = [...new Set([...INGREDIENTS.map(i => i.n), ...GUIDE_WORDS, ...PUN_WORDS, ...SURPRISE_WORDS,
  'hello world', 'bacon', 'x', '', '   ', 'A & B <c>', '</script>', 'naïve café',
  ...Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i * 9)).toISOString().slice(0, 10))])]

describe('anatomy', () => {
  it('covers at least 200 dishes', () => expect(WORDS.length).toBeGreaterThanOrEqual(200))

  it('gives five layers in drawing order, each with a label and caption', () => {
    for (const w of WORDS) {
      const a = anatomy(dish(w))
      expect(a.map(l => l.name)).toEqual(['plate', 'sauce', 'main', 'crunch', 'herbs'])
      expect(a.map(l => l.label)).toEqual(['PLATE', 'SAUCE', 'MAIN', 'CRUNCH', 'HERBS & FINISH'])
      for (const l of a) expect(l.caption.trim(), `${w}: ${l.name}`).not.toBe('')
    }
  })

  it('puts every ingredient and every step in exactly one layer', () => {
    for (const w of WORDS) {
      const d = dish(w), a = anatomy(d)
      for (const i of d.ing) expect(a.filter(l => l.ingredients.includes(i)), `${w}: ${i.name}`).toHaveLength(1)
      for (const s of d.steps) expect(a.filter(l => l.steps.includes(s)), `${w}: ${s.n}`).toHaveLength(1)
      expect(a.flatMap(l => l.ingredients)).toHaveLength(d.ing.length)
      expect(a.flatMap(l => l.steps)).toHaveLength(d.steps.length)
    }
  })

  it('is deterministic', () => {
    expect(JSON.stringify(anatomy(dish('leek')))).toBe(JSON.stringify(anatomy(dish('leek'))))
  })

  it('captions the plate by shape, the main by the dish line, the sauce by name', () => {
    const d = dish('take a leek'), a = anatomy(d)
    expect(['Round plate', 'Coupe plate', 'Square plate', 'Oval platter', 'Slate', 'Shallow bowl', 'Board']).toContain(a[0].caption)
    expect(a[1].caption).toBe(d.parts.sauce)
    expect(a[2].caption).toBe(d.l1)
    expect(a[3].caption).toBe(d.parts.crunch)
    expect(a[4].caption).toContain(d.parts.herb)
    expect(a[4].caption.toLowerCase()).toContain(d.parts.finish.toLowerCase())
  })

  it('says so when there is no sauce on the plate', () => {
    const d = { ...dish('leek'), sauceStyle: 'none' as const }
    expect(anatomy(d)[1].caption).toBe('None — it’s dressed in the pan')
  })

  it('summarises a layer in one line: ingredients with grams, then step numbers', () => {
    const d = dish('take a leek'), main = anatomy(d)[2]
    const s = layerSummary(main)
    expect(s).toContain(`${main.ingredients[0].name} ${main.ingredients[0].g} g`)
    expect(s).toContain(`${main.steps[0].n} ${main.steps[0].a}`)
    expect(layerSummary(anatomy(d)[0])).toBe('What it all sits on')
  })

  it('exports the layer names', () => expect(LAYERS).toEqual(['plate', 'sauce', 'main', 'crunch', 'herbs']))
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/anatomy.test.ts`
Expected: FAIL — cannot resolve `./anatomy`.

- [ ] **Step 3: Implement** — `src/lib/anatomy.ts`:

```ts
// A dish taken apart: the five layers plate.ts draws, each with what's in it and the
// steps that make it. Pure — the Anatomy screen draws it.

import type { Dish, Ingredient, LayerName, Step } from './dish'
import type { Shape } from './look'

export interface AnatomyLayer {
  name: LayerName
  label: string
  caption: string
  ingredients: Ingredient[]
  steps: Step[]
}

/** Drawing order, bottom to top. */
export const LAYERS: readonly LayerName[] = ['plate', 'sauce', 'main', 'crunch', 'herbs']

const LABEL: Record<LayerName, string> = { plate: 'PLATE', sauce: 'SAUCE', main: 'MAIN', crunch: 'CRUNCH', herbs: 'HERBS & FINISH' }

const SHAPE: Record<Shape, string> = {
  round: 'Round plate', coupe: 'Coupe plate', square: 'Square plate', oval: 'Oval platter',
  slate: 'Slate', bowl: 'Shallow bowl', board: 'Board',
}

function caption(d: Dish, name: LayerName): string {
  switch (name) {
    case 'plate': return SHAPE[d.shape] ?? 'Plate'
    case 'sauce': return d.sauceStyle === 'none' ? 'None — it’s dressed in the pan' : d.parts.sauce
    case 'main': return d.l1
    case 'crunch': return d.parts.crunch
    case 'herbs': return `${d.parts.herb}, ${d.parts.finish.toLowerCase()} to finish`
  }
}

export function anatomy(d: Dish): AnatomyLayer[] {
  return LAYERS.map(name => ({
    name,
    label: LABEL[name],
    caption: caption(d, name),
    ingredients: d.ing.filter(i => i.layer === name),
    steps: d.steps.filter(s => s.layer === name),
  }))
}

/** One mono line for a label: "Leek 400 g · Olive oil 30 g · 01 CHAR · 02 REST". */
export function layerSummary(p: AnatomyLayer): string {
  const bits = [...p.ingredients.map(i => `${i.name} ${i.g} g`), ...p.steps.map(s => `${s.n} ${s.a}`)]
  return bits.length ? bits.join(' · ') : 'What it all sits on'
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/anatomy.test.ts` → PASS; `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/anatomy.ts src/lib/anatomy.test.ts
git commit -s -m "feat(anatomy): a dish as five captioned layers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Per-layer plate markup

**Files:**
- Modify: `src/lib/plate.ts` (`plateMarkup` at :131-151)
- Test: `src/lib/plate.test.ts` (create)

**Interfaces:**
- Produces: `export function plateLayersMarkup(look: PlateLook, mode: DrawMode): string[]` — five strings, layer *i* holds the `tn d{i}` fill group and the `dr d{i}` ink group. `plateMarkup` unchanged in output.

- [ ] **Step 1: Write the failing test** — `src/lib/plate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dish, GUIDE_WORDS } from './dish'
import { plateLayersMarkup, plateMarkup, type DrawMode } from './plate'

const MODES: DrawMode[] = [{ kind: 'static' }, { kind: 'draw' }, { kind: 'frozen', t: 2.2 }, { kind: 'smil' }]

describe('plateLayersMarkup', () => {
  it('splits the plate into five layers that join back into plateMarkup exactly', () => {
    for (const w of GUIDE_WORDS.slice(0, 50)) {
      const d = dish(w)
      for (const m of MODES) {
        const parts = plateLayersMarkup(d, m)
        expect(parts).toHaveLength(5)
        parts.forEach((p, i) => expect(p).toContain(`class="tn d${i}"`))
        expect(parts.join('')).toBe(plateMarkup(d, m))
      }
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/plate.test.ts`
Expected: FAIL — `plateLayersMarkup` is not a function / not exported.

- [ ] **Step 3: Implement** — in `src/lib/plate.ts`, rename the existing function body and add the wrapper:

```ts
/** Inner markup for a 300×270 viewBox, one string per layer: plate, sauce, main, crunch, herbs. */
export function plateLayersMarkup(look: PlateLook, mode: DrawMode): string[] {
  return layers(look).map((ly, i) => {
    // ...the existing body of plateMarkup's map callback, unchanged...
  })
}

/** Inner markup for a 300×270 viewBox. */
export function plateMarkup(look: PlateLook, mode: DrawMode): string {
  return plateLayersMarkup(look, mode).join('')
}
```

(Move the callback body verbatim: `fills`, `inks`, `k`, `op`, `off`, `shift`, `smilFill`, `smilDraw` and the returned two-`<g>` string.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/plate.test.ts` → PASS; `npm test` → all pass (share-frame and download tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/plate.ts src/lib/plate.test.ts
git commit -s -m "refactor(plate): expose the drawing one layer at a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: SEO for `/anatomy`

**Files:**
- Modify: `src/lib/seo.ts` (after `recipeSeo` at :71-80; `routeSeo` at :96-113)
- Test: `src/lib/seo.test.ts`

**Interfaces:**
- Produces: `export function anatomySeo(d: Dish): Seo`; `routeSeo('/anatomy', search, plated)`.

- [ ] **Step 1: Write the failing test** — append to `src/lib/seo.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — the title is the site default.

- [ ] **Step 3: Implement** in `src/lib/seo.ts`:

```ts
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
```

In `routeSeo`, after the `/card` line:

```ts
  if (path === '/anatomy') return anatomySeo(dish(w))
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/seo.test.ts` → PASS; `npm test` → all pass (sitemap tests unchanged — `/anatomy` is not added to `STATIC_PATHS`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -s -m "feat(seo): anatomy pages title themselves and point canonical at /plate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The exploded plate, the screen, the tab

**Files:**
- Create: `src/components/ExplodedPlate.tsx`, `src/screens/Anatomy.tsx`
- Modify: `src/App.tsx` (TABS at :13-20, imports, screen switch at :75-81), `src/screens/Home.tsx` (`plate-foot__actions` span), `src/styles.css` (append an Anatomy section before the final reduced-motion block at :542)
- Test: `src/components/ExplodedPlate.test.tsx` (create)

**Interfaces:**
- Consumes: `anatomy`, `layerSummary`, `AnatomyLayer` (Task 2); `plateLayersMarkup`, `DRAW_SECONDS` (Task 3); `StepItem` from `src/screens/Home.tsx`; `useCuisineTheme`, `useLocation`, `navigate`.
- Produces: `export function ExplodedPlate({ d }: { d: Dish })`; `export function Anatomy({ k }: { k: Kitchen })`.

- [ ] **Step 1: Write the failing test** — `src/components/ExplodedPlate.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ExplodedPlate.test.tsx`
Expected: FAIL — cannot resolve `./ExplodedPlate`.

- [ ] **Step 3: Implement the component** — `src/components/ExplodedPlate.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { anatomy, layerSummary, type AnatomyLayer } from '../lib/anatomy'
import type { Dish } from '../lib/dish'
import { DRAW_SECONDS, plateLayersMarkup } from '../lib/plate'
import { StepItem } from '../screens/Home'

// The plate's 300×270 drawing sits at x 0–300; leaders run on to x 400. y −120 leaves room
// for the top layer lifted 4 × 46; 275 for the flat, stacked plate.
const VB_TOP = -120, VB_H = 395, CY = 135, GAP_WIDE = 46
/** Where each layer's leader line starts: the plate is wider than the food on it. */
const LEAD = [287, 232, 232, 220, 220]

const prefersStill = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const v = (i: number) => ({ '--i': i }) as CSSProperties

export function ExplodedPlate({ d }: { d: Dish }) {
  const parts = useMemo(() => anatomy(d), [d])
  const [still] = useState(prefersStill)
  const markup = useMemo(() => plateLayersMarkup(d, still ? { kind: 'static' } : { kind: 'draw' }), [d, still])
  const [apart, setApart] = useState(still)
  const [drawn, setDrawn] = useState(still)
  const [picked, setPicked] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (still) return
    const t = setTimeout(() => { setDrawn(true); setApart(true) }, DRAW_SECONDS * 1000 + 300)
    return () => clearTimeout(t)
  }, [still])

  const active = picked ?? hover
  const pick = (i: number) => setPicked(p => (p === i ? null : i))

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setPicked(null); setHover(null); return }
    const i = buttons.current.findIndex(b => b === document.activeElement)
    if (i < 0) return
    const next = e.key === 'ArrowUp' ? i + 1 : e.key === 'ArrowDown' ? i - 1 : -1
    if (next >= 0 && next < parts.length) { e.preventDefault(); buttons.current[next]?.focus(); setPicked(next) }
  }

  return (
    <div
      className={'anatomy' + (still ? '' : ' draw') + (drawn ? ' is-drawn' : '') + (apart ? ' is-apart' : '') + (active != null ? ' has-pick' : '')}
      onKeyDown={onKey}
    >
      <div className="anatomy__stage" onClick={e => { if (e.target === e.currentTarget) setPicked(null) }}>
        <svg className="anatomy__svg" viewBox={`0 ${VB_TOP} 400 ${VB_H}`} role="img" aria-label={`Exploded drawing of ${d.title}, in five layers`}>
          {markup.map((m, i) => (
            // Markup is plate.ts geometry only — numbers and hex colours, never dish text.
            <g
              key={i}
              className={'anatomy__layer' + (active === i ? ' is-on' : '')}
              style={v(i)}
              onClick={() => pick(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              dangerouslySetInnerHTML={{ __html: m }}
            />
          ))}
          <g className="anatomy__leaders" aria-hidden="true">
            {parts.map((_, i) => <line key={i} x1={LEAD[i]} x2={400} y1={CY} y2={CY} style={v(i)} />)}
          </g>
          <g className="anatomy__badges" aria-hidden="true">
            {parts.map((_, i) => (
              <g key={i} style={v(i)}>
                <circle cx={14} cy={CY} r={8} />
                <text x={14} y={CY + 3.5} textAnchor="middle">{i + 1}</text>
              </g>
            ))}
          </g>
        </svg>
        <ol className="anatomy__labels">
          {parts.map((p, i) => (
            <li key={p.name} style={{ ...v(i), top: `${((CY - i * GAP_WIDE - VB_TOP) / VB_H) * 100}%` }}>
              <button
                type="button"
                ref={el => { buttons.current[i] = el }}
                className={'anatomy__label' + (active === i ? ' is-on' : '')}
                aria-pressed={picked === i}
                onClick={() => pick(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="anatomy__n">{i + 1}</span>
                <span className="anatomy__name">{p.label} — {p.caption}</span>
                <span className="anatomy__line">{layerSummary(p)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="anatomy__actions">
        <button type="button" className="btn btn--secondary" onClick={() => { setDrawn(true); setApart(a => !a) }}>
          {apart ? 'Put it back together' : 'Pull it apart'}
        </button>
      </div>
      {active != null && <LayerDetail p={parts[active]} />}
    </div>
  )
}

function LayerDetail({ p }: { p: AnatomyLayer }) {
  return (
    <section className="anatomy__detail" aria-live="polite">
      <h3 className="section-label">{p.label} · {p.caption}</h3>
      {p.ingredients.length > 0 && (
        <ul className="ingredients">
          {p.ingredients.map(i => (
            <li key={i.role + i.name}><span className="role">{i.role}</span><span>{i.name}</span><span className="grams">{i.g} g</span></li>
          ))}
        </ul>
      )}
      {p.steps.length > 0 && <ol className="steps">{p.steps.map(s => <StepItem key={s.n} {...s} />)}</ol>}
      {!p.ingredients.length && !p.steps.length && <p className="lede">{p.caption}. Everything else sits on it.</p>}
    </section>
  )
}
```

- [ ] **Step 4: Run the test** — `npx vitest run src/components/ExplodedPlate.test.tsx` → PASS.

- [ ] **Step 5: The screen** — `src/screens/Anatomy.tsx`:

```tsx
import { useMemo } from 'react'
import type { Kitchen } from '../App'
import { ExplodedPlate } from '../components/ExplodedPlate'
import { useCuisineTheme } from '../lib/cuisine-theme'
import { dish } from '../lib/dish'
import { useLocation } from '../lib/router'

/** A dish taken apart, layer by layer. */
export function Anatomy({ k }: { k: Kitchen }) {
  const { search } = useLocation()
  const word = new URLSearchParams(search).get('w')?.trim() || k.plated
  const d = useMemo(() => dish(word), [word])
  useCuisineTheme(d.cu)
  return (
    <main className="screen">
      <div className="eyebrow">ANATOMY · {d.cu.toUpperCase()} · NO. {d.no}</div>
      <h1 className="display">Anatomy of a plate.</h1>
      <h2 className="display display--h2">{d.title}</h2>
      <p className="lede">Five layers, in the order they go down. Tap one to see what’s in it and how it’s made.</p>
      <ExplodedPlate key={word} d={d} />
    </main>
  )
}
```

- [ ] **Step 6: Wire it in.** `src/App.tsx`: `import { Anatomy } from './screens/Anatomy'`; add `['/anatomy', 'Anatomy'],` to `TABS` directly after `['/card', 'Card'],`; in the screen switch, after the `/card` line add `else if (path === '/anatomy') screen = <Anatomy k={k} />`. `src/screens/Home.tsx`: inside `<span className="plate-foot__actions">`, before the Replay button, add:

```tsx
              <button type="button" className="btn btn--ghost" onClick={() => navigate('/anatomy?w=' + encodeURIComponent(k.plated))}>See its anatomy</button>
```

- [ ] **Step 7: Styles** — append to `src/styles.css`, before the reduced-motion block at the end:

```css
/* ---- Anatomy ---- */
.anatomy { --gap: 46px; margin-top: 24px; }
.anatomy__stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 16rem);
  padding: 16px;
  background: #fbf6ea;
  border: 1px solid #d9cdb3;
  box-shadow: 0 1px 0 #fff8, 0 10px 30px -12px #0006;
  color: #3a2418;
}
.anatomy__svg { width: 100%; display: block; overflow: visible; }
.anatomy__layer {
  cursor: pointer;
  transform-box: view-box;
  transform-origin: 150px 135px;
  transition: transform 1.2s cubic-bezier(.3, .7, .2, 1), opacity .25s;
  transition-delay: calc((4 - var(--i)) * 120ms), 0s;
}
.is-apart .anatomy__layer { transform: translateY(calc(var(--i) * var(--gap) * -1)) scaleY(.5); }
.is-drawn .anatomy__layer .dr { stroke-dasharray: none; }
.is-apart .anatomy__layer path { vector-effect: non-scaling-stroke; }
.anatomy__leaders line, .anatomy__badges g {
  transform-box: view-box;
  transform: translateY(calc(var(--i) * var(--gap) * -1));
  opacity: 0;
  transition: opacity .4s;
}
.anatomy__leaders line { stroke: #3a2418; stroke-width: .8; stroke-dasharray: 3 3; }
.anatomy__badges circle { fill: #fbf6ea; stroke: #3a2418; stroke-width: .8; }
.anatomy__badges text { font: 500 9px var(--mono); fill: #3a2418; }
.is-apart .anatomy__leaders line, .is-apart .anatomy__badges g { opacity: 1; transition-delay: calc(1.2s + var(--i) * 100ms); }
.anatomy__labels { position: relative; list-style: none; margin: 0; padding: 0; }
.anatomy__labels li { position: absolute; left: 0; right: 0; transform: translateY(-50%); opacity: 0; visibility: hidden; transition: opacity .4s, visibility 0s .4s; }
.is-apart .anatomy__labels li { opacity: 1; visibility: visible; transition: opacity .4s calc(1.2s + var(--i) * 100ms), visibility 0s; }
.anatomy__label {
  all: unset;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 8px;
  width: 100%;
  cursor: pointer;
  transition: opacity .25s;
}
.anatomy__label:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.anatomy__n {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font: 500 10px var(--mono);
}
.anatomy__name { font: 500 11px var(--mono); letter-spacing: .12em; text-transform: uppercase; }
.anatomy__line { font: 400 10px/1.4 var(--mono); color: #6e5a4c; }
.has-pick .anatomy__layer:not(.is-on), .has-pick .anatomy__label:not(.is-on) { opacity: .3; }
.anatomy__actions { display: flex; justify-content: center; margin-top: 16px; }
.anatomy__detail { margin-top: 16px; }
@media (max-width: 719px) {
  .anatomy { --gap: 34px; }
  .anatomy__stage { grid-template-columns: minmax(0, 1fr); }
  .anatomy__leaders { display: none; }
  .anatomy__labels { display: flex; flex-direction: column-reverse; gap: 10px; margin-top: 12px; }
  .anatomy__labels li { position: static; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .anatomy__layer, .anatomy__labels li, .anatomy__leaders line, .anatomy__badges g { transition: none !important; }
}
```

- [ ] **Step 8: Run everything**

Run: `npm test` → all pass; `npm run build` → succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/ExplodedPlate.tsx src/components/ExplodedPlate.test.tsx src/screens/Anatomy.tsx src/App.tsx src/screens/Home.tsx src/styles.css
git commit -s -m "feat(anatomy): the plate draws, then lifts apart into five labelled layers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Browser check, screenshots, PR

**Files:**
- Create: `docs/screens/anatomy-desktop.png`, `docs/screens/anatomy-phone.png`

- [ ] **Step 1: Run it locally** — `npm run dev` (background), open `http://localhost:5173/anatomy?w=leek` in a browser (Playwright MCP or Chrome tools).

- [ ] **Step 2: Check, at 1280 × 900 and at 375 × 812, writing down what you see for each:**
  1. The pen draws the flat plate, then the layers tilt and lift top-first, then five labels appear (desktop: right column with dashed leaders; phone: a numbered list under the drawing, herbs on top, leaders hidden).
  2. Clicking the MAIN label (and, separately, the main layer in the drawing) leaves it dark, dims the rest, and shows a panel with its ingredients and steps; clicking it again or pressing Escape clears it.
  3. `Put it back together` restacks the plate flat; `Pull it apart` lifts it again. Clicking it twice fast ends in the state the button names.
  4. Clicking a layer while it's still lifting still selects it.
  5. With reduced motion emulated, the page opens already apart and labelled.
  6. From `/plate?w=fig`, `See its anatomy` opens fig's anatomy and the drawing replays; the browser Back button returns to the plate.
  7. At 375 px there is no horizontal scroll (`document.documentElement.scrollWidth <= 375`).
  8. Words `A & B <c>` and `naïve café` render with readable captions.
  Any failure: fix it (test first where the behaviour is unit-testable), re-run `npm test` and `npm run build`, commit, and re-check.

- [ ] **Step 3: Screenshots** — exploded view with MAIN selected, saved to `docs/screens/anatomy-desktop.png` (1280 wide) and `docs/screens/anatomy-phone.png` (375 wide). Commit:

```bash
git add docs/screens/anatomy-desktop.png docs/screens/anatomy-phone.png
git commit -s -m "docs: anatomy screenshots, desktop and phone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Push and open the PR** (never merge — that's the owner's call):

```bash
git push -u origin feat/anatomy
gh pr create --base main --head feat/anatomy --title "Dish anatomy: the plate, taken apart layer by layer" --body-file <file>
```

The body: what it does (one paragraph), the eight checks from Step 2 with results, the two screenshots linked as `https://github.com/futurechef/codingcuisine.dev/blob/feat/anatomy/docs/screens/anatomy-desktop.png` and `…-phone.png`, and the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Wait for the PR's preview-channel deploy and confirm `/anatomy?w=leek` loads there.
