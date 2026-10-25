# Station sound, Stage 1 (the sound) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Radio gets a settings menu (Sound, Style, Kitchen, Follow the page, Volume, Now playing), recorded instruments, four ambient styles with new tracks, and a kitchen layer.

**Architecture:** A pure settings module (validated, persisted) feeds `StationProvider`, which picks the ambient track from the chosen style, applies the chosen sound to the code it plays, and freezes page-following when asked. The instrument registry gains a recorded voicing per instrument, and dish patterns take a `sound` argument. Ambient tracks are written in recorded form and converted to code voices mechanically. The engine (still the only `@strudel/web` importer) registers the self-hosted sample map, loads the samples the code needs before a swap, applies volume, and plays the kitchen loop.

**Tech Stack:** React 18, TypeScript, Vite 5, vitest (+jsdom for `*.dom.test.tsx`), `@strudel/web` 1.3.0 (`samples`, `loadBuffer`), a Python venv in the scratchpad (numpy, soundfile, lameenc) for one-off sample conversion.

**Spec:** `docs/superpowers/specs/2026-10-25-station-sound-design.md` (Stage 1 = §1, §2, §3, §4). Base spec: `docs/superpowers/specs/2026-10-24-station-design.md`.

## Global Constraints

- Strudel stays lazy: nothing from Strudel, no sample or kitchen file, loads before the first Radio press. Only `station-engine.ts` imports `@strudel/web` (the existing test in `station-state.test.tsx` enforces this; extend it to new files).
- No user text in Strudel code; settings map to fixed code from a whitelist.
- Same word + same settings → same music.
- Defaults: Sound `code`, Style `mix`, Kitchen `off`, Follow the page on, Volume 0.8.
- Track house rules: one `setcpm` between 15 and 20, slow attacks, nothing loud up front.
- Samples: CC0/public domain preferred, CC-BY with credit; self-hosted under `public/station/`; full recorded set ≈ 4 MB (test caps it at 4.5 MB); each kitchen loop ≤ 1 MB.
- Chef's Table: public-domain compositions only, fresh arrangements from the original score, title "after <Composer>, <Piece>".
- Settings in `localStorage` key `station-settings`, every access in try/catch; never remember "was playing".
- Timer and Share rows are not shown in Stage 1.
- No infra details in the public repo.

## Review Focus

1. Switching Sound to *Recorded* while playing, on a slow connection: music must keep going on code voices and crossfade only once samples are ready; a failed load shows the message and stays on Code. → Task 6 test `stays on code until the samples are ready, and says so if they fail`.
2. Corrupt or old `localStorage` (`{"sound":"loud","volume":7}`, non-JSON, storage that throws): must fall back per field, never crash. → Task 1 tests.
3. Turning *Follow the page* back on after browsing: must jump to the current page's music, not the page where it was frozen. → Task 6 test `follow on again plays the page you are on`.
4. A track using a sample name with no code substitute would play silence in Code sound. → Task 4 test `every track only uses registered sample names`.
5. Menu on a 360 px phone with Radio scrolled near the end of the nav: must open inside the viewport. → Task 7 test asserts the menu is `position: fixed` via its class and CSS rule; verified by eye in Task 8.

---

### Task 1: Settings

**Files:**
- Create: `src/lib/station-settings.ts`
- Test: `src/lib/station-settings.test.ts`

**Interfaces:**
- Produces:
  - `type Sound = 'code' | 'recorded'`, `type Style = 'mix' | 'chefs-table' | 'eno' | 'originals'`, `type Kitchen = 'off' | 'rain' | 'cafe'`
  - `interface StationSettings { sound: Sound; style: Style; kitchen: Kitchen; follow: boolean; volume: number }`
  - `DEFAULT_SETTINGS: StationSettings`, `STYLE_LABEL: Record<Style, string>` ("Mix", "Chef's Table", "Eno", "Originals"), `KITCHEN_LABEL: Record<Kitchen, string>` ("Off", "Rain", "Café")
  - `parseSettings(raw: unknown): StationSettings`: validates each field on its own; volume clamped to 0–1, non-numbers fall back
  - `loadSettings(storage?: Pick<Storage,'getItem'>): StationSettings`, `saveSettings(s: StationSettings, storage?: Pick<Storage,'setItem'>): void`: key `station-settings`; both swallow errors

