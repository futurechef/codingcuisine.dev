import { useEffect, useRef, type ComponentType } from 'react'
import type { Dish } from '../lib/dish'

export interface SheetProps { d: Dish; onClose: () => void }

/** Shown when the share code can't be fetched (e.g. a tab left open across a deploy). */
function ShareUnavailable({ onClose }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  const close = () => { dialog.current?.close(); onClose() }
  return (
    <dialog ref={dialog} className="share" onClose={close} aria-labelledby="share-unavailable">
      <h2 id="share-unavailable" className="eyebrow">SHARING COULDN’T LOAD</h2>
      <p className="lede">The site was probably updated since this page opened. Reload to get the latest version, then try again.</p>
      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={() => location.reload()}>Reload</button>
        <button type="button" className="btn btn--secondary" onClick={close}>Close</button>
      </div>
    </dialog>
  )
}

/** Loads the share sheet chunk; a failed load gives a friendly fallback instead of crashing the app. */
export async function loadShareSheet(
  importer: () => Promise<{ ShareSheet: ComponentType<SheetProps> }> = () => import('./ShareSheet'),
): Promise<{ default: ComponentType<SheetProps>; failed?: boolean }> {
  try {
    const m = await importer()
    return { default: m.ShareSheet }
  } catch {
    return { default: ShareUnavailable, failed: true }
  }
}
