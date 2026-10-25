// The station's state at the App level, so music carries on across page changes.
// Pages say what's on screen with useStation(); the Radio tab plays and pauses.
// Strudel itself (station-engine) is fetched only when someone presses Radio.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { StationPattern } from './station'
import { ambientPattern, tracksFor, type AmbientTrack } from './station-tracks'
import { PAUSE_MS, Transitioner, type Levels, type Target } from './station-transition'

type Engine = typeof import('./station-engine')
type Importer = () => Promise<Engine>

/** Loads the engine chunk; a failed load (offline, or a tab open across a deploy) is reported, not thrown. */
export async function loadEngine(importer: Importer = () => import('./station-engine')): Promise<{ engine?: Engine; failed?: true }> {
  try {
    return { engine: await importer() }
  } catch {
    return { failed: true }
  }
}

/** What a page shows. Ambient pages don't pick a track; the station does. */
export type StationRequest =
  | { kind: 'dish'; pattern: StationPattern; take: number; draws: boolean }
  | { kind: 'welcome'; pattern: StationPattern }
  | { kind: 'ambient' }

export interface StationStatus {
  playing: boolean
  loading: boolean
  failed: boolean
  nowPlaying: string
  /** The code the station is following now. */
  code: string
  levels: () => Levels
  toggle: () => void
  prefetch: () => void
}

interface Ctx extends StationStatus { request: (r: StationRequest, title?: string) => void }

const StationContext = createContext<Ctx | null>(null)

/** Ambient tracks in a fresh shuffled order per visit (the one place randomness is fine: it isn't a dish). */
function shuffled(): AmbientTrack[] {
  const a = tracksFor('originals')
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function StationProvider({ children, loadEngine: importer }: { children: ReactNode; loadEngine?: Importer }) {
  const engine = useRef<Engine | null>(null)
  const loading = useRef<Promise<{ engine?: Engine; failed?: true }> | null>(null)
  const tr = useMemo(() => new Transitioner({ evaluate: code => engine.current?.playCode(code), now: () => performance.now() }), [])
  const order = useMemo(shuffled, [])
  const [track, setTrack] = useState(0)
  const [state, setState] = useState({ playing: false, loading: false, failed: false })
  const [shown, setShown] = useState<{ req: StationRequest; title: string }>({ req: { kind: 'ambient' }, title: '' })
  const stopTimer = useRef<ReturnType<typeof setTimeout>>()

  const target: Target = useMemo(() => {
    const r = shown.req
    return r.kind === 'ambient' ? { kind: 'ambient', pattern: ambientPattern(order[track % order.length]) } : r
  }, [shown, order, track])

  useEffect(() => { tr.set(target) }, [tr, target])

  // Rotate the ambient set while it's playing.
  useEffect(() => {
    if (target.kind !== 'ambient' || !state.playing) return
    const t = setTimeout(() => setTrack(i => i + 1), order[track % order.length].minutes * 60_000)
    return () => clearTimeout(t)
  }, [target.kind, state.playing, track, order])

  const fetchEngine = useCallback(() => (loading.current ??= loadEngine(importer).then(r => {
    if (r.engine) engine.current = r.engine
    else loading.current = null // let a later press try again
    return r
  })), [importer])

  const audio = useRef<AudioContext>()
  /** A start in progress; a second press while it's pending cancels it. */
  const pending = useRef<{ cancelled: boolean } | null>(null)

  /** Create and resume the audio context right here, inside the tap: iPhones only allow it in the gesture. */
  const unlock = () => {
    if (typeof AudioContext === 'undefined') return undefined
    audio.current ??= new AudioContext()
    void audio.current.resume()
    return audio.current
  }

  const fail = useCallback(() => {
    pending.current = null
    setState({ playing: false, loading: false, failed: true })
  }, [])

  const start = useCallback((e: Engine, ctx: AudioContext | undefined, ticket: { cancelled: boolean }) => {
    clearTimeout(stopTimer.current)
    e.startEngine(tr, ctx).then(() => {
      if (ticket.cancelled) return e.stopEngine()
      pending.current = null
      tr.play()
      setState({ playing: true, loading: false, failed: false })
    }, fail)
  }, [tr, fail])

  const toggle = useCallback(() => {
    if (pending.current) {
      pending.current.cancelled = true
      pending.current = null
      setState(s => ({ ...s, loading: false }))
      return
    }
    if (tr.playing) {
      tr.pause()
      setState(s => ({ ...s, playing: false }))
      stopTimer.current = setTimeout(() => engine.current?.stopEngine(), PAUSE_MS + 50)
      return
    }
    const ctx = unlock()
    const ticket = { cancelled: false }
    pending.current = ticket
    setState(s => ({ ...s, loading: true, failed: false }))
    if (engine.current) return start(engine.current, ctx, ticket)
    void fetchEngine().then(r => {
      if (ticket.cancelled) return
      if (r.engine) start(r.engine, ctx, ticket)
      else fail()
    })
  }, [tr, start, fetchEngine, fail])

  useEffect(() => () => { clearTimeout(stopTimer.current); if (tr.playing) engine.current?.stopEngine() }, [tr])

  const request = useCallback((req: StationRequest, title = '') => setShown({ req, title }), [])

  const nowPlaying = target.kind === 'ambient' ? order[track % order.length].title : target.kind === 'welcome' ? 'Welcome' : shown.title

  const value: Ctx = {
    ...state,
    nowPlaying,
    code: target.pattern.code,
    levels: () => tr.levels(),
    toggle,
    prefetch: () => { void fetchEngine() },
    request,
  }
  return <StationContext.Provider value={value}>{children}</StationContext.Provider>
}

function useCtx(): Ctx {
  const c = useContext(StationContext)
  if (!c) throw new Error('useStation needs a <StationProvider>')
  return c
}

/** Tell the station what this page shows. Re-runs only when the music would change. */
export function useStation(req: StationRequest | null, title?: string): void {
  const { request } = useCtx()
  const key = !req ? '' : req.kind === 'ambient' ? 'ambient' : req.kind + (req.kind === 'dish' ? `#${req.take}` : '') + '\n' + req.pattern.code
  const latest = useRef({ req, title })
  latest.current = { req, title }
  useEffect(() => {
    if (latest.current.req) request(latest.current.req, latest.current.title)
  }, [key, title, request])
}

export function useStationStatus(): StationStatus {
  return useCtx()
}
