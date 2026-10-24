// The contract between the dish generator (dish.ts) and the plate drawing (plate.ts).
// A PlateLook says *what* is on the plate; plate.ts decides exactly how it's drawn,
// varying details deterministically from `seed`.

export const PLATE_SHAPES = ['round', 'coupe', 'square', 'oval', 'slate', 'bowl', 'board'] as const
export type Shape = (typeof PLATE_SHAPES)[number]

/** How the main component sits on the plate. */
export const ARRANGEMENTS = ['logs', 'pile', 'fan', 'quenelle', 'scatter', 'stack', 'slices', 'torn', 'nest', 'mound', 'swirl', 'egg', 'halves', 'omelette'] as const
export type Kind = (typeof ARRANGEMENTS)[number]

/** How the sauce goes down. */
export const SAUCE_STYLES = ['pool', 'swoosh', 'dots', 'drizzle', 'none'] as const
export type SauceStyle = (typeof SAUCE_STYLES)[number]

/** Small top-layer finishes. */
export const GARNISHES = ['leaf', 'micro', 'seed', 'crumb', 'oil', 'flake', 'zest', 'chilli', 'face'] as const
export type Garnish = (typeof GARNISHES)[number]

export interface PlateLook {
  shape: Shape
  kind: Kind
  /** Hex colours only — they go straight into SVG markup. */
  sauce: string
  main: string
  /** Seeds the drawing's small variations (positions, wobble, rotation). Defaults to a hash of the look. */
  seed?: string
  sauceStyle?: SauceStyle
  /** Crunch layer colour (hex). */
  crunch?: string
  /** Herb / garnish layer colour (hex). */
  herb?: string
  /** 0–3 garnishes, drawn in the last layer. */
  garnish?: Garnish[]
}
