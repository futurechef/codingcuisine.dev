import { useMemo } from 'react'
import type { Kitchen } from '../App'
import { ExplodedPlate } from '../components/ExplodedPlate'
import { useCuisineTheme } from '../lib/cuisine-theme'
import { dish } from '../lib/dish'
import { useLocation } from '../lib/router'

/** A dish taken apart, layer by layer. */
export function Anatomy({ k }: { k: Kitchen }) {
  const { search } = useLocation()
  const word = new URLSearchParams(search).get('w')?.trim() || k.plated
  const d = useMemo(() => dish(word), [word])
  useCuisineTheme(d.cu)
  return (
    <main className="screen">
      <div className="eyebrow">ANATOMY · {d.cu.toUpperCase()} · NO. {d.no}</div>
      <h1 className="display">Anatomy of a plate.</h1>
      <h2 className="display display--h2">{d.title}</h2>
      <p className="lede">Five layers, in the order they go down. Tap one to see what’s in it and how it’s made.</p>
      <ExplodedPlate key={word} d={d} />
    </main>
  )
}
