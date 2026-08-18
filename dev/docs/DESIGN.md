# Design decisions (settled; do not re-litigate)

Until August 2026 the reasoning behind the simulation lived in one place: a working
plan in `.kilo/plans/`, gitignored, on a single machine, with a local `handoff.md`
as the only pointer to it. This file is the committed version, so the decisions
outlive that machine. For history see `git log`, [`shift-log.md`](shift-log.md) and
[`CHANGELOG.md`](CHANGELOG.md); for current state and next tasks see
[`NEXT-SHIFT.md`](NEXT-SHIFT.md); for contributor rituals and the architecture see
[`DEVELOPERS.md`](DEVELOPERS.md). Where a later shift changed a decision below, the
entry says so.

## The one principle everything else follows

**Be exact where the player reasons. Summarise visibly where they only watch. Never
invent. Spend the entertainment budget on presentation, never on mechanics.**

In practice:

- The player thinks with `v_max = f_safety·strength/√(Eρ)`, `A_max = v_max/ω`,
  `λ = c/f`, switching watts `4·N·E_switch·f`, `P = Z·V²`, air density and the slip
  integral, so those have to be right to the decimal.
- What the player only watches can be summarised, as long as the label says so: the
  reflection band, taper as a single ratio, resonance as a drift you retune.
- Nothing is faked. The invented mechanics the rework deleted (altitude attenuation
  keyed to material strength, the magnet-material ladder, the timing minigame) did
  the most damage of anything the pre-M1 audit found: they cost credibility, and
  they were where the bugs clustered.
- The monkey, the landmark sprites, the sky shader, sound, pacing and reveals carry
  zero physics debt. That is where the charm lives.

## The physical setup (agreed with the owner)

- **The tether is a paper-thin conductive film, not a cable.** The cable was
  monkey-theme illustration. Gassend's paper agrees: 45 mm × 0.2 mm = 9 mm².
- **The climber is an FG40 sandwich**: opposed pairs, one unit on each face, film
  sliding through the gap. Several units per side, for force, stability and
  centering.
- **No physical contact. This is the entire point.** Momentum crosses an air gap by
  pulsed eddy-current traction, and the copy should never blur that. FG40's
  published force-vs-airgap curve describes static contact holding of iron, a
  different mode; the sim borrows that curve only to turn a gap width into a flux.
- **Why an EPM and nothing else**: an electromagnet burns power the whole time it
  holds a field, and a permanent magnet cannot switch off. Only an EPM is ON for
  free and OFF for free, paying the datasheet's 4 J per transition and nothing in
  between. Zero static power is the enabling technology.
- **An EPM is not a ladder of magnet materials.** A FluxGrip unit contains Alnico
  (the switchable half) and NdFeB (the fixed bias) together, and that pairing is the
  device. A Halbach array is a geometry, a separate axis entirely. The old
  alnico → neodymium → halbach upgrade ladder taught the wrong device, so it went.
  The real scaling axis is the number of pairs.
- **Centering is automatic**, handled by the onboard controller. It is genuinely
  hard (opposed pairs cancel laterally only at exact centre, and that equilibrium
  has negative stiffness), which is exactly why it is telemetry for the player and
  never an input.
- **FG40 is the proof of concept**, and its datasheet limits are treated as
  conservative. What the sim exists to explore is the scaling tricks, the max load
  and the max speed.

## Why the stress slider means what it means (the paper's "10 %", p.9)

The paper says that at 1000 km/h "longitudinal waves use only 10 % of tether
strength". Read that as 10 % of stress and `v_max` comes out at 338 km/h, which
forbids the very 1000 km/h operating point the sentence is about. So it must mean
something else, and the paper's own table says what: at 1000 km/h the wave stress is
13.3 GPa, or 30 % of the 45 GPa working stress, while the power per unit area is
3.7 of a possible 42 MW/mm², about 9 %. Since P ∝ σ², 10 % of power is √0.1 ≈ 32 %
of stress, and the two readings agree: the "10 %" is a fraction of stress-limited
power.

That is why the slider is a **stress fraction of working stress** (5-60 %, default
30 %, which lands the reference configuration exactly on the paper's 1000 km/h), and
why the panel shows both percentages next to it: the paper's figure appears
reconciled instead of contradicted. Settled 2026-08-06; the plan's earlier
"1-30 %, default 10 %" was the misreading, and it is superseded.

## ρ = 2300 kg/m³ is measured, not borrowed

Slide 3 gives E ≈ 1 TPa, ρ = 2300 kg/m³ and c ≈ 21 km/s. With ρ = 2300 the derived
relations reproduce every figure on slide 6 to 2-3 significant figures: wave speed,
both impedances, all three power rows. With ρ = 1800 every one of them misses by
8-13 %. That makes slide 6 a regression fixture rather than a citation, and
`dev/tests/pure.test.mjs` pins it.

## Decisions whose reasons are not in the code

- **`PX_PER_M = 10` is derived, not chosen.** At 260 Hz the wavelength is about
  91 m, and it has to fit a ~900 px screen. Ten pixels per metre is also what makes
  the Kármán landmarks land at the right heights.
- **`GRAVITY` is 98.1 px/s²**, so 1.00 G on the slider is 9.81 m/s² at that scale.
- **The sprite and the drawn stack are not to scale.** A 64-pair stack is really
  2.6 m long, which would be 26 px. The drawing is a schematic; the label carries
  the true numbers.
- **Failure is soft.** A restart wall at 30 km would be the worst possible ending
  for a game whose whole point is reaching 100 km. Stalls cost time and say why;
  the run ends with a report card measured against the paper's own figures.
- **The score is throughput**: kilograms delivered to the Kármán line per hour.
  That is the number that actually answers "how good is this elevator?", and it
  covers "max load" and "max speed" in one figure. Never an altitude-weighted score
  (DEVELOPERS.md pins this too).
- **The p.11 frequency table is the dashboard** because it is the densest page of
  the paper; the live carrier position rides on it.
- **Pickups became descending climbers.** The paper's p.5 shows a Descender, p.14
  floats powering climbers from the top, and Lofstrom points out that descenders
  dump energy into ribbon vibrations. Arcade pickups would also have sat below
  15 km, which under the N-pairs model would make the low climb a different vehicle
  from the upper 85 km.
- **The slip integral deleted four invented constants** (`COUPLING.GAIN`,
  `RATCHET_GAIN`, `EDDY_FRACTION`, `applyEddyDrag`) and replaced them with one
  closed form. The model got smaller.
- **If you ever rework the coupling**: `EDDY_FRACTION` was secretly the game's
  speed ceiling, so its deletion and its replacement landed in the same commit.
  The same rule holds for any future coupling change: never leave an in-between
  state with no ceiling, and keep the balance harness asserting that terminal speed
  stays finite and below `v_max`.
- **No altitude attenuation beyond wave drag.** The deleted `waveEnergyFactor` was
  an exponential fade keyed to tensile strength, in a game where stiffness is
  ~1 TPa across the whole material ladder. The only real attenuation is the p.7
  air drag on the wave, which M4 ships. Do not bring back a strength-based fade.

## What is deliberately not here

Milestone specs (M1-M4 all shipped; see the changelog and the shift log), the test
and tooling rituals (the old plan's machinery section is stale: it says 32 helpers
and 97 tests, the real numbers are 62 and 142, and
[`DEVELOPERS.md`](DEVELOPERS.md) has the four-edit and five-edit rules), and the
per-shift narratives, which live in [`shift-log.md`](shift-log.md).
