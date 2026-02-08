#!/usr/bin/env bash
set -euo pipefail

RUNS="${STABILITY_RUNS:-5}"
if ! [[ "$RUNS" =~ ^[0-9]+$ ]] || [[ "$RUNS" -lt 1 ]]; then
  echo "STABILITY_RUNS must be a positive integer (received: $RUNS)" >&2
  exit 1
fi

TARGETS=(
  "src/rate-limiter.test.ts"
  "src/sources/local.test.ts"
  "tests/search-endpoints.test.ts"
)

if [[ "$#" -gt 0 ]]; then
  TARGETS=("$@")
fi

for ((i = 1; i <= RUNS; i++)); do
  echo "[stability] run ${i}/${RUNS}"
  npx vitest run "${TARGETS[@]}" --reporter=dot
done

echo "[stability] completed ${RUNS} successful runs"
