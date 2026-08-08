# Developer guide

Current architecture and contributor workflow for **Space Monkey Elevator** — a
cartoon-wrapped simulation of contactless climbing of a space-elevator seed tether.

> This file is the current reference. The superseded design/roadmap documents that
> used to sit in `docs/history/` were deleted in the August 2026 tidy; `git log` has
> them if you ever need them.

---

## Build & workflow

The game is a single self-rendering file. There are exactly two HTML files:

| File | Role |
|---|---|
| [`Space_Monkey_Elevator.html`](../Space_Monkey_Elevator.html) | **The source of truth — the only file you edit.** |
| [`index.html`](../index.html) | **Generated build artifact.** Never hand-edit (it carries a DO-NOT-EDIT banner). |

Workflow:

1. Edit `Space_Monkey_Elevator.html`.
2. Rebuild: `python3 embed_assets.py` — inlines only assets under
   `MAX_INLINE_BYTES` (20 KB: the favicon and the grid) and writes `index.html`.
3. Commit **both** files together.

`embed_assets.py` does static find/replace of asset paths. The 78 landmark sprites
are referenced via a runtime-built path (`assets/${landmark.sprite}`)
and are **not** inlined. Neither are the clouds, the ground or the noise overlay:
inlining that 1.2 MB made `index.html` 1.8 MB and nobody could play until all of it
downloaded, so anything over 20 KB now streams from `assets/` (see `MAX_INLINE_BYTES`
and the `ASSET_BASE_PATH`-survives branch in the build script). `index.html` is
305 KB and must be served alongside the
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
- **`dev/tools/check_refs.py`** verifies every asset path actually resolves on disk
  (run after any source edit).

---

## Tests

A zero-dependency Node test suite (no `npm install`) exercises the pure logic —
wave math, physics helpers, frame-rate-independent decay, tether/scoring helpers, and
the altimeter table — without splitting the single HTML file:

```sh
node --test dev/tests/*.test.mjs
```

