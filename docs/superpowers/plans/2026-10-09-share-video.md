# Share Video and Image Implementation Plan (Part A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors can share any dish to Instagram as a 7-second MP4 of the plate being drawn (post 4:5 or story 9:16), or as a PNG still, from a Share button on the Plate and Card pages.

**Architecture:**
- `share-frame.ts` draws one frame at time *t* onto any 2D canvas context. It has no DOM
  access, so part C can run it on the server.
- `share-video.ts` loads fonts, turns the frozen plate SVG into images, and records an
  offscreen canvas with `MediaRecorder` in real time. It can also render the PNG still.
- `ShareSheet.tsx` is the modal UI. Recording and sharing are two steps (record, then a
  separate tap to share), so mobile browsers still count the share as a user gesture.

**Tech Stack:** React 18 + TypeScript + Vite, Canvas 2D, MediaRecorder, the Web Share API, vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-share-seo-design.md`, section A.

## Global Constraints

- **Canvas sizes:** post 1080 × 1350; story 1080 × 1920, with the 1080 × 1350 content block centred vertically.
- **Timing:** the plate draws over `DRAW_SECONDS` (3.9 s, from `src/lib/plate.ts`), the word and title fade in from 3.4 s to 4.4 s, and the clip lasts 7.0 s.
- **Frame rate and bitrate:** 30 fps, about 8 Mbps.
- **MIME preference:** `video/mp4;codecs=avc1.42E01E`, then `video/mp4;codecs=avc1`, then `video/mp4`. If none is supported, there's no video; the PNG still is offered.
- **Background** `#fbf6ea`, **ink** `#3a2418`, **muted** `#6e5a4c`.
- **Fonts:** Newsreader (serif, italic for the word), Inter, JetBrains Mono. They're already loaded by `index.html` from Google Fonts.
- **Filenames:** `platedraw-<no>-<slug>-<post|story>.mp4` and `.png`.
- **Plate markup:** only `plateMarkup()` output goes into an SVG image. Never put user text (the seed word or title) into SVG markup; text is drawn with `fillText`.
- **Checks before every commit:** `npm test` and `npm run build`.

## Review Focus

1. **Very long seed words and titles:** a 60-character word must shrink to fit the width, and a long title must stop at 2 lines with an ellipsis. Never clip off-canvas. (Task 1)
2. **Fonts not loaded when recording starts:** the clip must not be baked with a fallback serif. The renderer waits for all four font faces before the first frame. (Task 2)
3. **Tab hidden mid-recording:** timers get throttled and the clip would come out short or broken. Recording aborts with a clear message instead. (Task 2)
4. **Browser with no MP4 recording (Firefox):** the video button is disabled with a reason, and the still image still works. (Task 2 tests `pickMime`; Task 3 wires the UI.)
5. **Share after a 7-second recording loses the user gesture (iOS):** the share call must not fail silently. It's a two-step flow, and if sharing is refused it falls back to downloading. (Task 2 tests `shareOrDownload`; Task 3 wires the two steps.)

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/share-frame.ts` (create) | Layout constants and `drawShareFrame()`: pure drawing, given a context and a plate image |
| `src/lib/share-frame.test.ts` (create) | Frame tests against a recording fake context |
| `src/lib/share-video.ts` (create) | Font loading, plate-image cache, MIME choice, recording, the still image, share or download |
| `src/lib/share-video.test.ts` (create) | `pickMime`, `ensureFonts`, `guardVisibility` and `shareOrDownload` tests |
| `src/lib/download.ts` (modify) | Export `saveBlob()` and `slug()` |
| `src/components/ShareSheet.tsx` (create) | The modal: preview, format toggle, record or share video, share image |
| `src/screens/Home.tsx`, `src/screens/Card.tsx` (modify) | Share buttons |
| `src/styles.css` (modify) | Share sheet styles |

---

### Task 1: The share frame renderer

**Files:**
- Create: `src/lib/share-frame.ts`
- Test: `src/lib/share-frame.test.ts`

**Interfaces:**
- Consumes: `Dish` from `src/lib/dish.ts` (`no`, `seed`, `title`, `cu`, `chips`); `plateMarkup`, `DRAW_SECONDS` from `src/lib/plate.ts`; `PlateLook` from `src/lib/look.ts`.
- Produces:
  ```ts
  export type ShareFormat = 'post' | 'story'
  export const SHARE_SIZE: Record<ShareFormat, { w: number; h: number }>
  export const CLIP_SECONDS = 7
  export const FPS = 30
  export interface Ctx2D { /* subset of CanvasRenderingContext2D, below */ }
  export function plateFrameSvg(look: PlateLook, t: number): string
  export function textAlpha(t: number): number
  export function totalMinutes(chips: string[]): number
  export function fitFont(ctx: Ctx2D, text: string, family: string, start: number, min: number, maxWidth: number): number
  export function wrapLines(ctx: Ctx2D, text: string, maxWidth: number, maxLines: number): string[]
  export function drawShareFrame(ctx: Ctx2D, d: Dish, format: ShareFormat, t: number, plate: CanvasImageSource | null): void
  ```

- [ ] **Step 0: Branch from an up-to-date main**

```bash
git checkout main && git pull && git checkout -b feat/share-video
```

- [ ] **Step 1: Write the failing tests**

`src/lib/share-frame.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { dish } from './dish'
import { CLIP_SECONDS, drawShareFrame, fitFont, plateFrameSvg, SHARE_SIZE, textAlpha, totalMinutes, wrapLines, type Ctx2D } from './share-frame'

