# Station: design

**Status:** shaped in conversation on 2026-10-24; this written spec is awaiting review.
**Goal:** codingcuisine.dev gets a **station**: ambient music, written in Strudel, that keeps
playing as a visitor moves around the site and follows what's on screen. Every dish has its
own music (same word, same music), and it builds as the plate draws. On dish pages the
Strudel code sits beside the recipe and lights up as it plays, which is the "coding" half
of the name.

## Why

The site already turns a word into a dish and a drawing, deterministically. Music is the
next sense: the dish should *sound* like its cuisine and ingredients. The owner wants it
to be **complementary and inspiring to cooking**. It sits behind someone who is reading
a recipe or actually cooking, and lifts the mood without competing for attention.

## Decisions (from the owner)

- **Ambient music that reacts to the dish**, and the purpose is "food, cooked by code": the drawing itself makes the music (§3).
- **Follows what's on screen**, not just a fixed track per dish: the music builds with the
  plate drawing.
- **Strudel** (the browser port of TidalCycles) is the engine. The owner accepted
  Strudel's **AGPL-3.0-or-later** licence and **publishing the code** under it
  (as a fresh public repo; see "Licence decision").
- **The code is visible**, highlighting the part that's playing.
- **Placement C:** a **Radio** control in the nav tab bar (play/pause plus a small level
  meter), and on dish pages the Strudel code shown **beside the recipe**, as part of the
  page. Option A (a strip under the tabs) and option B (a floating corner button) were
  rejected.
- **It's a station:** playback **carries on across page changes**, and the music
  changes when the dish changes.
- **On pages without a single dish** (Welcome, Field guide, Parts) it plays a **set of
  ambient tracks**, except Welcome, which plays its own epicycles (§3).
- **Claude writes the first versions** of the tracks and the cuisine sounds, then **the owner
  tunes them**. They must be easy to find and edit by hand (see §4).

## Anti-goals

These would count as failure even if everything technically works:

- Music that **competes with cooking**: busy melodies, drops, sudden loud hits, harsh
  timbres, fast tempos.
- **Jarring changes**: hard cuts between pages, or a loud hit when a plate layer draws.
- **Grating loops**: anything that annoys within 20 minutes of a pot simmering.
- **Sound starting on its own.** Browsers block it anyway, and it's rude.
- **Breaking determinism**: the same word must give the same music, every visit.
- **Slowing the site for people who never press play**: no Strudel bytes until they do.

## 1. Engine and loading

- Use **`@strudel/web`** (v1.3.x), which bundles core, mini notation, transpiler and
  WebAudio output. Pin an exact version.
- **Lazy, like the share sheet.** Nothing from Strudel loads until the first press of
  Radio. Follow the `lazy-share.tsx` pattern: a small always-loaded `Radio` control, and the
  engine plus code view in a dynamically imported module, with a "Couldn't load the
  station, Reload" fallback.
- **The first press of play** must call Strudel's audio init inside the click handler,
  because of the browser's user-gesture rule. Never try to autoplay, and don't remember
  "was playing" across visits in a way that tries to resume on load.
- **Sounds:** the default Strudel sample maps fetch from third-party hosts. Prefer
  **self-hosting the small set of samples the patterns use** under `public/station/`
  (licence-checked, credited in the README), so the station doesn't depend on someone
  else's CDN. Synth voices (`sine`, `triangle`, `sawtooth` plus filters) need no samples
  and should do most of the work. *Builder's call* how far to go, but the shipped station
  must not break if strudel.cc is down.
- **Determinism:** Strudel's own randomness (`rand`, `degradeBy`, `sometimes`, …) is
  seeded by cycle position, so a given pattern repeats exactly. Any choice made *while
  building* a pattern from a dish (scale, instrument, which layers) uses `rng()` from
  `src/lib/rng.ts` seeded from the dish, never `Math.random`.

## 2. Station state, across pages

- One **station** instance at the `App` level, outside the routed screen, so changing
  routes never tears it down. It holds: playing or paused, the current pattern source,
  and what it's following (a dish or the ambient set).
