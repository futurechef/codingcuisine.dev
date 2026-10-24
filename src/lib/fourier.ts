// Fourier epicycles: a closed loop of points becomes a chain of spinning
// circles whose last tip retraces the loop.

export type Pt = [number, number]

export interface Coef {
  /** Cycles per loop: 0, ±1, ±2 … */
  freq: number
  re: number
  im: number
  amp: number
  phase: number
}

function coef(freq: number, re: number, im: number): Coef {
  return { freq, re, im, amp: Math.hypot(re, im), phase: Math.atan2(im, re) }
}

/** Discrete Fourier transform of the loop (points read as x + iy). Natural order: index k ↔ freq k or k − N. */
export function dft(pts: Pt[]): Coef[] {
  const N = pts.length
  const out: Coef[] = []
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0
    for (let n = 0; n < N; n++) {
      const a = (-2 * Math.PI * k * n) / N
      const c = Math.cos(a), s = Math.sin(a)
      re += pts[n][0] * c - pts[n][1] * s
      im += pts[n][0] * s + pts[n][1] * c
    }
    out.push(coef(k <= N / 2 ? k : k - N, re / N, im / N))
  }
  return out
}

/** Inverse transform — recovers the original points from all coefficients. */
export function idft(coefs: Coef[]): Pt[] {
  const N = coefs.length
  return Array.from({ length: N }, (_, n) => tip(coefs, N, n / N))
}

/** The fixed offset first, then circles from largest to smallest. */
export function byAmplitude(coefs: Coef[]): Coef[] {
  return coefs.slice().sort((a, b) => (a.freq === 0 ? -1 : b.freq === 0 ? 1 : b.amp - a.amp))
}

/** Centres of the first `m` circles at time t ∈ [0, 1), ending with the pen tip. */
export function chain(ordered: Coef[], m: number, t: number): Pt[] {
  let x = 0, y = 0
  const out: Pt[] = [[0, 0]]
  for (let i = 0; i < Math.min(m, ordered.length); i++) {
    const c = ordered[i]
    const a = 2 * Math.PI * c.freq * t + c.phase
    x += c.amp * Math.cos(a)
    y += c.amp * Math.sin(a)
    out.push([x, y])
  }
  return out
}

/** Just the pen tip — the sum of the first `m` terms. */
export function tip(ordered: Coef[], m: number, t: number): Pt {
  let x = 0, y = 0
  for (let i = 0; i < Math.min(m, ordered.length); i++) {
    const c = ordered[i]
    const a = 2 * Math.PI * c.freq * t + c.phase
    x += c.amp * Math.cos(a)
    y += c.amp * Math.sin(a)
  }
  return [x, y]
}

/** Blend two transforms of the same length, term by term (natural order). */
export function blend(a: Coef[], b: Coef[], u: number): Coef[] {
  return a.map((c, i) => coef(c.freq, c.re + (b[i].re - c.re) * u, c.im + (b[i].im - c.im) * u))
}
