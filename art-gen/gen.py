#!/usr/bin/env python3
"""
art-gen/gen.py -- generate original game sprites via OpenRouter image models.

Subjects, chroma keys and reference policy live in art-gen/manifest.py.

Reference handling: references are OFF by default. Words alone define a condor
or a Cessna, and every attachment weakens the "not derivative" position, so only
a few wide hero pieces (Everest, Saturn V, Space Shuttle) still attach one to
match in-game framing. When a reference IS attached the prompt explicitly
forbids copying its colours, textures and details.

Key: read from env OPENROUTER_API_KEY or a local (gitignored) .env file.

Run:
    python3 art-gen/gen.py pilot                 # 5 samples to dial in the look
    python3 art-gen/gen.py all --wave 1          # first reviewable wave of 20
    python3 art-gen/gen.py all --yes             # the whole batch (78 jobs)
    python3 art-gen/gen.py all --only sr-71,u-2  # named subjects only
    python3 art-gen/gen.py all --wave 2 --force  # re-generate, ignoring cache

Safe to interrupt and re-run: anything already in art-gen/raw/ is skipped, so a
crash at job 60 never re-bills the first 59. Permanent failures are appended to
art-gen/failed.txt and the batch continues.
"""
import argparse
import base64
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import manifest  # noqa: E402

ROOT = manifest.ROOT
RAW = ROOT / "art-gen" / "raw"
FAILED = ROOT / "art-gen" / "failed.txt"
MODEL = os.environ.get("ART_MODEL", "google/gemini-3-pro-image")
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

# Above this many jobs in one run, require an explicit --yes. Each job is a
# billed image generation, so an accidental full-batch run is real money.
CONFIRM_ABOVE = 25
RETRIES = 3
BACKOFF = 4  # seconds, doubling


