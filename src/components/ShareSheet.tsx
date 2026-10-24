import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dish } from '../lib/dish'
import { CLIP_SECONDS, SHARE_SIZE, type ShareFormat } from '../lib/share-frame'
import { createFrameRenderer, makeShareVideo, renderStill, ShareError, shareFilename, shareOrDownload, videoSupported } from '../lib/share-video'

type Status = { kind: 'idle' } | { kind: 'recording'; p: number } | { kind: 'ready'; blob: Blob } | { kind: 'error'; msg: string }

export function ShareSheet({ d, onClose }: { d: Dish; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const preview = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<ShareFormat>('post')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [note, setNote] = useState('')
  // The still is rendered ahead of time so the Share tap can call navigator.share synchronously (iOS user-gesture rule).
  const [still, setStill] = useState<Blob | 'error' | null>(null)
  const abort = useRef<AbortController | null>(null)
  const [video, setVideo] = useState<boolean | null>(null)
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // The last finished clip. Kept while "Make again" re-encodes, so the stage never shows a blank, undrawn canvas.
  const [made, setMade] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => { dialog.current?.showModal(); void videoSupported().then(setVideo) }, [])
  useEffect(() => () => abort.current?.abort(), [])

  const busy = status.kind === 'recording' || status.kind === 'ready'
  // Object URL made and revoked in one effect: no leak from renders React discards (StrictMode).
  useEffect(() => {
    if (!made) { setVideoUrl(null); return }
    const url = URL.createObjectURL(made)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [made])

  // Live preview: loops the clip (or shows the last frame with reduced motion). Paused while the video is made or shown.
  useEffect(() => {
    if (busy || !preview.current) return
    const c = preview.current
    c.width = SHARE_SIZE[format].w
    c.height = SHARE_SIZE[format].h
    const ctx = c.getContext('2d')!
    const r = createFrameRenderer(d, format)
    let stop = false, start = performance.now()
    const loop = async () => {
      if (stop) return
      const t = reduced ? CLIP_SECONDS : ((performance.now() - start) / 1000) % CLIP_SECONDS
      let ok = true
      // A failed image decode or font load must not end the preview: skip this frame and try again.
      try { await r.draw(ctx, t, () => !stop) } catch { ok = false }
      if (stop) return
      if (!reduced) requestAnimationFrame(loop)
      else if (!ok) setTimeout(loop, 1000)
    }
    void loop()
    return () => { stop = true }
  }, [d, format, reduced, busy])

  // A new format or dish invalidates a recorded clip and the still.
  useEffect(() => {
    abort.current?.abort(); setStatus({ kind: 'idle' }); setMade(null); setNote(''); setStill(null)
    let current = true
    renderStill(d, format).then(b => { if (current) setStill(b) }, () => { if (current) setStill('error') })
    return () => { current = false }
  }, [d, format])

  const record = async () => {
    abort.current = new AbortController()
    setStatus({ kind: 'recording', p: 0 })
    try {
      const blob = await makeShareVideo(d, format, { signal: abort.current.signal, onProgress: p => setStatus({ kind: 'recording', p }) })
      setMade(blob)
      setStatus({ kind: 'ready', blob })
    } catch (e) {
      setMade(null)
      if ((e as Error).name === 'AbortError') return setStatus({ kind: 'idle' })
      setStatus({ kind: 'error', msg: e instanceof ShareError ? e.message : 'Making the video failed. Try again, or share the image.' })
    }
  }

  const send = async (blob: Blob, ext: 'mp4' | 'png') => {
    const how = await shareOrDownload(blob, shareFilename(d, format, ext))
    setNote(how === 'downloaded' ? `Saved ${shareFilename(d, format, ext)}` : how === 'shared' ? 'Shared.' : '')
  }

  const close = () => { abort.current?.abort(); dialog.current?.close(); onClose() }

  return (
    <dialog ref={dialog} className="share" onClose={close} aria-labelledby="share-title">
      <div className="share__head">
        <h2 id="share-title" className="eyebrow">SHARE · {d.title.toUpperCase()}</h2>
        <button type="button" className="btn btn--ghost" onClick={close} aria-label="Close">Close</button>
      </div>
      <div className="share__body">
        <div className="share__stage">
          {!made && <canvas ref={preview} className={'share__preview share__preview--' + format} aria-label={`Preview of the ${format} video`} />}
          {made && videoUrl && (
            <figure className="share__made">
              <video className={'share__preview share__preview--' + format} src={videoUrl} autoPlay loop muted playsInline aria-label="The video you're about to share" />
              {status.kind === 'ready' && <figcaption className="mono-label">✓ VIDEO READY · {CLIP_SECONDS} S · {(status.blob.size / 1_048_576).toFixed(1)} MB</figcaption>}
            </figure>
          )}
        </div>
        <div className="share__side">
          <div className="filters" role="group" aria-label="Format">
            {(['post', 'story'] as const).map(f => (
              <button key={f} type="button" className="chip chip--button" aria-pressed={format === f} onClick={() => setFormat(f)} disabled={status.kind === 'recording'}>
                {f === 'post' ? 'Post 4:5' : 'Story 9:16'}
              </button>
            ))}
          </div>

          <ol className="share__steps">
            <li className={'share__step' + (status.kind === 'ready' ? ' share__step--done' : '')}>
              <span className="share__num" aria-hidden="true">{status.kind === 'ready' ? '✓' : '1'}</span>
              {status.kind === 'ready' ? (
                <span className="share__done">Video made <button type="button" className="btn btn--ghost share__again" onClick={record}>Make again</button></span>
              ) : (
                <span className="share__act">
                  <button type="button" className="btn btn--secondary" onClick={record} disabled={!video || status.kind === 'recording'}>
                    {status.kind === 'recording' ? `Making video… ${Math.round(status.p * 100)}%` : 'Make video'}
                  </button>
                  {status.kind === 'recording' && <progress className="share__progress" value={status.p} max={1} aria-label="Making video" />}
                </span>
              )}
            </li>
            <li className={'share__step' + (status.kind === 'ready' ? '' : ' share__step--waiting')}>
              <span className="share__num" aria-hidden="true">2</span>
              <button type="button" className="btn btn--primary" onClick={() => status.kind === 'ready' && send(status.blob, 'mp4')} disabled={status.kind !== 'ready'}>
                Share video
              </button>
            </li>
          </ol>
          {video === false && <p className="mono-label share__why">THIS BROWSER CAN’T MAKE MP4 VIDEO. THE IMAGE WORKS EVERYWHERE.</p>}
          {status.kind === 'error' && <p className="mono-label share__why" role="alert">{status.msg}</p>}

          <p className="mono-label share__or">OR SHARE A STILL</p>
          <button type="button" className="btn btn--secondary" onClick={() => still instanceof Blob && send(still, 'png')} disabled={!(still instanceof Blob) || status.kind === 'recording'}>
            {still === null ? 'Preparing image…' : 'Share image'}
          </button>
          {still === 'error' && <p className="mono-label share__why" role="alert">THE IMAGE COULDN’T BE MADE. CLOSE AND TRY AGAIN.</p>}
          <p className="mono-label share__note" aria-live="polite">{note}</p>
          <p className="mono-label share__hint">{CLIP_SECONDS}-SECOND MP4 · {SHARE_SIZE[format].w} × {SHARE_SIZE[format].h} · H.264, READY FOR INSTAGRAM</p>
        </div>
      </div>
    </dialog>
  )
}
