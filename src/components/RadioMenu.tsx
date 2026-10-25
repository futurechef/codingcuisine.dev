import { useEffect, useId, useRef, type RefObject } from 'react'
import { useStationStatus } from '../lib/station-state'
import { KITCHENS, KITCHEN_LABEL, STYLES, STYLE_LABEL, type Kitchen, type Sound, type Style } from '../lib/station-settings'

/**
 * The Radio's settings, dropped down from the ▾ beside it. Fixed to the viewport (the
 * nav scrolls sideways on phones, so it can't hang off the tab). Escape or a tap outside
 * closes it, and focus goes back to the ▾.
 */
export function RadioMenu({ onClose, toggle, top }: { onClose: () => void; toggle: RefObject<HTMLButtonElement>; top: number }) {
  const st = useStationStatus()
  const { settings: s, setSettings } = st
  const box = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    const close = () => { onClose(); toggle.current?.focus() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (!box.current?.contains(t) && !toggle.current?.contains(t)) onClose()
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', down)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', down) }
  }, [onClose, toggle])

  return (
    <div className="radio-menu" role="dialog" aria-label="Radio settings" ref={box} style={{ top }}>
      <fieldset className="radio-menu__row">
        <legend>Sound</legend>
        {(['code', 'recorded'] as Sound[]).map(v => (
          <label key={v}>
            <input type="radio" name={`${id}-sound`} value={v} checked={s.sound === v} onChange={() => setSettings({ sound: v })} />
            {v === 'code' ? 'Code' : 'Recorded'}
          </label>
        ))}
      </fieldset>
      {st.soundLoading && <p className="radio-menu__note" role="status">Loading instruments…</p>}
      {st.soundFailed && (
        <p className="radio-menu__note" role="alert">
          Couldn’t load the recorded instruments. <button type="button" className="btn btn--ghost" onClick={st.retrySound}>Try again</button>
        </p>
      )}

      <div className="radio-menu__row">
        <label htmlFor={`${id}-style`}>Style</label>
        <select id={`${id}-style`} value={s.style} onChange={e => setSettings({ style: e.target.value as Style })}>
          {STYLES.map(v => <option key={v} value={v}>{STYLE_LABEL[v]}</option>)}
        </select>
      </div>

      <fieldset className="radio-menu__row">
        <legend>Kitchen</legend>
        {KITCHENS.map((v: Kitchen) => (
          <label key={v}>
            <input type="radio" name={`${id}-kitchen`} value={v} checked={s.kitchen === v} onChange={() => setSettings({ kitchen: v })} />
            {KITCHEN_LABEL[v]}
          </label>
        ))}
      </fieldset>

      <div className="radio-menu__row">
        <label>
          <input type="checkbox" checked={s.follow} onChange={e => setSettings({ follow: e.target.checked })} />
          Follow the page
        </label>
      </div>

      <div className="radio-menu__row">
        <label htmlFor={`${id}-volume`}>Volume</label>
        <input
          id={`${id}-volume`} type="range" min={0} max={1} step={0.05} value={s.volume}
          onChange={e => setSettings({ volume: Number(e.target.value) })}
        />
      </div>

      <p className="radio-menu__now">Now: {st.nowPlaying || '—'}{st.nowAfter ? ` · ${st.nowAfter}` : ''}</p>
    </div>
  )
}