[`dev/tests/extract.mjs`](../tests/extract.mjs) slices the single inline `<script>` out of
`Space_Monkey_Elevator.html`, appends a `return { … }` of the pure top-level symbols,
and evaluates it with no-op DOM/WebGL/audio stubs (the bottom `load` handler only
*registers* under the stub, so no game boots). [`dev/tests/pure.test.mjs`](../tests/pure.test.mjs)
holds the assertions. When you add a pure top-level function or class worth testing you must
make **three** edits or the new symbol is silently `undefined` in tests: (1) add its name to
`EXPORTED_SYMBOLS` in `extract.mjs`, (2) destructure it from the loaded module at the top of
`pure.test.mjs`, and (3) add it to the extraction-sanity object literal (the "core pure
symbols" test). A guard test also scans the delimited pure-helpers block and **fails
loudly** if a declared helper is missing from `EXPORTED_SYMBOLS`, so a forgotten export
turns red instead of silently reading `undefined`. **Declare helpers with the `function`
keyword** — it is the guard-safe, module-convention form. The guard regex matches both
`function name(` and `const/let name = … =>` arrow forms, but writing a helper as
`const foo = (x) => …` is still against convention; keep the 25-helper count assertion in
`pure.test.mjs` passing, as it guards against an over-broad regex sweeping in non-helper
declarations (like array consts).

### Optional browser smoke test

The unit suite covers pure logic but cannot boot the game, render, or catch asset 404s.
[`dev/tests/smoke/smoke.mjs`](../tests/smoke/smoke.mjs) drives the built `index.html` in a
real headless Chromium (boot, the EPM loop, landmark/cloud transform anchors, the
single-RAF loop, focus-loss handling). It is **optional and adds no committed
dependency**: it resolves `playwright-core` and a Chromium binary at runtime and skips
cleanly if either is absent, so `node --test` and CI stay browser-free (it lives outside
the `dev/tests/*.test.mjs` glob and never runs there). To run it locally:

```sh
npm --prefix dev/tests/smoke i -D playwright-core
npx --prefix dev/tests/smoke playwright install chromium   # or set SMOKE_CHROMIUM
node dev/tests/smoke/smoke.mjs
```

It reads live state via `window.__smokeGame`, a handle the game exposes **only** under
`?debug`/`#debug` (inert in normal play). See [`dev/tests/smoke/README.md`](../tests/smoke/README.md).

### Local gate

For a single command that reproduces the full CI gate, use `dev/tools/check.sh`:

```sh
bash dev/tools/check.sh    # or: SKIP_SMOKE=1 bash dev/tools/check.sh
```

It runs the unit tests, regenerates `index.html` from the source and **fails if it was
out of sync** (note it mutates the tree, exactly as CI does — if it fails on the in-sync
check, `git add index.html` and re-run), verifies asset references, then runs the browser
smoke test. `SKIP_SMOKE=1` skips the browser step for speed.

There is also an **opt-in** `pre-commit` hook (`.githooks/pre-commit`) that runs the gate
with `SKIP_SMOKE=1`. Enable it once with:

```sh
git config core.hooksPath .githooks     # disable later: git config --unset core.hooksPath
```

The hook inspects the **working tree**, not the index, so partial staging can pass it —
CI remains the authority.

---

## Code layout (within the single `<script>`)

Rough top-to-bottom structure of `Space_Monkey_Elevator.html`:

- **`<head>` / `<body>`** — styles, settings panel, overlays (loading, pause,
  game-over, mobile gate), `<noscript>`, the two canvases.
- **Tunable constants & storage keys** — UX constants and `localStorage` keys.
- **`GameConfig`** — central tuning: `PHYSICS`, `GRAB`, `COUPLING`, `EPM`, `TETHER`,
  `MISSION`, `RENDER`, `CAMERA`, particle/speed-line configs.
- **Data tables** — `WAVE_CALCULATORS`, `LANDMARKS_DATA`, `UPGRADES_CONFIG`,
  `FREQ_TABLE` (the paper's p.11 grid), altimeter landmarks, colour palette.
- **Systems** — `WebGLBackground`, `CloudSystem`, `LandmarkSystem`, `WaveSystem`,
  `PhysicsEngine`, `ObjectPool`, `ParticleSystem`, `InputManager`, `AudioManager`.
- **`SpaceMonkeyGame`** — the orchestrator: state, settings event handlers, input,
  `update(dt)`, `render()`, scoring/persistence, overlays.

`render()` composites in a fixed order; the HUD passes own disjoint screen bands, so
anything new has to claim its own (top-left: mission 16–30, thermal 44–85, act plate
86–118; top-centre: landmark pill ≈48, shared toast ≈100, beat cards from 130, brownout
banner 26–70; mid-screen: act-break banner; bottom-centre: the p.11 dashboard, 640×132,
which stays clear of the controls box down to 1024 px wide).

---

## The simulation (default model)

The climber is contactless: its hands are **electro-permanent magnets (EPMs)** that
*pulse* to couple to traveling waves in the tether. Holding `SPACE` engages coupling.

- **Slip coupling — the core mechanic** (`PhysicsEngine.calculateContinuousCoupling`
  over the pure `slipThrustMeanN`): the onboard controller gates the FG40 stack ON
  exactly when the film outruns the climber. With film peak velocity `V = A·ω`,
  climber speed `v`, slip ratio `u = v/V` and per-pair coefficient `k`, mean thrust
  over a cycle is closed-form for a sine carrier:
  `F = (k·N·V / 2π) · [2√(1−u²) − u(π − 2·asin u)]`.
  `u = 0` gives `kNV/π`; thrust fades **monotonically** to zero as `u → 1`, so
  `v_max` is an **asymptote and there is no speed clamp anywhere in the code**.
  `u ≥ 1` is exactly zero (the gate never opens); `u ≤ −1` is a Lenz brake `−kNv`.
  Harmonic carriers (band-limited square/sawtooth) integrate the same gate
  numerically over 720 sub-steps — the sawtooth ratchet is now physical, not a bonus
  constant. Motion is `a = F/m` with the climber's real mass; gravity always applies.
- **Hardware chain** (`GameConfig.FG40`, all values sourced or flagged ESTIMATE):
  air gap → pole flux via FG40's **published** normalised force-vs-airgap curve
  (`gapFluxT`, extracted point-by-point from the manual; force ∝ B²) → per-pair
  eddy-traction coefficient `k = σ·t·B²·A_pole` (`pairCouplingK`) → × N pairs. Pretension
  sets film flutter (`TETHER.FLUTTER_REF_MM`), flutter eats the gap's centering margin,
  and at margin ≤ 0 the controller **unloads** (flux → 0, soft fail). Mass splits into
  derived `dryMassKg()` (stack magnets + `STRUCTURE_MASS_FRACTION`, minus frame kits)
  and scored `cargoKg`.
- **Stress budget → speed ceiling** (`§2.1`): wave stress is `σ = A·ω·√(Eρ)`, so capping
  it at a fraction of working stress gives `v_max = f_safety · strength / √(Eρ)`
  (`maxMaterialVelocityMps`) — independent of carrier, which is why raising the carrier
  cannot buy speed. Amplitude is clamped to `A_max = v_max/ω` (`maxAmplitudeM`) and the
  slider label shows the **actual** post-clamp stroke, with `(capped)` when it binds. The
  material ladder is a **strength** ladder (E and ρ are constant across carbon
  allotropes); entries above ~130 GPa are labelled speculative.
- **EPM energy loop** (`GameConfig.EPM`, pure `epmChargeStep`): engaging **drains** at
  `switchingPowerW = 4·N·E_switch·f` — two transitions per cycle per unit, two units per
  pair, **flat in duty cycle** — and **regenerates** from extracted mechanical power
  `F_mean · v_climber`. A brownout therefore means *switching power exceeds extraction*,
  which happens naturally as `u → 1` (extraction collapses while drain holds flat), so the
  engage/release **rhythm is emergent, not scripted**. Ambient trickle recovers a latched
  brownout in `BROWNOUT_RECOVER / TRICKLE` = 5 s. The gauge shows switching kW, the share
  of the paper's 4 MW budget, and live extraction.
- **What the player sees (M3 illustration layer)** — presentation only; none of it feeds
  back into the physics:
  - **The FG40 sandwich** (`renderFg40Stack`): 8 schematic opposed pairs flanking the
    film, drawn always (dim at rest), on a **fixed** span — a real-scale stack is 26–105 px
    next to a 240 px sprite that is itself not to scale, so the drawing is schematic and
    the label carries the true pair count and length. While engaged the units light in a
    **travelling** sequence: the direction is physical (`stackPhaseOffset` < 0 ⇒ upper
    units lag the up-travelling carrier ⇒ the band sweeps bottom→top), the **rate is a
    slowed schematic** (the real band crosses the stack in ≈0.25 ms). The gradient scrolls
    at `1/STACK_SWEEP_PERIOD_S` = 1.25 Hz per point — never above 3 flashes/s — and
    freezes to a static lit state under `prefers-reduced-motion`.
  - **The readouts that explain the model**: `slip u` on the gauge (the quantity that
    explains why thrust fades), the **centering margin** (gap per side − film flutter,
    from the shared `flutterAmplitudeMm`) on the panel and the stack plate — reading
    `UNLOADED` in words when flutter fills the gap — and the **brownout reason** captured
    at trip time (unloaded stack / slip closure at `u ≥ 0.8` / low-speed extraction
    deficit).
  - **The paper's p.11 table as the dashboard** (`renderFreqTable`, `FREQ_TABLE`,
    `freqDecadeColumn`): seven decade columns with the paper's wavelengths and consequence
    rows in the paper's own words, the ~0.01–1 Hz band shaded (the climber reflects 50 % of
    power there), and the carrier's live position marked with its decade column lit. Cell
    spans are read off the paper's layout (±½ decade) and the plate's footnote says so,
    including the p.3-vs-p.11 tension it does not paper over.
  - **Two acts** (`atmosphereAct`): Act I (0–40 km) is drag-dominated, Act II is vacuum —
    the boundary is read off the same `densityRatio` the drag model uses. The crossing
    fires a plated banner, a chime, and a milestone burst once per run, and the persistent
    act/air line shows the drag readout collapsing.
  - **The event schedule** (`_updateClimbBeats`): plated, queued teaching cards at ~12 km
    (a transverse wave would be dead here — p.7's 45 km/h, 20 kW cap, against the player's
    live speed), ~20 km (air thinning; the stress-budget lever), ~70 km (gigacycle fatigue,
    only when the carrier sits in the paper's top decade), ~85 km (a second climber
    requests power — the paper's own open question, p.14). Crossings reuse the pure
    `upgradeCrossed`, so **it is load-bearing beyond the pickups**. Beats that would need
    physics the sim does not have — taper (p.9), drag on the wave (p.7), standing-wave
    resonance (p.10) — are deliberately absent rather than faked.
- **Governing numbers, all pinned by tests** (`dev/tests/pure.test.mjs`,
  `dev/tests/balance.test.mjs`): the **slide-6 fixture** (c = 21 / 6.3 km/s, Z/A = 48 / 14
  N/(m/s)/mm², P/A = 150 kW/mm² @ 200 km/h, 3.7 MW/mm² @ 1000 km/h, 42 MW/mm² @ 45 GPa —
  all to 2 s.f., and they only reproduce at the paper's ρ = 2300); `k ≈ 0.043 N/(m/s)` per
  pair ⇒ ~15 N at 350 m/s slip and ~10:1 magnet thrust-to-weight; switching power
  **266 kW = 6.7 % of 4 MW at §2.5's reference config** (260 Hz × 64 pairs) and
  **188 kW = 4.7 % at the shipped defaults** (92 Hz × 128 pairs); and the balance harness's
  **target bands** (100 km in 240–480 s, mean
  900–1300 km/h, terminal speed < `v_max`, brownout episodes 2–8 s).
- **Units chain** (`GameConfig.TETHER`): the tether carries a **longitudinal** (compression)
  wave, so its speed is `v = √(E/ρ)` from Young's modulus and density — a material constant
  (~20.9 km/s at the paper's E ≈ 1 TPa, ρ = 2300), shown in settings. Cross-section is
  `filmCrossSectionM2(widthMm, thicknessMm)`: the paper's ribbon is 45 mm × 0.2 mm = 9 mm².
  (The old `√(T/μ)` coupling-momentum proxy and the cylinder cross-section are deleted.)
- **Shipped defaults after the M2.11 rebalance**: 100 GPa Polycrystalline Graphene (the
  strongest non-speculative rung), carrier **92 Hz**, air gap 0.15 mm, 128 pairs, 30% stress
  budget, 1.00 m stroke, 50 kg cargo → 100 km in ~390 s at a ~930 km/h mean. The carrier
  default sits at the **low** end of the 92–1000 Hz band because switching watts grow with
  `f` while extraction is capped by `v_max`: above ~200 Hz this film class cannot pay for
  its own switching and the climb stalls. That trade is the point — the slider keeps the
  whole band so a player can find the wall.
- **Scoring** (`throughputKgPerHour`, M3.6): the Weight slider is cargo, and the score is
  **throughput — kg delivered to the Kármán Line per hour of climb** (the reference climb is
  50 kg in 387.6 s ≈ 464 kg/h). The clock is sim time from first liftoff, locked at delivery.
  A persisted best and the cumulative "bootstrap %" meter survive. `missionScore` (kg·km) is
  gone; do not reintroduce an altitude-weighted score.
- **M3.5–M3.8, the rest of the current surface**:
  - **Descending climbers** replace the deleted arcade pickups (`_updateDescenders`,
    `renderDescenders`). Riders spawn 150 m above the 30 km and 60 km crossings and ride
    down at `DESCENDER_SPEED_MPS`; the pass is a **relative-sign flip**, not a one-frame
    window (both riders move, so a `wasAbove` snapshot silently never fires). The pass
    retargets the milestone shake/burst, kicks a labelled schematic film ripple (presentation
    only — never in the slip integral) and queues p.5 / p.14 cards.
  - **Coupling quality is thrust against load**: `thrustN / (2 × weightN)`, so a healthy
    cruise reads "good". The old u = 0 sine reference read cruise as 0.37 = "poor", which is
    why the discrete-grab **border flash and glyph are retired**. `couplingTier` /
    `couplingColor` still feed the badge bar, the coupling particles and the stall line.
  - **Soft failure**: 1.2 s of sustained thrust below weight sets `_stalled` and the stack
    plate explains it in words (slip collapsed vs overloaded). A stall costs time and never
    ends the run.
  - **Panel groups + presets** (`PRESETS`): Ground station / Film / Climber, each with its
    derived readouts, plus five presets that apply through the **sliders' own DOM events**
    (never a parallel write path). Preset numbers were validated against the balance harness
    before shipping; Lofstrom 1000 Hz is a labelled stall demo, not a bug.
  - **Persistence is `.v2`** for every key (`spaceMonkey.bestScore` became
    `spaceMonkey.bestAltitude.v2` — it always stored altitude). v1 keys are deleted once at
    the top of the load handler and never migrated: units and meaning both changed.
  - **Two shared helpers exist so displays cannot drift**: `weightN` (badge tier + stall
    detector) and `activeFreqCells` (the p.11 dashboard + the game-over report card).

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
- The FG40 firing gradient (M3.1) is a **slowed schematic**: never exceed 3 flashes/s
  at any point (photosafety), freeze it under reduced motion, and route its colours
  through `COLOR_PALETTE` so the Okabe-Ito swap keeps working.
- Quick sanity check before committing: `bash dev/tools/check.sh` (or
  `SKIP_SMOKE=1 bash dev/tools/check.sh`). It runs the unit tests, rebuilds `index.html`
  and fails if the committed artifact was stale, checks asset references, and drives the
  browser smoke suite.
- **Current gate numbers** (keep these updated when they move): **105 unit tests**
  (pure 91, sliders 9, balance 5), **38 pure helpers** in the delimited block,
  **98 = 98** asset references, **18 browser smoke checks**, `index.html` **305 KB**.
- Adding a pure helper is four edits: the helper itself, `EXPORTED_SYMBOLS` in
  `dev/tests/extract.mjs`, the destructure and sanity object in `dev/tests/pure.test.mjs`,
  and the helper-count assertion. Adding or changing a slider is five: the id list in
  `extract.mjs`, `dev/tests/sliders.test.mjs`, a `scaleSettingValue` case, a `UI_CONFIG`
  entry, and `initGame`'s `sliderDefaults` literal.

See [`CONTRIBUTING.md`](../.github/CONTRIBUTING.md) for PR process and
[`CHANGELOG.md`](CHANGELOG.md) for release history.
