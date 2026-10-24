# Share video, SEO and link previews: design

**Status:** approved in conversation on 2026-10-09; this written spec is awaiting review.
**Scope:** three parts, shipped in this order as separate PRs:
**A** share video and image, **B** SEO, **C** link previews.

## Goals

- Anyone can post a dish to Instagram as a short video of the plate being drawn, or as a still image.
- Dish pages can be found on Google and qualify for recipe rich results.
- A dish link pasted into iMessage, WhatsApp, Slack or X shows that dish's own title and picture.

Out of scope: carousels, QR codes, meat recipes (the site stays vegetarian), server-rendered pages for visitors, analytics.

---

## A. Share video and image (client only)

### What the visitor gets
- A **Share** button on the Plate page (`/plate`) and the Card page (`/card`).
  It opens a share panel for the dish on screen.
- The panel has:
  - a live preview of the clip;
  - a **Post 4:5 / Story 9:16** toggle;
  - **Share video**, which records the clip with a progress bar. On phones it opens the
    system share sheet with the MP4 attached; elsewhere it downloads the MP4.
  - **Share image**, the final frame as a PNG, shared or downloaded the same way.
- The clip:
  - **Background:** cream paper (`#fbf6ea`).
  - **Top line:** `PLATEDRAW · No. 2987` in small mono capitals.
  - **Drawing:** the dish's plate draws stroke by stroke (plate → sauce → main → crunch → herbs).
  - **Text:** the seed word in large italic serif and the dish title fade in underneath.
  - **Footer:** `CUISINE · NN MIN` and `codingcuisine.dev`.
  - **Story layout:** the same block, centred, with clear bands of about 250px at top and
    bottom for Instagram's stickers and reply bar.
  - **Timing:** the drawing takes `DRAW_SECONDS` (3.9 s), the text fades in from 3.4 s to
    4.4 s, then it holds to 7.0 s, so the clip loops cleanly.

### Sizes and layout (px)
| | Post | Story |
| --- | --- | --- |
| Canvas | 1080 × 1350 | 1080 × 1920 |
| Content block | full canvas, 72 margins | 1080 × 1350 block centred vertically |
| Header | mono 26, letter-spacing .16em, y = 110 | same, inside the block |
| Plate | 840 × 756 (300:270), centred, top y = 170 | same, inside the block |
| Seed word | Newsreader italic 112 | same |
| Title | Newsreader 44, at most 2 lines, balanced | same |
| Footer | mono 24 | same |

> **As built (2026-10-09):**
> - **Encoding:** the clip is encoded frame by frame with WebCodecs through Mediabunny,
>   not recorded live with `MediaRecorder`. Chrome's recorder dropped about the first
>   2.6 s of frames. Frame-exact encoding gives exactly 7.0 s, runs faster than real time
>   and survives hidden tabs.
> - **Support:** comes from `canMakeVideo()` (H.264 at story size): Chrome and Edge 94+,
>   Safari 16.4+, Firefox 130+.
> - **Sharing:** the PNG is rendered ahead of time, so its share call stays inside the tap.
>   Desktops download; touch devices share.
> - **Loading:** the sheet is lazy-loaded, with a fallback if its chunk fails to load.
> - **Text that doesn't fit:** seed words too wide at 24 px are cut with an ellipsis.
>
> The units below are the original design.

### Units
- **`src/lib/share-frame.ts`**: `drawShareFrame(ctx, d, format, t, assets)` draws one frame
  at time `t` onto any 2D canvas context.
  - It has no DOM access, so the same code runs in the browser and, in part C, on the server.
  - `assets` supplies `loadPlate(look, t) → image` and the font family names.
  - The plate comes from `plateMarkup(d, { kind: 'frozen', t })` wrapped as an SVG document
    and drawn as an image. That's the exact geometry used on the site.
  - Text is drawn with `fillText`, after `document.fonts.load()` for each family.
- **`src/lib/share-video.ts`**: `recordShareVideo(d, format, onProgress) → Blob`.
  - Renders frames at 30 fps in real time onto an offscreen canvas.
  - Records `canvas.captureStream(30)` with `MediaRecorder` at about 8 Mbps.
  - Prefers `video/mp4;codecs=avc1.42E01E`, then `video/mp4`.
  - `canRecordMp4()` reports support. Current Chrome, Edge and Safari (including iOS) can
    record MP4; Firefox can't.
- **`src/components/ShareSheet.tsx`**: the panel. It shares through
  `navigator.canShare({ files })` and `navigator.share`, and falls back to a download link.
  - Filenames: `platedraw-<no>-<word>-post.mp4` and `…-story.png`.
- **Buttons:** Home and Card each get a Share button that opens the panel.

### Failures and edge cases
- **No MP4 recording:** the video button is disabled with a one-line reason; the image
  still works.
- **Share sheet cancelled** (`AbortError`): nothing happens. Any other share error falls
  back to downloading.
- **Panel closed mid-recording:** the recorder stops, its tracks end and the blob is
  thrown away.
- **Reduced motion:** the preview shows the final frame. Recording still produces the
  animated clip, because the visitor asked for it.

### Tests
- **Unit (vitest):** `drawShareFrame` against a recording fake context.
  - The same dish, format and `t` always give the same draw calls.
  - At `t = 0` the text isn't drawn; at `t ≥ 4.4` it's fully opaque.
  - The title wraps to at most 2 lines for the 50 longest generated titles.
- **Browser (Playwright, Chrome):**
  - Record one post and one story clip, and check type `video/mp4`, duration 7 ± 0.3 s and
    dimensions.
  - Screenshot the panel and the final frames.

