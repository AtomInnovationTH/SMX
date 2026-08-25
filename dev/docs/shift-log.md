# Shift log

The per-shift narrative record moved out of [`NEXT-SHIFT.md`](NEXT-SHIFT.md) in the
August 2026 tidy: that file is read at the start of every session and had grown to
1,288 lines, most of it shipped history. What lives here is the "what changed and
what it cost" narrative, newest first. Current state, next tasks and the traps stay
in NEXT-SHIFT.md; release-level summaries are in [`CHANGELOG.md`](CHANGELOG.md).
Nothing below was reworded in the move; entries are verbatim from NEXT-SHIFT.md.

---

### The Shift G tooling shift (most recent)

Updated at the end of Shift G: the two queued tooling candidates shipped, one source
hook and two new tools, with the usual fan-out (a subagent built the ritual generator
while the regress tool's determinism was debugged by hand).

**The four-edit ritual is now one command.** `dev/tools/sync_test_exports.mjs` scans
the pure-helpers block (reusing extract.mjs's own `extractPureBlock` /
`declaredPureHelpers`) and lands the three mechanical edits (EXPORTED_SYMBOLS, the
pure.test.mjs destructure and the sanity object) idempotently, with a check mode that
exits 1 on any drift. The count assertion stays MANUAL on purpose: it is the guard
against the generator's own regex going broad (the ATMO_DENSITY_KGM3 lesson). Its
acceptance run was the real thing - `frozenSkyTimeS` had just landed in the block,
and the script did the ritual live (count 70 -> 71). One judgment call worth keeping:
the sanity object is CURATED (seven legacy helpers are omitted on purpose), so the
script anchors on "declared but not exported" and never forces sanity completeness.
The slider five stays manual; that surface is more irregular.

**The advisory frame diff needed real debugging, not theory.** `dev/tools/regress.mjs`
pixel-diffs fresh deterministic frames against the committed stills. The expected
story - "the WebGL sky is wall-clock-fed, freeze it" - was necessary but NOT
sufficient: the game's new `?debug&skyt=<s>` hook (the sky was the one wall-clock-fed
visual) plus page stubs for Math.random and performance.now left hero bit-exact but
climb STILL drifting, deterministically, at identical numbers every run. The probe
bbox said sky band; the real cause was page HISTORY: the two stills shared one page,
so the hero walker's state (altitude, landmark suppression, camera smoothing, wave
clocks) leaked into the climb frame. One fresh page per still fixed it - and the
frozen-sky proof then showed the sky time was a no-op at these altitudes anyway
(REGRESS_SKYT moves nothing below 13 km; the sensitivity probe is REGRESS_TARGET_Y=8,
which drifts 4 % of pixels at worst-channel 255). Both stills re-shot on the
deterministic pipeline (compositions unchanged, centres capture-exact) and are now
bit-exact reproducible. Wired into the gate as opt-in advisory: `VISUAL_REGRESS=1`
prints the verdict and never fails, per "check.sh cannot see invisible" - the gate
for a render change stays the capture itself.

One thing to note for the next reader of capture.mjs: the CLIP keeps a live sky by
choice (a frozen aurora in a video reads as a bug; nothing pixel-compares the clip).
Gate numbers: 149 unit / 71 helpers / 41 smoke. Gate green end to end, and the
advisory reports OK / OK on the final tree. Not yet pushed at shift end.

### The Shift F reach-and-access shift

Updated at the end of Shift F: queued candidates 1 (shareable runs) and 4
(aria-live mirror) shipped in one commit, with the test suites fanned out to two
subagents again (pure ritual for four helpers; three new smoke checks).

**Shareable runs.** The report card gained a share row: a readonly URL input (the
visible, selectable source of truth) plus a copy button whose clipboard write is
explicitly best-effort. The URL encodes the panel's RAW slider values plus the
wave type through a version-prefixed codec (shareConfigEncode/Decode/UrlParse),
and on a delivery the result rides as &time=&kgh=. A shared link boots through
`_applyShareUrl`, which fires each slider's own DOM event (the preset rule; the
fire helper was hoisted out of the preset handler into fireSliderDom for exactly
this) and then toasts the challenge. Design decisions kept: the payload is panel
state, never game internals; a malformed payload decodes to null and is ignored,
never fatal; the wave type applies via the same setType the 1-3 keys call, since
it has no slider to drift from.

**The codec hole the tests caught.** The first cut let Array.join turn a
non-finite entry into a BLANK field, and Number('') === 0 then silently zeroed
that setting on decode - a hand-crafted URL could corrupt the config it claimed
to carry. The encode now rejects non-finite entries outright and the decode
rejects blank fields; the pure tests pin both directions. Recorded because it is
the second time this month a "malformed is ignored, never fatal" contract had a
silent corruption path until a test said otherwise.

