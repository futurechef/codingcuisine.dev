import { useEffect, useState } from 'react'
import type { StationPattern } from '../lib/station'
import { useStationStatus } from '../lib/station-state'

const OFF = [false, false, false, false, false]

/** Which line of the code belongs to which layer: the part's line and the comment above it. */
function lines(code: string): { text: string; layer: number | null }[] {
  const out = code.split('\n').map(text => ({ text, layer: null as number | null }))
  out.forEach((l, i) => {
    const m = /\.gain\(layer\((\d)\)\)/.exec(l.text)
    if (!m) return
    l.layer = +m[1]
    if (out[i - 1]?.text.trim().startsWith('//')) out[i - 1].layer = +m[1]
  })
  return out
}

/** The dish's music as Strudel code, beside the recipe. Layers light up as they sound. */
export function StationCode({ pattern, title }: { pattern: StationPattern; title: string }) {
  const st = useStationStatus()
  const live = st.playing && st.code === pattern.code
  const [on, setOn] = useState(OFF)

  useEffect(() => {
    if (!live) { setOn(OFF); return }
    const read = () => {
      const p = st.levels().parts
      setOn(prev => {
        const next = prev.map((_, i) => (p[i] ?? 0) > 0.05)
        return next.every((v, i) => v === prev[i]) ? prev : next
      })
    }
    read()
    const id = setInterval(read, 120)
    return () => clearInterval(id)
  }, [live, st])

  const groups: { layer: number | null; text: string }[] = []
  for (const l of lines(pattern.code)) {
    const last = groups[groups.length - 1]
    if (last && last.layer === l.layer) last.text += '\n' + l.text
    else groups.push({ layer: l.layer, text: (groups.length ? '\n' : '') + l.text })
  }
  const names = pattern.parts.map(p => p.layer)

  return (
    <section className="station-code" aria-label="Strudel code for this dish’s music">
      <div className="station-code__head mono-label">
        {live ? `NOW PLAYING · ${title.toUpperCase()} · ${pattern.label.toUpperCase()}` : 'PRESS RADIO TO HEAR IT'}
      </div>
      <pre>
        {groups.map((g, i) => {
          const nl = g.text.startsWith('\n') ? '\n' : ''
          const text = nl ? g.text.slice(1) : g.text
          return g.layer == null
            ? <span key={i}>{nl}{text}</span>
            : <span key={i}>{nl}<span data-layer={names[g.layer]} className={on[g.layer] ? 'is-on' : undefined}>{text}</span></span>
        })}
      </pre>
    </section>
  )
}
