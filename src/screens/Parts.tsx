import { PlateCard } from '../components/PlateCard'
import { StepItem } from './Home'

const FIG = { seed: 'fig', l1: 'Roast fig', l2: 'ricotta and thyme', shape: 'round', kind: 'pile', sauce: '#efe3c0', main: '#b0708a' } as const

export function Parts() {
  return (
    <main className="screen parts">
      <h1 className="display display--flush">Parts.</h1>

      <section>
        <div className="eyebrow eyebrow--section">SEED INPUT · BUTTONS · EYEBROW · ROLE TAGS · CHIPS</div>
        <div className="seed-input seed-input--sample">take a leek</div>
        <div className="actions actions--parts">
          <span className="btn btn--primary">Primary</span>
          <span className="btn btn--secondary">Secondary</span>
          <span className="btn btn--ghost">Ghost</span>
          <span className="focus-sample">Focus ring</span>
        </div>
        <div className="chips">
          {['Base', 'Fat', 'Acid', 'Herb', 'Crunch', 'Heat'].map(r => <span key={r} className="role role--inline">{r}</span>)}
          <span className="chip chip--active">Active chip</span>
          <span className="chip">Chip</span>
        </div>
      </section>

      <section>
        <div className="eyebrow eyebrow--section">STEP ITEM</div>
        <ol className="steps steps--sample">
          <StepItem n="01" a="SEAR" t="Sear the leek cut-side down in a hot, dry pan." l="a dark, almost black edge" />
        </ol>
      </section>

      <section>
        <div className="eyebrow eyebrow--section">PLATE CARD · STATIC / DRAWING · LOADING</div>
        <div className="parts-grid">
          <PlateCard {...FIG} meta="STATIC · NO. 0412" />
          <PlateCard {...FIG} meta="DRAWING · 2.6S" frozenAt={2.2} />
          <div className="loading">
            <svg className="ld" viewBox="0 0 100 100" width="90" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path pathLength={1} d="M50 8 A42 42 0 1 1 49.9 8 M50 26 A24 24 0 1 0 50.1 26" />
            </svg>
            <span className="mono-label">PLATING…</span>
          </div>
        </div>
      </section>
    </main>
  )
}
