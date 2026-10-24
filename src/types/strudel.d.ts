// Strudel ships no type declarations; these are the few entry points the station uses.
declare module '@strudel/core' {
  export function evalScope(...modules: unknown[]): Promise<unknown[]>
  export function evaluate(code: string, transpiler?: unknown): Promise<{ pattern: any }>
  export function noteToMidi(note: string): number
  export function ref(accessor: () => number): any
}
declare module '@strudel/transpiler' {
  export function transpiler(code: string, options?: unknown): { output: string }
}
declare module '@strudel/mini'
declare module '@strudel/tonal'
declare module '@strudel/web' {
  export function initStrudel(options?: unknown): Promise<unknown>
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>
  export function hush(): void
  export function samples(...args: unknown[]): Promise<unknown>
  export function ref(accessor: () => number): unknown
  export function initAudio(options?: unknown): Promise<void>
  export function getAudioContext(): AudioContext
  export function setAudioContext(ctx: AudioContext): AudioContext
  export function resetGlobalEffects(): void
  export function getSuperdoughAudioController(): { output: { destinationGain: GainNode | null } }
}
