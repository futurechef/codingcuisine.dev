import { useMemo, useState } from 'react'
import { PlateCard } from '../components/PlateCard'
import { guidePlates } from '../lib/dish'
import { navigate } from '../lib/router'

export function Guide() {
  const all = useMemo(guidePlates, [])
  const cuisines = useMemo(() => ['All', ...[...new Set(all.map(p => p.cu))].sort()], [all])
  const [filter, setFilter] = useState('All')
  const plates = all.filter(p => filter === 'All' || p.cu === filter)

  return (
    <main className="screen">
      <div className="eyebrow">FIELD GUIDE · VOL. I</div>
      <h1 className="display">Twelve plates, drawn by code.</h1>
      <div className="filters" role="group" aria-label="Filter by cuisine">
        {cuisines.map(c => (
          <button key={c} type="button" className="chip chip--button" aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="gallery">
        {plates.map(p => (
          <a
            key={p.seed}
            className="gallery__item"
            href={'/plate?w=' + encodeURIComponent(p.seed)}
            aria-label={`${p.title} — open recipe`}
            onClick={e => { e.preventDefault(); navigate('/plate?w=' + encodeURIComponent(p.seed)) }}
          >
            <PlateCard {...p} meta={'PL. ' + String(all.indexOf(p) + 1).padStart(2, '0') + ' · ' + p.cu.toUpperCase()} />
          </a>
        ))}
      </div>
    </main>
  )
}
