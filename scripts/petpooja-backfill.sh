#!/bin/bash
# Pull every month of PetPooja item-level sales for the requested window.
# Monthly chunks: August 2026 alone was 15MB / 77k rows, so a whole year in one
# request would be ~180MB and is asking the report generator to time out.
set -u
cd "$(dirname "$0")/.."
MONTHS="${1:-24}"
for i in $(seq 0 $((MONTHS-1))); do
  S=$(date -v-${i}m -v1d '+%Y-%m-%d')
  E=$(date -v-${i}m -v1d -v+1m -v-1d '+%Y-%m-%d')
  OUT="scripts/petpooja-exports/order_items_${S}_${E}.csv"
  if [ -s "$OUT" ]; then echo "skip $S (already have it)"; continue; fi
  echo "── $S → $E"
  node scripts/petpooja-export.js --start="$S" --end="$E" 2>&1 | sed 's/^/   /'
done
echo
echo "=== downloaded ==="
ls -la scripts/petpooja-exports/*.csv 2>/dev/null | awk '{printf "  %10s  %s\n",$5,$9}'
