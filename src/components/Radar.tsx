import { FLAVOURS } from '../lib/dish'

const R = 58
const point = (i: number, r: number): [number, number] => {
  const a = ((-90 + i * 60) * Math.PI) / 180
  return [100 + r * Math.cos(a), 92 + r * Math.sin(a)]
}
const pts = (a: [number, number][]) => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')

/** Six-axis flavour radar; values 0–5. */
export function Radar({ values }: { values: number[] }) {
  return (
    <svg
      viewBox="0 0 200 184"
      className="radar"
      role="img"
      aria-label={'Flavour: ' + FLAVOURS.map((f, i) => `${f.toLowerCase()} ${values[i]} of 5`).join(', ')}
    >
      {[1 / 3, 2 / 3, 1].map(k => (
        <polygon key={k} points={pts(FLAVOURS.map((_, i) => point(i, R * k)))} fill="none" stroke="var(--rule)" strokeWidth="1" />
      ))}
      {FLAVOURS.map((_, i) => {
        const [x, y] = point(i, R)
        return <line key={i} x1="100" y1="92" x2={x} y2={y} stroke="var(--rule)" strokeWidth="1" />
      })}
      <polygon
        points={pts(values.map((v, i) => point(i, (R * v) / 5)))}
        fill="var(--acc)" fillOpacity=".22" stroke="var(--acc)" strokeWidth="1.5" strokeLinejoin="round"
      />
      {FLAVOURS.map((t, i) => {
        const [x, y] = point(i, 70)
        const c = Math.cos(((-90 + i * 60) * Math.PI) / 180)
        const anchor = Math.abs(c) < 0.1 ? 'middle' : c > 0 ? 'start' : 'end'
        return (
          <text
            key={t} x={x} y={y + 3 + (i === 0 ? -2 : i === 3 ? 6 : 0)} textAnchor={anchor}
            fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1" fill="var(--mute)"
          >
            {t.toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}
