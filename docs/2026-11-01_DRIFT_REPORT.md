# Drift report — 2026-11-01

Made with the [Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model)
`egm-drift-report` skill, run against `main` @ `2854729`. Six fresh-context reviewers each
compared a group of docs with the current code. They saw only the repo, not the
conversation. The main claims were then checked by hand. The report lists only where docs
and code differ, so anything that matches is left out.

## Triage

**Fix in code (rules or behaviour the docs promise):**

1. **Strudel loads from a second module, and the test doesn't catch it.**
   - `src/lib/station-render.ts:4-8` imports five `@strudel/*` packages.
   - `share-video.ts:57` loads it lazily, which is fine for page weight.
   - But CLAUDE.md says *only* `station-engine.ts` imports Strudel, *only* via `station-state.tsx`.
   - The guard test `station-state.test.tsx:30` uses a fixed file list that leaves out
     `station-render.ts` and `share-video.ts`.
   - Fix: either widen the rule in CLAUDE.md to name both lazy entry points, or have the test
     scan every `src/**/*.ts(x)` and allow-list exactly those two files.
2. **Clicking outside Radio ▾ closes the menu but doesn't return focus to ▾.**
   - Escape does (`RadioMenu.tsx:17-22`).
   - The station-sound spec §1 and the plan's test name both promise it.
   - The test checks Escape only.
3. **Replay on Today/Anatomy doesn't restart the music build-up.**
   - Both pass `take: 0` (`Today.tsx:43`, `Anatomy.tsx:20`); only Home passes `k.take`.
   - Worth checking whether either page has a Replay that should re-trigger it.
4. **Anatomy herbs caption has no herb-less branch.**
   - The spec's test "a dish without a herb still has a captioned herbs layer" is missing.
   - Today every dish gets a Herb row (`dish.ts:221`), so this is a latent gap, not a live bug.
5. **The plate rim edge is not drawn on Anatomy.**
   - The spec asks for it.
   - Leader lines fade in instead of drawing in.
6. **Recorded samples load all at once (≈3.7 MB), not per instrument.**
   - Spec §2 says per instrument; the code comment says all-at-once is deliberate.
   - Decide which is right and update the other.

**Stale docs (cheap to fix, high value for the next agent):**

- **HANDOFF.md is stuck at 2026-10-12, and its history is from the private archive repo.**
  - `cbf8827`, PRs #2–#14 and "Draft PR #1" are all archive-repo numbers.
  - The public repo restarted at `b3c3bab`, and its PR #1 is the merged Station PR, so
    "close Draft PR #1" is now dangerous advice.
  - It's missing `/anatomy`, Eggface, the share-video soundtrack, the 14th arrangement
    (`omelette`) and the `face` garnish.
  - It still says "583 tests (10 files)"; the repo now has 33 test files and 747 tests.
- **README.md:**
  - It doesn't list `/anatomy`.
  - The code map leaves out `anatomy.ts`, `ExplodedPlate.tsx`, `eggface.ts`,
    `station-sounds.ts`, `router.ts` and `station-render.ts`'s own Strudel copy.
  - "Surprise me" is `SURPRISE_WORDS`, not `PUN_WORDS`.
  - `overrideKind` is a map and function, not a field on each ingredient.
  - `npm run build` also runs `build-sitemap.mjs`.
- **CLAUDE.md:**
  - The same `npm run build` gloss is incomplete.
  - The "credits must stay" list doesn't protect the fishdraw, Computerdraw or VSCO footer
    credits.
  - The plate-SVG rule could name its three `dangerouslySetInnerHTML` call sites (PlateCard,
    Stamp, ExplodedPlate); all three are clean today.

**Intended changes, where the spec was never updated:** most of what follows in the station,
share and anatomy sections. Examples: MediaRecorder → Mediabunny, the 720 → 960 px
breakpoint, the volume menu and music in the share video (allowed by the later sound
spec), engine `ref()` gains → `.late()` offsets. Either add short "As built" notes to those
specs or treat them as historical.

