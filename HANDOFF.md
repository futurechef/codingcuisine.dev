# HANDOFF — codingcuisine.dev

State as of **2026-10-12**. Update this file at the end of each session.

## Live now (main @ `cbf8827`, PR #11)

| Path | What |
| --- | --- |
| `/` | **Welcome:** Fourier epicycles (16, then 128 circles) write "codingcuisine" in Hershey Script, then morph into a plate. Circle slider (4–256) and Replay. Reduced motion shows the static wordmark. |
| `/plate?w=` | **Generator:** 143 vegetarian ingredients, 29 techniques, 11 cuisines. A word naming an ingredient (plurals too) uses it; cuisine words like "miso" steer the kitchen; date seeds stay in season; meat/fish words become a swap with a quip. Recipe, flavour radar, plate drawing, downloads (SVG, animated SVG, HPGL `.plt`, `.forkrecipe`) and **Share**. Old `/?w=` links redirect here. |
| `/forks?w=` | **Forks:** the parent dish, fork 1 with a new sauce, fork 2 that also changes the crunch. Same pairing rules as the generator. |
| `/guide` | **Field guide:** 12 plates, filterable by cuisine; each opens its recipe. |
| `/today`, `/day/YYYY-MM-DD` | **Dish of the day:** the date is the seed, with seasonal produce. |
| `/card?w=` | **Recipe card:** 6 × 4 in index card, recipe on the front, postcard back with the plate as a perforated stamp. Prints as two exact 6 × 4 in pages. **Share** button. `/postcard` redirects here. |
| `/parts` | **Parts:** the component sheet. |
| *(every page)* | **Station:** Radio in the nav plays ambient Strudel music across pages. Dish pages play the dish's own music, derived from its drawing, building layer by layer as the plate draws; the code shows beside the recipe and lights up as it plays. Welcome's circles play the word they write. Field guide and Parts play the ambient set. |

Dish pages (Plate, Card, Forks, Today) take their cuisine's colour world;
other pages keep cream and rust.

## Key features and where they live

| Feature | Files | Notes |
| --- | --- | --- |
| Pantry and swaps | `src/lib/pantry.ts` | 143 ingredients, 29 techniques, 11 cuisines, 71 `SWAPS` (meat/fish word → vegetarian stand-in + quip). `overrideKind()` lets an ingredient force an arrangement, optionally per technique. |
| Generator | `src/lib/dish.ts` | Pairing rules: no sauce/crunch repeating the main, no creamy sauce on cheese, no savoury/hot sauce on sweet fruit, no brown butter on brown butter. `PUN_WORDS` (15, e.g. "kale yeah") feed Surprise me. |
| Plate drawing | `src/lib/plate*.ts`, `look.ts` | 7 plate shapes; 13 arrangements incl. `nest` (noodles/pasta), `mound` (grains), `swirl` (risotto, soft polenta), `egg`, `halves` (jammy eggs). |
| Colour worlds | `src/lib/palettes.ts`, `cuisine-theme.ts` | `useCuisineTheme(cu)` sets CSS variables while a dish page is mounted, removes them on leave; 0.4 s ease (instant with reduced motion). Ink and plate paper never change. Tests enforce WCAG AA (4.5:1) in light and dark. |
| Share video/image | `src/lib/share-frame.ts`, `share-video.ts`, `device.ts`, `src/components/ShareButton.tsx`, `ShareSheet.tsx`, `lazy-share.tsx` | Post 4:5 (1080 × 1350) / Story 9:16 (1080 × 1920). 7.0 s H.264 MP4 encoded frame-exact with WebCodecs + Mediabunny. Two steps: **Make video** → **Share video**; **Share image** is a PNG. Touch devices (`pointer: coarse`) share, desktops download. Sheet is lazy-loaded with a "Sharing couldn't load, Reload" fallback. `share-frame.ts` has no DOM access so part C can reuse it server-side. |
| Station (music) | `src/lib/station*.ts(x)`, `instruments.ts`, `src/components/RadioTab.tsx`, `StationCode.tsx` | Strudel (`@strudel/web` 1.3.0, AGPL) loads only on the first Radio press. Pure `dishPattern(d)` → code string; `Transitioner` does fades (1.2 s dip before a drawing, else 3 s out + 3 s in) and the build-up; master level drives superdough's output gain. Synth voices only, no samples. Spec `docs/superpowers/specs/2026-10-24-station-design.md`; roadmap there. |
| Tests | `src/**/*.test.ts(x)` | vitest, 583 tests (10 files). `npm test`. |

## History

