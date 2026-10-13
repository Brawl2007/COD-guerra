#!/bin/bash
# Cloud startup is read-only by default. Dependency installation is opt-in:
# COD_GUERRA_AUTOINSTALL_DEPS=1 on a trusted non-diagnostic session.
# This avoids network/install side effects in a first-pass Routine diagnosis.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ] || [ "${COD_GUERRA_AUTOINSTALL_DEPS:-0}" != "1" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
[ -f package-lock.json ] || exit 0

lock_sha="$(sha256sum package-lock.json | cut -d' ' -f1)"
stamp="node_modules/.cod-guerra-lock-sha256"
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$lock_sha" ]; then
  exit 0
fi

# Only runs after the operator enables the opt-in flag. No AI calls.
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund >&2
echo "$lock_sha" > "$stamp"
