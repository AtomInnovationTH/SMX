#!/usr/bin/env python3
import base64
import re
import os
import sys

# The one place the asset folder is named. Every other reference below is
# derived from this, so a future rename touches a single line.
ASSET_DIR = 'assets'

# Read the original HTML file
with open('Space_Monkey_Elevator.html', 'r') as f:
    html = f.read()

# Work out which files the source can actually reference as a literal path.
# Anything referenced only through a runtime-built path (e.g. the ~78 landmark
# sprites via `${ASSET_BASE_PATH}${sprite}`, or suit sprites via string
# concatenation) can never match a `html.replace('assets/<name>', ...)` call,
# so reading and base64-encoding them is wasted work on every build. Find the
# candidates FIRST, then encode only those.
referenced = set(re.findall(rf"{re.escape(ASSET_DIR)}/([A-Za-z0-9._-]+)", html))
# ASSET_BASE_PATH + 'filename' references are inlined by name later, so include
# those filenames too.
referenced |= set(re.findall(r"ASSET_BASE_PATH \+ ['\"]([^'\"]+)['\"]", html))

# Guard (shift 7, task 14): every referenced literal filename must exist on disk. The
# encode loop below only visits on-disk, referenced files, so a typo'd/missing filename
# would otherwise produce NO output and NO warning while silently stripping the reference.
# Fail loudly here instead of shipping a broken artifact.
on_disk = {
    fname for fname in os.listdir(ASSET_DIR)
    if os.path.isfile(os.path.join(ASSET_DIR, fname))
}
missing_refs = referenced - on_disk
if missing_refs:
    print(f"ERROR: assets referenced in source are missing on disk under '{ASSET_DIR}/':")
    for name in sorted(missing_refs):
        print(f"  - {name}")
    sys.exit(1)

assets = {}
skipped = []
for filename in sorted(os.listdir(ASSET_DIR)):
    filepath = os.path.join(ASSET_DIR, filename)
    if not os.path.isfile(filepath):
        continue
    if filename not in referenced:
        # Loaded at runtime via a built path; embedding it is a no-op.
        skipped.append(filename)
        continue

    with open(filepath, 'rb') as f:
        data = f.read()

    # Determine MIME type
    ext = filename.lower().split('.')[-1]
    mime_types = {
        'webp': 'image/webp',
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'svg': 'image/svg+xml',
        'gif': 'image/gif'
    }
    mime = mime_types.get(ext, 'application/octet-stream')

    # Create data URI
    b64 = base64.b64encode(data).decode('utf-8')
    data_uri = f'data:{mime};base64,{b64}'

    # Store with the path as it appears in HTML
    asset_path = f'{ASSET_DIR}/{filename}'
    assets[asset_path] = data_uri
    print(f'Encoded: {filename} ({len(data)} bytes)')

print(f'Skipped {len(skipped)} runtime-loaded files (not inlined by design)')

# Replace all asset references
replacements = 0
for path, data_uri in assets.items():
    prev_len = len(html)
    # Replace in url() references
    html = html.replace(f"url('{path}')", f"url('{data_uri}')")
    html = html.replace(f'url("{path}")', f'url("{data_uri}")')
    html = html.replace(f"url({path})", f"url({data_uri})")

    # Replace in src attributes
    html = html.replace(f"src=\"{path}\"", f'src="{data_uri}"')
    html = html.replace(f"src='{path}'", f'src="{data_uri}"')

    # Replace string references (for JavaScript)
    html = html.replace(f"'{path}'", f"'{data_uri}'")
    html = html.replace(f'"{path}"', f'"{data_uri}"')

    if len(html) != prev_len:
        replacements += 1

# Guard (shift 7, task 14): the literal-path loop must have replaced at least one
# reference. If it replaced nothing, the source's reference format has changed under
# this build script — fail loudly rather than silently emit a stale artifact.
if replacements == 0:
    print("ERROR: no literal asset references were replaced — the source's reference")
    print("       format likely changed. Update embed_assets.py before shipping.")
    sys.exit(1)

# Also handle ASSET_BASE_PATH + filename pattern
# Find all occurrences like ASSET_BASE_PATH + 'filename.webp'
pattern = r"ASSET_BASE_PATH \+ ['\"]([^'\"]+)['\"]"
matches = re.findall(pattern, html)
for filename in set(matches):
    full_path = f'{ASSET_DIR}/{filename}'
    if full_path in assets:
        # Replace the concatenation with the data URI directly
        html = re.sub(
            rf"ASSET_BASE_PATH \+ ['\"]" + re.escape(filename) + r"['\"]",
            f"'{assets[full_path]}'",
            html
        )

# Guard (shift 7, task 14): if any ASSET_BASE_PATH reference survives to here, deleting
# the const below would ship a ReferenceError and CloudSystem would die at boot. Fail
# loudly and name the offending (likely missing/renamed) cloud files.
leftover = re.findall(pattern, html)
if leftover:
    print("ERROR: ASSET_BASE_PATH references survived inlining; removing the const would")
    print("       ship a ReferenceError. Missing/renamed ASSET_BASE_PATH-referenced files:")
    for name in sorted(set(leftover)):
        print(f"  - {name}")
    sys.exit(1)

# Remove the ASSET_BASE_PATH constant since it's no longer needed
html = re.sub(r"const ASSET_BASE_PATH = ['\"][^'\"]*['\"];\s*", '', html)

# Prepend an auto-generated banner so nobody hand-edits the build artifact.
# Inserted right after the doctype to avoid triggering quirks mode.
banner = (
    "<!--\n"
    "  AUTO-GENERATED by embed_assets.py - DO NOT EDIT.\n"
    "  Edit Space_Monkey_Elevator.html (the source of truth) and rerun:\n"
    "      python3 embed_assets.py\n"
    "  Note: the landmark sprites use a runtime-built path and are NOT inlined,\n"
    f"  so this file must be served alongside the '{ASSET_DIR}/' folder.\n"
    "-->\n"
)
doctype_match = re.match(r"\s*<!DOCTYPE html>\s*\n", html, re.IGNORECASE)
if doctype_match:
    html = html[:doctype_match.end()] + banner + html[doctype_match.end():]
else:
    html = banner + html

# Write the embedded version
with open('index.html', 'w') as f:
    f.write(html)

print(f'\nCreated index.html')
print(f'Original HTML: {os.path.getsize("Space_Monkey_Elevator.html")} bytes')
print(f'Embedded HTML: {os.path.getsize("index.html")} bytes')
