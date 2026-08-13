# Next shift

Read this first. It is the current state, the next tasks in priority order, and the traps
that have already cost time. Updated at the end of the shift that shipped M4 taper
(paper p.9: the film's section varies with altitude, amplitude adjusting as 1/√A).

## Where things stand

- **Live**: <https://atominnovationth.github.io/SMX/>, deployed from `main` by
  `.github/workflows/deploy.yml` on every push. The published site is only `index.html`,
  `assets/` and `social.png`.
- **Gate**: `bash dev/tools/check.sh` (add `SKIP_SMOKE=1` to skip the browser half).
  Currently 122 unit tests, 27 smoke checks, 98 = 98 asset references, all green.
- **Payload**: `index.html` is 364 KB. Only assets under 20 KB are inlined; the clouds,
  ground and noise stream from `assets/`.
- **Physics**: M1, M2, M3.1-M3.8 and M4's first item (taper, p.9) are complete. The
  deferred list is drag on the wave itself (p.7), standing-wave resonance (p.10),
  powering more than one climber (p.14), mode conversion (p.12) and the hot side of
  thermal. All are marked absent in-game rather than approximated. Do not fake them.
- **Default climb**: unchanged by taper (the default ratio 1.0 is the uniform film and
  the taper helpers return exactly 1): 100 km in 380.4 s, mean 947 km/h, cruise
  1132 km/h = 0.50 v_max, no brownouts, 28 kg/h of throughput with 3 kg of cargo.

## What last shift changed, so you do not undo it

- **M4 taper (paper p.9) is live, and it unlocks the 0-2 km beat.** One new slider
  (`taper`, Film group, anchor:top section ratio R = 1-10, step 0.5, default 1.0 = the
  uniform film), two new pure helpers (`taperSectionRatioAt`,
  `taperVelocityFactorAt`, count 48 -> 50), and the physics reads them: the film's peak
  velocity is the LOCAL one at the climber's altitude (amplitude adjusts as 1/√A with
  height, constant transported power), the slip integral and `slipU()` ride the local
  film, and the stress cap binds at the thin top, so the anchor's stroke cap tightens by
  1/√R (`strokeCapM` divides v_max by √R). The 0-2 km beat ("the anchor is the brutal
  part", or "your taper is trading start for anchor" when tapered) fires at the 1 km
  crossing with live numbers. The taper is in the ribbon WIDTH: thickness (what the
  coupling k reads) stays uniform; tether MASS is the paper's stated cost and is marked
  not-modelled in the slider hint, not invented.
- **The balance harness verified taper before it shipped, and the default trace did not
  move.** `calculateContinuousCoupling` takes `taperRatio` (the harness mirrors it
  call-for-call, including the boot clamp `v_max/(ω·√R)`). The new harness test flies
  R = 2: slower 5 km crossing than uniform, longer trip, tighter anchor cap (0.765 m =
  1.082/√2), and the SAME cruise slip at the top (u ≈ 0.54) with a higher terminal speed
  (the tapered wave reaches v_max aloft where the 1.00 m default stroke sits under its
  1.08 m cap; the paper's "more efficient use of tether"). The snapshot was regenerated
  deliberately: the diff is EXACTLY two added `taperRatio: 1` record lines; every trace
  row is byte-identical, because the helpers return exactly 1 at R = 1.
- **R = 4 (the paper's own example ratio) starves the demo stack, and the harness pins
  it as physics, not a bug.** At the anchor the film runs at v_max/2, and the skim F·v
  there can never cover the flat switching draw: the break-even is per pair, so MORE
  PAIRS DO NOT HELP (302 brownout cycles at 16 pairs too); a lower carrier or a bigger
  buffer would. The R=4 run never leaves the low atmosphere. The slider hint says so.
  Do not "fix" this by inventing a low-altitude boost; it is the taper's real teeth.
- **The drawing follows the taper, inside the same non-contact cap.** The band's
  half-width now tracks the LOCAL section (`filmBandHalfPx(vineWidth x sectionRatio)`),
  the fill and edge lines are paths, and the drawn wave displacement follows
  `taperVelocityFactorAt`. The jaw cap (FILM_BAND_MAX_HALF_PX = 13) applies at every
  altitude, so at R = 4 the band sits at 13 px for nearly the whole climb and only
  narrows to 12 in the last ~3 km: the taper is mostly a NUMBERS story (section readout
  "36.0 mm² at the anchor", stress readout "at the taper's thin top · ... at the
  anchor", stroke cap), which is the §0 summarised-and-labelled treatment. Verified by
  captures: the default stills are compositionally unchanged (taper 1 is a render
  no-op, so the committed PNGs were NOT re-shot), and a taper-4 frame at 300 m shows
  the 13 px band keeping daylight to the 16 px jaws. capture.mjs seeds the new beat id.
- **Smoke check 12's assertion moved to card+queue titles.** The 0 → 11.5 km teleport
  now crosses 1 km first, so the taper beat owns the active card and the transverse
  card queues; the check asserts on `[card, ...queue]` (the pattern check 13 already
  used) and also pins that the taper beat fired. New check 10c drives the taper slider
  live: cap 0.54 m, amplitude label "(capped)", band 13 px at the ground, and restores
  taper AND amplitude through their own slider events (the clamp never auto-raises, so
  only the slider path puts 1.00 m back; restore amplitude explicitly or every later
  check runs on a clamped stroke).
- **Presets pin taper to 1** (fired in the cap-affecting group, before amplitude), so a
  tapered setting can never leak through a preset click. The 20 km thinning beat now
  quotes the LOCAL v_max (`v_max/√(section ratio at 20 km)`), which at taper 1 is the
  same number as before.
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

Last shift's priority 1, the M4 opener, is **done**: taper (p.9) shipped with its own
balance-harness verification (R = 2 flies the trade; R = 4 starves the demo stack, pinned
as physics), the 0-2 km anchor-speed beat is live, the default trace did not move, and
the stills did not move (taper 1 is a render no-op). The shift before shipped the moving
picture, and the score work before that survives as is. Do not reopen any of them.

### 1. M4 physics, next item only

Wave drag (p.7), then resonance (p.10), then multi-climber (p.14), in the order the deck
presents them. Each needs its own balance-harness verification before it ships. The specs
live in section 8 of
`.kilo/plans/1785893790322-fg40-film-coupling-fidelity-plan.md` (gitignored, local only;
sections 4-9 are the milestone authority). That file's STATUS block lags this file, but
**this file is the committed handoff and wins wherever they disagree**. Wave drag unlocks
the 2-12 km beat and makes the transverse-vs-longitudinal contrast quantitative rather
than a caption; note AIR_DRAG's comment already marks the spot ("M4 replaces this linear
form with the paper's wave drag").

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
  object, count assertion, currently 50). **Adding or changing a slider is five** (id list,
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