/** Records every call; measureText is 0.55 × font size per character. */
function fakeCtx() {
  const calls: { op: string; args: unknown[]; font: string; alpha: number }[] = []
  const ctx = {
    fillStyle: '', font: '10px serif', textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1, letterSpacing: '0px',
    measureText: (s: string) => ({ width: s.length * 0.55 * parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)![1]) }),
    save() {}, restore() {},
    fillRect: (...a: unknown[]) => calls.push({ op: 'fillRect', args: a, font: ctx.font, alpha: ctx.globalAlpha }),
    fillText: (...a: unknown[]) => calls.push({ op: 'fillText', args: a, font: ctx.font, alpha: ctx.globalAlpha }),
    drawImage: (...a: unknown[]) => calls.push({ op: 'drawImage', args: a, font: ctx.font, alpha: ctx.globalAlpha }),
  }
  return { ctx: ctx as unknown as Ctx2D, calls }
}
const PLATE = {} as CanvasImageSource
const texts = (calls: ReturnType<typeof fakeCtx>['calls']) => calls.filter(c => c.op === 'fillText')

describe('timing', () => {
  it('fades text in between 3.4 s and 4.4 s', () => {
    expect(textAlpha(0)).toBe(0)
    expect(textAlpha(3.4)).toBe(0)
    expect(textAlpha(3.9)).toBeCloseTo(0.5)
    expect(textAlpha(4.4)).toBe(1)
    expect(textAlpha(CLIP_SECONDS)).toBe(1)
  })
  it('totals prep and cook minutes', () => {
    expect(totalMinutes(['Prep 15 min', 'Cook 35 min', 'Serves 2'])).toBe(50)
  })
})

describe('plate svg', () => {
  it('is a standalone frozen frame with no user text', () => {
    const d = dish('<script>alert(1)</script> leek')
    const svg = plateFrameSvg(d, 2)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('viewBox="0 0 300 270"')
    expect(svg).not.toContain('script')
    expect(svg).not.toContain(d.seed)
  })
})

