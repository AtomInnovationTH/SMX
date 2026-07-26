# Space Monkey Elevator 🚀🐵

**Play it:** [atominnovationth.github.io/SMX](https://atominnovationth.github.io/SMX/)

**Space Monkey Elevator — a contactless space-elevator-climber simulation, reaching the Kármán line.**

<!-- TODO: replace with a 10–15s gameplay GIF when one is available -->
![Space Monkey Elevator — falling back to Earth](screenshots/falling.png)

You play an up-climber riding a graphene space-elevator seed tether from sea level to the Kármán Line (100 km). A ground station beams **longitudinal (compression) waves** up the tether, and the monkey's hands are **electro-permanent magnets (EPMs)** that *pulse* to couple to them — no physical contact. Tap `SPACE` in time with the wave's peak velocity to gain upward momentum while regeneratively powering your magnets.

---

## How it works (the concept)

> A ground station beams longitudinal (compression) waves up a conductive graphene/CNT space-elevator seed tether. An up-climber rides them contactlessly: its electro-permanent-magnet hands pulse to induce eddy currents in the moving tether, coupling at peak wave velocity to gain upward momentum while regeneratively skimming &lt;10% of that energy to power the magnets. It carries cargo (tether material) toward the Kármán Line. Waves fade with altitude, so a stronger tether material reaches higher. Down-climbers — which would brake regeneratively on descent and reinforce the tether — are the next chapter.

The cute monkey is intentional: it keeps people open-minded about a genuinely novel propulsion concept. The playable climb stops at the **Kármán Line (100 km)**; in reality the seed tether continues to **geostationary orbit (35,786 km)** and a counterweight beyond, where effective gravity flips outward — that part is shown as context on the finish screen, not simulated.

---

## Quick start

Three ways to play:

1. **Clone and open** — zero dependencies, any modern browser:
   ```bash
   git clone https://github.com/AtomInnovationTH/SMX.git
   cd SMX
   open index.html
   ```
   `index.html` loads the landmark sprites from the `Space Elevator_files/` folder (present in the clone). If your browser blocks those local files under `file://`, use the local dev server below.
2. **Local dev server** — serve the folder and open the same build artifact GitHub Pages serves:
   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000/index.html
   ```
   To preview edits to the source before rebuilding, open `http://localhost:8000/Space_Monkey_Elevator.html` at the same server.
3. **GitHub Pages** — open the live demo link at the top of this README (once Pages is enabled on your fork).

---

## Controls

| Key | Action |
|---|---|
| `Space` | Pulse your EPM hands to couple to the wave (hold to keep pulsing; time it to the wave's peak velocity) |
| `←` / `→` | Move left / right while pulsing |
| `R` | Restart run |
| `S` | Toggle settings panel |
| `C` | Toggle Okabe-Ito colorblind palette |
| `M` | Toggle sound (starts muted) |
| `Esc` / `P` | Pause / resume |
| `1` / `2` / `3` | Switch wave type — sine / square / sawtooth |
| `K` | Switch to the legacy "classic grab" model (hidden backup) |
| ⚙ button (top-right) | Open settings panel (same as `S`) |

---

## Features

- **Milestone shake + particles** triggered when the player crosses a milestone altitude
- **Named landmarks** along the climb — Burj Khalifa → Mt. Everest → Kármán Line → ISS Orbit
- **Ghost-line PB tracker** — best altitude persisted in `localStorage` and drawn as a horizontal target line
- **Coyote time + input buffering** (`COYOTE_MS` / `BUFFER_MS` in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html)) so near-miss pulses still feel fair
- **One-button restart** (`R`) with a clear game-over state
- **`prefers-reduced-motion`** honored — camera shake and particle bursts are suppressed automatically
- **Okabe-Ito colorblind palette** toggle (`C`) — coupling quality is no longer colour-only

---

## Building from source

The repo ships two HTML files at the root:

- [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html) — **editable source of truth**. References assets in [`Space Elevator_files/`](Space%20Elevator_files).
- [`index.html`](index.html) — **committed build artifact**, auto-generated (do not hand-edit). The statically-referenced assets (clouds, the monkey SVG, noise textures) are inlined as base64 data URIs. The ~70 landmark sprites are referenced through a runtime-built path, so they are **not** inlined and still load from [`Space Elevator_files/`](Space%20Elevator_files). `index.html` must therefore be served **alongside** that folder (as it is on GitHub Pages); it is not a standalone offline single file.

To rebuild after editing the source:

```bash
python3 embed_assets.py
```

This regenerates [`index.html`](index.html) by inlining the statically-referenced assets from [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html). The landmark sprites are skipped (their path is built at runtime) and continue to load from [`Space Elevator_files/`](Space%20Elevator_files). Commit **both** files together.

---

## Project structure

```
.
├── index.html                   # the game (served by Pages, alongside the assets folder)
├── Space Elevator_files/        # runtime assets (.webp, .svg) — landmark sprites load from here
├── Space_Monkey_Elevator.html   # editable source (this is what you edit)
├── embed_assets.py              # build script: source → index.html
├── tests/                       # zero-dependency Node unit tests (node --test)
├── screenshots/                 # README / social imagery
├── docs/                        # DEVELOPERS, CHANGELOG, setup guide, archived planning docs
├── .github/                     # CI workflow, issue/PR templates, CONTRIBUTING, CODE_OF_CONDUCT
├── LICENSE                      # MIT
└── README.md                    # you are here
```

---

## Credits

- Original concept: Space Monkey climbing game.
- Technologies: vanilla JavaScript, Canvas 2D, WebGL atmosphere shader.
- Inspiration: ["Space Elevator" by Neal Agarwal](https://neal.fun/space-elevator/). The *concept* — climbing past real-world landmarks toward the Kármán Line — is a tribute to that page. The **code in this repo is original and independently written** and does not reuse neal.fun's source. The original *Space Elevator* concept and its artwork are **© Neal Agarwal**. (Game mechanics and concepts are not themselves copyrightable; Neal's specific assets are.)

> ⚠️ **Artwork status — action required before redistribution.** The imagery currently in [`Space Elevator_files/`](Space%20Elevator_files) originates from neal.fun's *Space Elevator* and is **© Neal Agarwal**. It is **not licensed for redistribution** and is **not** covered by this repository's MIT license. These assets are being replaced with original and CC-licensed art; until that work is complete, this repo should not be redistributed or deployed. Tracking: [`docs/v1.0-roadmap.md`](docs/v1.0-roadmap.md) Phase 0; audit in [`docs/history/REVIEW.md`](docs/history/REVIEW.md) §6.

---

## License

[MIT License](LICENSE) — see [`LICENSE`](LICENSE) for the full text. **The MIT grant covers this project's original code only.** It does **not** cover the imagery currently in [`Space Elevator_files/`](Space%20Elevator_files), which remains **© Neal Agarwal** and is not licensed for redistribution (see the artwork note above).

---

> ⚠️ **Project status: archived / not actively maintained.** Issues and PRs may not receive responses. Forks are welcome — see [CONTRIBUTING.md](.github/CONTRIBUTING.md).
