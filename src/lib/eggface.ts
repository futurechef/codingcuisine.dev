// Easter egg: type "Eggface" and you get the character from Eggface Music Land
// (the game whose song spells E G G F A C E) as a French classic, an omelette aux
// fines herbes, with its face drawn in chives. Hand-written, so the same every time.

import type { Dish } from './dish'

export const EGGFACE_APP = 'https://apps.apple.com/us/app/eggface-music-land/id6817093907'
export const COMPUTERDRAW_APP = 'https://apps.apple.com/us/app/computerdraw/id6782483424'

/** "Eggface", however it's typed: any case, with a space or hyphen in the middle. */
export function isEggface(word: string): boolean {
  return /^egg[\s-]?face$/i.test(word.trim())
}

const HERB = '#5f8f3a'

export function eggfaceDish(): Dish {
  return {
    seed: 'Eggface', no: 7, cu: 'French', produce: 'eggs', named: true, easter: 'eggface',
    // the plate
    shape: 'round', kind: 'omelette', sauce: '#f2dc96', main: '#f3d36b', sauceStyle: 'pool',
    crunch: '#7aa64a', herb: HERB, garnish: ['face'],
    // the recipe
    l1: 'Omelette', l2: 'aux fines herbes',
    title: 'Omelette aux fines herbes',
    desc: 'Soft, pale and barely set, rolled in butter, with a face in chives.',
    meta: 'PLATEDRAW · NO. 7 · FRENCH',
    eyebrow: 'RECIPE · FRENCH · SERVES 1',
    chips: ['Prep 5 min', 'Cook 3 min', 'Serves 1'],
    r: [1, 2, 0, 0, 3, 0],
    ing: [
      { role: 'Base', name: 'Eggs', g: 180, layer: 'main' },
      { role: 'Fat', name: 'Butter', g: 15, layer: 'sauce' },
      { role: 'Herb', name: 'Chives', g: 4, layer: 'herbs' },
      { role: 'Herb', name: 'Chervil', g: 2, layer: 'crunch' },
      { role: 'Herb', name: 'Parsley', g: 2, layer: 'crunch' },
      { role: 'Herb', name: 'Tarragon', g: 1, layer: 'crunch' },
      { role: 'Salt', name: 'Salt and white pepper', g: 1, layer: 'herbs' },
    ],
    steps: [
      { n: '01', a: 'BEAT', t: 'Beat three eggs with salt, pepper and most of the chopped chervil, parsley and tarragon until just smooth, no froth.', l: 'one even yellow, no streaks of white', layer: 'main' },
      { n: '02', a: 'STIR', t: 'Melt the butter in a small pan over medium heat until it foams, pour in the eggs and stir fast with a fork while shaking the pan.', l: 'small soft curds, still glossy and loose on top', layer: 'sauce' },
      { n: '03', a: 'ROLL', t: 'Tilt the pan, roll the omelette over itself and tip it seam-down onto a warm plate. Rub with a little butter, then lay the chives on top as a face: two brows, a nose, a smile, and a crack of pepper for the eyes.', l: 'pale gold, no brown, smiling back at you', layer: 'herbs' },
    ],
    parts: { sauce: 'Butter', crunch: 'Fines herbes', herb: 'Chives', finish: 'White pepper' },
    short: ['Beat, don’t froth', 'Stir fast, shake the pan', 'Roll, then the face'],
  }
}
