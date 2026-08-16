#!/usr/bin/env bash
# One-command dev launcher for Space Monkey Elevator.
#   ./start.sh              rebuild index.html if stale, serve on :8001, open the game
#   ./start.sh '?debug'     open with a query string (the debug boot, '?debug&clean', ...)
#   PORT=8765 ./start.sh    serve on another port
#   NO_OPEN=1 ./start.sh    serve without opening a browser (headless shells, SSH)
# The server runs in the foreground; Ctrl-C stops it. file:// cannot work: the bundle
# streams assets/ at runtime, so it must be served (DEVELOPERS.md).
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8001}"
QUERY="${1:-}"
URL="http://localhost:${PORT}/index.html${QUERY}"

open_in_browser() {
  if [ "${NO_OPEN:-0}" = "1" ]; then
    echo "   browser open skipped (NO_OPEN=1): ${URL}"
  elif command -v open >/dev/null 2>&1; then
    open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 &
  else
    echo "   open ${URL} in a browser"
  fi
}

# 1) Rebuild the bundle if any build input moved: the source of truth, the build
#    script, or anything under assets/. The served file is the artifact; playing a
#    stale index.html is a whole class of confusion this removes for free.
if [ ! -f index.html ] \
  || [ Space_Monkey_Elevator.html -nt index.html ] \
  || [ embed_assets.py -nt index.html ] \
  || [ -n "$(find assets -type f -newer index.html -print -quit)" ]; then
  echo "== index.html is stale, rebuilding =="
  python3 embed_assets.py | tail -3
fi

# 2) Probe the port before serving. If it already serves THIS exact build, reuse it
#    (a second server would only die on EADDRINUSE). If it serves something else,
#    say so instead of silently playing the wrong page.
command -v curl >/dev/null 2>&1 || { echo "ERROR: start.sh needs curl." >&2; exit 1; }
probe="$(mktemp -t start-sh)"
trap 'rm -f "$probe"' EXIT
rc=0
curl -s --max-time 2 "http://localhost:${PORT}/index.html" -o "$probe" || rc=$?
if [ "$rc" -eq 7 ]; then
  : # connection refused: the port is free, fall through to serving
elif [ "$rc" -eq 0 ]; then
  if cmp -s "$probe" index.html; then
    echo "== port ${PORT} already serves this build =="
    open_in_browser "${URL}"
    exit 0
  fi
  echo "ERROR: port ${PORT} serves something else." >&2
  echo "       Pick a free one: PORT=8765 ./start.sh" >&2
  exit 1
else
  echo "ERROR: localhost:${PORT} did not answer a plain GET (curl exit ${rc})." >&2
  exit 1
fi

# 3) Serve in the foreground via exec, so Ctrl-C kills the server itself.
echo "== serving ${URL} (Ctrl-C to stop) =="
open_in_browser "${URL}"
exec python3 -m http.server "${PORT}"
