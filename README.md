# Space Monkey Elevator 🚀🐵

Ride a wave to the edge of space.

**[▶ Play now](https://atominnovationth.github.io/SMX/)**

![The monkey climbing its ribbon past a hot air balloon in a blue sky, open clamps bracketing the film](screenshots/hero.png)

<video src="https://raw.githubusercontent.com/AtomInnovationTH/SMX/main/screenshots/climb.mp4"
       autoplay muted loop playsinline controls width="640"></video>

A real 7.5 s climb at the default settings: engaged off the grass, one coast (the arms-out
pose), caught again, up to the cloud base. If the video does not play inline,
[open the clip directly](screenshots/climb.mp4).

## How to play

Hold `SPACE`, or hold anywhere on a touchscreen, to catch the wave and climb. Let go before your
magnets run flat, then catch it again. Get 3 kg to the Kármán line as fast as you can.

| Key | Action |
|---|---|
| `SPACE` / hold anywhere | Engage the magnets (hold) |
| `1` `2` `3` | Sine, square or sawtooth carrier |
| `S` | Settings: ground station, film, climber |
| `R` `P` | Restart, pause |
| `H` | Instruments: minimal, all readouts, none |
| `C` `M` | Colourblind palette, sound |

![Climbing past a bald eagle at 355 m with the magnets engaged](screenshots/climb.png)

Stalling costs time and tells you why. It never ends the run. The run ends on a report card that
puts your speed, switching loss, stroke and carrier next to the paper's own figures. Score is
throughput: kilograms to the Kármán line per hour.

Nothing flashes above 3 Hz, `prefers-reduced-motion` is honoured, and an Okabe-Ito palette keeps
colour from being the only signal. It plays on a phone: the game takes exactly one input, so the
whole screen is the button, so hold anywhere.

---

## The paper

**Blaise Gassend**, *Powering Climbers Using Mechanical Waves: Fundamental Limits, Getting Around
Them, and One Climber Concept*. ISDC 2025, Space Elevator Technical Session, Orlando, 21 June 2025.

Read it from the author: <https://gassend.net/spaceelevator/isdc2025/>, the link printed on his own
slides. If that host is slow, ISEC mirrors it
[here](https://www.isec.org/s/ISDC2025-05-Powering-Climbers-Using-Mechanical-Waves.pdf).

Every idea in this game comes from that deck. We are not affiliated with Dr. Gassend and he has not
endorsed this. Turning his figures into code was our own work, so any errors in it are ours, and
the code flags every number that is an estimate rather than something he published.

Also cited by the paper, and used here:

* **Mark A. Wessels**, [arXiv:1802.07443](https://arxiv.org/abs/1802.07443), patent US 8,196,867 B1.
  His 92 Hz carrier and 60 cm stroke are one of the presets.
* **Keith Lofstrom**, [Acoustic Wave Powered Climbers](http://www.launchloop.com/AcousticClimber).
  100-1000 Hz, 1.2-18 cm strokes, and the observation that descending climbers dump energy into
  ribbon vibrations.
* **Zubax [FluxGrip FG40](https://fluxgrip.zubax.com/)**, the real electro-permanent magnet hardware, including its
  published force-versus-airgap curve. No affiliation.

Full citations and art provenance: [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).

---

## What's real and what isn't

Exact, because you make decisions with them:

* `v_max = budget · strength / √(Eρ)`, which depends on the material alone, so a hotter carrier
  buys you no speed
* `A_max = v_max / ω`, `c = √(E/ρ)` ≈ 20.9 km/s, `λ = c/f`
* mean thrust from the closed-form slip integral, with slip `u = v_climber / v_film`
* quadratic drag on the wave itself (paper p.7): the film arrives at your altitude damped by the
  air column it climbed through, and the ground station pays the difference
* standing-wave resonance (paper p.10), off by default: engage it and the anchor becomes a node,
  the film runs its local stress ceiling, the carrier locks to the cavity (falling as you climb,
  retuning at 50 km and paying a transient), and the stack's switching follows the cavity rate
* multi-climber power sharing (the paper's p.14 open question, playable at the budget level),
  off by default: past the 85 km request a second rider boards your wave, the wave's transported
  power becomes a shared budget, and each rider's skim caps at the budget minus the other's draw
* the paper's p.12/13 mode table as a live readout: you fly the longitudinal travelling cell,
  the resonance lever moves you to longitudinal standing and back, and at 42 km a beat card asks
  the paper's own question ("Consider mode conversion above the atmosphere?") verbatim
* switching power `4·N·E_switch·f`, extraction `F̄ · v`, and US Standard Atmosphere density

The impedance and power table on the paper's slide 6 reproduces to 2-3 significant figures, and
only at his ρ = 2300 kg/m³. It ships as a regression test, and so do the p.7 drag table's
longitudinal row (0.9 MW at 1000 km/h for the 9 mm² film) and the p.10 resonance row (2.5 MW/mm²
at 200 km/h, 12.5 MW/mm² at 1000 km/h).

Simplified on purpose, and labelled on screen: the reflection band, the stack's firing animation
(slowed down, and frozen if you prefer reduced motion), the monkey and the drawn magnet stack (not
to scale), the ripple a passing descender leaves in the film, the resonant buildup after a
retune (one cavity round trip, not a boundary-value solve), and the second rider, who is a twin
in formation cruise (drawing weight x climb speed), not a solved body.

Missing rather than faked: the wave physics between riders (partial reflections, paper p.3, and
the standing-pattern perturbation that makes retuning with two aboard tricky, p.10), the
mode-conversion mechanism (the paper offers a table and a question but no converter, so the game
ships the labelled table and the verbatim question, never a converter), and heat (the hot side of
p.5's thermal budget, the last deferred simulation item).

Estimated rather than published, and flagged in the code: per-pair traction, gap flux, structure
mass, battery size.

---

## The default climb

100 GPa graphene, 92 Hz, 1 m stroke, 30% stress budget, 9 mm² film, 0.15 mm gap, 8 magnet pairs,
3 kg cargo.

That gets you 100 km in 5:51, averaging 1027 km/h and cruising at 1085 km/h. Cruise is 48% of
`v_max`, which is an asymptote here, not a speed limit. Switching costs 12 kW, and the wave's
drag bill through the whole air column is about 8 MW at this film speed, small against the
hundreds of MW the wave carries: longitudinal waves barely feel the air, which is the paper's
point. A transverse wave would cap at 45 km/h.

The stack is small on purpose: 8 opposed pairs is 16 magnets, 33 cm and 1.4 kg, carrying 3 kg at
about 3:1 thrust-to-weight, so the 16 units drawn beside the climber are the 16 units in the
model. Gassend's own §2.5 anchor, ~64 pairs holding 50 kg, is the same ratio eight times bigger
and is still the top of the pairs slider.

92 Hz is a result, not a preference. Switching power rises with frequency while extraction stays
capped by `v_max`, so this film stalls above roughly 200 Hz. The slider still reaches 1000 Hz
because finding that wall is the point.

Presets, each checked against the simulation before shipping: paper baseline (6:28), Wessels
92 Hz and 60 cm (12:29), Lofstrom 1000 Hz (stalls on 2 MW of switching, which is the lesson), max
speed (4:53 at 1447 km/h), max payload (200 kg in 8:15).

Short callouts along the way each explain one page of the paper: down low a transverse wave would
cap out at 45 km/h, by 20 km the stress budget is your ceiling, at 40 km the air quits, at 42 km
the paper's mode-conversion question gets asked verbatim, descending climbers pass at 30 and
60 km, and at 85 km a second climber asks to share your wave, a share-or-refuse decision the
paper leaves unsolved at the wave level.

---

## Run and build

```bash
node --test dev/tests/*.test.mjs   # 138 tests, no dependencies
bash dev/tools/check.sh            # tests, rebuild check, asset check, browser smoke
python3 embed_assets.py        # Space_Monkey_Elevator.html -> index.html
```

Edit `Space_Monkey_Elevator.html`. `index.html` is generated, so rebuild and commit both. It loads
sprites from `assets/`, so those have to be served alongside it. Contributor notes are in
[`dev/docs/DEVELOPERS.md`](dev/docs/DEVELOPERS.md), and what to work on next is in
[`dev/docs/NEXT-SHIFT.md`](dev/docs/NEXT-SHIFT.md). Everything a player needs is `index.html`
plus `assets/`; the rest of the repo is the source, the tests and the build.

---

## Credits and licence

Physics: Gassend, Wessels, Lofstrom. Hardware: Zubax. Built with plain JavaScript, Canvas 2D and
one WebGL shader.

Climbing past real landmarks toward the Kármán line is a tribute to
["Space Elevator" by Neal Agarwal](https://neal.fun/space-elevator/), which remains © Neal Agarwal.
All code and art here is original.

The paper itself is not redistributed here. It carries no redistribution grant, so the game links to
the author's copy.

[MIT](LICENSE), code and art alike.

Still in progress, so the live build moves around. The hot side of thermal (paper p.7's
drag-heating note), the last deferred simulation item, is next.
Issues and pull requests welcome: [CONTRIBUTING.md](.github/CONTRIBUTING.md).
