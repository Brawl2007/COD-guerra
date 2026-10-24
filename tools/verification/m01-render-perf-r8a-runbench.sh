#!/bin/sh
# usage: _r8a_runbench.sh OUTFILE  (alternates before/after, 7 rounds, 3 tiers)
out="$1"; : > "$out"
for round in 1 2 3 4 5 6 7; do
  for q in high medium low; do
    for b in 0 1; do
      BENCH_QUALITY=$q BENCH_BATCHING=$b node --expose-gc --min-semi-space-size=256 --max-semi-space-size=256 tools/verification/m01-render-perf-bench.mjs "r$round-$q-b$b" >> "$out"
    done
  done
done
