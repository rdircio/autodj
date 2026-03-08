#!/usr/bin/env bash
# Show AutoDJ "skipped (recent-played cache)" lines from the Mixxx log.
# Usage: ./check-skipped-recent.sh [path-to-mixxx.log]
# Default log path (macOS): ~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/mixxx.log

LOG="${1:-$HOME/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/mixxx.log}"

if [[ ! -f "$LOG" ]]; then
  echo "Log not found: $LOG" >&2
  echo "Usage: $0 [path-to-mixxx.log]" >&2
  exit 1
fi

echo "=== Skipped tracks (recent-played cache hit) ==="
echo "Log: $LOG"
echo ""

# Skip reason line (time + message)
grep -n "Skipping next track: played in the last" "$LOG" 2>/dev/null || true

echo ""
echo "=== Track IDs that were skipped (cache hit) ==="
grep -n "Skipped (recent-played cache hit) track id:" "$LOG" 2>/dev/null || true

echo ""
echo "=== Summary ==="
count=$(grep -c "Skipping next track: played in the last" "$LOG" 2>/dev/null || echo "0")
echo "Total cache-hit skips in this log: $count"
