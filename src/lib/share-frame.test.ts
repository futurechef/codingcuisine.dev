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
    const size = fitFont(ctx, word, 'italic 400 {}px Newsreader', 112, 24, 936)
    expect(size).toBeLessThan(112)
    expect(size).toBeGreaterThanOrEqual(24)
    expect(word.length * 0.55 * size).toBeLessThanOrEqual(936)
  })

  it('truncates a word that is still too wide at the smallest size, instead of clipping it', () => {
    const { ctx, calls } = fakeCtx()
    const d = { ...dish('fig'), seed: 'W'.repeat(200) }
    drawShareFrame(ctx, d, 'post', CLIP_SECONDS, PLATE)
    const word = texts(calls).find(c => (c.args[0] as string).startsWith('WWW'))!
    ctx.font = word.font
    expect(ctx.measureText(word.args[0] as string).width).toBeLessThanOrEqual(936)
    expect((word.args[0] as string).endsWith('…')).toBe(true)
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
