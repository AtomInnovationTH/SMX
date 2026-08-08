# Next shift

Read this first. It is the current state, the next tasks in priority order, and the traps
that have already cost time. Written at the end of the August 2026 shift that shipped
M3.5-M3.8, the review pass, the README rewrite, the payload cut and the `dev/` tidy.

## Where things stand

- **Live**: <https://atominnovationth.github.io/SMX/>, deployed from `main` by
  `.github/workflows/deploy.yml` on every push. The published site is only `index.html`,
  `assets/` and `social.png`.
- **Gate**: `bash dev/tools/check.sh` (add `SKIP_SMOKE=1` to skip the browser half).
  Currently 105 unit tests, 18 smoke checks, 98 = 98 asset references, all green.
- **Payload**: `index.html` is 305 KB. Only assets under 20 KB are inlined; the clouds,
  ground and noise stream from `assets/`.
- **Physics**: M1, M2 and M3.1-M3.8 are complete. The deferred list is taper (p.9), drag on
  the wave itself (p.7), standing-wave resonance (p.10), powering more than one climber
  (p.14), mode conversion (p.12) and the hot side of thermal. All are marked absent in-game
  rather than approximated. Do not fake them.
- **Default climb**: 100 km in 387.6 s, mean 929 km/h, cruise 1114.6 km/h = 0.49 v_max, no
  brownouts, 464 kg/h of throughput with 50 kg of cargo.

## Priorities for this shift

### 1. Touch support (highest value by far)

Phones currently get a "requires a keyboard" notice instead of the game. Most people who
tap a shared link are on a phone, so today they bounce before seeing anything. The game
needs exactly one input, so this is a hold-anywhere button, not a control scheme.

- The gate lives in the `load` handler in `Space_Monkey_Elevator.html` (search
  `isTouchDevice`, `mobile-notice`, `try-anyway-btn`).
- `input:grab` with `{ pressed: true/false }` is the only event that matters. Wire
  `touchstart`/`touchend` (and `pointerdown`/`pointerup`) to it, with
  `preventDefault` so a hold does not scroll or trigger text selection.
- Check the layout at phone widths before declaring it done: the settings panel, the p.11
  dashboard (640 px wide) and the on-canvas plates were all laid out for a desktop viewport.
- Keep the notice as a fallback for genuinely unsupported cases, but stop showing it to
  anyone who can hold a finger down.

### 2. Screenshots that encourage rather than discourage

Every current capture is dominated by canvas-drawn instrument text, which reads as homework.
The images should sell the climb: sky, monkey, ribbon, motion, scale.

The blocker is that all the clutter is drawn on the canvas, so it cannot be hidden with CSS.
**Add a HUD-off mode first**, then capture:

- Suggested: an `H` key and/or a `?clean` query parameter that skips `renderFreqTable`,
  `renderMissionHud`, `renderActHud`, the on-canvas controls box, the stack legend plate
  (inside `renderFg40Stack`, keep the stack itself) and the badge. It is worth shipping to
  players too, as a screenshot mode.
- Then re-capture with the game genuinely playing, not teleported.

Capture traps already paid for, do not rediscover them:

- Headless Chromium renders **no WebGL sky** unless you launch with
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Without it every
  shot is a flat white background.
- `paused = true` draws a **wash-out veil** over the whole frame. Never pause for a shot.
- Landmark sprites have **parallax**, so aligning the climber to a sprite altitude by
  arithmetic does not work. Nudge and look.
- Teleporting fires beat cards, the act banner and suit toasts, and leaves the run clock at
  a couple of seconds, which makes the HUD print absurd numbers like "87805 kg/h". Seed
  `_beatsFired`, `_descendersFired`, `_actBreakFired`, `_runTimeS` and `_climbStartS` first.
- Mid-air clouds sit **in front** of the climber below about 9 km, and Everest is white on
  white. Above roughly 12 km the sky is clean.
- `screenshots/hero.png` is also the social card (`deploy.yml` copies it to
  `_site/social.png`). Whatever becomes the hero should look right at thumbnail size.
- An animated GIF or short clip of a real climb would beat any still. Nothing in the repo
  does video capture yet.

### 3. README pass

It leads with play now, but it is still long for the audience. The owner's standing note:
people are busy and distracted, so encourage, do not explain. Specifically:

- The first screen should be the hook, the button and the picture. Nothing else.
- Everything technical is for a small minority. It can be shorter, or folded into
  collapsible sections, or moved to `dev/docs/`.
- Keep Gassend's credit in the document (see below) but out of the sales pitch.
- No em dashes anywhere: the owner has asked for this twice.

### 4. M3.9, the copy pass that is still open

- Re-read `README.md` and `ATTRIBUTIONS.md` against what M3.5-M3.8 actually shipped.
- `dev/docs/v1.0-roadmap.md` still contains superseded physics. Either mark it historical
  at the top or delete it.
- The two flatly false in-game strings were fixed this shift (the settings panel no longer
  says to pulse at the wave's peak velocity, and the finish screen no longer calls the
  down-climber "the next chapter"). Check the rest of the panel copy with the same eye.

### 5. M4 physics, when the presentation work is done

Taper, wave drag, resonance and multi-climber, in the order the paper presents them. Each
needs its own balance-harness verification before it ships.

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
- **Adding a pure helper is four edits** (helper, `EXPORTED_SYMBOLS`, destructure plus sanity
  object, count assertion, currently 38). **Adding or changing a slider is five** (id list,
  `sliders.test.mjs`, `scaleSettingValue`, `UI_CONFIG`, `initGame`'s `sliderDefaults`).
- **Non-slider readouts update in `updateDerivedReadouts()`.** A new slider feeding one must
  call it.
- `assets/` is count-asserted by `dev/tools/check_refs.py`. A stray file there fails CI.
- Presets must apply through the sliders' own DOM events, never a parallel write path, or the
  panel will show pre-preset numbers.
- Nothing may flash faster than 3 Hz, everything must freeze under `prefers-reduced-motion`,
  and colour must never be the only signal.
- Never invent physics to fill a gap. Say it is absent instead. That discipline is the whole
  reason this project is worth showing to the paper's author.

## Credit, which is not negotiable

The concept is Blaise Gassend's (*Powering Climbers Using Mechanical Waves*, ISDC 2025). The
README's "The paper" section and `ATTRIBUTIONS.md` carry the full citation, his own link
ahead of the ISEC mirror, and the statement that he has not endorsed this and that any
errors in the derivation are ours. Prior work by Mark Wessels and Keith Lofstrom, and the
Zubax FluxGrip FG40 hardware, are credited the same way. Shorten the marketing copy as much
as you like; do not shorten that.
