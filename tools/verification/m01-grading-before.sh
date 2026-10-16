#!/usr/bin/env bash
# BEFORE capture for tests/browser/m01-postprocess-grading.spec.js (T44), run by the `browser` job of .github/workflows/pages.yml.
#
#   tools/verification/m01-grading-before.sh <shard> <shards> <png-dir>
#
# The spec compares each graded frame with a BEFORE frame of the same game without the grading pass (Low must be identical to it within 1/255)
# and throws in CI when M01_GRADING_BEFORE_DIR is not set. The branch workflows made that frame on the commit under T44 (m01-postprocess-grading-v1.yml,
# m01-stack-integration-t44-t20-v1.yml); the integrated candidate has no such commit (T44 sits in the middle of the stack), so this takes a worktree of
# HEAD, undoes the T44 integration in it (m01-grading-strip.mjs), builds it and runs the spec in its M01_GRADING_BASELINE=1 mode, which only captures.
# Only the shard that actually runs the spec does the work (`playwright test --list --shard` decides, so a change of sharding cannot orphan it).
# Optional, for a local run on another port: M01_GRADING_BEFORE_CONFIG=/abs/path/playwright-config.js (it must import ./playwright.config.js).
set -euo pipefail
shard=${1:?shard}; shards=${2:?shards}; png=${3:?png dir}
spec=tests/browser/m01-postprocess-grading.spec.js
here=$(pwd)

# The listing goes to a variable first: `grep -q` closing a pipe early would make playwright die on EPIPE and, with pipefail, read as "not in this shard".
listing=$(npx playwright test --list --shard="$shard/$shards" --reporter=list)
if ! grep -q 'm01-postprocess-grading\.spec\.js' <<<"$listing"; then
  echo "m01-grading-before: $spec is not in shard $shard/$shards; no BEFORE capture here."
  exit 0
fi

base=${M01_GRADING_BEFORE_BASE:-${RUNNER_TEMP:-/tmp}/m01-grading-before-base}
out=$(dirname "$png")
mkdir -p "$out" "$png"
git worktree add --detach "$base" HEAD
ln -s "$here/node_modules" "$base/node_modules"
node tools/verification/m01-grading-strip.mjs "$base"
cp "$spec" "$base/$spec"
config_args=()
if [ -n "${M01_GRADING_BEFORE_CONFIG:-}" ]; then cp "$M01_GRADING_BEFORE_CONFIG" "$base/pw-before.config.js"; config_args=(--config pw-before.config.js); fi
cd "$base"
npm run build
M01_GRADING_BASELINE=1 M01_GRADING_BEFORE_DIR="$png" npx playwright test "${config_args[@]}" "$spec" --workers=1 --retries=0 --output="$out/test-results" 2>&1 | tee "$out/browser-before.log"
captures=$(find "$png" -name '*.png' | wc -l)
if [ "$captures" -ne 9 ]; then echo "m01-grading-before: expected 9 BEFORE captures, found $captures" >&2; exit 1; fi
echo "m01-grading-before: $captures BEFORE captures in $png"
