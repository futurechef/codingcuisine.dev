# CLAUDE.md — codingcuisine.dev (Platedraw)

Canonical context for any agent or new machine. Read this, then `README.md`
(code map, develop, deploy) and `HANDOFF.md` (current state, open items).
`git pull` + these three files should be enough to pick up the work.

## What this is

**Platedraw** at https://codingcuisine.dev. Give it a word, get a dish: a
seeded vegetarian recipe plus a procedural pen-line drawing of the plate.
Same word, same dish, always. Built from the Claude Design project
"Coding Cuisine" (project id `2a831d26-3300-4bb6-bb02-a0df71d63477`).

- **Vegetarian by the owner's choice.** Meat and fish words become a
  vegetarian swap with a pun quip (`SWAPS` in `src/lib/pantry.ts`). Don't add
  meat recipes.
- Visitors can share a dish to Instagram as an MP4 or PNG (Share button on
  Plate and Card).

Separate from `mise` (the Shopify NYC kitchen app on Cloud Run) and from
AlcheMISE (the meal planner). It shares only AlcheMISE's Firebase project.

## Where it lives

- **Repo:** `github.com/futurechef/codingcuisine.dev`. `main` is live.
- **Hosting:** Firebase Hosting site `codingcuisine`. Also
  https://codingcuisine.web.app.
- **Deploy:** `.github/workflows/deploy.yml` runs `npm test`, then
  `npm run build`, then deploys. Pushes to `main` go live; every PR gets a
  7-day preview channel, whose link is posted as a PR comment. It uses the
  repo variable `FIREBASE_PROJECT_ID` and the secret `FIREBASE_SERVICE_ACCOUNT`.
- **Infra notes** (hosting project, DNS, service account, hand deploy) are kept
  privately by the owner, not in this repo. Ask before any infra change.

## Working agreements

- **Branch, PR, preview, merge.** Open a PR, check the preview link, and merge
  only when the user says so ("push to main", "merge", "yes").
- **`npm test` and `npm run build`** (`tsc -b && vite build`) must both pass
  before every commit. CI runs both.
- **Another agent may share the clone.** Use a `git worktree` for your branch
  instead of switching branches in a shared checkout.
- **Determinism is the product.** Anything that must repeat uses `rng()` from
  `src/lib/rng.ts`, never `Math.random`. The only exception is "Surprise me".
  Pantry changes reshuffle picks, so old links can open a different dish.
- **Plate SVG goes in via `dangerouslySetInnerHTML`.** That's safe only
  because `plate.ts` emits fixed geometry, numbers and hex-checked colours.
  Never interpolate user text (seed words, titles) into that markup.
- **New content goes in `src/lib/pantry.ts`.** Ingredients, techniques,
  cuisines and swaps added there show up everywhere. A new cuisine also needs
  a palette in `src/lib/palettes.ts`; tests enforce WCAG AA contrast.
- **Keep the share sheet lazy.** `ShareSheet` (and Mediabunny) load on demand
  via `src/components/lazy-share.tsx`. Don't import `share-video.ts` from a
  screen; use `src/lib/device.ts` for device checks.
- **Strudel stays lazy.** Only `src/lib/station-engine.ts` imports `@strudel/*`, and
  only via `import()` from `station-state.tsx` (a test enforces it). **No user text in
  Strudel code**: `station.ts` emits fixed tokens and numbers only, like the plate SVG.
  Station tables are meant to be tuned by ear; every pattern is evaluated in CI.
- **Credits must stay:** the Hershey Fonts acknowledgement in
  `src/lib/wordmark.ts` and the README, the Mediabunny (MPL-2.0) and Strudel
  (AGPL-3.0) credits in the README. Regenerate the wordmark with `scripts/bake-wordmark.mjs`.

## Don't

- Don't change DNS, IAM or deploy credentials without asking the owner first.
- Don't add "import any recipe" features here. The user plans to port the
  recipe card to AlcheMISE for real recipes.
- Don't reuse the Firebase project's other sites; they're AlcheMISE's.
