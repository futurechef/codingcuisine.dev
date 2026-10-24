// Test helper: evaluates station code with Strudel's pattern engine, no audio,
// so a broken pattern fails CI instead of reaching anyone's ears.
import * as core from '@strudel/core'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import { transpiler } from '@strudel/transpiler'

let ready: Promise<unknown> | undefined
const g = globalThis as Record<string, unknown>

async function query(code: string, cycles: number) {
  ready ??= core.evalScope(core, mini, tonal)
  await ready
  g.setcpm = () => {} // tempo doesn't change which events exist per cycle
  g.layer = () => 1 // the engine supplies live levels; full here
  const { pattern } = await core.evaluate(code, transpiler)
  if (!pattern || typeof pattern.queryArc !== 'function') throw new Error('code did not produce a pattern')
  return pattern.queryArc(0, cycles) as { value: Record<string, unknown> }[]
}

/** How many events the code makes in [0, cycles). Throws if it doesn't parse or evaluate. */
export async function haps(code: string, cycles = 4): Promise<number> {
  return (await query(code, cycles)).length
}

/** The MIDI notes the code plays in [0, cycles) (events without a pitch are skipped). */
export async function notesIn(code: string, cycles = 4): Promise<number[]> {
  return (await query(code, cycles))
    .map(h => h.value.note)
    .filter(n => n !== undefined)
    .map(n => (typeof n === 'string' ? core.noteToMidi(n) : Number(n)))
}

/** When notes start (in cycles) in [0, cycles) — only the ones the scheduler would trigger: onset inside the window. */
export async function onsets(code: string, cycles = 4): Promise<number[]> {
  return (await query(code, cycles) as unknown as { whole?: { begin: { valueOf(): number } } }[])
    .filter(h => h.whole)
    .map(h => Number(h.whole!.begin.valueOf()))
    .filter(t => t >= 0)
}
