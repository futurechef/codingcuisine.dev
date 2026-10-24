// Turns a dish into a share video (MP4) or still image (PNG), and hands it to the
// system share sheet or a download.
//
// Video is encoded frame by frame with WebCodecs (via Mediabunny), not recorded live:
// every frame gets an exact timestamp, so the clip is always 7.0 s, renders faster
// than real time and keeps going if the tab is hidden.

import { BufferTarget, CanvasSource, canEncodeVideo, Mp4OutputFormat, Output } from 'mediabunny'
import type { Dish } from './dish'
import { prefersShareSheet } from './device'
import { saveBlob, slug } from './download'
import type { PlateLook } from './look'
import { CLIP_SECONDS, drawShareFrame, FPS, plateFrameSvg, SHARE_SIZE, totalMinutes, type Ctx2D, type ShareFormat } from './share-frame'
import { DRAW_SECONDS } from './plate'

export const FONT_SPECS = ['italic 400 112px Newsreader', '400 44px Newsreader', '400 24px "JetBrains Mono"', '500 26px "JetBrains Mono"']
const BITRATE = 8_000_000

export class ShareError extends Error {
  constructor(public kind: 'unsupported', message: string) { super(message) }
}

/** Every string drawn on a frame, so font loading fetches the subsets those glyphs need (e.g. latin-ext for "żurek"). */
export function shareText(d: Dish): string {
  return [`PLATEDRAW · No. ${d.no}`, d.seed, d.title, `${d.cu.toUpperCase()} · ${totalMinutes(d.chips)} MIN`, 'codingcuisine.dev'].join(' ')
}

export async function ensureFonts(load: (spec: string, text: string) => Promise<unknown>, text: string): Promise<void> {
  await Promise.all(FONT_SPECS.map(spec => load(spec, text)))
}

/** Whether this browser can encode H.264 at the largest share size. */
export async function canMakeVideo(probe: typeof canEncodeVideo = canEncodeVideo): Promise<boolean> {
  try {
    return await probe('avc', { width: SHARE_SIZE.story.w, height: SHARE_SIZE.story.h, bitrate: BITRATE })
  } catch {
    return false
  }
}

/** Memoizes the encoder probe: one probe per page, shared by the sheet and every video it makes. */
export function createVideoProbe(probe: typeof canEncodeVideo = canEncodeVideo): () => Promise<boolean> {
  let result: Promise<boolean> | null = null
  return () => (result ??= canMakeVideo(probe))
}

export const videoSupported = createVideoProbe()

/** Timestamps (s) of every frame in the clip. */
export function frameTimes(): number[] {
  return Array.from({ length: Math.round(CLIP_SECONDS * FPS) }, (_, i) => i / FPS)
}

export function shareFilename(d: Dish, format: ShareFormat, ext: 'mp4' | 'png'): string {
  return `platedraw-${d.no}-${slug(d.seed)}-${format}.${ext}`
}

async function svgImage(svg: string): Promise<CanvasImageSource> {
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

type LoadImage = (svg: string) => Promise<CanvasImageSource>
type LoadFont = (spec: string, text: string) => Promise<unknown>

/**
 * Plate images, one per 1/FPS step of the drawing, then the finished plate reused.
 * Every step is kept (about 118 small SVG images), so a looping preview decodes each
 * once; scope it to one renderer so it is dropped with the dish/format. A failed load
 * is not kept, so the next frame tries again.
 */
export function createPlateImages(look: PlateLook, load: LoadImage = svgImage) {
  const last = Math.ceil(DRAW_SECONDS * FPS) + 1
  const cache = new Map<number, Promise<CanvasImageSource>>()
  return (t: number): Promise<CanvasImageSource> => {
    const step = Math.max(0, Math.min(Math.round(t * FPS), last))
    let p = cache.get(step)
    if (!p) {
      p = load(plateFrameSvg(look, step / FPS))
      cache.set(step, p)
      p.catch(() => { if (cache.get(step) === p) cache.delete(step) })
    }
    return p
  }
}

/** Draws frames. `isCurrent` is checked after the async loads, so a caller that has moved on gets no stale paint. */
export function createFrameRenderer(
  d: Dish, format: ShareFormat,
  deps: { loadImage?: LoadImage; loadFont?: LoadFont } = {},
) {
  const loadFont = deps.loadFont ?? ((spec, text) => document.fonts.load(spec, text))
  const fonts = ensureFonts(loadFont, shareText(d))
  const plateAt = createPlateImages(d, deps.loadImage)
  return {
    async draw(ctx: Ctx2D, t: number, isCurrent: () => boolean = () => true) {
      await fonts
      const img = await plateAt(t)
      if (!isCurrent()) return
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

export async function makeShareVideo(
  d: Dish, format: ShareFormat, opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<Blob> {
  if (!(await videoSupported())) throw new ShareError('unsupported', 'This browser can’t make MP4 video. Try a recent Chrome, Edge, Safari or Firefox, or share the image.')
  const c = canvasFor(format)
  const ctx = c.getContext('2d')!
  const renderer = createFrameRenderer(d, format)
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const source = new CanvasSource(c, { codec: 'avc', bitrate: BITRATE, keyFrameInterval: 2 })
  output.addVideoTrack(source, { frameRate: FPS })
  await output.start()
  const times = frameTimes()
  try {
    for (let i = 0; i < times.length; i++) {
      if (opts.signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      await renderer.draw(ctx, times[i])
      await source.add(times[i], 1 / FPS)
      opts.onProgress?.((i + 1) / times.length)
    }
    await output.finalize()
  } catch (e) {
    await output.cancel().catch(() => {})
    throw e
  }
  return new Blob([output.target.buffer!], { type: 'video/mp4' })
}

export async function shareOrDownload(blob: Blob, filename: string, preferShare = prefersShareSheet()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = globalThis.navigator as Navigator | undefined
  if (preferShare && nav?.canShare?.({ files: [file] })) {
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
