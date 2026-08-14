# Optional browser smoke test

The unit suite (`node --test dev/tests/*.test.mjs`) covers the game's **pure logic** but
cannot boot the game, render, or catch asset 404s. This smoke test drives the built
`index.html` in a real headless Chromium and checks the things only a browser can:

- boot (loading overlay clears, no console/page errors),
- the air-gap slider (0.15 mm default, labelled in millimetres across the published curve),
- the EPM energy loop (pulsing drains charge; brownout latches, fires its cue **once**, and coasting recovers it),
- landmark transform anchors (Mount Everest spans the viewport; the Kármán Line is centered),
- the single-RAF game loop (a fast pause/unpause burst must not leave a second loop running),
- focus-loss handling (`blur` releases the grab and clears held keys),
- and the checks later shifts added: settings via a real gear click, the restart latch,
  the literal 8-pair FG40 stack and its firing sweep, the film band, both photosafety
  ceilings and the reduced-motion freezes, the event schedule, the descenders, the
  multi-climber power sharing, the presets, the persistence purge, touch play, the HUD
  levels and the slip-crest overlay
  (29 checks today; the script's own comments are the per-check record).

## It is optional and adds no committed dependency

The repo stays **zero-dependency**. `smoke.mjs` resolves `playwright-core` and a Chromium
binary at runtime and **skips cleanly** (exit 0) if either is missing, so normal
development and CI never need a browser.

## Running it

```sh
# from the repo root — install into this folder so the root stays clean
# (dev/tests/smoke/node_modules + manifests are gitignored)
npm --prefix dev/tests/smoke i -D playwright-core
npx --prefix dev/tests/smoke playwright install chromium   # or set SMOKE_CHROMIUM instead

node dev/tests/smoke/smoke.mjs
```

If you already have a Chromium/Chrome (or a playwright browser cache) elsewhere, skip the
`playwright install` and point the test at it:

```sh
SMOKE_CHROMIUM="/path/to/Chromium" node dev/tests/smoke/smoke.mjs
```

## Env overrides

| Var | Effect |
|---|---|
| `PLAYWRIGHT_CORE` | Module path/specifier for `playwright-core` (default: resolve `playwright-core`) |
| `SMOKE_CHROMIUM` | Absolute path to a Chromium/Chrome executable (default: playwright's managed build, then the `ms-playwright` cache) |
| `SMOKE_HEADED=1` | Run headed so you can watch it |

Exit codes: **0** = all checks passed *or* skipped (deps/browser absent); **1** = a check failed.

## How it works (and the `?debug` hook)

`smoke.mjs` starts a tiny built-in static server on an ephemeral port (so it never
collides with a dev server), opens `index.html?debug`, and reads live state through
`window.__smokeGame`. That handle is exposed by the game **only** when the page is loaded
with `?debug` (or `#debug`) — it is inert in normal play and nothing in game logic reads
it, so it is safe to ship. This means the smoke test never has to patch `index.html`.

This test is intentionally excluded from `node --test` (it lives outside the
`dev/tests/*.test.mjs` glob), so it never runs, or fails, in the dependency-free path.

[`dev/tools/capture.mjs`](../../tools/capture.mjs) (the README stills and clip) reuses
this same runtime resolution and skip-clean contract, and is likewise outside the gate.