describe('drawShareFrame', () => {
  it('is deterministic for the same dish, format and time', () => {
    const a = fakeCtx(), b = fakeCtx()
    drawShareFrame(a.ctx, dish('bike rap'), 'post', 2.5, PLATE)
    drawShareFrame(b.ctx, dish('bike rap'), 'post', 2.5, PLATE)
    expect(JSON.stringify(a.calls)).toBe(JSON.stringify(b.calls))
  })

  it('draws background, header, plate and footer at t = 0 but no word or title yet', () => {
    const { ctx, calls } = fakeCtx()
    const d = dish('bike rap')
    drawShareFrame(ctx, d, 'post', 0, PLATE)
    expect(calls[0]).toMatchObject({ op: 'fillRect', args: [0, 0, 1080, 1350] })
    expect(calls.some(c => c.op === 'drawImage')).toBe(true)
    const shown = texts(calls).filter(c => c.alpha > 0).map(c => c.args[0])
    expect(shown).toContain(`PLATEDRAW · No. ${d.no}`)
    expect(shown).toContain('codingcuisine.dev')
    expect(shown).not.toContain(d.seed)
  })

  it('shows word and title fully at the end', () => {
    const { ctx, calls } = fakeCtx()
    const d = dish('bike rap')
    drawShareFrame(ctx, d, 'post', CLIP_SECONDS, PLATE)
    const word = texts(calls).find(c => c.args[0] === d.seed)!
    expect(word.alpha).toBe(1)
    expect(word.font).toContain('italic')
  })

  it('centres the post block inside the story canvas', () => {
    const post = fakeCtx(), story = fakeCtx()
    drawShareFrame(post.ctx, dish('fig'), 'post', 5, PLATE)
    drawShareFrame(story.ctx, dish('fig'), 'story', 5, PLATE)
    const offset = (SHARE_SIZE.story.h - SHARE_SIZE.post.h) / 2
    const y = (cs: typeof post.calls) => cs.find(c => c.op === 'drawImage')!.args[2] as number
    expect(y(story.calls) - y(post.calls)).toBe(offset)
  })

  it('skips the plate cleanly when no image is ready', () => {
    const { ctx, calls } = fakeCtx()
    drawShareFrame(ctx, dish('fig'), 'post', 1, null)
    expect(calls.some(c => c.op === 'drawImage')).toBe(false)
  })
})

