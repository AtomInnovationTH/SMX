# Next shift

Read this first. It is the current state, the next tasks in priority order, and the traps
that have already cost time. Updated at the end of the shift that shipped M4 standing-wave
resonance (paper p.10: the anchor as a node, the frequency falling as the climber rises
and resetting at the 100 km wavelength floor, paying one cavity round trip of transient).

## Where things stand

- **Live**: <https://atominnovationth.github.io/SMX/>, deployed from `main` by
  `.github/workflows/deploy.yml` on every push. The published site is only `index.html`,
  `assets/` and `social.png`.
- **Gate**: `bash dev/tools/check.sh` (add `SKIP_SMOKE=1` to skip the browser half).
  Currently 132 unit tests, 28 smoke checks, 98 = 98 asset references, all green.
- **Payload**: `index.html` is 391 KB. Only assets under 20 KB are inlined; the clouds,
  ground and noise stream from `assets/`.
- **Physics**: M1, M2, M3.1-M3.8 and M4's first three items (taper p.9, wave drag p.7,
  standing-wave resonance p.10) are complete. The deferred list is powering more than
  one climber (p.14), mode conversion (p.12) and the hot side of thermal. All are
  marked absent in-game rather than approximated. Do not fake them.
- **Default climb**: unchanged by the resonance shift (the mode is off by default):
  100 km in 350.7 s, mean 1027 km/h, cruise 1085 km/h = 0.48 v_max, no brownouts,
  31 kg/h of throughput with 3 kg of cargo.

## What last shift changed, so you do not undo it

