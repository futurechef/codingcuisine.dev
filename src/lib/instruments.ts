import type { Sound } from './station-settings'

// The station's instruments: every voice the music uses, by name.
// Each is a Strudel sound chain that follows a note pattern, e.g. n("0 2").scale(...).<chain>.
// Add an instrument with one line. Keep gain out of the chain: the station owns loudness
// (`velocity` for balance is fine).
//
// Every instrument also has a RECORDED voicing, played on the self-hosted samples under
// public/station/ (see strudel.json there). The Radio's Sound setting picks one or the other.

export const INSTRUMENTS = {
  /** Soft sawtooth bed, filtered warm. */
  pad: 's("sawtooth").attack(1.5).release(3).lpf(700)',
  /** Slow sine swell, the floor of the room. */
  drone: 's("sine").attack(3).release(5)',
  /** Short triangle pluck. */
  pluck: 's("triangle").decay(.4).sustain(0)',
  /** Koto-ish: a brighter pluck that rings a little longer. */
  koto: 's("triangle").decay(.6).sustain(0).lpf(2400)',
  /** Clear sine tone with a long tail. */
  glass: 's("sine").decay(.9).sustain(0)',
  /** Small FM bell. */
  bell: 's("sine").fm(2).fmh(3.5).decay(1.2).sustain(0)',
  /** A soft click, for crunch. */
  tick: 's("square").decay(.03).sustain(0).lpf(1800)',
  /** Breathy noise wash. */
  breath: 's("pink").attack(.5).release(1).lpf(900)',
  /** Round low triangle. */
  bass: 's("triangle").attack(.3).release(1.5).lpf(400)',
  /** Tanpura-like: buzzy sawtooth drone through a low filter. */
  tanpura: 's("sawtooth").attack(2).release(4).lpf(500)',
  /** Tiny high sine blips. */
  sparkle: 's("sine").decay(.25).sustain(0)',
  /** Mellow triangle with a slow attack. */
  warm: 's("triangle").attack(.2).release(1)',
} as const

export type Instrument = keyof typeof INSTRUMENTS

/** The recorded instruments, by sample name (public/station/strudel.json). */
export const SAMPLES = ['piano', 'violins', 'violas', 'cellos', 'contrabass', 'harp'] as const
export type SampleName = (typeof SAMPLES)[number]

/** Each instrument played on recorded samples. Clicks and breath stay synthesised. */
export const RECORDED: Record<Instrument, string> = {
  pad: 's("violins").attack(1.5).release(3).lpf(2400)',
  drone: 's("cellos").attack(3).release(5)',
  pluck: 's("harp").release(1)',
  koto: 's("harp").release(1.4).lpf(3200)',
  glass: 's("piano").release(1.5)',
  bell: 's("piano").release(2)',
  tick: INSTRUMENTS.tick,
  breath: INSTRUMENTS.breath,
  bass: 's("contrabass").attack(.3).release(1.5)',
  tanpura: 's("cellos").attack(2).release(4).lpf(1200)',
  sparkle: 's("piano").release(.8)',
  warm: 's("violas").attack(.2).release(1)',
}

/**
 * What stands in for each recorded sample in the code sound. Ambient tracks are written
 * for the recorded instruments; their code version swaps s("cellos") for this, and so on.
 */
export const SAMPLE_STANDIN: Record<SampleName, string> = {
  piano: 's("triangle").decay(1.2).sustain(0)',
  violins: 's("sawtooth").lpf(1400)',
  violas: 's("sawtooth").lpf(1000)',
  cellos: 's("sawtooth").lpf(600)',
  contrabass: 's("triangle").lpf(400)',
  harp: 's("triangle").decay(.6).sustain(0)',
}

/** The sound chain for an instrument in the given sound; throws on a name that isn't registered. */
export function voice(name: string, sound: Sound = 'code'): string {
  if (!Object.prototype.hasOwnProperty.call(INSTRUMENTS, name)) throw new Error(`Unknown instrument: ${name}`)
  return (sound === 'recorded' ? RECORDED : INSTRUMENTS)[name as Instrument]
}
