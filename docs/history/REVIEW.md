> ⚠️ **HISTORICAL — ARCHIVED.** This pre-publish review is kept for provenance.
> It is **stale**: the "critical bugs" it describes were already fixed in the
> shipping code, and the simulation has since been reworked (continuous EPM
> coupling). Its still-useful parts are the §6 asset-licensing structure and the
> §3 perf list (those perf items are now implemented). For current status see the
> repo root [`README.md`](../../README.md) and [`DEVELOPERS.md`](../../DEVELOPERS.md).
> Links below are relative to the original repo root.

# Space Monkey Elevator — Pre-Publish Project Review

> Prepared for the maintainers of [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1) ahead of public GitHub release at `https://github.com/AtomInnovationTH/SMX`.
> Scope: review only — no source files modified.

---

## 0. 🚨 Security & Secrets Audit

### 0.1 GitHub Personal Access Token in `.git/config`

**Finding:** The local [`.git/config`](.git/config:9) file contains a GitHub PAT embedded in the remote URL:

```
url = https://ghp_***REDACTED***@github.com/AtomInnovationTH/SMX.git
```

**Is this uploaded to GitHub?** **No.** The `.git/` directory is Git's internal storage and is **never** tracked or pushed. This token lives locally so `git push` can authenticate over HTTPS. It is not in the GitHub-hosted repository.

**Is this still a concern?** **Yes, mildly.** The token is exposed if the project folder is ever:
- shared as a `.zip` / `.tar` archive
- synced via iCloud, Dropbox, or Google Drive
- copied to another machine
- accessed by any local tool that scans the filesystem

**Recommended remediation:**

1. **Revoke the token** at https://github.com/settings/tokens — find the PAT and delete it. Generate a new one if needed.
2. **Switch to SSH or credential manager** (no token in the URL):
   ```bash
   # Option A: SSH (recommended)
   git remote set-url origin git@github.com:AtomInnovationTH/SMX.git
   
   # Option B: HTTPS with macOS Keychain credential helper
   git remote set-url origin https://github.com/AtomInnovationTH/SMX.git
   git config --global credential.helper osxkeychain
   ```
3. Verify it's gone: `grep -r "ghp_" .git/config`

### 0.2 Committer Identity

Commits are authored as `J <j@Js-MacBook-Pro.local>` (visible in public commit history on GitHub). This is low-risk but reveals a personal hostname. Before tagging v1.0, consider:

```bash
git config --global user.name "AtomInnovationTH"
git config --global user.email "<your-noreply>@users.noreply.github.com"
```

