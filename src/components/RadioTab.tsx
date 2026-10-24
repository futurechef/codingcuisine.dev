import { useEffect, useRef } from 'react'
import { useStationStatus } from '../lib/station-state'

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Play/pause for the station, in the tab bar. A small three-bar meter moves while it plays. */
export function RadioTab() {
  const st = useStationStatus()
  const bars = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = bars.current
    if (!el || !st.playing || reducedMotion()) return
    let raf = 0
    const tick = (t: number) => {
      const m = st.levels().master * 2 // 0–1
      el.childNodes.forEach((b, i) => {
        ;(b as HTMLElement).style.transform = `scaleY(${0.25 + 0.75 * m * (0.55 + 0.45 * Math.sin(t / (380 + i * 140) + i * 2))})`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); el.childNodes.forEach(b => { (b as HTMLElement).style.transform = '' }) }
  }, [st.playing, st])

  return (
    <>
      <button
        type="button"
        className={'tab radio' + (st.playing ? ' is-playing' : '')}
        aria-label={st.playing ? 'Pause station' : 'Play station'}
        aria-pressed={st.playing}
        aria-busy={st.loading || undefined}
        onClick={st.toggle}
        onPointerEnter={st.prefetch}
        onFocus={st.prefetch}
      >
        <span className="radio__meter" ref={bars} aria-hidden="true"><i /><i /><i /></span>
        Radio
      </button>
      {st.failed && (
        <span className="radio__error" role="alert">
          Couldn’t load the station. <button type="button" className="btn btn--ghost" onClick={() => location.reload()}>Reload</button>
        </span>
      )}
    </>
  )
}
