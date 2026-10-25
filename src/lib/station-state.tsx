// The station's state at the App level, so music carries on across page changes.
// Pages say what's on screen with useStation(); the Radio tab plays and pauses.
// Strudel itself (station-engine) is fetched only when someone presses Radio.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SAMPLES } from './instruments'
import type { StationPattern } from './station'
import { loadSettings, saveSettings, type Sound, type StationSettings } from './station-settings'
import { ambientPattern, startIndex, tracksFor, type AmbientTrack } from './station-tracks'
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
  /** What an ambient track is based on ("after Satie, Gymnopédie No. 1"), if anything. */
  nowAfter?: string
  settings: StationSettings
  setSettings: (patch: Partial<StationSettings>) => void
  /** The recorded instruments are loading (the code sound plays meanwhile). */
  soundLoading: boolean
  /** The recorded instruments couldn't load; the code sound plays for this visit. */
  soundFailed: boolean
  retrySound: () => void
  /** The code the station is following now. */
  code: string
  levels: () => Levels
  toggle: () => void
  prefetch: () => void
}

interface Ctx extends StationStatus {
  request: (r: StationRequest, title?: string) => void
  /** The sound the station is actually playing in: recorded only once its samples are loaded. */
  sound: Sound
}

const StationContext = createContext<Ctx | null>(null)

/** Days since the epoch, in local time: the ambient rotation starts somewhere new each day. */
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000)

/** A style's tracks in their fixed rotation, starting at today's track. */
function rotation(style: StationSettings['style']): AmbientTrack[] {
  const t = tracksFor(style)
  const i = startIndex(t.length, today())
  return [...t.slice(i), ...t.slice(0, i)]
}

/** Code that names every recorded sample: the whole set loads at once, so later swaps never wait. */
const ALL_SAMPLES = SAMPLES.map(n => `s("${n}")`).join(' ')

type Shown = { req: StationRequest; title: string }

export function StationProvider({ children, loadEngine: importer }: { children: ReactNode; loadEngine?: Importer }) {
  const engine = useRef<Engine | null>(null)
  const loading = useRef<Promise<{ engine?: Engine; failed?: true }> | null>(null)
  const tr = useMemo(() => new Transitioner({ evaluate: code => engine.current?.playCode(code), now: () => performance.now() }), [])
  const [settings, setSettingsState] = useState(loadSettings)
  const latestSettings = useRef(settings)
  latestSettings.current = settings
  const order = useMemo(() => rotation(settings.style), [settings.style])
  const [track, setTrack] = useState(0)
  const [state, setState] = useState({ playing: false, loading: false, failed: false })
  const [engineReady, setEngineReady] = useState(false)
  const [samples, setSamples] = useState<'none' | 'loading' | 'ready' | 'failed'>('none')
  const sound: Sound = settings.sound === 'recorded' && samples === 'ready' ? 'recorded' : 'code'
  const [latest, setLatest] = useState<Shown>({ req: { kind: 'ambient' }, title: '' })
  /** What was playing when Follow the page was turned off. */
  const [frozen, setFrozen] = useState<Shown | null>(null)
  const shown = settings.follow ? latest : frozen ?? latest
  const shownRef = useRef(shown)
  shownRef.current = shown
  const stopTimer = useRef<ReturnType<typeof setTimeout>>()

  const current = order[track % order.length]
  const target: Target = useMemo(() => {
    const r = shown.req
    return r.kind === 'ambient' ? { kind: 'ambient', pattern: ambientPattern(current, sound) } : r
  }, [shown, current, sound])

  useEffect(() => { tr.set(target) }, [tr, target])

  // Rotate the ambient set while it's playing.
  useEffect(() => {
    if (target.kind !== 'ambient' || !state.playing) return
    const t = setTimeout(() => setTrack(i => i + 1), order[track % order.length].minutes * 60_000)
    return () => clearTimeout(t)
  }, [target.kind, state.playing, track, order])

  // The recorded instruments load once the engine is running (never before a press of Radio).
  useEffect(() => {
    if (settings.sound !== 'recorded' || !engineReady || samples !== 'none' || !engine.current) return
    setSamples('loading')
    engine.current.ensureSounds(ALL_SAMPLES).then(() => setSamples('ready'), () => setSamples('failed'))
  }, [settings.sound, engineReady, samples])

  useEffect(() => { saveSettings(settings) }, [settings])

  const setSettings = useCallback((patch: Partial<StationSettings>) => {
    const prev = latestSettings.current
    const next = { ...prev, ...patch }
    if (next.style !== prev.style) setTrack(0)
    if (!next.follow && prev.follow) setFrozen(shownRef.current)
    if (next.follow && !prev.follow) setFrozen(null)
    if (next.volume !== prev.volume) engine.current?.setVolume?.(next.volume)
    if (next.kitchen !== prev.kitchen) void engine.current?.setKitchen?.(next.kitchen)?.catch(() => {})
    latestSettings.current = next
    setSettingsState(next)
  }, [])

  const retrySound = useCallback(() => setSamples(s => (s === 'failed' ? 'none' : s)), [])

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
      const s = latestSettings.current
      e.setVolume?.(s.volume)
      void e.setKitchen?.(s.kitchen)?.catch(() => {})
      tr.play()
      setState({ playing: true, loading: false, failed: false })
      setEngineReady(true)
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

  const request = useCallback((req: StationRequest, title = '') => setLatest({ req, title }), [])

  const nowPlaying = target.kind === 'ambient' ? current.title : target.kind === 'welcome' ? 'Welcome' : shown.title

  const value: Ctx = {
    ...state,
    nowPlaying,
    nowAfter: target.kind === 'ambient' ? current.after : undefined,
    settings,
    setSettings,
    soundLoading: samples === 'loading',
    soundFailed: samples === 'failed',
    retrySound,
    sound,
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

/** The sound to build a dish's music in (pass it to dishPattern). */
export function useStationSound(): Sound {
  return useCtx().sound
}
