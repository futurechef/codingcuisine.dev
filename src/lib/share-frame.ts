// One frame of the share video/image, drawn onto any 2D canvas context.
// No DOM access, so the same code can run on a server canvas later.

import type { Dish } from './dish'
import type { PlateLook } from './look'
import { DRAW_SECONDS, plateMarkup } from './plate'

export type ShareFormat = 'post' | 'story'
export const SHARE_SIZE: Record<ShareFormat, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
}
export const CLIP_SECONDS = 7
export const FPS = 30

const PAPER = '#fbf6ea', INK = '#3a2418', MUTE = '#6e5a4c'
const W = 1080, BLOCK_H = 1350, MARGIN = 72, CONTENT = W - 2 * MARGIN
const PLATE_W = 840, PLATE_H = 756, PLATE_TOP = 170
const FADE_FROM = DRAW_SECONDS - 0.5, FADE_TO = DRAW_SECONDS + 0.5

/** The parts of CanvasRenderingContext2D this module uses. */
export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  globalAlpha: number
  letterSpacing?: string
  measureText(text: string): { width: number }
  save(): void
  restore(): void
  fillRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
  drawImage(image: CanvasImageSource, x: number, y: number, w: number, h: number): void
}

/** A standalone SVG document of the plate frozen at time t. Geometry and hex colours only. */
export function plateFrameSvg(look: PlateLook, t: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 270" width="${PLATE_W}" height="${PLATE_H}">${plateMarkup(look, { kind: 'frozen', t })}</svg>`
}

export function textAlpha(t: number): number {
  return Math.max(0, Math.min(1, (t - FADE_FROM) / (FADE_TO - FADE_FROM)))
}

export function totalMinutes(chips: string[]): number {
  return chips.filter(c => /^(Prep|Cook) /.test(c)).reduce((n, c) => n + parseInt(c.replace(/\D+/g, ''), 10), 0)
}

/** Largest size ≤ start (down to min) at which text fits maxWidth. `family` contains `{}` for the size. */
export function fitFont(ctx: Ctx2D, text: string, family: string, start: number, min: number, maxWidth: number): number {
  for (let size = start; size > min; size -= 2) {
    ctx.font = family.replace('{}', String(size))
    if (ctx.measureText(text).width <= maxWidth) return size
  }
  ctx.font = family.replace('{}', String(min))
  return min
}

/** Text as-is if it fits, else cut down with an ellipsis until it does. Uses ctx.font. */
export function ellipsize(ctx: Ctx2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t.trimEnd() + '…'
}

/** Greedy word wrap into at most maxLines; the last line gets an ellipsis if text remains. Uses ctx.font. */
export function wrapLines(ctx: Ctx2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (let i = 0; i < words.length; i++) {
    const next = cur ? cur + ' ' + words[i] : words[i]
    if (ctx.measureText(next).width <= maxWidth) { cur = next; continue }
    if (cur) lines.push(cur)
    cur = words[i]
    if (lines.length === maxLines - 1) {
      let last = words.slice(i).join(' ')
      if (ctx.measureText(last).width <= maxWidth) return [...lines, last]
      while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1).trimEnd()
      return [...lines, last.replace(/[,\s]+$/, '') + '…']
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function spaced(ctx: Ctx2D, em: number) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = em + 'px'
}

export function drawShareFrame(ctx: Ctx2D, d: Dish, format: ShareFormat, t: number, plate: CanvasImageSource | null): void {
  const { w, h } = SHARE_SIZE[format]
  const oy = (h - BLOCK_H) / 2
  const cx = w / 2
  ctx.save()
  ctx.globalAlpha = 1
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Header
  ctx.fillStyle = MUTE
  ctx.font = '500 26px "JetBrains Mono"'
  spaced(ctx, 4)
  ctx.fillText(`PLATEDRAW · No. ${d.no}`, cx, oy + 110)
  spaced(ctx, 0)

  // Plate
  if (plate) ctx.drawImage(plate, (w - PLATE_W) / 2, oy + PLATE_TOP, PLATE_W, PLATE_H)

  // Word and title fade in as the drawing finishes
  const a = textAlpha(t)
  ctx.globalAlpha = a
  ctx.fillStyle = INK
  fitFont(ctx, d.seed, 'italic 400 {}px Newsreader', 112, 24, CONTENT)
  ctx.fillText(ellipsize(ctx, d.seed, CONTENT), cx, oy + 1022)
  ctx.font = '400 44px Newsreader'
  wrapLines(ctx, d.title, CONTENT, 2).forEach((line, i) => ctx.fillText(line, cx, oy + 1094 + i * 54))

  // Footer
  ctx.globalAlpha = 1
  ctx.fillStyle = MUTE
  ctx.font = '400 24px "JetBrains Mono"'
  spaced(ctx, 3.5)
  ctx.fillText(`${d.cu.toUpperCase()} · ${totalMinutes(d.chips)} MIN`, cx, oy + 1238)
  ctx.font = '500 26px "JetBrains Mono"'
  ctx.fillStyle = INK
  ctx.fillText('codingcuisine.dev', cx, oy + 1286)
  spaced(ctx, 0)
  ctx.restore()
}
