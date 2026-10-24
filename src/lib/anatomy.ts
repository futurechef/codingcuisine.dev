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