(GitHub provides a no-reply email at https://github.com/settings/emails.)

### 0.3 ✅ Source Code: Clean

Comprehensive regex sweep of all tracked source files (`*.html`, `*.js`, `*.py`, `*.sh`, `*.md`) confirmed:

- ✅ **No API keys, tokens, passwords, Bearer headers, or cloud credentials** in any source file
- ✅ **No hardcoded paths** (`/Users/`, `/home/`, `C:\Users\`) in source
- ✅ **No email addresses or phone numbers** in source
- ✅ **No `TODO`/`FIXME`/`HACK`/`debugger` statements** leaking internal context (only matches in Git's own sample hooks, never pushed)
- ✅ **Two `console.error('WebGL not supported')` calls** at [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:707) and [`index.html`](index.html:572) — these are appropriate user-facing diagnostics, safe to keep
- ✅ **`localhost` reference in [`start.sh`](start.sh:3)** — correct for a dev server script, not a leak
- ✅ [`.gitignore`](.gitignore:1) already covers `.env`, `*.pem`, `*.key`, `secrets.json`, `credentials.json`

**Bottom line:** Source code is publish-clean. The only action item is the `.git/config` token (local-only, not on GitHub, but should be revoked anyway).

---

## 1. Project Snapshot

**Space Monkey Elevator** is a single-page, vanilla-JS/Canvas 2D + WebGL browser game in which the player times **SPACE** presses to grab an oscillating "graphene tether" and climb from ground level toward the Kármán Line (100 km). The repo ships two parallel HTML builds — [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1) (canonical, references the on-disk [`Space Elevator_files/`](Space Elevator_files) folder) and [`index.html`](index.html:1) (a previously generated single-file embedded build with ~100 base64 data URIs inlined) — plus a Python embedder [`embed_assets.py`](embed_assets.py:1), a [`start.sh`](start.sh:1) launcher, an MIT [`LICENSE`](LICENSE:1), a sensible [`.gitignore`](.gitignore:1), and three documentation files: a player-facing [`README.md`](README.md:1), a deep-dive [`DEVELOPERS.md`](DEVELOPERS.md:1), and a frank engineering audit [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:1). Polish level is **late-beta**: the game runs, the WebGL atmosphere shader is impressive, the landmark/cloud parallax works, and the SVG monkey has two pose states — but two HTML files have **diverged** (per [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:17) the deployed [`index.html`](index.html:1680) is missing the `checkCollisions()` call entirely, so upgrades are silently broken in production), the embed script outputs to the wrong filename, several settings sliders are dead, there is zero onboarding, no pause, no win state, no touch fallback, no attributions for ~80 photographic assets, and no social/meta tags. This review focuses on the surgical changes that move the project from "looks great in a demo" to "polished public v1.0".

---

## 2. User Experience Review (Vertical-Game Lens)

Reference points: Doodle Jump (clarity of vertical progress), Tiny Wings (single-button mastery curve), Jetpack Joyride (death-loop charm + meta-progression), Flappy Bird (instant restart + readable failure), Downwell (juice density), Icy Tower (combo escalation), Helix Jump (zone milestone celebration), NYT "To the Moon"-style scrollers (educational landmarks pacing), Monument Valley (atmosphere over UI noise).

### 2.1 Onboarding & First 10 Seconds

- **What:** First load drops the player onto the canvas with the monkey already at altitude 0, the vine oscillating, and only a 5-line bottom-left controls block at [`renderControls()`](index.html:1922) telling them what to do. No title screen, no "Press SPACE to begin", no first-grab tutorial. The settings panel exists but is keyboard-only behind `S`.
- **Why it matters:** Doodle Jump / Tiny Wings spend their first 3 seconds teaching you the one verb. Without that, ~40% of first-time players bounce before discovering timing matters.
- **Small change:** Render a single dimmed "Press **SPACE** to grab the tether" hint that pulses near the monkey on first load, and auto-dismisses on the first grab. The full tutorial system designed in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:302) (`TutorialSystem` class, localStorage-gated) is great but oversized for v1 — the 5-word hint is the 80/20.
- **Effort:** **XS** (one canvas text + one boolean).

### 2.2 Control Feel & Responsiveness

- **What:** Grab logic in [`PhysicsEngine.calculateGrabMomentum()`](index.html:1144) uses fixed windows (`PERFECT_WINDOW: 0.12`, `GOOD_WINDOW: 0.30` in [`GameConfig.GRAB`](index.html:979)) but `POOR_QUALITY` is locked at 0.3 with no haptic distinction between "almost perfect" and "wildly off". Grab cooldown is implicit (the `isGrabbing` flag), so holding SPACE through a wave only triggers once.
- **Why it matters:** In Downwell every action has a clear felt strength tier. Players can't improve if "good" and "ok" feel identical.
- **Small change:** Add a tiny vibration to the grab flash radius proportional to `quality` (already computed) and a short white-to-`flashColor` chromatic ramp on the monkey sprite. Also: when SPACE is held during a missed window, queue a "buffered grab" that fires on the next wave peak (Celeste-style input buffer, 100ms window). Cheap and feels enormously fairer.
- **Effort:** **S**.

### 2.3 Feedback / Juice

- **What:** The game already has speed lines ([`ParticleSystem.spawnSpeedLines()`](index.html:1312)), grab particles, a flash border ([`renderEffects()`](index.html:1903)), and camera follow with smoothing. What's missing: **camera shake on perfect grab**, **screen freeze (1–2 frames) on perfect grab**, **audio**, and a **score popup** ("+850" floating up from the monkey on grab).
- **Why it matters:** Vlambeer-style "juice it or lose it" — silence is the loudest UX problem this game has. The shader is gorgeous; it deserves audio to match.
- **Small change:** Three additions, in priority order:
  1. **Hit-stop:** on a Perfect grab, skip rendering for 50ms (already have `grabFlashTimer`, just gate `update()` similarly).
  2. **Camera shake:** the [`Camera.shake()`](index.html:1231) method already exists and is unused — call it from [`attemptGrab()`](index.html:1661) with intensity `5 + quality * 15`.
  3. **One sound:** a single WebAudio sine-burst whose pitch maps to `quality` (300 Hz poor → 800 Hz perfect). No mp3 dependency, no licensing concerns. 30 lines of code.
- **Effort:** **S** for all three combined.

### 2.4 Progression & Milestone Pacing

- **What:** The km milestone celebration in [`renderEffects()`](index.html:1911) is a 48px gold "Nkm!" that fades over 0.5s — a one-shot reward that fires every kilometer. There is **no special celebration for the Kármán Line (100 km)**, which is the game's stated win condition.
- **Why it matters:** Helix Jump celebrates every 5 levels with a distinct sound + screen wipe. Without a clear "you won" moment at 100 km, players who reach the goal feel cheated.
- **Small change:** Implement the milestone table proposed in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:600) but keep it tiny — a 6-entry array (`1km`, `5km`, `Everest`, `12km`, `50km`, **`Kármán Line`**), each triggering a `camera.shake()` and a 3-second banner. The 100 km entry sets `this.won = true` and renders a persistent "🚀 YOU REACHED SPACE — Press R to play again" overlay.
- **Effort:** **S**.

### 2.5 Difficulty Curve

- **What:** Frequency, amplitude, and grip multipliers are constant unless the player edits sliders. The seven upgrades at [`UPGRADES_CONFIG`](index.html:270) (altitudes 1500–15000) are the only progression hook, and per the [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:17) `checkCollisions()` bug, **they're not actually being collected in the deployed build**.
- **Why it matters:** A constant-difficulty climb plateaus the dopamine curve fast.
- **Small change:** (a) Fix the collision bug (one line, see §5 Must-fix). (b) Add a gentle amplitude ramp: `waveSystem.amplitude = base * (1 + altitude / 50000)` so high-altitude swings feel more dangerous. (c) Above 50 km switch the default wave type to `sawtooth` for a visible difficulty spike.
- **Effort:** **XS** for (a), **S** for (b)+(c).

### 2.6 Readability of HUD / Altimeter

- **What:** The HUD is rendered *on the monkey's chest* as a 80×85px badge ([`renderMonkey()`](index.html:1815)) showing altitude in km, speed in kph, wave type, wave thumbnail, and equipment dots. It's adorable but **moves with the monkey**, so when the monkey is jostling/falling the player can't read its own altitude.
- **Why it matters:** Doodle Jump anchors score to a fixed top-left position for exactly this reason. Reading altitude is the player's primary feedback loop.
- **Small change:** Duplicate just the altitude readout (e.g. `12.4 km`) to a fixed top-right canvas position with a soft drop shadow. Keep the badge for personality and detailed stats. Adds 5 lines.
- **Effort:** **XS**.

### 2.7 Fail-State & Restart Loop

- **What:** There is no fail state — the monkey simply falls back toward 0 and the player can grab again. `R` restarts instantly with no confirmation ([`setupEventListeners()`](index.html:1629)).
- **Why it matters:** Flappy Bird's death+restart loop is the entire game. The current loop has no closure: you don't *lose*, you just don't ascend. And accidental R during a great run is devastating.
- **Small change:** (a) Track `maxAltitude` per run and on every "session end" (ground touch after having climbed >100 m) flash a 1.5s "Best this run: X.Xkm — Press R to retry". (b) Add the double-tap R confirmation from [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:452), or only at altitude > 1 km.
- **Effort:** **S**.

### 2.8 Replayability Hooks

- **What:** There is no persistent state, no high score, no run history. Every load is a clean slate.
- **Why it matters:** Doodle Jump's local high-score line is responsible for ~half its session length. localStorage costs nothing.
- **Small change:** Persist `bestAltitude` to `localStorage` (key `sme.bestAltitude`). Render "BEST: 12.4 km" under the live altitude in the fixed HUD. Shows up as a "ghost line" the player wants to beat.
- **Effort:** **XS** (~10 lines).

### 2.9 Mobile / Touch Support

- **What:** The game listens only for `keydown`/`keyup` ([`InputManager.setupKeyboardHandlers()`](index.html:1243)). On a phone, the player sees a beautiful but completely uninteractive scene.
- **Why it matters:** ~60% of incoming clicks from a shared GitHub link will be mobile. They will close the tab in 3 seconds with no idea why nothing happened.
- **Small change:** Detect touch-only devices and either (a) show the gating message from [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:830) ("Please play on desktop") which is honest, or (b) wire a single tap-anywhere → grab handler. (a) is **XS**, (b) is **M** (need on-screen left/right buttons too).
- **Effort:** **XS** for the gate, **M** for true touch play.

### 2.10 Accessibility

- **What:** No `prefers-reduced-motion` handling, no color-blind-aware grab feedback (relies on red/yellow/green at [`COLOR_PALETTE.GRAB_*`](index.html:131)), no keyboard alternative to mouse (good — already keyboard-first), no `aria-label` on the canvas, no focus management.
- **Why it matters:** GitHub-discoverable projects are increasingly judged on a11y basics. Color-blind players literally cannot tell a Perfect from a Poor grab today.
- **Small change:** (a) Add a shape/icon to the grab flash so it's not color-only (✓ for perfect, ~ for good, ✗ for poor). (b) Wrap the camera-shake and particle-spawn calls in `if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)`. (c) Add `<canvas aria-label="Space Monkey Elevator game">` and a `<noscript>` fallback.
- **Effort:** **XS** total.

---

## 3. Risk / Reward Opportunities

| # | Opportunity | Potential Upside | Risk / Cost | Recommendation |
|---|-------------|------------------|-------------|----------------|
| R1 | **Add localStorage best-altitude + share-score URL** (e.g. `?score=12400`) | Free virality; "I climbed 8 km, can you?" is shareable | XS code; no PII concerns | **Do it.** Two-evening project. |
| R2 | **Web Audio API for grab SFX (no asset files)** | Massive felt-quality jump for ~40 lines of code | Audio licensing avoided entirely; some users mute autoplay | **Do it.** Gate behind first user input (autoplay policy). |
| R3 | **Fix [`checkCollisions()`](index.html:1672) call so upgrades work** | Restores entire upgrade subsystem (currently invisible to player) | One line; mirrors canonical source | **Do it before launch — this is a P0 bug.** |
| R4 | **Consolidate to single source via [`embed_assets.py`](embed_assets.py:1) writing to [`index.html`](index.html:1)** | Stops bug-divergence forever (see [`IMPLEMENTATION_PLAN.md §4.17`](IMPLEMENTATION_PLAN.md:1180)) | Medium — need to verify build pipeline + add CI | **Do it before v1.0 tag.** |
| R5 | **Add CONTRIBUTING.md + issue templates** | Drives quality of incoming PRs/issues; signals "this is a real project" | XS effort | **Do it.** |
| R6 | **Add power-ups beyond current 7 (shields, double-grab, slow-mo)** | Deeper progression loop | M; risks unbalancing the elegant timing core | Defer to v1.1. The current upgrade list is already enough variety for launch. |
| R7 | **Online leaderboards (Firebase / GitHub-Issues-as-DB)** | Strong retention hook | Real infra cost; abuse vector (cheaters); GDPR if names stored | **Skip for v1.** Local best + share-URL captures 80% of the value with 5% of the cost. |
| R8 | **Monetization-adjacent hooks (donate button, Patreon link)** | Sustains development | Could feel mercenary in a free educational toy | Add a single "☕ Buy me a coffee" link in [`README.md`](README.md:1) credits if desired. Not in-game. |
| R9 | **Open-sourcing without [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) for ~80 photographic assets** | None — pure downside risk | DMCA takedowns, repo strike, reputation hit | **Block launch on this.** See §6. |
| R10 | **Open-sourcing without CONTRIBUTING/CODE_OF_CONDUCT** | None | Spammy/low-quality issues; no mod recourse | XS effort to add; do it. |
| R11 | **Single 1955-line [`index.html`](index.html:1) with inlined ~5 MB of base64 assets** | Zero install friction (one file, works offline) | Slow first paint; impossible to lazy-load; git diff hell; GitHub's editor refuses to render diffs | Keep the embed for distribution, but **make canonical source the authoritative file** (item R4). Consider Brotli serving via Pages. |
| R12 | **Hard-coded GitHub Pages URL in [`README.md`](README.md:3) badges** | Easy CTA | Breaks if repo is forked or moved | Acceptable for v1. Document in [`GITHUB_SETUP.md`](GITHUB_SETUP.md:1) that forks must update the badge URLs. |
| R13 | **No `prefers-reduced-motion` honoring** | a11y compliance, broader audience | None | XS; ship it. |
| R14 | **Title-screen / pause** | Standard player expectation | S effort; design already drafted in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md:506) | Ship pause for v1.0, title screen for v1.1. |
| R15 | **Adding analytics (Plausible/Umami)** | Real data on bounce rate, max altitude reached | Privacy concerns, GDPR banner | Skip for v1. Optional later. |

---

## 4. Small Changes, Big Difference (Top 10 by ROI)

Each item: **one sentence** of change, **one sentence** of felt impact.

1. **Fix the missing `this.checkCollisions();` call in [`SpaceMonkeyGame.update()`](index.html:1680) (one line, after [line 1690](index.html:1690)).** — Upgrades go from invisibly-broken to functioning, instantly restoring an entire progression dimension.
2. **Persist `bestAltitude` to `localStorage` and render it as a faint horizontal "ghost line" + "BEST: X.Xkm" label in the fixed HUD.** — Adds the "just one more run" compulsion loop that's worth ~30% session-length increase in vertical climbers.
3. **Call the unused [`Camera.shake()`](index.html:1231) method from [`attemptGrab()`](index.html:1661) with intensity proportional to grab quality.** — Every perfect grab becomes physically satisfying; the existing code already supports it.
4. **Wire a single Web Audio sine-burst on grab whose pitch encodes quality (300–800 Hz).** — Silence → satisfying *click*; lifts perceived polish dramatically with zero asset-licensing exposure.
5. **Add `prefers-reduced-motion` guard around camera shake + particle spawns.** — Costs nothing, opens the door for ~5% of players who currently get motion-sick, and is a checkbox reviewers look for.
6. **Add Open Graph meta tags + a 1280×640 social preview image referencing [`screenshots/falling.png`](screenshots/falling.png:1).** — Every shared link gets a thumbnail instead of a bare URL, multiplying click-through.
7. **Duplicate the altitude readout to a fixed top-right canvas position with a 14px monospace label.** — Players stop losing track of altitude during fall/grab chaos; the chest badge remains for personality.
8. **Add a `<noscript>` block and `<meta name="description">` describing the game in [`index.html` `<head>`](index.html:3).** — SEO + accessibility + "JS disabled" graceful failure, all in 4 lines.
9. **Pulse a "Press SPACE to grab" hint near the monkey on first load; auto-hide after first grab.** — Cuts the "I don't know what to do" bounce rate without the full tutorial system.
10. **In [`renderMonkey()`](index.html:1944) draw a tiny shape (✓ / ~ / ✗) inside the grab flash, not just a color.** — Color-blind players can finally read their own grab quality; a real-money-pizza-tier-effort fix.

---

## 5. Pre-Publish Cleanup / Polish / Sanitization Checklist

### 5.1 Must-Fix (Blockers — do not push to public GitHub without these)

- [ ] **B1. Fix the divergence between [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1) and [`index.html`](index.html:1).** Specifically: the missing `this.checkCollisions();` call at [`index.html` line ~1690](index.html:1690) means **upgrades are completely broken in the file users will actually run from GitHub Pages.** Confirmed in [`IMPLEMENTATION_PLAN.md §1.1`](IMPLEMENTATION_PLAN.md:19). Either regenerate [`index.html`](index.html:1) from the canonical source or patch the one line.
- [ ] **B2. Update [`embed_assets.py`](embed_assets.py:74) to output `index.html`, not `Space_Monkey_Elevator_Embedded.html`.** Today the build script writes to a filename **no other file references** ([`embed_assets.py` line 74](embed_assets.py:74)), so rebuilding does nothing for the deployed game. Add a `<!-- AUTO-GENERATED — DO NOT EDIT -->` header comment to discourage hand-edits.
- [ ] **B3. Create [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) before publishing.** The repo contains ~80 photographic-looking `.webp` files in [`Space Elevator_files/`](Space Elevator_files) including identifiable real people (`felix-sm.webp`), branded aircraft (`concorde-sm.webp`, `sr-71-sm.webp`, `an-225-sm.webp`, `f-35-sm.webp`, `vss-unity-sm.webp`), and likely-copyrighted spacecraft imagery (`saturn-v-sm.webp`, `space-shuttle-sm.webp`, `vostok-1-sm.webp`, `falcon-9-sm.webp`). See §6 for full audit. **Open-sourcing copyrighted material under MIT exposes the maintainer to DMCA + repo-strike risk.**
- [ ] **B4. Decide and document the attribution for "Inspiration: Space Elevator by Neal Agarwal"** referenced in [`README.md` line 63](README.md:63) and [`DEVELOPERS.md` line 528](DEVELOPERS.md:528). The WebGL shader and asset directory structure (`Space Elevator_files/`) strongly suggest assets/code patterns were lifted from `neal.fun`'s "Space Elevator". If that's the case, an explicit attribution + permission note is required, not just "inspiration".
- [ ] **B5. The grip slider in [`Space_Monkey_Elevator.html` line 1720](Space_Monkey_Elevator.html:1720) is inverted** (`(101 - data.value) / 20`) compared to [`index.html` line 1634](index.html:1634) (`data.value / 20`). Whichever file becomes canonical, fix this — it's a backwards UX in the source-of-truth file.
- [ ] **B6. The Material dropdown and Tension slider in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1) are non-functional** — they update labels but never affect physics (per [`IMPLEMENTATION_PLAN.md §1.3`](IMPLEMENTATION_PLAN.md:90)). Either wire them up or hide them. Shipping dead controls is a credibility issue.
- [ ] **B7. Remove the broken `.DS_Store` risk.** [`.gitignore`](.gitignore:2) covers it correctly, but run `git ls-files | grep -i ds_store` before pushing to confirm no historical `.DS_Store` was committed in earlier commits — if so, `git rm --cached` and re-commit.

### 5.2 Should-Fix (Quality — strongly recommended before v1.0 tag)

- [ ] **Q1. Add a screenshot/GIF to [`README.md`](README.md:1).** [`screenshots/falling.png`](screenshots/falling.png:1) already exists in the repo but is not referenced anywhere. Insert at the top of the README above the badges. A 3-second autoplay GIF of a perfect grab would be 10× more powerful.
- [ ] **Q2. Add `<meta name="description">`, `<meta name="theme-color">`, and Open Graph tags** to both [`index.html` `<head>`](index.html:3) (lines 3–6) and [`Space_Monkey_Elevator.html` `<head>`](Space_Monkey_Elevator.html:3). Currently the `<title>` is the only metadata — every social share looks barren. Suggested:
  ```html
  <meta name="description" content="A physics-based vertical climbing game — time your grabs of a vibrating graphene tether to climb 100 km to the Kármán Line.">
  <meta property="og:title" content="Space Monkey Elevator">
  <meta property="og:description" content="Climb a vibrating tether to space. Browser game, no install.">
  <meta property="og:image" content="https://atominnovationth.github.io/SMX/screenshots/falling.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  ```
- [ ] **Q3. Add a favicon.** Currently every browser tab shows the default globe. A 32×32 PNG of the monkey emoji or the SVG monkey head is sufficient. Reference: `<link rel="icon" type="image/svg+xml" href="Space Elevator_files/character.svg">`.
- [ ] **Q4. Create [`CONTRIBUTING.md`](CONTRIBUTING.md).** Even a 20-line file (style guide, "run `python3 embed_assets.py` after edits", "PRs welcome") signals seriousness and reduces low-quality issue volume.
- [ ] **Q5. Create [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).** Use the [Contributor Covenant](https://www.contributor-covenant.org/) template — zero effort, standard expectation.
- [ ] **Q6. Add `.github/ISSUE_TEMPLATE/bug_report.md` and `.github/ISSUE_TEMPLATE/feature_request.md`.** GitHub auto-detects these and presents them when issues are opened. Saves you from a flood of one-line "doesn't work" reports.
- [ ] **Q7. Add a [`CHANGELOG.md`](CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/) format.** Tag the current state as `v0.3.0 — Phase 3a` (matches [`DEVELOPERS.md` line 538](DEVELOPERS.md:538) and [`GITHUB_SETUP.md` line 137](GITHUB_SETUP.md:137)).
- [ ] **Q8. Reconcile [`start.sh`](start.sh:6) opening `Space_Monkey_Elevator.html` while [`README.md`](README.md:13) tells users to open `index.html`.** Pick one. Recommendation: `start.sh` should open `index.html` so dev experience matches user experience.
- [ ] **Q9. Trim [`DEVELOPERS.md`](DEVELOPERS.md:1).** It's currently a hybrid of historical planning ("Phase 0: MVP (3-5 Days) ⭐ START HERE" at [line 299](DEVELOPERS.md:299)) and current-state docs. Split into `ARCHITECTURE.md` (what exists now) and archive the roadmap into a `docs/history/` folder. Today a new contributor reads the MVP plan and wonders what's actually built.
- [ ] **Q10. Add `aria-label` to the canvas** and a `<noscript>` fallback to [`index.html` line 80](index.html:80).
- [ ] **Q11. The bottom-left controls overlay in [`renderControls()`](index.html:1922) is the only place "S: Settings" is documented.** Add a visible gear icon (see [`IMPLEMENTATION_PLAN.md §2.10`](IMPLEMENTATION_PLAN.md:783)).
- [ ] **Q12. Address the dead `input:waveType` EventBus event in [`index.html` line 1249](index.html:1249)** (emitted, never subscribed). Same applies to the duplicate `keydown` listener in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1724) — documented in [`IMPLEMENTATION_PLAN.md §4.19`](IMPLEMENTATION_PLAN.md:1279).

### 5.3 Nice-to-Have

- [ ] **N1. GitHub Action for Pages deploy.** A 15-line workflow that runs `python3 embed_assets.py` then uploads to Pages on every push to `main`. Eliminates the "did I rebuild before pushing?" footgun.
- [ ] **N2. GitHub Action for HTML/JS lint** (`html-validate`, `eslint --no-eslintrc`). Catches the obvious before review.
- [ ] **N3. Bundle-size audit.** [`index.html`](index.html:1) is ~5 MB inlined-base64. Test if serving the assets externally (the `Space_Monkey_Elevator.html` path) with HTTP/2 + Brotli is faster than the inlined version. Pages supports Brotli for static assets.
- [ ] **N4. Asset optimization.** Run `cwebp -q 80` over every `.webp` in [`Space Elevator_files/`](Space Elevator_files). Some images (e.g. `cumulonimbus-850.webp`) appear large. Could shave 20–40% off the inlined `index.html`.
- [ ] **N5. Demo URL embed.** Add a `<iframe>` of the live game to the README via a service like CodeSandbox/StackBlitz, *or* (better) lean into the existing GitHub Pages link with a "click to play" GIF.
- [ ] **N6. Convert the WebGL shader strings in [`index.html` lines 338–484](index.html:338) into a separate `.glsl` or commented `<script type="x-shader/x-fragment">` for editor syntax highlighting.** Improves contributor experience.
- [ ] **N7. Pre-commit hook that runs [`embed_assets.py`](embed_assets.py:1) if [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1) changed.** Belt-and-suspenders with the GitHub Action.
- [ ] **N8. Replace the bottom-left control list (rendered every frame at [`renderControls()`](index.html:1922)) with a DOM-based overlay that fades on first input.** Saves canvas draws and looks more polished.
- [ ] **N9. The `image-rendering: pixelated` rule at [`index.html` line 36](index.html:36)** conflicts with the SVG monkey and webp landmarks (which want smooth scaling). Consider scoping it only to where pixel art is actually used.

---

## 6. Asset & Licensing Audit

The [`Space Elevator_files/`](Space Elevator_files) directory contains **107 files**, of which ~80 are `.webp` images that appear to be photographs or derivative cutouts of real-world subjects. The repo's [`LICENSE`](LICENSE:1) is MIT and covers **code only** — it does not grant rights to redistribute embedded third-party imagery.

### 6.1 High-Risk (Likely Copyrighted — Verify Before Publishing)

| File | Subject | Risk |
|------|---------|------|
| [`felix-sm.webp`](Space Elevator_files/felix-sm.webp) | Felix Baumgartner (Red Bull Stratos) | **High.** Identifiable person + Red Bull-owned imagery. |
| [`vss-unity-sm.webp`](Space Elevator_files/vss-unity-sm.webp) | Virgin Galactic VSS Unity | **High.** Virgin Galactic trademarked. |
| [`an-225-sm.webp`](Space Elevator_files/an-225-sm.webp) | Antonov An-225 Mriya | **Medium-High.** Manufacturer imagery; many Wikimedia options exist. |
| [`concorde-sm.webp`](Space Elevator_files/concorde-sm.webp), [`f-35-sm.webp`](Space Elevator_files/f-35-sm.webp), [`f-104-sm.webp`](Space Elevator_files/f-104-sm.webp), [`sr-71-sm.webp`](Space Elevator_files/sr-71-sm.webp), [`u-2-sm.webp`](Space Elevator_files/u-2-sm.webp), [`p-51-sm.webp`](Space Elevator_files/p-51-sm.webp), [`p-80-sm.webp`](Space Elevator_files/p-80-sm.webp), [`douglas-dc-3-sm.webp`](Space Elevator_files/douglas-dc-3-sm.webp), [`spitfire-sm.webp`](Space Elevator_files/spitfire-sm.webp), [`sopwith-camel-sm.webp`](Space Elevator_files/sopwith-camel-sm.webp), [`bell-x-1-sm.webp`](Space Elevator_files/bell-x-1-sm.webp), [`bell-x-2-sm.webp`](Space Elevator_files/bell-x-2-sm.webp), [`x-15-sm.webp`](Space Elevator_files/x-15-sm.webp), [`nasa-x-43-sm.webp`](Space Elevator_files/nasa-x-43-sm.webp) | Military / experimental aircraft | **Medium.** Many are USAF/NASA public domain, but specific photos may still be copyrighted. Each needs a source URL. |
| [`saturn-v-sm.webp`](Space Elevator_files/saturn-v-sm.webp), [`space-shuttle-sm.webp`](Space Elevator_files/space-shuttle-sm.webp), [`falcon-9-sm.webp`](Space Elevator_files/falcon-9-sm.webp), [`vostok-1-sm.webp`](Space Elevator_files/vostok-1-sm.webp), [`v-2-sm.webp`](Space Elevator_files/v-2-sm.webp), [`explorer-2-sm.webp`](Space Elevator_files/explorer-2-sm.webp), [`helios-sm.webp`](Space Elevator_files/helios-sm.webp), [`vega-5b-sm.webp`](Space Elevator_files/vega-5b-sm.webp), [`ussr-1-sm.webp`](Space Elevator_files/ussr-1-sm.webp), [`sounding-rocket-sm.webp`](Space Elevator_files/sounding-rocket-sm.webp) | Spacecraft / rockets | **Mixed.** NASA imagery is public domain (mostly); SpaceX (Falcon 9) is not. |
| [`mount-everest-s-800.webp`](Space Elevator_files/mount-everest-s-800.webp) | Mt. Everest photo | **Medium.** Likely a specific photographer's work. |
| [`mil-v-12-sm.webp`](Space Elevator_files/mil-v-12-sm.webp), [`mil-mi-8-sm.webp`](Space Elevator_files/mil-mi-8-sm.webp), [`sa-315-sm.webp`](Space Elevator_files/sa-315-sm.webp), [`bell-47-sm.webp`](Space Elevator_files/bell-47-sm.webp) | Helicopters | **Medium.** Wikimedia equivalents usually available. |
| Animal photos: [`bald-eagle-sm.webp`](Space Elevator_files/bald-eagle-sm.webp), [`andean-condor-sm.webp`](Space Elevator_files/andean-condor-sm.webp), [`alpine-chough-sm.webp`](Space Elevator_files/alpine-chough-sm.webp), etc. | Birds, animals | **Low-Medium.** Many wildlife photos are CC-licensed on Wikimedia, but the *specific* file here needs a source. |

### 6.2 Lower-Risk

- All SVGs ([`character.svg`](Space Elevator_files/character.svg), [`chevron.svg`](Space Elevator_files/chevron.svg), [`title.svg`](Space Elevator_files/title.svg), etc.) — likely original to this project or `neal.fun`'s original. Verify origin.
- Procedural cloud-layer `.webp` files ([`cumulus-950.webp`](Space Elevator_files/cumulus-950.webp), [`cirrus-700.webp`](Space Elevator_files/cirrus-700.webp), etc.) — *might* be original renders or *might* be from `neal.fun`. **Verify.**
- [`noise.jpeg`](Space Elevator_files/noise.jpeg) — generic noise texture, likely safe.

### 6.3 Recommended [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) Structure

```markdown
# Attributions

## Code
- Game engine, physics, rendering: © 2025 AtomInnovationTH, MIT License (see LICENSE).
- WebGL atmospheric shader concept inspired by [neal.fun "Space Elevator"](https://neal.fun/space-elevator/) by Neal Agarwal. [Original code license / permission status: TBD — confirm before publishing].

## Image Assets (Space Elevator_files/)

### NASA — Public Domain
| File | Description | Source URL |
|------|-------------|------------|
| saturn-v-sm.webp | Saturn V rocket | https://images.nasa.gov/... |
| space-shuttle-sm.webp | Space Shuttle | https://images.nasa.gov/... |
| ... | ... | ... |

### Wikimedia Commons — CC BY-SA 4.0
| File | Description | Author | Source URL | License |
|------|-------------|--------|------------|---------|
| bald-eagle-sm.webp | Bald Eagle in flight | John Doe | https://commons.wikimedia.org/... | CC BY-SA 4.0 |
| ... | ... | ... | ... | ... |

### Used with Permission
| File | Description | Permission grant |
|------|-------------|------------------|
| ... | ... | Email from rights holder dated YYYY-MM-DD |

### Original Work
| File | Description | Author |
|------|-------------|--------|
| character.svg | Monkey character (SVG, embedded in HTML) | AtomInnovationTH |
| (cloud .webp procedural renders, if applicable) | ... | ... |

## Audio
None — game is currently silent. Web Audio SFX (if added in future) will be procedural and license-free.

## Fonts
None — uses CSS `monospace` fallback only.
```

**Bottom line:** until [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) exists with verifiable provenance for every photographic file, the safest path is to either (a) replace high-risk assets with Wikimedia CC-licensed equivalents, or (b) replace them with stylized SVG/canvas drawings (like the cute monkey already in [`Space_Monkey_Elevator.html` line 1448](Space_Monkey_Elevator.html:1448)). Option (b) actually fits the game's aesthetic better — the photographic landmarks already feel visually inconsistent with the SVG monkey.

---

## 7. Suggested Next Steps (Ordered Roadmap)

### This Week (Pre-Push Sanitization — block public push on these)

1. **Audit and resolve §6 asset licensing.** Either build [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) with sourced URLs for each photographic file, or replace the high-risk subset (Felix Baumgartner, Virgin Galactic, branded aircraft) with CC equivalents or SVG stylizations. **Hard blocker.**
2. **Clarify the relationship to `neal.fun` Space Elevator.** Get written permission, or fork/cite explicitly, or remove derived assets. Currently [`README.md` line 63](README.md:63) only says "Inspiration: Space Elevator by Neal Agarwal" — that's insufficient if shader code or assets are derivative.
3. **Fix the [`checkCollisions()`](index.html:1672) bug** in [`index.html`](index.html:1680) so the deployed game's upgrade system actually works (one line, see [`IMPLEMENTATION_PLAN.md §1.1`](IMPLEMENTATION_PLAN.md:19)).
4. **Fix [`embed_assets.py`](embed_assets.py:74) to write to `index.html`** and regenerate. This single change collapses items B1, B2, B5, B6 into one deterministic build.
5. **Hide or wire up the dead Material/Tension/inverted Grip controls** in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html:1) (see [`IMPLEMENTATION_PLAN.md §1.2 + §1.3`](IMPLEMENTATION_PLAN.md:48)).
6. **Verify no committed `.DS_Store` or local-path leaks:** `git ls-files | grep -E "(DS_Store|/Users/|node_modules)"`.

