# Space Monkey Elevator 🚀🐵

**Play it:** [atominnovationth.github.io/SMX](https://atominnovationth.github.io/SMX/)

**Space Monkey Elevator — a vertical climbing game about reaching the Kármán line.**

<!-- TODO: replace with a 10–15s gameplay GIF when one is available -->
![Space Monkey Elevator — falling back to Earth](screenshots/falling.png)

Physics-based vertical climbing game where you ride a vibrating graphene tether from sea level to the Kármán Line (100 km). Time your `SPACE` presses to the wave peaks for maximum momentum.

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
2. **Local dev server** — run [`start.sh`](start.sh), which launches `python3 -m http.server` on port `8000` and opens [`index.html`](index.html) (the same build artifact GitHub Pages serves) in your browser:
   ```bash
   ./start.sh
   ```
   To preview edits to the source before rebuilding, open `http://localhost:8000/Space_Monkey_Elevator.html` at the same server.
3. **GitHub Pages** — open the live demo link at the top of this README (once Pages is enabled on your fork).

---

## Controls

| Key | Action |
|---|---|
| `Space` | Grab / release the tether (hold during a missed window to buffer the next grab) |
| `←` / `→` | Move left / right while grabbing |
| `R` | Restart run |
| `S` | Toggle settings panel |
| `C` | Toggle Okabe-Ito colorblind palette |
| `Esc` / `P` | Pause / resume |
| `1` / `2` / `3` | Switch wave type — sine / square / sawtooth |
| ⚙ button (top-right) | Open settings panel (same as `S`) |

---

## Features

- **Milestone shake + particles** triggered when the player crosses a milestone altitude
- **Named landmarks** along the climb — Burj Khalifa → Mt. Everest → Kármán Line → ISS Orbit
- **Ghost-line PB tracker** — best altitude persisted in `localStorage` and drawn as a horizontal target line
- **Coyote time + input buffering** (`COYOTE_MS` / `BUFFER_MS` in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html)) so near-miss grabs still feel fair
- **One-button restart** (`R`) with a clear game-over state
- **`prefers-reduced-motion`** honored — camera shake and particle bursts are suppressed automatically
- **Okabe-Ito colorblind palette** toggle (`C`) — grab quality is no longer colour-only

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
├── Space_Monkey_Elevator.html   # editable source (this is what you edit)
├── index.html                   # build artifact, most assets inlined (served by Pages alongside the assets folder)
├── embed_assets.py              # build script: source → index.html
├── start.sh                     # dev launcher (python3 http.server on :8000)
├── Space Elevator_files/        # source assets (.webp, .svg) used by the editable HTML
├── screenshots/                 # README / social imagery
├── REVIEW.md                    # pre-publish engineering review
├── LICENSE                      # MIT
└── README.md                    # you are here
```

---

## Credits

- Original concept: Space Monkey climbing game.
- Technologies: vanilla JavaScript, Canvas 2D, WebGL atmosphere shader.
- Inspiration: ["Space Elevator" by Neal Agarwal](https://neal.fun/space-elevator/). This project is an independent **clean-room re-implementation** inspired by that page; it does not reuse its code, and its imagery assets are separately licensed.

<!-- TODO: create ATTRIBUTIONS.md with per-asset sourcing for the photographic .webp files in Space Elevator_files/ before any wide redistribution — see REVIEW.md §6 -->
Per-asset attributions for the photographic imagery in [`Space Elevator_files/`](Space%20Elevator_files) are pending in a future `ATTRIBUTIONS.md`. See [REVIEW.md](REVIEW.md) §6 for the audit.

---

## License

[MIT License](LICENSE) — see [`LICENSE`](LICENSE) for the full text. The MIT grant covers the **code only**; embedded image assets are subject to their original licenses (see the attributions note above).

---

> ⚠️ **Project status: archived / not actively maintained.** Issues and PRs may not receive responses. Forks are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