---

## B. SEO (client side, plus build-time files)

- **`src/lib/seo.ts`**: `useSeo({ title, description, path, image, jsonLd })` sets
  `<title>`, `meta[name=description]`, `link[rel=canonical]`, Open Graph and Twitter tags,
  and one `script[type="application/ld+json"]`.
- **Per route:**

  | Route | Title | Description |
  | --- | --- | --- |
  | `/` | Platedraw · Food, drawn by code | Give it a word, get a dish… |
  | `/plate?w=` | `<dish title> · Platedraw` | `<desc>` plus cuisine, times and serves 2 |
  | `/card?w=` | `<dish title> recipe card · Platedraw` | the same as `/plate` |
  | `/forks?w=`, `/guide`, `/today`, `/day/…`, `/parts` | a title of their own | a sentence of their own |
- **Canonical address of a recipe:** `https://codingcuisine.dev/plate?w=<encodeURIComponent(word)>`.
  `/card` points to the same canonical address.
- **Recipe JSON-LD on `/plate` and `/card`:**
  - `name`, `description`, `image` (the part C image, or `/og/default.png` until C ships)
  - `recipeIngredient` (`"400 g Leeks"`), `recipeInstructions` (`HowToStep` per step,
    with the look-for cue)
  - `prepTime` and `cookTime` (ISO 8601, `PT15M`), `totalTime`, `recipeYield: "2"`
  - `recipeCuisine`, `recipeCategory: "Main course"`, `keywords` (word, produce, cuisine),
    `suitableForDiet: VegetarianDiet`
  - `author`: an Organization, "Platedraw".
- **Sitemap:** `scripts/build-sitemap.mjs` runs after `vite build` and writes
  `dist/sitemap.xml`. It lists the static routes, plus `/plate?w=` for every ingredient
  name, the field-guide words and the pun words (about 175 URLs).
- **`public/robots.txt`** allows everything and points to the sitemap.
- **Static fallback:** `index.html` carries site-wide defaults (title, description,
  `og:image` = `/og/default.png`).

### Tests
- **Unit:** the JSON-LD builder gives valid shapes for 200 generated dishes. Durations
  are ISO, and the counts of ingredients and steps match the dish.
- **Unit:** `useSeo` writes and replaces tags without piling up duplicates.
- **After deploy:** Google's Rich Results Test on two live recipe pages, recorded in the PR.

---

## C. Link previews (Cloud Functions)

Link-preview bots don't run JavaScript, so per-dish tags have to come from the server.

- **`functions/`**: Firebase Functions 2nd gen, Node 22, TypeScript, region `us-central1`,
  in the site's Firebase project. It imports `src/lib/*` (dish, plate, share-frame) through
  the bundler, so there's only one copy of the logic.
  - **`page` function:** Hosting sends `/plate`, `/card`, `/forks`, `/today` and `/day/**`
    to it.
    - It reads the deployed `index.html`, copied into the function bundle at build time
      so asset hashes match.
    - It works out the dish from the query or path, injects the same tags `seo.ts` sets
      (title, description, canonical, og:\*, twitter:card `summary_large_image`, JSON-LD)
      and returns the page.
    - Cache headers: `Cache-Control: public, max-age=300, s-maxage=86400`.
  - **`og` function:** serves `/og/<word>.png` (1200 × 630) and `/og/default.png`.
    - It renders with `drawShareFrame` (a landscape `og` format added in part C) on
      `@napi-rs/canvas`.
    - Fonts are bundled: Newsreader, Inter and JetBrains Mono, all OFL, in `functions/fonts`.
    - Cache headers: `public, max-age=31536000, immutable`. The output is deterministic,
      so Firebase's CDN keeps one copy per word.
- **`firebase.json`:** the function rewrites go above the existing SPA catch-all.
- **CI:** the deploy job switches from `action-hosting-deploy` to
  `firebase deploy --only hosting,functions` on `main`. PRs keep Hosting preview channels;
  their rewrites call the live functions.
- **Access:** needs extra deploy permissions; ask the owner before changing any.
- **Billing:** confirm the project is on the Blaze plan. Cloud Functions and Cloud Run are
  already enabled, which suggests it is. At current traffic, costs should stay in the free
  tier.

### Failures and edge cases
- **Unknown or empty word:** default site tags.
- **Render error in `og`:** a redirect to `/og/default.png`.
- **Cold start (about 1–2 s) on a bot's first fetch:** acceptable, and the CDN serves
  later fetches.
- **Escaping:** all injected text is HTML-escaped; seed words never go into markup
  unescaped.

### Tests
- **Unit:** the meta-injection function gets the escaping right (`<script>` in a word),
  the canonical address, and the default fallback.
- **After deploy:**
  - `curl -A "facebookexternalhit/1.1"` on two dish URLs returns the dish's title and image.
  - `/og/<word>.png` returns a 1200 × 630 PNG.
  - Check the previews in Slack and iMessage manually.

---

## Decisions log
- **Video, not GIF:** Instagram doesn't accept GIF uploads. MP4 is recorded in the
  browser (no server) and falls back to a PNG image.
- **Animation:** the pen drawing the plate, not the spinning circles.
- **Formats:** both post (4:5) and story (9:16).
- **Vegetarian:** the site stays vegetarian. Meat and fish words get swaps with quips
  (already shipped in PR #7).
- **Order:** share card, then SEO, then link previews. The preview function reuses the
  share-frame drawing code.
