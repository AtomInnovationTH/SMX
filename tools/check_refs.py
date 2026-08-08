#!/usr/bin/env python3
"""
tools/check_refs.py -- prove every asset reference in the game resolves to a
file on disk, and that assets/ contains nothing the game never references.

Tests cannot catch asset 404s (paths are built at runtime), so this script is
the static half of that gate; the headless browser harness is the dynamic half.

All FIVE reference forms are covered -- a checker that misses one lies:

  | form                                        | source location        | inlined?  |
  |---------------------------------------------|------------------------|-----------|
  | CSS url('assets/X')                         | :59-61 (grid, grass,   | yes       |
  |                                             |  noise)                |           |
  | <link rel="icon" href="assets/X">           | :22 (character.svg)    | yes       |
  | ASSET_BASE_PATH + 'X'                       | :1264-1275 (12 clouds) | yes (const|
  |                                             |                        |  deleted) |
  | src="assets/${landmark.sprite}" resolved    | :1369 via              | NO        |
  |   through LANDMARKS_DATA                    | :680-776               |           |
  | THERMAL_ASSET_BASE + s.sprite / +'X'        | :2444-2451 (3 suits +  | NO        |
  |                                             |  thermometer)          |           |

The naive regex assets/([A-Za-z0-9._-]+) deliberately does NOT match
`assets/${landmark.sprite}` ($ and { are outside the class) or the bare
`THERMAL_ASSET_BASE = 'assets/'` -- which is exactly why those two forms need
their own resolvers, and exactly the trap an ad-hoc grep falls into (it once
reported live thermometer.svg as dead).

Acceptance (v1.0) -- this arithmetic closes exactly:
  16 inlined (4 literal-path + 12 clouds) + 78 landmark files
  + 3 suits + 1 thermometer = 98 distinct referenced = 98 files in assets/,
  0 orphans, 0 missing.

If the art changes on purpose, update EXPECTED below in the same commit.
If a number moves and the art did not change, the PARSER is wrong, not the repo.

index.html is checked SEPARATELY: the two tiny assets must have become data:
URIs, the heavy art (clouds via ASSET_BASE_PATH, ground, noise) must still be
referenced by path, and every runtime form must resolve on disk -- the deploy
publishes index.html + assets/, so a file missing from disk is a live 404.

Exit 0 = clean. Exit 1 = at least one unresolved reference, orphan, or a
parser-sanity failure. Dependency-free, deterministic (all output sorted).
Run from anywhere: paths resolve relative to this file's repo root.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "Space_Monkey_Elevator.html")
BUILD = os.path.join(ROOT, "index.html")
ASSETS = os.path.join(ROOT, "assets")

# The v1.0 closure. landmark_entries (79) != landmark_files (78) because
# falcon-9-sm.webp is shared by two entries.
EXPECTED = {
    "literal": 4,          # grid.svg, grass.webp, noise.jpeg, character.svg
    "inlined_in_build": 2, # of those, only the tiny two are inlined: grid + character
    "streamed_literals": ["grass.webp", "noise.jpeg"],   # stream from assets/ instead
    "clouds": 12,          # streamed too, via the surviving ASSET_BASE_PATH const
    "landmark_entries": 79,
    "landmark_files": 78,
    "suits": 3,
    "thermometer": 1,
    "total": 98,           # distinct referenced == files on disk
}

LITERAL_RE = re.compile(r"assets/([A-Za-z0-9._-]+)")
CLOUD_RE = re.compile(r"ASSET_BASE_PATH \+ ['\"]([^'\"]+)['\"]")
THERMAL_RE = re.compile(r"THERMAL_ASSET_BASE \+ ['\"]([^'\"]+)['\"]")
SPRITE_RE = re.compile(r"sprite:\s*'([^']+)'")


def extract_array(text, marker):
    """Slice the `[...]` literal that follows `marker`, quote-aware."""
    start = text.find(marker)
    if start == -1:
        raise ValueError(f"marker not found: {marker!r}")
    open_at = text.find("[", start)
    if open_at == -1:
        raise ValueError(f"no '[' after marker: {marker!r}")
    depth = 0
    quote = None
    i = open_at
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "'\"`":
            quote = ch
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[open_at:i + 1]
        i += 1
    raise ValueError(f"unbalanced brackets after marker: {marker!r}")


def parse_source(text):
    """Resolve all five reference forms in one HTML text (source or build)."""
    literal = LITERAL_RE.findall(text)
    clouds = CLOUD_RE.findall(text)
    landmarks_block = extract_array(text, "LANDMARKS_DATA")
    suits_block = extract_array(text, "SUITS:")
    landmark_sprites = SPRITE_RE.findall(landmarks_block)
    suit_sprites = SPRITE_RE.findall(suits_block)
    thermal = THERMAL_RE.findall(text)
    return {
        "literal": literal,
        "clouds": clouds,
        "landmark_sprites": landmark_sprites,
        "suit_sprites": suit_sprites,
        "thermal": thermal,
        # Cross-form sanity: every `sprite: '` in the file is either a
        # landmark or a suit. Today that is 79 + 3 = 82.
        "sprite_attr_total": len(SPRITE_RE.findall(text)),
    }


def main():
    problems = []
    notes = []

    with open(SOURCE, encoding="utf-8") as f:
        src = f.read()
    with open(BUILD, encoding="utf-8") as f:
        build = f.read()

    on_disk = {fn for fn in os.listdir(ASSETS)
               if os.path.isfile(os.path.join(ASSETS, fn))}

    p = parse_source(src)

    # ---- parser sanity: the five numbers --------------------------------
    def expect(key, got, want):
        if got != want:
            problems.append(
                f"parser sanity: {key} = {got}, expected {want} -- if the art "
                f"did not just change on purpose, the parser is wrong")
        else:
            notes.append(f"{key}: {got}")

    expect("literal", len(p["literal"]), EXPECTED["literal"])
    expect("clouds", len(p["clouds"]), EXPECTED["clouds"])
    expect("landmark_entries", len(p["landmark_sprites"]),
           EXPECTED["landmark_entries"])
    landmark_files = set(p["landmark_sprites"])
    expect("landmark_files", len(landmark_files), EXPECTED["landmark_files"])
    expect("suits", len(p["suit_sprites"]), EXPECTED["suits"])
    expect("thermometer", len(p["thermal"]), EXPECTED["thermometer"])
    if p["sprite_attr_total"] != len(p["landmark_sprites"]) + len(p["suit_sprites"]):
        problems.append(
            f"parser sanity: {p['sprite_attr_total']} `sprite: '` attributes "
            f"in file but LANDMARKS_DATA + SUITS parse to "
            f"{len(p['landmark_sprites'])} + {len(p['suit_sprites'])} -- "
            f"a sprite entry escaped both resolvers")

    # ---- the core closure: referenced vs disk ----------------------------
    inlined = set(p["literal"]) | set(p["clouds"])
    runtime = landmark_files | set(p["suit_sprites"]) | set(p["thermal"])
    referenced = inlined | runtime
    expect("total", len(referenced), EXPECTED["total"])

    missing = sorted(referenced - on_disk)
    orphans = sorted(on_disk - referenced)
    if missing:
        problems.append(f"{len(missing)} referenced file(s) missing from "
                        f"assets/: {', '.join(missing)}")
    if orphans:
        problems.append(f"{len(orphans)} orphan file(s) in assets/ referenced "
                        f"by nothing: {', '.join(orphans)}")
    if len(on_disk) != EXPECTED["total"]:
        problems.append(f"{len(on_disk)} files in assets/, expected "
                        f"{EXPECTED['total']}")

    # ---- index.html, separately ------------------------------------------
    # Only the tiny assets are inlined as data: URIs. The heavy art (clouds, ground,
    # noise) streams from assets/, so those literals SHOULD survive -- inlining them
    # made index.html 1.8 MB and delayed play until all of it downloaded.
    build_literals = sorted(set(LITERAL_RE.findall(build)))
    unexpected = [f for f in build_literals if f not in EXPECTED["streamed_literals"]]
    if unexpected:
        problems.append(f"index.html references unexpected literal assets/ path(s): "
                        f"{', '.join(unexpected)} -- expected only "
                        f"{', '.join(EXPECTED['streamed_literals'])}")
    absent = [f for f in EXPECTED["streamed_literals"] if f not in build_literals]
    if absent:
        problems.append(f"index.html lost streamed literal(s) {', '.join(absent)} -- "
                        f"the ground/noise art would never load")
    if "const ASSET_BASE_PATH" not in build:
        problems.append("index.html dropped ASSET_BASE_PATH -- the streamed clouds "
                        "reference it, so CloudSystem would throw at boot")
    data_uris = build.count("data:image/")
    if data_uris != EXPECTED["inlined_in_build"]:
        problems.append(f"index.html contains {data_uris} data:image/ URIs, "
                        f"expected exactly {EXPECTED['inlined_in_build']}")

    # The two non-inlined forms survive in the build AND still resolve on disk.
    if "assets/${landmark.sprite}" not in build:
        problems.append("index.html lost the `assets/${landmark.sprite}` "
                        "landmark template -- runtime loading is broken")
    if "THERMAL_ASSET_BASE" not in build:
        problems.append("index.html lost THERMAL_ASSET_BASE -- suit and "
                        "thermometer loading is broken")
    bp = parse_source(build)
    if set(bp["landmark_sprites"]) != landmark_files:
        problems.append("index.html LANDMARKS_DATA sprites differ from the "
                        "source -- the build is stale")
    if set(bp["suit_sprites"]) != set(p["suit_sprites"]):
        problems.append("index.html SUITS sprites differ from the source -- "
                        "the build is stale")
    build_missing = sorted((set(bp["landmark_sprites"])
                            | set(bp["suit_sprites"])
                            | set(bp["thermal"])) - on_disk)
    if build_missing:
        problems.append(f"index.html runtime form(s) with no file on disk "
                        f"(would 404 live): {', '.join(build_missing)}")

    # ---- report ------------------------------------------------------------
    print("check_refs: Space_Monkey_Elevator.html + index.html vs assets/")
    for n in notes:
        print(f"  ok   {n}")
    print(f"  ok   distinct referenced: {len(referenced)} "
          f"({len(inlined)} inlined + {len(runtime)} runtime), "
          f"{len(on_disk)} files on disk, "
          f"{len(missing)} missing, {len(orphans)} orphans")
    print(f"  ok   index.html: {data_uris} data:image/ URIs, "
          f"{len(build_literals)} surviving assets/ literals, "
          f"runtime forms resolve on disk")
    if problems:
        print("\nFAILURES:", file=sys.stderr)
        for prob in problems:
            print(f"  FAIL {prob}", file=sys.stderr)
        return 1
    print("check_refs: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
