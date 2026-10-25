// The listener's Radio settings, remembered on this device. Every field is checked on
// its own, so an old or damaged copy in storage loses only the bad field. "Was playing"
// is never stored: sound never starts on its own.

export type Sound = 'code' | 'recorded'
export type Style = 'mix' | 'chefs-table' | 'eno' | 'originals'
export type Kitchen = 'off' | 'rain' | 'cafe'

export interface StationSettings {
  sound: Sound
  style: Style
  kitchen: Kitchen
  follow: boolean
  volume: number
}

export const DEFAULT_SETTINGS: StationSettings = { sound: 'code', style: 'mix', kitchen: 'off', follow: true, volume: 0.8 }

export const SOUNDS: readonly Sound[] = ['code', 'recorded']
export const STYLES: readonly Style[] = ['mix', 'chefs-table', 'eno', 'originals']
export const KITCHENS: readonly Kitchen[] = ['off', 'rain', 'cafe']

export const STYLE_LABEL: Record<Style, string> = { mix: 'Mix', 'chefs-table': 'Chef’s Table', eno: 'Eno', originals: 'Originals' }
export const KITCHEN_LABEL: Record<Kitchen, string> = { off: 'Off', rain: 'Rain', cafe: 'Café' }

const KEY = 'station-settings'

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

export function parseSettings(raw: unknown): StationSettings {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const d = DEFAULT_SETTINGS
  const vol = typeof r.volume === 'number' && Number.isFinite(r.volume) ? Math.min(1, Math.max(0, r.volume)) : d.volume
  return {
    sound: pick(r.sound, SOUNDS, d.sound),
    style: pick(r.style, STYLES, d.style),
    kitchen: pick(r.kitchen, KITCHENS, d.kitchen),
    follow: typeof r.follow === 'boolean' ? r.follow : d.follow,
    volume: vol,
  }
}

const store = (): Storage | undefined => {
  try { return globalThis.localStorage } catch { return undefined }
}

export function loadSettings(storage: Pick<Storage, 'getItem'> | undefined = store()): StationSettings {
  try {
    const raw = storage?.getItem(KEY)
    return parseSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: StationSettings, storage: Pick<Storage, 'setItem'> | undefined = store()): void {
  const { sound, style, kitchen, follow, volume } = s
  try { storage?.setItem(KEY, JSON.stringify({ sound, style, kitchen, follow, volume })) } catch { /* private mode, blocked storage: defaults next time */ }
}