**Unbuilt, expected:** share/SEO part C (link previews) and station-sound stages 2–3
(timer, share this mix, cook together, open in Strudel).

**Minor:**
- Confirm the upright piano licence wording. The script says "redistributable"; the README
  says the whole VSCO set is CC0, which matches VSCO 2 CE's licence.
- The footer kitchen credit leaves out pdsounds.org and the licence names; the README has
  them.

---

## README.md

- **`/anatomy` is missing from Screens.** It is routed at `src/App.tsx:83` and has a tab at `:23`. It is themed (`Anatomy.tsx:17`) and has its own SEO (`seo.ts:83,113`). "Dish pages (Plate, Card, Forks, Today)" also leaves it out.
- **The code map leaves out:**
  - `src/lib/anatomy.ts` and `src/components/ExplodedPlate.tsx`
  - `src/lib/eggface.ts` and `src/components/EggfaceCredit.tsx` (with `Dish.easter`, `dish.ts:46,268`)
  - `station-sounds.ts`, `router.ts`, `public/station/strudel.json` and `src/types/strudel.d.ts`
  - the `plate-*.ts` files, covered only by "(+ `plate-*.ts`)"
- **"Surprise me" is wrong:** it picks from `SURPRISE_WORDS` (`App.tsx:64`, `dish.ts:54`), which is `PUN_WORDS` plus extra words.
- **`overrideKind` is not an optional ingredient field.** It's the `KIND_OVERRIDES` map, read through `overrideKind(ingredient, tech)` (`pantry.ts:216-226, 249-253`).
- **The Develop block's `npm run build` comment is incomplete.** It leaves out `&& node scripts/build-sitemap.mjs` (`package.json`).
- **`station-engine.ts` is not "the only module that imports Strudel":** `station-render.ts:4-8` does too, loaded via `import()` from `share-video.ts:57`. The test helper `strudel-check.ts:3-6` also imports Strudel.
- **"Static routes" in the sitemap are only `/`, `/guide`, `/today` and `/parts`** (`sitemap.ts:7`). `/forks`, `/card` and `/anatomy` are left out on purpose, but the README doesn't say so.

## CLAUDE.md

- **The "Strudel stays lazy" rule is broken:** `station-render.ts:4-8` imports five `@strudel/*` packages through a second lazy path (`share-video.ts:57`). The guard test (`station-state.test.tsx:29-35`) checks a fixed file list that leaves out `station-render.ts` and `share-video.ts`.
- **The plate-SVG rule names one place, but there are three injection sites:** `PlateCard.tsx:34`, `Stamp.tsx:27` and `ExplodedPlate.tsx:90`. All are clean. The downloaded SVG file escapes the title into `<title>` (`plate.ts:186-189`); that's a file, not page markup, but the rule doesn't mention it.
- **The `npm run build` gloss leaves out the sitemap step,** so a broken sitemap script fails CI.
- **The palette rule doesn't match the counts:** there are 11 cuisines but 12 palette entries (`palettes.ts:22-56`). The extra one looks like a fallback, and the doc doesn't say so.
- **Not covered:** Eggface (a hand-written dish that bypasses `rng`), the `/anatomy` screen, and the footer credits for fishdraw, Computerdraw and VSCO, which aren't in the "Credits must stay" list.

## HANDOFF.md

