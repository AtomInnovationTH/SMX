# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-16

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
  pre-publish planning docs are archived under [`docs/history/`](docs/history).

### Fixed

- Coupling timing now targets the wave's **peak velocity** (zero-crossing) rather
  than the crest, matching the physics.

## [0.1.0] - 2026-05-21

First tagged release — UX polish pass and build-pipeline fix ahead of public
GitHub publication. See [`docs/history/REVIEW.md`](docs/history/REVIEW.md) for the
full pre-publish engineering review.

### Added

- **Milestone shake + particle bursts** at named altitude landmarks
  (Burj Khalifa → Mt. Everest → Kármán Line → ISS Orbit), with a banner on
  each new milestone.
- **Ghost-line personal-best tracker** — best altitude persisted to
  `localStorage` and rendered as a horizontal target line during play.
- **Coyote time + input buffering** for grabs (see `COYOTE_MS` / `BUFFER_MS`
  in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html)) so near-miss
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
  to [`index.html`](index.html), the artifact served by GitHub Pages.

### Changed

- _Nothing else this release._

[Unreleased]: https://github.com/AtomInnovationTH/SMX/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AtomInnovationTH/SMX/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/AtomInnovationTH/SMX/releases/tag/v0.1.0
