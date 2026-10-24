// Cuisine colour worlds: each kitchen gets its own paper and accent.
// Ink and body text never change, so reading stays easy; palettes.test.ts
// holds every pairing to WCAG AA contrast in light and dark.

export type Mode = 'light' | 'dark'

export interface Palette {
  paper: string
  surf: string
  rule: string
  acc: string
  btn: string
  btnHover: string
  onBtn: string
}

type Base = [paper: string, surf: string, acc: string]

/** Body text colours, shared by every palette (they match styles.css). */
export const INK: Record<Mode, { ink: string; mute: string }> = {
  light: { ink: '#3a2418', mute: '#6e5a4c' },
  dark: { ink: '#f3ead8', mute: '#bba995' },
}

const CREAM = '#fbf6ea'

// [paper, surface, accent] per cuisine. Light accents are deep; dark accents are bright.
const WORLDS: Record<string, Record<Mode, Base>> = {
  // Aegean blue on sun-bleached limestone
  Mediterranean: { light: ['#f6f1e6', '#ebe3d2', '#1d5f8a'], dark: ['#14191d', '#1d252b', '#6fb0d8'] },
  // Pomodoro red on warm parchment
  Italian: { light: ['#fbf1e2', '#f0e3cd', '#a8322a'], dark: ['#1d1412', '#2a1c19', '#ec8a74'] },
  // Sumac on sand
  Levantine: { light: ['#f6ecda', '#ecdec6', '#7f2f4f'], dark: ['#1c1416', '#2a1d21', '#dc8aa8'] },
  // Harissa terracotta on clay cream
  'North African': { light: ['#f8ead9', '#eedbc4', '#a4471f'], dark: ['#1e1510', '#2c1f17', '#e8946a'] },
  // Turmeric on ghee cream
  Indian: { light: ['#fbf0d9', '#f1e2c2', '#865a00'], dark: ['#1d1810', '#2a2316', '#e0b04a'] },
  // Indigo on washi
  Japanese: { light: ['#f3f0e8', '#e7e2d6', '#2b4a7a'], dark: ['#13161c', '#1c212b', '#8fb0e0'] },
  // Gochujang on hanji
  Korean: { light: ['#f6f2ec', '#ebe4da', '#b23a1f'], dark: ['#1c1512', '#2a1e19', '#f08a62'] },
  // Pandan green on rice paper
  'Southeast Asian': { light: ['#f2f2e2', '#e5e6d1', '#2f6b3f'], dark: ['#131a15', '#1b261e', '#7cc48f'] },
  // Rosa mexicano on masa
  Mexican: { light: ['#fbefdc', '#f2e0c6', '#b0275f'], dark: ['#1d1318', '#2b1c23', '#ef7fae'] },
  // Slate sea on birch
  Nordic: { light: ['#eef0ec', '#e1e5e0', '#3e5a6a'], dark: ['#141a1c', '#1d2629', '#93b6c4'] },
  // Garden green on linen
  'Farmers-market': { light: ['#f4efe2', '#e8e1cf', '#4f6b2a'], dark: ['#161a12', '#20271a', '#a8c47a'] },
}

/** Cuisines with a colour world. */
export const PALETTES = WORLDS

const DEFAULT: Record<Mode, Palette> = {
  light: { paper: CREAM, surf: '#f1e8d3', rule: '#d9cdb3', acc: '#b8452e', btn: '#b8452e', btnHover: '#9c3622', onBtn: CREAM },
  dark: { paper: '#1d1410', surf: '#2a1e18', rule: '#4a3a30', acc: '#e5806a', btn: '#b8452e', btnHover: '#9c3622', onBtn: CREAM },
}

// ---- Colour maths -------------------------------------------------------------

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Mix towards black (amount < 0) or white (amount > 0); amount in [-1, 1]. */
export function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255
  return toHex(rgb(hex).map(v => v + (target - v) * Math.abs(amount)))
}

// ---- Palette -------------------------------------------------------------------

export function palette(cu: string | undefined, mode: Mode): Palette {
  const w = cu ? WORLDS[cu]?.[mode] : undefined
  if (!w) return DEFAULT[mode]
  const [paper, surf, acc] = w
  return {
    paper,
    surf,
    rule: mode === 'light' ? shade(surf, -0.1) : shade(surf, 0.12),
    acc,
    btn: acc,
    // Light: deep accent darkens on hover, cream text. Dark: bright accent lightens on hover, paper-dark text.
    btnHover: mode === 'light' ? shade(acc, -0.15) : shade(acc, 0.15),
    onBtn: mode === 'light' ? CREAM : paper,
  }
}