- **The history is from the private archive repo.** `main @ cbf8827, PR #11` (line 5), the History table (#2–#11) and "done in #13" all exist only in `codingcuisine.dev-archive`. This repo starts at `b3c3bab` (2026-10-24), and its PRs are #1 Station, #2 share music and #3 Station sound stage 1.
- **"Close Draft PR #1" (lines 63–64) is now wrong:** PR #1 in this repo is the merged Station PR (`6776cdf`).
- **The date is stale:** "State as of 2026-10-12", but the latest commit is 2026-10-25, and the doc itself cites specs from 10-24 and 10-25.
- **`/anatomy` is missing** from Live now and Features (`App.tsx:23,85`, `screens/Anatomy.tsx`, `ExplodedPlate.tsx`, `anatomy.ts`, `anatomySeo`), and from the list of dish pages that take a cuisine colour world (`Anatomy.tsx:17`).
- **The arrangement count is wrong:** 13 → 14 (`omelette`, `look.ts:9`). The `face` garnish is also missing (`look.ts:17`).
- **Eggface is not mentioned** (commit `2f0ca0e`; `eggface.ts`, `EggfaceCredit.tsx`, and the Computerdraw footer credit).
- **The share video's soundtrack is missing from the Share row** (commit `72bca5d`; `share-audio.ts`, `share-video.ts:15,151-152`).
- **Tests are stale:** "583 tests (10 files)", but the repo now has 33 test files and 747 tests.
- **Open item "Mediabunny `bitrate` deprecated":** still true, and the option is now used for audio too (`share-video.ts:152`).
- **Open item "drizzle draws under the food" names the wrong files:** the layer order is set in `anatomy.ts:16` and `station.ts:19` (with a test at `anatomy.test.ts:59`), not only in `look.ts` and `plate.ts`.

## 2026-10-09-share-seo-design.md

- **Encoding approach replaced, Units text not updated:** the spec's Units section has `recordShareVideo` (MediaRecorder) and `canRecordMp4()`. The code has `makeShareVideo`, which encodes frame by frame with Mediabunny/WebCodecs (`src/lib/share-video.ts:141-173`), and `canMakeVideo`/`videoSupported` (`share-video.ts:34-48`). The "As built" note covers the encoding change, but the Units section still names functions that don't exist.
- **`drawShareFrame` signature differs:** the spec has `drawShareFrame(ctx, d, format, t, assets)`, with `assets` supplying `loadPlate(look, t)` and font family names. The code takes `plate: CanvasImageSource | null` (`share-frame.ts:93`) and hardcodes the font families (`share-frame.ts:106, 118, 120, 126, 129`). Plate loading moved to `createPlateImages` (`share-video.ts:95-108`). Hardcoded fonts weaken the part C plan to reuse this code on a server.
- **Titles aren't balanced:** the spec says "at most 2 lines, balanced". `wrapLines` fills the first line greedily (`share-frame.ts:69-87`).
- **Seed word shrinks to 24px, then is cut with an ellipsis** via `ellipsize` (`share-frame.ts:60-66, 118-119`). The "As built" note acknowledges this.
- **The share sheet loads through files the spec doesn't list:** `src/components/ShareButton.tsx` loads it lazily via `lazy-share.tsx`, which has a "Sharing couldn't load" fallback (`lazy-share.tsx:7-35`).
- **Phone vs desktop is a pointer check:** `shareOrDownload` shares only when `prefersShareSheet()` (`pointer: coarse`, `src/lib/device.ts:4-5`) is true (`share-video.ts:175-178`).
- **Soundtrack not in the spec:** `soundtrack()` renders the dish's music as AAC through `share-audio.ts` and `station-render.ts` (`share-video.ts:54-63, 151-160`).
- **Tests differ from the spec:**
  - There are no Playwright tests, so the 7 ± 0.3 s length check and the dimension checks aren't automated.
  - The "50 longest titles wrap to ≤ 2 lines" test was replaced by a width check over 200 generated dishes (`share-frame.test.ts:119`).
- **SEO covers a route the spec doesn't list:** `/anatomy` has its own title and description, a canonical address pointing at `/plate`, and no JSON-LD (`src/lib/seo.ts:82-91, 113`).
- **Part C (link previews) not started:** there is no `functions/` folder, no function rewrites in `firebase.json`, and no per-dish `/og/<word>.png` images (only `public/og/default.png`).

## 2026-10-09-share-video.md (plan)

- **Recording design replaced:**
  - None of the plan's recording pieces exist: `MediaRecorder` + `captureStream`, the MIME list, `pickMime`, `canRecordMp4`, `guardVisibility`.
  - The code uses a Mediabunny `CanvasSource` with fixed H.264 MP4 output (`share-video.ts:8, 148-172`).
  - Review Focus 3 (abort when the tab is hidden) has no code. Frame-exact encoding makes it unnecessary.
- **Function names and signatures differ:**
  - `recordShareVideo` is now `makeShareVideo` (`share-video.ts:141`).
  - `ShareError.kind` is only `'unsupported'`; `'hidden'` was dropped (`:21`).
  - `ensureFonts(load, text)` takes a new `text` argument, built by `shareText(d)` (`:25-31`).
  - `createFrameRenderer(d, format, deps)` takes injected loaders and an `isCurrent` check (`:111-126`).
  - `shareOrDownload` takes a new `preferShare` parameter (`:175`).
  - There are new unplanned exports: `frameTimes`, `createVideoProbe`, `videoSupported`, `createPlateImages`.
- **Plate cache:** the plan keeps at most 8 images, dropping the oldest. The code caches every step and skips caching failed loads (`share-video.ts:89-108`).
- **Word fitting:** the plan's minimum is 40px. The code goes down to 24px, then adds an ellipsis (`share-frame.ts:60-66, 118-119`).
- **Files differ:** `ShareButton` is in its own file, not exported from `ShareSheet.tsx`. The new files `lazy-share.tsx` and `src/lib/device.ts` aren't in the plan.
- **Sheet UI differs:**
  - Two ordered steps, "Make video" then an always-visible "Share video", instead of one button that swaps (`ShareSheet.tsx:112-132`).
  - The PNG is rendered ahead of time (`:15, 59-64`).
  - The finished clip plays in a `<video>` with a "VIDEO READY" caption (`:96-101`).
  - The preview pauses while a video is made or shown (`:26, 37`).
  - The wording changed: the unsupported message names Firefox, and the hint is "H.264, READY FOR INSTAGRAM".
- **Audio added** (`share-audio.ts`, `station-render.ts`).
- **Task 4 Playwright checks:** nothing in the repo records them.

## 2026-10-12-seo.md (plan)

- **Unplanned `/anatomy` route:** `anatomySeo` and `routeSeo('/anatomy', …)` (`src/lib/seo.ts:82-91, 113`; tests at `seo.test.ts:131-141`). Its canonical address points at `/plate`, and it's correctly left out of `STATIC_PATHS` (`sitemap.ts:7`).

## 2026-10-12-dish-anatomy-design.md

- **Component renamed:** the spec puts the drawing in `src/components/Anatomy.tsx`. It lives in `src/components/ExplodedPlate.tsx` (export `ExplodedPlate`), and `src/screens/Anatomy.tsx` is the screen. The plan made this change on purpose.
- **`layer` is required, not optional:** the spec says `Ingredient` and `Step` gain `layer?: LayerName`. In `src/lib/dish.ts:17-18` it is `layer: LayerName`. The plan made this change on purpose.
- **New `Dish.parts` field not in the spec:** `src/lib/dish.ts:36-37,259` adds `parts: { sauce; crunch; herb; finish }`. The spec says "nothing else that reads a dish changes". `anatomy.ts:28-31` uses `parts` for the captions.
- **Tilt is a CSS transform, not an SVG matrix:** the spec wants `transform="matrix(1 0 0 0.5 0 <ty>)"` on each layer group. The code uses a CSS `translateY(...) scaleY(.5)` on `.anatomy__layer` (`src/styles.css:603`). `vector-effect: non-scaling-stroke` only applies to `path` elements, and only while apart (`styles.css:605`).
- **Plate rim edge is missing:** the spec says the plate layer gets a thin rim edge, the lower half of its outline offset down 6 px. Nothing in `ExplodedPlate.tsx` or `plateLayersMarkup` (`src/lib/plate.ts:136-157`) draws it.
- **Breakpoint is 960 px, not 720 px:** the spec uses ≥ 720 px for wide (labels beside the plate) and the desktop gap of 46 px. The code uses `(min-width: 960px)` (`ExplodedPlate.tsx:16`) and `@media (max-width: 959px)` / `(min-width: 960px)` (`styles.css:643,649`).
- **Timing differs:** the spec says tilt and lift begin right after `DRAW_SECONDS`. The code waits `DRAW_SECONDS*1000 + 300` ms (`ExplodedPlate.tsx:46`).
- **Leader lines fade instead of drawing:** the spec says each dashed leader line draws in. They only change opacity (`styles.css:606-615`), with no dash-offset animation.
- **Herbs caption never names the finish alone:** the spec says that with no herb ingredient, the herbs caption names the finish. `anatomy.ts:31` always builds `${parts.herb}, ${finish} to finish`, and `dish.ts:221` always adds a Herb row, so there is no herb-less branch. The spec's test "a dish without a herb still has a captioned herbs layer" is missing from `src/lib/anatomy.test.ts`.
- **Anatomy screen does more than the spec describes:** `src/screens/Anatomy.tsx:168-179` also adds `EggfaceCredit`, `StationCode` and `useStation`/`dishPattern` music.

## 2026-10-12-dish-anatomy.md (plan)

- **Breakpoint changed:** the plan sets 720 px (`@media (max-width: 719px)`, gap 46/34 at 720). The code uses 960 px: `WIDE = '(min-width: 960px)'` (`src/components/ExplodedPlate.tsx:16`) and `@media (max-width: 959px)` (`src/styles.css:649`).
- **viewBox constants changed:** the plan has `VB_TOP = -120, VB_H = 395`. The code has `VB_TOP = -75, VB_H = 330` (`ExplodedPlate.tsx:9`). The label `top` % positions (`ExplodedPlate.tsx:107`) are derived from these.
- **Unplanned `useWide()` hook:** `ExplodedPlate.tsx:19-28` adds a `matchMedia` listener, and the viewBox width switches between 400 and 300 depending on it (`ExplodedPlate.tsx:80`). The plan has a fixed `0 VB_TOP 400 VB_H`.
- **Unplanned behaviour changes in `ExplodedPlate`:**
  - Escape is also handled by a document-level `keydown` listener while something is picked (`ExplodedPlate.tsx:50-56`).
  - `pick` clears hover (`ExplodedPlate.tsx:60`).
  - The toggle cancels the opening timer, held in the `opening` ref (`ExplodedPlate.tsx:42,61`).
  - Clicking empty stage space uses `closest('.anatomy__layer, .anatomy__label')` and clears hover too (`ExplodedPlate.tsx:78`). The plan has `e.target === e.currentTarget`.
- **Unplanned CSS:** `styles.css:642-645` adds a `@media (min-width: 960px)` rule that clamps `.anatomy__line` to 2 lines.
- **Screen differs from the plan's code:** `src/screens/Anatomy.tsx` imports and renders `EggfaceCredit` and `StationCode`, and calls `useStationSound`, `dishPattern` and `useStation` (`Anatomy.tsx:154,158-160,168-170,177,179`). None of these is in the Task 5 Step 5 code or the Interfaces list.

## 2026-10-24-station-design.md

- **A second Strudel importer breaks the "only station-engine" rule:** `station-render.ts:4-8`, loaded via `import()` from `share-video.ts:57`, not from `station-state.tsx`. The guard test at `station-state.test.tsx:30` leaves it out.
- **Music in the share video was out of scope (line 262), but it's live** (`station-render.ts:25`). The 2026-10-25 spec §6.1 superseded this.
- **A volume control and settings menu exist,** though §5 and line 264 said none in v1 (`station-engine.ts:52`, `RadioMenu.tsx`). Superseded by 2026-10-25.
- **Samples and kitchen loops are fetched** (`station-engine.ts:64-120`), beyond "synth voices do most of the work". Superseded.
- **The accessible name differs:** the spec has "Play station" / "Pause station"; the code has "Play Radio" / "Pause Radio" (`RadioTab.tsx:36`).
- **Layers don't fade in with a gain ramp:** `layer()` returns a constant `MAX_PART_GAIN` (`station-engine.ts:33`). Entry comes from `.late(at).filterWhen(...)` in the code (`station.ts:183-187`). The Transitioner's per-part levels drive only the highlight (`station-transition.ts:308`).
- **The ambient set is larger than 5–8 tracks and plays in a daily fixed rotation, not shuffled** (`station-tracks.ts:103,119`, `station-state.tsx:200-207`). Superseded by the 2026-10-25 spec §5.
- **The tables grew:** 14 arrangements (adds `egg`, `omelette`) and 9 garnishes (adds `face`) (`look.ts:9,17`). There's an extra `eggfacePattern` labelled `'French'` (`station.ts:205-219`).
- **Only the first garnish is heard** (`station.ts:166`); the spec gives each of up to 3 garnishes a voice. `chilli` → `warm` with no detune (`:102`).
- **Sour uses vibrato, not detune** (`station.ts:156`).
- **Oval has no wider stereo:** `ROOM` has no pan or width (`station.ts:74-82`).
- **Stroke stats shape only main, crunch and herbs;** plate and sauce ignore them (`station.ts:155-165`).
- **Hue only scales the `lpf` cutoff ×0.85 for warm hues;** there's no change of timbre (`station.ts:126-129`).
- **On Anatomy, the code renders below the plate,** not beside it (`Anatomy.tsx:28-29`).

## 2026-10-24-station.md (plan)

- **The global constraint "only station-engine.ts imports @strudel" is broken** by `station-render.ts` (see above).
- **Dependencies differ:** `@strudel/core`, `/mini` and `/transpiler` are in `dependencies`, not devDeps. `@strudel/tonal` 1.2.6 and `/webaudio` 1.3.0 were added (`package.json:12-18`).
- **"Synth only, no `samples()`, no fetches" no longer holds** (`station-engine.ts:69`, `instruments.ts:45-58`). Superseded.
- **The engine mechanism changed:**
  - The plan had `ref()`-driven per-part and master gain.
  - The code has a constant layer gain (`station-engine.ts:33`) and polls master every 50 ms into `destinationGain` (`:43-47`).
  - Build-up is hush + re-evaluate (`:127-132`) plus `.late()` offsets.
- **The engine API differs:** `startEngine(t, ctx?)`, plus `playCode`, `setVolume`, `ensureSounds` and `setKitchen`.
- **`Transitioner.set(target)` has no `playing` argument.** Its states are `silent | in | out | stopping`, not `idle | fadingOut | building | steady` (`station-transition.ts:319-352`).
- **`CuisineSound` is `{ root, mode, cpm, lead, pad, bass }`,** not `{ scale, cpm, lead, pad, room, delay }`; room comes from `ROOM` by plate shape (`station.ts:30-38`).
- **`INSTRUMENTS` is an `as const` object with 12 voices** (adds `sparkle`, `warm`). `voice(name, sound)` and `dishPattern(d, stats?, sound?)` take an extra `Sound` parameter.
- **`AMBIENT` → `TRACKS`,** with `style` and `after` fields and the new exports `tracksFor`, `trackCode` and `startIndex`. The "5–8 tracks" test can't hold.
- **`strudel-check.ts` also exports `notesIn` and `onsets`.**
- **`useStation` takes `StationRequest` (ambient has no pattern).** The status object grew `settings`, `setSettings`, `soundLoading`, `soundFailed`, `retrySound`, `code`, `prefetch` and `nowAfter`. There's a new `useStationSound` hook and a Follow-the-page freeze (`station-state.tsx:25-28, 228-237`).
- **Radio's label is "Play/Pause Radio",** not "station". There's an extra "Radio settings" ▾ button (`RadioTab.tsx:36, 46-57`).
- **`take` is hard-coded to 0 on Today and Anatomy** (`Today.tsx:43`, `Anatomy.tsx:20`); the plan wanted the date and a remount key.
- **Welcome:** `welcomePattern(count, shape)` has a `'word' | 'plate'` shape. Pitch is `BASE*|freq|` folded down by octaves. The pattern switches at `AT_MORPH` with a fixed `.slow(2)`/`.slow(4)` instead of a swell (`station-welcome.ts:28,411-419`, `Welcome.tsx:56-62`).
- **`plateLayerStats` is called with the whole `Dish`,** not a `PlateLook`; it type-checks structurally.

## 2026-10-25-station-sound-design.md

- **Stages 2–3 are not built (expected):** the timer row and piece (§5), share videos with your sound and kitchen layer (§6.1), Share this mix / `?radio=` (§6.2), Cook together (§6.3), and Open in Strudel plus the CORS header on `/station/**` (§6.4). `firebase.json:12-14` only sets Cache-Control.
- **All samples load at once,** not per instrument as the music needs them (§2). `ALL_SAMPLES` is built at `station-state.tsx:71` and loaded at `:111-115`, so picking Recorded downloads ≈3.7 MB. The comment says this is deliberate.
- **Clicking outside the menu doesn't return focus to ▾** (§1). Escape does (`RadioMenu.tsx:17-22`); the test covers Escape only (`RadioMenu.dom.test.tsx:66-74`).
- **Eno pieces have no voice sample** ("piano, voice, soft strings"; §3). `SAMPLES` has no choir (`instruments.ts:43`). Choir was optional in §2.
- **Mix tracks use original melodies,** not Chef's Table lines over an Eno bed (§3). There are no `after` credits (`station-tracks-eno.ts:74-134`). The plan allowed this; the spec doesn't.
- **The piano licence wording differs:** `scripts/station-samples.py:10` says "Simon Dalzell / Ivy Audio, redistributable", while the README says the whole set is CC0-1.0. Align the wording with VSCO 2 CE's CC0 licence.
- **The footer kitchen credit leaves out pdsounds.org and the PD/CC0 licence names** (`App.tsx:115`); the README has them (`README.md:97-98`).

## 2026-10-25-station-sound-stage1.md (plan)

- **Task 6:** samples load once (`ALL_SAMPLES`) when the engine is ready, not with `await engine.ensureSounds(code)` before each change (`station-state.tsx:71,111-115`).
- **Task 5:** the engine fetches the relative `/station/strudel.json` itself and passes the object to `samples(m)` (`station-engine.ts:67-70`), with an extra `warmSamples` step (`station-sounds.ts:21-24`).
- **Task 5 kitchen crossfade isn't 2 s:**
  - The outgoing loop fades with a 0.6 s time constant and stops after 3 s.
  - The incoming loop rises with `KITCHEN_TC = 0.2` (`station-engine.ts:91-93`, `station-sounds.ts:27`).
  - Kitchen audio goes straight to `ac.destination`, bypassing the station's master gain (`station-engine.ts:121`).
- **Task 3:** trims are piano 5 s and others 6 s (within the limits). The violins use `susVib (v1)` (`station-samples.py:5,37-40`).
- **Task 3 credits:** they sit in the README's general Credits section, not a "Sounds" section. The footer wording differs (`App.tsx:115`).
- **Task 4 tests moved or were renamed:** parsing is covered by `station-parse.test.ts:35-45`. There are extra tests at `station-tracks.test.ts:38,65`.
- **Task 4 Eno loop lengths are 5–23,** not 17/23/29. They're still pairwise coprime.
- **Task 7:** `RadioMenu` takes `{ onClose, toggle, top }` (`RadioMenu.tsx:10`). Focus isn't returned to ▾ after an outside click, though the planned test name says it is.
- **Task 6 adds `retrySound`, an internal `sound` field and the Follow-off frozen-page logic** (`station-state.tsx:45,52-53,211-222`).
