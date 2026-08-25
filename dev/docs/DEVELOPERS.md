# Developer guide

Current architecture and contributor workflow for **Space Monkey Elevator** — a
cartoon-wrapped simulation of contactless climbing of a space-elevator seed tether.

> This file is the current reference. The superseded design/roadmap documents that
> used to sit in `docs/history/` were deleted in the August 2026 tidy; `git log` has
> them if you ever need them. The settled design decisions that must not be
> re-litigated live in [`DESIGN.md`](DESIGN.md).

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
435 KB and must be served alongside the
`assets/` folder (as it is on GitHub Pages). It is not a standalone
offline file.

Run locally with `./start.sh`: it rebuilds `index.html` if its inputs moved (the
source, `embed_assets.py` or anything under `assets/`), serves the repo on the first
free port in 8000-8019 in the foreground and opens the game. A port that already
serves this exact build is reused; an explicit `PORT=<n>` is honoured strictly and
refused if it serves something else, instead of playing the wrong page. Handy knobs:
`PORT=8765 ./start.sh`, `NO_OPEN=1 ./start.sh` (headless shells), and a query-string
argument (`./start.sh '?debug'`). The same by hand:
`python3 -m http.server 8002`, then open `http://localhost:8002/index.html`.
CI (`.github/workflows/`) runs the unit tests, checks for em dashes outside comments,
re-runs the build on push and fails if the committed `index.html` is out of sync,
then deploys to GitHub Pages.

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
make **four** edits or the new symbol is silently `undefined` in tests: (1) add its name to
`EXPORTED_SYMBOLS` in `extract.mjs`, (2) destructure it from the loaded module at the top of
`pure.test.mjs`, (3) add it to the extraction-sanity object literal (the "core pure
symbols" test), and (4) bump the helper-count assertion. A guard test also scans the
delimited pure-helpers block and **fails
loudly** if a declared helper is missing from `EXPORTED_SYMBOLS`, so a forgotten export
turns red instead of silently reading `undefined`. **Declare helpers with the `function`
keyword** — it is the guard-safe, module-convention form. The guard regex matches both
`function name(` and `const/let name = … =>` arrow forms, so an inner `const f = (x) => …`
*inside* a helper is swept in too and breaks the count; write straight calls instead.
Keep the 61-helper count assertion in
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

### Capture tool (README stills + clip)

[`dev/tools/capture.mjs`](../tools/capture.mjs) re-shoots the committed captures:
`screenshots/hero.png` and `screenshots/climb.png` (clean HUD) plus
`screenshots/climb.mp4` (a 7.5 s real climb at the minimal HUD). Same zero-dependency
contract as the smoke test: `playwright-core` and the Chromium binary are resolved at
runtime (it also finds the smoke suite's local `node_modules`), missing pieces skip
cleanly, and the gate never runs it. ffmpeg encodes the clip; without it the PNG frames
are kept and the exact encode command is printed.

```sh
node dev/tools/capture.mjs          # stills + clip; or: stills | clip
```

The capture recipe (synthetic-clock stepping, the seeds, the landmark-rect walker) lives
in the tool's header comment and in [`NEXT-SHIFT.md`](NEXT-SHIFT.md).

### Local gate

For a single command that reproduces the full CI gate, use `dev/tools/check.sh`:

```sh
bash dev/tools/check.sh    # or: SKIP_SMOKE=1 bash dev/tools/check.sh
```

It runs the unit tests, checks for em dashes outside comments, regenerates `index.html`
from the source and **fails if it was
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
which stays clear of the controls box down to 1024 px wide; bottom band: the compact
plate, which is the whole bottom band below 1024 px and at the minimal level at any
width, 38 px for its two lines and 52 px when it also carries the minimal score line).

Instrument detail is a level, not a toggle: `_uxHudLevel` is minimal (the default) /
full / off, cycled by `H`, with `?clean` booting straight to off for captures. Every
instrument is drawn on the canvas, so nothing can be hidden with CSS: anything new must
read `_uxHudLevel` itself. Minimal is the badge, the energy bar, the compact plate (one
instruction, the p.11 carrier line and the throughput score) and a beat's title,
except trivia beats flagged `minimalQuiet` (stack heat, the mode question, the
resonance offer, gigacycle fatigue): those draw only at full, and the pump skips
them outright at minimal so an
encouragement or a hint is never delayed behind a card the level hides. Full
adds the mission and act blocks, the thermal readout, the p.11 dashboard, the stack
legend and the switching/skim/slip lines. Failures (UNLOADED, STALLED, brownout) are
never gated at any level, because a failure has to explain itself.

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
- **Taper** (`taperSectionRatioAt` / `taperVelocityFactorAt`, M4, paper p.9): the film's
  section can vary with altitude: one slider ratio R = A_anchor / A_top, a linear
  section ramp from the ground to the delivery altitude. Transported power is constant
  (the taper is slow against the wavelength, so no reflections), so the wave's velocity
  and displacement amplitude adjust as **1/√A** with height: the slip integral and
  `slipU()` read the LOCAL film speed at the climber's altitude, and the stress cap
  binds at the thin top, tightening the anchor's stroke budget to `v_max/(ω·√R)`. The
  trade is real: the anchor runs √R easier for the same `v_max` aloft, but the low
  climb's ceiling drops by the same factor. From about R = 3 the low-altitude skim
  can no longer cover the flat switching draw (R = 2.5 flies clean, R = 3 stalls; the
  break-even is per pair, so a bigger stack does not help), and the harness pins R = 4
  starving the demo stack. Taper is in the
  ribbon width; thickness (what `pairCouplingK` reads) is uniform, and tether mass is
  marked not-modelled in the slider hint. R = 1 is the uniform film and the pre-taper
  model exactly, which is why the committed balance trace is untouched. The drawn film
  band tracks the local width under the same clamp-jaw cap as before (it saturates for
  most of a tapered climb, so the taper reads through the section/stress/stroke-cap
  numbers, not the picture), and the drawn wave displacement follows the same 1/√A law.
- **Wave drag** (`densityColumnKgM2` / `waveDragSpeedFactorAt` / `waveDragColumnPowerW`,
  M4, paper p.7): quadratic drag on the WAVE, not the climber. Per unit length the
  longitudinally oscillating foil presents its two edges (2t) and dissipates
  ½·ρ_air·Cd·2t·V³ with the paper's longitudinal Cd = 0.02 (its table labels it a
  guess; the panel's Unsolved section says so). With wave power P = ρ·c·A·V² the
  damping integrates in closed form to V(y) = V₀/(1 + V₀·κ·Σ(y)), Σ the air column
  below y off the same US Standard Atmosphere table `densityRatio` reads. Thickness
  cancels out of κ, so the damping FRACTION is set by the film width while the drag
  POWER scales with t.   The slip integral and `slipU()` read the damped local film, so
  the climber feels the air only as a slower film, and the asymptote stays clamp-free.
  The drawn wave is deliberately not drag-scaled (a 1-3% effect at altitude,
  sub-pixel); the crest overlay reads the damped `u` through `slipU()` like every
  other consumer.
  The drag table's longitudinal row ships as a regression fixture next to slide 6's:
  0.9 MW at 1000 km/h for the 9 mm² film. This REPLACED the linear `AIR_DRAG`
  retention on the climber (its own comment marked the spot), so the default trace
  legitimately moved: the low climb lost the arcade cap (993 km/h at the first minute,
  was 590) and the damped cruise sits a few per cent lower (1085 vs 1132 km/h). The
  balance harness verifies the law end-to-end (a 10x narrower film damps honestly and
  the tax grows with the column), and the marked 2-12 km beat is now live at 2 km with
  the player's own bill in MW.
- **Standing-wave resonance** (`resonanceModeAt` / `resonanceBoostFactor` /
  `resonanceSupplyW` / `resonantFilmPeakMps`, M4, paper p.10): a Ground-station toggle,
  off by default (the plain travelling wave, so the committed balance trace cannot
  move). Engaged, the anchor becomes a node and the anchor-to-climber cavity rings at
  `f = n·c/2h` with `n = ceil(2h/100 km)` keeping the wavelength under the paper's 100
  km floor, so the frequency falls as the climber rises and resets once per climb at
  50 km, paying one cavity round trip (2h/c) of buildup: the marked 40-70 km retune
  beat. The standing wave's tension holds the full stress budget, so the film runs the
  LOCAL stress ceiling (the boost is `v_cap/v_anchor`, the p.10 table's ratio), the
  stack's switching follows the cavity rate (kHz on the pad: the mode starves there and
  the harness pins it; nearly free aloft), and the skim is capped by the anchor's
  resonant injection `σ_budget × drive speed × section` (the table's own P = σ·v law;
  the amplitude slider becomes the power budget). The builder is `activeFreqHz()`:
  every instrument reads the cavity rate while resonant, while the RENDERER keeps the
  carrier's travelling component (the standing arch is tens of km wide, sub-visible at
  screen scale, like the drag's sub-pixel damping). The crest overlay carries the mode's
  one visible channel: while resonant the train breathes in place at the cavity rate
  (capped at the scroll's 2.5 Hz ceiling, frozen mid-pose under reduced motion), an
  additive swell of the chevrons' V-depth and brightness that leaves the scroll, the
  26-74 px span, the 96 px spacing and the under-strokes untouched. The boundary-value
  buildup is summarised as the one-round-trip ramp and the hint says so.
- **Multi-climber power sharing** (`waveTransportedPowerW` / `waveSharedBudgetW` /
  `powerShareCapW`, M4, paper p.14): a Ground-station toggle, refuse by default (the
  single-climber wave, so the committed balance trace cannot move). Past the 85 km
  request a second rider boards and the wave's transported power becomes a SHARED
  budget: slide 6's `P = ρ·c·A·V²` over the local film in plain mode, the anchor's
  resonant injection (`P = σ·v`, already the single climber's supply cap) while
  resonant. Each rider's skim caps at the budget minus the other's draw, applied in the
  coupling exactly like the resonance supply cap (throttles thrust, never speed,
  recedes as `v → 0`). The other rider is summarised as a twin in formation cruise
  (drawing weight × climb speed, the player's own skim at cruise, so at the bind the
  split is an exact half) and rendered in formation below the player; the per-climber
  wave-boundary solve (partial reflections p.3, the retune interplay p.10) stays marked
  absent. The harness pins the honest outcomes: a plain shared wave never binds (~140
  MW against two ~13 kW skims, so the shared run is the unshared run frame for frame),
  while a resonant shared cruise halves the solo supply-capped one with the skim at
  supply/2.
- **Mode conversion, labelled and absent (paper p.12/13)** (`waveModeCell`, M4): the
  paper's mode table (longitudinal vs transverse, each travelling or standing) is a
  layout with a question attached ("Consider mode conversion above the atmosphere?"),
  not a mechanism, so no converter is modelled. What ships is the live cell as a
  labelled readout (settings, Ground station: longitudinal travelling, moving to
  longitudinal standing under the resonance lever, the one mode change the paper
  supports), the 42 km beat card asking the paper's question verbatim, and the
  Unsolved bullet, all quoting the one helper so they cannot drift. The transverse
  cells stay captions (the 12 km beat's 45 km/h, 20 kW drag row). No slider, no
  physics: `updateContinuous` is untouched and the balance trace cannot move.
- **The hot side of thermal, booked and absent (paper p.7 + FG40 datasheet, M4)**
  (`waveDragHeatingWM`, M4): the deck's only thermal hook is p.7's "longitudinal will
  be limited by stress limit, wave generator strength-to-weight ratio and possibly by
  drag heating" (a maybe with no number), and the datasheet publishes a ceiling, not
  a model: +73 °C internal absolute maximum (the heat-deflection limit of the polymer
  body; the electronics tolerates 105 °C continuously), ambient minimum -40 °C
  (`GameConfig.FG40.MAX_INTERNAL_TEMP_C` / `MIN_AMBIENT_TEMP_C`, pinned by a unit
  test). What no source publishes is the heat capacity, convective transfer
  coefficient or emissivity that would turn watts into a temperature, so NO
  temperature is modelled (section 0: never invented). Since the 2026-08-22
  integrity pass that claim is true in BOTH directions: the legacy cold-grip
  coupling penalty (an invented temperature term worth up to 12 % of thrust below
  19 km) is deleted — suits are costume, the thermometer a readout, and the only
  thermal physics is the exact watt bookkeeping this bullet already describes.
  What ships is the exact
  bookkeeping: a Ground-station readout (Stack heat; NO slider, the levers are the
  carrier and pairs the player already has) refreshed per frame with the live
  switching dissipation against the ISA air figure (convection dies with the air;
  aloft the stack can only radiate); the 2 km wave-drag card's new closing lines (the
  bill leaves the wave as heat, p.7's maybe, no film temperature); a new 30 km beat
  card booking stack watts against the ceiling with the temperature marked absent;
  and the Unsolved panel's drag-heating bullet. The helper is the p.7 hook's own
  term, the bare integrand ½·ρ(y)·Cd·2t·V(y)³ in W/m on the LOCAL film peak speed
  (the same vFilmPeakMps `calculateContinuousCoupling` integrates: the 30 km card
  mirrors that mode branch, taper × drag in plain mode and
  `resonantFilmPeakMps` under resonance, so it can never quote a speed the film
  is not running), and its fixture is a cross-reading: trapezoid quadrature over
  the column on the travelling wave's damped speed must reproduce
  `waveDragColumnPowerW` (q = −dP/dy by construction), so the local rate and the
  column bill can never drift. No mechanic: `updateContinuous` is untouched, the
  balance harness has nothing new to mirror, and the default trace cannot move.
- **The slide-6 power budget as a live readout (backlog)** (`updateWaveBudgetReadout`;
  no new helper, no slider): the transported power arriving at the climber's altitude,
  computed FRESH per frame via `waveSharedBudgetW` with the coupling's own share-block
  arguments (the share shift's stale-cache lesson), so the Ground-station "Wave
  arriving" row can never disagree with the physics. Plain mode reads the local film's
  transported power (taper holds A·V² constant, p.9; the p.7 drag tax saps it with
  altitude); resonant mode reads the anchor's injection (p.10's P = σ·v at the active
  cavity rate). With the p.14 rider aboard the same figure IS the shared budget and
  the row says so. Smoke pins all three readings by riding checks 12/13b/13c (29
  checks total). No mechanic: `updateContinuous` is untouched.
- **EPM energy loop** (`GameConfig.EPM`, pure `epmChargeStep`): engaging **drains** at
  `switchingPowerW = 4·N·E_switch·f` — two transitions per cycle per unit, two units per
  pair, **flat in duty cycle** — and **regenerates** from extracted mechanical power
  `F_mean · v_climber`. A brownout therefore means *switching power exceeds extraction*,
  which happens naturally as `u → 1` (extraction collapses while drain holds flat), so the
  engage/release **rhythm is emergent, not scripted**. Ambient trickle recovers a latched
  brownout in `BROWNOUT_RECOVER / TRICKLE` = 5 s. The gauge shows switching kW, the share
  of the paper's 4 MW budget, and live extraction. Shift E adds two teaching surfaces
  to the same gauge: the **low-charge warning** (an amber border pulsing at 1 Hz once
  charge drops under a quarter while engaged; a static bright border under reduced
  motion - the rhythm is now announced before it is failed) and the **first-rhythm
  hint** (`rhythmHintDue`, pure): a one-time-per-profile plate ("let go before it
  empties · the trickle refills it") that retires forever on dismissal or the first
  brownout, persisted as `spaceMonkey.rhythmHintDone.v1`. Both carry debug handles
  (`_gaugeLowChargeWarn`, `_rhythmHintDrawn`) for the smoke pins.
- **What the player sees (M3 illustration layer)** — presentation only; none of it feeds
  back into the physics:
  - **The legible wave** (`waveDrawAmpPx` / `drawnOscillationHz`, shift A): the drawn
    displacement is a labelled schematic on BOTH axes, because a real 1 m stroke is
    10 px against a 2,270 px wavelength — invisible — and true carrier frequency
    sampled by the display refresh aliases. Spatial: ~8x proportional exaggeration,
    capped at `WAVE_DRAW_MAX_AMP_PX` (the taper's thin-top factor can exceed it).
    Temporal: the shape's clock runs at a monotone map of the carrier into
    0.15-1.2 Hz (`drawnOscillationHz`), advanced in SIM time in `update()`, frozen
    outright under `prefers-reduced-motion` — this was the one motion channel with
    no guard before. The strain shimmer, the green film dot, the slip halo and the
    crest chevrons stay on the REAL clock and real u: they are the "what you see is
    what couples" instruments and must never inherit the schematic clock. Wavelength
    stays true (nothing compresses c/f), and the straight band edges are correct for
    a longitudinal wave. Debug handles `_waveDrawAmpPx` / `_waveShapeFrozen` sit
    beside `_filmBandHalfPx`.
  - **The altitude rail** (`renderRailHud` / `_railState`, shift B): a thin fixed
    rail on the right edge under the EPM gauge (which owns x width-37..width-13,
    y 56..236; the rail runs y 252..height-78 on the gauge's centre x, on the SAME
    translucent black plate every instrument reads through — without the plate the
    marks wash out against bright cloud; the first staged frame taught this).
    One computed
    state (`_railState`) feeds both the renderer and the smoke pin, so they cannot
    drift; it returns null at HUD off, so ?clean stays clean. The axis is SQRT
    (`railAltitudeToFrac`): linear crushes every diegetic landmark but Everest under
    12 % of the span; the compression is labelled at full HUD ("sqrt scale") and the
    Kármán crown is labelled there too. The 40 km act boundary is a SHADE in the
    track (Act I blue below, vacuum dim above), not a tick, because it sits 1.2 % of
    the span from the Baumgartner tick. Ghost best echoes the world-space BEST
    line's gold dashed language; the p.14 descenders are downward chevrons at their
    crossing altitudes; the live dot follows data and nothing animates, so
    photosafety and reduced motion need no guard. Landmark ticks are the altimeter
    pill's own table (ground and the crown drawn separately, ISS off-span).
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
    "magnets let go" in plain words when flutter fills the gap — and the **brownout
    reason** captured at trip time (unloaded stack / slip closure at `u ≥ 0.8` /
    low-speed extraction deficit). Shift C adds the **projected cruise** row
    (`slipCruiseU`): a bisection on the monotone closed form solving thrust(u*) =
    weight at the CURRENT sliders, shape-honest for harmonic carriers through the
    same numeric gate the coupling integrates. It quotes the PAD asymptote (ground
    taper, zero air column); the damped film aloft cruises ~4 % under it (the trace's
    1085 km/h against ~1131 projected at defaults — smoke pins both ends of that
    relationship), resonance refuses to solve a second model ("supply-capped while
    resonant"), and an unliftable cargo reads "cannot lift this cargo" instead of a
    number.
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
  - **The event schedule** (`_updateClimbBeats`): plated, queued teaching cards at ~1 km
    (the anchor is the brutal part; taper helps; p.9, live since M4's taper shipped,
    quoting the player's own anchor speed and stroke cap), ~2 km (the dense air taxes
    the wave; p.7, live since M4's wave drag shipped, quoting the drag table's
    longitudinal row and the player's own bill in MW, and closing on the bill leaving
    the wave as heat: p.7's drag-heating maybe, no film temperature modelled), ~12 km
    (a transverse wave would be dead here: p.7's 45 km/h, 20 kW cap, against the player's
    live speed and live longitudinal drag bill), ~20 km (air thinning; the stress-budget lever, quoting the LOCAL v_max),
    ~30 km (the hot side: the stack's live switching watts against the FG40's +73 °C
    internal ceiling, the convection medium falling on the same ISA table, and the
    temperature marked absent, no heat capacity or transfer coefficient being published
    anywhere; paper p.7 + FG40 datasheet, live since M4's thermal item shipped),
    ~42 km (the mode-conversion question, asked verbatim and marked unanswered; p.12/13,
    live since M4's mode-conversion item shipped, fired just past the 40 km act break so
    the card never shares the screen with its banner),
    ~45 km (resonance offered off-mode; p.10,
    live since M4's resonance shipped) and the 50 km retune on-mode (the drift hits the
    100 km wavelength floor; the anchor resets to the next harmonic and pays one cavity
    round trip of weakened film), ~70 km (gigacycle fatigue,
    only when the carrier sits in the paper's top decade), ~85 km (a second climber
    requests power: the share-or-refuse decision, live since M4's multi-climber shipped,
    quoting the live shared budget either way; p.14). Crossings reuse the pure
    `upgradeCrossed`, so **it is load-bearing beyond the pickups**. Beats that would need
    physics the sim does not have stay deliberately absent rather than faked; the
    rider-to-rider wave-boundary solve (p.14's unsolved half) is the standing example,
    with the mode-conversion mechanism (p.12) alongside it as a card that says so, and
    any temperature (p.7's drag-heating maybe has no number; the FG40 datasheet gives a
    ceiling but no thermal resistance) as the readout-and-card that says so.
- **Governing numbers, all pinned by tests** (`dev/tests/pure.test.mjs`,
  `dev/tests/balance.test.mjs`): the **slide-6 fixture** (c = 21 / 6.3 km/s, Z/A = 48 / 14
  N/(m/s)/mm², P/A = 150 kW/mm² @ 200 km/h, 3.7 MW/mm² @ 1000 km/h, 42 MW/mm² @ 45 GPa —
  all to 2 s.f., and they only reproduce at the paper's ρ = 2300; the two plain rows are
  also the p.14 shared-budget law, pinned on `waveTransportedPowerW` per unit section); the **p.7 drag-table
  fixture** (the longitudinal row: 0.9 MW at 1000 km/h for the 9 mm² film, and the
  first-order ½·Cd·2t·V³·Σ form agreeing with the exact loss); the **p.10 resonance
  fixture** (`Long + resonance` 2.5 MW/mm² @ 200 km/h, 12.5 MW/mm² @ 1000 km/h:
  `resonanceSupplyW` reproduces the row exactly at σ = 45 GPa, and
  `resonanceBoostFactor` turns the plain rows into them to the table's own figures); `k ≈ 0.043 N/(m/s)` per
  pair ⇒ ~15 N at 350 m/s slip and ~10:1 magnet thrust-to-weight; switching power
  **266 kW = 6.7 % of 4 MW at §2.5's reference config** (260 Hz × 64 pairs) and
  **12 kW at the shipped demo defaults** (92 Hz × 8 pairs); and the balance harness's
  **target bands** (100 km in 240–480 s, mean
  900–1300 km/h, terminal speed < `v_max`, brownout episodes 2–8 s).
- **Units chain** (`GameConfig.TETHER`): the tether carries a **longitudinal** (compression)
  wave, so its speed is `v = √(E/ρ)` from Young's modulus and density — a material constant
  (~20.9 km/s at the paper's E ≈ 1 TPa, ρ = 2300), shown in settings. Cross-section is
  `filmCrossSectionM2(widthMm, thicknessMm)`: the paper's ribbon is 45 mm × 0.2 mm = 9 mm².
  (The old `√(T/μ)` coupling-momentum proxy and the cylinder cross-section are deleted.)
- **Shipped defaults after the M2.11 rebalance and the shift 9 demo re-scale**: 100 GPa
  Polycrystalline Graphene (the strongest non-speculative rung), carrier **92 Hz**, air gap
  0.15 mm, **8 pairs**, 30% stress budget, 1.00 m stroke, **3 kg cargo** → 100 km in ~346 s at
  a ~1042 km/h mean (the M4 wave-drag shift: the arcade cap on the low climb is gone, the
  damped cruise sits a few per cent lower; the 2026-08-22 integrity pass removed the
  invented cold-coupling penalty, which is the whole 5 s and the faster low climb —
  cruise is unchanged at 1085 km/h because the penalty never reached vacuum). Shift 9 cut the stack 128 → 8 and the payload 50 → 3 kg, which holds
  thrust-to-weight (and therefore the pace) while making the stack a size the renderer can draw
  literally — `STACK_MAX_DRAWN_PAIRS` is 16, so at the defaults the units on screen ARE the
  units in the model. Two things had to move with it: `EPM.CAPACITY_J` 3 MJ → 0.19 MJ, because
  switching fell 16× and the ambient trickle would otherwise have covered the drain and made
  brownout impossible; and the two score keys went to `.v3`, because a 50 kg-scale best is
  unbeatable at 3 kg. The carrier
  default sits at the **low** end of the 92–1000 Hz band because switching watts grow with
  `f` while extraction is capped by `v_max`: above ~200 Hz this film class cannot pay for
  its own switching and the climb stalls. That trade is the point — the slider keeps the
  whole band so a player can find the wall.
- **Scoring** (`throughputKgPerHour`, M3.6): the Weight slider is cargo, and the score is
  **throughput — kg delivered to the Kármán Line per hour of climb** (the reference climb is
  3 kg in 345.5 s ≈ 31 kg/h; it was 50 kg in 387.6 s ≈ 464 kg/h before the shift 9 demo scale,
  which is why `cargoBest`/`bootstrapKg` moved to `.v3`). The clock is sim time from first
  liftoff, locked at delivery. Since the 2026-08-22 integrity pass the credited cargo is
  `_runCargoKg`, snapshotted at liftoff: a mid-flight Weight change steers the physics but
  can never change what a delivery credits (DESIGN.md pins this).
  A persisted best and the cumulative "bootstrap %" meter survive. `missionScore` (kg·km) is
  gone; do not reintroduce an altitude-weighted score.
  It is shown at **every** instrument level that draws instruments at all: the full mission
  block top-left, the game-over report card, and (since shift 12) one line in the minimal
  compact plate from the pure `minimalScoreLine`, which states the goal and cargo on the
  ground, the live pace projection while climbing, and the locked figure plus the persisted
  best after delivery. All three read the same `throughputKgPerHour`, so no level can quote
  a figure another would not. Since the bootstrap-pacing shift the persisted best also rides
  the goal and pace lines whenever one exists ("· best N kg/h" at minimal, "(best N)" in
  the full block's pace branch): a pace read only sharpens against a reference, the best is
  the one pacing reference the game owns, and the paper publishes no pacing figure to cite.
  A fresh player (best 0) sees exactly the shift-12 lines. Since the bootstrap-progress
  shift the minimal delivered line also carries the cumulative meter ("· tether N/600 kg"),
  the one moment the meter moves: the progress axis used to show only at full HUD and on
  the game-over screen, so a player who never pressed H never learned the bootstrap
  existed. The clause is guarded by `bootstrapKg > 0`, so the written states that pin the
  shift-12 strings keep matching, while a real delivery always has one (the credit just
  fired). The 600 kg target is the game's own S16 design number, not a paper figure.
  At compact width the full block's goal and pace branches carry short forms
  ("Mission: N kg to Kármán (100 km)", "pace N kg/h to Kármán (best M)"), the same
  shift-9 phone pattern the vine block and the frequency table use (same facts, fewer
  words): the goal sentence overflowed a 390 px screen and the pace line came within
  4 px of it at the stress figures. The delivered line fits as-is and is one string
  at both widths; desktop lines are byte-identical.
  A scoring system the default screen never mentions is the failure mode that change
  fixed; do not fold it back behind `H`.
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
  - **Panel groups + presets** (`PRESETS`): Ground station / Tether / Climber, each with its
    derived readouts, plus five presets that apply through the **sliders' own DOM events**
    (never a parallel write path). Preset numbers were validated against the balance harness
    before shipping; Lofstrom 1000 Hz is a labelled stall demo, not a bug.
  - **Persistence is versioned per meaning change**: `spaceMonkey.bestScore` became
    `spaceMonkey.bestAltitude.v2` (it always stored altitude), and the two score keys are on
    `.v3` (`cargoBest`, `bootstrapKg`) after the shift 9 payload re-scale. Stale keys are
    deleted once at the top of the load handler and never migrated: units and meaning both
    changed. Re-base a key only when its meaning does, and purge the old one in the same
    change.
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
  `SKIP_SMOKE=1 bash dev/tools/check.sh`). It runs the unit tests, checks for em dashes
  outside comments, rebuilds `index.html` and fails if the committed artifact was stale,
  checks asset references, and drives the browser smoke suite.
- No em dash (U+2014) in player-facing or repo-facing prose, comments excluded. Enforced
  by `dev/tools/check_emdash.py` against `Space_Monkey_Elevator.html`, run as part of the
  gate.
- **Current gate numbers** (keep these updated when they move): **149 unit tests**
  (pure 128, sliders 12, balance 9), **70 pure helpers** in the delimited block,
  **98 = 98** asset references, **41 browser smoke checks**, `index.html` **435 KB**.
- Adding a pure helper is four edits: the helper itself, `EXPORTED_SYMBOLS` in
  `dev/tests/extract.mjs`, the destructure and sanity object in `dev/tests/pure.test.mjs`,
  and the helper-count assertion. Adding or changing a slider is five: the id list in
  `extract.mjs`, `dev/tests/sliders.test.mjs`, a `scaleSettingValue` case, a `UI_CONFIG`
  entry, and `initGame`'s `sliderDefaults` literal.
- **A render change is not verified until you have shot the frame.** `check.sh` cannot see
  "invisible": it has caught a correct overlay that no player could make out, twice. The
  capture tool is [`dev/tools/capture.mjs`](../tools/capture.mjs); the recipe behind it,
  including the headless WebGL flags and the parallax and teleport traps, is in
  [`NEXT-SHIFT.md`](NEXT-SHIFT.md).

See [`CONTRIBUTING.md`](../.github/CONTRIBUTING.md) for PR process and
[`CHANGELOG.md`](CHANGELOG.md) for release history.
