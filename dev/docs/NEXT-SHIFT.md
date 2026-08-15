# Next shift

Read this first. It is the current state, the next tasks in priority order, and the traps
that have already cost time. Updated at the end of the wave-budget-display shift: backlog
item 1 shipped (the slide-6 transported-power budget as a live "Wave arriving" readout in
the Ground-station group, computed per frame from the very `waveSharedBudgetW` the
coupling reads, so it cannot disagree with the physics; no helper, no slider, no
physics), gate green at 140/29/98 and 426 KB, stills verified compositionally unchanged
and restored. The post-commit review pass found and fixed two nits (the hint now speaks
in-world, this file's heading chain restored), and the shift is pushed, deployed and
live-verified md5-identical. Before that, the em-dash sweep of the shipped copy: priority
1's sweep of
the shipped copy landed (no em dash remains in any player-facing string or
markup; comments untouched by design), gate green at 140/29/98, captures re-shot and
committed, no physics and no layout changes. Before that, the review-and-fix pass on the
M4 hot-side-of-thermal shift: one correctness bug in the new card found and fixed
(the drag-heating figure now reads the film speed the physics actually runs, under
resonance and taper), no physics, the balance trace untouched, and the paper's deferred
list still empty.

## Where things stand

- **Live**: <https://atominnovationth.github.io/SMX/>, deployed from `main` by
  `.github/workflows/deploy.yml` on every push. The published site is only `index.html`,
  `assets/` and `social.png`.
- **Gate**: `bash dev/tools/check.sh` (add `SKIP_SMOKE=1` to skip the browser half).
  Currently 140 unit tests, 29 smoke checks, 98 = 98 asset references, all green.
- **Payload**: `index.html` is 426 KB. Only assets under 20 KB are inlined; the clouds,
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
- **Default climb**: unchanged by the thermal shift (no physics at all: one helper, one
  readout, one new card, one card extended, constants and docs), by the review pass
  after it (display-only fix: the 30 km card's heating figure now mirrors the coupling's
  film speed, nothing in the trace's path moved), by the mode-conversion shift (no
  physics either), by the sharing shift (the toggle defaults to refuse) and by the
  resonance shift before that (off by default): 100 km in 350.7 s, mean 1027 km/h,
  cruise 1085 km/h = 0.48 v_max, no brownouts, 31 kg/h of throughput with 3 kg of cargo.

## What last shift changed, so you do not undo it

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

## Priorities for this shift

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
"no em dash" test), and smoke DOES match card titles by `includes()` ('transverse',
'convert modes', 'stops carrying your heat', 'descending climber', 'power from the
top'), two by exact equality ('a second climber requests power', 'sharing the wave
with a second climber'), plus the body fragments `/no converter/`,
`/no temperature is modelled/`, `/\+73 /` and the share-card budget regexes. Check
`dev/tests/smoke/smoke.mjs` for distinctive words before touching any player-facing
string, and keep matched fragments verbatim. New prose stays em-dash-free.

The standing hygiene list is now empty; the backlog below is next.

### Backlog, any order

- **(done) Wave power budget display (slide 6).** Shipped this shift as the Ground-station
  "Wave arriving" readout, computed per frame from `waveSharedBudgetW` itself, with the
  plain / resonant-injection / shared readings all pinned in smoke checks 12/13b/13c.
  See "What last shift changed" above.
- **Resonance texture**: `resonanceModeAt.periodS` is on the readout; a visible crest
  scale could ride it.
- **Bootstrap pacing**: `throughputKgPerHour` is pinned and shown at the minimal level.

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
  object, count assertion, currently 62). **Adding or changing a slider is five** (id list,
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
