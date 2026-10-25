// The station's ambient styles: what plays on pages without one dish (Field guide, Parts).
// Each track is plain Strudel code: paste one into https://strudel.cc to tune it by ear,
// then paste it back. Rules of the house: one setcpm between 15 and 20, slow attacks,
// nothing loud up front. It should sit behind someone cooking.
//
// Styles: Chef's Table (station-tracks-classic.ts), Eno and Mix (station-tracks-eno.ts), and
// the Originals below. New tracks are written for the recorded instruments, s("cellos") and
// so on; the code sound swaps each sample for its stand-in synth (SAMPLE_STANDIN).

import { SAMPLES, SAMPLE_STANDIN, type SampleName } from './instruments'
import type { StationPattern } from './station'
import type { Sound, Style } from './station-settings'
import { CHEFS_TABLE } from './station-tracks-classic'
import { ENO, MIX } from './station-tracks-eno'

export interface AmbientTrack {
  id: string
  title: string
  /** What a Chef's Table track is based on: "after Satie, Gymnopédie No. 1". */
  after?: string
  style: Style
  minutes: number
  /** Written for the recorded instruments. */
  code: string
}

const ORIGINALS: readonly AmbientTrack[] = [
  {
    id: 'simmer',
    title: 'Simmer',
    style: 'originals',
    minutes: 4,
    code: `// Simmer: a low bubbling pad, small notes rising like steam
setcpm(16)
stack(
  n("<0 [0,4] 2 [0,3]>").scale("D3:minor:pentatonic").s("sawtooth").attack(2).release(4).lpf(600).slow(2).velocity(.6),
  n(irand(6).segment(4)).scale("D5:minor:pentatonic").degradeBy(.7).s("sine").decay(.4).sustain(0).velocity(.4)
).room(.6).roomsize(4).delay(.2).delaytime(.375).delayfeedback(.35)`,
  },
  {
    id: 'proving',
    title: 'Proving dough',
    style: 'originals',
    minutes: 5,
    code: `// Proving dough: warm, slow, rising by a step every few bars
setcpm(15)
stack(
  n("<0 1 2 1>").scale("F3:lydian").s("triangle").attack(1.5).release(3).slow(2).velocity(.7),
  n("<[0,4] [1,5]>").scale("F2:lydian").s("sine").attack(3).release(5).slow(4).velocity(.6)
).room(.5).roomsize(5)`,
  },
  {
    id: 'mise',
    title: 'Mise',
    style: 'originals',
    minutes: 3,
    code: `// Mise: everything in its place, an even pluck over a soft floor
setcpm(18)
stack(
  n("0 2 4 2").scale("G4:major:pentatonic").s("triangle").decay(.4).sustain(0).lpf(2200).velocity(.5),
  n("<0 [0,4]>").scale("G2:major:pentatonic").s("sine").attack(2).release(4).slow(2).velocity(.6)
).room(.4).roomsize(3).delay(.15).delaytime(.25).delayfeedback(.3)`,
  },
  {
    id: 'low-oven',
    title: 'Low oven',
    style: 'originals',
    minutes: 5,
    code: `// Low oven: a long drone with glass tones, for a slow braise
setcpm(15)
stack(
  n("[0,4]").scale("E2:aeolian").s("sawtooth").attack(3).release(6).lpf(450).slow(4).velocity(.6),
  n("<4 ~ 2 ~ 6 ~ 3 ~>").scale("E5:aeolian").s("sine").decay(.9).sustain(0).velocity(.4)
).room(.7).roomsize(6)`,
  },
  {
    id: 'steam',
    title: 'Steam',
    style: 'originals',
    minutes: 4,
    code: `// Steam: breath and bells, light as a lid lifting
setcpm(17)
stack(
  n("0").s("pink").attack(1).release(2).lpf(800).slow(2).velocity(.2),
  n("<0 4 2 5>").scale("C5:major:pentatonic").s("sine").fm(2).fmh(3.5).decay(1.2).sustain(0).velocity(.4),
  n("<0 [0,4]>").scale("C3:major:pentatonic").s("triangle").attack(2).release(4).slow(2).velocity(.5)
).room(.6).roomsize(4).delay(.25).delaytime(.5).delayfeedback(.3)`,
  },
  {
    id: 'rest',
    title: 'Rest the pan',
    style: 'originals',
    minutes: 3,
    code: `// Rest the pan: almost nothing, settling down
setcpm(15)
stack(
  n("<0 ~ 4 ~>").scale("A3:dorian").s("triangle").attack(1).release(4).slow(2).velocity(.5),
  n("[0,7]").scale("A2:dorian").s("sine").attack(4).release(6).slow(8).velocity(.5)
).room(.6).roomsize(5)`,
  },
]

export const TRACKS: readonly AmbientTrack[] = [...MIX, ...CHEFS_TABLE, ...ENO, ...ORIGINALS]

export function tracksFor(style: Style): AmbientTrack[] {
  return TRACKS.filter(t => t.style === style)
}

const SAMPLE_CALL = /\bs\("([a-z]+)"\)/g

/** The track's code in the given sound: as written for recorded, stand-in synths for code. */
export function trackCode(t: AmbientTrack, sound: Sound): string {
  if (sound === 'recorded') return t.code
  return t.code.replace(SAMPLE_CALL, (call, name: string) =>
    (SAMPLES as readonly string[]).includes(name) ? SAMPLE_STANDIN[name as SampleName] : call)
}

/** Where a style's fixed rotation starts today (`day` = days since the epoch), so it varies by day. */
export function startIndex(n: number, day: number): number {
  return n > 0 ? ((day % n) + n) % n : 0
}

/** An ambient track as the station plays it: steady, no build-up. */
export function ambientPattern(t: AmbientTrack, sound: Sound = 'code'): StationPattern {
  const code = trackCode(t, sound)
  const cpm = Number(/setcpm\(([\d.]+)\)/.exec(code)?.[1] ?? 16)
  return { code, parts: [], cpm, label: 'Ambient' }
}
