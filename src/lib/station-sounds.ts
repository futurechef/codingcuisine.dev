// Small pure helpers for the engine's recorded sounds (kept out of station-engine so they
// can be tested without Strudel).

import { SAMPLES, type SampleName } from './instruments'

/** The recorded samples a piece of code uses, once each, in order of first use. */
export function samplesIn(code: string): SampleName[] {
  const found: SampleName[] = []
  for (const [, name] of code.matchAll(/\bs\("([a-z]+)"\)/g)) {
    if ((SAMPLES as readonly string[]).includes(name) && !found.includes(name as SampleName)) found.push(name as SampleName)
  }
  return found
}

/**
 * Load every sample file: download each one first (checking it really arrived), and only
 * then hand it to the loader. Strudel's loader remembers a failed URL for good, so a
 * dropped request must never reach it, or "Try again" could never succeed.
 */
export async function warmSamples(urls: string[], fetchOk: (url: string) => Promise<void>, load: (url: string) => Promise<unknown>): Promise<void> {
  await Promise.all(urls.map(u => fetchOk(u)))
  await Promise.all(urls.map(u => load(u)))
}

/** How fast (seconds, time constant) the kitchen layer follows the station's level: quick enough to be gone by the end of a pause fade. */
export const KITCHEN_TC = 0.2

/** The kitchen layer's level against the music: always underneath it. */
export const KITCHEN_LEVEL = 0.25

/** The kitchen layer's gain for the station's current level (0–0.5) and the listener's volume (0–1). */
export function kitchenGain(master: number, volume: number): number {
  return KITCHEN_LEVEL * master * volume
}
