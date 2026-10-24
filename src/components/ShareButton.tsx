import { lazy, Suspense, useState } from 'react'
import type { Dish } from '../lib/dish'
import { loadShareSheet } from './lazy-share'

// The share sheet pulls in the video encoder, so it loads only when someone taps Share.
const ShareSheet = lazy(() => loadShareSheet())

export function ShareButton({ d }: { d: Dish }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>Share</button>
      {open && (
        <Suspense fallback={null}>
          <ShareSheet d={d} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
