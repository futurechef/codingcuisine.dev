# Station sound: design

**Status:** approved by the owner on 2026-10-25, to ship in three stages (below).
**Builds on:** `2026-10-24-station-design.md` (the station as shipped). Everything there
still holds unless this document changes it.
**Goal:** the station's background music becomes the part of the site that inspires. It gets
real recorded instruments (strings, piano, cello, harp) as an option, new ambient pieces in
the spirit of *Chef's Table* and Brian Eno, a settings menu under Radio, and four ways to
share what you're hearing.

## Why

The owner listened on an iPhone: the station works and some of the dish tunes are "actually
good", but the **ambient background music is where the site can shine**. The current six
ambient tracks are thin synth loops written to stay out of the way. The owner wants the feel
of the classical music used in Netflix's *Chef's Table* (big, slow strings: Vivaldi's Four
Seasons is the famous one) **with some Brian Eno mixed in** (slow piano and voice loops of
different lengths that drift in and out of line, so they never repeat the same way). The test
for every decision here is **inspiration**: does it make someone want to cook?

## Decisions (from the owner)

- **Recorded instruments are a setting**, not a replacement: pure code synthesis stays as an
  option.
- **Radio gets a settings dropdown** so the listener can customise the station.
- **Get creative:** the owner asked for ideas and approved the full set proposed in
  conversation ("love it all"): Sound, Style, Kitchen layer, Timer, Follow the page, Volume,
  Now playing.
- **Shareable**, with all four proposed shares kept ("keep it all"): share videos use your
  sound; mix links; cook-together timer links; open the playing code in Strudel.

## Anti-goals

Everything in the original spec's anti-goals still applies (nothing that competes with
cooking, no jarring changes, no grating loops, no sound starting on its own, determinism
kept, nothing loaded for people who never press play). Also:

- **Copyright trouble.** No recordings from *Chef's Table* or anywhere else, no modern
  composers' scores, no copying Eno's actual pieces. Public-domain compositions played from
  fresh, hand-written arrangements, and Eno's *technique*, are fine.
- **A heavier site for everyone.** Sample files load only when someone picks *Recorded*
  (or opens a link that asks for it), never on page load and never for the code sound.
- **A settings menu that gets in the way of listening.** Radio still plays and pauses with
  one tap; the menu is extra.
- **Breaking the station if a sample host is down.** Every file is self-hosted.
- **Anything personal in a shared link.** Links carry settings and a time, nothing else.

## 1. The settings menu

Radio stays one button that plays and pauses. Next to it, a small **▾** opens a menu that
drops down from the Radio tab:

```
 ♪ Radio  ▾
 ┌───────────────────────────────┐
 │ Sound     ○ Code  ● Recorded  │
 │ Style     Chef's Table ▾      │
 │ Kitchen   ○ off  rain  café   │
 │ Timer     off ▾  (12 min)     │
 │ Follow the page   ● on        │
 │ Volume    ━━━━━●━━            │
 │ Now: after Satie, Gymnopédie 1│
 │ Share this mix · Open in      │
 │ Strudel                       │
 └───────────────────────────────┘
```

