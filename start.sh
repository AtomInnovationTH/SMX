#!/bin/bash
PORT=8000
echo "🚀 Space Monkey Elevator starting on http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
echo ""
open "http://localhost:$PORT/Space_Monkey_Elevator.html"
python3 -m http.server $PORT
