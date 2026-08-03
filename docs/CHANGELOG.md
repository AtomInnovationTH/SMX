# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- _Nothing yet._

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