- [ ] **Step 1: Write failing tests**: `defaults when nothing is stored`; `keeps good fields and drops bad ones` (`{"sound":"recorded","style":"jazz","volume":7}` → sound recorded, style mix, volume 1); `non-JSON and a throwing storage give defaults`; `round-trips through save and load`; `never stores a playing flag` (saved JSON keys are exactly the five settings).
- [ ] **Step 2: Run** `npx vitest run src/lib/station-settings.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** in `src/lib/station-settings.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(station): settings for sound, style, kitchen, follow and volume`.

### Task 2: Recorded voicings in the registry; dish music takes a sound

**Files:**
- Modify: `src/lib/instruments.ts`, `src/lib/station.ts` (`dishPattern`, `eggfacePattern`, wherever `voice(` is called)
- Modify callers: `src/screens/{Anatomy,Card,Forks,Home,Today}.tsx` (pass the sound from Task 6's hook; until Task 6 lands, the default `'code'` keeps them compiling)
- Test: `src/lib/station.test.ts`, `src/lib/eggface.test.ts`

**Interfaces:**
- Consumes: `Sound` (Task 1)
- Produces:
  - `SAMPLES = ['piano', 'violins', 'violas', 'cellos', 'contrabass', 'harp'] as const`; `type SampleName`
  - `RECORDED: Record<Instrument, string>`: each instrument's recorded chain, starting with `s("<SampleName>")` (mapping is the builder's call by ear; starting point: pad→violins, drone→cellos, pluck→harp, koto→harp, glass→piano, bell→piano, tick→stays the synth click, breath→stays pink noise, bass→contrabass, tanpura→cellos, sparkle→piano, warm→violas)
  - `SAMPLE_STANDIN: Record<SampleName, string>`: the synth chain that replaces `s("<name>")` in Code sound (e.g. `cellos: 's("sawtooth").lpf(600)'`)
  - `voice(name: string, sound: Sound = 'code'): string`
  - `dishPattern(d: Dish, stats?: LayerStats[], sound: Sound = 'code'): StationPattern` (same for the Eggface path)

- [ ] **Step 1: Write failing tests** in `station.test.ts`: `code sound is unchanged` (snapshot of `dishPattern(dish('leek')).code` equals the code before this change, captured in the test as a literal from today's output); `recorded sound uses only registered samples` (every `s("x")` in `dishPattern(dish(w), undefined, 'recorded').code` for 50 words is in `SAMPLES` or a synth name `sine|triangle|sawtooth|square|pink`); `recorded music still parses and plays` (`haps(code, 4) > 0` for 20 words); `same word, same sound, same music`. In `eggface.test.ts`: recorded Eggface still plays `note("e4 g4 g4 f4 a4 c5 e5`.
- [ ] **Step 2: Run** `npx vitest run src/lib/station.test.ts src/lib/eggface.test.ts`. Expected: new tests FAIL (no third argument / RECORDED undefined).
- [ ] **Step 3: Implement.** The `haps` helper evaluates without loading samples, so recorded code must still produce haps offline (it does: haps are pattern events, not audio).
- [ ] **Step 4: Run** the same command plus `npx tsc -b`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat(station): recorded voicing for every instrument; dish music takes a sound`.

### Task 3: The samples (assets, map, credits)

**Files:**
- Create: `scripts/station-samples.py` (reproducible converter; header comment lists sources, licences and the venv deps), `public/station/strudel.json`, `public/station/<sample>/<note>.mp3`
- Modify: `README.md` (Sounds credits), `src/App.tsx` footer credits line, `firebase.json` (`/station/**` → `Cache-Control: public, max-age=604800`)
- Test: `src/lib/station-samples.test.ts`

**Interfaces:**
- Consumes: `SAMPLES` (Task 2)
- Produces: `public/station/strudel.json` in Strudel's pitched-map format: `{ "_base": "/station/", "<name>": { "<note e.g. c3>": "<name>/c3.mp3", ... } }`, one entry per `SampleName`.

- [ ] **Step 1: Write failing test** `station-samples.test.ts` (node fs via `?raw`/`import.meta.glob` is not available for binaries, so use `node:fs` in this test only, under the default node environment): `the map names every sample`; `every file in the map exists`; `full recorded set is under 4.5 MB`; `kitchen loops are each under 1 MB` (skips if `public/station/kitchen/` is absent until Task 5 adds it, so keep the assertion conditional on the directory and add the presence assertion in Task 5).
- [ ] **Step 2: Run** `npx vitest run src/lib/station-samples.test.ts`. Expected: FAIL, no map.
- [ ] **Step 3: Download sources** into a fresh scratchpad directory (untrusted data, nothing executed from it): from `github.com/sgossner/VSCO-2-CE` (CC0-1.0, verified): `Keys/Upright Piano` (dyn1), `Strings/Violin Section` (sustain), `Strings/Viola Section/susvib` (v1), `Strings/Cello Section/susvib` (v1), `Strings/Solo Contrabass/SusVib`, `Strings/Harp` (mf). About 6–10 notes each, spaced 3–5 semitones over the range the tracks use.
- [ ] **Step 4: Convert** with `scripts/station-samples.py` in a scratchpad venv: mono, trim (strings and piano ≤ 7 s, harp ≤ 4 s), 0.4 s fade-out, peak-normalise to −3 dBFS, MP3 96 kbps (iPhone Safari decodes MP3). Write `strudel.json`.
- [ ] **Step 5: Run** the test. Expected: PASS; print the total size.
- [ ] **Step 6: Credits:** README "Sounds" section naming VSCO 2 Community Edition (CC0) with link; footer adds "Sounds: VSCO 2 CE".
- [ ] **Step 7: Commit** `feat(station): self-hosted CC0 instrument samples`.

### Task 4: The four styles and their tracks

**Files:**
- Modify: `src/lib/station-tracks.ts` (may split to `station-tracks-*.ts` per style if it passes ~300 lines)
- Test: `src/lib/station-tracks.test.ts` (new); extend `src/lib/station-parse.test.ts` if it iterates `AMBIENT`

**Interfaces:**
- Consumes: `Style`, `Sound` (Task 1); `SAMPLES`, `SAMPLE_STANDIN` (Task 2)
- Produces:
  - `interface AmbientTrack { id: string; title: string; after?: string; style: Style; minutes: number; code: string }` (`code` written in recorded form)
  - `TRACKS: readonly AmbientTrack[]`; `tracksFor(style: Style): AmbientTrack[]`: for `mix`, the mix tracks
  - `trackCode(t: AmbientTrack, sound: Sound): string`: recorded returns `t.code`; code replaces each `s("<SampleName>")` with `SAMPLE_STANDIN[name]`
  - `ambientPattern(t: AmbientTrack, sound: Sound): StationPattern`, `label: 'Ambient'`
  - `startIndex(n: number, day: number): number` = `day % n` (day = days since epoch, local), so the rotation is fixed but the first track varies by day

- [ ] **Step 1: Write failing tests**: counts (`chefs-table` ≥ 5, `eno` ≥ 4, `mix` ≥ 4, `originals` = the 6 existing ids); `chefs-table tracks credit their source` (`after` matches `/^after (Vivaldi|Bach|Satie|Debussy|Chopin|…), /`); `every track only uses registered sample names` (every `s("x")` in `t.code` is in `SAMPLES` or a synth name); `every track parses and plays in both sounds` (`haps(trackCode(t, s), 8) > 0`); `house rules` (exactly one `setcpm(n)` with 15 ≤ n ≤ 20); `code sound has no sample names left`; `ids are unique`; `startIndex is stable for a day and stays in range`.
- [ ] **Step 2: Run** `npx vitest run src/lib/station-tracks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the tracks.** Chef's Table: Vivaldi *Winter* II (Largo), Bach *Air* (BWV 1068), Satie *Gymnopédie No. 1*, Debussy *Clair de lune*, Chopin Prelude Op. 28 No. 4, each a slowed fragment of the melody over a simplified harmony, strings and piano. Eno: ≥ 4 originals, 3–5 phrases each with `.slow()` lengths that share no factors (e.g. 17, 23, 29), lots of rests, long `room`. Mix: ≥ 4, a Chef's Table line (or an original string melody in that manner) over an Eno bed. Originals: the six existing tracks, `style: 'originals'`, unchanged code (they use synths only).
- [ ] **Step 4: Run** the test and the whole suite (`npx vitest run > .superpowers/sdd/<plan>/t4.log; tail`). Expected: PASS.
- [ ] **Step 5: Commit** `feat(station): Chef's Table, Eno and Mix ambient styles`.

### Task 5: Engine: samples, volume, kitchen

**Files:**
- Modify: `src/lib/station-engine.ts`; `src/lib/station-transition.ts` only if the level plumbing needs a volume factor
- Create: `src/lib/station-sounds.ts` (pure helpers), `public/station/kitchen/{rain,cafe}.mp3`
- Test: `src/lib/station-sounds.test.ts`; extend `station-samples.test.ts` (kitchen files present, ≤ 1 MB)

**Interfaces:**
- Consumes: `SampleName`, `SAMPLES` (Task 2), `Kitchen` (Task 1)
- Produces (engine):
  - `ensureSounds(code: string): Promise<void>`: on first call registers `samples(location.origin + '/station/strudel.json')`; then loads every file for the samples `code` uses (`loadBuffer`, from `@strudel/web`; if it isn't exported, fetch the files so the HTTP cache is warm, and ledger it); resolves when all are loaded, rejects on failure
  - `setVolume(v: number): void`: output gain becomes `master × v`
  - `setKitchen(k: Kitchen): Promise<void>`: decodes `/station/kitchen/<k>.mp3` in the station's AudioContext, loops it through its own gain at `KITCHEN_LEVEL = 0.25 × master × volume`, crossfades between rain/café/off over 2 s
- Produces (pure, `station-sounds.ts`): `samplesIn(code: string): SampleName[]` (unique, only registered names); `KITCHEN_LEVEL`

- [ ] **Step 1: Write failing tests** for `samplesIn` (finds `cellos` and `piano` in a stack, ignores synths and unknown names, de-duplicates).
- [ ] **Step 2: Run** `npx vitest run src/lib/station-sounds.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `station-sounds.ts`, then the engine functions. Kitchen recordings: find CC0 or public-domain rain-on-a-window and distant-café recordings on Wikimedia Commons (direct download, licence shown on the file page; verify CC0/PD per file), convert with the Task 3 script to a seamless 30–60 s loop (equal-power crossfade of tail into head), MP3 96 kbps mono, ≤ 1 MB. Credit each in README and footer.
- [ ] **Step 4: Run** the tests and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(station): engine loads recorded samples, sets volume, plays the kitchen layer`.

### Task 6: StationProvider uses the settings

**Files:**
- Modify: `src/lib/station-state.tsx`; screens from Task 2 (use the hook below for the sound)
- Test: `src/lib/station-state.test.tsx` (extend), `src/lib/station-state.dom.test.tsx` (new, jsdom, fake engine)

**Interfaces:**
- Consumes: Tasks 1, 2, 4, 5
- Produces:
  - `StationStatus` gains `settings: StationSettings`, `setSettings(patch: Partial<StationSettings>): void`, `nowPlaying` (unchanged type) and `nowAfter?: string`, `soundLoading: boolean`, `soundFailed: boolean`
  - `useStationSound(): Sound`: what screens pass to `dishPattern`
  - The ambient order is `tracksFor(style)` rotated from `startIndex(n, today)`, replacing `shuffled()`
  - In *Recorded*, before the target's code changes, `await engine.ensureSounds(code)`; until then the previous target keeps playing in Code sound; on failure set `soundFailed`, fall back to `sound: 'code'` for this visit (don't persist the fallback)
  - Follow off: keep the target that was playing; the latest page request is remembered, and switching follow back on applies it
  - Settings persist with `saveSettings` on every change; volume/kitchen changes call the engine directly when it's loaded

- [ ] **Step 1: Write failing tests** with a fake engine (resolvable `ensureSounds`): `plays the chosen style's tracks` (code equals `trackCode(tracksFor('eno')[i], 'code')`); `stays on code until the samples are ready, and says so if they fail`; `follow off keeps the music; follow on again plays the page you are on`; `settings survive a remount` (via a fake storage); `no sound starts on mount even with saved settings`; extend the lazy-load test's file list with the new modules.
- [ ] **Step 2: Run** `npx vitest run src/lib/station-state.test.tsx src/lib/station-state.dom.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** those tests, then the whole suite into the workspace log. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(station): the station follows your settings`.

### Task 7: The Radio menu

**Files:**
- Create: `src/components/RadioMenu.tsx`
- Modify: `src/components/RadioTab.tsx` (▾ button next to Radio, aria-label "Radio settings"; Radio's own label becomes "Play Radio"/"Pause Radio"), the stylesheet that holds `.radio` styles
- Test: `src/components/RadioMenu.dom.test.tsx`; update `RadioTab.dom.test.tsx` for the new labels

**Interfaces:**
- Consumes: `useStationStatus()` with Task 6's fields; `STYLE_LABEL`, `KITCHEN_LABEL`
- Produces: `<RadioMenu onClose={() => void} />`, rendered by `RadioTab` when open

Menu content (copy fixed): rows **Sound** (radios "Code", "Recorded"), **Style** (select), **Kitchen** (radios "Off", "Rain", "Café"), **Follow the page** (checkbox), **Volume** (range 0–1 step 0.05), **Now** line ("<title>" + " · after …" when present, dish name on dish pages). When `soundLoading`: "Loading instruments…". When `soundFailed`: "Couldn't load the recorded instruments." with a "Try again" button.

- [ ] **Step 1: Write failing tests**: `▾ opens and closes the menu; Escape and a click outside close it; focus returns to ▾`; `every control has a label`; `changing Style calls setSettings({style})`; `shows loading and failure messages`; `Radio still plays and pauses with one tap`; `menu uses the fixed-position class` (`.radio-menu`), and the CSS rule for `.radio-menu` contains `position: fixed`.
- [ ] **Step 2: Run** `npx vitest run src/components`. Expected: FAIL.
- [ ] **Step 3: Implement** with existing palette tokens; on screens ≤ 600 px the menu spans the width minus the 16 px gutters, under the nav.
- [ ] **Step 4: Run** `npx vitest run` (whole suite) and `npm run build`. Expected: PASS, build succeeds, main bundle has no Strudel (`grep -L strudel dist/assets/index-*.js`).
- [ ] **Step 5: Commit** `feat(station): Radio settings menu`.

### Task 8: Docs, listening check, PR

**Files:**
- Modify: `README.md`, `HANDOFF.md`, `CLAUDE.md` (station section: settings, styles, samples, kitchen, how to tune a track), the station spec's status line

- [ ] **Step 1: Listen and measure** in Chrome on `npm run preview`: each style in both sounds plays; Recorded loads (network shows only the needed `/station/*.mp3`, nothing before the first press); switching sound/style crossfades (analyser shows no gap or spike); kitchen rain/café loop without a click; volume changes level; follow off holds across a page change; menu fits at 360 px.
- [ ] **Step 2: Docs** updated.
- [ ] **Step 3: Final whole-branch review** (fresh reviewer, most capable model), fix Critical/Important with tests.
- [ ] **Step 4: Push** `feat/station-sound` to `futurechef/codingcuisine.dev` and open a PR (preview channel deploys). Merge only when the owner says so.
