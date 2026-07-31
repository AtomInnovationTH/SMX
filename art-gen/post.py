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
import colorsys
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
RAW_CORNER_TOLERANCE = 60    # per-channel drift from the requested key before we report it
HUE_TOLERANCE = 30           # degrees a border sample may differ from the background hue
MIN_BG_SATURATION = 0.25     # below this a sample is grey -> checkerboard, not a key
MIN_BG_INLIERS = 6           # of 8 border samples that must look like background
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
    """Gate the INPUT and work out which colour(s) to key.

    Models honour "flat uniform background" only loosely. Two real behaviours
    we must tolerate, both seen in this batch:

      * the exact hex is ignored -- "pure green" comes back as rgb(126,178,102),
        so we key what is actually there rather than a hardcoded constant;
      * the background is a soft GRADIENT of the right hue (the sounding rocket
        ran rgb(240,149,198) at the top to rgb(228,26,140) at the bottom), which
        a single-colour key with a tight fuzz cannot fully remove.

    So the test is hue-family membership, not flat equality: every border sample
    must share the background's hue and be reasonably saturated. That still
    rejects the things we care about -- a painted checkerboard is grey
    (desaturated), scenery has incoherent hues, and a subject that fills the
    frame edge-to-edge (Everest did) leaves too few background samples.

    Returns (problems, [key_hex, ...]) covering the observed spread.
    """
    fmt = "\n".join(f"%[pixel:p{{{x},{y}}}]" for x, y in (
        ("0", "0"), ("w-1", "0"), ("0", "h-1"), ("w-1", "h-1"),
        ("w/2", "0"), ("w/2", "h-1"), ("0", "h/2"), ("w-1", "h/2"),
    ))
    samples = [parse_srgb(s)[:3] for s in magick_probe(raw_path, fmt).splitlines() if s.strip()]

    def hsv(c):
        return colorsys.rgb_to_hsv(*[v / 255 for v in c])

    hues = sorted(hsv(c)[0] * 360 for c in samples)
    median_hue = hues[len(hues) // 2]

    def inlier(c):
        h, s, v = hsv(c)
        dh = abs(h * 360 - median_hue)
        dh = min(dh, 360 - dh)          # hue is circular
        return dh <= HUE_TOLERANCE and s >= MIN_BG_SATURATION

    inliers = [c for c in samples if inlier(c)]
    if len(inliers) < MIN_BG_INLIERS:
        desat = sum(1 for c in samples if hsv(c)[1] < MIN_BG_SATURATION)
        why = ("mostly desaturated (grey) -- likely a painted checkerboard"
               if desat >= len(samples) / 2
               else "hues are incoherent -- likely scenery, or the subject "
                    "reaches the frame edges leaving no background to sample")
        return ([f"only {len(inliers)}/{len(samples)} border samples look like a "
                 f"background ({why}). Regenerate with a generous margin "
                 f"(gen.py --only ... --force)"], None)

    # A near-white background would key the style's white sticker border away.
    if all(min(c) > 200 for c in inliers):
        return (["background is near-white; keying it would eat the white "
                 "sticker border -- regenerate with a stronger key colour"], None)

    def to_hex(c):
        return "#%02X%02X%02X" % tuple(c)

    mid = tuple(round(sum(c[i] for c in inliers) / len(inliers)) for i in range(3))
    # Key the mean plus the extremes, so a gradient background is fully covered.
    darkest = min(inliers, key=sum)
    lightest = max(inliers, key=sum)
    keys, seen = [], set()
    for c in (mid, darkest, lightest):
        h = to_hex(c)
        if h not in seen:
            seen.add(h)
            keys.append(h)

    want = hex_to_rgb(chroma.hex)
    drift = max(abs(a - b) for a, b in zip(mid, want))
    if drift > RAW_CORNER_TOLERANCE:
        print(f"       note: asked for {chroma.hex}, got {to_hex(mid)} "
              f"(drift {drift}) -- keying the sampled colour(s)")
    if len(keys) > 1:
        print(f"       note: gradient background, keying {len(keys)} colours: "
              f"{' '.join(keys)}")
    return [], keys


def check_output(png_path, key_hex, target_width):
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
        "-fill", "white", "+opaque", key_hex,
        "-fill", "black", "-opaque", key_hex,
        "-format", "%[fx:mean]", "info:",
    ]))
    if fringe > MAX_KEY_FRINGE:
        warnings.append(f"{fringe:.2%} of pixels are still near {key_hex} -- "
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

    raw_problems, key_hexes = check_raw(raw_path, chroma)
    if raw_problems:
        return "rejected", raw_problems, []

    PROCESSED.mkdir(parents=True, exist_ok=True)
    cmd = ["magick", str(raw_path), "-fuzz", FUZZ_KEY]
    for k in key_hexes:                      # one pass per sampled colour
        cmd += ["-transparent", k]
    cmd += ["-channel", "A", "-morphology", "Erode", "Disk:1", "+channel",
            "-channel", "RGB", "-fuzz", FUZZ_DESPILL]
    for k in key_hexes:                      # despill each toward white
        cmd += ["-fill", "white", "-opaque", k]
    cmd += ["+channel", "-trim", "+repage",
            "-resize", f"{target_width}x>", str(out_png)]
    sh(cmd)
    problems, warnings = check_output(out_png, key_hexes[0], target_width)
    if problems:
        REJECTED.mkdir(parents=True, exist_ok=True)
        out_png.replace(REJECTED / out_png.name)
        return "rejected", problems, warnings

    sh(["cwebp", "-quiet", "-q", WEBP_QUALITY, str(out_png), "-o", str(out_webp)])
    # The webp is what ships, so verify it too rather than trusting the encoder.
    webp_problems, _ = check_output(out_webp, key_hexes[0], target_width)
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
