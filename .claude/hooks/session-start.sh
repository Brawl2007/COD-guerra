#!/bin/bash
# Cloud startup is read-only by default. Both setup actions are explicitly opt-in:
# COD_GUERRA_INSTALL_GIT_GUARDS=1 installs the local pre-push safety guard.
# COD_GUERRA_AUTOINSTALL_DEPS=1 installs Node dependencies on a trusted session.
# The first diagnostic session must leave both flags unset.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

if [ "${COD_GUERRA_INSTALL_GIT_GUARDS:-0}" = "1" ]; then
  bash .agent/tools/install-git-guards.sh >&2
  bash .agent/tools/install-git-guards.sh --check >&2
fi

if [ "${COD_GUERRA_AUTOINSTALL_DEPS:-0}" != "1" ]; then
  exit 0
fi

[ -f package-lock.json ] || exit 0

lock_sha="$(sha256sum package-lock.json | cut -d' ' -f1)"
stamp="node_modules/.cod-guerra-lock-sha256"
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$lock_sha" ]; then
  exit 0
fi

# Only runs after the operator enables the opt-in flag. No AI calls.
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund >&2
echo "$lock_sha" > "$stamp"
