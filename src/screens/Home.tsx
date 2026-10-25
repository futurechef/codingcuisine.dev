import { useMemo } from 'react'
import type { Kitchen } from '../App'
import { PlateCard } from '../components/PlateCard'
import { Radar } from '../components/Radar'
import { ShareButton } from '../components/ShareButton'
import { EggfaceCredit } from '../components/EggfaceCredit'
import { useCuisineTheme } from '../lib/cuisine-theme'
import { dish } from '../lib/dish'
import { DOWNLOADS } from '../lib/download'
import { navigate } from '../lib/router'
import { StationCode } from '../components/StationCode'
import { dishPattern } from '../lib/station'
import { useStation, useStationSound } from '../lib/station-state'

export function Home({ k }: { k: Kitchen }) {
  const d = useMemo(() => dish(k.plated), [k.plated])
  useCuisineTheme(d.cu)
  const sound = useStationSound()
  const music = useMemo(() => dishPattern(d, undefined, sound), [d, sound])
  useStation({ kind: 'dish', pattern: music, take: k.take, draws: true }, d.title)

  return (
    <main className="screen">
      <div className="eyebrow">PLATEDRAW · SEEDED BY A WORD</div>
      <h1 className="display display--home">Give it a word, get a dish.</h1>

      <form onSubmit={e => { e.preventDefault(); k.plate() }}>
        <label htmlFor="seed" className="sr-only">Seed word</label>
        <input
          id="seed"
          className="seed-input"
          value={k.word}
          onChange={e => k.setWord(e.target.value)}
          placeholder="take a leek"
          autoComplete="off"
          spellCheck={false}
          maxLength={60}
        />
        <div className="actions">
          <button type="submit" className="btn btn--primary">Plate it</button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate('/forks?w=' + encodeURIComponent(k.word.trim() || k.plated))}
          >
            Fork
          </button>
          <button type="button" className="btn btn--secondary" onClick={k.surprise}>Surprise me</button>
        </div>
      </form>
      <div className="mono-label mono-label--hint">SAME WORD, SAME DISH. ALWAYS.</div>

      <div className="split">
        <div className="split__plate">
          <PlateCard key={k.take} {...d} draw />
          <div className="plate-foot">
            <span className="mono-label">PLATE → SAUCE → MAIN → CRUNCH → HERBS</span>
            <span className="plate-foot__actions">
              <ShareButton d={d} />
              <button type="button" className="btn btn--ghost" onClick={() => navigate('/anatomy?w=' + encodeURIComponent(k.plated))}>See its anatomy</button>
              <button type="button" className="btn btn--ghost" onClick={() => k.plate(k.plated)}>Replay drawing</button>
            </span>
          </div>
        </div>

        <article>
          <div className="eyebrow">{d.eyebrow}</div>
          <h2 className="display display--h2">{d.title}</h2>
          <p className="lede">{d.desc}</p>
          {d.swappedFrom ? (
            <p className="mono-label mono-label--note">
              PLATEDRAW IS VEGETARIAN, SO “{d.swappedFrom.toUpperCase()}” BECAME {d.l1.toUpperCase()}.
              {d.swapQuip && <span className="quip"> {d.swapQuip}</span>}
            </p>
          ) : !d.named && (
            <p className="mono-label mono-label--note">NO INGREDIENT IN “{d.seed.toUpperCase()}”, SO THE WORD CHOSE {d.produce.toUpperCase()}.</p>
          )}
          <EggfaceCredit d={d} />
          <div className="chips">
            {d.chips.map(c => <span key={c} className="chip">{c}</span>)}
          </div>

          <div className="flavour">
            <Radar values={d.r} />
            <div className="mono-label flavour__key">FLAVOUR<br />SWEET · SALTY · SOUR<br />BITTER · UMAMI · HEAT</div>
          </div>

          <StationCode pattern={music} title={d.title} />

          <h3 className="section-label">INGREDIENTS</h3>
          <ul className="ingredients">
            {d.ing.map(i => (
              <li key={i.role + i.name}>
                <span className="role">{i.role}</span>
                <span>{i.name}</span>
                <span className="grams">{i.g} g</span>
              </li>
            ))}
          </ul>

          <h3 className="section-label">METHOD</h3>
          <ol className="steps">
            {d.steps.map(s => <StepItem key={s.n} {...s} />)}
          </ol>

          <div className="downloads">
            {DOWNLOADS.map(b => (
              <button key={b.label} type="button" className="download" onClick={() => b.run(d)}>
                <span className="download__label">{b.label}</span>
                <span className="download__ext">{b.ext}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </main>
  )
}

export function StepItem({ n, a, t, l }: { n: string; a: string; t: string; l: string }) {
  return (
    <li className="step">
      <span className="step__n">{n}</span>
      <div>
        <span className="step__a">{a}</span>
        <div className="step__t">{t}</div>
        <div className="step__l">Look for: {l}</div>
      </div>
    </li>
  )
}
