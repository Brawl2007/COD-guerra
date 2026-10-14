#!/usr/bin/env bash
# Instala um guarda pre-push do Git que recusa qualquer push para main/master.
# Independente do Claude Code: aplica-se a todos os worktrees deste clone, a agentes e a humanos.
# Uso: .agent/tools/install-git-guards.sh [--check]
set -euo pipefail

common="$(git rev-parse --git-common-dir)"
hook="$common/hooks/pre-push"
marker="COD-guerra pre-push guard"

if [ "${1:-}" = "--check" ]; then
  if [ -x "$hook" ] && grep -q "$marker" "$hook"; then
    echo "[OK] pre-push guard instalado em $hook"
    exit 0
  fi
  echo "[WARN] pre-push guard ausente: corre .agent/tools/install-git-guards.sh"
  exit 1
fi

if [ -e "$hook" ] && ! grep -q "$marker" "$hook"; then
  echo "Já existe um pre-push diferente em $hook; não o substituo. Integra-o à mão." >&2
  exit 1
fi

mkdir -p "$common/hooks"
cat > "$hook" <<'EOF'
#!/usr/bin/env bash
# COD-guerra pre-push guard: recusa push para main/master (instalado por .agent/tools/install-git-guards.sh)
while read -r local_ref local_sha remote_ref remote_sha; do
  case "$remote_ref" in
    refs/heads/main|refs/heads/master)
      echo "BLOCKED by COD-guerra pre-push guard: push to $remote_ref is forbidden; open a PR instead." >&2
      exit 1
      ;;
  esac
done
exit 0
EOF
chmod +x "$hook"
echo "[OK] pre-push guard instalado em $hook"
