import { useEffect, useMemo, useState } from 'react'
import type { Kitchen } from '../App'
import { PlateCard } from '../components/PlateCard'
import { useCuisineTheme } from '../lib/cuisine-theme'
import { dish } from '../lib/dish'
import { prefersShareSheet } from '../lib/device'
import { navigate } from '../lib/router'
import { StationCode } from '../components/StationCode'
import { dishPattern } from '../lib/station'
import { useStation, useStationSound } from '../lib/station-state'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Parse YYYY-MM-DD as a local date; null if it isn't a real date. */
function parse(s?: string): Date | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return iso(d) === s ? d : null
}

const long = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,/g, '').toUpperCase()

/** Prep + cook, from chips like "Prep 10 min". */
const totalMinutes = (chips: string[]) =>
  chips.filter(c => /^(Prep|Cook) /.test(c)).reduce((n, c) => n + parseInt(c.replace(/\D+/g, ''), 10), 0)

export function Today({ k, date }: { k: Kitchen; date?: string }) {
  const day = parse(date) ?? new Date()
  const today = iso(day)
  const isToday = today === iso(new Date())
  const prev = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1)
  const yesterday = iso(prev)

  // The date itself is the seed; dish() keeps date seeds to what's in season.
  const d = useMemo(() => dish(today), [today])
  const y = useMemo(() => dish(yesterday), [yesterday])
  useCuisineTheme(d.cu)
  const sound = useStationSound()
  const music = useMemo(() => dishPattern(d, undefined, sound), [d, sound])
  useStation({ kind: 'dish', pattern: music, take: 0, draws: true }, d.title)

  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const share = async () => {
    const url = `${location.origin}/day/${today}`
    try {
      if (navigator.share && prefersShareSheet()) {
        await navigator.share({ title: `Dish of the day · ${d.l1}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch { /* dismissed share sheet or blocked clipboard */ }
  }

  return (
    <main className="screen">
      <div className="eyebrow">DISH OF THE DAY · {long(day)}</div>
      <div className="split split--center">
        <PlateCard key={today} {...d} draw />
        <div>
          <h1 className="display display--flush">{isToday ? 'Today the date is the seed.' : 'That day, the date was the seed.'}</h1>
          <p className="lede">
            Same date, same plate, for everyone at the table. {isToday ? 'Tomorrow it changes.' : ''}
          </p>
          <div className="actions">
            <button type="button" className="btn btn--primary" onClick={share} aria-live="polite">
              {copied ? 'Link copied' : isToday ? 'Share today’s plate' : 'Share this plate'}
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => { navigate('/plate?w=' + encodeURIComponent(today)); k.plate(today) }}>
              Open recipe
            </button>
          </div>
        </div>
      </div>

      <a
        className="yesterday"
        href={`/day/${yesterday}`}
        onClick={e => { e.preventDefault(); navigate(`/day/${yesterday}`) }}
      >
        <div className="mono-label">YESTERDAY'S DISH · {yesterday}</div>
        <div className="yesterday__row">
          <div className="yesterday__plate">
            <PlateCard {...y} label={yesterday.slice(5)} meta={'NO. ' + y.no} />
          </div>
          <div>
            <div className="yesterday__title">{y.l1}, {y.l2}</div>
            <div className="mono-label">{y.cu.toUpperCase()} · {totalMinutes(y.chips)} MIN</div>
          </div>
        </div>
      </a>
      <StationCode pattern={music} title={d.title} />
    </main>
  )
}