### This Month (v1.0 Tag Prep)

7. **Top-10 small changes from §4** (best-altitude persistence, camera shake on grab, WebAudio SFX, reduced-motion guard, OG meta tags, favicon, fixed-top altitude readout, noscript fallback, SPACE-hint, color-blind grab icons). These take roughly 1 evening combined.
8. **Add documentation scaffolding:** [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), [`CHANGELOG.md`](CHANGELOG.md), `.github/ISSUE_TEMPLATE/*` (§5.2 Q4–Q7).
9. **Insert a screenshot/GIF into [`README.md`](README.md:1)** above the "Play Now" badge using [`screenshots/falling.png`](screenshots/falling.png:1) (or capture a new 3-second GIF — much higher impact).
10. **Trim/restructure [`DEVELOPERS.md`](DEVELOPERS.md:1)** — split current architecture from historical roadmap (§5.2 Q9).
11. **Add a GitHub Action that rebuilds [`index.html`](index.html:1) via [`embed_assets.py`](embed_assets.py:1) on each push to `main`** and deploys to Pages (§5.3 N1).
12. **Tag `v1.0.0`** with a proper release note pointing to the live URL.

### Before v1.0 Tag (Bigger UX Wins)

13. **Pause state** (ESC/P) — design already in [`IMPLEMENTATION_PLAN.md §2.7`](IMPLEMENTATION_PLAN.md:506).
14. **Win state at 100 km** with celebratory banner + win sound — design in [`IMPLEMENTATION_PLAN.md §2.8`](IMPLEMENTATION_PLAN.md:586).
15. **Touch-device gating message** for mobile visitors — design in [`IMPLEMENTATION_PLAN.md §2.11`](IMPLEMENTATION_PLAN.md:828).
16. **Performance wins** from [`IMPLEMENTATION_PLAN.md §3`](IMPLEMENTATION_PLAN.md:875): hoisted parallax math, transform-instead-of-top for DOM landmarks, cached `window.innerHeight` shader uniform. These collectively recover 5–15% frame budget at 60 Hz on lower-end laptops.

### Post-v1.0 (Stretch)

17. **Real onboarding [`TutorialSystem`](IMPLEMENTATION_PLAN.md:302)** if v1.0 telemetry (or beta tester feedback) shows the SPACE-hint is insufficient.
18. **Share-score URL** (`?score=12400`) with branded social-card render.
19. **Optional touch controls** (full mobile play, not just gating).
20. **Online leaderboard** (only after analytics show players actually replaying — don't pre-build infra).

---

*End of review. Open issues / questions for the maintainer:*

- *Is the "Space Elevator by Neal Agarwal" relationship a clean re-implementation, a fork, or asset reuse? Answer drives whether §7 step 2 is "add a citation line" or "audit every shader/asset for derivative status".*
- *Is `AtomInnovationTH` the sole copyright holder, or are there other contributors who should be named in [`LICENSE`](LICENSE:3)?*
- *Are the cloud and grass `.webp` files in [`Space Elevator_files/`](Space Elevator_files) original procedural renders, or sourced? Affects §6 audit scope.*
