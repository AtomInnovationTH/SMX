#!/usr/bin/env bash
# Local mirror of the CI gate (.github/workflows/deploy.yml).
# NOTE: regenerates index.html in place, exactly as CI does. If it was stale this script
# fails AFTER fixing it — `git add index.html` and re-run.
#   SKIP_SMOKE=1  skip the optional browser smoke test
# Steps: 1 unit tests, 2 em-dash check, 3 rebuild index.html, 4 asset references,
# 5 browser smoke (optional).
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "== 1/5 unit tests =="         ; node --test dev/tests/*.test.mjs
echo "== 2/5 em-dash check =="      ; python3 dev/tools/check_emdash.py
echo "== 3/5 rebuild index.html ==" ; python3 embed_assets.py
if ! git diff --quiet -- index.html; then
  echo "FAIL: index.html was out of sync; it has been regenerated — stage it." >&2
  git --no-pager diff --stat -- index.html; exit 1
fi
echo "== 4/5 asset references =="   ; python3 dev/tools/check_refs.py
if [ "${SKIP_SMOKE:-0}" = "1" ]; then echo "== 5/5 smoke: skipped =="
else echo "== 5/5 browser smoke =="  ; node dev/tests/smoke/smoke.mjs
fi
# Shift G: advisory visual regression. Opt-in (VISUAL_REGRESS=1) and never gating:
# a DRIFT verdict is an observation to be read against the frames, per "check.sh
# cannot see invisible" - the gate for a render change is the capture itself.
if [ "${VISUAL_REGRESS:-0}" = "1" ]; then echo "== advisory: visual regression ==" ; node dev/tools/regress.mjs || echo "advisory: regress tool reported a problem (see above; verdicts never fail the gate)"; fi
echo "GATE PASS"
