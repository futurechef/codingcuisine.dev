import { useId, useMemo } from 'react'
import type { Dish } from '../lib/dish'
import { plateMarkup } from '../lib/plate'

const PAPER = '#fffdf7'
const CARD = '#fbf6ea'
const INK = '#3a2418'
const W = 150, H = 180, PITCH = 9, HOLE = 3

/** A perforated postage stamp with the dish's plate as its picture. */
export function Stamp({ d }: { d: Dish }) {
  // Fixed geometry and hex colours only (see plate.ts) — never user text.
  const plate = useMemo(() => plateMarkup(d, { kind: 'static' }), [d])
  const holes: [number, number][] = []
  for (let x = PITCH / 2; x < W; x += PITCH) holes.push([x, 0], [x, H])
  for (let y = PITCH / 2; y < H; y += PITCH) holes.push([0, y], [W, y])

  return (
    <svg className="stamp" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Stamp: ${d.l1}, ${d.cu}, number ${d.no}`}>
      <rect width={W} height={H} fill={PAPER} />
      {holes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={HOLE} fill={CARD} />)}
      <rect x="10" y="10" width={W - 20} height={H - 20} fill="none" stroke={INK} strokeWidth=".8" />
      <rect x="13" y="13" width={W - 26} height={H - 26} fill="none" stroke={INK} strokeWidth=".35" opacity=".5" />
      <text x={W / 2} y="25" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" letterSpacing="1.4" fill={INK}>
        {d.cu.toUpperCase()}
      </text>
      <svg x="16" y="30" width={W - 32} height="106" viewBox="0 0 300 270" dangerouslySetInnerHTML={{ __html: plate }} />
      <text x="17" y={H - 19} fontFamily="JetBrains Mono, monospace" fontSize="6" letterSpacing="1" fill={INK} opacity=".75">SERVES 2</text>
      <text x={W - 17} y={H - 18} textAnchor="end" fontFamily="Newsreader, Georgia, serif" fontStyle="italic" fontSize="13" fill={INK}>
        No. {d.no}
      </text>
    </svg>
  )
}

/** A round postmark with wavy cancel lines, in faded accent ink. */
export function Postmark({ date }: { date: Date }) {
  const id = 'pm' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()
  const year = String(date.getFullYear())
  const wave = (y: number) => {
    let d = `M0 ${y}`
    for (let x = 0; x < 120; x += 10) d += ` q5 ${x % 20 ? 4 : -4} 10 0`
    return d
  }
  return (
    <svg className="postmark" viewBox="0 0 200 84" aria-hidden="true">
      <g fill="none" stroke="#b8452e" strokeWidth="1.4" opacity=".6">
        <circle cx="160" cy="42" r="36" />
        <circle cx="160" cy="42" r="25" />
        {[24, 34, 44, 54, 64].map(y => <path key={y} d={wave(y)} />)}
        <path id={id} d="M130.5 42 a29.5 29.5 0 1 1 59 0 a29.5 29.5 0 1 1 -59 0" stroke="none" />
      </g>
      <g fill="#b8452e" opacity=".7" fontFamily="JetBrains Mono, monospace">
        <text fontSize="6.2" letterSpacing="1.1">
          <textPath href={`#${id}`} startOffset="2%">CODINGCUISINE.DEV · PLATEDRAW ·</textPath>
        </text>
        <text x="160" y="41" textAnchor="middle" fontSize="8.5" letterSpacing=".6">{day}</text>
        <text x="160" y="51" textAnchor="middle" fontSize="7" letterSpacing="1">{year}</text>
      </g>
    </svg>
  )
}