| PR | What |
| --- | --- |
| #2 | First build from the Claude Design file, plus the Firebase deploy |
| #3 | Pantry-based generator and procedural plate engine |
| #4 | Welcome page with Fourier epicycles; the generator moved to `/plate` |
| #5 | Recipe card with postcard back and plate stamp |
| #6 | CLAUDE.md and HANDOFF.md |
| #7 | Pantry coverage: 63 → 143 ingredients, 13 → 29 techniques, 71 vegetarian swaps with puns, pun words in Surprise me, pairing rules, vitest suite run in CI before build |
| #8 | Share video and image for Instagram (spec part A) |
| #9 | Ten code-review fixes to the share sheet (print, re-encode, preview resilience, step cache, accented fonts, stale-draw guard, shared encoder probe, `device.ts`) |
| #10 | Cuisine colour worlds |
| #11 | Noodles, grains and eggs arrangements (`nest`, `mound`, `swirl`, `egg`, `halves`; `overrideKind`) |

## In flight

Spec: `docs/superpowers/specs/2026-10-09-share-seo-design.md` (parts A, B, C).

- **A — share video/image:** done (#8, #9).
- **B — SEO:** done in #13. `useSeo` (one call in `App.tsx`), Recipe JSON-LD
  on `/plate` and `/card`, `sitemap.xml` (172 URLs, built after `vite build`),
  `robots.txt`, static `/og/default.png`. Plan:
  `docs/superpowers/plans/2026-10-12-seo.md`.
- **C — link previews:** not started. Firebase Cloud Functions (`page` + `og`
  image). Needs extra deploy permissions — **ask the owner first.**

## Open items

**Housekeeping (needs the user):**
- **Draft PR #1** (`claude/new-web-app-xeuoi6`) is superseded by #2 onward.
  Close it once the user confirms.
**Share sheet (deferred minors from #8/#9):**
- Title wrap is greedy, not balanced.
- Mediabunny `bitrate` option is deprecated in favour of `quality`.
- Each render makes a fresh full-size canvas (Safari memory pressure).
- iPad with a trackpad gets a download instead of the share sheet.
- Accessibility polish in the share dialog.
- No automated browser test for the encoder (no Playwright setup in the repo).

**Generator and content:**
- The generator can list two Herb rows in one recipe.
- Compound names keep one part: "mushroom risotto" → confit mushrooms.
- "green" inside a word (green curry) matches spring greens.
- The plating step uses the raw ingredient name ("Arrange the risotto rice").
- Odd pairings (e.g. confit white beans in a Korean dish) were reported before
  #7's pairing rules; not re-checked since.

**Drawing:**
- The drizzle sauce draws under the food; on top would need a sixth layer or a
  change to the order in `look.ts` and `plate.ts`.
- Micro-herb garnishes are faint at about 110 px.
- Board plate shadow leaves a short stray line by the handle notch.
- Welcome: the largest circles run past the top of the canvas while writing,
  and the plate rings leave a faint hook where each ends.

**Deferred ideas (owner's list):** ingredient sketches, interactive forks, a
tasting-menu card, a season wall, "my cookbook", circles mode on dish pages,
a light/dark toggle, a QR code on the card, HPGL tuned for a specific plotter.

**Planned elsewhere:**
- The user will port the recipe card to **AlcheMISE** for any recipe. Parts to
  bring over: `src/screens/Card.tsx`, `src/components/Stamp.tsx`, the
  `.card…` and `@page card` CSS, optionally the plate engine (`plate*.ts`,
  `look.ts`, `rng.ts`). AlcheMISE is Google Sheets + Apps Script, so the card
  needs plain HTML/JS, type that shrinks to fit, and a "1 of 2" continuation
  card for long recipes.

## Verifying changes

- **Tests and build:** `npm test`, `npm run build`, then `npx vite preview`
  and open it in a browser.
- **Preview without Actions:** deploy a channel by hand (README "Deploy") and
  put the link in the PR.
- **Screenshots of the CSS pen-draw:** captures restart the animation and
  catch it partway. Pause it first with
  `document.getAnimations().forEach(a => { a.pause(); a.currentTime = 5000 })`.
- **Recipe card fit:** loop over many `/card?w=` words and compare the bottom
  of the last list item against `.card__body`. At #5 the fullest recipe used
  85% of the front.
- **SEO (part B):** after a deploy, run Google's Rich Results Test on two live
  `/plate?w=` pages and record it in the PR. `/og/default.png` is static until
  part C serves per-dish images; re-render it with `scripts/og-default.html`.
- **Share video:** check in Chrome that post and story clips are `video/mp4`,
  exactly 7.0 s, at the right size. Not yet checked on a real iPhone or by
  uploading to Instagram.
