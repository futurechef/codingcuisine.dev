// The station's ambient set: what plays on pages without one dish (Field guide, Parts).
// Each track is plain Strudel code: paste one into https://strudel.cc to tune it by ear,
// then paste it back. Rules of the house: one setcpm between 15 and 20, slow attacks,
// nothing loud up front. It should sit behind someone cooking.

import type { StationPattern } from './station'

export interface AmbientTrack { id: string; title: string; code: string; minutes: number }

export const AMBIENT: readonly AmbientTrack[] = [
  {
    id: 'simmer',
    title: 'Simmer',
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
    minutes: 3,
    code: `// Rest the pan: almost nothing, settling down
setcpm(15)
stack(
  n("<0 ~ 4 ~>").scale("A3:dorian").s("triangle").attack(1).release(4).slow(2).velocity(.5),
  n("[0,7]").scale("A2:dorian").s("sine").attack(4).release(6).slow(8).velocity(.5)
).room(.6).roomsize(5)`,
  },
]

/** An ambient track as the station plays it: steady, no build-up. */
export function ambientPattern(t: AmbientTrack): StationPattern {
  const cpm = Number(/setcpm\(([\d.]+)\)/.exec(t.code)?.[1] ?? 16)
  return { code: t.code, parts: [], cpm, label: 'Ambient' }
}
