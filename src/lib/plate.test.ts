import { describe, expect, it } from 'vitest'
import { dish, GUIDE_WORDS } from './dish'
import { plateLayersMarkup, plateMarkup, type DrawMode } from './plate'

const MODES: DrawMode[] = [{ kind: 'static' }, { kind: 'draw' }, { kind: 'frozen', t: 2.2 }, { kind: 'smil' }]

describe('plateLayersMarkup', () => {
  it('splits the plate into five layers that join back into plateMarkup exactly', () => {
    for (const w of GUIDE_WORDS.slice(0, 50)) {
      const d = dish(w)
      for (const m of MODES) {
        const parts = plateLayersMarkup(d, m)
        expect(parts).toHaveLength(5)
        parts.forEach((p, i) => expect(p).toContain(`class="tn d${i}"`))
        expect(parts.join('')).toBe(plateMarkup(d, m))
      }
    }
  })
})
