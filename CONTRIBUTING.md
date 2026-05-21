# Contributing

> ⚠️ **This project is archived and not actively maintained.** Issues and pull requests may not receive a response. **Forks are encouraged** — if you want to take it somewhere new, please do.

## If you still want to open a PR

The repo intentionally has no build pipeline beyond one Python script. To submit a change:

1. **Fork** the repo.
2. **Edit [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html)** — this is the source of truth. **Do not** edit [`index.html`](index.html) directly; it is a generated artifact.
3. **Run the embedder** to regenerate the build artifact:
   ```bash
   python3 embed_assets.py
   ```
4. **Commit both files** ([`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html) **and** [`index.html`](index.html)) in the same commit so the deployed game stays in sync with the source.
5. **Open a PR** against `main`. Expect slow or no response — your fork is the path forward.

## Bug reports

Use the issue template. At minimum include:

- Browser + version (e.g. Firefox 128, Chrome 130, Safari 17.5)
- Operating system
- Steps to reproduce
- Screenshot or short clip if visual

## Code style

- Match the existing style in [`Space_Monkey_Elevator.html`](Space_Monkey_Elevator.html) — 4-space indent, ES2020+, single file, no transpiler.
- **No new runtime dependencies.** No npm, no bundlers, no frameworks.
- **No new build tools** beyond the existing [`embed_assets.py`](embed_assets.py).
- Keep changes minimal and self-contained; the single-file architecture is a feature, not a bug.
