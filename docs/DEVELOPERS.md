# Developer guide

Current architecture and contributor workflow for **Space Monkey Elevator** — a
cartoon-wrapped simulation of contactless climbing of a space-elevator seed tether.

> The original combined design/roadmap document is archived at
> [`docs/history/DEVELOPERS-design-doc.md`](history/DEVELOPERS-design-doc.md)
> (historical; parts are stale). This file is the current reference.

---

## Build & workflow

The game is a single self-rendering file. There are exactly two HTML files:

| File | Role |
|---|---|
| [`Space_Monkey_Elevator.html`](../Space_Monkey_Elevator.html) | **The source of truth — the only file you edit.** |
| [`index.html`](../index.html) | **Generated build artifact.** Never hand-edit (it carries a DO-NOT-EDIT banner). |

Workflow:

1. Edit `Space_Monkey_Elevator.html`.
2. Rebuild: `python3 embed_assets.py` — inlines statically-referenced assets as
   base64 data URIs and writes `index.html`.
3. Commit **both** files together.

`embed_assets.py` does static find/replace of asset paths. The 78 landmark sprites
are referenced via a runtime-built path (`assets/${landmark.sprite}`)
and are **not** inlined, so `index.html` must be served alongside the
`assets/` folder (as it is on GitHub Pages). It is not a standalone
offline file.

Run locally with `python3 -m http.server 8000`, then open `http://localhost:8000/index.html`.
CI (`.github/workflows/`) runs the unit tests, re-runs the build on push and fails if
the committed `index.html` is out of sync, then deploys to GitHub Pages.

---

## Art pipeline (`art-gen/`)

All artwork is original and generated for this project. Only the pipeline **code**
(`art-gen/*.py`) is tracked; raw renders, keyed sprites, rejects and contact sheets
are gitignored.

- **`manifest.py`** is the single source of truth for subject prompts, and parses
  sprite widths live out of `Space_Monkey_Elevator.html` to prevent the manifest and
  the game drifting apart.
- **`gen.py`** calls OpenRouter for image generation (default model
  `google/gemini-3-pro-image`), with a wallet-balance check, a `--budget` cap and a
  `CONFIRM_ABOVE=25` guard before any billed batch. The API key comes from the
  environment or `.env` — see [`.env.example`](../.env.example).
- **`post.py`** chroma-keys / luma-alphas, despills, trims and resizes each sprite to
  2× its on-screen display width, and **rejects** output that fails its alpha gates.
- **`tools/check_refs.py`** verifies every asset path actually resolves on disk
  (run after any source edit).

---

## Tests

A zero-dependency Node test suite (no `npm install`) exercises the pure logic —
wave math, physics helpers, frame-rate-independent decay, tether/scoring helpers, and
the altimeter table — without splitting the single HTML file:

```sh
node --test tests/*.test.mjs
```

[`tests/extract.mjs`](../tests/extract.mjs) slices the single inline `<script>` out of
`Space_Monkey_Elevator.html`, appends a `return { … }` of the pure top-level symbols,
and evaluates it with no-op DOM/WebGL/audio stubs (the bottom `load` handler only
*registers* under the stub, so no game boots). [`tests/pure.test.mjs`](../tests/pure.test.mjs)
holds the assertions. When you add a pure top-level function or class worth testing you must
make **three** edits or the new symbol is silently `undefined` in tests: (1) add its name to
`EXPORTED_SYMBOLS` in `extract.mjs`, (2) destructure it from the loaded module at the top of
`pure.test.mjs`, and (3) add it to the extraction-sanity object literal (the "core pure
symbols" test).

---

## Code layout (within the single `<script>`)

Rough top-to-bottom structure of `Space_Monkey_Elevator.html`:

- **`<head>` / `<body>`** — styles, settings panel, overlays (loading, pause,
  game-over, mobile gate), `<noscript>`, the two canvases.
- **Tunable constants & storage keys** — UX constants, `localStorage` keys, the
  `_continuousCoupling` model flag.
- **`GameConfig`** — central tuning: `PHYSICS`, `GRAB`, `COUPLING`, `EPM`, `TETHER`,
  `MISSION`, `RENDER`, `CAMERA`, particle/speed-line configs.
- **Data tables** — `WAVE_CALCULATORS`, `LANDMARKS_DATA`, `UPGRADES_CONFIG`,
  altimeter landmarks, colour palette.
- **Systems** — `WebGLBackground`, `CloudSystem`, `LandmarkSystem`, `WaveSystem`,
  `PhysicsEngine`, `ObjectPool`, `ParticleSystem`, `InputManager`, `AudioManager`.
- **`SpaceMonkeyGame`** — the orchestrator: state, settings event handlers, input,
  `update(dt)`, `render()`, scoring/persistence, overlays.

---

## The simulation (default model)

The climber is contactless: its hands are **electro-permanent magnets (EPMs)** that
*pulse* to couple to traveling waves in the tether. Holding `SPACE` engages coupling.

- **Continuous coupling** (`PhysicsEngine.calculateContinuousCoupling`): per-frame
  impulse `∝ waveVelocity`, rectified upward and scaled by coupling **quality**
  (`|waveVelocity| / (amp·ω)`), which peaks at the wave's **peak velocity** (the
  displacement zero-crossing). Sawtooth waves add a timing-independent ratchet assist.
  Gravity always applies, so climbing is an active energy battle.
- **EPM energy loop** (`GameConfig.EPM`): pulsing **drains** charge (per magnet tier);
  a well-timed coupling **regenerates** it, attenuated by altitude
  (`waveEnergyFactor`, Q-P3) and gated by tether material. An ambient trickle makes a
  **brownout** recoverable by coasting. The charge-sustainability curve is the
  difficulty curve; material choice sets how high you can go.
- **Units chain** (`GameConfig.TETHER`): the tether carries a **longitudinal** (compression)
  wave, so its speed is `v = √(E/ρ)` from the material's Young's modulus and density — a
  material constant, shown in settings. Separately, tension/width scale coupling through a
  `√(T/μ)`-shaped *coupling-momentum proxy* (`couplingMomentumScale`); that is a tuning curve,
  **not** the wave speed.
- **Scoring** (`GameConfig.MISSION`): the Weight slider is cargo; delivering it to the
  Kármán Line scores `cargo_kg × altitude_km`, with a persisted best and a cumulative
  "bootstrap %" meter.

A legacy discrete **grab/hold** model is preserved as a hidden backup, toggled with
`K` (preference persisted). Most UI is gated on `_continuousCoupling`.

---

## Conventions for contributors

- **Only edit the source file**, then rebuild and commit both. Keep them in sync.
- New tuning values belong in `GameConfig`; gameplay-affecting numbers added during
  the simulation rework are flagged as playtest guesses.
- Don't rename runtime identifiers casually (`isGrabbing`, `attemptGrab`, etc.) — they
  are load-bearing across the discrete and continuous paths even though the UI copy
  uses the "pulse/couple" framing.
- Honor `prefers-reduced-motion` (`_uxReducedMotion`) and the Okabe-Ito colorblind
  palette in any new visual feedback.
- Quick sanity check before committing: run `node --test tests/*.test.mjs`, then
  `python3 embed_assets.py` and confirm `index.html` differs from the source only by
  inlined assets.

See [`CONTRIBUTING.md`](../.github/CONTRIBUTING.md) for PR process and
[`CHANGELOG.md`](CHANGELOG.md) for release history.
