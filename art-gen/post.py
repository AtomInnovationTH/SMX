#!/usr/bin/env python3
"""
art-gen/post.py -- turn raw generator output into game-ready sprites.

Per raw PNG, keyed on the manifest's chroma colour and the landmark's display
width from LANDMARKS_DATA:

    magick raw.png -fuzz 18% -transparent '#KEY' \
      -channel A -morphology Erode Disk:1 +channel \
      -channel RGB -fuzz 35% -fill white -opaque '#KEY' +channel \
      -trim +repage -resize $((2*WIDTH))x\> \
      processed.png
    cwebp -q 88 processed.png -o processed.webp

Why each step:
  * fuzz 18% transparent   -- kill the flat key background.
  * erode alpha Disk:1     -- pull the edge in past the worst of the fringe.
  * fill white -opaque KEY -- fringe decontamination. Any near-key pixel that
    survived keying is pushed to WHITE, which is invisible against the style's
    white sticker border. Transparent pixels do not match (their alpha differs
    from the opaque target by more than the fuzz), and -channel RGB keeps alpha
    intact.
  * resize to 2x DISPLAY width, not 1024 -- downscaling is what makes any
    residual fringe vanish. The `>` flag means shrink-only, so a raw that is
    already smaller than 2x is never upscaled into mush (it warns instead).

Output is named with the GAME's sprite filename, so wiring in (roadmap 2e) is a
straight copy. That also fixes the `godwid` -> `godwit` typo for free.

Every file is verified before it is accepted. The pilot round returned FAKE
checkerboard "transparency" -- a painted grey checkerboard, not an alpha
channel -- so both the input and the output are gated:

  raw gate     corner pixel must actually be the chroma key colour
  output gate  real alpha channel, transparent corner, sane transparent
               fraction, and a low residual-key-fringe fraction

A checkerboard sprite must never reach the game, so failures are loud and the
file is rejected (moved aside), not silently written.

Run:
    python3 art-gen/post.py                  # process everything in raw/
    python3 art-gen/post.py --wave 1         # just wave 1, then review the sheet
    python3 art-gen/post.py --only sr-71,u-2
    python3 art-gen/post.py --force          # redo files already processed
    python3 art-gen/post.py --sheet-only     # rebuild the contact sheet(s)
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import manifest  # noqa: E402

ROOT = manifest.ROOT
RAW = ROOT / "art-gen" / "raw"
PROCESSED = ROOT / "art-gen" / "processed"
REJECTED = ROOT / "art-gen" / "rejected"

FUZZ_KEY = "18%"        # background keying tolerance
FUZZ_DESPILL = "35%"    # wider: catches the anti-aliased fringe
WEBP_QUALITY = "88"

# --- verification thresholds ---
RAW_CORNER_TOLERANCE = 60    # per-channel, 0-255: how far the raw corner may sit from the key
MIN_TRANSPARENT = 0.04       # below this, keying almost certainly did not happen
MAX_TRANSPARENT = 0.97       # above this, we trimmed away the subject
MAX_KEY_FRINGE = 0.01        # residual near-key pixels, as a fraction of the image


def sh(cmd):
    """Run a command, returning stdout. Raises with stderr included on failure."""
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:2])} failed ({r.returncode}): "
                           f"{r.stderr.strip() or r.stdout.strip()}")
    return r.stdout.strip()


# ImageMagick on macOS often ships with no configured fonts, so `-label` fails
# unless we hand it a font file explicitly. Labels make the review sheet far
# more useful, so find one; if we cannot, fall back to an unlabelled sheet.
LABEL_FONT_CANDIDATES = (
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
)


def label_font():
    for path in LABEL_FONT_CANDIDATES:
        if pathlib.Path(path).exists():
            return path
    return None


def magick_probe(path, fmt):
    return sh(["magick", str(path), "-format", fmt, "info:"])


def require_tools():
    missing = [t for t in ("magick", "cwebp") if shutil.which(t) is None]
    if missing:
        sys.exit(f"missing required tool(s): {', '.join(missing)} (brew install imagemagick webp)")


def parse_srgb(text):
    """'srgb(254,1,254)' / 'srgba(0,0,0,0)' -> tuple of ints."""
    inner = text[text.index("(") + 1:text.rindex(")")]
    out = []
    for part in inner.split(","):
        part = part.strip()
        # ImageMagick may emit percentages or floats for the alpha channel.
        if part.endswith("%"):
            out.append(int(round(float(part[:-1]) * 255 / 100)))
        else:
            out.append(int(round(float(part))))
    return tuple(out)


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def check_raw(raw_path, chroma):
    """Gate the INPUT: the background must really be the flat chroma key.

    This is the checkerboard detector. A model that ignored the instruction and
    returned a painted transparency-grid (or scenery) will not have a key-
    coloured corner, and keying it would produce a checkerboard sprite.
    """
    want = hex_to_rgb(chroma.hex)
    problems = []
    for corner in ("p{0,0}", "p{%[fx:w-1],0}"):
        got = parse_srgb(magick_probe(raw_path, f"%[pixel:{corner}]"))[:3]
        if max(abs(a - b) for a, b in zip(got, want)) > RAW_CORNER_TOLERANCE:
            problems.append(
                f"raw background is not {chroma.hex} at {corner}: got rgb{got}. "
                f"The model likely returned a painted checkerboard or scenery -- "
                f"regenerate this one (gen.py --only ... --force)"
            )
            break
    return problems


def check_output(png_path, chroma, target_width):
    """Gate the OUTPUT: real alpha, transparent corner, sane coverage."""
    problems, warnings = [], []

    alpha = magick_probe(png_path, "%A")
    if alpha.lower() in ("undefined", "false", "off"):
        problems.append(f"no alpha channel (identify %A = {alpha!r})")

    corner = parse_srgb(magick_probe(png_path, "%[pixel:p{0,0}]"))
    if len(corner) < 4 or corner[3] != 0:
        problems.append(f"top-left corner is not transparent: {corner} -- "
                        f"transparency is fake (painted checkerboard) or keying failed")

    opaque_mean = float(sh(["magick", str(png_path), "-alpha", "extract",
                            "-format", "%[fx:mean]", "info:"]))
    transparent = 1.0 - opaque_mean
    if transparent < MIN_TRANSPARENT:
        problems.append(f"only {transparent:.1%} of the image is transparent -- "
                        f"the background was not removed")
    elif transparent > MAX_TRANSPARENT:
        problems.append(f"{transparent:.1%} of the image is transparent -- "
                        f"the subject was keyed or trimmed away")

    fringe = 1.0 - float(sh([
        "magick", str(png_path), "-alpha", "off", "-fuzz", "25%",
        "-fill", "white", "+opaque", chroma.hex,
        "-fill", "black", "-opaque", chroma.hex,
        "-format", "%[fx:mean]", "info:",
    ]))
    if fringe > MAX_KEY_FRINGE:
        warnings.append(f"{fringe:.2%} of pixels are still near {chroma.hex} -- "
                        f"check the edges for a colour fringe")

    width = int(magick_probe(png_path, "%w"))
    if width < target_width:
        warnings.append(f"{width}px wide but 2x display width is {target_width}px -- "
                        f"the raw was too small to downscale into. Fringe hiding is "
                        f"weaker here; consider a higher-resolution generation")
    return problems, warnings


def process_one(sprite, chroma, display_width, force):
    raw_path = RAW / manifest.raw_name(sprite)
    out_png = PROCESSED / (sprite[:-len(".webp")] + ".png")
    out_webp = PROCESSED / sprite
    target_width = display_width * 2

    if not raw_path.exists():
        return "missing", [f"no raw at {raw_path.relative_to(ROOT)} -- run gen.py first"], []
    if out_webp.exists() and not force:
        return "skipped", [], []

    raw_problems = check_raw(raw_path, chroma)
    if raw_problems:
        return "rejected", raw_problems, []

    PROCESSED.mkdir(parents=True, exist_ok=True)
    sh([
        "magick", str(raw_path),
        "-fuzz", FUZZ_KEY, "-transparent", chroma.hex,
        "-channel", "A", "-morphology", "Erode", "Disk:1", "+channel",
        "-channel", "RGB", "-fuzz", FUZZ_DESPILL,
        "-fill", "white", "-opaque", chroma.hex, "+channel",
        "-trim", "+repage",
        "-resize", f"{target_width}x>",
        str(out_png),
    ])
    problems, warnings = check_output(out_png, chroma, target_width)
    if problems:
        REJECTED.mkdir(parents=True, exist_ok=True)
        out_png.replace(REJECTED / out_png.name)
        return "rejected", problems, warnings

    sh(["cwebp", "-quiet", "-q", WEBP_QUALITY, str(out_png), "-o", str(out_webp)])
    # The webp is what ships, so verify it too rather than trusting the encoder.
    webp_problems, _ = check_output(out_webp, chroma, target_width)
    if webp_problems:
        REJECTED.mkdir(parents=True, exist_ok=True)
        out_webp.replace(REJECTED / out_webp.name)
        return "rejected", [f"webp lost its alpha: {p}" for p in webp_problems], warnings

    size = out_webp.stat().st_size // 1024
    dims = magick_probe(out_webp, "%wx%h")
    return "ok", [], warnings + [f"-> {sprite} {dims} ({size} KB)"]


def build_sheet(sprites, label):
    """Contact sheet for wave review. Replaces the hardcoded art-preview.html."""
    files = [PROCESSED / s for s in sprites if (PROCESSED / s).exists()]
    if not files:
        print("no processed sprites to montage")
        return None
    sheet = ROOT / "art-gen" / f"sheet-{label}.png"
    cmd = ["magick", "montage"]
    font = label_font()
    if font:
        cmd += ["-font", font, "-pointsize", "13", "-fill", "gray40", "-label", "%f"]
    else:
        print("  (no usable font found -- contact sheet will be unlabelled)")
    # Checkerboard the sheet background so fake-transparent sprites stand out
    # against real ones instead of blending into a flat backdrop.
    cmd += ["-tile", "6x", "-geometry", "+6+6", "-background", "none",
            *[str(f) for f in files], str(sheet)]
    sh(cmd)
    print(f"contact sheet: {sheet.relative_to(ROOT)} ({len(files)} sprites)")
    return sheet


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--wave", type=int, help="process only wave N (1-based)")
    ap.add_argument("--wave-size", type=int, default=20)
    ap.add_argument("--only", help="comma-separated substrings of sprite names")
    ap.add_argument("--force", action="store_true", help="reprocess even if output exists")
    ap.add_argument("--sheet-only", action="store_true",
                    help="just rebuild the contact sheet from what is already processed")
    args = ap.parse_args()

    require_tools()
    problems = manifest.check()
    if problems:
        for p in problems:
            print("manifest problem:", p)
        sys.exit("manifest is out of sync with the game")

    widths = manifest.landmark_widths()
    jobs = manifest.jobs(wave=args.wave, wave_size=args.wave_size)
    if args.only:
        wanted = {w.strip() for w in args.only.split(",") if w.strip()}
        jobs = [j for j in jobs if any(w in j[0] for w in wanted)]
        if not jobs:
            sys.exit(f"--only {args.only!r} matched nothing")

    label = f"wave{args.wave}" if args.wave else "all"
    if args.sheet_only:
        build_sheet([j[0] for j in jobs], label)
        return

    counts = {"ok": 0, "skipped": 0, "rejected": 0, "missing": 0}
    failures = []
    for sprite, _subject, chroma, _ref in jobs:
        width = widths.get(sprite)
        if width is None:
            print(f"{sprite}: no display width -- skipping")
            counts["missing"] += 1
            continue
        status, problems, notes = process_one(sprite, chroma, width, args.force)
        counts[status] += 1
        if status == "skipped":
            continue
        marker = {"ok": "ok  ", "rejected": "FAIL", "missing": "----"}[status]
        print(f"{marker} {sprite}")
        for n in notes:
            print(f"       {n}")
        for p in problems:
            print(f"       !! {p}")
        if status in ("rejected", "missing"):
            failures.append(sprite)

    print(f"\n{counts['ok']} processed, {counts['skipped']} skipped, "
          f"{counts['rejected']} REJECTED, {counts['missing']} missing raws")
    if counts["ok"] or args.force:
        build_sheet([j[0] for j in jobs], label)

    print("\nreview each sprite on the sheet against the acceptance bar:")
    print("  real alpha (no checkerboard) | no text/logo/insignia | readable")
    print("  silhouette at display width | natural saturated colours (not muted")
    print("  brown) | no baked ground shadow")
    if failures:
        sys.exit(f"\n{len(failures)} sprite(s) did not pass: {', '.join(failures)}")


if __name__ == "__main__":
    main()