- **Pages tell the station what's on screen**, ideally with a hook like
  `useStation({ kind: 'dish', dish, drawStart })` or `useStation({ kind: 'ambient' })`.
- **Changes crossfade** over about 4–8 seconds, or land on the next cycle boundary
  followed by a gain ramp. They never cut hard. Going from the Field guide to a plate fades
  the ambient set into the dish.
- **Which pages follow a dish:** Plate, Forks (the parent dish; *builder's call* whether
  forks shift it), Today/Day, Card, Anatomy. **Ambient:** Field guide, Parts. **Welcome:** its own target (§3).
- Pause is global and persists across page changes in the session.
- **Reduced motion:** `prefers-reduced-motion` doesn't silence audio, but code
  highlighting should stop animating (show the code statically).

## 3. Dish → music

Built by a pure function, **`src/lib/station.ts`**, with no DOM and no Strudel import:
`dishPattern(d: Dish): { code: string; parts: PatternPart[] }`. It returns **Strudel
source code as a string**, which is what the code panel shows and what gets evaluated.
Pure and string-based means it's testable in vitest without audio.

**Cuisine sets the world.** For each of the 11 cuisines (Farmers-market, Indian, Italian,
Japanese, Korean, Levantine, Mediterranean, Mexican, Nordic, North African, Southeast
Asian) define a scale or mode, tempo range, a lead voice, a pad voice and the room
(reverb/delay). Lean on evocative-but-gentle choices: Japanese pentatonic and koto-ish
plucks, Levantine/North African Hijaz-flavoured modes on soft drones, Nordic slow sparse
glass tones, Indian a tanpura-like drone. All of these stay slow (roughly 60–80 bpm feel)
and soft. These are **first drafts for the owner to tune**.

**The drawing plays the music.** This is the station's purpose, added by the owner on
2026-10-24 under the line **"food, cooked by code"**. The music isn't a soundtrack
laid over the plate. It is **derived from the drawing itself**, so what you see and what you
hear are the same object, and the code panel shows how one becomes the other. The
cuisine sets the key and instruments, and **the drawing sets everything else**:

- **Arrangement (`kind`, 13 values) → rhythm and melodic shape of the main part.** For
  example, `swirl` is a slow circling arpeggio, `nest` overlapping loops of different
  lengths (polymeter), `mound` a low steady pulse, `halves` call and answer, `fan` a rising
  spread, `scatter` sparse random-but-seeded notes, `stack` chords, `slices` evenly
  spaced repeated notes. Each of the 13 kinds gets a motif rule, which is a first draft
  for the owner to tune.
- **Plate shape (7) → the room.** `round` is even and centred, `oval` a longer delay and
  wider stereo, `coupe` close and intimate, `bowl` warm and enclosed, `slate`/`board` drier
  and more woody, `square` tighter.
- **Sauce style (5) → the bass line's gesture.** `pool` is one held note, `swoosh` a slow
  glide, `dots` spaced plucks, `drizzle` a thin falling line, `none` no bass.
- **Garnishes (0–3 of 8) → the herbs part's sparkle.** Each garnish has a small voice:
  `seed` soft ticks, `flake` glints, `zest` bright high notes, `chilli` a little warmth
  and detune, and so on.
- **Strokes → notes.** Per layer, the drawing's stroke count, total and mean stroke
  length set note density and note lengths: busy short strokes are many short notes,
  one long swoosh is one long held note. You hear the pen.
- **Colours (layer hex colours) → tone.** Lightness opens or closes the filter, warmth
  (hue) leans the timbre warmer or cooler.
- **Flavour radar `r`** stays a light seasoning on top (umami deepens the drone, sour
  adds a touch of detune), and is kept subtle.
- **The seed word** feeds `rng()` for any choice the above leaves open.

