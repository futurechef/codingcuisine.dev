# Inspiration

Work that shaped Platedraw. Credit lives in the footer (`src/App.tsx`) and the README.
Nothing here is copied: these are reference points, not sources.

## fishdraw — Lingdong Huang

https://github.com/LingDong-/fishdraw. Procedural pen-line drawings from a seed. The
model for the plate drawing.

## Computerdraw

https://apps.apple.com/us/app/computerdraw/id6782483424. Seeded drawing as an app.

## colin.jpeg — live-coded Strudel (added 2026-10-31)

https://www.instagram.com/colin.jpeg/. Reel: "toaster went fishing. then the beat dropped"
(the track is Kinneret's "No Wind Resistance!"). What it shows, and what's worth borrowing
for the Station:

- **The code is the performance.** Named Strudel layers (`kick:`, `clap:`, `hho:`,
  `bassline:`, `chords:`, `vox:`) read top to bottom, with commented-out lines left in to
  show what's off. The token playing right now gets a box around it (`<ab3!2 ...>`,
  `<C#m Abm!2 ...>`). Our `StationCode` already lights up code as it plays; this is the
  same idea with tighter, per-token highlights.
- **Inline visualisers under each block.** A drum grid (`bd cp hh oh vx` rows, beats 1–4,
  `bar 10 · step 7/16`) under the drums, and an ASCII pianoroll (note names down the side,
  current chord labelled `chord Abm`) under the melody. Could sit under a dish's pattern.
- **`slider(...)` in the code.** Filter cutoffs are live sliders inside the source. A
  "turn the heat up" knob on a dish's music would fit the kitchen theme.
- **An ASCII/pixel scene that reacts to the music.** Pastel mountains, pines, water, a
  toaster in a boat fishing; pieces flash with the beat. Close cousin of fishdraw, and of
  our plate drawing: the plate could pulse or redraw strokes on the beat.
- **Setup lines as a title card:** `setcpm(140/4)`, `const scale = "Ab:minor"`.

Rules still apply: no user text in Strudel code (`station.ts` emits fixed tokens and
numbers only), Strudel stays lazy, and we don't copy his code, scenes or the recording.
