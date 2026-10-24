// The share video's soundtrack: the dish's station music, rendered offline for the
// clip's 7 seconds. Pure helpers here; the Strudel render lives in station-render.ts,
// fetched only when someone makes a video.

import { canEncodeAudio } from 'mediabunny'

export const AUDIO_RATE = 48_000
export const AUDIO_BITRATE = 128_000
/** Loudest sample after normalising: clear on a phone speaker, with headroom. */
export const AUDIO_PEAK = 0.6
/** The clip ends mid-loop, so the last half second fades out. */
export const FADE_SECONDS = 0.5

/** Linear fade to silence over the last `seconds`, in place. */
export function fadeTail(channels: Float32Array[], sampleRate: number, seconds = FADE_SECONDS): void {
  for (const c of channels) {
    const n = Math.min(c.length, Math.round(seconds * sampleRate)), start = c.length - n
    for (let i = start; i < c.length; i++) c[i] *= (c.length - 1 - i) / Math.max(1, n - 1)
  }
}

/** Scale every channel together so the loudest sample sits at AUDIO_PEAK, in place. */
export function normalise(channels: Float32Array[], peak = AUDIO_PEAK): void {
  let max = 0
  for (const c of channels) for (const v of c) max = Math.max(max, Math.abs(v))
  if (!max) return
  const k = peak / max
  for (const c of channels) for (let i = 0; i < c.length; i++) c[i] *= k
}

/** Whether this browser can encode AAC (what Instagram reliably accepts). Never throws. */
export async function canAddAudio(probe: () => Promise<boolean> = () => canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: AUDIO_RATE, bitrate: AUDIO_BITRATE })): Promise<boolean> {
  try {
    return await probe()
  } catch {
    return false
  }
}
