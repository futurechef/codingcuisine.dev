import { useMemo } from 'react'
import type { Kitchen } from '../App'
import { ShareButton } from '../components/ShareButton'
import { Postmark, Stamp } from '../components/Stamp'
import { useCuisineTheme } from '../lib/cuisine-theme'
import { dish } from '../lib/dish'
import { useLocation } from '../lib/router'
import { StationCode } from '../components/StationCode'
import { dishPattern } from '../lib/station'
import { useStation, useStationSound } from '../lib/station-state'

/** A 6 × 4 in recipe index card whose back is a postcard. */
export function Card({ k }: { k: Kitchen }) {
  const { search } = useLocation()
  const word = new URLSearchParams(search).get('w')?.trim() || k.plated
  const d = useMemo(() => dish(word), [word])
  useCuisineTheme(d.cu)
  const sound = useStationSound()
  const music = useMemo(() => dishPattern(d, undefined, sound), [d, sound])
  useStation({ kind: 'dish', pattern: music, take: 0, draws: false }, d.title)
  const again = 'codingcuisine.dev/plate?w=' + encodeURIComponent(word).replace(/%20/g, '+')

  return (
    <main className="screen">
      <div className="eyebrow">PRINT · RECIPE CARD · 6 × 4 IN</div>
      <h1 className="display">Cook it, keep it, send it.</h1>
      <div className="cards">
        <figure className="card-wrap">
          <figcaption className="mono-label">FRONT · RECIPE</figcaption>
          <article className="card card--front" aria-label="Recipe card">
            <header className="card__head">
              <div>
                <h2 className="card__title">{d.title}</h2>
                <div className="card__seed">“{d.seed}” · No. {d.no}</div>
              </div>
              <div className="card__facts">
                {d.cu.toUpperCase()}<br />{d.chips.map(c => c.toUpperCase()).join(' · ')}
              </div>
            </header>
            <div className="card__body">
              <section>
                <h3 className="card__label">INGREDIENTS</h3>
                <ul className="card__ing">
                  {d.ing.map(i => (
                    <li key={i.role + i.name}><span>{i.name}</span><span className="card__g">{i.g} g</span></li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="card__label">METHOD</h3>
                <ol className="card__steps">
                  {d.steps.map(s => (
                    <li key={s.n}>
                      <span className="card__n">{s.n}</span>
                      <span><b>{s.a}</b> {s.t} <i>Look for: {s.l}.</i></span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </article>
        </figure>

        <figure className="card-wrap">
          <figcaption className="mono-label">BACK · POSTCARD</figcaption>
          <article className="card card--back" aria-label="Postcard">
            <div className="card__note">
              <div className="card__wish">Wish you were at the table.</div>
              <div className="card__writing"><span /><span /><span /><span /></div>
              <div className="card__again">
                <span className="card__label">COOK IT AGAIN</span>
                <span>{again}</span>
              </div>
            </div>
            <div className="card__divider" />
            <div className="card__address">
              <div className="card__stamp">
                <Stamp d={d} />
                <Postmark date={new Date()} />
              </div>
              <div className="card__lines"><span /><span /><span /></div>
            </div>
          </article>
        </figure>
      </div>
      <div className="card__actions">
        <button type="button" className="btn btn--secondary print-btn" onClick={() => print()}>Print card</button>
        <ShareButton d={d} />
      </div>
      <p className="mono-label card__hint">PRINTS AS TWO 6 × 4 IN PAGES · FRONT THEN BACK · USE DOUBLE-SIDED ON CARD STOCK</p>
      <StationCode pattern={music} title={d.title} />
    </main>
  )
}
