# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
