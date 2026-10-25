// The only module that imports Strudel. Loaded on demand, the first time someone
// presses Radio, so visitors who never play it never download it.

import {
  evaluate, getAudioContext, getSuperdoughAudioController, hush, initAudio, initStrudel, loadBuffer, resetGlobalEffects, samples, setAudioContext,
} from '@strudel/web'
import { MAX_PART_GAIN } from './station'
import type { Kitchen } from './station-settings'
import { KITCHEN_TC, kitchenGain, samplesIn, warmSamples } from './station-sounds'
import type { Transitioner } from './station-transition'

let started: Promise<unknown> | undefined
let timer: ReturnType<typeof setInterval> | undefined
let volume = 1

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
  timer = setInterval(() => {
    const master = t.levels().master
    output()?.gain.setTargetAtTime(master * volume, audio.currentTime, 0.05)
    kitchen?.gain.gain.setTargetAtTime(kitchenGain(master, volume), audio.currentTime, KITCHEN_TC)
  }, 50)
  if (wantedKitchen !== 'off' && !kitchen) void setKitchen(wantedKitchen)
}

/** The listener's volume, 0–1, on top of the station's own level. */
export function setVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v))
}

type SampleMap = { _base: string } & Record<string, Record<string, string> | string>
let sampleMap: Promise<SampleMap> | undefined

/**
 * Make sure every recorded sample this code uses is loaded, so a swap never starts with
 * missing notes. Registers the self-hosted map (public/station/strudel.json) the first time.
 * Rejects if anything fails to load; the station then stays on the code sound.
 */
export async function ensureSounds(code: string): Promise<void> {
  const names = samplesIn(code)
  if (!names.length) return
  sampleMap ??= fetch('/station/strudel.json')
    .then(r => { if (!r.ok) throw new Error(`strudel.json: ${r.status}`); return r.json() as Promise<SampleMap> })
    .then(async m => { await samples(m); return m })
    .catch(err => { sampleMap = undefined; throw err })
  const map = await sampleMap
  const ac = getAudioContext()
  const files = names.flatMap(name => Object.values(map[name] as Record<string, string>).map(path => ({ name, url: map._base + path })))
  await warmSamples(
    files.map(f => f.url),
    url => fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`) }),
    url => loadBuffer(url, ac, files.find(f => f.url === url)!.name),
  )
}

let wantedKitchen: Kitchen = 'off'
let kitchen: { name: Kitchen; src: AudioBufferSourceNode; gain: GainNode } | undefined
const kitchenBuffers = new Map<Kitchen, Promise<AudioBuffer>>()

function dropKitchen(fade: boolean) {
  const old = kitchen
  kitchen = undefined
  if (!old) return
  if (!fade) return old.src.stop()
  old.gain.gain.setTargetAtTime(0, old.src.context.currentTime, 0.6)
  setTimeout(() => { old.src.stop(); old.gain.disconnect() }, 3000)
}

/**
 * The kitchen layer: a quiet looped recording under the music (rain, café), loaded only
 * when chosen. It follows the station's level, so it fades with pauses and swaps.
 */
export async function setKitchen(k: Kitchen): Promise<void> {
  wantedKitchen = k
  if (kitchen?.name === k) return
  dropKitchen(true)
  if (k === 'off' || !timer) return // not playing: it starts with the station
  const ac = getAudioContext()
  if (!kitchenBuffers.has(k)) {
    kitchenBuffers.set(k, fetch(`/station/kitchen/${k}.mp3`)
      .then(r => { if (!r.ok) throw new Error(`kitchen ${k}: ${r.status}`); return r.arrayBuffer() })
      .then(b => ac.decodeAudioData(b))
      .catch(err => { kitchenBuffers.delete(k); throw err }))
  }
  const buffer = await kitchenBuffers.get(k)!
  if (wantedKitchen !== k || kitchen || !timer) return // changed or stopped while loading
  const gain = ac.createGain()
  gain.gain.value = 0
  const src = ac.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.connect(gain).connect(ac.destination)
  src.start()
  kitchen = { name: k, src, gain }
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
  dropKitchen(false)
  if (started) hush()
}
