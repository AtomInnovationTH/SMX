# Developer guide

Current architecture and contributor workflow for **Space Monkey Elevator** — a
cartoon-wrapped simulation of contactless climbing of a space-elevator seed tether.

> The original combined design/roadmap document is archived at
> [`docs/history/DEVELOPERS-design-doc.md`](docs/history/DEVELOPERS-design-doc.md)
> (historical; parts are stale). This file is the current reference.

---

## Build & workflow

The game is a single self-rendering file. There are exactly two HTML files:

| File | Role |
|---|---|
| [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html) | **The source of truth — the only file you edit.** |
| [`index.html`](index.html) | **Generated build artifact.** Never hand-edit (it carries a DO-NOT-EDIT banner). |

Workflow:

1. Edit `Space_Monkey_Elevator.html`.
2. Rebuild: `python3 embed_assets.py` — inlines statically-referenced assets as
   base64 data URIs and writes `index.html`.
3. Commit **both** files together.

`embed_assets.py` does static find/replace of asset paths. The ~70 landmark sprites
are referenced via a runtime-built path (`Space Elevator_files/${landmark.sprite}`)
and are **not** inlined, so `index.html` must be served alongside the
`Space Elevator_files/` folder (as it is on GitHub Pages). It is not a standalone
offline file.

Run locally with [`start.sh`](start.sh) (serves on `:8000` and opens `index.html`).
CI (`.github/workflows/`) re-runs the build on push and fails if the committed
`index.html` is out of sync, then deploys to GitHub Pages.

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
- **Units chain** (`GameConfig.TETHER`): wave speed `v = √(T/μ)` from tether diameter
  + density and tension, shown in settings; tension/width scale coupling (clamped).
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
- Quick sanity check before committing: extract the inline scripts and run
  `node --check`, then `python3 embed_assets.py` and confirm `index.html` differs from
  the source only by inlined assets.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for PR process and
[`CHANGELOG.md`](CHANGELOG.md) for release history.