describe('long text (Review Focus 1)', () => {
  it('shrinks a 60-character word to fit the width', () => {
    const { ctx } = fakeCtx()
    const word = 'x'.repeat(60)
    const size = fitFont(ctx, word, 'italic 400 {}px Newsreader', 112, 40, 936)
    expect(size).toBeLessThan(112)
    expect(size).toBeGreaterThanOrEqual(40)
    expect(word.length * 0.55 * size).toBeLessThanOrEqual(936)
  })

  it('wraps a long title to at most 2 lines and ends with an ellipsis', () => {
    const { ctx } = fakeCtx()
    ctx.font = '400 44px Newsreader'
    const lines = wrapLines(ctx, 'Salt-baked Jerusalem artichokes, preserved lemon dressing, toasted buckwheat and a great deal more', 936, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    for (const l of lines) expect(ctx.measureText(l).width).toBeLessThanOrEqual(936)
  })

  it('never draws text wider than the content width for 200 generated dishes', () => {
    for (let i = 0; i < 200; i++) {
      const { ctx, calls } = fakeCtx()
      drawShareFrame(ctx, dish('w' + i * 7919), 'story', CLIP_SECONDS, PLATE)
      for (const c of texts(calls)) {
        ctx.font = c.font
        expect(ctx.measureText(c.args[0] as string).width, c.args[0] as string).toBeLessThanOrEqual(936)
      }
    }
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/share-frame.test.ts`
Expected: FAIL, "Failed to resolve import ./share-frame"

- [ ] **Step 3: Implement `src/lib/share-frame.ts`**

```ts
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
  fitFont(ctx, d.seed, 'italic 400 {}px Newsreader', 112, 40, CONTENT)
  ctx.fillText(d.seed, cx, oy + 1022)
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/share-frame.test.ts`
Expected: PASS (all tests). If "never draws text wider" fails on the footer for a long cuisine, the footer can stay as is (the longest cuisine footer is about 600px), so recheck the measure in the test.

- [ ] **Step 5: Run the full checks and commit**

Run: `npm test && npm run build`
Expected: all tests pass; build ✓.
```bash
git add src/lib/share-frame.ts src/lib/share-frame.test.ts
git commit -m "feat(share): frame renderer for the share video and image"
```

---

### Task 2: Recording, still image, and share-or-download

**Files:**
- Create: `src/lib/share-video.ts`
- Test: `src/lib/share-video.test.ts`
- Modify: `src/lib/download.ts` (export `saveBlob`, `slug`)

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces:
  ```ts
  export const FONT_SPECS: string[]
  export function ensureFonts(load: (spec: string) => Promise<unknown>): Promise<void>
  export function pickMime(isSupported: (m: string) => boolean): string | null
  export function canRecordMp4(): boolean
  export function guardVisibility(doc: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>, onHidden: () => void): () => void
  export class ShareError extends Error { kind: 'unsupported' | 'hidden' }
  export function shareFilename(d: Dish, format: ShareFormat, ext: 'mp4' | 'png'): string
  export function createFrameRenderer(d: Dish, format: ShareFormat): { draw(ctx: Ctx2D, t: number): Promise<void> }
  export function renderStill(d: Dish, format: ShareFormat): Promise<Blob>
  export function recordShareVideo(d: Dish, format: ShareFormat, opts?: { onProgress?: (p: number) => void; signal?: AbortSignal }): Promise<Blob>
  export function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'>
  ```
  In `download.ts`: `export function saveBlob(name: string, blob: Blob): void` and `export function slug(s: string): string`.

- [ ] **Step 1: Write the failing tests**

`src/lib/share-video.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dish } from './dish'
import { ensureFonts, FONT_SPECS, guardVisibility, pickMime, shareFilename, shareOrDownload } from './share-video'

afterEach(() => vi.unstubAllGlobals())

describe('pickMime (Review Focus 4)', () => {
  it('prefers H.264 MP4', () => {
    expect(pickMime(() => true)).toBe('video/mp4;codecs=avc1.42E01E')
  })
  it('falls back through the MP4 variants', () => {
    expect(pickMime(m => m === 'video/mp4')).toBe('video/mp4')
  })
  it('returns null for a WebM-only browser such as Firefox', () => {
    expect(pickMime(m => m.startsWith('video/webm'))).toBeNull()
  })
})

describe('ensureFonts (Review Focus 2)', () => {
  it('waits for every face used in the frame before resolving', async () => {
    const asked: string[] = []
    let release!: () => void
    const gate = new Promise<void>(r => (release = r))
    const done = ensureFonts(spec => { asked.push(spec); return gate })
    let resolved = false
    void done.then(() => (resolved = true))
    await Promise.resolve()
    expect(resolved).toBe(false)
    release()
    await done
    expect(asked.sort()).toEqual([...FONT_SPECS].sort())
    expect(FONT_SPECS).toEqual(expect.arrayContaining(['italic 400 112px Newsreader', '400 44px Newsreader', '400 24px "JetBrains Mono"', '500 26px "JetBrains Mono"']))
  })
})

describe('guardVisibility (Review Focus 3)', () => {
  it('calls onHidden when the tab is hidden, and the returned function unsubscribes', () => {
    const listeners: Record<string, () => void> = {}
    const doc = { hidden: false, addEventListener: (n: string, f: () => void) => (listeners[n] = f), removeEventListener: vi.fn() }
    const onHidden = vi.fn()
    const stop = guardVisibility(doc as never, onHidden)
    doc.hidden = true
    listeners.visibilitychange()
    expect(onHidden).toHaveBeenCalledOnce()
    stop()
    expect(doc.removeEventListener).toHaveBeenCalled()
  })
  it('fires immediately if the tab is already hidden', () => {
    const onHidden = vi.fn()
    guardVisibility({ hidden: true, addEventListener() {}, removeEventListener() {} } as never, onHidden)
    expect(onHidden).toHaveBeenCalledOnce()
  })
})

describe('shareFilename', () => {
  it('uses number, slug and format', () => {
    const d = dish('bike rap')
    expect(shareFilename(d, 'story', 'mp4')).toBe(`platedraw-${d.no}-bike-rap-story.mp4`)
  })
})

describe('shareOrDownload (Review Focus 5)', () => {
  const blob = new Blob(['x'], { type: 'video/mp4' })
  function stubDownload() {
    const click = vi.fn()
    vi.stubGlobal('document', { createElement: () => ({ click, remove() {}, set href(_: string) {}, set download(_: string) {} }), body: { appendChild() {} } })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL() {} })
    return click
  }

  it('shares through the system sheet when files can be shared', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })
    expect(await shareOrDownload(blob, 'a.mp4')).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })
  it('treats a dismissed sheet as cancelled, not an error', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })) })
    expect(await shareOrDownload(blob, 'a.mp4')).toBe('cancelled')
  })
  it('falls back to a download when sharing is not allowed (lost user gesture)', async () => {
    const click = stubDownload()
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })) })
    expect(await shareOrDownload(blob, 'a.mp4')).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
  it('downloads when files cannot be shared (desktop)', async () => {
    const click = stubDownload()
    vi.stubGlobal('navigator', {})
    expect(await shareOrDownload(blob, 'a.mp4')).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/share-video.test.ts`
Expected: FAIL, "Failed to resolve import ./share-video"

- [ ] **Step 3: Export the helpers from `src/lib/download.ts`**

Replace the private `save` and `slug` with exported helpers. Keep `save` for the existing callers:
```ts
export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function save(name: string, type: string, body: string) {
  saveBlob(name, new Blob([body], { type }))
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dish'
}
```

- [ ] **Step 4: Implement `src/lib/share-video.ts`**

```ts
// Turns a dish into a share video (MP4) or still image (PNG), and hands it to the
// system share sheet or a download.

import type { Dish } from './dish'
import { saveBlob, slug } from './download'
import { CLIP_SECONDS, drawShareFrame, FPS, plateFrameSvg, SHARE_SIZE, type Ctx2D, type ShareFormat } from './share-frame'
import { DRAW_SECONDS } from './plate'

export const FONT_SPECS = ['italic 400 112px Newsreader', '400 44px Newsreader', '400 24px "JetBrains Mono"', '500 26px "JetBrains Mono"']
const MIMES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']

export class ShareError extends Error {
  constructor(public kind: 'unsupported' | 'hidden', message: string) { super(message) }
}

export async function ensureFonts(load: (spec: string) => Promise<unknown>): Promise<void> {
  await Promise.all(FONT_SPECS.map(spec => load(spec)))
}

export function pickMime(isSupported: (m: string) => boolean): string | null {
  return MIMES.find(m => isSupported(m)) ?? null
}

export function canRecordMp4(): boolean {
  return typeof MediaRecorder !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
    && pickMime(m => MediaRecorder.isTypeSupported(m)) !== null
}

export function guardVisibility(doc: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>, onHidden: () => void): () => void {
  const on = () => { if (doc.hidden) onHidden() }
  doc.addEventListener('visibilitychange', on)
  on()
  return () => doc.removeEventListener('visibilitychange', on)
}

export function shareFilename(d: Dish, format: ShareFormat, ext: 'mp4' | 'png'): string {
  return `platedraw-${d.no}-${slug(d.seed)}-${format}.${ext}`
}

async function svgImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Draws frames; plate images are made per 1/FPS step and reused once the drawing is finished. */
export function createFrameRenderer(d: Dish, format: ShareFormat) {
  const fonts = ensureFonts(spec => document.fonts.load(spec))
  const cache = new Map<number, Promise<HTMLImageElement>>()
  const plateAt = (t: number) => {
    const step = Math.min(Math.round(t * FPS), Math.ceil(DRAW_SECONDS * FPS) + 1)
    if (!cache.has(step)) {
      if (cache.size > 8) cache.delete(cache.keys().next().value!)
      cache.set(step, svgImage(plateFrameSvg(d, step / FPS)))
    }
    return cache.get(step)!
  }
  return {
    async draw(ctx: Ctx2D, t: number) {
      await fonts
      const img = await plateAt(t)
      drawShareFrame(ctx, d, format, t, img)
    },
  }
}

function canvasFor(format: ShareFormat) {
  const c = document.createElement('canvas')
  c.width = SHARE_SIZE[format].w
  c.height = SHARE_SIZE[format].h
  return c
}

export async function renderStill(d: Dish, format: ShareFormat): Promise<Blob> {
  const c = canvasFor(format)
  await createFrameRenderer(d, format).draw(c.getContext('2d')!, CLIP_SECONDS)
  return new Promise((ok, fail) => c.toBlob(b => (b ? ok(b) : fail(new Error('Could not encode the image'))), 'image/png'))
}

export async function recordShareVideo(
  d: Dish, format: ShareFormat, opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<Blob> {
  const mime = typeof MediaRecorder === 'undefined' ? null : pickMime(m => MediaRecorder.isTypeSupported(m))
  if (!mime) throw new ShareError('unsupported', 'This browser can’t record MP4 video. Try Chrome, Edge or Safari, or share the image.')
  const c = canvasFor(format)
  const ctx = c.getContext('2d')!
  const renderer = createFrameRenderer(d, format)
  await renderer.draw(ctx, 0) // fonts and first frame ready before recording starts

  const stream = c.captureStream(FPS)
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }

  return new Promise<Blob>((resolve, reject) => {
    let failed: Error | null = null
    const stopAll = () => { stopGuard(); stream.getTracks().forEach(tr => tr.stop()) }
    const fail = (e: Error) => { failed = e; if (rec.state !== 'inactive') rec.stop() }
    const stopGuard = guardVisibility(document, () => fail(new ShareError('hidden', 'Recording stopped because the tab was hidden. Keep this tab open while it records.')))
    opts.signal?.addEventListener('abort', () => fail(new DOMException('Recording cancelled', 'AbortError')))
    rec.onstop = () => { stopAll(); failed ? reject(failed) : resolve(new Blob(chunks, { type: mime })) }

    rec.start(250)
    const start = performance.now()
    const tick = async () => {
      if (failed || rec.state === 'inactive') return
      const t = (performance.now() - start) / 1000
      if (t >= CLIP_SECONDS) { opts.onProgress?.(1); rec.stop(); return }
      await renderer.draw(ctx, t)
      opts.onProgress?.(t / CLIP_SECONDS)
      setTimeout(tick, Math.max(0, start + (Math.floor(t * FPS) + 1) * (1000 / FPS) - performance.now()))
    }
    void tick()
  })
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = globalThis.navigator as Navigator | undefined
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // NotAllowedError (lost user gesture) and anything else: fall through to a download
    }
  }
  saveBlob(filename, blob)
  return 'downloaded'
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/lib/share-video.test.ts`
Expected: PASS. If `new File` is missing in the Node test environment, Node 20+ has a global `File`; check `node -v` ≥ 20.

- [ ] **Step 6: Run the full checks and commit**

Run: `npm test && npm run build`
Expected: all pass. Existing downloads still type-check.
```bash
git add src/lib/share-video.ts src/lib/share-video.test.ts src/lib/download.ts
git commit -m "feat(share): MP4 recording, PNG still and share-or-download"
```

---

### Task 3: Share sheet UI and buttons

**Files:**
- Create: `src/components/ShareSheet.tsx`
- Modify: `src/screens/Home.tsx` (the `plate-foot` row, about line 46), `src/screens/Card.tsx` (next to "Print card", about line 77), `src/styles.css` (append a `/* ---- Share sheet ---- */` block before `/* ---- Footer ---- */`)

**Interfaces:**
- Consumes: `canRecordMp4`, `createFrameRenderer`, `recordShareVideo`, `renderStill`, `shareFilename`, `shareOrDownload`, `ShareError` (Task 2); `SHARE_SIZE`, `CLIP_SECONDS`, `ShareFormat` (Task 1).
- Produces: `export function ShareSheet({ d, onClose }: { d: Dish; onClose: () => void })` and `export function ShareButton({ d }: { d: Dish })`.

- [ ] **Step 1: Implement `src/components/ShareSheet.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import type { Dish } from '../lib/dish'
import { CLIP_SECONDS, SHARE_SIZE, type ShareFormat } from '../lib/share-frame'
import { canRecordMp4, createFrameRenderer, recordShareVideo, renderStill, ShareError, shareFilename, shareOrDownload } from '../lib/share-video'

type Status = { kind: 'idle' } | { kind: 'recording'; p: number } | { kind: 'ready'; blob: Blob } | { kind: 'error'; msg: string }

export function ShareSheet({ d, onClose }: { d: Dish; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const preview = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<ShareFormat>('post')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)
  const video = canRecordMp4()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => () => abort.current?.abort(), [])

  // Live preview: loops the clip (or shows the last frame with reduced motion).
  useEffect(() => {
    const c = preview.current!
    c.width = SHARE_SIZE[format].w
    c.height = SHARE_SIZE[format].h
    const ctx = c.getContext('2d')!
    const r = createFrameRenderer(d, format)
    let stop = false, start = performance.now()
    const loop = async () => {
      if (stop) return
      const t = reduced ? CLIP_SECONDS : ((performance.now() - start) / 1000) % CLIP_SECONDS
      await r.draw(ctx, t)
      if (!reduced) requestAnimationFrame(loop)
    }
    void loop()
    return () => { stop = true }
  }, [d, format, reduced])

  // A new format or dish invalidates a recorded clip.
  useEffect(() => { abort.current?.abort(); setStatus({ kind: 'idle' }); setNote('') }, [d, format])

  const record = async () => {
    abort.current = new AbortController()
    setStatus({ kind: 'recording', p: 0 })
    try {
      const blob = await recordShareVideo(d, format, { signal: abort.current.signal, onProgress: p => setStatus({ kind: 'recording', p }) })
      setStatus({ kind: 'ready', blob })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return setStatus({ kind: 'idle' })
      setStatus({ kind: 'error', msg: e instanceof ShareError ? e.message : 'Recording failed. Try again, or share the image.' })
    }
  }

  const send = async (blob: Blob, ext: 'mp4' | 'png') => {
    const how = await shareOrDownload(blob, shareFilename(d, format, ext))
    setNote(how === 'downloaded' ? `Saved ${shareFilename(d, format, ext)}` : how === 'shared' ? 'Shared.' : '')
  }

  const close = () => { abort.current?.abort(); dialog.current?.close(); onClose() }

  return (
    <dialog ref={dialog} className="share" onClose={close} aria-labelledby="share-title">
      <div className="share__head">
        <h2 id="share-title" className="eyebrow">SHARE · {d.title.toUpperCase()}</h2>
        <button type="button" className="btn btn--ghost" onClick={close} aria-label="Close">Close</button>
      </div>
      <div className="share__body">
        <canvas ref={preview} className={'share__preview share__preview--' + format} aria-label={`Preview of the ${format} video`} />
        <div className="share__side">
          <div className="filters" role="group" aria-label="Format">
            {(['post', 'story'] as const).map(f => (
              <button key={f} type="button" className="chip chip--button" aria-pressed={format === f} onClick={() => setFormat(f)} disabled={status.kind === 'recording'}>
                {f === 'post' ? 'Post 4:5' : 'Story 9:16'}
              </button>
            ))}
          </div>

          {status.kind === 'ready' ? (
            <button type="button" className="btn btn--primary" onClick={() => send(status.blob, 'mp4')}>Share video</button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={record} disabled={!video || status.kind === 'recording'}>
              {status.kind === 'recording' ? `Recording… ${Math.round(status.p * 100)}%` : 'Make video'}
            </button>
          )}
          {status.kind === 'recording' && <progress className="share__progress" value={status.p} max={1} />}
          {!video && <p className="mono-label share__why">VIDEO NEEDS CHROME, EDGE OR SAFARI. THE IMAGE WORKS EVERYWHERE.</p>}
          {status.kind === 'error' && <p className="mono-label share__why" role="alert">{status.msg}</p>}

          <button type="button" className="btn btn--secondary" onClick={async () => send(await renderStill(d, format), 'png')} disabled={status.kind === 'recording'}>
            Share image
          </button>
          <p className="mono-label share__note" aria-live="polite">{note}</p>
          <p className="mono-label share__hint">7-SECOND MP4 · {SHARE_SIZE[format].w} × {SHARE_SIZE[format].h} · KEEP THIS TAB OPEN WHILE IT RECORDS</p>
        </div>
      </div>
    </dialog>
  )
}