**Aria-live mirror.** Everything on screen is canvas, so assistive tech used to
get one role="img" label. An offscreen polite region (#ux-live) now carries a
plain steady-state sentence on a 2 s throttle (ariaLiveLine - a NEW sentence,
because the plate's pacing shorthand reads as noise spoken aloud) plus the event
pushes at their own sites: brownout reasons, delivery, beat-card titles, the
run's end. Smoke 14i pins the throttle cadence and the brownout explanation.

Two smaller traps for the record: the smoke payload's frequency raw was first
written as 450 - the slider is 0-100 mapping 92-1000 Hz, so 450 clamped to the
max and turned the amplitude assertion into an accident of the stress-cap clamp;
the payload now uses in-range values that apply cleanly (raw 50 / 0.3 m). And
14i's first sample raced a leftover game-over push; it now waits state-not-clock
for the next steady sentence. Gate numbers: 149 unit / 70 helpers / 41 smoke.
Gate green end to end. Not yet pushed at shift end.

### The Shift E pedagogy shift

Updated at the end of Shift E: the two teaching gaps the UI audit found are closed,
plus one tune-loop pointer. The game's one decision (release before the buffer
empties) used to be learnable ONLY by failing a brownout; that is now announced in
advance, twice.

(1) **Low-charge warning** (E1): below a quarter of the buffer while engaged, the
gauge plate pulses an amber border at 1 Hz (half the flash ceiling, a border not a
fill; static bright border under reduced motion). The decision lives next to the
gauge draw and exposes `_gaugeLowChargeWarn` for the pin. (2) **First-rhythm hint**
(E2): a one-time-per-profile plate riding the gauge on the first low-charge grab,
copy per the settled rules ("let go before it empties · the trickle refills it").
The rule is a pure helper (`rhythmHintDue`, 66th in the block); the orchestrator
owns the draw, the retirement (dismissal or the first brownout - `step.tripped` is
the natural hook, the brownout plate teaches from then) and the persistence
(`spaceMonkey.rhythmHintDone.v1`, fresh key, nothing to purge). (3) **Report-card
presets pointer** (E3): one DOM line under the report card names the paper's own
designs (Wessels 60 cm, Lofstrom 1000 Hz), closing the verify-to-tune loop. Shown
with the card, dismissed with it.

This shift was run with the work fanned out: the source stayed with the shift owner
while two subagents took the test suites in parallel - extract/pure (four-edit
ritual, corners test, count 65 -> 66) and smoke (three new checks 14d/14e/14f).
Two traps the smoke side paid, both worth the record: `g.paused = true` (set by
14c) early-returns `update()` and never reschedules its own rAF, so restoring
paused=false alone leaves a dead loop - the checks resume via the game's own P-key
path (`g._startLoop()`); and 14c also left `maxAltitude` at 9500 m, so the ground
restore instantly tripped the game-over predicate and froze the renderer. The
agent found and fixed both, and cleaned up 14f's persisted-best side effect so
check 15's reload assertions still hold. The unit side caught the destructure/
sanity-object duplication trap from the stale-pill shift in its prompt and
avoided it. Gate numbers: 146 unit / 66 helpers / 38 smoke. Gate green end to end.
Not yet pushed at shift end.

### The stale-pill shift

Updated at the end of the stale-pill shift: a player report ("the 4 km toast is
still visible at the top of the Himalayas") led to a one-line-class bug with a
whole-lifecycle fix.

Diagnosis by audit, not guesswork: every `classList.add('visible')` in the game
was checked for a matching removal. The restart toast pairs add/remove through
showToast's timer; the settings panel closes; the grass ground toggles in and
out. The altimeter landmark pill ("📍 Cloud Base: 4 km", top centre) was THE one
unbalanced site: it lit on the first new landmark crossing and never went dark,
because its only removal path was the full-restart wipe. Nearest-below landmark
logic meant it updated content as you climbed (Cloud Base -> Everest), but between
crossings it just hung there - minutes of climb with a "4 km" plate overhead.

The pill was always meant to be a celebration, not an instrument: the chest badge
owns permanent altitude. So it now gets the showToast treatment - a new
LANDMARK_PILL_MS = 3000 const beside RESTART_CONFIRM_MS, clearTimeout +
setTimeout on each crossing (re-crossings reset it, so a fast fall past several
landmarks stays lit while re-announcing), and the restart wipe clears the pending
timeout too. Reduced motion needs nothing new: the 0.5 s opacity fade already
existed in the CSS.

Smoke pins the whole lifecycle on a real page (35 checks): teleport above Cloud
Base lights the pill with the right text, re-crossing above Everest resets it,
and past LANDMARK_PILL_MS it goes dark. Two traps paid on the way in, both worth
recording: (1) adding the constant to pure.test.mjs hit the destructure TWICE (a
second edit's anchor matched inside the same block) - duplicate destructuring is
a syntax error that kills the whole file, and the spec reporter shows it only as
'test failed' at file scope, so run node --check on the file when a whole suite
dies without naming a test; (2) smoke.mjs imports NO game symbols (it drives the
live page), so the soak window is hardcoded 3000 with a sync comment - the check
fails loudly if the source window moves. The soak itself PAUSES the sim first:
wall-clock timer, paused update(), otherwise gravity drops the climber through a
landmark mid-soak and re-lights the plate under test. Gate numbers: unit unchanged
at 145 (no pure logic to test - the fix IS the DOM wiring), helpers 65, smoke 35.
Gate green end to end. Not yet pushed at shift end.

### The projected-cruise shift

Updated at the end of the projected-cruise shift: queued candidate 7 shipped, the
third of the three planned UI shifts. The settings panel's playground loop is
closed: the wave shows what you ride (shift A), the rail shows where you are
(shift B), and the new row says what your configuration will do.

The row solves thrust(u*) = weight with `slipCruiseU`: bisection on the monotone
closed form, ~50 steps to double precision, returning the honest null when even
the open gate cannot lift the cargo ("cannot lift this cargo", never a number).
Two design rules kept it inside section 0: NO parallel model, and shape honesty.
The orchestrator mirrors `calculateContinuousCoupling`'s plain-branch chain call
for call (gap -> flux with the same unloaded-stack guard -> kPerPair), passes the
carrier's own real-amplitude filmVelocityAt for harmonic gates exactly as the
physics does, and while resonance is on it refuses to invent a second solve:
"supply-capped while resonant". The hint names both limits: the damped film aloft
cruises under this pad figure, and the switching bill is a separate wall.

The gold fixture reads the shipped constants chain itself (gapFluxT -> pairCouplingK
-> stackDryMassKg, no rounded copies) and pins the defaults at ~1131 km/h of pad
asymptote; the balance trace's damped cruise (1085.1) sits ~4 % under it - exactly
the p.7 drag the asymptote excludes, matching DEVELOPERS.md's own "few per cent
lower" prose from the M4 shift. Both ends of that relationship are now pinned: the
unit fixture for the solver, smoke 14b for the live row (the number in range, the
resonant annotation, the restore). The square-carrier test found a genuinely
instructive fact on its way in: at the default cargo the band-limited square gate
cannot lift AT ALL (null), and at 1 kg it cruises at less than half the sine's
fraction - shape matters more than coupling strength.

One trap recorded for the export-guard regex: an inner `const thrustAt = (u) =>`
closure inside a pure helper gets swept as an unexported helper (66 vs 65) and the
guard test fails loudly, as designed. The bisection inlines its slipThrustMeanN
calls instead, with a comment saying why. Gate numbers: 145 unit / 65 helpers /
34 smoke. Render-adjacent only: updateContinuous byte-identical, balance trace
untouched, no snapshot regen. Gate green end to end. Not yet pushed at shift end.

### The altitude-rail shift

Updated at the end of the altitude-rail shift: queued candidate 3 shipped, the
second of the three planned UI shifts (after the legible wave, before the
projected-cruise readout).

The rail is a thin fixed band on the right edge, UNDER the EPM gauge rather than
beside it: the gauge owns x width-37..width-13 down to y 236 with its net-flow
arrow, so the rail runs y 252 to height-78 on the gauge's centre x and the right
edge reads as one instrument column. The axis is SQRT (`railAltitudeToFrac`, one
new pure helper): linear crushes every diegetic landmark but Everest under 12 % of
the Kármán span, while sqrt spreads the low climb the way the run actually
experiences it. Watched-surface rule respected: the compression is labelled at
full HUD ("sqrt scale"), the Kármán crown is labelled there too ("Kármán ·
100 km"), and minimal stays text-free (copy rules).

Design decisions worth keeping: (1) the 40 km act boundary is a SHADE in the track
(Act I blue below, vacuum dim above), not a tick, because sqrt puts it 1.2 % of the
span from the Baumgartner tick; "the air quits there" reads as the rail's own
texture changing. (2) The ghost best reuses the world-space BEST line's gold
dashed language as a tick, so one visual grammar means one thing everywhere.
(3) The p.14 descenders are downward chevrons at their 30/60 km crossings.
(4) Nothing animates: the live dot follows data like the chest badge, so
photosafety and reduced motion need no guard by construction.

The pin is the design: `_railState()` computes everything the renderer draws
(level, x, band, live frac, ghost frac, act frac, descender fracs) and returns
null at HUD off, so ?clean stays clean by construction and smoke 11c pins the
sqrt fractions for a known altitude, the ghost tick answering the persisted-best
property live, the exact geometry (x width-25, y 252..height-78), and the H cycle
hiding the rail exactly at off. One pure helper with endpoint/clamp/monotonicity
tests (144 unit, 64 helpers), one new smoke check (33 total). The eyeball loop
earned its keep once more: the first staged frame showed the bare canvas marks
washing out completely against bright cloud, so the rail now sits on the same
translucent black plate every other instrument reads through, with the mark
alphas raised to match - the smoke pins could not have caught that, which is
exactly why "shoot the frame" is a rule. Stills re-shot:
byte-different from HEAD through the documented shader-noise nondeterminism only
(the rail does not draw at ?clean), centres capture-exact, committed per
precedent. Render-only: updateContinuous byte-identical, balance trace untouched,
no snapshot regen. Also swept in passing: the updateThermal docstring still said
"cache the cold coupling multiplier" two shifts after that term was deleted.
Gate green end to end: 144 unit / em-dash / rebuild in sync / 98 = 98 refs /
33/33 smoke, CAPTURE PASS re-run on the final build. Not yet pushed at shift end.

### The legible-wave shift

Updated at the end of the legible-wave shift: queued candidate 2 shipped, and the
research pass changed the design before any code landed. Two findings mattered.

(1) The displacement channel animated at TRUE carrier frequency, sampled by the
display refresh: at 92 Hz and 60 fps that aliases to a device-dependent beat, and
at an exaggerated 80 px it would have been a photosafety-violating strobe. (2) It
was also the ONE motion channel with no prefers-reduced-motion guard (ripple,
highlight, crest and stack sweep all had one; the displacement loop did not).
Invisible at the old 10 px; indefensible at the new scale. So "make the wave
visible" became a two-axis schematic: spatial (waveDrawAmpPx, ~8x proportional
under an 80 px cap, the taper's thin-top factor included) and temporal
(drawnOscillationHz, a monotone log map of the carrier into 0.15-1.2 Hz, so 1000 Hz
still visibly out-paces 92 Hz while every drawn motion stays under half the 3 Hz
ceiling). The shape clock advances in SIM time in update(), freezes outright under
reduced motion, and the world-anchored phase survives intact: the shape is still
tetherPhaseAt(altitude, tau), so crests drift up at c x dilation and wavelength
stays true. The coupling instruments (strain shimmer, green film dot, slip halo,
crest chevrons) deliberately keep the REAL clock and real u: they are the what-you-
see-is-what-couples channel and must never inherit the schematic clock. Geometry
was verified before drawing: at 80 px over a 2,270 px wavelength the displacement
slope stays far below segment spacing (no pile-up), and the straight band edges are
CORRECT for a longitudinal wave (the silhouette does not displace axially).

Tests: two pure helpers with endpoint/monotonicity/cap tests (142 -> 143 unit with
the integrity shift's count already in place; 63 helpers), two new smoke checks
(32 total): the drawn-amplitude check drives the stroke slider through 0.05/0.6/1.0/
1.1 and pins 4/48/80/80 plus both clocks advancing (shape dilated, waveSystem.time
real), and a reduced-motion boot pins the frozen shape at full drawn amplitude
(freezing means no motion, never no wave). Staged frames: the committed stills were
re-shot (the wave draws at ?clean because it is the world, not an instrument) and
a throwaway 0.60-vs-1.00 m A/B confirmed artifact-free frames at both strokes. The
stills undersell the change and that is worth recording: the payoff is TEMPORAL (a
1.6 s-cycle bob, 48 vs 80 px between strokes), which a single frame cannot carry;
the frame shows only the spacing gradient of the compression bands. Disclosed in
the stroke hint and the README's simplified-on-purpose list. Render-only:
updateContinuous byte-identical, balance trace untouched, no snapshot regen. Gate
green end to end: 143 unit / em-dash / rebuild in sync / 98 = 98 refs / 32/32
smoke, CAPTURE PASS on the re-shot stills. Not yet pushed at shift end.

### The integrity shift: cold-grip deleted, scored cargo frozen

Updated at the end of the integrity shift: a code-level audit reading the integrator
itself (not the docs) found two violations of the project's own rules, both fixed.

(1) **The invented cold-coupling penalty existed and is now gone.** The legacy
"educational thermal layer" multiplied the coupling impulse by `coldGripFactor`:
below the current gear's shivering threshold, thrust lost up to PENALTY_CAP = 12 %.
It appears in no paper, no readout, no card and no doc; DESIGN.md's "any temperature
is absent" claim was written as if it did not exist. It sat inside
`updateContinuous`, fed the balance harness call for call, and shaped every shipped
default-climb figure. Deleted outright rather than zeroed (the slip-integral
precedent: the model got smaller): the helper, the THERMAL penalty constants, the
dead `shiveringAt` suit fields, the two `_coldFactor` init sites, the harness
mirror. Suits stay costume (sprites + toast + thermometer); the thermal bullet in
DEVELOPERS.md now says "no temperature term feeds the physics" and it is TRUE in
both directions. The pure suite lost one test with its helper (142 -> 141; 61
helpers), and thermalStep's contract test now pins the four-key shape so a coupling
term cannot quietly grow back.

(2) **The score was exploitable and now is not.** Every slider applied live mid-run
with no gate, including Weight, the scored quantity. Climb at 3 kg, open the panel
at 99 km, slide to 200 kg, coast across the line: `cargoDeliveryCredit` credited
whatever the slider read. Now `_runCargoKg` snapshots Weight at liftoff (the same
moment `_climbStartS` starts the clock) and feeds the credit, the mission block's
goal/pace lines and the minimal score line, falling back to the live slider before
liftoff where the values are identical (so every pinned smoke string survives). The
sliders remain live sandbox levers for the PHYSICS; only the SCORE freezes.
DESIGN.md carries both decisions under "decisions whose reasons are not in the
code".

**The trace moved, deliberately and explained**: doneAt 350.7 -> 345.5 s, mean
1027 -> 1042 km/h, cruise 1085 km/h unchanged (= 0.48 v_max). The movement is
exactly where the penalty lived: the low climb below 19 km, which had been paying
5-12 % invented tax, while vacuum was never penalized (the pressure suit's
threshold made the factor exactly 1 above it): the cleanest possible confirmation
that the deletion changed nothing the paper owns. All M2.11 target bands hold
without touching them. The snapshot regeneration also folded in pre-existing format
drift (`resonanceOn`/`powerShareOn`/`startAltM` config fields the harness gained in
earlier shifts without a regen; HEAD itself regenerates those 6 lines), so the
snapshot diff mixes the two; the trace rows are the honest part. The README's preset
validation figures were swept in the same pass and were STALE twice over: they
predated the shift-9 re-scale (max payload quoted a 200 kg run; the slider has
capped at 24 kg since) and quoted Lofstrom's stall at the old 128-pair stack's 2 MW
(today's 8-pair preset draws 128 kW). All five presets were re-measured through a
balance-harness replica (validated first by reproducing the committed default trace
exactly, 345.5 s): paper 5:46, Wessels 11:09, Lofstrom stalls (the stroke clamp pins
the film at v_max, slip closes, switching outlives extraction), max speed 4:13,
max payload 7:02.

Gate green end to end: 141 unit / em-dash / rebuild in sync / 98 = 98 refs /
30/30 smoke. No new staged-frame trap paid; no render change shipped, so no capture
pass owed. Not yet pushed at shift end.

### The climber-art shift and the phone-forms fix

Updated at the end of the climber-art shift: a player review
of the shipped game surfaced two presentation bugs and one honesty gap, all fixed.
(1) The thermal suit overlays drew their own arms hanging at the sides with mitts while
the climber's bare arms reach up to the clamps, so a suited monkey read as two pairs of
hands — the four-armed monkey the grabbing pose's paint order had already fixed WITHIN
the sprite, reintroduced by the overlay ACROSS sprites. All three suit SVGs are now
sleeveless by design (the torso shoulder humps read as armholes; the climber's own arms
stay the only pair of hands, in both poses), verified composited in the live game at
9/30/55 km. (2) The face was baked per pose: the smile showed while sliding back down in
a stall and the surprised mouth showed standing on the pad. renderMonkey now picks the
face from the MOTION (engaged smile / grimace past MONKEY.DESCENT_GRIMACE_PX_S = 50 px/s
of descent / coasting surprised only once airborne / calm on the pad), the two pose SVGs
became expression-parameterized builders, the loading gate went expect(2) -> expect(4),
and the pick is exposed as _faceState (the _stackDrawnPairs render-path pattern) and
pinned in smoke 30. (3) The one physics simplification missing from the README's
labelled list — climber aerodynamic drag (the paper books drag on the film only; the
climber feels the air as a damped film, never directly) — is now listed, with the numbers
that make it safe: at the 1085 km/h cruise the stagnation temperature is ~60 °C (Concorde
territory, not reentry; heat flux scales ½ρv³, burn-up needs km/s class). The physics
itself is untouched: adding pod drag would break the paper-fidelity pins and the verified
preset times for zero player decision. Also swept: the README's stale "140 tests" (142
since the bootstrap-pacing shift). The gate is green at 142/30/98 and 435 KB, the new
smoke check green on its first run. No new trap was paid: the recorded staged-frame traps
all held, and the freeze-before-overlay-clear resurrection made the face-verification
freeze-frames trivial (cancelAnimationFrame(g._rafId) holds the last canvas for the shot).
Pushed, deployed and live-verified md5-identical, with every job green, smoke included.
Before that, the phone-forms fix: the last
post-backlog candidate shipped (at compact width the full mission block's goal and pace
branches now carry short forms, "Mission: N kg to Kármán (100 km)" and "pace N kg/h to
Kármán (best M)", the repo's own shift-9 same-facts-fewer-words pattern, so the block no
longer runs off a 390 px screen; the delivered line fits as-is and stays one string at
both widths; desktop lines byte-identical, proven on a cross-build staged-frame A/B).
Smoke check 20 gained the narrow-full pins by resizing the main page mid-check (29
checks, no new one); the gate is green at 142/29/98 and 432 KB. The review pass found
exactly one omission (the default-climb bullet now names the fix), code and pins
untouched. The fix is pushed, deployed and live-verified md5-identical, with every job
green, smoke included. THREE new staged-frame traps were paid this fix, all recorded
below: a freeze that lands before the loading
overlay clears is cancelled-and-resurrected (the loop starts on loadingManager.onComplete
after the fade), the thermometer and suit sprites are not counted by the loading manager
(wait for every canvas-consumed image), and a second build served at /old/ resolves its
relative asset URLs to /old/assets/* (map them back). Before that, the bootstrap-progress
shift: the first post-backlog candidate shipped (the minimal compact plate's delivered
line now carries the cumulative tether meter, "· tether N/600 kg", the one moment the
meter moves, guarded by bootstrapKg > 0 so every pinned string survives verbatim; section
0 found the 600 kg target is the game's own S16 design number, so this is presentation of
owned state, not a citation). No physics, no helper, no slider; smoke pins the clause by
riding check 20 (29 total, a written-meter capture beside the live-zero one); pure.test
gained the clause, the rounding, the non-finite guards and the widest width variant (142
unit); the render change was verified on staged frames, never by reading the code (a
single-page A/B at 500 m: the clause diff 295 px strictly inside the compact plate's
third-line band, the round trip exactly 0, the goal and pace lines confirmed meter-free
with a total on record, the full mission block reads the same live meter, and the 390 px
phone plate keeps the widest realistic line inside it). The review pass found four small
things, all fixed in place: two stale gate-number spots in DEVELOPERS.md (141/120/430 KB,
now 142/121/431 KB), a self-contradictory smoke aside in this record, and the
boot-overlay smoke flake itself, fixed at the root after it showed twice locally and once
in CI (the check 1 boot wait is now state-based, not a fixed 500 ms wall clock), plus the
same wall-clock class in the 85 km crossing check, surfaced by the docs-push run and
fixed the same way (both legs now climb until altitude proves the crossing); the CI log
also taught that the smoke job is advisory by design and never gates a deploy. The
bootstrap-progress shift is pushed, deployed and live-verified md5-identical, with every
job green, smoke included, on the redeploy run. No new trap was paid on that shift: the
recorded staged-frame traps (the seeds, the frozen clock, the raster-path warmup) all
held. Before that, the bootstrap-pacing shift: backlog item 3, the last one, shipped (the
persisted best rides the minimal compact plate's goal and pace lines whenever one exists,
and the full mission block's pace branch quotes it too, pinned in smoke 20 and pure.test,
A/B-verified on staged 500 m frames), reviewed, pushed, deployed and live-verified
md5-identical. Before that, the resonance-texture shift: backlog item 2 shipped (the
crest train breathes in place at the cavity rate while resonant, pinned in smoke 13b and
A/B-verified on staged frames), reviewed, pushed, deployed and live-verified
md5-identical. Before that, the wave-budget-display shift: backlog item 1 shipped (the
slide-6 "Wave arriving" readout, computed per frame from the very `waveSharedBudgetW` the
coupling reads), reviewed, pushed, deployed and live-verified md5-identical. Before that,
the em-dash sweep of the shipped copy (no player-facing em dash remains), and before that
the review-and-fix pass on the M4 hot-side-of-thermal shift (the 30 km card reads the
film speed the physics runs).

## What last shift changed, so you do not undo it

- **The full mission block carries short forms at compact width (the last post-backlog
  candidate), not a wrap; no physics, no helper, no slider, and no committed screen's
  text or layout moved.** Section 0: pure presentation, no paper hook needed, exactly as
  the candidate recorded. The options were wrap or accept; the shipped answer is
  neither, it is the repo's own shift-9 phone pattern (the vine info block and the
  frequency table already carry short forms under `_compactHud`: same facts, fewer
  words, never a different claim). Measured on the real font, not estimated: the goal
  sentence reaches 406 px at the 50 kg stress figures and still overflows 390 at the
  3 kg default; the pace+best line reaches 386 px at the stress figures (the
  candidate's estimate said ~393), which overflows every supported phone narrower than
  ~380 px; the delivered line is 308 px at the stress figures and fits. So the goal
  and pace branches carry short forms at `_compactHud` ("Mission: N kg to Kármán
  (100 km)" and "pace N kg/h to Kármán (best M)", the pace form mirroring the minimal
  plate's pace line with the delivered branch's own "(best N)" style, so no level
  shows a figure another hides), and the delivered branch stays one string at both
  widths. No wrap, no layout cascade: the block keeps its y 16/30 band and the thermal
  (44-85) and act (96) blocks never move. Desktop lines are byte-identical.
- **Smoke pins the narrow forms by riding check 20 (29 total, no new check).** The
  check resizes its main page to 390x844 mid-run (the game re-lays out live:
  `resizeCanvas` on window resize, `_compactHud` recomputed per frame), captures the
  full level in the quiet ground state and in the exact 50 km / 100 s / best 34
  climbing state, pins the short forms present and the long forms absent (the goal
  matched without its cargo figure, same discipline as the minimal goal pin), and
  restores ground state, minimal level and the desktop viewport for the checks after.
- **The render change was verified on staged frames, never by reading the code** (a
  CROSS-BUILD A/B this time: the deployed build mined from git and the new build side
  by side in two pages of one browser, Math.random seeded identically per page, the
  documented seeds, raster paths warmup-settled, and an old-vs-old determinism
  baseline proving the harness before any comparison). The 1280x800 full-level frames
  are pixel-identical between builds in all three branch states (0 px), the 390 px
  minimal-plate frames are pixel-identical (0 px), the 390 px full-level goal/pace
  diffs are confined to the mission band (y 8-18), the delivered branch is identical
  at both widths, and the eyeball shots show the old pace line clipped at the right
  edge where the new short form sits inside it.
- **THREE NEW STAGED-FRAME TRAPS, paid this fix.** (1) A freeze that lands before the
  loading overlay clears is CANCELLED-AND-RESURRECTED: the loop starts on
  `loadingManager.onComplete` after the 500 ms fade, so a kill issued early is undone
  by `_startLoop()` and the page keeps simulating (two "frozen" pages then differ in
  every time-fed draw: wave phase, idle-trickled EPM charge, crest scroll). Wait for
  the overlay to clear first, then kill-confirm the chain (two consecutive quiet
  windows with no re-arm). (2) The thermometer and suit sprites are NOT counted by the
  loading manager, so the overlay can clear with them undecoded and whether one
  painted by snapshot time is a per-page race (a 280 px thermometer-column diff):
  wait for every canvas-consumed image to complete. (3) A second build served at
  /old/ resolves its RELATIVE asset URLs to /old/assets/*: map them back to the repo's
  assets/ or the "diff" is an undrawn sprite, not a code difference.
- **The committed stills and the clip did not move.** The stills boot ?clean at HUD
  off; the clip runs the minimal plate at a fresh boot. The full level's phone forms
  appear in no committed capture. `updateContinuous` is byte-identical, the balance
  harness has nothing to mirror, the snapshot was NOT regenerated, the pure-helper
  count stays 62 and the 13 slider ids are unchanged.
- **Em dashes in new prose: none.** The new strings, code comments, smoke comments and
  doc prose were written clean (the added diff lines were grepped for U+2014 before
  commit).

### From earlier shifts (the bootstrap progress meter at minimal)

- **Bootstrap progress at minimal (the first post-backlog candidate) is live as ONE
  guarded clause on the minimal delivered line, not a mechanic; no physics, no helper,
  no slider, and no committed screen's text or layout moved.** Section 0, decided before
  any code: the 600 kg target is the game's own design number (S16,
  `GameConfig.MISSION.BOOTSTRAP_TARGET_KG`) and the cumulative kg is the game's own
  persisted state (`bootstrapKg.v3`), already shown at full HUD ("Tether bootstrap:
  N.N%") and on the game-over screen, so this is presentation of owned state, not a
  citation; the paper publishes no progress figure (the pacing shift's full-deck sweep
  found its numbers are power, frequency and tether mass only), so there is nothing to
  cite and nothing to invent. The failure mode is shift 12's own: the meter moved only
  behind H and on the game-over screen, so a player who never presses H never learned
  the bootstrap exists. What shipped: `minimalScoreLine`'s delivered branch appends
  "· tether N/600 kg" (the game-over screen's own figure style, compacted) whenever a
  cumulative total exists, guarded by `bootstrapKg > 0`, the same shape as the best's
  guard. The delivered line is the one moment the meter moves (`cargoDeliveryCredit`
  fires once per run, at Kármán), so the clause is honest and actionable exactly where
  it lands; the goal and pace lines never carry it (the meter does not move there, and
  the pace line is already the widest), and in real play the delivered state always has
  a total (the credit just fired), so the guard only ever fires for written states. A
  deliberately rejected alternative, recorded: the goal line could carry the meter for
  a returning player at the cargo-choice moment, but nothing moves there and no choice
  rides on it, so the candidate's scope (the delivered line) stands. Static text on the
  existing third line: no new band, no plate growth, no flash budget spent, reduced
  motion satisfied by construction, state carried by the labelled kg figures, never
  colour.
- **No physics changed, so the balance harness is untouched and the default trace did
  NOT move (snapshot not regenerated).** `updateContinuous` is byte-identical: the
  change lives in one helper's delivered branch and one call site's argument list, so
  the mirror rule has nothing to attach to, exactly like the pacing, wave-budget,
  thermal, mode-conversion and resonance-texture shifts. The pure-helper count stays 62
  (`minimalScoreLine` gained a parameter, not a new helper) and the slider rituals
  never fire (the 13 slider ids are unchanged).
- **Smoke pins the new read by riding check 20 (29 total, no new check).** The written
  delivered state sets no `bootstrapKg`, so the existing capture reads the game's live
  value (0 after the check-15 reload: check 5's Kármán teleport does credit a delivery,
  but the reload wipes it, and the checks between the reload and check 20 run on their
  own contexts, never the main page), so the shift-12 delivered
  fragment keeps matching with the clause omitted. A new written-meter capture right
  after it (`g.bootstrapKg = 40`, restored to 0 before the teardown) pins the exact
  line "delivered 28 kg/h · best 31 kg/h · tether 40/600 kg". Pure.test gained the
  clause test (the exact string, the 640.4 -> 640 rounding, the absent/zero/negative/
  NaN guards, and that the goal and pace lines never carry the meter even with a total
  on record) and the width test gained the widest tether variant (142 unit tests, was
  141).
- **The render change was verified on staged frames, never by reading the code** (the
  single-page A/B pattern from the last two shifts, adapted to the delivered state):
  one page at 500 m, hand-driven off the synthetic clock with the documented seeds
  (every km milestone, the altimeter landmark for the staged altitude, performance.now
  frozen, `_couplingParticleTimer` high), toggling ONLY `bootstrapKg` (0 -> 40 -> 0)
  around getImageData snapshots of the canvas, after a render-and-readback warmup
  settled the raster path (last shift's trap: an interleaved full-frame getImageData
  flips the headless rasterization path once). The clause diff is 295 px strictly
  inside the compact plate's third-line band (bbox x 194-289, y 776-784 at 1280x800,
  the same y band as the pacing shift's pace diff), the round trip exactly 0 px, and
  the strings read exact through the same canvas path: the shift-12 line without a
  meter, the clause with it, the goal and pace lines meter-free with a total on record,
  and the full mission block reading the same live meter ("Tether bootstrap: 6.7%")
  with its delivered branch untouched. The 390 px phone plate keeps the widest
  realistic line inside it ("delivered 464 kg/h · best 464 kg/h · tether 640/600 kg",
  55 chars: diff right edge 305 px against the 370 px inner edge), confirmed by eye on
  the shots.
- **The committed stills and the clip did not move.** The stills boot ?clean at HUD off
  (the plate is not drawn); re-shot at 256.3 m / 360.0 m, centres exact, and restored
  rather than churned on shader noise. The clip runs a fresh context (no localStorage
  seeded, so `bootstrapKg` is 0) and never delivers (100 m to ~525 m), so the delivered
  line never appears. No re-shoot, and capture.mjs needed no seed change (no new beat,
  no new state).
- **The staged-frame traps all held as documented; two wall-clock smoke flakes did not
  survive the shift.** The boot-overlay flake showed twice locally (the first gate run's
  smoke phase and one standalone re-run failed "boot: loading overlay cleared"), and then
  once in CI on the deploy push itself, all 28 other checks green. Its mechanism: check 1
  waited a fixed 500 ms after boot, but the overlay hides only after every asset reports
  loaded PLUS a 500 ms fade, so on a busy runner the check caught the overlay mid-fade.
  The fix waits on the exact predicate the check asserts (the same one check 8 already
  waits on), wall clock gone. Then the docs-push run surfaced the same failure CLASS in
  a second member: the multi-climber 85 km check climbed at 2 km/s for a fixed 400 ms of
  wall time, and the dt clamp means a loaded runner simulates less per wall second, so
  the share leg never reached the crossing (the CI detail showed refusal fired but
  `aboard: false`). Both legs now climb until altitude proves the crossing (5 s of
  patience), with explicit crossed flags in the detail so the next failure explains
  itself. Both fixes are harness-only: no render surface, no pinned string, no game
  code. Three clean local runs each, then every CI job green. While reading the log,
  one deploy fact worth recording accurately: the smoke job is ADVISORY BY DESIGN
  (`continue-on-error`, and `deploy` lists only `build` in `needs`, deploy.yml lines
  77-95), so past shifts' "build, smoke and deploy jobs all green" framing was
  imprecise: smoke never gates a deploy, it only signals. The tee advice below stands
  for the remaining timing-sensitive checks.
- **Em dashes in new prose: none.** The new clause, code comments, test comments and
  doc prose were written clean (the added diff lines were grepped for U+2014 before
  commit).

### From earlier shifts (the bootstrap pacing reference, the persisted best on the score lines)

- **Bootstrap pacing (backlog item 3, the last one) is live as a reference paired with
  the score lines, not a mechanic; no physics, no helper, no slider, and no committed
  screen's text or layout moved.** Section 0, decided before any code and verified
  against the deck's full text: the paper publishes NO pacing figure at all (its numbers
  are power, frequency and tether mass; no kg/h, no delivery cadence, no mission time
  anywhere in the 16 pages), so there is no paper hook to cite the way slide 6 (budget),
  p.7 (drag) and p.10 (resonance) allowed, and any "the paper says your pace should be N"
  display would invent a number. The kg/h score stays the game's own construct (M3.6,
  decision 11). What a display CAN say without inventing: a pace read sharpens against a
  reference, and the one pacing reference the game already owns is the persisted best,
  which used to appear only after delivery, exactly when it stops being actionable. What
  shipped: `minimalScoreLine` pairs the best with the goal and the live pace whenever a
  best exists ("· best N kg/h"), and `renderMissionHud`'s pace branch quotes it in the
  delivered branch's own "(best N)" style, so no level shows a reference another hides.
  The pace projection and the best are the same figure at the same scale (cargo per hour
  of climb at the current average), so side by side they are the honest "on track?"
  read. A fresh player (best 0) sees exactly the shift-12 lines, which is why every
  pinned string survives verbatim: check 20's three fragments and pure.test's whole
  strings all run at best 0 outside the delivered state, and the delivered state (which
  already paired figure and best) is untouched. Static text: no flash budget spent,
  reduced motion satisfied by construction, state carried by the labelled number, never
  colour.
- **No physics changed, so the balance harness is untouched and the default trace did
  NOT move (snapshot not regenerated).** `updateContinuous` is byte-identical: the
  change lives in one helper's strings and one render branch, so the mirror rule has
  nothing to attach to, exactly like the wave-budget, thermal, mode-conversion and
  resonance-texture shifts. The pure-helper count stays 62 (no new helper) and the
  slider rituals never fire (the 13 slider ids are unchanged).
- **Smoke pins the new read by riding check 20 (29 total, no new check).** The climbing
  state now carries a written 34 kg/h best: the minimal pace line pins "pace 54 kg/h to
  Kármán · best 34 kg/h", the full mission block pins the "(best 34)" suffix, and a
  restored-ground capture pins the goal pairing "score: kg/h to Kármán · cargo 3 kg ·
  best 34 kg/h". The three shift-12 fragments stay (unanchored, still matching), and the
  teardown still zeroes cargoBest for the checks after. Pure.test gained the
  best-bearing goal/pace pins, the rounding rule and the non-finite guards, and the
  width test gained the three-figure-best variants (141 unit tests, was 140).
- **The render change was verified on staged frames, never by reading the code** (the
  single-page A/B pattern from the resonance-texture shift, adapted to static text):
  one page at 500 m, hand-driven off the synthetic clock with the documented seeds
  (every km milestone, the altimeter landmark for the staged altitude, performance.now
  frozen, `_couplingParticleTimer` high), toggling ONLY cargoBest (0 -> 34 -> 0) around
  getImageData snapshots of the canvas. The pace diff is 219 px strictly inside the
  compact plate's third-line band (bbox x 134-208, y 776-784 at 1280x800), the goal diff
  221 px (x 204-278), both round trips exactly 0 px, and the strings read exact at
  minimal, at full (the mission block's "(best 34)") and in the untouched delivered
  state. The 390 px phone plate keeps the suffix inside it (diff right edge 208/278 px
  against the 370 px inner edge), confirmed by eye on the shots.
- **ONE NEW STAGED-FRAME TRAP, paid this shift: a full-frame getImageData interleaved
  with renders flips the headless rasterization path ONCE.** The first A/C round trip
  read 15,062 px of diffs across the whole canvas (AA edges of the film rungs, the
  chevrons, the sprite, the gauge), reproducible at exactly the same frame pair, while
  probes without interleaved full readbacks (1x1 reads, composite page.screenshot shots)
  showed the frames perfectly stable. It is a harness artifact (SwiftShader switches
  raster paths on a full readback), not a game one: settle the path BEFORE measuring
  with a render+readback warmup loop (snap until two consecutive snapshots match), or
  only ever diff frames that saw the same readback history.
- **The committed stills and the clip did not move.** The stills boot ?clean at HUD off
  (the plate is not drawn); the clip runs a fresh context (no localStorage seeded, so
  cargoBest is 0 and the pace line is byte-identical). No re-shoot, and capture.mjs
  needed no seed change (no new beat, no new state).
- **Em dashes in new prose: none.** The new strings, code comments, smoke comments and
  doc prose were written clean.

### From earlier shifts (the resonance texture, paper p.10)

- **The resonance texture (backlog item 2, p.10) is live as ONE render channel on the
  crest overlay, not a mechanic; no physics, no helper, no slider, and no committed
  screen's text or layout moved.** Section 0, decided before any code: while resonant
  the shipped model has the film oscillating IN PLACE at f_res = 1/periodS (the
  coupling's own omegaActive), the standing pattern translates nothing (the arch is
  tens of km wide, sub-visible at screen scale, which is why the renderer keeps the
  carrier's travelling component), and thrust still comes from the same slip integral
  against the local envelope, so the overlay's scroll, span and alpha already carry
  the true slip story while resonant. The one honest channel left for the period is
  an in-place BREATH of the train at the cavity rate: `crestBreathe` runs 1.0 to 1.28
  (additive only, so the shipped picture is the floor and nothing the geometry lesson
  paid for is given back) on the chevrons' V-depth and brightness together, at
  min(f_res, CREST_PASS_MAX_HZ): below ~4 km the cavity outruns the photosafety
  ceiling and the breath saturates at the same slowed-schematic cap the scroll obeys,
  matching the kHz switching the readouts book there. Depth and brightness beat in
  phase, so the period never rides colour alone; reduced motion freezes the breath
  mid-pose (phase pinned at 0.25, a static 1.14 swell); the overlay's HUD rule is
  untouched (drawn at minimal and full, hidden at off). What it must not do and does
  not: no translation keyed to the period (that would re-assert a travelling wave),
  no spacing or span change (the geometry is load-bearing), no flash above 2.5 Hz,
  no colour-only signal, and no breath while plain (the channel is exactly dark:
  `_crestBreathHz` 0, `_crestBreathe` 1).
- **No physics changed, so the balance harness is untouched and the default trace did
  NOT move (snapshot not regenerated).** `updateContinuous` is byte-identical: the
  change lives entirely in renderVine, so the mirror rule has nothing to attach to,
  exactly like the wave-budget, thermal and mode-conversion shifts. The pure-helper
  count stays 62 (the rate cap is an inline Math.min in the renderer, not a helper)
  and the slider rituals never fire (the 13 slider ids are unchanged).
- **Smoke pins the channel by riding check 13b (29 total, no new check).** While
  engaged, `_crestBreathHz` asserts equal to min(activeFreqHz(), 2.5) and
  `_crestBreathe` sits inside its 1.0-1.28 range; after the disengage restore the
  handles read exactly 0 and 1. Deterministic state pins, not wall-clock phase deltas
  (the timing-flake class the doc already warns about). The new render handles follow
  the existing `_crestPush` / `_crestScrollPxS` pattern.
- **The render change was verified on staged frames, never by reading the code** (the
  A/B plate-paint pattern, single-page variant): one page parked at 30 km, resonance
  engaged ALOFT through the slider's own DOM event, stepped by hand off a synthetic
  clock; each resonant frame pairs with a plain frame disengaged at the SAME sim
  time, so the only canvas channel that may differ is the breath. Floor diffs 28 px
  (sub-visible, as designed), peak diffs 2709 px inside the crest band and 0 off it,
  and a reduced-motion page holds the swell constant over 90 frames with the cavity
  rate live. The traps the verification harness paid for, in the order they bit:
  engage aloft, never on the pad (the kHz cavity clamps the stroke to centimetres at
  engage, the clamp never auto-raises, and the bent stroke bends the drawn rungs for
  the whole comparison); seed EVERY km milestone up to the staged altitude
  (milestoneMarkerAt otherwise fires its Math.random camera shake plus a 16-particle
  burst on the first stepped frame, and the shake jitters the camera per render even
  at dt 0; capture.mjs's 1-12 seed only covers its own low shots); seed the altimeter
  landmark for the staged altitude (currentLandmarkName / currentLandmarkAlt) or the
  pill re-shows on the first update; freeze performance.now (the hands glow pulses on
  wall time); and if two pages must compare, seed Math.random per page before boot
  (the sky's star texture is boot-random per page).
- **The committed stills did not move, verified by re-shooting** (256.3 m / 360.0 m,
  centres exact; the stills boot ?clean at HUD off, where the overlay draws nothing,
  and resonance is off by default and in no committed capture). The two PNGs differed
  on shader noise only and were restored. The clip was not re-shot: no captured
  screen text moved.
- **Em dashes in new prose: none.** The new code comments, the smoke comments and the
  doc prose were written clean.

### From earlier shifts (the wave power budget display, slide 6)

- **The wave power budget display (backlog item 1, slide 6) is live as a readout,
  not a mechanic; no physics, and no committed screen's text or layout moved.**
  Section 0, verified against the deck PDF before any code: slide 6 publishes
  exactly "Power transmitted: P = vF = Z·V² = F²/Z" with Z = c·ρ·A, plus the
  P/A = c·ρ·V² = σ²/(c·ρ) forms with the velocity-limit and stress-limit
  annotations, so nothing the readout quotes needed the absent-rather-than-faked
  treatment (the slide's 48 N/(m/s)/mm² longitudinal impedance row is already the
  repo's slide-6 fixture, reproducing 150 kW/mm² at 200 km/h and 3.7 MW/mm² at
  1000 km/h). What shipped: ONE new Ground-station row (Wave arriving; NO slider,
  there is no lever to add: the levers are the carrier, amplitude, budget, taper
  and film sliders the player already has) refreshed per frame
  (`updateWaveBudgetReadout`, cached element like Stack heat), computing FRESH from
  `waveSharedBudgetW` with the same arguments the coupling's share block passes
  (the share shift's stale-cache lesson): the local film's transported power while
  plain (taper holds A·V² constant, p.9; the p.7 drag tax saps it with altitude:
  144.2 MW at the pad, 138.1 MW at 11.5 km, 136.6 MW at 69.5 km at the defaults),
  the anchor's resonant injection (p.10's P = σ·v at the active cavity rate,
  kW-scale) while resonant, and a "· shared with the second climber (p.14)" suffix
  while the rider is aboard, where the figure IS the shared budget. The unit adapts
  as the 85 km card's already does. The hint cites slide 6's formula and names what
  the number is under each mode.
- **No physics changed, so the balance harness is untouched and the default trace
  did NOT move (snapshot not regenerated).** `updateContinuous` is byte-identical
  (md5-verified): the readout only reads state and writes a label, so the mirror
  rule has nothing to attach to, exactly like the thermal and mode-conversion
  shifts. The pure-helper count stays 62 (the readout reuses `waveSharedBudgetW`,
  no new helper) and the slider rituals never fire (a readout row is not a slider,
  `sliderDefaults()` scrapes only the 13 slider ids).
- **Smoke pins all three readings by riding the existing checks (29 total, no new
  check).** Check 12 pins the plain `N.N MW · P = ρ·c·A·V² (slide 6)` form at both
  teleports, drag-sapped strictly lower at 69.5 km than at 11.5 km and never above
  the untouched 144.2 MW anchor figure; check 13b pins the resonant `N kW · the
  anchor's injection, P = σ·v (p.10)` form while engaged and the plain restore on
  disengage; check 13c pins the `· shared with the second climber (p.14)` suffix
  while the rider is aboard and the plain form after refusal. Distinctive
  player-facing words now smoke-pinned, for the next text edit: those three
  label fragments on `waveBudgetValue`.
- **The committed stills did not move, verified by re-shooting** (256.3 m / 360.0 m,
  centres exact; the settings panel appears in no capture: the stills boot `?clean`
  at HUD off and the clip runs the minimal plate). The two PNGs differed on shader
  noise only and were restored. The clip was not re-shot: no captured screen text
  moved. The gate passed on the first run with the regenerated index.html already
  staged (140 unit, 29 smoke, 98 = 98, 426 KB).
- **Em dashes in new prose: none.** The new label, hint, smoke comments and doc
  prose were written clean; one slipped into a smoke comment during drafting and
  was fixed before commit. The post-commit review pass found two nits, both fixed:
  the hint's single-source sentence named dev-side machinery (the balance harness,
  the beat card) no other player-facing string uses, and this file's heading chain
  had broken the "From earlier shifts" demotion convention.

### From earlier shifts (the em-dash sweep of the shipped copy)

- **The em-dash sweep of the shipped copy (old priority 1); no physics, no mechanics,
  no layout.** Every player-facing em dash in `Space_Monkey_Elevator.html` was replaced
  mechanically (commas, colons, parentheses, full stops; meaning and plate width kept):
  the og:/twitter meta tags, settings hints/labels (the old em-dash pending-value
  placeholders are now the ellipsis), the settings-concept and Still Unsolved prose,
  the noscript/loading/game-over overlays, HUD-level toasts, the game-over throughput
  and report card, the brownout headline and why-lines, the stack and UNLOADED/STALLED
  labels, the act line and vacuum banner, the p.11 title/compact line/footnote, the
  altimeter pill (the one escaped `\u2014`), the suit label, the 12/20 km and both
  descender card bodies, plus the three WebGL console diagnostics. `updateContinuous`
  is byte-identical (md5-verified), the snapshot was NOT regenerated, and the only
  em dashes left in the file are in comments (CSS, HTML, JS and the two SVG-artwork
  notes inside the sprite templates), all out of scope by design. The smoke-pinned
  titles and body fragments were grepped first and kept verbatim; the gate passed
  (140 unit, 29 smoke, 98 = 98, 422 KB) after staging the regenerated index.html
  (the expected out-of-sync trip on the first run, not a regression). The captures were
  re-shot and committed: the stills moved on shader noise only (256.3 m / 360.0 m,
  centres exact, no new text in frame), and the clip now shows the colon form of the
  p.11 compact line. The post-push review pass read the full diff and re-classified the
  built index.html by scanner: nothing to move, and the one stale verbatim quote the
  sweep created (the roadmap's "EPM BROWNOUT" hint line) sits in the doc that is
  banner-marked historical, so it was left alone deliberately. The live site was
  verified md5-identical to the committed index.html after the deploy. New prose rule
  unchanged: no em dashes anywhere new.

- **A review-and-fix pass on the thermal shift; no physics, no mechanics.** The review
  found one correctness bug in the shift's new code: the 30 km card computed the
  drag-heating figure from amplitude × active ω, which under resonance is the cavity
  rate × amplitude (a few m/s) and in plain mode dropped the taper factor, so the card
  could quote a film speed the film was not running (verified in-browser: ~0 W/m where
  the built-up cavity runs ~607 m/s). The fix moves the drag damping OUT of
  `waveDragHeatingWM` (it is now the bare integrand ½·ρ·Cd·2t·V³ on the LOCAL film
  peak speed) and makes the card mirror `calculateContinuousCoupling`'s mode branch
  (taper × drag on the anchor speed in plain mode, `resonantFilmPeakMps` under
  resonance), so the card reads the same vFilmPeakMps the coupling integrates. The
  quadrature fixture now supplies the travelling wave's damped speed itself; the
  cross-reading identity is unchanged and passing. Verified live: with a built-up
  cavity the card reads ~17 W/m at 30 km (v_max 625.5 m/s, vLocal ≈ 607 m/s), matching
  the extracted pure helpers to rounding. The 2 km card's travelling-wave bill keeps
  its pre-existing constant-section reading (the wave-drag model's documented
  simplification; its resonance corner predates the thermal shift and was left alone
  deliberately). Doc nits: "closing line" became "closing lines" (two lines were added
  to the 2 km card). `updateContinuous` is still byte-identical to before the thermal
  shift (md5-verified), the snapshot was NOT regenerated, the stills did not move, and
  no em dashes entered anywhere.

### From earlier shifts (the hot side of thermal, paper p.7 + FG40 datasheet)

- **The hot side of thermal (paper p.7's drag-heating note + the FG40 ceiling) is live
  as the exact bookkeeping, with the temperature marked absent.** The section-0 verdict,
  decided before any code and verified against the sources: the deck's ONLY thermal hook
  is p.7's "longitudinal will be limited by stress limit, wave generator
  strength-to-weight ratio and possibly by drag heating" (a full-deck regex sweep for
  heat/thermal/temp/convect/radiat/celsius/kelvin returns exactly this one hit; there is
  no IR-budget account anywhere). The FG40 datasheet was fetched and verified against
  the live Zubax reference manual (FG40 hardware chapter, absolute maximum ratings, as
  the priority entry demanded before pinning): internal +73 °C absolute maximum, set by
  the heat-deflection temperature of the polymer composite body, with the electronics
  designed to withstand 105 °C continuously; ambient minimum -40 °C. What NO source
  publishes: the stack's heat capacity, any convective transfer coefficient (geometry or
  correlation), the package's emissivity, or how the drag dissipation splits between air
  and film. A temperature trace would need at least three invented constants, so the
  mode-conversion shape applies: ship the labelled budget, quote the paper's maybe, mark
  the temperature absent. What shipped: ONE new pure helper (`waveDragHeatingWM`, count
  61 -> 62), the local drag-heating rate 0.5*rho(y)*Cd*2t*V(y)^3 in W/m (the p.7 hook's
  own term, reading the same ISA table densityRatio interpolates, so the rate dies with
  the air); ONE new Ground-station readout (Stack heat; NO slider, because the levers
  are the carrier and pair-count sliders the player already has) refreshed per frame
  with the FRESH-computed switching dissipation against the live air figure (convection
  dies with the air; aloft the stack can only radiate); ONE new beat card at 30 km
  ('stack-heat', booking the stack's live watts against the +73 °C ceiling with the
  temperature marked absent, computed FRESH at the crossing altitude per the
  stale-cache lesson of the share shift); the 2 km wave-drag card's new closing lines
  (the bill leaves the wave as heat, p.7's maybe, no film temperature); the Unsolved
  panel's new drag-heating bullet; and the datasheet ceiling constants in
  `GameConfig.FG40` (`MAX_INTERNAL_TEMP_C` 73, `MIN_AMBIENT_TEMP_C` -40), pinned by a
  unit test.
- **No physics changed, so the balance harness is untouched and the default trace did
  NOT move (snapshot not regenerated).** `updateContinuous` is byte-identical: there is
  no new mechanic to mirror (the readout computes fresh from `switchingPowerW` and
  `activeFreqHz()`, the beat computes fresh at the crossing), so the mirror rule has
  nothing to attach to, exactly like the mode-conversion shift. The slide-6, p.7
  drag-row, p.10 resonance and p.14 power-sharing fixtures all keep passing, and the
  advisory snapshot diff is silent.
- **Fixtures for the published numbers, in the established style.** The helper's
  regression fixture is a CROSS-READING: trapezoid quadrature of `waveDragHeatingWM`
  over the column reproduces `waveDragColumnPowerW` to quadrature error (q = -dP/dy by
  construction), so the local rate and the column bill can never drift; the sea-level
  rate at the paper's 1000 km/h is pinned at ~105 W/m for the 9 mm^2 film, with the
  law's scalings (cubic in film speed, linear in thickness, zero for a standing film)
  and the medium's collapse at 30 km (~1.5% of the sea-level rate) pinned alongside.
  The datasheet's +73 °C / -40 °C constants are pinned by their own test so a silent
  edit turns red.
- **Smoke: check 12 pins the new beat (fired flag, title, a `no temperature is
  modelled` body fragment and the `+73 ` ceiling) inside its existing 69.5 km teleport,
  plus the Stack heat readout tracking altitude** (the span's air figure must differ
  between the 11.5 km and 69.5 km samples). No new checks (29 total): the beat rides
  the schedule check, the readout rides it too, matching how the mode readout rode the
  resonance check.
- **The card's paint was verified on staged 30 km frames** (title only at minimal;
  title plus six body lines at full; the 124 px plate fits at 1280 and stays clear of
  the badge, the landmark pill and the stack plate). The committed stills did not move:
  the card fires at 30 km and the stills sit under 400 m; `capture.mjs` seeds the new
  beat id (`stack-heat`) like every other.
- **The 30 km slot was chosen for the narrative arc, and it is clear by construction.**
  20 km says "drag is letting go", 30 km says "the air that cools your stack is going
  with it", 40 km is the vacuum banner. The band between 20 and 42 km was empty, and
  the beat queue absorbs any collision with the 30 km descender's pass card. Both new
  card texts run six body lines (the previous tallest verified plate was five); the
  plate auto-sizes (`22 + lines * 17` px at y = 130), so 124 px ends at 254, clear of
  everything above mid-screen at any playable viewport.
- **Em dashes in new prose: none.** Two were caught and fixed during the shift before
  any commit: the new readout span used the old em-dash placeholder convention (the M4
  rows ship meaningful boot-state text instead, so it now reads the boot figures), and
  one code comment opened with an em dash after the altitude (now a colon). The backlog
  sweep stays its own task (priority 1 below).

### From earlier shifts (the review-and-docs pass after M4 mode conversion)

- **A review-and-docs pass only; no physics, no mechanics, no new strings.** The gate
  went in green and came out green (138 unit, 29 smoke, 98 = 98, 413 KB), the balance
  snapshot was NOT regenerated, and the stills did not move. What it caught and fixed:
  - **One stale code comment.** `_updateClimbBeats`'s header still said resonance
    (p.10) "stays deferred and deliberately not faked" and that M4's beats were
    "landing one per shift". Every scheduled beat is live now, so the comment now
    lists the full live schedule (1, 2, 12, 20, 42, 45/50, 70, 85 km) instead.
    Nothing else in the source was stale: the Unsolved panel, both mode/share slider
    hints and the beat-card bodies already describe the shipped state correctly.
  - **The README was three shifts stale.** It listed mode conversion as plain
    "missing rather than faked" (the table and the verbatim question ship; only the
    mechanism is absent, and the README now says so), omitted the 42 km beat from the
    callouts line, still said "Multi-climber support (p.14) is next" (it shipped two
    shifts earlier; next is the hot side of thermal, the p.7 drag-heating note), and
    claimed 119 tests (138 now). The "What's real" list gained the p.12/13 mode-table
    readout line, matching how the taper/drag/resonance/sharing shifts each added
    theirs.
  - **`dev/docs/v1.0-roadmap.md` is marked historical at the top** (old priority 2,
    second bullet, done). It predates the slip-coupling rework and presented itself
    as the current plan; the banner points readers at this file, DEVELOPERS.md and
    the CHANGELOG. The em-dash backlog sweep (old priority 2, first bullet) is NOT
    done and stays queued below.
  - **Priority 1's spec quoted a paper passage that does not exist.** The thermal
    entry cited an IR-budget account of "temperature cycle is more difficult (p.5)";
    the deck has no such passage (p.5 is the concept figures) and the only thermal
    hook is p.7's "possibly by drag heating". Verified against the local PDF text.
    The priority-1 entry now carries the verified section-0 material (the p.7 hook,
    the FG40 operating-temp ceiling from the plan's backlog, the convection loss
    with altitude, and what is already in, cold-only), and the "Where things stand"
    bullet no longer claims thermal is marked absent in-game (it is not: the
    Unsolved panel has no thermal bullet). The README's next-up line was re-pointed
    at p.7 to match.
- **The review found no code defect to fix.** The mode-conversion shift's own claims
  were re-verified against the source: `waveModeCell` is the single source the
  readout, the 42 km card and the Unsolved bullet all quote; the card fires at
  42000 via `upgradeCrossed`, 2 km past the act break; no transverse cell is
  reachable from any input.

## What the shift before changed (M4 mode conversion, paper p.12/13)

- **M4 mode conversion (paper p.12/13) is live as a LABELLED LAYOUT, and the 42 km beat
  asks the paper's question verbatim.** The section-0 verdict, decided before any code:
  the paper's mode table (longitudinal vs transverse, each travelling or standing,
  p.12) closes on "Consider mode conversion above the atmosphere?" and p.14 repeats the
  maybe, but no converter, coupling length or efficiency exists anywhere, so there is
  nothing for the player to reason with and nothing to be exact about: the honest shape
  is summarised-and-labelled, with the mechanism marked absent. What shipped: ONE new
  pure helper (`waveModeCell`, count 60 -> 61) as the single source for the cell the
  run is in (longitudinal travelling by default; longitudinal standing while resonant:
  the resonance toggle is the one mode change the paper supports); ONE new readout row
  in the Ground-station group (Wave mode; NO slider, because there is no lever to add:
  the resonance toggle IS it) whose hint marks the transverse cells absent with p.7's
  own numbers; ONE new beat card at 42 km quoting the question, the live cell and the
  lever; and the Unsolved panel's new mode-conversion bullet. The bordering pieces
  already said the rest: the 12 km reveal has the transverse cap (45 km/h, 20 kW)
  against the live longitudinal bill, and the resonance shift put the standing cell on
  a toggle.
- **No physics changed, so the balance harness is untouched and the default trace did
  NOT move (snapshot not regenerated).** `updateContinuous` is byte-identical: there is
  no new mechanic to mirror, so the mirror rule has nothing to attach to, and the
  new-mechanic verification rule is vacuous BECAUSE there is no mechanic; the commit
  message says so. The slide-6, p.7 drag-row, p.10 resonance and p.14 power-sharing
  fixtures all keep passing. The pure test for `waveModeCell` pins the two live cells
  and that no input can produce a transverse one.
- **The card fires at 42 km, not 40, on purpose.** The 40 km crossing already owns the
  mid-screen act-break banner (4.5 s), and the card plate (y = 130, 107 px tall with
  five body lines) would overlap the banner plate below an ~800 px viewport. 2 km
  later the banner is always gone in real play (even at 400 m/s it ends by 41.8 km),
  and the sequencing reads better: the vacuum banner lands, then the card asks the
  question the vacuum raises. The paper's phrase is "above the atmosphere"; 42 km is
  exactly that.
- **Smoke: check 12 pins the new beat (fired flag, title, a `no converter` body
  fragment) inside its existing 69.5 km teleport; check 13b pins the mode readout
  flipping travelling/standing as the resonance slider drives both ways.** No new
  checks (29 total): the beat rides the schedule check, the readout rides the
  resonance check.
- **The card's paint was verified on staged 42 km frames** (title only at minimal;
  title plus five body lines at full; the plate fits at 1280 and stays clear of the
  badge, the milestone burst and the stack plate). The committed stills did not move:
  the card fires at 42 km and the stills sit under 400 m; `capture.mjs` seeds the new
  beat id (`mode-conversion`) like every other.
- **Em dashes in new prose: none.** The new player-facing strings (the beat card, the
  readout hint, the Unsolved bullet) and the new repo-facing comments and docs were
  written clean; the backlog sweep stays its own task (priority 2 below).

### From earlier shifts (M4 multi-climber power sharing, paper p.14)

- **M4 multi-climber power sharing (paper p.14) is live, and the 85 km beat is now a
  share-or-refuse decision.** Three new pure helpers (`waveTransportedPowerW`,
  `waveSharedBudgetW`, `powerShareCapW`; count 57 -> 60) and ONE new slider
  (Ground-station group, `powerShare` 0/1, default refuse). The honest model, chosen
  against section 0 because the paper names the question unexplored and high-risk and
  there is no mechanism to copy: the wave's transported power becomes a SHARED budget.
  Plain mode carries slide 6's P = rho·c·A·V^2 computed on the LOCAL film (taper- and
  drag-adjusted peak over the local section, fixture-pinned to the p.10 table's plain
  rows: 150 kW/mm^2 at 200 km/h, 3.7 MW/mm^2 at 1000 km/h); resonance mode carries the
  anchor's injection (the p.10 P = sigma·v already enforced as the single climber's
  supply cap). Each rider's skim caps at the budget minus the other's draw
  (`powerShareCapW`, applied inside the coupling EXACTLY like the resonance supply cap:
  it throttles thrust, never speed, and recedes as v -> 0). The other rider is
  summarised as a twin in formation cruise (draw = weight x climb speed, the player's
  own skim at cruise, so at the bind both riders take the budget's half exactly) and
  drawn in formation 15 m below the player with the descenders' glyph: a static world
  entity at every HUD level, no flash budget spent, reduced-motion safe by construction,
  and the state rides words (the HUD line and the card), not colour.
- **The balance harness verified the law before it shipped, and the default trace did
  NOT move (snapshot not regenerated).** The new test runs four climbs from 80 km: plain
  solo vs plain shared are frame-identical (the ~140 MW budget against the ~13 kW skim
  means the cap never binds: at the demo scale power is not what is scarce, and that
  non-event IS the honest p.14 answer), while resonant (3 cm stroke, supply-capped)
  solo vs shared split exactly: the 85 km crossing is frame-identical between them (the
  rider boards on frame-entry altitude, so the crossing frame is the last unshared one),
  then the shared cruise halves the solo one and the skim pins at supply/2. No brownouts
  aboard (switching follows the cavity rate). The harness's `powerShareOn` knob defaults
  false and mirrors updateContinuous's share block call for call.
- **New smoke check (13c) drives the slider through its own DOM event both ways**:
  refuse at the 85 km crossing fires the request card with no rider aboard and nothing
  drawn; share boards the rider (`_shareRiderDrawnTotal` proves the glyph painted),
  quotes the live budget/draw/cap, and refuse-again unboards and restores the `refuse`
  label. The harness owns the binding halves; smoke owns the DOM path and the render.
- **The stills did not move, verified by re-shooting them** (256.3 m / 360.0 m, centres
  exact; the committed PNGs restored rather than churned on shader noise). The rider
  render was verified on staged 85.3 km frames in both modes (the plain-mode share line
  reads "budget 136.6 MW"; resonant reads kW-scale and the engage transient showed as
  extraction 0, exactly the one-round-trip buildup). Capture seeds the beat id already:
  `second-climber` is in `capture.mjs`'s `_beatsFired` seed.
- **Presets pin `powerShare: 0`** (fired with the same `fire('powerShare', ...)` line),
  same pattern as `resonance: 0` and `taper: 1`.
- **Em dashes in new prose: none.** The new player-facing strings (slider hint, both
  beat cards, the labels, the Unsolved rewrite) were written clean; the backlog sweep
  stays its own task (priority 2 below).
- **The wave-boundary solve stays marked absent, by design.** The refusal card keeps
  the open question named (and points at the lever); the share card and the slider hint
  say exactly what is not modelled: partial reflections (p.3) and the standing-pattern
  perturbation that makes retuning with two riders aboard tricky (p.10). If a real
  per-climber wave-boundary solve ever lands, it lands with fixtures, not as prose.
- **The review pass caught one real bug and two doc slips, all fixed in the follow-up
  commit.** The shared beat card read `_shareBudgetW` on the crossing frame, but
  updateContinuous runs before updatePosition, so the rider boards on the NEXT frame
  and the crossing frame's cache is stale (0 on a first shared climb): the card would
  have printed "caps at 0 kW minus the rider's draw". The card now computes the budget
  FRESH at the crossing altitude for both variants, and smoke 13c pins the card bodies
  (the refusal card's "~N MW against", the shared card's "shared budget: your skim caps
  at N MW minus") so the staleness class cannot come back silently. The slider hint's
  "~15 kW skim" now says ~13 kW (the measured cruise skim the harness and the other
  docs already quoted), and DEVELOPERS.md's simulation-model list gained the p.14 entry
  plus the event-schedule line (85 km is the live share-or-refuse, not an absent beat),
  with the "beats absent rather than faked" sentence re-pointed at the wave-boundary
  solve. The refusal card also learned the resonant variant: while resonant it admits
  the budget IS the scarce thing (the anchor's injection), not the plain-mode "not what
  is scarce" line. The live card was verified rendered (staged 85.3 km frame, title at
  minimal, rider aboard below).

### From earlier shifts (M4 standing-wave resonance, paper p.10)

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
  v_cap/v_anchor, altitude-independent, and exactly the p.10 table's ratio), drag-damped by
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
  supply-cap readout 2x off exposed it: if the frequency does not fall as the climber
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
  amplitude), so a resonant setting can never leak through a preset click, the same
  pattern as taper's pin to 1. Every preset object carries `resonance: 0`; a preset
  that omits it would leave the toggle where the player left it.
- **Em dashes in new prose: none.** The six new player-facing strings (slider hint,
  two beat cards, labels) were written clean; the backlog sweep stays its own task
  (priority 2 below).
- **The post-push review pass caught two doc-layer slips, both fixed in the same
  tree.** My own doc additions had introduced four new em dashes (the rule binds
  repo-facing prose too; the pre-existing backlog stays the priority-2 sweep), and the
  README still listed resonance under "missing rather than faked" and as next-up work:
  it now carries the feature, the p.10 fixture row, and multi-climber as the next item.
  Code review found nothing to move: the p.11 dashboard's carrier marker already clamps
  to the table's [0.01, 1000] Hz span (the kHz cavity on the pad cannot overrun the
  plate), the harmonic-carrier path correctly collapses to sine while resonant (the
  cavity rings one mode), and the Unsolved panel's "retuning makes sharing tricky"
  line now references a mechanic the player has actually felt.

### From earlier shifts (M4 wave drag p.7, plus captures and the clip)

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
- **The smoke suite's wall-clock flake class is closed; the timing-flake note's three
  named suspects are all retired.** The hardening shift swept `smoke.mjs` (and
  `dev/tools/`) for fixed wall-clock waits gating on state transitions and converted
  every one to a state-based wait with a bounded timeout, following the boot-overlay
  and 85 km examples. Brownout recovery now waits on the latch itself (the latch trips
  on SIM charge, and the dt clamp means a loaded runner simulates less per wall
  second), and its single-fire cue proof is an 18-frame soak counted through the live
  `_boundUpdate` property, not 300 ms of wall. The RAF ratio is gone: a doubled chain
  must call update twice with the SAME rAF timestamp, so the check counts calls per
  timestamp and asserts none repeats (structural, true at any pacing, where the old
  ratio < 1.4 could whipsaw on uneven framing). The crest thresholds now poll the
  render handles (the open-gate sample waits on drawn/push/speed themselves; the
  accumulation pin IS the predicate, its minimum-rate half already pinned by
  `speed > 100`), and the closed/frozen soaks are 18-frame counts. Both 12/70 km
  teleport legs and the 50 km resonance leg climb until altitude proves the crossing,
  with explicit crossed flags in the detail. `capture.mjs`'s boot waits on the overlay
  predicate plus every canvas-consumed image decoded (the two recorded staged-frame
  traps), not 800 ms. Assertions only ever tightened: crossed/placed flags and frame
  counts were ADDED to records (`crossed12/70/50`, `anchors.e/k.placed`,
  `cueFrames >= 18`, `closed.frames >= 18`, `crestRm.frames >= 18`,
  `frozen.frames >= 24`, `repeatedT === 0 && framesAfter >= 2`), never weakened. What
  stays time-based on purpose: the multi-touch 40 ms wrongful-release beat (a negative
  assertion: nothing may happen in it). Gate green plus five consecutive standalone
  runs green. The post-commit review pass found exactly one defect, fixed in place:
  the landmark placement poll had a 0.5 m altitude tolerance, but updatePosition
  integrates gravity BEFORE re-deriving altitude, so a stalled first frame (dt clamp)
  lands ~1 m low and then falls monotonically: the tight poll would never reconverge
  and would burn the whole 10 s bound, a new flake introduced by the conversion itself.
  The poll's job is only to prove a frame consumed the placement (the re-place plus
  double-RAF after it owns the exactness), so the tolerance is now 100 m, thousands of
  metres clear of any pre-placement altitude. Gate and five more standalone runs green
  after the fix. The tee advice stands for any NEW one-off:
  `node dev/tests/smoke/smoke.mjs | tee /tmp/smoke.log`. (The boot-overlay and 85 km
  crossing legs of this note were retired by the bootstrap-progress shift: fixed
  wall-clock waits racing sim time on a loaded runner, made state-based. The CI smoke
  job is advisory only, continue-on-error, and never gates a deploy.)

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

### From earlier shifts (M4 taper, paper p.9)

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

