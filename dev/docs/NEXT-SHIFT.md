# Next shift

Read this first. It is the current state, the next tasks in priority order, and the traps
that have already cost time. Updated at the end of the shift that surfaced the score at
the minimal HUD (minimalScoreLine, the compact plate's third line, smoke check 20
extension).

## Where things stand

- **Live**: <https://atominnovationth.github.io/SMX/>, deployed from `main` by
  `.github/workflows/deploy.yml` on every push. The published site is only `index.html`,
  `assets/` and `social.png`.
- **Gate**: `bash dev/tools/check.sh` (add `SKIP_SMOKE=1` to skip the browser half).
  Currently 119 unit tests, 26 smoke checks, 98 = 98 asset references, all green.
- **Payload**: `index.html` is 353 KB. Only assets under 20 KB are inlined; the clouds,
  ground and noise stream from `assets/`.
- **Physics**: M1, M2 and M3.1-M3.8 are complete. The deferred list is taper (p.9), drag on
  the wave itself (p.7), standing-wave resonance (p.10), powering more than one climber
  (p.14), mode conversion (p.12) and the hot side of thermal. All are marked absent in-game
  rather than approximated. Do not fake them.
- **Default climb**: 100 km in 380.4 s, mean 947 km/h, cruise 1132 km/h = 0.50 v_max, no
  brownouts, 28 kg/h of throughput with 3 kg of cargo.

## What last shift changed, so you do not undo it

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
  and by a real 390 px boot shot.

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

### From the shift before (non-contact visuals: film band, open clamps, stack-as-vehicle copy)

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

### From two shifts back (touch, HUD levels, demo scale, climbing pose)

- **Touch is a first-class input.** The game takes exactly one input, so the whole play
  surface is the button: `InputManager.setupPointerHandlers` emits the same `input:grab` the
  SPACE key does. Pointer ids are tracked in a Set so a second finger cannot steal the
  release, `pointercancel` counts as a lift, and focus loss clears them like keys. Chrome
  (`_isChromeTarget`) is excluded so opening settings is not also a pulse. The old "requires
  a keyboard" notice now only appears for a viewport too small to place the HUD at all
  (`viewportTooSmall`).
- **The HUD has three levels and defaults to the quietest.** `_uxHudLevel` is
  minimal (default) / full / off, cycled by `H`, and `?clean` or `#clean` boots straight to
  off. Minimal draws the badge, the energy bar, one instruction line and a beat's title;
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

### 1. Decide whether the score survives: DECIDED, shipped this shift

The score stays throughput (kg to the Kármán line per hour), surfaced at the minimal
level, and the `.v3` keys were not re-based. One short line in the existing compact
plate: the live pace projection while climbing, the locked figure plus best after
delivery, the goal on the ground before liftoff. Full keeps the block it has. What was
built and the traps are in "What last shift changed" above.

### 2. A moving picture

An animated GIF or a short clip of a real climb would beat any still. Nothing in the repo
does video capture yet. `screenshots/hero.png` is also the social card (`deploy.yml` copies
it to `_site/social.png`), so whatever becomes the hero must read at thumbnail size.

### 3. M4 physics, when the presentation work is done

Taper, wave drag, resonance and multi-climber, in the order the deck presents them. Each
needs its own balance-harness verification before it ships.

## Screenshot recipe, already paid for

`?clean` plus these, and do not rediscover the traps:

- Headless Chromium renders **no WebGL sky** unless you launch with
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- `playwright-core` in `dev/tests/smoke/node_modules` expects a browser build it does not
  have, so `chromium.launch()` fails with "Executable doesn't exist". Pass `executablePath`
  from `~/Library/Caches/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell`,
  exactly as `smoke.mjs`'s own `discoverChromium()` does. Do not run `npx playwright install`
  to fix it.
- `paused = true` draws a **wash-out veil**. Never pause for a shot.
- Landmark sprites have **parallax**, so aligning the climber to a sprite altitude by
  arithmetic does not work. Read the sprite's `getBoundingClientRect` and walk the altitude
  until it sits where you want, with a window scaled to the landmark's own altitude.
- The loop keeps climbing while you wait, so **re-place the climber immediately before the
  shot**. A 700 ms settle carries the sprite back off the frame.
- Teleporting fires beat cards, the act banner and suit toasts, and leaves the run clock at a
  couple of seconds, which makes the HUD print absurd numbers. Seed `_beatsFired`,
  `_descendersFired`, `_actBreakFired`, `_runTimeS` and `_climbStartS` first.
- **Low altitude is the friendly picture.** Below 8 km the climber wears no suit, so it is
  the plain monkey against blue sky. The current hero is the hot air balloon at 230 m and the
  second shot is the bald eagle at 340 m. Everest is white on white; the instrument-heavy
  frames at 20 km are what made the old captures look like homework.

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
  object, count assertion, currently 48). **Adding or changing a slider is five** (id list,
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
