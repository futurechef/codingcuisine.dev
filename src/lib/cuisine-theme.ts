import { useEffect } from 'react'
import { palette, type Palette } from './palettes'

/** The site tokens a cuisine palette overrides. Ink and body text are never touched. */
export function themeVars(p: Palette): Record<string, string> {
  return {
    '--bg': p.paper, '--surf': p.surf, '--rule': p.rule, '--acc': p.acc,
    '--brand': p.btn, '--brand-hover': p.btnHover, '--on-brand': p.onBtn,
  }
}

/** Tints the page in the cuisine's colour world while the calling screen is mounted. */
export function useCuisineTheme(cu: string | undefined) {
  useEffect(() => {
    const root = document.documentElement
    const dark = matchMedia('(prefers-color-scheme: dark)')
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
    const original = metas.map(m => m.content)
    const apply = () => {
      for (const [k, v] of Object.entries(themeVars(palette(cu, dark.matches ? 'dark' : 'light')))) root.style.setProperty(k, v)
      // Browser chrome: each theme-color meta targets one scheme.
      metas.forEach(m => { m.content = palette(cu, m.media.includes('dark') ? 'dark' : 'light').paper })
    }
    apply()
    dark.addEventListener('change', apply)
    return () => {
      dark.removeEventListener('change', apply)
      for (const k of Object.keys(themeVars(palette(cu, 'light')))) root.style.removeProperty(k)
      metas.forEach((m, i) => { m.content = original[i] })
    }
  }, [cu])
}
