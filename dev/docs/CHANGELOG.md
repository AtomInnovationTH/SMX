# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Simulation-fidelity rework (in progress)

Reworking the game so it accurately illustrates Blaise Gassend's *Powering Climbers
Using Mechanical Waves* (ISDC 2025), with Zubax FluxGrip FG40 as the named coupling
hardware. Physics landed first (M1-M2); the illustration layer landed next (M3), and
M4's deferred physics has started (taper, wave drag, resonance, multi-climber sharing,
mode conversion).

#### Added (M4 physics, August 2026)

- **Mode conversion (paper p.12/13), the fifth M4 item: the mode table made
  legible, the conversion mechanism marked absent.** The paper sorts ribbon
  waves into longitudinal vs transverse, each travelling or standing, compares
  the two columns on p.12 and closes on a question: "Consider mode conversion
  above the atmosphere?" (p.14 repeats the maybe). It offers no converter, no
  coupling length and no efficiency, so the section-0 verdict is that there is
  nothing to be exact about and nothing honest to build: what ships is the
  labelled layout, never an invented mechanic. A new pure helper,
  `waveModeCell` (count 60 -> 61), is the single source for the cell the run
  is in: longitudinal travelling by default, longitudinal standing under the
  resonance toggle (the one mode change the paper supports, p.10). A new
  Ground-station readout (Wave mode) names the live cell, and its hint marks
  the transverse cells absent (dead at 45 km/h in air, p.7's drag row; a
  question only above the atmosphere, p.12). A new beat card at 42 km asks the
  paper's question verbatim, quotes the live cell, and points at the resonance
  lever as the mode change that exists; it fires just past the act break so it
  never shares the screen with the mid-screen banner. The Unsolved panel gains
  the mode-conversion bullet. No slider, no mechanic: the balance harness is
  untouched (updateContinuous is unchanged, so there is nothing new to
  mirror), the snapshot was NOT regenerated, and the slide-6, p.7 drag-row,
  p.10 resonance and p.14 power-sharing fixtures all keep passing. Smoke check
  12 now pins the 42 km card's firing and body, and check 13b pins the mode
  readout flipping travelling/standing with the resonance toggle. The card's
  paint was verified on staged 42 km frames (title at minimal, full body at
  full HUD); the committed stills did not move (the card fires at 42 km, the
  stills sit under 400 m).

- **Multi-climber power sharing (paper p.14), the fourth M4 item.** p.14's own open
  question, "How to get power to more than one climber?", is now playable at the budget
  level. A new Ground-station slider answers the M3.4 schedule's 85 km beat (formerly an
  open-question card), which is now the share-or-refuse decision. Refuse (the shipped
  default) and nothing anywhere changes: no rider, no cap, the committed trace
  untouched. Share, and a second rider boards the wave past 85 km (drawn in formation
  cruise, world-anchored like the descenders): the wave's transported power becomes a
  shared budget, slide 6's P = rho·c·A·V^2 in plain mode (a new regression fixture
  against the p.10 table's plain rows, 150 kW/mm^2 at 200 km/h and 3.7 MW/mm^2 at
  1000 km/h) and the anchor's resonant injection (p.10's P = sigma·v, already the
  single climber's supply cap) while resonant, and each rider's skim caps at the budget
  minus the other's draw. The other rider is summarised, never solved (a twin in
  formation cruise, drawing weight x climb speed); the per-climber wave-boundary solve
  the paper cannot do yet (partial reflections, p.3; the standing-pattern perturbation
  that makes retuning with two riders aboard tricky, p.10) stays marked absent in the
  slider hint, the beat cards and the Unsolved panel. Verified in the balance harness
  before shipping: on a plain wave the cap never binds (the budget ~140 MW at cruise
  altitude against two ~13 kW skims, so the shared run is the unshared run frame for
  frame: the honest p.14 answer at demo scale), while under resonance with the 3 cm
  stroke the shared cruise halves the solo supply-capped one with the skim pinned at
  supply/2, and the 85 km crossing is frame-identical between the solo and shared runs
  (the rider boards on frame-entry altitude, so the crossing frame is the last unshared
  one). Off by default; the balance snapshot was NOT regenerated. A full-HUD readout
  line shows the rider's draw against the budget while aboard, and the smoke suite
  drives the slider through its own DOM event in both directions.

