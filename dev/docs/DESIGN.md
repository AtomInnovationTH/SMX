# Design decisions (settled; do not re-litigate)

Distilled in August 2026 from the local working plan that drove the M1-M4
simulation-fidelity rework. That plan lived in `.kilo/plans/` (gitignored, one
machine), so the settled reasoning is recorded here to survive it. History: `git
log`, [`shift-log.md`](shift-log.md), [`CHANGELOG.md`](CHANGELOG.md). Current state
and next tasks: [`NEXT-SHIFT.md`](NEXT-SHIFT.md). Contributor rituals and the current
architecture: [`DEVELOPERS.md`](DEVELOPERS.md). Where a decision below was later
superseded, the entry says so; everything else still holds.

## The principle

**Be exact where the player reasons. Summarise visibly where they only watch. Never
invent. Spend the entertainment budget on presentation, never on mechanics.**

- **Exact**: the relations the player manipulates (`v_max = f_safety·strength/√(Eρ)`,
  `A_max = v_max/ω`, `λ = c/f`, switching watts `4·N·E_switch·f`, `P = Z·V²`, air
  density, the slip integral). The player thinks with these, so they must be right to
  the decimal.
- **Summarised and labelled**: what the player only observes (the reflection band,
  taper as one ratio, resonance as a drift you retune).
- **Never faked**: the invented mechanics the rework deleted (altitude attenuation
  keyed to material strength, the magnet-material ladder, the timing minigame) cost
  credibility and produced most of the defects the pre-M1 audit found.
- The monkey, the landmark sprites, the sky shader, sound, pacing and reveals carry
  zero physics debt. Delight belongs there.

## Physical architecture (settled with the owner)

- **The tether is a paper-thin conductive film, not a cable.** The cable was only a
  monkey-theme illustration. The paper agrees: 45 mm × 0.2 mm = 9 mm².
- **The climber is an FG40 sandwich**: opposed pairs, one unit per face, film sliding
  through the gap. More than one unit per side, for force, stability and centering.
- **No physical contact. This is the entire point.** Momentum crosses an air gap by
  pulsed eddy-current traction. Never soften this in copy. FG40's published
  force-vs-airgap curve describes static contact holding of iron, a different mode;
  the sim uses it only to map gap to flux.
- **Why an EPM and nothing else**: an electromagnet burns power continuously to hold
  a field; a permanent magnet cannot switch off. Only an EPM is ON-for-free and
  OFF-for-free, paying the datasheet's 4 J per transition. Zero static power is the
  enabling technology.
- **An EPM is not a magnet-material ladder.** FluxGrip contains Alnico (switchable,
  semi-hard) and NdFeB (fixed bias, hard) together; that co-existence is the topology.
  A Halbach array is a geometry, orthogonal to material. The old
  alnico → neodymium → halbach ladder taught the wrong device. The real scaling axis
  is N pairs. Do not reintroduce the ladder.
- **Centering is automatic** (onboard controller). Genuinely hard: opposed pairs
  cancel laterally only at exact centre, and that equilibrium has negative stiffness.
  It is telemetry, never player input.
- **FG40 is the proof of concept**; datasheet limits are treated as conservative. The
  sim's job is the scaling tricks, max load and max speed.

## The stress-budget reconciliation (the paper's "10 %", p.9)

The paper's "at 1000 km/h, longitudinal waves use only 10 % of tether strength" is a
fraction of stress-limited **power**, not of stress. σ_wave at 1000 km/h is 13.3 GPa,
30 % of the 45 GPa working stress; P/A is 3.7 against 42 MW/mm², 8.8 % ≈ 10 %, and
since P ∝ σ², 10 % of power is √0.1 ≈ 32 % of stress. Consistent. Read as a stress
fraction instead, 10 % would cap `v_max` at 338 km/h and forbid the paper's own
1000 km/h operating point. So the slider is a **stress fraction of working stress**
(5-60 %, default 30 %, landing the reference config exactly on the paper's 1000 km/h),
and the panel shows both percentages so the paper's figure appears reconciled rather
than contradicted. Settled 2026-08-06; the plan's earlier "1-30 %, default 10 %" was
superseded.

## ρ = 2300 kg/m³ is verified, not a deference

Slide 3 gives E ≈ 1 TPa, ρ = 2300, c ≈ 21 km/s. At ρ = 2300 the derived relations
reproduce every slide-6 figure to 2-3 significant figures (c, both impedances, the
three P/A rows); at ρ = 1800 they all miss by 8-13 %. Slide 6 is therefore a
regression fixture, not just a citation; `dev/tests/pure.test.mjs` pins it.

## Decisions whose reason is not obvious from the code

- **`PX_PER_M = 10` is derived, not chosen**: λ ≈ 91 m at 260 Hz must fit a ~900 px
  screen, and it is what makes the Kármán landmarks land correctly.
- **`GRAVITY` is 98.1 px/s²** so 1.00 G = 9.81 m/s² at that scale.
- **Sprite and drawn stack are not to scale** (a 64-pair stack is 2.6 m = 26 px): the
  drawing is schematic and the label carries the true dimensions.
- **Failure is soft by design.** A restart wall at 30 km is the worst outcome for a
  piece whose goal is reaching Kármán. Stalls cost time and explain themselves; the
  run closes on a report card against the paper's own figures.
- **Score is throughput** (kg to Kármán per hour), the real figure of merit, subsuming
  "max load, max speed". Never an altitude-weighted score (DEVELOPERS.md pins this
  too).
- **The p.11 frequency table is the dashboard** because it is the densest page of the
  paper; the carrier's live position rides on it.
- **Pickups became descending climbers**: the paper's p.5 shows a Descender, p.14
  proposes powering from the top, and Lofstrom notes descenders dump energy into
  ribbon vibrations. Arcade pickups below 15 km would also have made the low climb a
  different vehicle from the upper 85 km under N pairs.
- **The slip integral replaced four invented constants** (`COUPLING.GAIN`,
  `RATCHET_GAIN`, `EDDY_FRACTION`, `applyEddyDrag`) with one closed form. The model
  got smaller.
- **Coupling rework warning, still live**: `EDDY_FRACTION` was secretly the speed
  ceiling, so deletion and replacement landed in the same commit. Any future coupling
  change obeys the same rule: never leave an intermediate state with no ceiling; the
  balance harness asserts terminal speed stays finite and below `v_max`.
- **Altitude attenuation**: the fabricated `waveEnergyFactor` (exponential decay keyed
  to tensile strength, when stiffness is ~1 TPa across the ladder) was deleted in M2.
  The only real attenuation is the p.7 wave drag M4 ships. Do not reintroduce a
  strength-keyed fade.

## What is not here

Milestone specs M1-M4 (all shipped; see the changelog and shift log), the machinery
rituals (the plan's own machinery section is stale: 32 helpers and 97 tests there vs
62 and 142 now; DEVELOPERS.md is the current owner of the four-edit and five-edit
rules), and the per-shift narratives ([`shift-log.md`](shift-log.md)).
