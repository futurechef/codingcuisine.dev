// Small device checks shared by screens. No heavy imports: Today.tsx uses this
// and must not pull the share-video chunk (Mediabunny) into its bundle.

/** Phones and tablets (coarse pointer) get the system share sheet; desktops get a download or the clipboard. */
export const prefersShareSheet = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
