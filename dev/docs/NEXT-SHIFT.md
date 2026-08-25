# Next shift

Read this first. It is the current state, the next tasks in priority order, and the
traps that have already cost time. The per-shift narrative record lives in
[`shift-log.md`](shift-log.md) (moved there in the August 2026 tidy; newest first).

## Where things stand

- **Live**: <https://atominnovationth.github.io/SMX/>, deployed from `main` by
  `.github/workflows/deploy.yml` on every push. The published site is only `index.html`,
  `assets/` and `social.png`.
- **Gate**: `bash dev/tools/check.sh` (add `SKIP_SMOKE=1` to skip the browser half).
  Currently 146 unit tests, 38 smoke checks, 98 = 98 asset references, all green.
- **Payload**: `index.html` is 435 KB. Only assets under 20 KB are inlined; the clouds,
  ground and noise stream from `assets/`.
- **Physics**: M1, M2, M3.1-M3.8 and ALL of M4 are complete: taper (p.9), wave drag (p.7),
  standing-wave resonance (p.10), multi-climber power sharing (p.14), mode conversion
  (p.12/13) and the hot side of thermal (p.7's drag-heating note + the FG40 ceiling).
  The paper's deferred simulation list is EMPTY. What remains unsimulated is the paper's
  own unsolved problems, all marked in-game rather than faked: the wave-boundary solve
  between riders (partial reflections p.3, the retune interplay p.10), the
  mode-conversion mechanism (p.12 offers a table and a question, no converter), and any
  temperature (no heat capacity, transfer coefficient or emissivity is published
  anywhere).
- **Default climb**: MOVED by the 2026-08-22 integrity shift (deliberately, explained
  in the snapshot diff and DESIGN.md: the invented cold-coupling penalty is deleted,
  so the low climb runs 5 s faster; cruise never moved because the penalty never
  reached vacuum). Unchanged by everything before it, most recently the phone-forms
  fix (render-only short forms at the
  full level; `updateContinuous` byte-identical), the bootstrap-progress shift
  (presentation-only: one
  guarded clause on the existing delivered line), the bootstrap-pacing shift
  (presentation-only strings on the existing score lines), the resonance-texture
  shift (render-only, resonance off by default), the thermal shift, its review pass,
  the mode-conversion shift, the sharing shift (toggle defaults to refuse) and the
  resonance shift before that. The new trace: 100 km in 345.5 s, mean 1042 km/h,
  cruise 1085 km/h = 0.48 v_max (unchanged), no brownouts, 31 kg/h of throughput with
  3 kg of cargo.

## Priorities for this shift

The most recent completed work is the **integrity shift** (2026-08-22): the
invented cold-coupling penalty deleted from `updateContinuous` and the scored cargo
frozen at liftoff (`_runCargoKg`), trace moved deliberately and explained. The
narrative is in [`shift-log.md`](shift-log.md); the rules are pinned in
[`DESIGN.md`](DESIGN.md). Nothing from it remains open.

The thermal shift's priority 1 is **done**: the hot side of thermal shipped as the
exact bookkeeping the sources support and nothing more (the section-0 verdict: the
paper's p.7 hook is a maybe with no number, the FG40 datasheet publishes a ceiling but
no thermal resistance, so never invent a temperature). `waveDragHeatingWM` is the p.7
term in W/m with a cross-reading fixture against the column bill, a Ground-station
Stack heat readout books the live watts against the +73 °C ceiling and the falling air,
the 30 km beat says it to the player, and the Unsolved panel names it. No physics, so
the balance harness and the default trace are untouched (snapshot not regenerated) and
the stills did not move (staged 30 km frames verified the card's paint). The taper,
wave-drag, resonance, power-sharing and mode-conversion shifts before it shipped the
same way, and the review-and-docs pass after mode conversion changed no behaviour
either. The paper's deferred simulation list is now EMPTY. Do not reopen any of them.

### 1. (done) The em-dash sweep of the shipped copy

**Done this shift.** No em dash remains in any player-facing string or markup line;
the only em dashes left in the source are in comments (out of scope by design). The
sweep was mechanical (commas, colons, parentheses, full stops; width kept), the
smoke-pinned titles and body fragments were grepped first and kept verbatim, the
gate tripped the expected out-of-sync step on the first run (staged the regenerated
index.html, not a regression) and then passed 140 unit / 29 smoke / 98 = 98 refs,
and the capture pass re-shot and committed
the stills (shader noise only; centres exact) and the clip. The traps recorded for
the sweep stay on record for any future text edit: no test pins an expected string
value containing an em dash (the only em-dash-adjacent guard is `minimalScoreLine`'s
"no em dash" test), and smoke DOES match card titles by `includes()` ('jets',
'change shape', 'nothing cools your magnets', 'zooms past', 'ride down'), four by
exact equality ('another monkey asks to share your wave', 'sharing your wave with
another monkey', 'can the wave change shape? nobody knows', 'up here, nothing
cools your magnets'), plus the body fragments `/no converter/`,
`/no temperature is modelled/`, `/\+73 /` and the share-card budget regexes. Phase 2
added two more pins, moved in lockstep with the anchor retirement: the wave-budget
readout regex `/^\d+ kW · the ground station's injection, P = σ·v \(p\.10\)$/` and
`taperInfo.stress.includes('ground station')`. Check
`dev/tests/smoke/smoke.mjs` for distinctive words before touching any player-facing
string, and keep matched fragments verbatim. New prose stays em-dash-free.

The standing hygiene list is now empty, and with this shift the first post-backlog
candidate is done too. The remaining candidates are the honest next steps seen from
here; none is committed, and each must pass the same section-0 bar before code (name
the paper hook, or stay presentation-only with numbers the game already owns).

### Backlog, any order

- **(done) Wave power budget display (slide 6).** Shipped three shifts ago as the
  Ground-station
  "Wave arriving" readout, computed per frame from `waveSharedBudgetW` itself, with the
  plain / resonant-injection / shared readings all pinned in smoke checks 12/13b/13c.
  See "From earlier shifts (the wave power budget display)" in [`shift-log.md`](shift-log.md).
- **(done) Resonance texture.** Shipped two shifts ago as the crest train's in-place
  breath
  at the cavity rate while resonant (the period the 45 km card quotes, made visible):
  additive-only swell of V-depth and brightness, capped at the scroll's 2.5 Hz ceiling,
  frozen mid-pose under reduced motion, pinned in smoke 13b, A/B-verified on staged
  frames. See "From earlier shifts (the resonance texture)" in [`shift-log.md`](shift-log.md).
- **(done) Bootstrap pacing.** Shipped last shift as the persisted best riding the
  minimal compact plate's goal and pace lines whenever one exists ("· best N kg/h"),
  plus the full mission block's pace branch ("(best N)"): the one pacing reference the
  game owns, section 0 having found the paper publishes no pacing figure at all, so
  there is nothing to cite and nothing to invent. Best 0 prints exactly the shift-12
  lines, so every pinned string survives; pinned in smoke 20 and pure.test, A/B-verified
  on staged 500 m frames. See "From earlier shifts (the bootstrap pacing reference)"
  in [`shift-log.md`](shift-log.md).

### Next steps (candidates, each needs its own section 0)

No physics item can be queued honestly: the paper's deferred simulation list is empty,
and its unsolved problems (the wave-boundary solve between riders, the mode-conversion
mechanism, any temperature) are deliberately marked in-game rather than faked. The
post-backlog candidates are all done now too:

- **(done) Bootstrap progress at minimal (the meter, not the pace).** Shipped last
  shift: the minimal delivered line carries the cumulative meter ("· tether N/600 kg")
  the one moment it moves, guarded by `bootstrapKg > 0` so every pinned string survives
  verbatim (the smoke's written delivered state reads the game's live value, 0, and a
  written-meter capture beside it pins the clause). Section 0 found the 600 kg target
  is the game's own S16 design number, so this is presentation of owned state, not a
  citation. Pinned in smoke 20 and pure.test, A/B-verified on staged 500 m frames. See
  "From earlier shifts (the bootstrap progress meter at minimal)" in
  [`shift-log.md`](shift-log.md).
- **(done) The full mission block on phones.** Shipped this shift as short forms under
  `_compactHud`, the repo's own shift-9 phone pattern rather than a wrap: the goal and
  pace branches read "Mission: N kg to Kármán (100 km)" and "pace N kg/h to Kármán
  (best M)" at compact width, the delivered line fits as-is and stays one string at
  both widths, and desktop lines are byte-identical. Measured on the real font: the
  goal reached 406 px at the stress figures (still past 390 at the 3 kg default), the
  pace+best 386 (the estimate said ~393). Pinned in smoke 20 (a mid-check resize to
  390x844), cross-build A/B-verified on staged frames. See "What last shift changed"
  in [`shift-log.md`](shift-log.md).

What remains is presentation of state the game already owns. The queue below is
ordered by how much a player would notice; each still owes its own section 0 before
code (name the paper hook, or stay presentation-only with numbers the game already
owns). Tooling items are exempt from section 0 by nature but not from the gate.

### Queued candidates (UI/UX and reach)

1. **Shareable run URLs.** Encode the settings snapshot plus the run result into a
   URL (and a copy-link row on the report card) so a configuration that demonstrates
   a paper insight can be sent as a challenge. Presentation-only: reads state the
   game already persists in memory; no physics. Needs a versioned, bounded encoding
   and a `?config=` boot path that routes through the sliders' own DOM events (the
   preset rule: never a parallel write path).
2. **(done) The legible wave.** Shipped this shift, with the temporal axis the
   research added: proportional exaggeration under an 80 px cap plus the monotone
   schematic clock, frozen under reduced motion (which also closed this channel's
   old missing guard). Two pure helpers (63 total), two new smoke checks (32 total),
   disclosed in the stroke hint and the README. Narrative in
   [`shift-log.md`](shift-log.md). The findings below are kept for the record.
   The drawn
   film runs at real scale (`PX_PER_M = 10`), so even the 1 m default stroke is ~10 px
   and the stroke lever barely moves the picture. Two findings from the implementation
   research make this a two-axis change, not just an amplitude multiplier:
   (a) SPATIAL: proportional exaggeration with a hard cap (new pure helper, labelled
   in the stroke hint and the README's simplified-on-purpose list). Verified safe
   geometrically: at capped 80 px over a 2,270 px wavelength the displacement slope
   stays far below the segments' spacing, so stripes never pile up; the straight band
   edges stay straight, which is CORRECT for a longitudinal wave (the silhouette does
   not displace axially).
   (b) TEMPORAL: the displacement channel animates at TRUE carrier frequency today,
   sampled by the display refresh (92 Hz at 60 fps aliases unpredictably), and it is
   the ONE motion channel with no `prefers-reduced-motion` guard (ripple, highlight,
   crest and stack sweep all have one). Invisible at 10 px; a photosafety-violating
   strobe at 80 px. The fix is a schematic CLOCK: shape time advances at a monotone
   map of the carrier into a sub-1.25 Hz band (order-preserving, so 1000 Hz still
   reads faster than 92 Hz), frozen outright under reduced motion. World-anchoring
   survives intact: the shape stays tetherPhaseAt(altitude, tau) with tau dilated;
   crests drift up at c x dilation. The coupling instruments (green film dot, slip
   halo, crest chevron push) stay on REAL phase and u: they are the "what you see is
   what couples" channel and must not inherit the schematic clock.
   Render-only: updateContinuous untouched, balance trace cannot move. Costs two
   pure helpers (count 61 -> 63), one new debug handle beside `_filmBandHalfPx`,
   hint/readme/docs disclosure, and staged-frame A/B at 0.60 vs 1.00 m strokes.
3. **(done) Altitude rail.** Shipped this shift: right-edge sqrt-axis rail under the
   EPM gauge, landmark ticks, ghost-best tick in the BEST line's gold, descender
   chevrons at 30/60 km, the act boundary as a track shade (not a tick: it sits
   1.2 % of the span from Baumgartner), live dot; labelled at full HUD only
   ("sqrt scale", "Kármán · 100 km"), hidden exactly at off so ?clean stays clean.
   One pure helper (`railAltitudeToFrac`, 64 total), one smoke check pinning
   `_railState()` through the H cycle (33 total). Narrative in
   [`shift-log.md`](shift-log.md). The original entry is kept for the record:
   A thin fixed rail (ground to Kármán)
   with landmark ticks, the ghost-best tick and the descender markers gives the run
   its shape and makes "how far to go" glanceable at minimal HUD, where altitude
   awareness currently depends on catching the altimeter pill mid-scroll.
   Canvas-drawn like every instrument, so it must read `_uxHudLevel` itself and claim
   its own screen band.
4. **aria-live mirror of the minimal strings.** Every instrument is canvas-drawn, so
   assistive tech gets one `role="img"` label. Mirror `minimalScoreLine`, the beat
   titles and the failure reasons into an offscreen `aria-live` region fed from the
   same pure helpers, so it can never quote a figure the plate hides. Finishes the
   inclusivity story the README leads with.
5. **(done) First-run rhythm hint.** Shipped this shift as the Shift E pair: the
   low-charge gauge pulse (amber border, 1 Hz, static under reduced motion) warns
   before the first brownout, and the one-time hint plate ("let go before it
   empties · the trickle refills it") rides the gauge on the first low-charge grab,
   retired forever on dismissal or first brownout and persisted per profile. The
   original entry is kept for the record: One line ("hold to catch the wave, let go
   before the bar empties") shown until the first catch-then-coast cycle completes, then never
   again. Copy rules apply (encouragement layer, everyday words, fits the 390 px
   plate); it is a hint the player can act on without leaving the game.
6. **Desktop key-cap feedback.** The whole game is one held key; a small SPACE glyph
   that lights while held closes the input loop for first-timers. Static while idle,
   so photosafe by construction.
7. **(done) Settings projected-outcome readout.** Shipped this shift: the
   **projected cruise** row solves thrust(u*) = weight at the current sliders via
   `slipCruiseU` (bisection on the monotone closed form, shape-honest for harmonic
   carriers through the same numeric gate the coupling integrates). Pad asymptote
   with the honest relationship pinned both in a unit fixture (1131.5 projected vs
   1085.1 traced, the excluded p.7 drag) and in smoke (the live row, plus the
   "supply-capped while resonant" annotation and the "cannot lift" null).
   One pure helper (65 total), one smoke check (34 total), no parallel model. The
   original entry is kept for the record: Quote the analytic cruise point next to
   the sliders: solve thrust(u*) = weight from the SAME shipped helpers
   (`slipThrustMeanN` et al.) and show "projected cruise ~N km/h" updating live. No
   parallel model may be introduced; if a full climb projection wants the harness's
   integrator, that is a bigger design conversation and stays out until the owner
   weighs in.

### Queued candidates (tooling)

8. **Automate the four-edit/five-edit rituals.** A script that scans the delimited
   pure-helpers block and regenerates `EXPORTED_SYMBOLS` plus the test destructure
   (leaving the count assertion to the existing guard) turns four manual edits into
   one; same idea later for the slider five.
9. **Advisory visual-regression gate.** Perceptual-hash comparison over
   `capture.mjs`'s staged frames, advisory only (never gating, per "check.sh cannot
   see invisible"), to catch accidental paint drift between human reviews.

Bigger lifts parked pending owner sign-off: scenario mode (presets as goal-bearing
lessons), localization, an in-game sources screen listing every citation, wind audio
tied to air density (needs a decision on default-on sound).

### 2. (done) Phase 2 of the copy pass (presentation-only, no physics)

**Done this shift, one commit for the set.** The direction is settled in
[`DESIGN.md`](DESIGN.md) under "Player-facing copy"; phase 1 shipped in `378ec84`.
The three remaining items:

1. **Full-HUD beat-card bodies got plain first lines.** Every body now opens with
   the thing in everyday words; the numbers and citations follow. The two
   descender cards included. Every smoke-pinned body fragment stayed
   byte-identical (`/no converter/` at 42 km, `/no temperature is modelled/` and
   `/\+73 /` at 30 km, the share-card budget regexes at 85 km), and every new
   line was measured on the real 11 px monospace font against the widest line
   its card already drew (17 cases, all under; the three that overshot were
   re-trimmed and re-measured).
2. **Brownout/UNLOADED strings became kind and actionable.** The stack plate
   (both widths), the settings centering readout and the brownout `why:` line's
   unloaded branch now say what happened and what to do in plain words:
   "magnets let go: the film is wobbling too much. widen the gap or add
   tension." Nothing in the smoke suite pinned the old strings.
3. **"anchor" retired to "ground station" in player-facing copy.** The settings
   hints, the taper label, the resonance toggle formatter, the film-section and
   wave-stress readouts, and every beat-card body. The two smoke-pinned formats
   moved in the same commit: `/^\d+ kW · the ground station's injection, P = σ·v
   \(p\.10\)$/` (was `the anchor's injection`) and
   `taperInfo.stress.includes('ground station')` (was `'anchor'`). The paper's
   own "anchor" stays where the paper is quoted (the §2.5 reference
   configuration in the pairs hint) and in code comments.

`updateContinuous` untouched, so the balance trace cannot move. Gate green: 142
unit, em-dash, rebuild in sync, 98 = 98 refs, 30/30 smoke.

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
- **A staged page may never have run a real boot frame.** The wait handle
  (`__smokeGame`) is exposed in the constructor, before the first update. Freeze the RAF
  there and the cloud imgs keep their DEFAULT visibility (the cloud update writes
  `display` only on a visibility CHANGE, and `_wasVisible` starts falsy), so a
  high-altitude staged frame shows every cloud at once, stacked over the canvas (the
  clouds container is z-index 11; the game canvas is 10). Where the 15 km fade window
  would hide them all, hide them by hand to match the live frame
  (`g.cloudSystem.clouds.forEach((c) => c.element.style.display = 'none')`).
- **The shared toast resets its text mid-fade.** When its hide-timer fires, the element
  hides AND its text resets to "Press R again to restart", so a shot taken a second
  after any toast catches the restart message fading out. Hide `#restart-toast` for
  staged shots.
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
- `dev/tools/check.sh` failing at the rebuild step with "index.html was out of sync" means
  *stage the regenerated file*. It is not a regression.
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
  object, count assertion, currently 61). **Adding or changing a slider is five** (id list,
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
- **Settled design decisions live in [`DESIGN.md`](DESIGN.md)**: the one principle,
  the physical setup, why the stress slider means what it means, and the decisions
  whose reasons are not in the code. Do not re-litigate them.
- Never invent physics to fill a gap. Say it is absent instead. That discipline is the whole
  reason this project is worth showing to the deck's author.

## Credit, which is not negotiable

The concept is Blaise Gassend's (*Powering Climbers Using Mechanical Waves*, ISDC 2025). The
README's "The paper" section and `ATTRIBUTIONS.md` carry the full citation, his own link
ahead of the ISEC mirror, and the statement that he has not endorsed this and that any
errors in the derivation are ours. Prior work by Mark Wessels and Keith Lofstrom, and the
Zubax FluxGrip FG40 hardware, are credited the same way. Shorten the marketing copy as much
as you like; do not shorten that.