def load_key():
    k = os.environ.get("OPENROUTER_API_KEY")
    if k:
        return k.strip()
    envf = ROOT / ".env"
    if envf.exists():
        for line in envf.read_text().splitlines():
            if line.startswith("OPENROUTER_API_KEY"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("No OPENROUTER_API_KEY (set env or put it in ./.env)")


STYLE = (
    "Render in an ORIGINAL flat cartoon 'sticker' style: bold clean shapes, crisp "
    "cel shading with 3-4 tones per colour, a thin dark-sepia outline, a clean "
    "white sticker border, gentle top-left lighting, and a strong silhouette that "
    "stays readable at small sizes. Use the subject's NATURAL, VIBRANT, saturated "
    "real-world colours -- rich and lively, never muted, never sepia, never "
    "monochrome brown. Do NOT include any real-world logos, brand names, "
    "insignia, roundels, flags or text. Centered, whole subject visible with "
    "generous margin."
)


def prompt_for(subject, key_phrase, with_ref):
    parts = [f"Create a single game sprite of {subject}. "]
    if with_ref:
        parts.append(
            "Use the attached reference image ONLY to match overall pose, "
            "orientation, silhouette proportions and framing. Do NOT copy its "
            "colours, textures, shading or fine details -- invent a fresh "
            "depiction. "
        )
    parts.append(STYLE)
    parts.append(
        f" Place it on a SOLID FLAT UNIFORM {key_phrase} background filling the "
        "entire canvas -- absolutely NO checkerboard pattern, no gradient, no "
        "scenery, no transparency grid. No baked-in ground shadow, no frame. "
        "Square image."
    )
    return "".join(parts)


def data_uri(path):
    ext = path.suffix.lstrip(".").lower().replace("jpg", "jpeg")
    return f"data:image/{ext};base64," + base64.b64encode(path.read_bytes()).decode()


class NoImageReturned(Exception):
    """The model replied with text instead of an image -- worth retrying."""


def request_image(subject, ref, key, key_phrase):
    content = [{"type": "text", "text": prompt_for(subject, key_phrase, ref is not None)}]
    if ref is not None:
        content.append({"type": "image_url", "image_url": {"url": data_uri(ref)}})
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": content}],
        "modalities": ["image", "text"],
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/AtomInnovationTH/SMX",
            "X-Title": "Space Monkey art greenfield",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    msg = resp["choices"][0]["message"]
    imgs = msg.get("images") or []
    if not imgs:
        raise NoImageReturned(str(msg.get("content"))[:200])
    return base64.b64decode(imgs[0]["image_url"]["url"].split(",", 1)[1])


def generate(subject, ref, out_path, key, key_phrase):
    """Generate one sprite, retrying transient failures. Returns path or None."""
    delay = BACKOFF
    for attempt in range(1, RETRIES + 1):
        try:
            data = request_image(subject, ref, key, key_phrase)
        except NoImageReturned as e:
            reason = f"no image returned (text: {e})"
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode()[:200]
            except Exception:
                pass
            reason = f"HTTP {e.code} {detail}"
            if e.code in (401, 402, 403):
                # Bad key or out of credit: retrying cannot help and burns time.
                print(f"  FATAL: {reason}")
                raise SystemExit("aborting batch -- fix credentials/credit first")
        except Exception as e:
            reason = f"{type(e).__name__}: {e}"
        else:
            out_path.write_bytes(data)
            print(f"  saved {out_path.relative_to(ROOT)} "
                  f"({out_path.stat().st_size // 1024} KB)")
            return out_path
        if attempt < RETRIES:
            print(f"  attempt {attempt}/{RETRIES} failed: {reason} -- retrying in {delay}s")
            time.sleep(delay)
            delay *= 2
        else:
            print(f"  attempt {attempt}/{RETRIES} failed: {reason} -- GIVING UP")
            with FAILED.open("a") as fh:
                fh.write(f"{out_path.name}\t{reason}\n")
    return None


PILOT_SPRITES = [
    "andean-condor-sm.webp",
    "cessna-sm.webp",
    "hotair-balloon-sm.webp",
    "flamingo-sm.webp",
    "monarch-butterfly-sm.webp",
]


def select_jobs(args):
    if args.mode == "pilot":
        jobs = [(s, manifest.SUBJECTS[s], manifest.chroma_for(s), manifest.ref_for(s))
                for s in PILOT_SPRITES]
    else:
        jobs = manifest.jobs(wave=args.wave, wave_size=args.wave_size)
    if args.only:
        wanted = {w.strip() for w in args.only.split(",") if w.strip()}
        jobs = [j for j in jobs if any(w in j[0] for w in wanted)]
        if not jobs:
            sys.exit(f"--only {args.only!r} matched nothing")
    return jobs


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", nargs="?", default="pilot", choices=["pilot", "all"])
    ap.add_argument("--wave", type=int,
                    help="generate only wave N (1-based) so waves stay reviewable")
    ap.add_argument("--wave-size", type=int, default=20)
    ap.add_argument("--only", help="comma-separated substrings of sprite names")
    ap.add_argument("--force", action="store_true",
                    help="re-generate even if the raw PNG already exists")
    ap.add_argument("--yes", action="store_true",
                    help=f"confirm a run of more than {CONFIRM_ABOVE} billed jobs")
    ap.add_argument("--dry-run", action="store_true",
                    help="list what would be generated and exit (no API calls, no cost)")
    args = ap.parse_args()

    problems = manifest.check()
    if problems:
        for p in problems:
            print("manifest problem:", p)
        sys.exit("manifest is out of sync with the game -- fix before generating")

    RAW.mkdir(parents=True, exist_ok=True)
    jobs = select_jobs(args)

    todo, skipped = [], []
    for sprite, subject, chroma, ref in jobs:
        out = RAW / manifest.raw_name(sprite)
        if out.exists() and not args.force:
            skipped.append(sprite)
        else:
            todo.append((sprite, subject, chroma, ref, out))

    total_waves = -(-len(manifest.SUBJECTS) // args.wave_size)
    scope = f"wave {args.wave}/{total_waves}" if args.wave else args.mode
    print(f"model={MODEL}  scope={scope}")
    print(f"{len(jobs)} selected, {len(skipped)} already generated (skipping), "
          f"{len(todo)} to generate")
    if skipped and args.dry_run:
        print("  skipping:", ", ".join(skipped))

    if args.dry_run:
        for sprite, subject, chroma, ref, _ in todo:
            print(f"  {sprite:<28} {chroma.hex} ref={'yes' if ref else 'no':<3} "
                  f"{subject[:44]}...")
        return

    if not todo:
        print("nothing to do (use --force to re-generate)")
        return

    if len(todo) > CONFIRM_ABOVE and not args.yes:
        sys.exit(f"{len(todo)} billed generations is above the {CONFIRM_ABOVE}-job "
                 f"guard. Re-run with --yes, or use --wave N to work in waves.")

    key = load_key()
    ok = failed = 0
    started = time.time()
    for i, (sprite, subject, chroma, ref, out) in enumerate(todo, 1):
        print(f"[{i}/{len(todo)}] {out.name}  ({ok} ok, {failed} failed, "
              f"{int(time.time() - started)}s elapsed)")
        print(f"    {subject[:70]}...")
        if generate(subject, ref, out, key, chroma.phrase):
            ok += 1
        else:
            failed += 1
        time.sleep(1)

    print(f"\ndone: {ok} generated, {failed} failed, {len(skipped)} skipped")
    if failed:
        print(f"permanent failures logged to {FAILED.relative_to(ROOT)} -- "
              f"re-run the same command to retry just those")
    print("next: python3 art-gen/post.py  (key, trim, resize, verify alpha)")


if __name__ == "__main__":
    main()
