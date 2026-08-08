#!/usr/bin/env bash
# Local mirror of the CI gate (.github/workflows/deploy.yml).
# NOTE: regenerates index.html in place, exactly as CI does. If it was stale this script
# fails AFTER fixing it — `git add index.html` and re-run.
#   SKIP_SMOKE=1  skip the optional browser smoke test
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "== 1/4 unit tests =="         ; node --test dev/tests/*.test.mjs
echo "== 2/4 rebuild index.html ==" ; python3 embed_assets.py
if ! git diff --quiet -- index.html; then
  echo "FAIL: index.html was out of sync; it has been regenerated — stage it." >&2
  git --no-pager diff --stat -- index.html; exit 1
fi
echo "== 3/4 asset references =="   ; python3 dev/tools/check_refs.py
if [ "${SKIP_SMOKE:-0}" = "1" ]; then echo "== 4/4 smoke: skipped =="
else echo "== 4/4 browser smoke =="  ; node dev/tests/smoke/smoke.mjs
fi
echo "GATE PASS"