- **Standing-wave resonance (paper p.10), the third M4 item.** A new Ground-station
  slider engages the anchor-as-node mode, off by default (the plain travelling wave, so
  the committed balance trace and the default climb cannot move). Engaged, the
  anchor-to-climber cavity rings at f = n·c/2h with the wavelength held under the
  paper's 100 km floor, so the frequency falls as the climber rises and resets to the
  next harmonic once per climb at 50 km, paying one cavity round trip (2h/c) of
  weakened film: the M3.4 schedule's marked 40-70 km retune beat is now live, on the
  player's own numbers, with the off-mode availability card quoting the same live
  arithmetic at 45 km. The standing wave's tension holds the full stress budget, so
  the film runs the local stress ceiling and the power per unit anchor speed rises by
  v_cap/v_anchor: the p.10 table's own ratio, pinned as a regression fixture next to
  slide 6's and the drag row's (the resonance row 2.5 MW/mm² at 200 km/h and 12.5
  MW/mm² at 1000 km/h reproduces exactly at the paper's 45 GPa working stress). The
  stack's switching follows the cavity rate: nearly free aloft, kHz on the pad, where
  the mode honestly starves (the harness pins the brownout cycling, like the taper's
  R = 4 teeth). While resonant the amplitude slider becomes the power budget: the skim
  cannot exceed the anchor's injection σ_budget × drive speed × section (the table's
  own P = σ·v law), pinned in the harness as extraction == supply at the cap. Verified
  in the balance harness before shipping: the resonant climb from 2 km beats the plain
  one on every band and cruises strictly higher yet strictly below its boosted film
  peak (still no clamp), exactly one retune fires per climb, and the supply-capped run
  rides its injection limit. Every instrument reads the cavity rate through
  `activeFreqHz()`; the renderer keeps the carrier's travelling component, the standing
  arch being tens of km wide and sub-visible at screen scale. The default trace is
  untouched and the balance snapshot was NOT regenerated.

