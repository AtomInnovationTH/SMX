#!/bin/bash
# start.sh — play Space Monkey Elevator locally.
# Serves the repo root (the same index.html GitHub Pages serves) and opens the game.
cd "$(dirname "$0")"

# If a nearby port already serves THIS game, just open it.
for PORT in $(seq 8000 8010); do
    if curl -s --max-time 1 "http://localhost:$PORT/index.html" | grep -q "Space Monkey Elevator"; then
        echo "🐵 Server already running — opening http://localhost:$PORT/index.html"
        open "http://localhost:$PORT/index.html"
        exit 0
    fi
done

# Otherwise start a server on the first free port (8000 may be taken by something unrelated).
for PORT in $(seq 8000 8010); do
    nc -z localhost $PORT 2>/dev/null || break
done

echo "🚀 Space Monkey Elevator starting on http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
(sleep 1; open "http://localhost:$PORT/index.html") &
exec python3 -m http.server $PORT
