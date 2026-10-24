import { useMemo } from 'react'
import type { PlateLook } from '../lib/look'
import { plateMarkup, type DrawMode } from '../lib/plate'

interface Props extends PlateLook {
  /** Big caption word (defaults to the drawing seed). */
  label?: string
  l1?: string
  l2?: string
  meta?: string
  /** Pen-draw on mount. Remount (change `key`) to replay. */
  draw?: boolean
  /** Freeze partway through the drawing at t seconds. */
  frozenAt?: number
  /** Just the drawing — no paper, border or caption. */
  bare?: boolean
}

export function PlateCard({ label, l1 = '', l2 = '', meta = '', draw, frozenAt, bare, ...look }: Props) {
  const mode: DrawMode = frozenAt != null ? { kind: 'frozen', t: frozenAt } : draw ? { kind: 'draw' } : { kind: 'static' }
  const { shape, kind, sauce, main, seed, sauceStyle, crunch, herb, garnish } = look
  const g = garnish?.join(',')
  // Markup is built only from fixed geometry, numbers and hex colours (see plate.ts) — never user text.
  const markup = useMemo(
    () => plateMarkup({ shape, kind, sauce, main, seed, sauceStyle, crunch, herb, garnish }, mode),
    [shape, kind, sauce, main, seed, sauceStyle, crunch, herb, g, mode.kind, frozenAt], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return (
    <div className={'plate' + (bare ? ' plate--bare' : '') + (mode.kind === 'draw' ? ' draw' : '')}>
      <svg
        viewBox="0 0 300 270"
        role="img"
        aria-label={`Pen-line drawing of ${l1 || 'a dish'} ${l2}`.trim()}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      {!bare && (
        <div className="plate__caption">
          <div className="plate__seed">{label ?? seed}</div>
          <div className="plate__lines">
            <div>{l1}</div>
            <div className="plate__l2">{l2}</div>
          </div>
          <div className="plate__meta">{meta}</div>
        </div>
      )}
    </div>
  )
}
