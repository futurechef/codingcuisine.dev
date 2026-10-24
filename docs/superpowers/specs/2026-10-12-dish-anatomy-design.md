# Dish anatomy: design

**Status:** approved in conversation on 2026-10-12; this written spec is awaiting review.
**Goal:** every Platedraw dish gets an **Anatomy** view: its plate drawn as today, then pulled
apart into a tilted, exploded stack of layers, each labelled with what's in it and the step
that makes it. Inspired by the "anatomy" agent skill (isometric exploded illustrations of
machines), applied to a plate.

Out of scope: the share video, a printable anatomy, real 3D/WebGL, an agent-skill package.

## Decisions (from the owner)

- **A page on the site**, not an agent skill. Built from Platedraw's own drawing code.
- **Look:** tilted isometric stack, hand-drawn strokes kept, leader lines to labels.
- **Interaction:** the pen draws the stacked plate, then it explodes; tap/hover a layer for
  detail; a button puts it back together.

## 1. Route and SEO

- **Route:** `/anatomy?w=<word>`; a new **Anatomy** nav tab after Card. The seed word works
  exactly as on `/plate` and `/card` (the same `k`/word plumbing in `App.tsx`).
- **SEO** (`routeSeo` in `src/lib/seo.ts`): title `Anatomy of <dish title> · Platedraw`,
  description `<desc>` plus "Layer by layer: what's in it and how it's made.", canonical is the
  dish's `/plate?w=` URL (one canonical recipe page), no Recipe JSON-LD, not in the sitemap.

## 2. Data: which layer owns what

Five layers, in `plate.ts` drawing order: `plate`, `sauce`, `main`, `crunch`, `herbs`.

- **`dish.ts`:** `Ingredient` and `Step` gain an optional `layer?: LayerName`, set where they
  are built (nothing else that reads a dish changes):
  - **Base, Fat** → `main`; **sauce rows** (whatever their role, including Acid) → `sauce`;
    **Crunch** → `crunch`; **Herb**, the separate **Acid** finish and **Heat** → `herbs`.
  - **Technique steps** (`T.steps`) → `main`; **the sauce step** → `sauce`; **ASSEMBLE** → `herbs`.
  - When duplicate rows merge (cooking fat == sauce oil), the merged row keeps the layer of
    the row that survives.
- **`src/lib/anatomy.ts`** (pure, no DOM): `anatomy(d: Dish): AnatomyLayer[]`, five entries in
  drawing order:
  ```ts
  interface AnatomyLayer {
    name: LayerName            // 'plate' | 'sauce' | 'main' | 'crunch' | 'herbs'
    label: string              // 'PLATE' | 'SAUCE' | 'MAIN' | 'CRUNCH' | 'HERBS & FINISH'
    caption: string            // one line, e.g. 'Spinach cake' / 'Coupe plate' / 'Brown butter'
    ingredients: Ingredient[]  // may be empty (plate)
    steps: Step[]              // may be empty
  }
  ```
  - **Plate:** caption is the shape in words (`Coupe plate`, `Slate`, `Board`…), no ingredients.
  - **Sauce with style `none`:** caption `None — it's dressed in the pan`; its rows still list.
  - **Herbs:** always present; with no herb ingredient its caption names the finish.

## 3. Drawing: `src/lib/plate.ts` + `src/components/Anatomy.tsx`

- **`plate.ts`** gains `plateLayersMarkup(look, mode): string[]` — the existing per-layer SVG
  markup (one string per layer, same `DrawMode`s as `plateMarkup`), so the anatomy view reuses
  the exact strokes. `plateMarkup` becomes `plateLayersMarkup(...).join('')` (no visual change).
- **Tilt:** each layer group gets `transform="matrix(1 0 0 0.5 0 <ty>)"` about the plate
  centre, with `vector-effect: non-scaling-stroke` on its strokes so the ink keeps its width.
  The plate layer also gets a thin rim edge: the lower half of its outline offset down 6 px.
- **Explode:** layer *i* (0 = plate) moves up by `i × GAP` (GAP ≈ 46 px in plate units at
  desktop, 34 at phone), plate stays put. Exploded viewBox is tall enough for all five.
- **Sequence:** stacked plate draws exactly as on `/plate` (`DRAW_SECONDS` 3.9 s, flat, not
  tilted), then over 1.2 s it tilts and the layers lift, top layer first, 120 ms stagger
  (CSS transforms on the groups); then each label writes in (dashed leader line draws, text
  fades) 100 ms apart.
- **Labels:** wide screens (≥ 720 px): to the right, a dashed leader from each layer's right
  edge to `LABEL — caption`, then a second mono line: ingredients with grams and step numbers,
  e.g. `Spinach 220 g · Olive oil 30 g · 03 SEAR`. Narrow screens: no leaders; a numbered list
  under the diagram, same content, numbers matched by small badges on the layers.
- **Select a layer:** tap/click/hover a layer or its label (and keyboard: labels are buttons,
  arrow keys move between them). The selected layer and label stay full ink, others go to
  30% opacity; a detail panel under the diagram shows its ingredients (name, grams, role tag)
  and each step's number, action, text and "look for" cue (`StepItem`). Escape or tapping
  empty space clears it.
- **Put it back together / Pull it apart:** one toggle button; the same 1.2 s motion reversed.
- **Reduced motion:** opens already exploded and labelled; the toggle switches without motion.
- **Colours:** fills and ink follow the dish's cuisine colour world, as `/plate` does.

## 4. Testing

- **Unit (vitest), `anatomy.test.ts`, over 200 generated dishes:**
  - every ingredient and every step of the dish appears in exactly one layer;
  - five layers in drawing order, every caption non-empty;
  - deterministic: same word → same result;
  - a `none`-style sauce gets the "dressed in the pan" caption; a dish without a herb still
    has a captioned herbs layer.
- **Unit, `plate.test`/existing:** `plateLayersMarkup(look, m).join('') === plateMarkup(look, m)`
  for 50 looks (the refactor changes nothing on `/plate`).
- **Unit:** `routeSeo('/anatomy', '?w=leek', …)` gives the title, description and the `/plate`
  canonical.
- **Browser (checked by hand on the PR's preview channel; the repo has no Playwright suite
  and this feature doesn't add one):** `/anatomy?w=leek` at desktop and phone, with and
  without reduced motion: five layer groups and five labels; clicking the MAIN label dims the
  others and shows the panel; screenshots of both sizes go in the PR.
