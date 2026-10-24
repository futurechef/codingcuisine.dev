// Deterministic randomness: same seed string, same sequence, on every machine.

/** djb2 over the lowercased, trimmed string. */
export function hash(s: string): number {
  let h = 5381
  for (const c of s.toLowerCase().trim()) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0
  return h
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Float in [lo, hi). */
  range(lo: number, hi: number): number
  /** Integer in [0, n). */
  int(n: number): number
  pick<T>(a: readonly T[]): T
  /** Up to n distinct items, in random order. */
  sample<T>(a: readonly T[], n: number): T[]
  chance(p: number): boolean
}

/** mulberry32, seeded from a string (and an optional salt, to get independent streams). */
export function rng(seed: string, salt = ''): Rng {
  let a = hash(seed + '\u0000' + salt) || 0x9e3779b9
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (n: number) => Math.floor(next() * n)
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int,
    pick: a => a[int(a.length)],
    sample: (a, n) => {
      const c = a.slice()
      for (let i = c.length - 1; i > 0; i--) { const j = int(i + 1); [c[i], c[j]] = [c[j], c[i]] }
      return c.slice(0, Math.max(0, n))
    },
    chance: p => next() < p,
  }
}