- **Wave drag (paper p.7), the second M4 item.** The drag table's longitudinal row is
  now a real force on the film itself: per unit length the oscillating foil presents
  its two edges and dissipates ½·ρ·Cd·2t·V³ (the paper's longitudinal Cd = 0.02, its
  own table's labelled guess), so the wave arrives at the climber's altitude damped by
  the air column it climbed through, V(y) = V₀/(1 + V₀·κ·Σ(y)) in closed form off the
  game's own atmosphere table. The slip integral and the slip readout ride the damped
  film; the climber feels the air only as a slower film. The linear `AIR_DRAG`
  retention on the climber is deleted (its comment always marked the spot), so the
  default trace legitimately moved and the snapshot was regenerated deliberately:
  100 km in 350.7 s (was 380.4), mean 1027 km/h (was 947), cruise 1085 km/h (was
  1132) as the damped film aloft sits a few per cent under the anchor's wave. The
  marked 2-12 km beat is now live at the 2 km crossing, quoting the drag table's
  longitudinal row (0.9 MW at the paper's 1000 km/h for the 9 mm² film, pinned as a
  regression fixture next to slide 6's) and the player's own live bill, and the 12 km
  transverse reveal now quotes the live longitudinal figure against the 45 km/h
  caption. Verified in the balance harness before shipping: a 10x narrower film damps
  honestly more (the law's width dependence), the tax grows with the column below the
  climber, and both terminal speeds sit strictly below their damped film peaks, still
  with no clamp anywhere. The committed stills are untouched (the drag factor at the
  capture altitudes is a sub-pixel render no-op; verified by capture).

- **Taper (paper p.9), the first M4 item.** A new Film-group slider sets the film's
  anchor:top section ratio R (default 1.0, the uniform film and the pre-taper model
  exactly). Transported power is held constant, so the wave's velocity and displacement
  adjust as 1/√A with height: the anchor machinery runs √R easier for the same speed at
  the top, the low climb's ceiling drops by the same factor, and the stress cap binds at
  the thin top, tightening the anchor's stroke budget by 1/√R. The slip integral, the
  `slip u` readout, the wave-stress and film-section readouts, the drawn band width and
  the drawn wave amplitude all follow the local law. The marked 0-2 km beat is now live
  ("the anchor is the brutal part") with the player's own numbers, and the 20 km beat
  quotes the local v_max. Verified in the balance harness before shipping: R = 2 flies
  the trade (slower start, tighter anchor stroke, the same cruise slip at the top with
  the stress budget better used aloft), and R = 4, the paper's own example ratio,
  starves the demo stack below its energy break-even, pinned as the taper's real teeth
  (the break-even is per pair, so a bigger stack is not the way out). The default climb
  and the committed stills are unchanged (R = 1 is a render and trace no-op; the balance
  snapshot diff is exactly the two new `taperRatio: 1` record lines). Tether mass, the
  paper's stated cost, and the λ/4 anti-reflection layer are marked not-modelled in the
  slider hint rather than invented.

#### Added (presentation shifts, August 2026)

- **The committed pictures show the current renderer, and the README has a clip.**
  `screenshots/hero.png` and `screenshots/climb.png` were two renderers behind (thin-line
  film, closed fists) and are re-shot with the film band and the open clamps; the hero
  stays a still PNG because it is also the social card. `screenshots/climb.mp4` is a
  7.5 s clip of a real climb at the default settings (engage off the grass, one coast,
  catch again, up to the cloud base), 640x400 h264 at about 220 KB, embedded in the
  README with a stoppable `<video>`. All three come from `dev/tools/capture.mjs`, a
  zero-dependency capture harness that resolves `playwright-core` and Chromium at runtime
  and skips cleanly when they are absent, hand-steps the RAF loop off a synthetic clock
  (never paused, never wall-clock), and lands outside the gate. h264 over GIF/WebP was
  measured: the same frames are 8.8 MB as a GIF because the noise texture dithers per
  frame.
- **The throughput score is on the default screen.** One line in the bottom compact plate
  at the minimal instrument level (`minimalScoreLine`): the goal and cargo before liftoff,
  the live pace projection while climbing, and the locked figure plus the persisted best
  after delivery. The full mission block and the report card are unchanged and share the
  same `throughputKgPerHour`, so no level can quote a figure another would not. Before
  this, the score existed only behind `H`.
- **Slip is drawn, not numbered.** A chevron train straddles the film and scrolls past the
  climber at the modelled overtaking rate (`slipGateFactor`, taken from the same thrust
  integral the physics uses), parking beside the climber and fading to exactly zero push
  as the climber approaches `v_max`. Capped under 3 flashes/s, frozen under reduced
  motion, hidden at HUD off.
- **The film reads as a band, not a line,** and the climber's hands are open clamps that
  keep visible daylight to it at every film width. The air gap is the whole point of the
  coupling, so the drawing had to stop implying contact.
- **Three instrument levels** on `H`: minimal (the new default), all readouts, none. A
  first visitor lands on the climb instead of four HUD blocks and a 640 px table, and
  `?clean` boots straight to no HUD for captures.
- **Touch play.** The game takes exactly one input, so the whole play surface is the
  button: hold anywhere to pulse. Below 1024 px the bottom HUD band merges into one plate,
  the settings panel fills the screen and scrolls, and the old "requires a keyboard"
  notice now only appears for a viewport too small to place the HUD at all.

#### Added (M3.5-M3.8, August 2026)

- **Descending climbers** at ~30 km and ~60 km, replacing the deleted arcade pickups.
  They ride down past you, retarget the milestone shake and burst, leave a labelled
  schematic ripple in the film (Lofstrom: descenders dissipate energy into ribbon
  vibrations), and carry the paper's p.5 Descender and p.14 power-from-the-top ideas.
- **Throughput scoring** — kg delivered to the Kármán Line per hour of climb, replacing
  the old `cargo_kg × altitude_km`. The mission HUD shows live pace; delivery locks the
  time.
- **A report card at the end of a run**, comparing your speed, switching loss, ground
  stroke and carrier against the paper's own published figures (p.2, p.4, p.6, p.11).
- **Soft failure** — a stall costs time and explains itself on the stack plate (slip
  collapsed near the asymptote, or the stack is overloaded). It never ends the run.
- **Settings grouped by physical owner** (Ground station / Film / Climber) with their
  derived readouts inline, including a new live switching readout in kW and as a
  percentage of the paper's 4 MW budget.
- **Five presets** as entry points instead of a slider wall: paper baseline, Wessels
  92 Hz / 60 cm, Lofstrom 1000 Hz (a labelled stall demo), max speed, max payload. Each
  was validated against the balance harness before shipping, and each applies through the
  sliders' own events so no readout can show a pre-preset number.

#### Changed (M3.5-M3.8, August 2026)

- **Coupling quality is now thrust against the load carried** (`thrust / 2·weight`), so a
  healthy cruise reads "good". The previous reference (sine thrust at zero slip) scored a
  perfectly good climb as "poor", painting the border and badge red for most of a run.
- **The discrete-grab border flash and glyph are retired.** They graded a timing game that
  no longer exists; with SPACE held they re-armed every frame.
- **Persistence moved to `.v2` keys**, and the unversioned `spaceMonkey.bestScore` became
  `spaceMonkey.bestAltitude.v2` (it always stored altitude). v1 values are deleted on first
  load rather than migrated: units and meaning both changed.
- **`index.html` is 305 KB instead of 1799 KB.** The build no longer inlines 1.2 MB of
  cloud art; anything over 20 KB streams from `assets/` like the landmark sprites always
  did, so the game starts without waiting for scenery.
- **Repo layout**: the development machinery (tests, tools, art-gen, docs, git hooks)
  lives in `dev/`, leaving the root as the game itself. Superseded planning documents and
  `start.sh` were deleted.
- **README rewritten** to lead with playing the game, with the research credit below it.

#### Added

- **Slip coupling as the core mechanic** — mean eddy-traction thrust over a carrier
  cycle, closed-form for a sine carrier and integrated numerically for band-limited
  square/sawtooth. `v_max` is an **asymptote**: thrust fades as the climber's speed
  closes on the film, and there is no speed clamp anywhere in the code.
- **A real hardware chain** — air gap → pole flux via FG40's published
  force-vs-airgap curve → per-pair traction coefficient → × N pairs, with pretension
  setting film flutter and flutter eating the gap's centering margin.
- **An energy loop with teeth** — engaging costs `4·N·E_switch·f` switching watts (flat
  in duty cycle) and regenerates from extracted mechanical power, so the engage/release
  rhythm is emergent rather than scripted, and a brownout means switching outran
  extraction.
- **Stress budget → speed ceiling** — wave stress sets `v_max` from material strength;
  the amplitude slider is clamped to `v_max/ω` and reports the stroke actually in use.
- **The FG40 sandwich, drawn** — a schematic stack of opposed pairs flanking the film,
  firing in a travelling sequence whose direction is physical and whose rate is a
  slowed schematic (never above 3 flashes/s, frozen under `prefers-reduced-motion`).
- **The paper's p.11 frequency table as a live dashboard** — seven decades, the
  consequence rows in the paper's words, the ~0.01–1 Hz reflection band shaded, and the
  carrier's live position with its decade column lit.
- **Two acts and a vacuum threshold** — Act I is drag-dominated, Act II is vacuum; the
  ~40 km crossing gets a banner, a chime and a collapsing air-density readout.
- **Teaching beats along the climb** — ~12 km (a transverse wave would be dead here),
  ~20 km (the stress budget becomes the ceiling), ~70 km (gigacycle fatigue, only on a
  hot carrier), ~85 km (a second climber asks for power — the paper's open question).
- **Readouts that explain the model** — slip ratio `u`, the centering margin, and a
  brownout that states its cause in words.
- **Test instruments** — a balance-trace harness with target bands and a committed
  advisory snapshot, and the paper's slide-6 impedance/power table as a regression
  fixture (it only reproduces at the paper's ρ = 2300).

#### Changed

- **The carrier is a real frequency** (92–1000 Hz, default 92 Hz): switching watts grow
  with `f` while extraction is capped by `v_max`, so this film class stalls above
  ~200 Hz — that wall is the paper's story, kept playable on purpose.
- **The grip slider became the real air gap** (0.1–5 mm, default 0.15 mm).
- **N pairs is the scaling axis** for the coupling stack (default 128), replacing the
  magnet-tier ladder; mass now splits into derived dry mass and scored cargo.
- **Default material** is the strongest non-speculative rung (100 GPa); stronger
  entries are labelled speculative.

#### Removed

- The invented tuning terms the old arcade model leaned on: altitude attenuation,
  material damping, coupling/ratchet gain constants, the eddy-drag speed ceiling,
  weight and momentum multipliers, the magnet-tier pickups and grip multiplier, and
  the time-only wave API.

### Fixed

- **Shift 7 defect sweep** — a broad audit of the settings panel, rendering,
  input and scoring turned up and fixed several player-visible defects:
  - **Weight slider told a lie.** It defaulted to `1 kg` while every run was
    actually 50 kg, so the first touch snapped weight up to ~11× and abruptly
    made the game ~33% easier while slashing the score. The slider now reads
    50 kg in every representation (the static input, the label span and the
    initGame reset).
  - **Gear opened colorblind mode, not Settings.** The only ⚙ on screen toggled
    the palette while its tooltip claimed "Settings"; the panel was reachable
    only via `S`. ⚙ now opens the panel and a colorblind toggle button lives
    inside it, kept in sync with the `C` key through one shared label function.
  - **Sprites went soft after any resize or rotation.** Assigning canvas
    width/height resets all 2D context state, so the pixel-art flag set once in
    the constructor was lost. It is now re-applied at the end of every
    `resizeCanvas()`.
  - **Colorblind glyph disagreed with the flash colour.** The glyph's hardcoded
    thresholds could show ✓ while flashing GOOD (and vice-versa) — wrong exactly
    for the colourblind players it exists to serve. Both now derive from the new
    `couplingTier()`.
  - **Badge quality bar ignored the colourblind palette.** It hardcoded a third
    divergent green/gold/orange set and never changed under the palette toggle.
    It now uses the same `couplingTier()` → palette path as the flash.
  - **Slider-focused keys still pushed the climber.** ←/→ to fine-tune a focused
    slider also drifted the climber and SPACE double-fired. Gameplay key presses
    are now gated while a form control is focused (releases and R/S/C are not).
  - **A broken monkey sprite could freeze the canvas.** `drawImage` on a failed
    decode throws and, inside the RAF chain, killed the loop with no signal. The
    sprite draw now also checks `naturalWidth`, matching the suit draw.
  - **Reduced-motion preference froze over the OS setting.** The first colorblind
    toggle baked the live value into storage, overriding `prefers-reduced-motion`
    forever. It is no longer persisted or restored and always follows the OS
    each load.
  - **Upgrade bands could be skipped on a slow frame.** A fixed 30 m window vs a
    clamped 0.1 s step that can advance further meant an upgrade band was
    silently never collected. Collection is now a crossing test via the new
    `upgradeCrossed()`.
  - **A stray R could instantly restart the next run (D1).** The restart latch
    survived `initGame`, so a leftover armed confirm restarted immediately.
  - **Two timers fought over one toast (D2).** `showToast`'s timer could clear
    the confirm affordance while the latch stayed invisibly armed. The latch is
    now timestamp-based.

### Changed

- **Weight slider default** — now reads 50 kg in the UI to match
  `GameConfig.MONKEY.WEIGHT` (zero balance or score-scale change).
- **Gear button** — now opens the settings panel instead of toggling the
  colorblind palette; the colorblind toggle moved into the panel.
- **`couplingTier()`** — a single source of truth for coupling-quality tier,
  now consumed by the flash colour, the colorblind glyph and the badge bar so
  they cannot drift apart. The hidden legacy `K` grab keeps its 2-tier,
  phase-derived colouring.
- **Restart confirmation** — the latch is now a pure `restartPressDecision()`
  over a timestamp (`restartArmedAt`), and `initGame` clears it.
- **Pure helpers** — six new exported helpers extracted from orchestration:
  `couplingTier`, `upgradeCrossed`, `restartPressDecision`, `thermalStep`,
  `airDensityReadout`, `cargoDeliveryCredit` (the last three behaviour-identical).

### Added

- **`tools/check.sh` + opt-in `pre-commit` hook** — a one-command local mirror of
  the CI gate (unit tests, source/build in-sync check, asset references, browser
  smoke), with `SKIP_SMOKE=1` to skip the browser step.
- **Advisory CI browser-smoke job** — boots the built `index.html` in headless
  Chromium in CI as a pre-deploy signal that the game actually runs. It is
  non-blocking (`continue-on-error`, not in `deploy`'s `needs`).
- **`embed_assets.py` loud-failure guards** — a missing or renamed asset now
  fails the build (naming the file) instead of silently shipping a stale or
  erroring artifact.
- **New tests** — slider-consistency regression, `couplingTier` boundaries,
  `upgradeCrossed`, `restartPressDecision`, `thermalStep`, `airDensityReadout`,
  `cargoDeliveryCredit`, and a helper-count guard (24). Browser smoke grew from
  8/8 to 10/10 (gear/panel wiring + restart latch).

### Added

- **Optional browser smoke test** (`tests/smoke/smoke.mjs`) — drives the built
  `index.html` in a real headless Chromium to cover what the pure-logic suite cannot:
  boot, the EPM energy loop, landmark/cloud transform anchors, the single-RAF loop, and
  focus-loss handling. It adds **no committed dependency** — it resolves `playwright-core`
  and a Chromium binary at runtime and skips cleanly if either is absent, and it lives
  outside the `tests/*.test.mjs` glob so `node --test` and CI stay browser-free. It reads
  live state through a `window.__smokeGame` handle the game exposes only under
  `?debug`/`#debug` (inert in normal play), so it never patches the build artifact.

### Fixed

- **Deep-review bug sweep** — a broad audit of the game loop, systems and settings
  turned up and fixed several real defects:
  - **Grip slider difficulty cliff.** The grip slider defaulted to `1` ("1%"), but its
    handler scales `raw/20`, so touching it dropped `gripMultiplier` from the tuned
    reference `1.0` to `0.05` — a silent 20× nerf. The default/reset now sits at `20`
    ("20%"), which is exactly `1.0`, so the slider no longer lies and the cliff is gone.
  - **Double game-loop (2× spawns / wasted CPU).** Every restart/unpause path called
    `requestAnimationFrame` blind, so a fast pause/unpause double-tap (or overlapping
    restart inputs) could leave two self-scheduling `update()` chains running at once.
    All start paths now route through a single `_startLoop()` that cancels any pending
    frame first, guaranteeing one chain.
  - **Stuck keys on focus loss.** Holding an arrow or SPACE and alt-tabbing left the
    key "held" forever (endless drift / stuck pulse), since the OS suppresses the
    matching `keyup`. `blur`/`visibilitychange` now clear all key state and release the
    grab.
  - **Legacy-grab teleport.** In the hidden classic-grab model (`K`), the square/sawtooth
    velocity "spike" (×100/×50 of a normal peak) was multiplied straight into momentum,
    launching the climber off the map on a well-timed grab. `calculateGrabMomentum` now
    bounds the velocity to the sine-equivalent peak `amp·ω`; sine is unaffected.
  - **Inverted vine at high tension.** `tensionSagFactor` was unclamped, so tension above
    ~125 kg (the slider reaches 20000) drove the rendered wave negative and re-growing
    inverted. It is now floored at `TENSION_SAG_MIN` (render-only; physics reads the wave
    directly and was never affected).
  - **Camera swoop on restart.** `initGame` never reset the camera, so a restart from
    altitude swooped down from the previous run's `y`. The camera now snaps to the spawn.
  - **Robustness.** `ObjectPool.release` no longer double-inserts an object that was not
    active; the monkey-pose SVGs count a failed decode as loaded so a broken image can't
    wedge the loading gate; and the material `parseInt` now passes radix 10.
  New unit tests pin the `tensionSagFactor` floor and the legacy square/sawtooth momentum
  bound (65 tests total).

- **Docs contradicting the tree** — corrected the stale "godwit 404s today" note in
  `art-gen/manifest.py`, the standalone-asset claim in `docs/GITHUB_SETUP.md`
  (Option B), the wrong `√(T/μ)` wave-speed formula in `docs/DEVELOPERS.md` (the
  tether carries a longitudinal wave, so the speed is `√(E/ρ)`; `√(T/μ)` is only a
  coupling proxy), and the stale "~70 landmark sprites" counts (they are **78**).
- **`docs/GITHUB_SETUP.md`** — replaced the `v0.3.0` example with the real `v1.0.0`
  tag command, ticked Steps 6 & 7 in the checklist, flipped Step 7's header from
  "Action Required" to done (the tag is moved), fixed a wrong work-date, and
  re-labelled Step 8 (GMX cross-link) as external/owner-only rather than
  discoverable from this repo.
- **`docs/v1.0-roadmap.md`** — ticked the final acceptance item (CHANGELOG, tag on
  HEAD, green CI), fixed wrong work-dates, and corrected two stale work-annotations.

### Added

- **`art-gen/manifest.py` / developer docs** — documented the whole `art-gen/`
  pipeline (manifest → `gen.py` → `post.py` → `tools/check_refs.py`) in
  `docs/DEVELOPERS.md`, added `.env.example` so the OpenRouter key contract is
  discoverable without committing the real `.env`, and documented that adding a
  testable pure symbol now requires a **three-edit** export ritual.

### Changed

- **Legacy grab model (`K`)** — removed the unreachable `GRAB.POOR_QUALITY` tier.
  `phaseDiff` is bounded by 0.25, always below `GOOD_WINDOW` (0.30), so the "poor"
  branch could never execute and a mistimed legacy grab floors at ~0.639. The dead
  constant and branch are gone and the invariant is now pinned by a test, so a
  future config change that would resurrect the tier fails loudly. No change to
  shipped behaviour.

### Tests

- **EPM charge/regen/brownout loop** — the energy-loop arithmetic was extracted from
  `updateContinuous` into a pure exported `epmChargeStep` (same ritual as
  `altimeterLandmarkAt`), so the difficulty curve is now unit-tested: trickle/coast,
  per-tier drain, regen at ground, break-even quality `DRAIN/REGEN` rising with tier
  (S11), the altitude-gated perfect-timing ceiling (Q-P3), unknown-tier fallback,
  brownout latch with single-fire `tripped`, trickle-only recovery, `[0, CAPACITY]`
  bounding under an adversarial sweep, and `netPerSec` HUD semantics. Equivalence
  with the pre-refactor loop was verified once during development against a
  600-frame reference trace (scratch script, not committed).
- **Camera coverage** — snap path, the strict `absDiff > 500` fast-catchup boundary,
  `smoothing` as an instance field (the landmark-dwell path), no-overshoot at any
  `dt`, shake decay/floor/max semantics, and `±intensity/2` displacement bounds.
  (Camera has no look-ahead and no clamping; an earlier plan mislabelled those as
  untested — they do not exist.)
- **Exercise shipped code, not reimplementations** — the B.14 drag test and the
  altimeter boundary test now drive the real `applyGravityAndDrag` /
  `applyEddyDrag` and the extracted `altimeterLandmarkAt` function.
- **New coverage for previously untested paths** — `applyEddyDrag` (no-air braking,
  `fieldFactor 0` coasting, frame-rate independence), `calculateGrabMomentum`
  (quality bands, weight factor, signed momentum), and
  `updatePosition`/`updateHorizontalVelocity` (clamps and drift decay).
- **Reachability guard** — asserts the legacy grab `max phaseDiff` (0.25) stays below
  `GRAB.GOOD_WINDOW`, keeping the removed poor tier unreachable by construction.

## [1.0.0] - 2026-08-03

The legally-clean release. **All artwork is now original to this project** —
78 landmark sprites, 12 atmosphere clouds and the ground strip AI-generated from
the tracked, hand-written prompts in `art-gen/manifest.py`, plus procedurally
drawn grid/noise/monkey/suit/thermometer art — with provenance recorded in
[`ATTRIBUTIONS.md`](../ATTRIBUTIONS.md). The git history that contained the
retired third-party art (© Neal Agarwal) was **rewritten** (`git filter-repo`)
and the GitHub repository was **deleted and recreated** on this date, so
pre-1.0 clones and commit SHAs are incompatible. Deployment to GitHub Pages is
restored (Source: GitHub Actions), and the MIT licence now covers the **whole
repo, code and art alike**.

### Added

- **Original art pipeline** (`art-gen/`) — prompt manifest, generator
  (`gen.py`) and post-processor (`post.py`: chroma-key/luma-alpha, despill,
  trim, 2× resize, alpha verification gates) that produced the full replacement
  asset set. Only `*.py` is tracked; raws and sheets are gitignored.
- **`tools/check_refs.py`** — static gate covering all five asset reference
  forms (CSS `url()`, favicon link, `ASSET_BASE_PATH` clouds, runtime landmark
  sprites, thermal suit/gauge paths); asserts 98 distinct referenced == 98
  files on disk with 0 orphans / 0 missing, and checks `index.html` separately.
  Runs in CI.
- **Thermal layer** — a Standard-Atmosphere temperature readout (with the thermometer
  gauge) and a protective-suit progression: the climber auto-dons a flight suit, then a
  pressure suit at the **Armstrong Limit (~19 km)**, then a full space suit, with a
  small, capped, tunable cold coupling penalty when under-dressed. Wires in the
  previously-unused suit and thermometer art.
- **Two landmarks** — the **Bell X-2** (~38.5 km, 1956 altitude record) and the
  **de Havilland Vampire** (18.1 km, 1948 jet altitude record), using sprites that
  shipped but were never placed in the altimeter.
- **Zero-dependency unit test suite** (`tests/`, Node's built-in `node:test`) covering
  wave math, physics/coupling, frame-rate decay, tether/scoring helpers, the thermal
  model, and the altimeter table. Runs in CI (`node --test tests/*.test.mjs`) before the build.
- **WebGL fallback + hardening** — context acquisition now retries
  `experimental-webgl`, shader compile/link status is checked, and `webglcontextlost`/
  `webglcontextrestored` are handled. On any failure the decorative background falls
  back to a static CSS gradient sky and the game keeps running.
- **Persistent mission HUD** — the cargo / mission-score (`kg·km`) and tether
  bootstrap % are now shown during play (pulse model), not only at game-over.

### Changed

- **Licence coverage** — the MIT grant now applies to code **and** art (it
  previously covered code only, while third-party imagery shipped unlicensed).
  For AI-generated images the grant operates to the extent rights exist.
- **Hero sprite provenance** — `mount-everest-s-800`, `saturn-v-sm` and
  `space-shuttle-sm` were re-generated from words alone, removing the set's only
  reference-assisted lineage (`HERO_REFS` is permanently empty).
- **`screenshots/falling.png`** retaken — the old shot had an empty sky; the new
  one shows the falling monkey, the USSR-1 balloon landmark and the nimbostratus
  layer at 2.4 km.
- **Frame-rate-independent physics.** Air drag, horizontal drift decay, and camera
  smoothing are now normalized per-second via `frameDecay(base, dt) = base^(dt·60)`,
  so behaviour no longer depends on display refresh rate. **60 Hz is the reference
  frame and is byte-identical to before**, so no score reset is needed; high-refresh
  PBs set before this fix may have been *understated* (more drag was applied per
  second), and are only helped going forward.
- **Long-frame handling** — after a stall the frame's `dt` is now clamped (to 0.1 s)
  and the step still runs, instead of being dropped, fixing a post-stall freeze.
- **Scoring semantics unified** — the game-over panel now shows clearly-labeled
  "Altitude" (always) and "Mission score: … kg·km" (on Kármán delivery) metrics; the
  internal `bestScore`/`previousScore` variables were renamed to `bestAltitude`/
  `previousAltitude` (the `localStorage` keys are unchanged, so saves survive).
- **Tuning consolidated** — magic numbers (tension sag, material damping, slider
  scalings, coupling audio cadence) moved into `GameConfig`; the dual physics model is
  now isolated into `updateContinuous`/`updateLegacy` with the model flag read through
  a single `_isContinuous()` helper.

### Fixed

- **`cumulonimbus-850` aspect regression** — re-rolled as a tall portrait tower
  (840×925); the landscape interim file rendered only ~993 px tall at its
  `maxWidth: 1600px` display size.
- **`post.py` fringe metric** — residual near-key colour is now measured over
  visible pixels only (alpha-weighted); the whole-image version printed inflated
  benign warnings (grass 22%, `bell-x-1` 11%).
- Persisted scores/altitudes are now defensively parsed (`NaN`/`Infinity`/negative
  values are rejected) so a corrupted `localStorage` entry can't poison scoring state.

## [0.2.0] - 2026-06-16

Reframe from "climbing game" to a **cartoon-wrapped simulation of contactless
climbing of a space-elevator seed tether**, plus a polish and documentation pass.
The contactless electro-permanent-magnet (EPM) **pulse/couple** model is now the
default; the legacy discrete grab/hold model is kept as a hidden backup (`K`).

### Added

- **Continuous coupling model** — pulse (`SPACE`) to couple to the tether's
  traveling waves; coupling efficiency peaks at the wave's peak velocity, and an
  asymmetric (sawtooth) wave adds a ratchet net assist.
- **EPM charge/energy loop** — pulsing drains charge; well-timed coupling
  regenerates it, attenuated by altitude and gated by tether material; ambient
  trickle makes a **brownout** recoverable by coasting. Fixed battery gauge with a
  net-flow arrow and brownout warning.
- **Light units chain** — wave speed `v=√(T/μ)` readout; tension/width scale
  coupling momentum.
- **Cargo-delivery scoring** — deliver cargo (Weight) to the Kármán Line for a
  `kg·km` score with a persisted best, plus a cumulative "bootstrap %" meter.
- **Audio** — WebAudio pulse tone (pitch by coupling quality) and a brownout tone;
  starts muted, `M` toggles (persisted).
- **Educational layer** — settings concept blurb, per-setting explainers, a
  wave-shape ratchet explainer, and a "what's above 100 km" GEO/counterweight
  finish panel.
- **Diegetic EPM hands-glow** that tracks charge / brownout.
- **Onboarding** — first-load pulse hint; **a11y** — `<noscript>` fallback and a
  canvas `aria-label`; **colorblind coupling glyph** (✓ / ~ / ✗).
- **SEO/social metadata** — description, `theme-color`, Open Graph + Twitter card
  tags; SVG favicon (the monkey).
- **CI** — GitHub Actions verifies `index.html` is in sync with the source and
  deploys to GitHub Pages on push.

### Changed

- Terminology swept from "grab/vine" to "pulse/couple/tether" across UI, controls,
  and docs.
- `index.html` now carries an auto-generated DO-NOT-EDIT banner; README is honest
  that it is served alongside `Space Elevator_files/` (not a standalone offline file).
- `DEVELOPERS.md` rewritten to current architecture; the original design doc and the
  pre-publish planning docs are archived under [`docs/history/`](history).

### Fixed

- Coupling timing now targets the wave's **peak velocity** (zero-crossing) rather
  than the crest, matching the physics.

## [0.1.0] - 2026-05-21

First tagged release — UX polish pass and build-pipeline fix ahead of public
GitHub publication. See [`docs/history/REVIEW.md`](history/REVIEW.md) for the
full pre-publish engineering review.

### Added

- **Milestone shake + particle bursts** at named altitude landmarks
  (Burj Khalifa → Mt. Everest → Kármán Line → ISS Orbit), with a banner on
  each new milestone.
- **Ghost-line personal-best tracker** — best altitude persisted to
  `localStorage` and rendered as a horizontal target line during play.
- **Coyote time + input buffering** for grabs (see `COYOTE_MS` / `BUFFER_MS`
  in [`Space_Monkey_Elevator.html`](../Space_Monkey_Elevator.html)) so near-miss
  timing still feels fair.
- **One-button restart** (`R`) with an explicit game-over state.
- **`prefers-reduced-motion` support** — camera shake and particle bursts
  are suppressed automatically for users who request reduced motion.
- **Okabe-Ito colorblind palette** toggle (`C` key or ⚙ button) so grab
  quality is no longer signalled by colour alone.

### Fixed

- **Build pipeline writing to the wrong file.** [`embed_assets.py`](embed_assets.py)
  previously wrote to `Space_Monkey_Elevator_Embedded.html`, which nothing else
  referenced — meaning rebuilds never updated the deployed game. It now writes
  to [`index.html`](../index.html), the artifact served by GitHub Pages.

### Changed

- _Nothing else this release._

[Unreleased]: https://github.com/AtomInnovationTH/SMX/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AtomInnovationTH/SMX/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/AtomInnovationTH/SMX/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/AtomInnovationTH/SMX/releases/tag/v0.1.0