**Welcome plays the word.** The welcome animation's epicycles are a Fourier series, the
same maths as additive synthesis. While the circles write "codingcuisine" and morph into
the plate, each audible circle is a soft sine partial: frequency from its index, level
from its radius, so the welcome **plays the shape it draws**. The circle slider (4–256)
changes richness, with audio capped at the **16 largest circles** for CPU and calm.
Welcome is therefore **not** an ambient page. It has its own "welcome" target. After the
morph finishes it settles into a gentle drone of the plate's partials.

**Instruments are a registry.** Every voice the generator uses is a named entry in one
list (`INSTRUMENTS`: name → Strudel sound chain, e.g. `glass: 's("sine").decay(.8).room(.7)'`).
Cuisines, arrangements and garnishes refer to instruments **by name**. Adding an
instrument is one entry. Recorded samples can be added later as registry entries that
point at files under `public/station/`, with no other code changes.

**Following the plate drawing.** The plate draws in five layers, in order **plate, sauce,
main, crunch, herbs**, with delays **0, 0.9, 1.6, 2.4 and 3.0 s** and about 0.9 s each
(`styles.css` `.draw .d0`–`.d4`; the SVG/SMIL path in `plate.ts` uses the same `ly.at`
timings). The pattern is built from **five matching parts**. Each one fades in (gain ramp,
not a hit) as its layer draws, so the music assembles with the drawing. The plate is the
drone or pad, the sauce a slow bass, the main the lead motif, the crunch soft texture, and
the herbs high sparkle. "Replay drawing" (the `take` bump) replays the build-up. After the
drawing, all five parts keep playing as the dish's steady loop.

- **When a crossfade meets a build-up** (for example Field guide → Plate), the drawing
  wins. The outgoing pattern ramps down quickly (about 1–1.5 s), and the build-up does the
  fading in, so the "music assembles with the drawing" moment isn't lost inside a slow
  crossfade. The 4–8 s crossfade in §2 applies only when there's no drawing to follow
  (dish → ambient, ambient track → ambient track, dish → dish with no redraw).
  *Claude's call, following the owner's "follow what's on screen".*
- Sync is "close enough": start the layer ramps from the moment the drawing mounts.
  It doesn't need sample-accurate alignment with the SVG.
- If the station is paused, the drawing runs as normal. Pressing play later starts
  the full loop, with no build-up.

## 4. Ambient set

- **`src/lib/station-tracks.ts`** (or a `station/` folder of `.strudel`/`.ts` files): **5–8
  hand-written ambient Strudel pieces**, each a plain code string with a title. Write
  them so the owner can open the file and tune them like a Strudel REPL session.
- They rotate like a playlist on ambient pages, with a crossfade between pieces. Each piece
  runs a few minutes before the next. *Builder's call*: deterministic order (for example
  by date) or shuffled. Shuffle is fine here because it isn't a dish.
- Same anti-goals: calm, warm, long-breathing, nothing percussive up front.

## 5. UI

- **Radio tab** at the end of `TABS` in `App.tsx`. It's a button, not a route: a play/pause
  toggle labelled "Radio" with a tiny 3-bar level meter that moves only while playing
  (static with reduced motion). It uses the existing `.tab` styling, so it sits in the
  mono, uppercase, letter-spaced tab bar. Accessible name: "Play station" / "Pause
  station", with `aria-pressed`.
