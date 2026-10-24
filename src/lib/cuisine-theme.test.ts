import { describe, expect, it } from 'vitest'
import { palette } from './palettes'
import { themeVars } from './cuisine-theme'

describe('themeVars', () => {
  it('maps a palette onto the site tokens that styles.css reads', () => {
    const p = palette('Japanese', 'light')
    expect(themeVars(p)).toEqual({
      '--bg': p.paper, '--surf': p.surf, '--rule': p.rule, '--acc': p.acc,
      '--brand': p.btn, '--brand-hover': p.btnHover, '--on-brand': p.onBtn,
    })
  })
  it('never touches ink or body text tokens', () => {
    const keys = Object.keys(themeVars(palette('Mexican', 'dark')))
    expect(keys).not.toContain('--ink')
    expect(keys).not.toContain('--mute')
  })
})
