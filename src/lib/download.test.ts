import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveBlob } from './download'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('saveBlob', () => {
  it('keeps the blob URL alive long enough for iOS to confirm the download', () => {
    vi.useFakeTimers()
    const revoke = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: revoke })
    vi.stubGlobal('document', { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } })
    saveBlob('a.mp4', new Blob(['x']))
    vi.advanceTimersByTime(30_000)
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(40_000)
    expect(revoke).toHaveBeenCalledOnce()
  })
})
