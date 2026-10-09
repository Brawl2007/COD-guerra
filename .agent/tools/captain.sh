#!/usr/bin/env bash
# Arranca o Captain do COD-guerra com as verificações prévias.
# Uso: .agent/tools/captain.sh [--check] [argumentos extra para o claude]
#   --check  só corre as verificações, sem abrir o Claude Code.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

if [ ! -f .claude/agents/captain.md ]; then
  echo "Este checkout não tem .claude/agents/captain.md (branch: $(git branch --show-current))." >&2
  echo "Muda para a branch que tem os agentes antes de arrancar o Captain." >&2
  exit 1
fi

python3 .agent/tools/claude_setup_check.py
bash .agent/tools/install-git-guards.sh --check || true
if [ -f .agent/tools/jev_router.py ]; then
  echo "[INFO] Jev (piloto, chamadas pagas): $(python3 .agent/tools/jev_router.py usage 2>/dev/null | head -1 || true)"
fi

if [ "${1:-}" = "--check" ]; then
  exit 0
fi

echo
echo "A arrancar o Captain (claude --agent captain). Dentro da sessão: /status, /advisor, /usage."
echo "Advisor Fable só nas sessões de planeamento; para testar agentes usa /advisor off."
exec claude --agent captain "$@"
