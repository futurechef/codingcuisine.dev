// The only module that imports Strudel. Loaded on demand, the first time someone
// presses Radio, so visitors who never play it never download it.

import {
  evaluate, getAudioContext, getSuperdoughAudioController, hush, initAudio, initStrudel, resetGlobalEffects, setAudioContext,
} from '@strudel/web'
import { MAX_PART_GAIN } from './station'
import type { Transitioner } from './station-transition'

let started: Promise<unknown> | undefined
let timer: ReturnType<typeof setInterval> | undefined

const output = () => getSuperdoughAudioController().output.destinationGain

/** Silence the output at once; the level poll brings it back up smoothly. */
function quiet() {
  const g = output()
  if (g) g.gain.value = 0
}

/**
 * Start (or resume) sound. `ctx` is the audio context the Radio tap created and resumed
 * inside the gesture (iPhones allow it nowhere else); Strudel is handed that context.
 */
export async function startEngine(t: Transitioner, ctx?: AudioContext): Promise<void> {
  if (ctx) setAudioContext(ctx)
  const audio = getAudioContext()
  void audio.resume()
  // Every layer plays at the part level; when it enters is set in the code itself.
  ;(globalThis as Record<string, unknown>).layer = () => MAX_PART_GAIN
  started ??= Promise.all([initStrudel(ctx ? { audioContext: ctx } : {}), initAudio()]).catch(err => {
    started = undefined // let a later press try again
    throw err
  })
  await started
  quiet()
  clearInterval(timer)
  // The master level drives the output gain smoothly; polling also lets the
  // transitioner swap pieces on time when no notes are being scheduled.
  timer = setInterval(() => output()?.gain.setTargetAtTime(t.levels().master, audio.currentTime, 0.05), 50)
}

/**
 * Play a piece of station code from its start. The swap happens with the output faded
 * out: stopping restarts the cycle at 0 (so layers enter on cue), and resetting the
 * effects cuts the old piece's ringing notes, so they can't come back with the new one.
 */
export function playCode(code: string): void {
  hush()
  resetGlobalEffects()
  quiet()
  void evaluate(code).catch(err => console.warn('[station] could not play pattern', err))
}

/** Silence and stop the scheduler (after the pause fade has finished). */
export function stopEngine(): void {
  clearInterval(timer)
  timer = undefined
  if (started) hush()
}
