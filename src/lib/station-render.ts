// Renders a dish's station music offline, for the share video. Like station-engine,
// this imports Strudel and is only ever loaded with import().

import * as core from '@strudel/core'
import { transpiler } from '@strudel/transpiler'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import * as webaudio from '@strudel/webaudio'
import type { Dish } from './dish'
import { AUDIO_RATE, fadeTail, normalise } from './share-audio'
import { dishPattern, MAX_PART_GAIN } from './station'

let ready: Promise<unknown> | undefined
const g = globalThis as Record<string, unknown>

/**
 * The dish's music for the clip, from the start of the drawing (so it builds with the
 * plate, exactly as on the page), faded at the end and normalised.
 *
 * superdough plays into whatever context is current, so the offline context is swapped
 * in for the render and the previous one put back after. (Today this module gets its own
 * copy of Strudel, separate from the Radio's pre-bundled @strudel/web, so the Radio is
 * untouched; the swap-back keeps that true if the two ever share one copy.)
 */
export async function renderDishAudio(d: Dish, seconds: number): Promise<AudioBuffer> {
  ready ??= Promise.all([core.evalScope(core, mini, tonal, webaudio), webaudio.registerSynthSounds()])
  await ready
  const { code, cpm } = dishPattern(d)
  g.setcpm = () => {}
  g.layer = () => MAX_PART_GAIN
  const { pattern } = await core.evaluate(code, transpiler)
  const cps = cpm / 60

  const liveCtx = webaudio.getAudioContext()
  const liveController = webaudio.getSuperdoughAudioController()
  const ctx = new OfflineAudioContext(2, Math.round(seconds * AUDIO_RATE), AUDIO_RATE)
  try {
    webaudio.setAudioContext(ctx)
    // superdough builds a fresh controller for the current context when it has none
    // (its constructor isn't exported).
    webaudio.setSuperdoughAudioController(null)
    await webaudio.initAudio()
    const haps = (pattern.queryArc(0, seconds * cps, { _cps: cps }) as Hap[])
      .filter(h => h.hasOnset())
      .sort((a, b) => a.whole.begin.valueOf() - b.whole.begin.valueOf())
    for (const h of haps) {
      const t = h.whole.begin.valueOf() / cps
      await webaudio.superdough(h.value, t, h.duration.valueOf() / cps, cps, t)
    }
    const out = await ctx.startRendering()
    const channels = [0, 1].map(i => out.getChannelData(i))
    fadeTail(channels, AUDIO_RATE)
    normalise(channels)
    return out
  } finally {
    webaudio.setAudioContext(liveCtx)
    webaudio.setSuperdoughAudioController(liveController)
  }
}

interface Hap {
  whole: { begin: { valueOf(): number } }
  duration: { valueOf(): number }
  value: Record<string, unknown>
  hasOnset(): boolean
}