export function ShareButton({ d }: { d: Dish }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>Share</button>
      {open && <ShareSheet d={d} onClose={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Add the buttons**

In `src/screens/Home.tsx`, import `ShareButton` and put it beside "Replay drawing" in the `plate-foot` row:
```tsx
import { ShareButton } from '../components/ShareSheet'
// …
<div className="plate-foot">
  <span className="mono-label">PLATE → SAUCE → MAIN → CRUNCH → HERBS</span>
  <span className="plate-foot__actions">
    <ShareButton d={d} />
    <button type="button" className="btn btn--ghost" onClick={() => k.plate(k.plated)}>Replay drawing</button>
  </span>
</div>
```
In `src/screens/Card.tsx`, import `ShareButton` and wrap the print button:
```tsx
import { ShareButton } from '../components/ShareSheet'
// …
<div className="card__actions">
  <button type="button" className="btn btn--secondary print-btn" onClick={() => print()}>Print card</button>
  <ShareButton d={d} />
</div>
```

- [ ] **Step 3: Add the styles**

Append to `src/styles.css`, before `/* ---- Footer ---- */`:
```css
/* ---- Share sheet ---- */
.plate-foot__actions, .card__actions { display: flex; gap: 20px; align-items: center; }
.card__actions .print-btn { margin-top: 0; }
.card__actions { margin-top: 32px; }
.share {
  width: min(880px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 20px 24px 24px;
  border: 1px solid var(--rule);
  background: var(--bg);
  color: var(--ink);
}
.share::backdrop { background: #0008; }
.share__head { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.share__head .eyebrow { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.share__body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; margin-top: 12px; }
@media (min-width: 720px) { .share__body { grid-template-columns: minmax(0, 300px) minmax(0, 1fr); } }
.share__preview { width: 100%; height: auto; display: block; border: 1px solid var(--rule); background: #fbf6ea; }
.share__preview--story { max-height: 60dvh; width: auto; margin: 0 auto; }
.share__side { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.share__side .filters { margin: 0; }
.share__progress { width: 100%; accent-color: var(--acc); }
.share__why { color: var(--acc); }
@media print { .share { display: none; } }
```

- [ ] **Step 4: Run the checks**

Run: `npm test && npm run build`
Expected: all tests pass; build ✓.

- [ ] **Step 5: Commit**
```bash
git add src/components/ShareSheet.tsx src/screens/Home.tsx src/screens/Card.tsx src/styles.css
git commit -m "feat(share): share sheet with video and image on Plate and Card"
```

---

### Task 4: Browser verification and PR

**Files:** none changed unless verification finds a bug. Fix it in the owning task's file and add a test where one is possible.

- [ ] **Step 1: Serve the build**

Run (in the background): `npx vite preview --port 4321 --strictPort`

- [ ] **Step 2: Record and check a post clip in Chrome (Playwright)**

Open `http://localhost:4321/plate?w=bike%20rap` at 1280 × 900. Click **Share**, then **Make video**. Wait about 9 s until **Share video** appears. Then evaluate in the page to check the clip:
```js
async () => {
  const blob = window.__lastShareBlob // set temporarily, see note
  const v = document.createElement('video'); v.src = URL.createObjectURL(blob); await new Promise(r => v.onloadedmetadata = r)
  if (v.duration === Infinity) { v.currentTime = 1e9; await new Promise(r => v.ontimeupdate = r) }
  return { type: blob.type, w: v.videoWidth, h: v.videoHeight, duration: v.duration }
}
```
Expected: type starts with `video/mp4`, 1080 × 1350, duration 7 ± 0.3.
Note: to reach the blob, temporarily add `;(window as any).__lastShareBlob = blob` in `record()`. Remove it before committing, and grep for `__lastShareBlob` to confirm it's gone.

- [ ] **Step 3: Repeat for a story clip.** Expected: 1080 × 1920, 7 ± 0.3 s.

- [ ] **Step 4: Still image.** Click **Share image** in desktop Chrome. Expected: a download of `platedraw-<no>-bike-rap-story.png`, with the note "Saved …".

- [ ] **Step 5: Check the review-focus cases by hand**
  - **Long word:** `/plate?w=` with a 60-character word. In the preview, the word fits and the title stops at 2 lines.
  - **Tab hidden:** start recording, then switch tabs in Playwright (`page.context().newPage()` and bring it to the front). Expected: the error reads "Recording stopped because the tab was hidden…".
  - **No MP4 recording:** emulate it with `MediaRecorder.isTypeSupported = () => false` before opening the sheet. Expected: **Make video** is disabled with the reason, and **Share image** still works.
  - **Double tap:** clicking **Make video** twice starts only one recording, because the button is disabled while recording.
  - **Reduced motion:** with `reducedMotion: 'reduce'`, the preview shows the final frame.

- [ ] **Step 6: Screenshots.** Take the sheet at 1280 wide and at 390 wide in dark mode, the final post and story frames, and check the console has no errors. Delete `.playwright-mcp/` afterwards.

- [ ] **Step 7: Push and open the PR**
```bash
git push -u origin feat/share-video
gh pr create --base main --title "Share video and image for Instagram" --body "<summary of what shipped, the checks above with their results, and the preview link once the bot posts it>"
```
Wait for the preview deploy, then report the preview link to the user. Merge only when the user says so.