- **Sound:** *Code* (today's synth voices) or *Recorded* (sampled instruments, §2).
  Default: *Code*, so nobody downloads samples they didn't ask for.
- **Style:** which ambient set plays on pages without a dish (§3): *Mix* (default),
  *Chef's Table*, *Eno*, *Originals*.
- **Kitchen:** an optional quiet background layer: *off* (default), *rain* (on a window),
  *café* (a far-off murmur). It sits under the music, never louder than it (§4).
- **Timer:** *off* or a length; a timer turns the music into a piece that lasts exactly
  that long and ends on a final chord (§5).
- **Follow the page:** on (default) is today's behaviour. Off keeps whatever is playing
  (a dish's music or the current ambient track) as you move around the site.
- **Volume:** the station's own level, on top of the device's volume.
- **Now playing:** the dish name, or the track title plus what it's based on ("after Satie,
  Gymnopédie No. 1"). This also fixes the deferred gap that the ambient track name wasn't
  shown.
- **Share** actions at the bottom (§6).

Behaviour:

- **The menu works whether or not the station is playing.** Changing a setting while it
  plays crossfades into the change the way page changes already do; never a hard cut.
- **Remembered on this device** (`localStorage`, every read and write in `try/catch`; the
  station works with defaults when storage is missing). Remember the settings, never "was
  playing": sound still never starts on its own.
- **Phones:** the nav scrolls sideways and Radio is near the end, so the menu must open
  inside the viewport (fixed position, full width minus the side gutter on narrow screens),
  not hang off the tab.
- **Accessible:** the ▾ button has a label ("Radio settings"), the menu opens with keyboard,
  Escape and a tap outside close it, focus returns to ▾. Controls are real radio buttons,
  selects and a range input with labels. This is also the moment to fix the deferred
  accessibility minors on Radio (its label should include "Radio").

## 2. Recorded instruments

- **Recorded instrument voices are added to the instrument registry**
  (`src/lib/instruments.ts`). Each registry entry gets a *code* voicing (today's chain) and a
  *recorded* voicing, so the *Sound* setting switches every instrument at once. Dish music
  keeps its cuisine identity and the build-up with the drawing; in *Recorded* mode it plays
  the same notes on the recorded voices (for example pad → strings, drone → cello, pluck →
  harp, glass and bell → piano or celesta). The exact mapping is the builder's call, tuned
  by ear.
- **New instruments the ambient pieces need:** at least piano, violin section (or violins),
  cello, harp. Viola, double bass, celesta and a soft choir/voice "ah" are welcome if a
  suitable free source exists.
- **Self-hosted** under `public/station/` with a Strudel sample map (`strudel.json`)
  describing them. No third-party CDN at runtime.
- **Licences: CC0 or public domain preferred**, CC-BY acceptable with credit. Nothing
  non-commercial, share-alike-incompatible with AGPL, or "sampling plus". Candidates to check
  (builder verifies each file's licence before shipping): VSCO 2 Community Edition (CC0,
  chamber strings, harp, upright piano), VCSL (CC0), Salamander Grand Piano (CC-BY 3.0).
  Credit every source in the README and the site footer's credits.
- **Small:** a few notes per instrument (pitch-shifted between them), trimmed, compressed
  (e.g. 96–128 kbps Ogg/MP3/M4A that iPhone Safari can decode). Budget: **about 4 MB for the
  full recorded set**, loaded per instrument as the music first needs it.
- **Loading:** picking *Recorded* shows "Loading instruments…" in the menu. Music carries on
  with the code voices until the samples are ready, then crossfades. If loading fails, it
  stays on *Code* and the menu says so ("Couldn't load the recorded instruments") with a
  retry.
- **Determinism** still holds: same word, same settings → same music.

## 3. The ambient styles

Each style is a set of tracks written as plain Strudel code in `src/lib/station-tracks.ts`
(or one file per style). Claude writes the first versions and the owner tunes them.

- **Tracks are written as recorded-instrument code that plays as-is in strudel.cc** (it
  loads the samples from codingcuisine.dev, §6.4), so the owner can paste a track in, tune
  it by ear and paste it back. Instruments are named with plain sample names
  (`s("cello")`, `s("piano")`…) from the registry. **The code sound is derived
  mechanically:** each registry instrument's `s("name")` is swapped for its code voicing.
  There's one hand-kept copy per track. A test checks every track only uses registry
  sample names, so the swap always works. (Claude's call.)
- The code shown on screen and sent to Strudel is the final code that plays, in the
  current sound.
- **Track order is seeded, not random per visit:** a style's tracks play in a fixed
  rotation, and a mix link can name the starting track (§6.2), so a friend hears what you
  shared. This replaces today's per-visit shuffle. (Claude's call.)

- **Chef's Table:** slow, warm strings and piano playing fresh arrangements of
  **public-domain** pieces, slowed and simplified into ambient fragments, never a full
  performance. Starting set (builder may swap within the rule): Vivaldi, *Winter*, second
  movement (Largo); Bach, *Air* (Orchestral Suite No. 3); Satie, *Gymnopédie No. 1*;
  Debussy, *Clair de lune*; Chopin, Prelude in E minor (Op. 28 No. 4). Arrange from the
  original score, not a modern edition or recording. Each track's title credits it:
  "after Satie, Gymnopédie No. 1".
- **Eno:** original pieces using the *Music for Airports* technique: a handful of short
  phrases (piano, voice, soft strings), each looping on its own length (lengths that don't
  share factors, e.g. 17, 23, 29 cycles), so the combination drifts and almost never
  repeats. Sparse, lots of silence, long reverb. At least four tracks. Titles are kitchen
  words in the house style ("Stock", "Rising", "Cooling rack"…).
- **Mix** (default): a Chef's Table melody line over an Eno bed, the "strings over Eno
  loops" the owner liked. At least four tracks.
- **Originals:** the six existing ambient tracks, kept for whoever likes them.

All styles play in either *Sound*. They're written for recorded instruments first; the code
voicing should still sound decent, not perfect.

Keep the existing house rules: one `setcpm` between 15 and 20, slow attacks, nothing loud
up front, nothing that grates within 20 minutes of a pot simmering.

The **Welcome** page keeps its epicycle music (pure sine maths by design) in both sounds;
*Style* doesn't apply there. (Claude's call.)

## 4. The kitchen layer

- Two loops, *rain* and *café*, from **CC0** field recordings (e.g. Freesound filtered to
  CC0), credited. Each seamless, about 30–60 s, ≤ 1 MB, self-hosted.
- Loaded only when chosen. Plays under the music at a fixed low level relative to it, fades
  in and out with the station (pause, page changes, timer end), and follows *Volume*.
- Not part of the Strudel code shown on screen (it's a recording, not music), but it is
  part of a shared mix and of the share video (§6). (Claude's call.)

## 5. The timer

The cooking timer you can hear without looking at the clock.

- Choose a length (presets 1, 3, 5, 8, 10, 12, 15, 20, 30, 45, 60, 90 minutes; the builder
  may add a custom entry). Starting the timer starts the station if it's paused (the tap
  counts as the user gesture).
- For its duration the station plays a **timer piece** in the current *Style* and *Sound*,
  built from that style's ambient material **on every page**: the timer piece is the same
  on a dish page, on Welcome, anywhere. Every style, *Originals* included, has a timer piece.
  It's deterministic from style, sound and length, so two kitchens hear the same notes.
  (Claude's call.) The piece is:
  sparse at the start, gradually fuller, settling in the last minute, and landing on a
  **final chord exactly when time is up** (within about a second). Then the chord rings out
  and the station pauses itself. That ending is the alarm; there's no beep.
- While a timer runs, the music doesn't follow the page (the piece has to keep its shape).
  Radio shows the time left (small, next to the meter) and the menu has *Cancel timer*.
- Built from the wall clock, not by counting cycles, so it survives a backgrounded tab
  and page changes and can be joined part-way through (needed for §6).
- If the tab is closed, the timer is gone; it doesn't come back on the next visit.

## 6. Sharing

### 6.1 Share videos use your sound
The dish share video (already live, rendering the dish's music offline) renders in the
listener's current *Sound* and adds the *Kitchen* layer if it's on. *Recorded* in the video
needs the samples loaded into the offline render; if that fails, fall back to the code sound,
and failing that to the silent video, as today. Timer doesn't apply to videos.

### 6.2 Mix links
*Share this mix* copies (or opens the phone's share sheet with) a link to the current page
with the settings in the query, plus the ambient track playing (if one is), so the friend
starts on the same piece: e.g. `?radio=mix.recorded.rain.stock`. On a dish page the page
itself already says which dish. Builder's call on the exact
format, but it must be short, readable and strictly validated: only known values are
accepted, anything else is ignored, and nothing from the link is ever put into Strudel code
(the original rule: no user text in code). Opening a mix link applies those settings for
that visit and shows a "Play this mix" prompt on the Radio, because the browser needs a tap
before sound. It doesn't overwrite the visitor's remembered settings unless they then change
something.

### 6.3 Cook together
When a timer is running, the share action becomes *Cook together*: the link carries the
mix plus the **timer's length and the moment it ends** (a UTC timestamp). The piece's shape
depends on its length, so the length lets a joiner know where in the piece they are. Whoever opens it, after one tap,
joins the same timer piece at the right point, so both kitchens hear the build-up and the
final chord at the same moment (to within device clock differences of a second or two).
No server, no accounts. A link whose end time has passed shows "This timer has finished"
and offers the mix instead. Reject end times more than 90 minutes in the future.

### 6.4 Open in Strudel
*Open in Strudel* opens the exact code playing right now on strudel.cc, using its
code-in-the-URL link format (builder verifies the current format). For *Recorded* code, the
code loads the samples from `https://codingcuisine.dev/station/strudel.json`, so
`firebase.json` needs `Access-Control-Allow-Origin: *` on `/station/**`. The kitchen layer
isn't included (it isn't code). The link opens in a new tab.

## Constraints

- Strudel stays lazy: nothing from Strudel, and no sample or kitchen file, loads before the
  first press of Radio (or the timer, or a mix link's Play).
- No user text in Strudel code. Settings and link values map to fixed code from a whitelist.
- Same word + same settings → same music, every visit.
- Vegetarian site; nothing here changes recipes.
- No infra details (DNS, service accounts, keys) in the public repo; the CORS header is
  ordinary public config and is fine.
- Tests (vitest, the existing Strudel test helpers) cover: every track parses and plays in
  both sounds; settings parse/validate; mix-link and cook-together link round-trips and
  rejection of bad values; the timer piece ends on its final chord at the end time,
  including when joined part-way through; the recorded sample map references only files that
  exist under `public/station/`.

## Stages (from the owner)

Three releases, each its own PR, each merged only when the owner says so:

1. **The sound:** settings menu (Sound, Style, Kitchen, Follow the page, Volume, Now
   playing), recorded instruments, the four styles with their tracks, the kitchen layer.
2. **The timer**, including cook-together links (§5, §6.3).
3. **The other shares:** share videos use your sound, mix links, Open in Strudel
   (§6.1, §6.2, §6.4).

Stage 1 can show the Timer and Share rows only once they work; nothing half-built ships.

## Left to the builder

- The exact recorded voicing for each registry instrument, and which free sample sets
  to use (within the licence rule).
- The link format, and whether settings live in one context or alongside `StationProvider`.
- How the timer piece is composed and joined part-way through, as long as it lands on time.
- Menu styling, within the site's existing look and palette tokens.
- The track list within each style's rules.
