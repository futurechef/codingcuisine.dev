// The station's instruments: every voice the music uses, by name.
// Each is a Strudel sound chain that follows a note pattern, e.g. n("0 2").scale(...).<chain>.
// Add an instrument with one line. Keep gain out of the chain: the station owns loudness
// (`velocity` for balance is fine). A recorded sample can go here later as s("name") once
// its files are hosted under public/station/.

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

/** The sound chain for an instrument; throws on a name that isn't registered. */
export function voice(name: string): string {
  if (!Object.prototype.hasOwnProperty.call(INSTRUMENTS, name)) throw new Error(`Unknown instrument: ${name}`)
  return INSTRUMENTS[name as Instrument]
}
