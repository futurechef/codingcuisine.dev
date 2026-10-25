import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_WORD, SURPRISE_WORDS } from './lib/dish'
import { navigate, useLocation } from './lib/router'
import { StationProvider } from './lib/station-state'
import { RadioTab } from './components/RadioTab'
import { COMPUTERDRAW_APP } from './lib/eggface'
import { routeSeo, useSeo } from './lib/seo'
import { Home } from './screens/Home'
import { Forks } from './screens/Forks'
import { Guide } from './screens/Guide'
import { Today } from './screens/Today'
import { Card } from './screens/Card'
import { Anatomy } from './screens/Anatomy'
import { Parts } from './screens/Parts'
import { Welcome } from './screens/Welcome'

const TABS = [
  ['/plate', 'Plate'],
  ['/forks', 'Forks'],
  ['/guide', 'Field guide'],
  ['/today', 'Today'],
  ['/card', 'Card'],
  ['/anatomy', 'Anatomy'],
  ['/parts', 'Parts'],
] as const

export interface Kitchen {
  word: string
  plated: string
  /** Bumps on every plating, to remount (and so replay) the drawing. */
  take: number
  setWord: (w: string) => void
  plate: (w?: string) => void
  surprise: () => void
}

function wordFromUrl() {
  return new URLSearchParams(location.search).get('w')?.trim() || ''
}

/** The Plate screen's URL for a word. */
export const plateUrl = (w: string) => (w === DEFAULT_WORD ? '/plate' : '/plate?w=' + encodeURIComponent(w))

// Links shared before the welcome page existed (/?w=fig) belong to the Plate screen.
if (location.pathname === '/' && wordFromUrl()) history.replaceState(null, '', '/plate' + location.search)
// The postcard became the recipe card.
if (location.pathname === '/postcard') history.replaceState(null, '', '/card' + location.search)

export function App() {
  const { path, search } = useLocation()
  const [word, setWord] = useState(() => wordFromUrl() || DEFAULT_WORD)
  const [plated, setPlated] = useState(word)
  const [take, setTake] = useState(0)

  const plate = useCallback((w?: string) => {
    const next = (w ?? word).trim() || DEFAULT_WORD
    setWord(next)
    setPlated(next)
    setTake(t => t + 1)
    if (location.pathname === '/plate') navigate(plateUrl(next), { replace: true })
  }, [word])

  const surprise = useCallback(() => {
    plate(SURPRISE_WORDS[Math.floor(Math.random() * SURPRISE_WORDS.length)])
  }, [plate])

  // Back/forward between plated words on the Plate screen.
  useEffect(() => {
    if (path !== '/plate') return
    const w = wordFromUrl()
    if (w && w !== plated) { setWord(w); setPlated(w); setTake(t => t + 1) }
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

  useSeo(routeSeo(path, search, plated))

  const k: Kitchen = { word, plated, take, setWord, plate, surprise }
  const tab = path.startsWith('/day/') ? '/today' : path

  let screen
  if (path === '/forks') screen = <Forks k={k} />
  else if (path === '/guide') screen = <Guide />
  else if (path === '/today' || path.startsWith('/day/')) screen = <Today k={k} date={path.startsWith('/day/') ? path.slice(5) : undefined} />
  else if (path === '/card') screen = <Card k={k} />
  else if (path === '/anatomy') screen = <Anatomy k={k} />
  else if (path === '/parts') screen = <Parts />
  else if (path === '/plate') screen = <Home k={k} />
  else screen = <Welcome k={k} />

  return (
    <StationProvider>
    <div className="page">
      <header className="masthead">
        <a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/') }}>
          <span className="brand__name">codingcuisine.dev</span>
          <span className="brand__tag">PLATEDRAW</span>
        </a>
        <nav className="tabs" aria-label="Sections">
          {TABS.map(([to, label]) => (
            <a
              key={to}
              href={to}
              className="tab"
              aria-current={tab === to ? 'page' : undefined}
              onClick={e => { e.preventDefault(); navigate(to === '/plate' ? plateUrl(plated) : to) }}
            >
              {label}
            </a>
          ))}
          <RadioTab />
        </nav>
      </header>
      {screen}
      <footer className="footer">
        <div className="footer__credit">
          Inspired by Lingdong Huang's <a href="https://github.com/LingDong-/fishdraw">fishdraw</a> and by <a href={COMPUTERDRAW_APP}>Computerdraw</a>. Recipes in the ForkRecipe format. Recorded instruments from <a href="https://github.com/sgossner/VSCO-2-CE">VSCO 2 CE</a>.
        </div>
        <div className="mono-label">
          CODINGCUISINE.DEV · PLATEDRAW · <a href="https://github.com/futurechef/codingcuisine.dev">SOURCE</a> · AGPL-3.0
        </div>
      </footer>
    </div>
    </StationProvider>
  )
}