- **M4 standing-wave resonance (paper p.10) is live, and it unlocks the marked 40-70 km
  retune beat.** Four new pure helpers (`resonanceModeAt`, `resonanceBoostFactor`,
  `resonanceSupplyW`, `resonantFilmPeakMps`; count 53 -> 57) and ONE new slider
  (Ground-station group, `resonance` 0/1, default off). The model: engaged, the anchor
  is a node and the anchor-to-climber cavity rings at f = n·c/2h with
  n = ceil(2h/lambda_max) keeping the wavelength under the paper's 100 km floor
  (`TETHER.RESONANCE_LAMBDA_MAX_M`), so the frequency FALLS as the climber rises and
  resets to the next harmonic once per climb at 50 km, paying one cavity round trip
  (2h/c = 4.8 s there) of buildup: the transient. The standing wave's tension holds the
  full stress budget, so the film runs the LOCAL stress ceiling (the boost is
  v_cap/v_anchor, altitude-independent — exactly the p.10 table's ratio), drag-damped by
  the same p.7 law reading the envelope. The stack's switching follows the cavity rate
  (`activeFreqHz()` is the single source every instrument reads; the renderer keeps the
  carrier's travelling component, the standing arch being tens of km wide and
  sub-visible at screen scale). The skim is capped by the anchor's resonant injection
  sigma_budget x drive speed x section (the table's own P = sigma.v law): the amplitude
  slider becomes the power budget while resonant.
- **The p.10 table ships as a regression fixture next to slide 6's and the drag
  row's.** `resonanceSupplyW` reproduces the resonance row EXACTLY (45 GPa x 200 km/h
  = 2.5 MW/mm2, x 1000 km/h = 12.5 MW/mm2), and `resonanceBoostFactor` turns the plain
  rows into them to the table's own figures (16.9x at 200 km/h, 3.4x at 1000).
- **The balance harness verified the law before it shipped, and the default trace did
  NOT move (snapshot not regenerated).** The new test flies resonance from 2 km against
  the plain film from 2 km: strictly faster on every band, cruising strictly higher yet
  strictly below its boosted film peak (still no clamp), no brownouts aloft (switching
  follows the cavity rate), exactly ONE retune at 50 km (the M3.4 band), the n = 2 mode
  holding to 100 km with the frequency still drifting inside it. The supply cap is
  pinned as physics, not prose: with a 3 cm stroke the climber rides extraction ==
  supply at the top. And the pad is pinned as the honest teeth: engaged on the ground
  the 1 m cavity rings at ~10 kHz and brownout-cycles, trapped low (the R = 4 taper
  pattern). The harness grew three knobs for it (`resonanceOn`, `startAltM`,
  `amplitudeM`) and mirrors the updateContinuous resonance block call for call; the
  mirror tracks the drift EVERY frame (an early draft froze f at the reset value and a
  supply-cap readout 2x off exposed it — if the frequency does not fall as the climber
  rises, the block is wrong).
- **Retunes happen on descent too.** The cavity state tracks altitude both ways:
  crossing the 50 km floor downward re-locks n = 1 and pays the transient again. The
  beat card fires once (the fired set), the physics every time. The smoke check engages
  at 49.5 km BEFORE crossing for exactly this reason (teleporting down onto a mode
  boundary is itself a retune).
- **The new smoke check (13b) drives the resonance slider through its own DOM event**
  and asserts the whole chain live: engage, the cavity-locked carrier label, one reset
  at the 50 km crossing with the transient counting down, the retune card queued,
  switching collapsed to watts, the renderer's carrier still 92 Hz, and disengage
  restoring the label. The availability card (off-mode, 45 km) fires inside check 12's
  existing 69.5 km teleport and is asserted from there.
- **The stills did not move, verified by re-shooting them.** The renderer is untouched
  (renderVine keeps the carrier; the crest overlay reads the boosted slip only when the
  mode is on, and no committed shot uses the mode). hero.png / climb.png re-shot to
  compositionally identical frames (256.3 m / 360.0 m, centres exact) and the committed
  PNGs were restored rather than churned on shader noise. The resonance card's paint
  was A/B-verified on a staged frame (canvas pixels at the card band with and without
  the card). `capture.mjs` seeds the two new beat ids (`resonance`,
  `resonance-retune`).
- **The presets pin resonance to 0** (fired in the cap-affecting group, before
  amplitude), so a resonant setting can never leak through a preset click — the same
  pattern as taper's pin to 1. Every preset object carries `resonance: 0`; a preset
  that omits it would leave the toggle where the player left it.
- **Em dashes in new prose: none.** The six new player-facing strings (slider hint,
  two beat cards, labels) were written clean; the backlog sweep stays its own task
  (priority 2 below).

## What the shift before changed, so you do not undo it

- **M4 wave drag (paper p.7) is live, and it unlocks the 2-12 km beat.** Three new pure
  helpers (`densityColumnKgM2`, `waveDragSpeedFactorAt`, `waveDragColumnPowerW`; count
  50 -> 53), no new slider. The model: per unit length the longitudinally oscillating
  foil presents its two edges (2t) and dissipates ½·ρ·Cd·2t·V³ with the paper's
  longitudinal Cd = 0.02 (`TETHER.DRAG_CD_LONGITUDINAL`; the paper labels it a guess,
  and the Unsolved panel says so to the player). With P = ρ·c·A·V² the damping
  integrates in closed form: V(y) = V₀/(1 + V₀·κ·Σ(y)), with Σ the air column below y
  integrated exactly over the SAME US Standard Atmosphere table (log-linear segments,
  capped at 100 km). Thickness cancels out of κ (drag ∝ t, carried power ∝ t), so the
  damping FRACTION reads the film width while the drag POWER scales with t.
  `calculateContinuousCoupling` (sine and harmonic paths) and `slipU()` both read the
  damped local film, so thrust and readout cannot disagree. The stress cap and stroke
  budget are untouched: drag slightly RELIEVES wave stress aloft, and the cap stays
  the undamped one, which is conservative.
- **AIR_DRAG is deleted; the default trace MOVED, deliberately, and the snapshot was
  regenerated.** The old linear retention's own comment marked the spot.
  `applyGravityAndDrag` is gravity-only now: drag acts on the wave, and the climber
  feels the air only as a slower film. The arcade cap held the low climb to 590 km/h at
  the first minute; without it the climber runs 993 km/h there, and the damped cruise
  sits at 1085 km/h (was 1132), riding u ≈ 0.54 of the damped film (2025 km/h at the
  top, was 2081). doneAt 380.4 -> 350.7 s, mean 947 -> 1027 km/h: inside the M2.11
  bands (240-480 s, 900-1300 km/h), which is the plan's license for regenerating. The
  snapshot diff is exactly the physics story plus two new config fields
  (`widthMm`/`thicknessMm` record the drag geometry). The 150 Hz rhythm fixture passes
  unmodified.
- **The balance harness verified the law before it shipped.** The new test flies the
  default 45 mm film against a 10x narrower one (κ ∝ 1/width): the narrow film cruises
  strictly slower aloft, its 5 km crossing barely moves while its trip gap grows (the
  tax grows with the column below you; the paper's Act I story), and both terminal
  speeds sit strictly below their DAMPED film peaks. The u -> 1 asymptote now reads
  the damped film; still no clamp anywhere.
- **The drag table's longitudinal row is a regression fixture next to slide 6's.**
  `waveDragColumnPowerW(1000/3.6, 45, 0.2)` = 0.87 MW, the 0.9 MW at 1000 km/h, with
  the first-order ½·Cd·2t·V³·Σ form pinned against the exact loss to 2%. The 2 km beat
  quotes it plus the player's live bill (7.6 MW at the default 2081 km/h anchor
  speed); the 12 km reveal now quotes the live longitudinal figure against the
  transverse caption (45 km/h, 20 kW).
- **The stills did not move, verified by re-shooting them.** At the shot altitudes
  (220-525 m) the drag factor is 0.9995+, the drawn wave is deliberately not
  drag-scaled (a 1-3% damping is sub-pixel), and the crest overlay's scroll shift is
  under 0.1% on a staged frame. Both stills came out compositionally identical
  (256.3 m / 360.0 m, centres exact), so the committed PNGs were restored rather than
  churned on shader noise. `capture.mjs` seeds the new `wave-drag` beat id, and smoke
  check 12 now also pins the wave-drag beat firing on the 0 -> 11.5 km teleport (its
  card queues behind the taper card).
- **The AIR_DRAG tests were rewritten, not deleted.** The B.14/B.15 blocks now pin
  gravity-only integration at every altitude (no retention anywhere, no dragMult
  channel), and the frame-rate test exercises `frameDecay` on a literal base.
- **The committed pictures are current again, and there is a moving picture.**
  `dev/tools/capture.mjs` (new; zero committed dependencies, resolves playwright-core and
  Chromium at runtime and skips cleanly exactly like the smoke test; NOT part of the
  gate) produced all three captures now in the repo: `screenshots/hero.png` (hot air
  balloon, climber at 256 m), `screenshots/climb.png` (bald eagle, climber at 360 m),
  both clean HUD and both showing the film band and the open clamps, and
  `screenshots/climb.mp4`, 7.5 s of a real climb at the default settings (engage off the
  grass at 100 m, one coast with the arms-out pose, catch again, end at the cloud base
  near 525 m), 640x400 h264, about 220 KB. `hero.png` stays a still PNG because `deploy.yml`
  copies it to `_site/social.png`. The clip is not in the published payload: `_site` is
  only `index.html`, `assets/` and `social.png`.
- **Clip HUD decision: minimal. The stills stay clean.** Reason, recorded as asked: the
  stills and the social card must read at thumbnail size with no text at all, so they
  boot `?clean`. The clip's job is different: it shows what playing IS, and the minimal
  level is the default screen a player lands on, badge, EPM bar, compact plate and the
  shift-12 pace line included. A clean clip would hide the very loop the README is
  pitching (hold, watch the bar, watch the pace). Everything on the minimal plate is
  static text or a bar, so no flash budget is spent and reduced motion is honoured by
  construction; the `<video>` tag carries `controls`, so the loop is one a viewer CAN
  stop.
- **The clip is h264 mp4, not a GIF, and that was measured, not guessed.** A 640x400
  15 fps GIF of the real frames is 8.8 MB (the full-screen noise texture dithers
  differently every frame); animated WebP lands at 0.5-1.3 MB; the mp4 lands near 220 KB at
  30 fps and sharper than both. The README embeds it with `<video>` at an absolute
  `raw.githubusercontent.com/.../main/...` URL: GitHub rewrites relative `img` src but
  NOT relative `video` src, so a relative path 404s on the repo page. ffmpeg is the
  encoder; capture.mjs keeps the PNG frames and prints the exact command when ffmpeg is
  absent.
- **New capture traps, all folded into capture.mjs and the recipe section below.** Drive
  the loop by hand off a synthetic clock (never trust wall time between screenshots);
  a dt of 0 re-renders without moving anything; the mid-screen hero label and the
  altimeter pill draw even at HUD off, so seed `currentLandmarkName`/`currentLandmarkAlt`
  and hide the pill; seed `landmarksPassed`/`milestonesPassed` or the first stepped frame
  fires a shake plus a 16-particle burst into the shot; keep `_couplingParticleTimer`
  high or a dt-0 frame spawns one coupling burst; the cloud deck's lower edge reaches the
  climber around 550-600 m, so a low clip must end before it.
- **The smoke flake showed once more.** One gate run out of three this shift failed one
  of the FIRST THREE checks (boot overlay, air gap default, or air gap slider max; the
  FAIL line was cut by `tail` before it was read) right after the capture encodes had the
  machine busy. Two standalone re-runs passed 26/26. The advice below stands: tee the log
  when chasing a one-off.
- **The post-push review pass caught three small things, all fixed in the same tree.**
  The README `<video>` claimed `width="1280"` on a 640x400 clip (now 640: no upscale
  blur); the docs now say "about 220 KB" because re-encodes wander 218-222 KB with the
  carrier's phase at clip start (a real effect: 92 Hz is not a multiple of the 30 fps
  step, so the slip impulse accumulates slightly differently per run and the clip ends
  within about 525-530 m); and `dev/tests/smoke/README.md` still pointed at the pre-dev/
  paths (`tests/smoke`) and the long-gone grip-slider check, both now corrected.
  Verified after the fact: the raw.githubusercontent URL really does play the mp4
  (octet-stream + nosniff is fine for media elements; tested in headless Chromium), the
  push deploy succeeded, and the live `social.png` was the new hero (same 585257-byte
  file over HTTP). Note the stills are not byte-stable across capture runs: the sky
  shader and film highlight run off the sim clock, so re-running capture.mjs shifts a
  few pixels while the composition (altitudes, targets) stays exact.

