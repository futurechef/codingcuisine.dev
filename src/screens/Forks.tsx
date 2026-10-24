import { Fragment, useMemo } from 'react'
import type { Kitchen } from '../App'
import { PlateCard } from '../components/PlateCard'
import { useCuisineTheme } from '../lib/cuisine-theme'
import { lineage } from '../lib/dish'
import { useLocation } from '../lib/router'

function Connector() {
  return (
    <>
      <svg className="connector connector--wide" width="110" height="40" viewBox="0 0 110 40" fill="none" stroke="var(--acc)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M4 28 C 30 4, 52 40, 80 18 S 98 14 106 12" />
        <circle cx="106" cy="12" r="3" fill="var(--acc)" />
      </svg>
      <svg className="connector connector--narrow" width="40" height="90" viewBox="0 0 40 90" fill="none" stroke="var(--acc)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M12 4 C 36 26, 4 48, 24 66 S 28 80 30 86" />
        <circle cx="30" cy="86" r="3" fill="var(--acc)" />
      </svg>
    </>
  )
}

export function Forks({ k }: { k: Kitchen }) {
  const { search } = useLocation()
  const fw = new URLSearchParams(search).get('w')?.trim() || k.plated
  const forks = useMemo(() => lineage(fw), [fw])
  useCuisineTheme(forks[0].dish.cu)

  return (
    <main className="screen">
      <div className="eyebrow">FORK VIEW · LINEAGE</div>
      <h1 className="display display--narrow">Every dish has a family tree.</h1>
      <p className="lede lede--mute">
        Change one thing and it becomes a fork. {fw}, then {fw}′, then {fw}′′.
      </p>
      <ol className="lineage">
        {forks.map((f, i) => (
          <Fragment key={f.tag}>
            {f.note && (
              <li className="lineage__note">
                <Connector />
                <span>{f.note}</span>
              </li>
            )}
            <li className="lineage__dish">
              <div className="mono-label mono-label--tag">{f.tag}</div>
              <PlateCard {...f.dish} label={f.seed} meta={f.tag + ' · NO. ' + f.dish.no + (i ? '-' + i : '')} />
            </li>
          </Fragment>
        ))}
      </ol>
    </main>
  )
}
