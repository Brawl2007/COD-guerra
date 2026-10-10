#!/bin/bash
# Cloud sessions (claude.ai/code) start on a fresh machine without node_modules: install the locked
# dependencies so npm test, npm run build and Playwright work at once. Never runs on a local machine
# (the Chromebook keeps its own node_modules and its memory/disk rules).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
[ -f package-lock.json ] || exit 0

# Skip when node_modules already matches this lockfile (resumed or cached session).
lock_sha="$(sha256sum package-lock.json | cut -d' ' -f1)"
stamp="node_modules/.cod-guerra-lock-sha256"
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$lock_sha" ]; then
  exit 0
fi

# npm ci never rewrites package-lock.json; Chromium is preinstalled in cloud sessions.
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund >&2
echo "$lock_sha" > "$stamp"