- **The score is on the default screen now.** `minimalScoreLine` (pure helper, the
  four-edit ritual, count 47 -> 48) gives the minimal compact plate a THIRD line, gated
  to `_uxHudLevel === HUD_MINIMAL`: the goal before liftoff, the live pace projection
  while climbing (the same `throughputKgPerHour(cargoKg x altitude fraction, climb
  time)` the mission block computes, so the levels cannot quote different figures), and
  the locked figure plus persisted best after delivery. The plate grows 38 -> 52 px
  only at minimal, so the full-compact layout is pixel-identical to before, the full
  level keeps its own mission block top-left, and HUD off draws nothing. Static text:
  no flash budget spent, reduced motion satisfied by construction, and the words
  pace/delivered carry the state so colour never has to (the hue mirrors the mission
  block's). Smoke check 20 now pins all three states at minimal plus the line's absence
  at full; it also restores the ground state it borrows, so keep that teardown if you
  touch it. `.v3` keys, `throughputKgPerHour`, `cargoDeliveryCredit` and the balance
  harness are all untouched: this was presentation only. Verified with real captures at
  390 px (fresh boot, pace, delivered, full, clean) before believing it reads.
- **Pre-climb exists only on the ground.** `_climbStartS` auto-fires the moment
  altitude exceeds 0.5 m (the run clock doing its job), so any placed capture or smoke
  state above ground is the pace state, never the goal state. The goal line
  ("score: kg/h to Kármán · cargo N kg") is pinned by check 20's fresh-reload capture
  and by a real 390 px boot shot. The pace branch also needs a POSITIVE elapsed, not
  just a started clock: on the liftoff frame the climb clock is 0 s old and a projection
  over zero time is 0 kg/h, which would print a score of zero as though it were one.
- **`dev/docs/DEVELOPERS.md` and `dev/docs/CHANGELOG.md` were several shifts stale** and
  were refreshed this shift: the gate numbers (119 unit tests, 48 pure helpers, 26 smoke
  checks, 353 KB), the pure-helper ritual (four edits, and the arrow-inside-a-helper
  trap), the HUD levels and the bottom compact plate's band, where the score is
  displayed, and per-meaning key versioning (the score keys are `.v3`, not `.v2`).
  Neither doc had recorded touch play, the instrument levels, the film band or the crest
  overlay; the changelog now carries all four. Keep them current in the same commit as
  the change, or the next shift inherits numbers it cannot trust.
- **The smoke suite has timing-sensitive checks.** One standalone run out of six this
  shift exited 1 and could not be reproduced in five re-runs; its log had been discarded,
  so the culprit is unknown. Run it as `node dev/tests/smoke/smoke.mjs | tee /tmp/smoke.log`
  when you are chasing a one-off, and suspect the timing-dependent checks first (brownout
  recovery, the RAF ratio, the crest thresholds) before assuming a real regression.

- **Slip is drawn, not numbered.** `renderVine` now overlays the crest train as chevrons
  straddling the film in a band (`CREST_BAND_HALF_PX` = 288 px) centred on the climber,
  scrolling UP past it at `CREST_MAX_SCROLL_PX_S` × `slipGateFactor(u)`. Open slip
  streams; u → 1 parks the ladder beside the climber and shrinks it to faint stubs;
  u ≥ 1 is exactly zero push and zero scroll (absence, not a clamp). The push curve is
  the new pure helper `slipGateFactor`: `slipThrustMeanN` normalised at u = 0, shape-aware
  for harmonic carriers, so the drawn push IS the modelled push (u = 0.17 → 0.75, cruise
  u = 0.5 → 0.34). Scroll speed, chevron span and brightness all carry the signal, never
  colour alone; the pass rate caps at 2.5 Hz (`CREST_PASS_MAX_HZ`, under the 3 Hz
  ceiling); reduced motion freezes the scroll, parks the ladder half a spacing off centre
  and keeps the static span/brightness channel. Hidden at HUD off: it is an instrument
  overlay, not the vehicle, and ?clean captures must stay clean. The numeric `slip u` line
  stays at full HUD as the precise readout. `tetherPhaseAt`, the slip integral,
  `updateContinuous` and the balance harness are untouched; the full-HUD stack plate
  admits the slowdown with a "crest pass slowed ×N" line next to the firing sweep's own.
- **The crest GEOMETRY is load-bearing, so do not shrink it.** The first pass drew 2 px
  chevrons only 26 px wide and captures proved it said nothing: they vanished into the
  film's own strain rungs and behind the climber sprite, at cruise especially. The span
  now runs `CREST_HALF_MIN_PX` 26 px (parked, barely clear of the sprite) to
  `CREST_HALF_MAX_PX` 74 px (open slip, past the FG40 rails at 58 px but short of the
  stack legend plate at railDX + 18 = 76 px), spacing is 96 px, and every stroke carries
  a dark under-stroke so it reads on bright sky and on the green film alike. Shoot the
  frame before believing a render change: `dev/tools/check.sh` cannot see "invisible".
- **`_crestScrollPx` accumulates unbounded on purpose.** The draw takes it modulo the
  spacing; the smoke check reads the difference between two samples to prove the stream
  advances, so wrapping the counter would make that read go negative.
- **A staged `index.html` can outlive its source.** This shift started with a leftover
  crest implementation sitting in the git index: staged, never in
  `Space_Monkey_Elevator.html`, worktree reverted. Regenerating with `embed_assets.py`
  and re-staging overwrote it cleanly. Never commit an `index.html` that did not come
  from the build.
- **The helper guard regex also sweeps const arrows INSIDE a helper.** `slipGateFactor`'s
  first draft had an inner `const at = (v) => ...`; `declaredPureHelpers()` matched it
  and the count assertion failed. Write straight calls inside helpers, or expect the
  loud failure (the count went 46 → 47 with `slipGateFactor`).

### From the shift before (M4 taper, paper p.9)

- **Taper is live: one Film-group slider (anchor:top section ratio R = 1-10, step 0.5,
  default 1.0 = the uniform film).** The film's peak velocity is the LOCAL one at the
  climber's altitude (amplitude adjusts as 1/√A with height, constant transported
  power), the stress cap binds at the thin top (the anchor's stroke budget tightens by
  1/√R), and the 0-2 km beat fires at the 1 km crossing with live numbers. Taper is in
  the ribbon WIDTH; thickness (what the coupling k reads) stays uniform, and tether
  MASS (the paper's stated cost) is marked not-modelled in the hint. The helpers
  return exactly 1 at R = 1, which is why its default trace stayed byte-identical.
- **R = 4 (the paper's own example ratio) starves the demo stack, pinned as physics,
  not a bug.** At the anchor the film runs at v_max/2, and the skim F·v there can never
  cover the flat switching draw: the break-even is per pair, so MORE PAIRS DO NOT HELP
  (302 brownout cycles at 16 pairs too); a lower carrier or a bigger buffer would. The
  boundary probed sits between 2.5 and 3. Do not "fix" this by inventing a
  low-altitude boost; it is the taper's real teeth.
- **Taper's smoke traps, still load-bearing.** Check 12 asserts on `[card, ...queue]`
  titles because the 0 -> 11.5 km teleport crosses 1 km (taper), then 2 km (wave
  drag), then 12 km (transverse). Check 10c drives the taper slider live and restores
  taper AND amplitude through their own slider events: the clamp never auto-raises, so
  only the slider path puts 1.00 m back; restore amplitude explicitly or every later
  check runs on a clamped stroke. Presets pin taper to 1 (fired in the cap-affecting
  group, before amplitude), so a tapered setting can never leak through a preset click.
- **The taper is mostly a NUMBERS story on screen.** The band's half-width tracks the
  local section under the same 13 px jaw cap, so at R = 4 it sits at the cap nearly
  the whole climb; the story reads through the section/stress/stroke-cap readouts (the
  §0 summarised-and-labelled treatment), and a taper-4 frame at 300 m verified the
  band keeps daylight to the 16 px jaws.

### From earlier shifts (non-contact visuals: film band, open clamps, stack-as-vehicle copy)

- **The film is a band, not a line.** `renderVine` now draws the ribbon as foil seen
  slightly oblique: a shaded fill (one edge dark, a specular stripe off-centre), two glowing
  edge lines, and a highlight that drifts up it on a 2.2 s period
  (`FILM_HIGHLIGHT_PERIOD_S`), frozen under reduced motion. A 2 px line made everything near
  it read as contact; the band is what makes the air gap drawable. No phase, amplitude or
  slip maths changed.
- **The band tracks the film-width slider, and saturates on purpose.** `filmBandHalfPx` is
  a pure helper: `SEGMENT_WIDTH` px each side at the 45 mm default, scaling linearly, capped
  at `FILM_BAND_MAX_HALF_PX` = `CLAMP_JAW_HALF_PX` - `FILM_BAND_CLEARANCE_PX`. The cap is
  the whole point: the sprite's clamp jaws are at a fixed 16 px, so a band that kept growing
  would touch them and re-assert contact. The width slider's hint says the drawing stops
  widening around 50 mm and that the number is what the physics uses, the same way the stack
  legend says "schematic" above 16 pairs. A unit test walks the entire slider range and a
  smoke check reads the band the live renderer actually drew.
- **Strain-segment thickness now scales with the band, not with `vineWidth`.** Film width
  sets how wide the ribbon is, never how tall a compression band is (that is wavelength).
  At 1000 mm the old `vineWidth`-based stroke reached 300 px, the segments merged into a flat
  stripe, and the foil shading the air gap depends on disappeared.
- **The fists are open clamps.** The grabbing sprite's hands are now "[" and "]" brackets
  whose jaws stop at viewBox x 64 and 96, four units clear of the band edges at 80 ± 12
  (the sprite draws 1 unit = 1 px). Butt line-caps are load-bearing: a round cap overshoots
  the jaw tip by half the stroke width and touches the band. `HANDS_X_SPREAD` moved to 20
  so the EPM glow sits on the clamp mouths. If you ever move those jaws, move
  `CLAMP_JAW_HALF_PX` with them or the band cap goes stale.
- **The settings copy tells the stack story.** "Your hands are electro-permanent magnets"
  fought the 8-pair stack drawn beside the climber; it now reads "Your vehicle is a stack
  of electro-permanent magnets (EPMs)". The stack is the vehicle in the deck; the copy
  moved, not the drawing.

### From earlier shifts (touch, HUD levels, demo scale, climbing pose)

- **Touch is a first-class input.** The game takes exactly one input, so the whole play
  surface is the button: `InputManager.setupPointerHandlers` emits the same `input:grab` the
  SPACE key does. Pointer ids are tracked in a Set so a second finger cannot steal the
  release, `pointercancel` counts as a lift, and focus loss clears them like keys. Chrome
  (`_isChromeTarget`) is excluded so opening settings is not also a pulse. The old "requires
  a keyboard" notice now only appears for a viewport too small to place the HUD at all
  (`viewportTooSmall`).
- **The HUD has three levels and defaults to the quietest.** `_uxHudLevel` is
  minimal (default) / full / off, cycled by `H`, and `?clean` or `#clean` boots straight to
  off. Minimal draws the badge, the energy bar, the compact plate (one instruction, the
  p.11 carrier line and, since shift 12, the score) and a beat's title;
  full adds the mission and act blocks, the thermal readout, the p.11 dashboard, the stack
  legend and the switching/skim/slip lines. Failures (UNLOADED, STALLED, brownout) are
  never gated: they explain themselves at every level. A smoke check wraps `ctx.fillText`
  for a frame and diffs minimal against full, so this cannot silently regress.
- **Below 1024 px the bottom HUD band merges into one plate** (`compactHudLayout`,
  `renderCompactHud`). That is where the fixed 640 px dashboard and the bottom-left controls
  box stop clearing each other. The settings panel fills a phone screen, scrolls, and has a
  close button, because `S` is a key that is not there.
- **The demo scale is 8 pairs and 3 kg**, not 128 and 50. Thrust-to-weight is unchanged, so
  the pace is unchanged, but the stack is now 16 units and 33 cm, which
  `renderFg40Stack` draws literally (`STACK_MAX_DRAWN_PAIRS` is 16). Gassend's own §2.5
  anchor, ~64 pairs holding 50 kg, is still reproduced by the model and is the top of the
  pairs slider. `EPM.CAPACITY_J` came down to 0.19 MJ with it: switching fell 16x, and at
  3 MJ the ambient trickle alone would have covered the drain and made brownout impossible.
  A test now asserts the trickle can never cover the drain.
- **The climbing sprite reads correctly.** It claimed both hands were up on the film and
  showed a brown lump: there was no headroom above the fists to draw a reach, the arms were
  the same brown as the torso, both fists sat at one x, and the magnet glow was painted on
  the neck 90 px below the hands. The viewBox now carries 80 units of headroom, the pose box
  is proportionally taller so no body part moved, and **the arms paint before the torso**:
  drawn after it they read as a second pair hanging down.

## Priorities for this shift

Last shift's priority 1 is **done**: standing-wave resonance (p.10) shipped with its own
balance-harness verification (the boost flies, exactly one retune at 50 km, the supply
cap pinned as extraction == supply, the pad pinned as the honest teeth), the marked
40-70 km retune beat is live (off-mode availability card at 45 km, on-mode retune card
at the 50 km reset), the default trace did NOT move (the mode is off by default, the
snapshot deliberately not regenerated), and the stills did not move (renderer
untouched; re-shot, confirmed, restored). The taper and wave-drag shifts before it
shipped the same way, and the moving picture and score work survive as is. Do not
reopen any of them.

### 1. M4 physics, next item only

Multi-climber (p.14) is the last deferred M4 physics item, and the p.10 note that
resonance retuning makes multi-climber "tricky" is why it comes after resonance. It
needs its own balance-harness verification before it ships. The spec lives in section 8
of `.kilo/plans/1785893790322-fg40-film-coupling-fidelity-plan.md` (gitignored, local
only; sections 4-9 are the milestone authority). That file's STATUS block lags this
file, but **this file is the committed handoff and wins wherever they disagree**. The
85 km second-climber beat already ships as the paper's open question; the item is the
real power-sharing model, whatever the paper actually supports. Note section 8's
"Touch support" bullet is DONE (shift 9); do not re-implement it.

### 2. Two contained hygiene tasks nobody has claimed

- **The em-dash ban is not enforced in the shipped copy.** Counted this shift: 41 quoted
  strings in the source contain an em dash (HUD lines, toasts, beat cards, panel copy),
  plus 6 `&mdash;` entities in the settings markup. New prose has been clean for several
  shifts, but the backlog still ships to players. The sweep is mechanical and needs a
  capture pass after it, because several of those strings are width-tuned to a plate.
- **`dev/docs/v1.0-roadmap.md` still presents itself as the current plan.** It is pre-M1
  history with superseded physics (it predates slip coupling entirely), and it even
  contains an item asking for exactly this treatment of other files. Mark it historical at
  the top or retire it; a reader who finds it before this file gets the wrong model. The
  fidelity plan's other M3.9 leftovers are closed: the in-panel concept copy shipped in
  shift 10, and the DEVELOPERS/CHANGELOG re-read happened this shift.

## Screenshot recipe, already paid for

The tool is `dev/tools/capture.mjs` (stills, clip, or both; skips cleanly when
playwright-core, a Chromium binary or ffmpeg is absent). Its header comment carries the
whole recipe; this section is the short version. `?clean` plus these, and do not
rediscover the traps:

- Headless Chromium renders **no WebGL sky** unless you launch with
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- `playwright-core` in `dev/tests/smoke/node_modules` expects a browser build it does not
  have, so `chromium.launch()` fails with "Executable doesn't exist". Pass `executablePath`
  from `~/Library/Caches/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell`,
  exactly as `smoke.mjs`'s own `discoverChromium()` does (capture.mjs's copy also matches
  `chrome-headless-shell` by name and prefers it). Do not run `npx playwright install`
  to fix it.
- `paused = true` draws a **wash-out veil**. Never pause for a shot.
- **Drive the loop by hand.** Cancel the RAF chain once, then call `update(t)` off a
  synthetic clock and cancel the chain it re-arms after every call. Frames then sit
  exactly 1/30 s of SIM time apart no matter how slow each screenshot round-trip is, and
  a dt of 0 re-renders without moving anything (the camera follow is a no-op at dt 0).
  Never read wall-clock time between screenshots: the spacing jitters and the clip
  stutters.
- Landmark sprites have **parallax**, so aligning the climber to a sprite altitude by
  arithmetic does not work. Read the sprite's `getBoundingClientRect` and walk the altitude
  until it sits where you want, with a window scaled to the landmark's own altitude.
- The loop keeps climbing while you wait, so **re-place the climber immediately before the
  shot**. A 700 ms settle carries the sprite back off the frame.
- Teleporting fires beat cards, the act banner and suit toasts, and leaves the run clock at a
  couple of seconds, which makes the HUD print absurd numbers. Seed `_beatsFired`,
  `_descendersFired`, `_actBreakFired`, `_runTimeS` and `_climbStartS` first. Seed
  `landmarksPassed` and `milestonesPassed` too, or the first stepped frame fires a camera
  shake plus a 16-particle burst into the shot, and keep `_couplingParticleTimer` high or
  a dt-0 frame spawns one coupling burst.
- **The altimeter pill and the mid-screen hero label draw even at HUD off** (renderEffects
  is world, not instrument). Seed `currentLandmarkName` with the altimeter name at the
  shot altitude plus `currentLandmarkAlt = 0`, and remove the pill's `visible` class, or a
  stale "Sea Level - 0 m" pill and a half-faded "Treetops" ride the capture.
- **Low altitude is the friendly picture.** Below 8 km the climber wears no suit, so it is
  the plain monkey against blue sky. The hero is the hot air balloon (sprite at 220 m,
  climber placed at 256 m) and the second shot is the bald eagle (355 m, climber at
  360 m). Everest is white on white; the instrument-heavy frames at 20 km are what made
  the old captures look like homework. For a clip, stay under the cloud deck: its lower
  edge reaches the climber around 550-600 m.
- **The clip format was measured.** A 640x400 15 fps GIF of the real frames is 8.8 MB
  (the full-screen noise texture dithers differently every frame), animated WebP is
  0.5-1.3 MB, and h264 mp4 lands near 220 KB at 30 fps and sharper than both. ffmpeg encodes it;
  without ffmpeg the frames are kept and the exact command is printed.

## Rules that will bite you if you ignore them

- **Edit `Space_Monkey_Elevator.html` only**, then run `python3 embed_assets.py`, then
  commit **both** files. Run the build **before** the smoke test or you are testing a stale
  artifact.
- `dev/tools/check.sh` failing at step 2 with "index.html was out of sync" means *stage the
  regenerated file*. It is not a regression.
- **Never commit the source paper.** `*.pdf` is gitignored because it happened once and cost
  a history rewrite. Never `git add -A` blind.
- **`v_max` is an asymptote.** There is no speed clamp anywhere and tests pin that. Do not
  add one.
- **The balance harness mirrors `updateContinuous` call for call.** Change the game loop and
  you must change the harness, or the trace silently lies. Its snapshot is advisory: explain
  a move or revert it, and only regenerate deliberately with `BALANCE_SNAPSHOT_UPDATE=1`.
- **Fixtures scale with the defaults.** The harness's 150 Hz rhythm fixture had to come down
  from 256 pairs to 16 when the default stack shrank, or it browns out instantly and never
  leaves the ground. If you re-scale anything, re-check the fixtures.
- **Adding a pure helper is four edits** (helper, `EXPORTED_SYMBOLS`, destructure plus sanity
  object, count assertion, currently 57). **Adding or changing a slider is five** (id list,
  `sliders.test.mjs`, `scaleSettingValue`, `UI_CONFIG`, `initGame`'s `sliderDefaults`).
- **Non-slider readouts update in `updateDerivedReadouts()`.** A new slider feeding one must
  call it.
- **Every instrument is drawn on the canvas**, which is why no CSS can hide one. Anything new
  must respect `_uxHudLevel` and claim its own screen band; the bands are otherwise disjoint
  by design.
- `assets/` is count-asserted by `dev/tools/check_refs.py`. A stray file there fails CI.
- Presets must apply through the sliders' own DOM events, never a parallel write path, or the
  panel will show pre-preset numbers.
- Nothing may flash faster than 3 Hz, everything must freeze under `prefers-reduced-motion`,
  and colour must never be the only signal.
- **No em dashes in player-facing or repo-facing prose.** The owner has asked three times.
- Never invent physics to fill a gap. Say it is absent instead. That discipline is the whole
  reason this project is worth showing to the deck's author.

## Credit, which is not negotiable

The concept is Blaise Gassend's (*Powering Climbers Using Mechanical Waves*, ISDC 2025). The
README's "The paper" section and `ATTRIBUTIONS.md` carry the full citation, his own link
ahead of the ISEC mirror, and the statement that he has not endorsed this and that any
errors in the derivation are ours. Prior work by Mark Wessels and Keith Lofstrom, and the
Zubax FluxGrip FG40 hardware, are credited the same way. Shorten the marketing copy as much
as you like; do not shorten that.
