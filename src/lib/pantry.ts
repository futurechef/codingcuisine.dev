// The pantry: everything the generator composes dishes from.
// Flavour vectors are [sweet, salty, sour, bitter, umami, heat], roughly 0–3 each.

import type { Garnish, Kind, SauceStyle, Shape } from './look'

export type F = [number, number, number, number, number, number]
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Form = 'long' | 'round' | 'slab' | 'small' | 'leafy' | 'slice'

// ---- Techniques ---------------------------------------------------------------

export interface Technique {
  id: string
  /** Dish name for the main, e.g. x => 'Charred leek'. */
  title: (x: string) => string
  /** [VERB, instruction (use {x}), look for]. Some techniques take two steps. */
  steps: [string, string, string][]
  /** One line for the postcard. */
  q: string
  texture: string
  prep: number
  cook: number
  f: F
  /** Arrangements by ingredient form. */
  kinds: Partial<Record<Form, Kind[]>>
  fat?: [string, number]
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export const TECHNIQUES: Record<string, Technique> = {
  charred: {
    id: 'charred', title: x => 'Charred ' + x, texture: 'Blistered edges', prep: 10, cook: 15, f: [0, 0, 0, 2, 1, 0],
    steps: [['CHAR', 'Char the {x} in a very hot, dry pan (cut-side down, if it has one), pressing so it colours evenly.', 'a dark, almost black edge']],
    q: 'Char it hard in a dry pan.', kinds: { long: ['logs'], round: ['pile'], slab: ['stack', 'slices'], slice: ['fan'], leafy: ['torn'], small: ['scatter'] },
  },
  roast: {
    id: 'roast', title: x => 'Roast ' + x, texture: 'Caramelised edges', prep: 10, cook: 30, f: [2, 0, 0, 0, 1, 0],
    steps: [['ROAST', 'Toss the {x} with oil and salt and roast at 220°C, turning once.', 'deep gold, soft centres']],
    q: 'Roast hot until the edges catch.', kinds: { long: ['logs'], round: ['pile'], slab: ['stack'], slice: ['fan'], small: ['scatter'], leafy: ['torn'] },
  },
  'brown-butter': {
    id: 'brown-butter', title: x => cap(x) + ' in brown butter', texture: 'Nutty and glossy', prep: 10, cook: 15, f: [1, 1, 0, 0, 2, 0], fat: ['Butter', 50],
    steps: [['BASTE', 'Cook the {x} in foaming butter, spooning it over until it smells of toast.', 'amber flecks and a hazelnut smell']],
    q: 'Baste in butter until it smells of toast.', kinds: { long: ['logs'], round: ['pile'], slab: ['slices'], slice: ['slices'], small: ['scatter'], leafy: ['torn'] },
  },
  shaved: {
    id: 'shaved', title: x => 'Shaved ' + x, texture: 'Crisp and cold', prep: 15, cook: 0, f: [1, 0, 1, 1, 0, 0],
    steps: [['SHAVE', 'Shave the {x} paper-thin on a mandoline or with a peeler and toss with salt and a little acid.', 'slices that curl and turn translucent']],
    q: 'Shave it thin and dress it cold.', kinds: { round: ['slices'], slice: ['slices', 'fan'], leafy: ['torn'], long: ['slices'], slab: ['slices'], small: ['scatter'] },
  },
  pickled: {
    id: 'pickled', title: x => 'Quick-pickled ' + x, texture: 'Sharp and snappy', prep: 25, cook: 5, f: [1, 1, 3, 0, 0, 0],
    steps: [['PICKLE', 'Slice the {x} if large, then pour over hot vinegar, sugar and salt. Leave for 20 minutes.', 'bright, slightly softened']],
    q: 'Pickle it fast in hot vinegar.', kinds: { round: ['slices'], slice: ['fan'], long: ['logs'], small: ['scatter'], slab: ['slices'], leafy: ['torn'] },
  },
  braised: {
    id: 'braised', title: x => 'Braised ' + x, texture: 'Soft and savoury', prep: 10, cook: 35, f: [1, 1, 0, 0, 2, 0],
    steps: [
      ['BROWN', 'Brown the {x} well in a wide pan.', 'colour on every flat side'],
      ['BRAISE', 'Add stock to come halfway up, cover and simmer until tender.', 'a knife slides in with no resistance'],
    ],
    q: 'Brown it, then braise it soft.', kinds: { long: ['logs'], round: ['pile'], slab: ['stack'], small: ['pile'], leafy: ['torn'], slice: ['stack'] },
  },
  grilled: {
    id: 'grilled', title: x => 'Grilled ' + x, texture: 'Smoky stripes', prep: 10, cook: 12, f: [1, 0, 0, 2, 1, 0],
    steps: [['GRILL', 'Grill the {x} over a high heat, turning, until well marked and just cooked through.', 'dark bars and a little smoke']],
    q: 'Grill it over a hard heat.', kinds: { long: ['logs'], round: ['fan'], slab: ['slices'], slice: ['fan'], leafy: ['torn'], small: ['scatter'] },
  },
  confit: {
    id: 'confit', title: x => 'Confit ' + x, texture: 'Silky and slow-cooked', prep: 10, cook: 45, f: [2, 0, 0, 0, 1, 0], fat: ['Olive oil', 150],
    steps: [['CONFIT', 'Cover the {x} in olive oil and cook at a bare simmer until meltingly soft.', 'soft enough to crush with a spoon']],
    q: 'Cook it slowly under oil.', kinds: { long: ['logs'], round: ['pile'], slab: ['stack'], small: ['pile'], slice: ['pile'], leafy: ['torn'] },
  },
  whipped: {
    id: 'whipped', title: x => 'Whipped ' + x, texture: 'Velvety', prep: 10, cook: 40, f: [2, 1, 0, 0, 2, 0], fat: ['Butter', 60],
    steps: [
      ['COOK', 'Roast or simmer the {x} until completely soft.', 'it crushes under a spoon'],
      ['BLEND', 'Blend hot with the butter and a pinch of salt until completely smooth.', 'a purée that holds a spoon line'],
    ],
    q: 'Roast it soft, blend it smooth.', kinds: { long: ['quenelle'], round: ['quenelle'], slab: ['quenelle'], small: ['quenelle'], slice: ['quenelle'], leafy: ['quenelle'] },
  },
  crisp: {
    id: 'crisp', title: x => 'Crisp ' + x, texture: 'Crackling', prep: 15, cook: 10, f: [0, 2, 0, 0, 1, 0], fat: ['Neutral oil', 200],
    steps: [['FRY', 'Toss the {x} in cornflour and shallow-fry until golden. Drain and salt straight away.', 'golden and shatter-crisp']],
    q: 'Dust in cornflour and fry crisp.', kinds: { small: ['scatter'], round: ['pile'], slab: ['stack'], slice: ['scatter'], long: ['logs'], leafy: ['torn'] },
  },
  glazed: {
    id: 'glazed', title: x => 'Glazed ' + x, texture: 'Sticky and lacquered', prep: 10, cook: 30, f: [3, 1, 0, 0, 1, 0],
    steps: [
      ['ROAST', 'Roast the {x} at 200°C until nearly tender.', 'just giving at the centre'],
      ['GLAZE', 'Brush with honey, soy and butter and roast 5 minutes more, twice.', 'lacquered, sticky edges'],
    ],
    q: 'Roast, then lacquer twice.', kinds: { long: ['logs'], round: ['pile'], slab: ['stack'], slice: ['fan'], small: ['scatter'], leafy: ['torn'] },
  },
  steamed: {
    id: 'steamed', title: x => 'Steamed ' + x, texture: 'Tender and bright', prep: 10, cook: 10, f: [1, 0, 0, 0, 0, 0],
    steps: [['STEAM', 'Steam the {x} until just tender, then dress while still warm.', 'bright colour and a gentle bite']],
    q: 'Steam it and dress it warm.', kinds: { long: ['logs'], round: ['pile'], leafy: ['torn'], small: ['pile'], slab: ['stack'], slice: ['fan'] },
  },
  'salt-baked': {
    id: 'salt-baked', title: x => 'Salt-baked ' + x, texture: 'Dense and seasoned through', prep: 15, cook: 60, f: [2, 2, 0, 0, 1, 0],
    steps: [
      ['ENCASE', 'Mix salt with egg white and pack it round the {x}.', 'a crust with no gaps'],
      ['BAKE', 'Bake at 190°C, crack the crust open and carve into wedges or thick slices.', 'a knife meets no resistance'],
    ],
    q: 'Bake it in a salt crust.', kinds: { round: ['slices'], slab: ['stack'], long: ['logs'] },
  },
  // -- greens, salads, eggs, cheese
  wilted: {
    id: 'wilted', title: x => 'Wilted ' + x, texture: 'Silky and just collapsed', prep: 5, cook: 5, f: [0, 1, 0, 1, 1, 0],
    steps: [['WILT', 'Toss the {x} in a hot pan with a little oil and a sliced garlic clove until it just collapses. Season and tip off any liquid.', 'glossy, still bright green']],
    q: 'Wilt it fast with garlic.', kinds: { leafy: ['torn', 'pile'], long: ['logs'], small: ['pile'], round: ['pile'], slab: ['stack'], slice: ['pile'] },
  },
  dressed: {
    id: 'dressed', title: x => 'Dressed ' + x, texture: 'Raw, cold and lively', prep: 15, cook: 0, f: [1, 1, 1, 0, 0, 0],
    steps: [['DRESS', 'Cut the {x} into generous pieces if needed and season with flaky salt and a little oil at the last moment.', 'glossy, never wet or wilted']],
    q: 'Season it raw at the last minute.', kinds: { leafy: ['torn'], slice: ['fan', 'slices'], round: ['slices', 'pile'], small: ['scatter'], slab: ['slices'], long: ['logs'] },
  },
  torn: {
    id: 'torn', title: x => 'Torn ' + x, texture: 'Milky and soft', prep: 5, cook: 0, f: [1, 1, 0, 0, 1, 0],
    steps: [['TEAR', 'Bring the {x} to room temperature, then tear it into rough pieces and season with flaky salt and black pepper.', 'creamy, ragged edges']],
    q: 'Tear it open at room temperature.', kinds: { round: ['torn'], slab: ['torn'], small: ['scatter'], leafy: ['torn'], slice: ['torn'], long: ['torn'] },
  },
  baked: {
    id: 'baked', title: x => 'Baked ' + x, texture: 'Hot, soft and golden-edged', prep: 5, cook: 20, f: [0, 1, 0, 0, 1, 0],
    steps: [['BAKE', 'Set the {x} in a small oiled dish, trickle over more oil and bake at 200°C until soft and golden at the edges.', 'golden edges and a soft, wobbling centre']],
    q: 'Bake it hot until it slumps.', kinds: { slab: ['stack', 'slices'], round: ['pile'], small: ['pile'], slice: ['fan'], long: ['logs'], leafy: ['torn'] },
  },
  jammy: {
    id: 'jammy', title: x => 'Jammy ' + x, texture: 'Soft-set yolks', prep: 5, cook: 7, f: [0, 1, 0, 0, 2, 0],
    steps: [
      ['BOIL', 'Lower the {x} into boiling water for 6½ minutes, then straight into iced water.', 'set whites, yolks still jammy'],
      ['PEEL', 'Peel carefully, season with flaky salt and halve just before plating.', 'deep orange, barely holding']
    ],
    q: 'Six and a half minutes, then ice.', kinds: { round: ['pile', 'fan'], small: ['pile'], slab: ['slices'], slice: ['fan'], long: ['logs'], leafy: ['torn'] },
  },
  fried: {
    id: 'fried', title: x => 'Fried ' + x, texture: 'Lacy, crisp edges', prep: 5, cook: 8, f: [0, 2, 0, 0, 1, 0], fat: ['Olive oil', 80],
    steps: [['FRY', 'Fry the {x} in a generous film of very hot oil, spooning it over, until crisp and golden at the edges. Salt straight away.', 'deep golden, crisp at the edges']],
    q: 'Fry it hot, spooning the oil over.', kinds: { round: ['pile'], slab: ['stack', 'slices'], long: ['logs'], slice: ['fan'], small: ['scatter'], leafy: ['torn'] },
  },
  seared: {
    id: 'seared', title: x => 'Seared ' + x, texture: 'Deep golden crust', prep: 10, cook: 12, f: [1, 1, 0, 1, 2, 0],
    steps: [['SEAR', 'Sear the {x} in a very hot pan with a little oil, without moving it, until a deep crust forms. Turn and baste with a knob of butter.', 'a mahogany crust on both sides']],
    q: 'Sear hard, then baste.', kinds: { slab: ['stack', 'slices'], long: ['logs'], round: ['pile', 'slices'], small: ['scatter'], slice: ['fan'], leafy: ['torn'] },
  },
  'wok-fried': {
    id: 'wok-fried', title: x => 'Wok-fried ' + x, texture: 'Smoky and just tender', prep: 10, cook: 5, f: [0, 1, 0, 1, 1, 0], fat: ['Neutral oil', 30],
    steps: [['TOSS', 'Get a wok smoking hot, add the oil, garlic and ginger, then the {x}. Keep it moving until it catches at the edges.', 'charred spots, still with bite']],
    q: 'Keep it moving in a smoking wok.', kinds: { long: ['logs'], leafy: ['torn'], slab: ['stack', 'slices'], small: ['scatter'], round: ['pile'], slice: ['fan'] },
  },
  // -- grains, pulses, noodles, bread
  simmered: {
    id: 'simmered', title: x => 'Brothy ' + x, texture: 'Creamy and brothy', prep: 10, cook: 40, f: [0, 1, 0, 0, 2, 0],
    steps: [['SIMMER', 'Simmer the {x} gently with a halved garlic head, a bay leaf and water to cover by 3cm until creamy-tender. Salt them near the end.', 'whole skins, creamy insides, a lightly thickened broth']],
    q: 'Simmer slowly, salt late.', kinds: { small: ['pile'], round: ['pile'], long: ['pile'], slab: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  'warm-salad': {
    id: 'warm-salad', title: x => 'Warm salad of ' + x, texture: 'Nutty, with a chew', prep: 10, cook: 30, f: [1, 1, 0, 0, 1, 0],
    steps: [
      ['SIMMER', 'Simmer the {x} in plenty of well-salted water until tender but still with a chew, then drain.', 'tender, with a little bite'],
      ['DRESS', 'Toss it while still warm with a splash of oil and salt so it drinks in the seasoning.', 'glossy, every grain coated'],
    ],
    q: 'Dress it warm so it drinks it in.', kinds: { small: ['pile', 'scatter'], round: ['pile'], long: ['pile'], slab: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  risotto: {
    id: 'risotto', title: x => (x.includes('risotto') ? 'Risotto' : cap(x) + ' risotto'), texture: 'Loose and creamy', prep: 10, cook: 25, f: [0, 2, 0, 0, 2, 0], fat: ['Butter', 50],
    steps: [
      ['TOAST', 'Sweat a finely chopped shallot in half the butter, add the {x} and toast for a minute, then add a splash of white wine.', 'grains turning translucent at the edges'],
      ['STIR', 'Add hot vegetable stock a ladle at a time, stirring, until just tender. Off the heat, beat in the rest of the butter and a little vegetarian hard cheese.', 'it flows in a slow wave'],
    ],
    q: 'Ladle, stir, then beat in butter.', kinds: { small: ['pile'], round: ['pile'], long: ['pile'], slab: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  soft: {
    id: 'soft', title: x => 'Soft ' + x, texture: 'Spoonable and rich', prep: 5, cook: 40, f: [1, 1, 0, 0, 1, 0], fat: ['Butter', 40],
    steps: [
      ['COOK', 'Whisk the {x} into simmering salted water and cook low for 40 minutes, stirring often.', 'it pulls away from the pan'],
      ['ENRICH', 'Beat in the butter and season well. It should only just hold its shape.', 'glossy and spoonable'],
    ],
    q: 'Cook it low and long, then enrich.', kinds: { slab: ['pile'], small: ['pile'], round: ['pile'], long: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  tossed: {
    id: 'tossed', title: x => cap(x), texture: 'Glossy and clinging', prep: 5, cook: 12, f: [0, 1, 0, 0, 1, 0],
    steps: [
      ['BOIL', 'Boil the {x} in well-salted water until just shy of done, saving a mug of the cooking water.', 'a little bite at the centre'],
      ['TOSS', 'Toss it hard in a wide pan with the fat and a splash of the cooking water until glossy.', 'a sauce that clings, not pools'],
    ],
    q: 'Toss hard with the cooking water.', kinds: { long: ['pile'], small: ['pile', 'scatter'], round: ['pile'], slab: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  cold: {
    id: 'cold', title: x => 'Cold ' + x, texture: 'Springy and cold', prep: 10, cook: 6, f: [0, 1, 0, 0, 1, 0],
    steps: [
      ['BOIL', 'Cook the {x} in plenty of boiling water, then rinse under cold water, rubbing off the starch.', 'springy and cold to the touch'],
      ['TOSS', 'Drain well and toss with a few drops of oil so the strands stay loose.', 'separate, glossy strands'],
    ],
    q: 'Cook, rinse cold, keep loose.', kinds: { long: ['pile'], small: ['pile'], round: ['pile'], slab: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  'stir-fried': {
    id: 'stir-fried', title: x => (x === 'rice' ? 'Fried rice' : 'Stir-fried ' + x), texture: 'Toasty, with crisp bits', prep: 10, cook: 10, f: [0, 2, 0, 0, 2, 0], fat: ['Neutral oil', 30],
    steps: [
      ['COOK', 'Cook the {x} ahead, drain or spread it on a tray and let it steam dry and cool.', 'dry, separate grains or strands'],
      ['FRY', 'Fry it hard in a smoking wok with the oil, garlic and spring onion, pressing it against the pan.', 'toasty, slightly caught bits'],
    ],
    q: 'Cook ahead, then fry it hard.', kinds: { long: ['pile'], small: ['pile'], round: ['pile'], slab: ['pile'], slice: ['pile'], leafy: ['pile'] },
  },
  toasted: {
    id: 'toasted', title: x => 'Toasted ' + x, texture: 'Crunchy crust, soft middle', prep: 5, cook: 6, f: [0, 1, 0, 1, 1, 0], fat: ['Olive oil', 40],
    steps: [['TOAST', 'Cut the {x} into thick slices, brush with oil and toast in a hot griddle pan until charred at the edges. Rub with a cut garlic clove.', 'dark edges, still soft in the middle']],
    q: 'Griddle it thick, rub with garlic.', kinds: { slab: ['slices', 'stack'], long: ['logs'], round: ['slices'], slice: ['fan'], small: ['scatter'], leafy: ['torn'] },
  },
}

// ---- Ingredients --------------------------------------------------------------

export interface Ingredient {
  n: string
  /** Extra words that should find this ingredient. */
  alias?: string[]
  form: Form
  colour: string
  g: number
  tech: string[]
  seasons: Season[]
  f: F
}

const ALL: Season[] = ['spring', 'summer', 'autumn', 'winter']
const I = (n: string, form: Form, colour: string, g: number, tech: string, seasons: Season[] | 'all', f: F, alias?: string[]): Ingredient =>
  ({ n, form, colour, g, tech: tech.split(' '), seasons: seasons === 'all' ? ALL : seasons, f, alias })

const SP: Season = 'spring', SU: Season = 'summer', AU: Season = 'autumn', WI: Season = 'winter'

/**
 * Foods whose look doesn't follow the technique's default arrangement:
 * noodles twirl into a nest, grains heap into a mound, creamy grains get a spoon swirl,
 * eggs are fried or halved. A string applies to every technique; a map picks per technique.
 */
const KIND_OVERRIDES: Record<string, Kind | Partial<Record<string, Kind>>> = {
  'soba noodles': 'nest', 'udon noodles': 'nest', 'rice noodles': 'nest', 'egg noodles': 'nest', pasta: 'nest',
  rice: 'mound', 'wild rice': 'mound', quinoa: 'mound', bulgur: 'mound', couscous: 'mound', 'giant couscous': 'mound', freekeh: 'mound',
  farro: { risotto: 'swirl', default: 'mound' }, 'pearl barley': { risotto: 'swirl', default: 'mound' },
  'risotto rice': 'swirl',
  polenta: { soft: 'swirl' },
  eggs: { fried: 'egg', jammy: 'halves' },
}

/** The arrangement an ingredient insists on for a technique, if any. */
export function overrideKind(ingredient: string, tech: string): Kind | undefined {
  const o = KIND_OVERRIDES[ingredient]
  if (!o) return undefined
  return typeof o === 'string' ? o : o[tech] ?? o.default
}

/** Sweet fruit: kept away from strongly savoury or very hot sauces. */
export const SWEET_FRUIT = new Set(['figs', 'plums', 'peaches', 'pears', 'apples', 'apricots', 'quince', 'cherries', 'rhubarb', 'grapes', 'persimmon', 'strawberries', 'raspberries', 'blueberries', 'blackberries', 'gooseberries', 'cranberries', 'melon', 'watermelon', 'mango', 'pineapple', 'papaya', 'bananas', 'kiwi', 'pomegranate', 'oranges', 'blood oranges', 'grapefruit'])

/** Cheese mains: kept away from creamy (cheese, yoghurt, cream) sauces. */
export const CHEESE = new Set(['halloumi', 'paneer', 'feta', 'ricotta', "goat's cheese", 'burrata', 'mozzarella'])

// Grams are for two people as a main plate (dry weight for grains, pulses and pasta).
export const INGREDIENTS: Ingredient[] = [
  // roots
  I('beetroot', 'round', '#b0506a', 400, 'roast salt-baked whipped pickled shaved glazed', [SU, AU, WI], [2, 0, 0, 1, 0, 0], ['beet', 'beets', 'golden beetroot']),
  I('carrots', 'long', '#e0985a', 400, 'roast glazed charred grilled whipped pickled shaved brown-butter salt-baked', 'all', [2, 0, 0, 0, 0, 0], ['carrot', 'heritage carrots']),
  I('parsnips', 'long', '#e6d29a', 400, 'roast glazed whipped brown-butter', [AU, WI], [2, 0, 0, 1, 0, 0], ['parsnip']),
  I('celeriac', 'slab', '#e8dcb0', 500, 'salt-baked roast whipped braised shaved brown-butter seared', [AU, WI], [1, 0, 0, 1, 1, 0], ['celery root']),
  I('turnips', 'round', '#efe0e8', 400, 'roast glazed pickled braised brown-butter', [AU, WI, SP], [1, 0, 0, 2, 0, 0], ['turnip']),
  I('swede', 'slab', '#e6c070', 450, 'roast whipped glazed', [AU, WI], [2, 0, 0, 1, 0, 0], ['rutabaga']),
  I('sweet potato', 'slab', '#e08a4a', 450, 'roast whipped glazed charred grilled', [AU, WI], [3, 0, 0, 0, 0, 0], ['yam', 'kumara']),
  I('new potatoes', 'round', '#e6d29a', 450, 'roast crisp brown-butter confit steamed', [SP, SU], [1, 0, 0, 0, 1, 0], ['new potato', 'jersey royals', 'charlottes', 'fingerlings', 'fingerling potatoes']),
  I('potatoes', 'slab', '#ead9a8', 500, 'roast crisp whipped confit salt-baked', 'all', [1, 0, 0, 0, 1, 0], ['potato', 'spud', 'spuds', 'chips', 'fries', 'mash', 'mashed potato', 'jacket potato', 'baked potato']),
  I('radishes', 'round', '#d9728a', 250, 'shaved pickled brown-butter roast', [SP, SU], [0, 0, 0, 2, 0, 1], ['radish']),
  I('daikon', 'long', '#f2efe6', 400, 'braised pickled shaved glazed roast', [AU, WI], [1, 0, 0, 1, 0, 1], ['mooli', 'daikon radish']),
  I('kohlrabi', 'slice', '#cfe0a8', 400, 'shaved pickled roast', [SU, AU], [1, 0, 0, 1, 0, 0]),
  I('Jerusalem artichokes', 'round', '#d9b47a', 400, 'roast crisp whipped', [WI], [1, 0, 0, 1, 2, 0], ['sunchoke', 'sunchokes', 'Jerusalem artichoke']),
  I('salsify', 'long', '#e6d8b8', 400, 'roast brown-butter crisp', [AU, WI], [1, 0, 0, 1, 1, 0], ['scorzonera']),
  // alliums
  I('leeks', 'long', '#a9b87a', 400, 'charred braised confit grilled', [AU, WI, SP], [2, 0, 0, 1, 1, 0], ['leek']),
  I('shallots', 'round', '#c9907a', 300, 'confit roast glazed pickled', 'all', [2, 0, 0, 0, 1, 0], ['shallot']),
  I('spring onions', 'long', '#9fbf6a', 250, 'charred grilled', [SP, SU], [1, 0, 0, 1, 1, 1], ['scallion', 'scallions', 'green onions', 'calçots', 'calcots']),
  I('red onions', 'round', '#a0507a', 400, 'roast pickled charred crisp', 'all', [2, 0, 0, 0, 1, 0], ['onion', 'onions', 'onion rings', 'red onion']),
  I('garlic', 'round', '#e8d8a8', 300, 'roast confit', 'all', [2, 0, 0, 0, 2, 1], ['garlic bulbs', 'garlic heads', 'whole garlic']),
  I('spring garlic', 'long', '#d8e0b0', 250, 'grilled charred confit', [SP], [1, 0, 0, 1, 1, 1], ['green garlic', 'wet garlic']),
  I('wild garlic', 'leafy', '#4f8a3e', 200, 'grilled charred pickled', [SP], [0, 0, 0, 1, 1, 2], ['ramps', 'ramp', 'ramsons']),
  // brassicas & greens
  I('cauliflower', 'slab', '#efe6cc', 500, 'roast charred whipped crisp braised brown-butter', [AU, WI, SP], [1, 0, 0, 1, 1, 0], ['cauli']),
  I('broccoli', 'small', '#7fa060', 400, 'charred roast steamed grilled', 'all', [0, 0, 0, 2, 1, 0], ['brocoli']),
  I('tenderstem broccoli', 'long', '#7fa060', 300, 'charred grilled steamed', [SP, SU, AU], [0, 0, 0, 2, 1, 0], ['broccolini', 'purple sprouting broccoli']),
  I('hispi cabbage', 'slab', '#a9c080', 500, 'charred roast braised brown-butter', [SU, AU], [1, 0, 0, 1, 1, 0], ['cabbage', 'hispi', 'sweetheart cabbage', 'savoy cabbage', 'pointed cabbage']),
  I('red cabbage', 'leafy', '#8a5a8e', 400, 'braised shaved pickled', [AU, WI], [1, 0, 0, 2, 0, 0]),
  I('sprouts', 'small', '#8fae60', 400, 'roast crisp shaved brown-butter', [AU, WI], [0, 0, 0, 2, 1, 0], ['brussels', 'brussels sprouts', 'brussel sprouts']),
  I('kale', 'leafy', '#5f7f4e', 250, 'charred braised steamed wilted', [AU, WI], [0, 0, 0, 2, 1, 0], ['cavolo', 'cavolo nero', 'lacinato', 'tuscan kale']),
  I('romanesco', 'small', '#a9c070', 400, 'roast charred steamed', [AU, WI], [1, 0, 0, 1, 0, 0]),
  I('chicory', 'leafy', '#e8e0b0', 300, 'charred braised glazed', [WI], [0, 0, 0, 3, 0, 0], ['endive', 'endives', 'witlof']),
  I('radicchio', 'leafy', '#8a2a4a', 300, 'charred grilled braised dressed', [AU, WI], [1, 0, 0, 3, 0, 0], ['treviso', 'castelfranco']),
  I('puntarelle', 'leafy', '#d8e0b0', 250, 'dressed', [WI], [0, 0, 0, 3, 0, 0], ['puntarella']),
  I('spinach', 'leafy', '#3f6a3a', 400, 'wilted steamed', [SP, AU, WI], [0, 0, 0, 1, 1, 0], ['baby spinach']),
  I('chard', 'leafy', '#4f7a3e', 400, 'wilted braised brown-butter', [SU, AU, WI], [0, 1, 0, 2, 1, 0], ['swiss chard', 'rainbow chard', 'ruby chard', 'silverbeet']),
  I('spring greens', 'leafy', '#4f7a3e', 300, 'wilted braised steamed', [SP, WI], [0, 0, 0, 2, 1, 0], ['greens', 'collards', 'collard greens', 'mustard greens', 'turnip greens']),
  I('little gem', 'leafy', '#b8d08a', 300, 'charred grilled dressed braised', [SP, SU, AU], [1, 0, 0, 1, 0, 0], ['little gems', 'gem lettuce', 'baby gem', 'lettuce', 'romaine', 'cos', 'iceberg', 'caesar', 'caesar salad', 'green salad']),
  I('watercress', 'leafy', '#4f8a3e', 150, 'dressed', [SP, SU, AU], [0, 0, 0, 2, 0, 1], ['cress']),
  I('rocket', 'leafy', '#5a8a3e', 120, 'dressed', [SP, SU, AU], [0, 0, 0, 2, 0, 1], ['arugula', 'roquette', 'wild rocket']),
  I('pak choi', 'long', '#7fa060', 300, 'steamed wok-fried charred braised', [SP, SU, AU], [1, 0, 0, 1, 0, 0], ['pak choy', 'bok choy', 'bok choi', 'baby bok choy']),
  I('samphire', 'long', '#5f8f4e', 200, 'steamed brown-butter', [SU], [0, 3, 0, 1, 0, 0], ['sea asparagus', 'sea beans', 'glasswort']),
  // stems, buds & bulbs
  I('celery', 'long', '#b8d08a', 400, 'braised shaved pickled', [SU, AU, WI], [0, 1, 0, 2, 0, 0], ['celery hearts', 'celery heart']),
  I('globe artichokes', 'round', '#9aa870', 500, 'braised grilled confit charred steamed', [SP, SU], [0, 0, 0, 2, 1, 0], ['artichoke', 'artichokes', 'globe artichoke', 'artichoke hearts', 'baby artichokes']),
  I('fennel', 'slice', '#dfe6b0', 400, 'shaved braised roast charred grilled', [SU, AU], [1, 0, 0, 1, 0, 0]),
  I('asparagus', 'long', '#8fae60', 300, 'grilled charred steamed brown-butter', [SP], [1, 0, 0, 1, 1, 0], ['asparagus spears', 'sparrow grass']),
  I('hearts of palm', 'long', '#efe6cc', 300, 'grilled shaved crisp brown-butter charred', 'all', [0, 0, 1, 0, 0, 0], ['heart of palm', 'palm hearts', 'palmito']),
  // summer vegetables
  I('tomatoes', 'round', '#d9604a', 400, 'roast confit charred dressed', [SU], [2, 0, 2, 0, 2, 0], ['tomato', 'cherry tomatoes', 'heirloom tomatoes', 'beef tomato', 'beefsteak tomato', 'plum tomatoes']),
  I('aubergine', 'slab', '#8a6a8e', 450, 'charred roast confit glazed grilled braised crisp', [SU, AU], [0, 0, 0, 1, 2, 0], ['eggplant', 'aubergines', 'brinjal']),
  I('courgettes', 'long', '#8fae60', 400, 'grilled charred shaved crisp', [SU], [1, 0, 0, 0, 0, 0], ['courgette', 'zucchini', 'zucchinis', 'summer squash']),
  I('courgette flowers', 'long', '#e8b040', 150, 'crisp', [SU], [1, 0, 0, 0, 0, 0], ['courgette flower', 'zucchini flowers', 'zucchini blossoms', 'squash blossoms']),
  I('squash', 'slab', '#e0a050', 500, 'roast whipped glazed charred brown-butter', [AU, WI], [3, 0, 0, 0, 1, 0], ['butternut', 'butternut squash', 'pumpkin', 'winter squash', 'acorn squash', 'crown prince']),
  I('delicata squash', 'slice', '#e8b060', 450, 'roast glazed charred brown-butter', [AU, WI], [3, 0, 0, 0, 1, 0], ['delicata']),
  I('kabocha', 'slab', '#e09040', 500, 'roast whipped glazed braised', [AU, WI], [3, 0, 0, 0, 1, 0], ['kabocha squash', 'red kuri', 'onion squash', 'hokkaido pumpkin']),
  I('peppers', 'slice', '#d9603a', 400, 'charred roast confit grilled', [SU, AU], [2, 0, 0, 1, 0, 0], ['pepper', 'capsicum', 'bell peppers', 'red peppers', 'romano peppers']),
  I('padron peppers', 'small', '#6f9a4a', 200, 'charred grilled fried', [SU, AU], [0, 1, 0, 2, 0, 1], ['padrons', 'padron', 'pimientos de padron', 'shishito', 'shishitos', 'shishito peppers']),
  I('sweetcorn', 'small', '#e6c050', 400, 'charred grilled roast', [SU], [3, 0, 0, 0, 0, 0], ['corn', 'corn on the cob', 'elote']),
  I('peas', 'small', '#9fc070', 300, 'steamed brown-butter whipped', [SP, SU], [2, 0, 0, 0, 0, 0], ['pea', 'garden peas', 'petits pois', 'sugar snaps', 'mangetout', 'snow peas']),
  I('broad beans', 'small', '#a9c080', 300, 'steamed brown-butter whipped', [SP, SU], [1, 0, 0, 1, 1, 0], ['fava', 'fava beans']),
  I('green beans', 'long', '#7fa060', 300, 'charred steamed brown-butter', [SU], [1, 0, 0, 1, 0, 0], ['bean', 'beans', 'french beans', 'string beans', 'runner beans', 'haricots verts']),
  I('edamame', 'small', '#7fb060', 300, 'steamed charred', [SU, AU], [1, 1, 0, 0, 1, 0], ['edamame beans', 'soybeans', 'soya beans']),
  I('okra', 'long', '#6f9a4a', 300, 'charred roast crisp braised', [SU, AU], [0, 0, 0, 1, 0, 0], ['ladies fingers', "lady's fingers", 'bhindi']),
  I('tomatillos', 'round', '#a9c070', 350, 'charred roast grilled', [SU, AU], [1, 0, 3, 0, 0, 0], ['tomatillo']),
  I('cucumber', 'slice', '#a9c890', 350, 'shaved pickled dressed', [SU], [1, 0, 1, 0, 0, 0], ['cucumbers', 'smacked cucumber']),
  // mushrooms
  I('mushrooms', 'round', '#b08a6a', 400, 'roast brown-butter grilled crisp confit pickled braised', [AU, WI], [0, 1, 0, 0, 3, 0], ['mushroom', 'chestnut mushrooms', 'button mushrooms', 'cremini', 'wild mushrooms']),
  I('oyster mushrooms', 'leafy', '#c9b8a0', 300, 'crisp grilled brown-butter', 'all', [0, 1, 0, 0, 3, 0], ['oyster mushroom']),
  I('king oyster mushrooms', 'long', '#d8c8a8', 300, 'seared grilled charred roast glazed', 'all', [0, 1, 0, 0, 3, 0], ['king oyster', 'king oysters', 'king trumpet', 'eryngii']),
  I('portobello mushrooms', 'round', '#6a5040', 400, 'grilled roast seared braised', 'all', [0, 1, 0, 0, 3, 0], ['portobello', 'portobellos', 'portabella', 'portobella', 'flat mushrooms', 'field mushrooms']),
  I('maitake', 'leafy', '#8a7050', 300, 'roast seared crisp grilled', 'all', [0, 1, 0, 1, 3, 0], ['hen of the woods', 'maitake mushrooms']),
  I('shiitake', 'round', '#8a6a4a', 300, 'glazed grilled brown-butter pickled', 'all', [0, 1, 0, 0, 3, 0], ['shiitakes']),
  I('chanterelles', 'small', '#e0a040', 250, 'brown-butter roast pickled', [SU, AU], [1, 0, 0, 0, 2, 0], ['chanterelle', 'girolles', 'girolle']),
  I('morels', 'small', '#8a6a4a', 150, 'brown-butter braised', [SP], [0, 0, 0, 1, 3, 0], ['morel']),
  // fruit
  I('figs', 'round', '#b0708a', 300, 'roast grilled charred brown-butter', [SU, AU], [3, 0, 0, 0, 0, 0], ['fig']),
  I('plums', 'round', '#8a4a6a', 350, 'roast charred pickled brown-butter', [SU, AU], [3, 0, 2, 0, 0, 0], ['plum', 'damsons', 'greengages']),
  I('peaches', 'round', '#f0a070', 350, 'grilled roast shaved', [SU], [3, 0, 1, 0, 0, 0], ['peach', 'nectarine']),
  I('pears', 'slice', '#d9cf7a', 350, 'roast shaved brown-butter pickled', [AU, WI], [3, 0, 1, 0, 0, 0], ['pear']),
  I('apples', 'slice', '#d9a060', 350, 'roast shaved brown-butter charred', [AU, WI], [2, 0, 2, 0, 0, 0], ['apple']),
  I('apricots', 'round', '#f0b060', 300, 'roast grilled', [SU], [3, 0, 2, 0, 0, 0], ['apricot']),
  I('quince', 'slice', '#e6c060', 400, 'roast glazed', [AU], [2, 0, 2, 1, 0, 0], ['quinces']),
  I('cherries', 'small', '#a03a4a', 250, 'pickled roast', [SU], [3, 0, 2, 0, 0, 0], ['cherry']),
  I('rhubarb', 'long', '#d9607a', 300, 'roast pickled', [SP, WI], [1, 0, 3, 0, 0, 0], ['forced rhubarb']),
  I('grapes', 'small', '#a0a050', 250, 'roast pickled', [AU], [3, 0, 1, 0, 0, 0], ['grape']),
  I('persimmon', 'slice', '#e08a3a', 300, 'shaved roast', [AU, WI], [3, 0, 0, 0, 0, 0], ['sharon', 'sharon fruit', 'kaki']),
  I('strawberries', 'round', '#d9404a', 250, 'roast dressed pickled', [SP, SU], [3, 0, 1, 0, 0, 0], ['berries', 'mixed berries', 'summer berries']),
  I('raspberries', 'small', '#d03a5a', 200, 'dressed', [SU], [2, 0, 2, 0, 0, 0], ['raspberry']),
  I('blueberries', 'small', '#4a4a8a', 200, 'roast pickled dressed', [SU], [2, 0, 1, 0, 0, 0], ['blueberry']),
  I('blackberries', 'small', '#3a2a4a', 200, 'roast pickled dressed', [SU, AU], [2, 0, 2, 0, 0, 0], ['blackberry', 'brambles']),
  I('gooseberries', 'small', '#a0b060', 200, 'roast pickled', [SU], [1, 0, 3, 0, 0, 0], ['gooseberry']),
  I('cranberries', 'small', '#b02030', 200, 'roast pickled', [AU, WI], [1, 0, 3, 1, 0, 0], ['cranberry']),
  I('melon', 'slice', '#f0b070', 400, 'dressed grilled shaved', [SU], [3, 0, 0, 0, 0, 0], ['melons', 'cantaloupe', 'honeydew', 'charentais']),
  I('watermelon', 'slab', '#e05a6a', 500, 'grilled dressed charred', [SU], [3, 0, 0, 0, 0, 0], ['watermelons']),
  I('mango', 'slice', '#f0a830', 350, 'dressed shaved grilled pickled', [SP, SU], [3, 0, 1, 0, 0, 0], ['mangoes', 'mangos', 'green mango']),
  I('pineapple', 'slice', '#f0d060', 400, 'grilled charred roast glazed', 'all', [3, 0, 2, 0, 0, 0], ['pineapples']),
  I('papaya', 'slice', '#f08050', 400, 'shaved dressed pickled', 'all', [2, 0, 0, 0, 0, 0], ['papayas', 'pawpaw', 'green papaya']),
  I('avocado', 'slice', '#a8b860', 300, 'dressed grilled', 'all', [0, 0, 0, 0, 1, 0], ['avocados', 'avo', 'guacamole']),
  I('bananas', 'long', '#e8c860', 300, 'grilled brown-butter roast', 'all', [3, 0, 0, 0, 0, 0], ['banana']),
  I('plantain', 'long', '#e0b050', 400, 'fried roast grilled glazed', 'all', [3, 0, 0, 0, 0, 0], ['plantains', 'tostones', 'maduros']),
  I('banana blossom', 'leafy', '#d8c0b0', 300, 'crisp braised dressed', 'all', [0, 0, 1, 1, 0, 0], ['banana blossoms', 'banana flower', 'banana flowers']),
  I('jackfruit', 'small', '#c8b080', 400, 'braised glazed crisp', 'all', [1, 0, 0, 0, 1, 0], ['young jackfruit', 'green jackfruit']),
  I('coconut', 'slice', '#f3efe6', 250, 'shaved', 'all', [2, 0, 0, 0, 0, 0], ['coconuts', 'young coconut']),
  I('kiwi', 'slice', '#8ab040', 300, 'dressed', [AU, WI, SP], [2, 0, 2, 0, 0, 0], ['kiwis', 'kiwifruit', 'kiwi fruit']),
  I('pomegranate', 'small', '#b02040', 250, 'dressed', [AU, WI], [2, 0, 2, 1, 0, 0], ['pomegranates', 'pomegranate seeds']),
  I('lemons', 'slice', '#f0d860', 300, 'shaved charred confit', [WI, SP], [1, 0, 3, 1, 0, 0], ['lemon', 'meyer lemons', 'amalfi lemons']),
  I('oranges', 'slice', '#f09030', 400, 'dressed charred grilled', [WI], [3, 0, 2, 0, 0, 0], ['orange', 'navel oranges', 'clementines', 'clementine', 'satsumas', 'mandarins', 'tangerines', 'citrus']),
  I('blood oranges', 'slice', '#c0303a', 400, 'dressed charred', [WI], [3, 0, 2, 1, 0, 0], ['blood orange']),
  I('grapefruit', 'slice', '#f08070', 400, 'dressed grilled', [WI], [2, 0, 3, 2, 0, 0], ['grapefruits', 'pink grapefruit']),
  I('chestnuts', 'small', '#8a5a3a', 300, 'roast glazed whipped', [AU, WI], [2, 0, 0, 0, 1, 0], ['chestnut']),
  // pulses
  I('chickpeas', 'small', '#d9b47a', 300, 'crisp simmered whipped roast warm-salad', 'all', [1, 0, 0, 0, 1, 0], ['chickpea', 'garbanzo', 'garbanzo beans', 'hummus', 'chana']),
  I('white beans', 'small', '#efe6cc', 300, 'simmered whipped confit', 'all', [1, 0, 0, 0, 1, 0], ['butterbeans', 'butter beans', 'lima beans', 'cannellini', 'cannellini beans', 'haricot', 'navy beans', 'gigantes', 'giant beans']),
  I('borlotti beans', 'small', '#b08070', 300, 'simmered warm-salad', 'all', [1, 0, 0, 0, 2, 0], ['borlotti', 'cranberry beans', 'roman beans']),
  I('black beans', 'small', '#3a3036', 300, 'simmered', 'all', [0, 1, 0, 0, 2, 0], ['black bean', 'turtle beans', 'frijoles']),
  I('kidney beans', 'small', '#7a2a2a', 300, 'simmered', 'all', [0, 0, 0, 0, 2, 0], ['kidney bean', 'red beans', 'rajma']),
  I('lentils', 'small', '#8a7a5a', 250, 'simmered warm-salad', 'all', [0, 0, 0, 1, 2, 0], ['lentil', 'dal', 'dhal', 'daal', 'puy lentils', 'beluga lentils', 'red lentils']),
  // eggs, tofu, cheese & other proteins
  I('eggs', 'round', '#f0d890', 240, 'jammy fried', 'all', [0, 1, 0, 0, 2, 0], ['egg', 'duck eggs', 'duck egg', 'quail eggs', 'hen eggs']),
  I('tofu', 'slab', '#efe6cc', 400, 'crisp glazed grilled braised seared wok-fried', 'all', [0, 0, 0, 0, 1, 0], ['bean curd', 'firm tofu']),
  I('silken tofu', 'slab', '#f5f2e8', 300, 'steamed dressed', 'all', [0, 0, 0, 0, 1, 0], ['silken']),
  I('smoked tofu', 'slab', '#c8a070', 250, 'crisp fried grilled glazed wok-fried', 'all', [0, 2, 0, 1, 2, 0]),
  I('tempeh', 'slab', '#c8a870', 250, 'glazed fried grilled crisp wok-fried', 'all', [0, 1, 0, 1, 2, 0]),
  I('seitan', 'slab', '#a88060', 300, 'seared grilled braised glazed crisp', 'all', [0, 1, 0, 0, 2, 0], ['wheat gluten']),
  I('halloumi', 'slab', '#efe3c0', 250, 'grilled crisp fried', 'all', [0, 3, 0, 0, 1, 0]),
  I('paneer', 'slab', '#f3ecd8', 300, 'grilled charred crisp seared', 'all', [0, 1, 0, 0, 1, 0], ['panir']),
  I('feta', 'slab', '#f3efe0', 250, 'baked fried', 'all', [0, 3, 1, 0, 1, 0]),
  I('ricotta', 'slab', '#f5f0e2', 300, 'baked', 'all', [1, 1, 0, 0, 1, 0]),
  I("goat's cheese", 'round', '#f3efe6', 200, 'baked grilled', 'all', [0, 2, 2, 0, 1, 0], ['goats cheese', 'goat cheese', 'chevre', 'crottin']),
  I('burrata', 'round', '#f5f0e2', 250, 'torn', 'all', [1, 1, 0, 0, 1, 0], ['burratas']),
  I('mozzarella', 'round', '#f5f2e8', 250, 'torn', 'all', [1, 1, 0, 0, 1, 0], ['buffalo mozzarella', 'mozzarella di bufala', 'fior di latte']),
  // grains, noodles & bread
  I('rice', 'small', '#f2efe6', 160, 'steamed stir-fried', 'all', [1, 0, 0, 0, 0, 0], ['basmati', 'basmati rice', 'jasmine rice', 'white rice', 'brown rice', 'sushi rice', 'sticky rice', 'fried rice']),
  I('risotto rice', 'small', '#f0ead8', 160, 'risotto', 'all', [1, 1, 0, 0, 1, 0], ['risotto', 'arborio', 'carnaroli']),
  I('wild rice', 'small', '#4a3a2a', 150, 'warm-salad', 'all', [0, 0, 0, 1, 1, 0]),
  I('pearl barley', 'small', '#d8c8a0', 150, 'warm-salad risotto', 'all', [1, 0, 0, 0, 1, 0], ['barley', 'orzotto']),
  I('farro', 'small', '#b89870', 150, 'warm-salad risotto', 'all', [1, 0, 0, 0, 1, 0], ['spelt', 'emmer', 'farrotto']),
  I('freekeh', 'small', '#8a8050', 150, 'warm-salad', 'all', [0, 0, 0, 1, 1, 0], ['frikeh']),
  I('quinoa', 'small', '#e0d0a8', 150, 'warm-salad', 'all', [0, 0, 0, 1, 1, 0]),
  I('bulgur', 'small', '#c8a870', 150, 'warm-salad', 'all', [0, 0, 0, 0, 1, 0], ['bulgar', 'bulghur', 'cracked wheat', 'tabbouleh']),
  I('couscous', 'small', '#e8d8a0', 150, 'steamed', 'all', [1, 0, 0, 0, 0, 0], ['cous cous']),
  I('giant couscous', 'small', '#e8d090', 160, 'warm-salad', 'all', [1, 0, 0, 0, 1, 0], ['pearl couscous', 'israeli couscous', 'moghrabieh', 'fregola']),
  I('polenta', 'slab', '#e8c860', 120, 'soft seared grilled crisp', 'all', [1, 1, 0, 0, 1, 0], ['grits', 'cornmeal']),
  I('pasta', 'long', '#e8d090', 200, 'tossed', 'all', [1, 0, 0, 0, 1, 0], ['spaghetti', 'linguine', 'tagliatelle', 'pappardelle', 'fettuccine', 'bucatini', 'rigatoni', 'penne', 'orecchiette', 'fusilli', 'paccheri', 'macaroni', 'orzo', 'ravioli', 'tortellini', 'mac and cheese']),
  I('gnocchi', 'small', '#e8dcb0', 400, 'brown-butter seared tossed', 'all', [1, 0, 0, 0, 1, 0], ['gnudi']),
  I('soba noodles', 'long', '#8a7a60', 180, 'cold tossed', 'all', [0, 1, 0, 1, 1, 0], ['soba', 'buckwheat noodles']),
  I('udon noodles', 'long', '#f2efe6', 400, 'tossed stir-fried cold', 'all', [1, 0, 0, 0, 1, 0], ['udon']),
  I('rice noodles', 'long', '#f2efe6', 180, 'stir-fried cold', 'all', [1, 0, 0, 0, 0, 0], ['rice noodle', 'vermicelli', 'rice vermicelli', 'rice sticks', 'ho fun', 'pad thai']),
  I('egg noodles', 'long', '#e8c870', 200, 'stir-fried tossed', 'all', [0, 1, 0, 0, 1, 0], ['noodles', 'noodle', 'ramen', 'ramen noodles', 'lo mein', 'chow mein', 'wheat noodles']),
  I('sourdough', 'slab', '#c8985a', 200, 'toasted fried', 'all', [1, 1, 1, 0, 1, 0], ['bread', 'toast', 'loaf', 'country loaf', 'ciabatta', 'focaccia', 'baguette', 'crusty bread', 'bruschetta', 'garlic bread']),
  I('flatbread', 'slab', '#d8b070', 200, 'charred grilled', 'all', [1, 1, 0, 0, 0, 0], ['flatbreads', 'pitta', 'pita', 'naan', 'roti', 'chapati', 'tortilla', 'tortillas', 'lavash', 'piadina']),
]

// ---- Vegetarian swaps ---------------------------------------------------------

/** Platedraw is vegetarian: a meat or fish word maps to the produce that stands in for it. */
export interface Swap {
  /** `n` of an entry in INGREDIENTS. */
  to: string
  /** Preferred technique id (must be in that ingredient's `tech`). */
  tech?: string
  /** One short tongue-in-cheek line shown after the swap note. */
  quip?: string
}

const sw = (to: string, tech: string, quip: string): Swap => ({ to, tech, quip })

/**
 * Keys are lowercase words or phrases ("chicken", "pork belly"). Plurals/singulars are matched automatically.
 * Each stand-in echoes the original's texture or role on the plate.
 */
export const SWAPS: Record<string, Swap> = {
  // poultry
  chicken: sw('oyster mushrooms', 'crisp', 'No birds were harmed.'),
  'fried chicken': sw('oyster mushrooms', 'crisp', "Finger-lickin' fungi."),
  'chicken wing': sw('cauliflower', 'crisp', 'Winging it, deliciously.'),
  wing: sw('cauliflower', 'crisp', "This one's on the cauli-flyer."),
  'roast chicken': sw('maitake', 'roast', 'Hen of the woods rules the roost.'),
  'chicken breast': sw('seitan', 'seared', 'Breast-case scenario: seitan.'),
  'chicken thigh': sw('seitan', 'grilled', 'Thigh-ed and true.'),
  nugget: sw('tofu', 'crisp', 'A nugget of tofu wisdom.'),
  turkey: sw('celeriac', 'roast', 'Talk turkey? Talk celeriac.'),
  duck: sw('aubergine', 'glazed', 'Duck, duck… aubergine.'),
  goose: sw('celeriac', 'salt-baked', 'Cooked the goose, kept the celeriac.'),
  // beef, pork, lamb, game
  beef: sw('portobello mushrooms', 'braised', 'No beef with you.'),
  steak: sw('portobello mushrooms', 'grilled', 'A rare find, cooked well done.'),
  burger: sw('portobello mushrooms', 'grilled', 'Bun intended.'),
  hamburger: sw('portobello mushrooms', 'grilled', 'Hold the ham, keep the burger.'),
  brisket: sw('celeriac', 'braised', 'Low and slow, root and all.'),
  meatball: sw('mushrooms', 'roast', 'Having a ball without the meat.'),
  mince: sw('lentils', 'simmered', "We won't mince words: lentils."),
  'ground beef': sw('lentils', 'simmered', 'Lentils held their ground.'),
  meat: sw('portobello mushrooms', 'roast', 'Meat your new favourite mushroom.'),
  pork: sw('jackfruit', 'glazed', 'Hogging the jackfruit.'),
  'pulled pork': sw('jackfruit', 'braised', 'Pulled it off.'),
  'pork belly': sw('tofu', 'glazed', 'Belly up to the tofu.'),
  'pork chop': sw('celeriac', 'seared', "Chop chop, here's celeriac."),
  rib: sw('king oyster mushrooms', 'glazed', "No ribbing, it's mushrooms."),
  bacon: sw('smoked tofu', 'crisp', 'Same sizzle, less oink.'),
  pancetta: sw('smoked tofu', 'crisp', 'Pancetta? Pan-tofu.'),
  lardon: sw('smoked tofu', 'crisp', "Lardon me, it's smoked tofu."),
  ham: sw('celeriac', 'salt-baked', "Don't be such a ham."),
  prosciutto: sw('beetroot', 'shaved', 'Thin-sliced and beet-iful.'),
  salami: sw('beetroot', 'shaved', 'Sliced the salami, kept the beet.'),
  pepperoni: sw('beetroot', 'shaved', 'A pizza the beet action.'),
  sausage: sw('seitan', 'grilled', 'Links to nothing porky.'),
  chorizo: sw('smoked tofu', 'fried', 'Smoked out, chorizo-style.'),
  'hot dog': sw('carrots', 'grilled', 'Top dog: a carrot.'),
  lamb: sw('aubergine', 'charred', "Ewe won't miss it."),
  'lamb chop': sw('aubergine', 'grilled', 'Mint condition, no lamb required.'),
  mutton: sw('aubergine', 'braised', 'Mutton dressed as aubergine.'),
  goat: sw('jackfruit', 'braised', 'The GOAT is jackfruit.'),
  kebab: sw('halloumi', 'grilled', 'Skewered, with zero baa.'),
  venison: sw('beetroot', 'roast', "Oh deer, it's beetroot."),
  veal: sw('celeriac', 'brown-butter', 'The real deal, minus the veal.'),
  schnitzel: sw('aubergine', 'crisp', 'Crumbed, crisp, and aubergine.'),
  // fish
  fish: sw('banana blossom', 'crisp', 'Plenty more veg in the sea.'),
  'fish and chips': sw('banana blossom', 'crisp', 'A chip off the old blossom.'),
  'fish finger': sw('halloumi', 'crisp', 'Fingers crossed for halloumi.'),
  haddock: sw('banana blossom', 'crisp', 'Haddock? Had a blossom.'),
  salmon: sw('carrots', 'salt-baked', 'Swimming upstream, carrot-first.'),
  lox: sw('carrots', 'salt-baked', 'Lox, stock and two smoking carrots.'),
  gravlax: sw('beetroot', 'salt-baked', 'Cured of fish entirely.'),
  tuna: sw('watermelon', 'grilled', 'Something fishy about this watermelon.'),
  'tuna steak': sw('watermelon', 'grilled', "Tuna-ble, but it's melon."),
  cod: sw('cauliflower', 'brown-butter', "Oh my cod, it's cauliflower."),
  'sea bass': sw('hispi cabbage', 'brown-butter', 'Bass-ically a cabbage now.'),
  monkfish: sw('king oyster mushrooms', 'roast', 'No monkey business.'),
  mackerel: sw('aubergine', 'grilled', 'Holy mackerel, aubergine.'),
  sardine: sw('peppers', 'grilled', 'Packed like peppers.'),
  anchovy: sw('shiitake', 'glazed', 'Anchovy? Anchored in umami.'),
  trout: sw('carrots', 'brown-butter', 'Trout and about with carrots.'),
  // shellfish
  prawn: sw('hearts of palm', 'grilled', 'Prawn to be wild.'),
  shrimp: sw('hearts of palm', 'crisp', 'Shrimply delicious.'),
  lobster: sw('hearts of palm', 'brown-butter', 'Claws for celebration.'),
  crab: sw('hearts of palm', 'shaved', "Don't be crabby."),
  'crab cake': sw('hearts of palm', 'crisp', 'A piece of crab cake.'),
  scallop: sw('king oyster mushrooms', 'seared', 'Seared to scallop-ish glory.'),
  squid: sw('king oyster mushrooms', 'charred', 'Ink-redibly mushroom.'),
  calamari: sw('red onions', 'crisp', "Ring ring, it's onions."),
  octopus: sw('king oyster mushrooms', 'grilled', 'Eight arms, zero tentacles.'),
  mussel: sw('mushrooms', 'braised', 'Flexing a little mushroom mussel.'),
  clam: sw('white beans', 'simmered', "Stay clam, it's beans."),
  oyster: sw('oyster mushrooms', 'crisp', 'The world is your oyster mushroom.'),
}

// ---- Cuisines -----------------------------------------------------------------

export interface Sauce {
  n: string
  colour: string
  style: SauceStyle
  /** Rows for the ingredients list: [role, name, grams]. */
  rows: [string, string, number][]
  step: [string, string, string]
  /** Postcard line. */
  q: string
  feel: string
  f: F
}
export interface Crunch { n: string; short: string; g: number; colour: string; garnish: Garnish; f: F }
export interface Herb { n: string; g: number; colour: string; garnish: Garnish }
export interface Acid { row: [string, number]; finish: string; garnish?: Garnish }
export interface Heat { row: [string, number]; finish: string; garnish?: Garnish }

export interface Cuisine {
  cu: string
  shapes: Shape[]
  /** Techniques this kitchen leans on (bias, not a rule). */
  tech: string[]
  fat: string
  sauces: Sauce[]
  crunch: Crunch[]
  herbs: Herb[]
  acids: Acid[]
  heat: Heat[]
}

const S = (n: string, colour: string, style: SauceStyle, rows: [string, string, number][], step: [string, string, string], q: string, feel: string, f: F): Sauce =>
  ({ n, colour, style, rows, step, q, feel, f })
const C = (n: string, short: string, g: number, colour: string, garnish: Garnish, f: F = [0, 1, 0, 0, 1, 0]): Crunch => ({ n, short, g, colour, garnish, f })
const H = (n: string, g: number, colour: string, garnish: Garnish = 'leaf'): Herb => ({ n, g, colour, garnish })

export const CUISINES: Cuisine[] = [
  {
    cu: 'Mediterranean', shapes: ['round', 'coupe', 'oval'], tech: ['charred', 'roast', 'grilled', 'confit', 'dressed', 'baked', 'warm-salad', 'simmered'], fat: 'Olive oil',
    sauces: [
      S('whipped feta', '#efe9d6', 'swoosh', [['Cream', 'Feta', 120], ['Fat', 'Olive oil', 20]], ['WHIP', 'Whip the feta with the oil and a splash of water until smooth.', 'soft peaks that hold'], 'Whip feta with oil till airy.', 'cool salty cream', [0, 3, 1, 0, 1, 0]),
      S('salsa verde', '#8fa860', 'drizzle', [['Herb', 'Parsley, basil and mint', 40], ['Acid', 'Capers', 15], ['Fat', 'Olive oil', 60]], ['CHOP', 'Chop the herbs and capers finely and loosen with the oil.', 'a loose, glossy green sauce'], 'Chop a sharp green sauce.', 'a sharp green sauce', [0, 2, 2, 1, 0, 0]),
      S('romesco', '#c96a4a', 'pool', [['Sauce', 'Roast red peppers', 150], ['Crunch', 'Almonds', 40], ['Acid', 'Sherry vinegar', 15]], ['BLEND', 'Blend the peppers, almonds, vinegar and a little oil until thick.', 'brick-red and spoonable'], 'Blend peppers and almonds.', 'smoky pepper sauce', [2, 1, 1, 0, 1, 1]),
    ],
    crunch: [C('toasted pumpkin seeds', 'pumpkin seeds', 25, '#a9a060', 'seed'), C('pangrattato', 'pangrattato', 30, '#d9b47a', 'crumb'), C('toasted almonds', 'almonds', 30, '#d9b080', 'flake')],
    herbs: [H('dill and mint', 15, '#6f8f4e'), H('basil', 10, '#5f8f4e'), H('oregano and parsley', 15, '#6f8f4e', 'micro')],
    acids: [{ row: ['Lemon', 60], finish: 'a sharp bright finish', garnish: 'zest' }, { row: ['Red wine vinegar', 15], finish: 'a clean sour edge' }],
    heat: [{ row: ['Chilli flakes', 2], finish: 'a gentle warmth', garnish: 'flake' }, { row: ['Calabrian chilli', 10], finish: 'a slow fruity heat', garnish: 'chilli' }],
  },
  {
    cu: 'Italian', shapes: ['round', 'coupe', 'board'], tech: ['roast', 'confit', 'brown-butter', 'grilled', 'risotto', 'tossed', 'soft', 'torn', 'toasted', 'simmered'], fat: 'Olive oil',
    sauces: [
      S('torn burrata', '#f5f0e2', 'pool', [['Cream', 'Burrata', 150]], ['TEAR', 'Tear the burrata open and season the cream inside with salt and oil.', 'soft strands and a creamy centre'], 'Tear the burrata open.', 'milky burrata', [1, 1, 0, 0, 1, 0]),
      S('agrodolce', '#a0503a', 'drizzle', [['Acid', 'Red wine vinegar', 40], ['Sweet', 'Honey', 25], ['Fruit', 'Raisins', 20]], ['REDUCE', 'Simmer the vinegar, honey and raisins until syrupy.', 'it coats the back of a spoon'], 'Reduce a sweet-sour syrup.', 'sweet-sour glaze', [3, 0, 3, 0, 0, 0]),
      S('sage brown butter', '#c99a5a', 'drizzle', [['Fat', 'Butter', 60], ['Herb', 'Sage leaves', 8]], ['BROWN', 'Brown the butter with the sage until the leaves crisp.', 'nutty smell, crackling leaves'], 'Brown butter with sage.', 'nutty sage butter', [1, 1, 0, 0, 2, 0]),
    ],
    crunch: [C('pangrattato', 'pangrattato', 30, '#d9b47a', 'crumb'), C('toasted pine nuts', 'pine nuts', 25, '#e6cf8a', 'seed'), C('crushed hazelnuts', 'hazelnuts', 30, '#c09060', 'flake')],
    herbs: [H('basil', 10, '#5f8f4e'), H('parsley and lemon zest', 15, '#6f8f4e', 'micro'), H('crisp sage', 6, '#7f9f6e')],
    acids: [{ row: ['Lemon', 60], finish: 'a bright lemony finish', garnish: 'zest' }, { row: ['Aged balsamic', 10], finish: 'a dark sweet-sour finish', garnish: 'oil' }],
    heat: [{ row: ['Chilli flakes', 2], finish: 'a gentle warmth', garnish: 'flake' }],
  },
  {
    cu: 'Levantine', shapes: ['round', 'coupe', 'board'], tech: ['roast', 'charred', 'crisp', 'whipped', 'warm-salad', 'simmered', 'fried', 'dressed'], fat: 'Olive oil',
    sauces: [
      S('tahini sauce', '#e6d6b0', 'pool', [['Sauce', 'Tahini', 60], ['Acid', 'Lemon juice', 30], ['Allium', 'Garlic', 5]], ['WHISK', 'Whisk the tahini, lemon and garlic with iced water until pale.', 'smooth, pale and pourable'], 'Whisk tahini with iced water.', 'nutty tahini', [0, 1, 1, 1, 1, 0]),
      S('labneh', '#f3ecd8', 'swoosh', [['Cream', 'Labneh', 150], ['Fat', 'Olive oil', 15]], ['SEASON', 'Season the labneh with salt and a little oil.', 'thick and tangy'], 'Season thick labneh.', 'tangy labneh', [0, 1, 2, 0, 0, 0]),
      S('muhammara', '#b85a3a', 'pool', [['Sauce', 'Roast red peppers', 150], ['Crunch', 'Walnuts', 40], ['Acid', 'Pomegranate molasses', 15]], ['BLEND', 'Pulse the peppers, walnuts and molasses until coarse.', 'rough, brick-red and rich'], 'Pulse peppers and walnuts.', 'smoky muhammara', [2, 1, 2, 1, 1, 1]),
    ],
    crunch: [C('dukkah', 'dukkah', 25, '#b09060', 'crumb'), C('crisp chickpeas', 'crisp chickpeas', 50, '#d9b47a', 'seed'), C('pistachios', 'pistachios', 25, '#9fae60', 'flake')],
    herbs: [H('parsley and mint', 15, '#6f8f4e'), H('coriander', 10, '#6f9f4e', 'micro'), H("fresh za'atar", 8, '#7f8f5e', 'micro')],
    acids: [{ row: ['Lemon', 60], finish: 'a bright lemony finish', garnish: 'zest' }, { row: ['Sumac', 4], finish: 'a tart sumac finish', garnish: 'crumb' }, { row: ['Pomegranate molasses', 20], finish: 'a sweet-sour finish', garnish: 'oil' }],
    heat: [{ row: ['Aleppo pepper', 3], finish: 'a warm fruity heat', garnish: 'flake' }],
  },
  {
    cu: 'North African', shapes: ['round', 'coupe', 'bowl'], tech: ['roast', 'braised', 'charred', 'glazed', 'simmered', 'warm-salad'], fat: 'Olive oil',
    sauces: [
      S('harissa yoghurt', '#e6a080', 'swoosh', [['Cream', 'Greek yoghurt', 150], ['Heat', 'Rose harissa', 20]], ['RIPPLE', 'Ripple the harissa through the yoghurt without fully mixing.', 'red streaks through white'], 'Ripple harissa through yoghurt.', 'rippled harissa yoghurt', [0, 1, 2, 0, 0, 2]),
      S('chermoula', '#7f9f4e', 'drizzle', [['Herb', 'Coriander and parsley', 40], ['Spice', 'Cumin and paprika', 4], ['Fat', 'Olive oil', 60]], ['POUND', 'Pound the herbs and spices with the oil and a little lemon.', 'a loose, spiced green paste'], 'Pound a spiced herb paste.', 'spiced herb chermoula', [0, 1, 2, 1, 0, 1]),
      S('preserved lemon dressing', '#e6d070', 'dots', [['Acid', 'Preserved lemon', 30], ['Sweet', 'Honey', 10], ['Fat', 'Olive oil', 40]], ['CHOP', 'Chop the preserved lemon rind finely and shake with honey and oil.', 'glossy, flecked with yellow'], 'Shake a preserved-lemon dressing.', 'salty preserved lemon', [1, 2, 3, 1, 0, 0]),
    ],
    crunch: [C('toasted almonds', 'almonds', 30, '#d9b080', 'flake'), C('toasted sesame', 'sesame', 10, '#e6d6a0', 'seed'), C('crisp chickpeas', 'crisp chickpeas', 50, '#d9b47a', 'seed')],
    herbs: [H('coriander and mint', 15, '#6f9f4e'), H('parsley', 10, '#6f8f4e', 'micro')],
    acids: [{ row: ['Lemon', 60], finish: 'a bright lemony finish', garnish: 'zest' }],
    heat: [{ row: ['Harissa', 15], finish: 'a deep smoky heat', garnish: 'chilli' }, { row: ['Chilli flakes', 2], finish: 'a gentle warmth', garnish: 'flake' }],
  },
  {
    cu: 'Indian', shapes: ['round', 'bowl', 'coupe'], tech: ['roast', 'crisp', 'braised', 'charred', 'wilted', 'simmered', 'fried', 'seared'], fat: 'Ghee',
    sauces: [
      S('coconut curry-leaf sauce', '#e6d090', 'pool', [['Sauce', 'Coconut milk', 200], ['Herb', 'Curry leaves', 4], ['Spice', 'Mustard seeds and turmeric', 4]], ['TEMPER', 'Fry the mustard seeds and curry leaves in ghee, add turmeric and coconut milk and simmer.', 'golden and lightly thickened'], 'Temper spices into coconut.', 'golden coconut sauce', [2, 1, 0, 0, 1, 1]),
      S('mint raita', '#e8f0d8', 'swoosh', [['Cream', 'Yoghurt', 150], ['Herb', 'Mint', 10], ['Veg', 'Cucumber, grated', 60]], ['STIR', 'Stir the mint and squeezed cucumber into the yoghurt with salt.', 'cool, flecked with green'], 'Stir a cool mint raita.', 'cool mint raita', [0, 1, 2, 0, 0, 0]),
      S('tamarind chutney', '#7a4a2a', 'dots', [['Acid', 'Tamarind paste', 40], ['Sweet', 'Jaggery', 30], ['Spice', 'Cumin', 2]], ['SIMMER', 'Simmer the tamarind, jaggery and cumin until jammy.', 'dark, glossy and sticky'], 'Simmer a sticky tamarind chutney.', 'sweet-sour tamarind', [3, 0, 3, 0, 0, 0]),
    ],
    crunch: [C('sev', 'sev', 25, '#e6c060', 'crumb'), C('crisp curry leaves', 'curry leaves', 4, '#5f7f4e', 'leaf'), C('toasted cashews', 'cashews', 30, '#e6cf9a', 'flake')],
    herbs: [H('coriander', 10, '#6f9f4e', 'micro'), H('mint and coriander', 15, '#6f9f4e')],
    acids: [{ row: ['Lime', 50], finish: 'a sharp lime finish', garnish: 'zest' }],
    heat: [{ row: ['Green chilli', 10], finish: 'a fresh green heat', garnish: 'chilli' }, { row: ['Kashmiri chilli', 3], finish: 'a warm, mild glow', garnish: 'flake' }],
  },
  {
    cu: 'Japanese', shapes: ['coupe', 'slate', 'round'], tech: ['glazed', 'grilled', 'pickled', 'crisp', 'cold', 'stir-fried', 'seared', 'jammy'], fat: 'Neutral oil',
    sauces: [
      S('white miso butter', '#d9b47a', 'pool', [['Umami', 'White miso', 30], ['Fat', 'Butter', 40], ['Acid', 'Rice vinegar', 10]], ['WHISK', 'Whisk the miso into the melted butter with the vinegar, off the heat.', 'a glossy, loose sauce'], 'Whisk miso into butter.', 'salty-sweet miso butter', [2, 2, 1, 0, 3, 0]),
      S('sesame dressing', '#d9c39a', 'drizzle', [['Sauce', 'Toasted sesame paste', 40], ['Umami', 'Soy sauce', 15], ['Sweet', 'Mirin', 15]], ['WHISK', 'Whisk the sesame paste, soy and mirin with a little water.', 'smooth and pourable'], 'Whisk a sesame dressing.', 'nutty sesame', [1, 2, 0, 1, 2, 0]),
      S('ponzu', '#a07040', 'dots', [['Umami', 'Soy sauce', 30], ['Acid', 'Yuzu or lemon juice', 30], ['Sweet', 'Mirin', 10]], ['MIX', 'Mix the soy, citrus and mirin.', 'bright and thin'], 'Mix a citrus ponzu.', 'bright citrus ponzu', [1, 2, 3, 0, 2, 0]),
    ],
    crunch: [C('furikake', 'furikake', 10, '#5a5a3a', 'seed'), C('toasted sesame', 'sesame', 10, '#e6d6a0', 'seed'), C('fried shallots', 'fried shallots', 25, '#c99a5a', 'crumb')],
    herbs: [H('chives', 8, '#6f9f4e', 'micro'), H('shiso', 6, '#7a6a7e'), H('spring onion', 15, '#8fbf6a', 'micro')],
    acids: [{ row: ['Rice vinegar', 15], finish: 'a clean, soft acidity' }, { row: ['Yuzu', 20], finish: 'a fragrant citrus finish', garnish: 'zest' }],
    heat: [{ row: ['Shichimi togarashi', 2], finish: 'a tingling heat', garnish: 'flake' }],
  },
  {
    cu: 'Korean', shapes: ['coupe', 'bowl', 'round'], tech: ['glazed', 'crisp', 'charred', 'pickled', 'stir-fried', 'wok-fried', 'fried', 'jammy'], fat: 'Neutral oil',
    sauces: [
      S('gochujang butter', '#c95a3a', 'swoosh', [['Heat', 'Gochujang', 30], ['Fat', 'Butter', 40], ['Sweet', 'Honey', 10]], ['MELT', 'Melt the butter with the gochujang and honey, whisking until glossy.', 'brick-red and shiny'], 'Melt gochujang into butter.', 'sweet-hot gochujang butter', [2, 1, 0, 0, 2, 2]),
      S('ssamjang', '#8a5a3a', 'dots', [['Umami', 'Doenjang', 30], ['Heat', 'Gochujang', 15], ['Fat', 'Sesame oil', 10]], ['MIX', 'Mix the doenjang, gochujang and sesame oil with a little honey.', 'a thick, dark paste'], 'Mix a savoury ssamjang.', 'deep savoury ssamjang', [1, 2, 0, 0, 3, 1]),
      S('sesame-soy dressing', '#a07a4a', 'drizzle', [['Umami', 'Soy sauce', 30], ['Fat', 'Sesame oil', 15], ['Acid', 'Rice vinegar', 15]], ['WHISK', 'Whisk the soy, sesame oil and vinegar with a pinch of sugar.', 'glossy and well emulsified'], 'Whisk a sesame-soy dressing.', 'toasty soy dressing', [1, 2, 1, 0, 2, 0]),
    ],
    crunch: [C('toasted sesame', 'sesame', 10, '#e6d6a0', 'seed'), C('crumbled gim', 'gim', 5, '#3a4a3a', 'flake'), C('fried garlic', 'fried garlic', 15, '#d9b47a', 'crumb')],
    herbs: [H('spring onion', 15, '#8fbf6a', 'micro'), H('perilla', 6, '#5f7f5e')],
    acids: [{ row: ['Rice vinegar', 15], finish: 'a clean, soft acidity' }],
    heat: [{ row: ['Gochugaru', 3], finish: 'a smoky, rounded heat', garnish: 'flake' }],
  },
  {
    cu: 'Southeast Asian', shapes: ['round', 'coupe', 'oval'], tech: ['grilled', 'crisp', 'charred', 'shaved', 'wok-fried', 'stir-fried', 'dressed', 'cold'], fat: 'Neutral oil',
    sauces: [
      S('nuoc cham', '#e0b070', 'drizzle', [['Umami', 'Soy or fish-free sauce', 25], ['Acid', 'Lime juice', 30], ['Sweet', 'Palm sugar', 20]], ['DISSOLVE', 'Dissolve the sugar in the lime and soy with a little warm water and garlic.', 'sweet, sour and salty in balance'], 'Balance a sweet-sour dressing.', 'sweet-sour dressing', [2, 2, 3, 0, 1, 1]),
      S('peanut-lime sauce', '#c9a060', 'pool', [['Sauce', 'Peanut butter', 50], ['Sauce', 'Coconut milk', 60], ['Acid', 'Lime juice', 20]], ['WHISK', 'Warm the peanut butter and coconut milk, then whisk in the lime.', 'thick and glossy'], 'Whisk a peanut-lime sauce.', 'rich peanut sauce', [2, 1, 1, 0, 2, 0]),
      S('coconut-lime cream', '#f3efe0', 'swoosh', [['Cream', 'Coconut cream', 120], ['Acid', 'Lime', 30]], ['WHIP', 'Whip the coconut cream with lime zest, juice and salt.', 'light and holding its shape'], 'Whip coconut cream with lime.', 'cool coconut cream', [1, 1, 2, 0, 0, 0]),
    ],
    crunch: [C('roasted peanuts', 'peanuts', 30, '#c99a5a', 'flake'), C('fried shallots', 'fried shallots', 25, '#c99a5a', 'crumb'), C('toasted rice powder', 'toasted rice', 10, '#e6d6a0', 'crumb')],
    herbs: [H('Thai basil and mint', 15, '#5f8f4e'), H('coriander', 10, '#6f9f4e', 'micro')],
    acids: [{ row: ['Lime', 50], finish: 'a sharp lime finish', garnish: 'zest' }],
    heat: [{ row: ["Bird's eye chilli", 4], finish: 'a sharp, quick heat', garnish: 'chilli' }],
  },
  {
    cu: 'Mexican', shapes: ['square', 'round', 'board'], tech: ['charred', 'grilled', 'pickled', 'crisp', 'simmered', 'fried', 'dressed'], fat: 'Neutral oil',
    sauces: [
      S('lime crema', '#f0e6c8', 'swoosh', [['Cream', 'Crema', 80], ['Acid', 'Lime', 45]], ['STIR', 'Stir lime zest and juice into the crema.', 'pourable, with pale green flecks'], 'Stir lime into the crema.', 'cool lime crema', [0, 1, 2, 0, 0, 0]),
      S('salsa macha', '#8a3a2a', 'drizzle', [['Heat', 'Dried chillies', 15], ['Crunch', 'Peanuts and sesame', 30], ['Fat', 'Oil', 80]], ['FRY', 'Fry the chillies, garlic and nuts gently in the oil, then crush.', 'dark red oil, crunchy bits'], 'Fry a crunchy chilli oil.', 'crunchy chilli oil', [0, 1, 0, 1, 1, 3]),
      S('pipián verde', '#a9b070', 'pool', [['Sauce', 'Pumpkin seeds', 60], ['Veg', 'Tomatillos', 150], ['Herb', 'Coriander', 15]], ['BLEND', 'Toast the seeds, then blend with the tomatillos and coriander until smooth.', 'thick and pale green'], 'Blend a pumpkin-seed sauce.', 'nutty pumpkin-seed sauce', [1, 1, 2, 1, 1, 1]),
    ],
    crunch: [C('tostada shards', 'tostada', 40, '#e6c070', 'flake'), C('toasted pepitas', 'pepitas', 25, '#a9a060', 'seed'), C('crumbled cotija', 'cotija', 30, '#f3ecd8', 'crumb', [0, 3, 0, 0, 1, 0])],
    herbs: [H('coriander', 15, '#6f9f4e', 'micro'), H('oregano', 5, '#7f8f5e', 'micro')],
    acids: [{ row: ['Lime', 50], finish: 'a sharp lime finish', garnish: 'zest' }],
    heat: [{ row: ['Pickled jalapeño', 30], finish: 'a bright pickled heat', garnish: 'chilli' }, { row: ['Chipotle', 10], finish: 'a smoky heat', garnish: 'flake' }],
  },
  {
    cu: 'Nordic', shapes: ['slate', 'board', 'coupe'], tech: ['salt-baked', 'pickled', 'roast', 'brown-butter', 'toasted', 'warm-salad', 'jammy', 'baked'], fat: 'Butter',
    sauces: [
      S('dill buttermilk', '#eef0e0', 'pool', [['Cream', 'Buttermilk', 150], ['Herb', 'Dill oil', 20]], ['SPLIT', 'Season the buttermilk and break the dill oil over it.', 'green beads on white'], 'Split dill oil into buttermilk.', 'cool dill buttermilk', [0, 1, 2, 0, 0, 0]),
      S('horseradish cream', '#f3efe0', 'swoosh', [['Cream', 'Crème fraîche', 120], ['Heat', 'Fresh horseradish', 20]], ['FOLD', 'Grate the horseradish into the crème fraîche and season.', 'thick and fiery'], 'Fold horseradish into cream.', 'fiery horseradish cream', [0, 1, 1, 0, 0, 2]),
      S('brown butter emulsion', '#c99a5a', 'drizzle', [['Fat', 'Brown butter', 60], ['Acid', 'Cider vinegar', 15]], ['WHISK', 'Whisk the warm brown butter into the vinegar with a little water.', 'creamy and nutty'], 'Whisk a brown-butter emulsion.', 'nutty brown butter', [1, 1, 1, 0, 2, 0]),
    ],
    crunch: [C('rye crumbs', 'rye crumbs', 30, '#7a5a3a', 'crumb'), C('toasted hazelnuts', 'hazelnuts', 30, '#c09060', 'flake'), C('toasted buckwheat', 'buckwheat', 20, '#b08a5a', 'seed')],
    herbs: [H('dill', 10, '#6f8f4e', 'micro'), H('chervil', 6, '#7f9f6e', 'micro'), H('sorrel', 8, '#6f9f4e')],
    acids: [{ row: ['Cider vinegar', 15], finish: 'a clean apple sharpness' }],
    heat: [{ row: ['Fresh horseradish', 15], finish: 'a nose-tingling heat', garnish: 'zest' }],
  },
  {
    cu: 'Farmers-market', shapes: ['round', 'board', 'oval'], tech: ['roast', 'shaved', 'brown-butter', 'charred', 'dressed', 'wilted', 'torn', 'seared'], fat: 'Rapeseed oil',
    sauces: [
      S('fresh curd', '#f5f0e2', 'dots', [['Cream', 'Fresh curd or ricotta', 150]], ['SEASON', 'Season the curd with salt and a little lemon zest.', 'soft and lightly set'], 'Season fresh curd.', 'soft fresh curd', [1, 1, 1, 0, 0, 0]),
      S('herb oil', '#7f9f4e', 'drizzle', [['Herb', 'Soft herbs', 30], ['Fat', 'Rapeseed oil', 80]], ['BLITZ', 'Blitz the herbs with the oil, then strain.', 'a vivid green oil'], 'Blitz a vivid herb oil.', 'grassy herb oil', [0, 0, 0, 1, 0, 0]),
      S('cultured cream', '#f3ecd8', 'swoosh', [['Cream', 'Crème fraîche', 120], ['Acid', 'Lemon juice', 10]], ['WHIP', 'Whip the crème fraîche with lemon and salt to soft peaks.', 'soft peaks with a sheen'], 'Whip soured cream.', 'cool soured cream', [0, 1, 2, 0, 0, 0]),
    ],
    crunch: [C('hazelnut crumb', 'hazelnuts', 30, '#c09060', 'crumb'), C('toasted seeds', 'seeds', 25, '#a9a060', 'seed'), C('crisp shallots', 'crisp shallots', 20, '#c99a5a', 'crumb')],
    herbs: [H('chives and chervil', 10, '#6f9f4e', 'micro'), H('tarragon', 6, '#7f9f6e'), H('pea shoots', 15, '#8fbf6a', 'micro')],
    acids: [{ row: ['Cider vinegar', 15], finish: 'a clean apple sharpness' }, { row: ['Lemon', 50], finish: 'a bright lemony finish', garnish: 'zest' }],
    heat: [{ row: ['Cracked black pepper', 2], finish: 'a peppery finish', garnish: 'crumb' }],
  },
]
