#!/usr/bin/env bash
# One-command dev launcher for Space Monkey Elevator.
#   ./start.sh              rebuild index.html if stale, serve on the first free port
#                           from 8000 up, open the game
#   ./start.sh '?debug'     open with a query string (the debug boot, '?debug&clean', ...)
#   PORT=8765 ./start.sh    serve on exactly that port (refuses if it serves something else)
#   NO_OPEN=1 ./start.sh    serve without opening a browser (headless shells, SSH)
# The server runs in the foreground; Ctrl-C stops it. file:// cannot work: the bundle
# streams assets/ at runtime, so it must be served (DEVELOPERS.md).
set -euo pipefail
cd "$(dirname "$0")"

QUERY="${1:-}"
EXPLICIT_PORT=0
if [ -n "${PORT:-}" ]; then EXPLICIT_PORT=1; fi

open_in_browser() {
  if [ "${NO_OPEN:-0}" = "1" ]; then
    echo "   browser open skipped (NO_OPEN=1): $1"
  elif command -v open >/dev/null 2>&1; then
    open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 &
  else
    echo "   open $1 in a browser"
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

# 2) Pick the port. A port is either free, already serving THIS exact build (reuse
#    it: a second server would only die on EADDRINUSE), or serving something else
#    (keep looking, unless the caller pinned this port). Both 8000 and 8001 are
#    permanently busy on the dev machine, so the default is a range, not a number.
command -v curl >/dev/null 2>&1 || { echo "ERROR: start.sh needs curl." >&2; exit 1; }
probe="$(mktemp -t start-sh)"
trap 'rm -f "$probe"' EXIT

probe_port() {   # echoes: free | same | other
  local p="$1" rc=0
  curl -s --max-time 2 "http://localhost:${p}/index.html" -o "$probe" || rc=$?
  if [ "$rc" -eq 7 ]; then echo free
  elif [ "$rc" -eq 0 ]; then
    if cmp -s "$probe" index.html; then echo same; else echo other; fi
  else echo other; fi
}

serve_url() { echo "http://localhost:$1/index.html${QUERY}"; }

if [ "$EXPLICIT_PORT" = "1" ]; then
  # PORT keeps the caller's value here; probe only that one.
  case "$(probe_port "${PORT}")" in
    same)  echo "== port ${PORT} already serves this build =="
           open_in_browser "$(serve_url "${PORT}")"
           exit 0 ;;
    free)  : ;;
    other) echo "ERROR: port ${PORT} serves something else." >&2
           echo "       Pick a free one: PORT=8765 ./start.sh" >&2
           exit 1 ;;
  esac
else
  PORT=""
  for candidate in $(seq 8000 8019); do
    case "$(probe_port "${candidate}")" in
      same)  echo "== port ${candidate} already serves this build =="
             open_in_browser "$(serve_url "${candidate}")"
             exit 0 ;;
      free)  PORT="${candidate}"; break ;;
      other) : ;;  # occupied by something else: keep looking
    esac
  done
  [ -n "${PORT}" ] || { echo "ERROR: no free port in 8000-8019. Set one: PORT=8765 ./start.sh" >&2; exit 1; }
fi

# 3) Serve in the foreground via exec, so Ctrl-C kills the server itself.
URL="$(serve_url "${PORT}")"
echo "== serving ${URL} (Ctrl-C to stop) =="
open_in_browser "${URL}"
exec python3 -m http.server "${PORT}"