- **Code beside the recipe** on dish pages: a dark code block (ink on the cuisine's
  colours, or the site's dark ink background) placed with the recipe text, showing the
  dish's pattern. The playing parts highlight, using Strudel's mini-notation location
  highlighting or at minimum the five parts lighting up as they enter. **Read-only** for
  now (live editing is a later idea). Only shown on dish pages, and only once the station
  has loaded at least once. *Builder's call* whether it shows before first play; the
  owner's picture was code visible on dish pages.
- **Layout per page:** Plate and Anatomy have room beside the recipe. On phones, stack it
  below the recipe. Card is a print layout, so the code must **not print** (`@media print`
  hides it).
- Small "Now playing" text in the code block header: dish title or ambient track title,
  plus cuisine.
- **No volume slider in v1.** Keep the master gain low by default, since the system volume
  exists. *Builder's call* if a quiet/normal toggle is wanted.

## 6. Licence

- Strudel is **AGPL-3.0-or-later**. Shipping it on the site means visitors must be able
  to get the site's **corresponding source**.
- **The repo `futurechef/codingcuisine.dev` is currently private with no licence.** The
  owner decided to make it public under AGPL-3.0 (see "Licence decision"): add `LICENSE`,
  credit Strudel in the README alongside Hershey Fonts and Mediabunny, and add a "Source"
  link in the footer.
- Self-hosted samples need their own compatible licences, credited.

## 7. Testing

- `station.ts` is pure, so vitest covers it: the same dish gives an identical code string;
  every cuisine produces a pattern; five parts in layer order; the radar mapping stays in
  bounds (gain never above the ceiling, tempo inside the calm range); no `Math.random`.
- **Every generated pattern and ambient track parses**: run Strudel's transpiler/
  evaluator in tests without audio output if feasible. Otherwise do a syntax check of the
  mini-notation strings. *Builder's call*, but a broken pattern must fail CI, not the
  visitor's ears.
- Lazy loading: a test, like `lazy-share.test.tsx`, that no Strudel module is in the
  initial import graph.
- `npm test` and `npm run build` pass. The main bundle size doesn't grow beyond the small
  Radio control.
- Manual check on the PR preview: play on Welcome, move to a plate (crossfade), Replay
  drawing (build-up), Field guide (back to ambient), pause, and check on a phone.

## Licence decision (owner, 2026-10-24)

- **Go public under AGPL-3.0, from a fresh repo.** This is the **first task** of the
  build, before any Strudel code reaches a PR preview, since public preview channels count
  as distribution.
- **Why a fresh repo:** squashing the existing repo wouldn't hide its history, because
  GitHub keeps old PRs (#2–#14) and their diffs reachable. A private repo plus a public
  mirror would drift, and AGPL needs the public source to match what's deployed.
- **Steps:**
  1. Move ops details (Porkbun records, IAM, service account, the "Don't" list's infra
     items) out of `CLAUDE.md`/`HANDOFF.md` into a private ops note. The public docs keep
     only develop/test/deploy-by-CI.
  2. Rename the current private repo to `futurechef/codingcuisine.dev-archive` (it stays
     private and keeps the full history).
  3. Create a new **public** `futurechef/codingcuisine.dev` from one clean commit of the
     current tree, with `LICENSE` (AGPL-3.0-or-later), a README crediting Strudel, and a
     footer "Source" link.
  4. **Rotate the deploy key:** create a new key for
     the deploy service account (no role changes), set the `FIREBASE_SERVICE_ACCOUNT`
     secret and the `FIREBASE_PROJECT_ID` variable on the new repo, then delete the old
     key. This needs the owner's explicit OK at the time, per CLAUDE.md.
  5. Confirm a push to `main` deploys and a PR gets a preview, before any station work.
- A pattern scan of the history on 2026-10-24 found no committed keys or private keys.

## Roadmap (after v1, not in this build)

Agreed direction from the conversation, to pick from later:

- **Hear the layers:** tap a layer in the code panel or on Anatomy to solo or mute it,
  so you learn what each part sounds like.
- **Cooking companion:** the music follows the recipe step you're on (unhurried prep,
  livelier sear, settled rest), then times itself to each step so you can hear when to
  move on.
- **Recorded instruments:** sample-based entries in the instrument registry.
- **Make your own:** edit the code live, hear it, share a remix link.

## Out of scope (v1)

- Live-editing the code on the page, or a full Strudel REPL.
- Music in the share video/MP4.
- Saving or sharing a "track" link separate from the dish link.
- Volume mixer, track skipping and a playlist UI.

## Left to the builder

The exact sound design per cuisine, the radar mapping numbers, the crossfade mechanics in
Strudel, highlighting implementation, sample choice and hosting details, the ambient set's
order, and file layout. All of these fit the anti-goals and decisions above.
