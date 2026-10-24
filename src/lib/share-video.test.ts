import { afterEach, describe, expect, it, vi } from 'vitest'
import { dish } from './dish'
import { canMakeVideo, createFrameRenderer, createPlateImages, createVideoProbe, ensureFonts, FONT_SPECS, frameTimes, shareFilename, shareOrDownload, shareText } from './share-video'
import { DRAW_SECONDS } from './plate'
import { FPS, type Ctx2D } from './share-frame'

afterEach(() => vi.unstubAllGlobals())

describe('canMakeVideo (Review Focus 4)', () => {
  it('asks for H.264 at the largest (story) size', async () => {
    const probe = vi.fn().mockResolvedValue(true)
    expect(await canMakeVideo(probe)).toBe(true)
    expect(probe).toHaveBeenCalledWith('avc', expect.objectContaining({ width: 1080, height: 1920 }))
  })
  it('is false when the browser cannot encode H.264 (no WebCodecs)', async () => {
    expect(await canMakeVideo(vi.fn().mockResolvedValue(false))).toBe(false)
  })
  it('is false, not an error, when probing throws', async () => {
    expect(await canMakeVideo(vi.fn().mockRejectedValue(new Error('no VideoEncoder')))).toBe(false)
  })
})

describe('frameTimes', () => {
  it('gives exactly 7 s at 30 fps, evenly spaced from 0', () => {
    const ts = frameTimes()
    expect(ts).toHaveLength(210)
    expect(ts[0]).toBe(0)
    expect(ts[209]).toBeCloseTo(209 / 30)
    for (let i = 1; i < ts.length; i++) expect(ts[i] - ts[i - 1]).toBeCloseTo(1 / 30)
  })
})

describe('ensureFonts (Review Focus 2)', () => {
  it('waits for every face used in the frame before resolving', async () => {
    const asked: string[] = []
    let release!: () => void
    const gate = new Promise<void>(r => (release = r))
    const done = ensureFonts(spec => { asked.push(spec); return gate }, 'x')
    let resolved = false
    void done.then(() => (resolved = true))
    await Promise.resolve()
    expect(resolved).toBe(false)
    release()
    await done
    expect(asked.sort()).toEqual([...FONT_SPECS].sort())
    expect(FONT_SPECS).toEqual(expect.arrayContaining(['italic 400 112px Newsreader', '400 44px Newsreader', '400 24px "JetBrains Mono"', '500 26px "JetBrains Mono"']))
  })
  it('asks for the glyphs actually drawn, so latin-ext seeds get the real face', async () => {
    const texts: string[] = []
    await ensureFonts((_spec, text) => { texts.push(text); return Promise.resolve() }, 'żurek łosoś')
    expect(texts).toHaveLength(FONT_SPECS.length)
    for (const t of texts) expect(t).toBe('żurek łosoś')
  })
})

describe('shareText', () => {
  it('holds every string drawn on the frame, including latin-ext seed letters', () => {
    const d = dish('żurek łosoś')
    const t = shareText(d)
    for (const s of [d.seed, d.title, d.cu.toUpperCase(), String(d.no), 'codingcuisine.dev', 'PLATEDRAW', 'MIN']) expect(t).toContain(s)
    expect(t).toContain('ż')
    expect(t).toContain('ł')
  })
})

describe('createPlateImages', () => {
  const img = {} as CanvasImageSource
  const steps = Math.ceil(DRAW_SECONDS * FPS) + 2 // 0 … ceil(DRAW*FPS)+1

  it('keeps every step of the drawing, so a second pass makes no new images', async () => {
    const load = vi.fn().mockResolvedValue(img)
    const plateAt = createPlateImages(dish('bike rap'), load)
    const times = Array.from({ length: 7 * FPS }, (_, i) => i / FPS)
    for (const t of times) await plateAt(t)
    expect(load).toHaveBeenCalledTimes(steps)
    for (const t of times) await plateAt(t)
    expect(load).toHaveBeenCalledTimes(steps)
  })
  it('does not cache a failed load: the next call for that step tries again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('decode failed')).mockResolvedValue(img)
    const plateAt = createPlateImages(dish('bike rap'), load)
    await expect(plateAt(0)).rejects.toThrow('decode failed')
    await expect(plateAt(0)).resolves.toBe(img)
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('createFrameRenderer', () => {
  function fakeCtx() {
    const calls: string[] = []
    const ctx: Ctx2D = {
      fillStyle: '', font: '', textAlign: 'center', textBaseline: 'alphabetic', globalAlpha: 1,
      measureText: () => ({ width: 1 }), save() {}, restore() {},
      fillRect: () => { calls.push('fillRect') }, fillText: () => { calls.push('fillText') }, drawImage: () => { calls.push('drawImage') },
    }
    return { ctx, calls }
  }
  const deps = { loadImage: () => Promise.resolve({} as CanvasImageSource), loadFont: () => Promise.resolve() }

  it('paints a frame when still current', async () => {
    const { ctx, calls } = fakeCtx()
    await createFrameRenderer(dish('bike rap'), 'post', deps).draw(ctx, 1, () => true)
    expect(calls.length).toBeGreaterThan(0)
  })
  it('does not paint if the caller stopped caring while the image loaded', async () => {
    const { ctx, calls } = fakeCtx()
    let current = true
    const r = createFrameRenderer(dish('bike rap'), 'post', { ...deps, loadImage: async () => { current = false; return {} as CanvasImageSource } })
    await r.draw(ctx, 1, () => current)
    expect(calls).toEqual([])
  })
})

describe('createVideoProbe', () => {
  it('probes the encoder once, however many callers ask', async () => {
    const probe = vi.fn().mockResolvedValue(true)
    const supported = createVideoProbe(probe)
    expect(await Promise.all([supported(), supported()])).toEqual([true, true])
    expect(await supported()).toBe(true)
    expect(probe).toHaveBeenCalledOnce()
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
    expect(await shareOrDownload(blob, 'a.mp4', true)).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })
  it('treats a dismissed sheet as cancelled, not an error', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })) })
    expect(await shareOrDownload(blob, 'a.mp4', true)).toBe('cancelled')
  })
  it('falls back to a download when sharing is not allowed (lost user gesture)', async () => {
    const click = stubDownload()
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })) })
    expect(await shareOrDownload(blob, 'a.mp4', true)).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
  it('downloads on a desktop even when the browser could share files', async () => {
    const click = stubDownload()
    const share = vi.fn()
    vi.stubGlobal('navigator', { canShare: () => true, share })
    expect(await shareOrDownload(blob, 'a.mp4', false)).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })
  it('downloads when files cannot be shared (desktop)', async () => {
    const click = stubDownload()
    vi.stubGlobal('navigator', {})
    expect(await shareOrDownload(blob, 'a.mp4', true)).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
})
