#!/usr/bin/env bash
# Copia os agentes deste repositório para ~/.claude/agents, onde o Claude Code os carrega em
# qualquer pasta e sessão desta máquina (um .claude/agents/ do projeto, se existir, tem prioridade
# para os nomes que repetir). Com --hook instala também o git-safety a nível de utilizador.
# Uso: .agent/tools/install-user-agents.sh [--check | --hook]
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
src="$root/.claude/agents"
dst="${CLAUDE_USER_DIR:-$HOME/.claude}/agents"
hook_src="$root/.claude/hooks/git-safety.py"
hook_dst="${CLAUDE_USER_DIR:-$HOME/.claude}/hooks/git-safety.py"
settings="${CLAUDE_USER_DIR:-$HOME/.claude}/settings.json"

if [ "${1:-}" = "--check" ]; then
  missing=0
  for f in "$src"/*.md; do
    name="$(basename "$f")"
    if ! cmp -s "$f" "$dst/$name"; then missing=$((missing + 1)); fi
  done
  if [ "$missing" -eq 0 ]; then
    echo "[OK] $(ls "$src"/*.md | wc -l) agentes iguais em $dst"
  else
    echo "[WARN] $missing agente(s) em falta ou desatualizados em $dst: corre .agent/tools/install-user-agents.sh"
  fi
  if [ -f "$hook_dst" ] && grep -q "git-safety.py" "$settings" 2>/dev/null; then
    echo "[OK] hook git-safety instalado a nível de utilizador"
  else
    echo "[INFO] hook git-safety não está a nível de utilizador (só protege pastas com .claude/settings.json); --hook instala-o"
  fi
  [ "$missing" -eq 0 ]
  exit $?
fi

mkdir -p "$dst"
cp "$src"/*.md "$dst"/
echo "[OK] $(ls "$src"/*.md | wc -l) agentes copiados para $dst (sessões novas do Claude Code passam a vê-los em qualquer pasta)"

if [ "${1:-}" = "--hook" ]; then
  mkdir -p "$(dirname "$hook_dst")"
  cp "$hook_src" "$hook_dst"
  python3 - "$settings" "$hook_dst" <<'EOF'
import json, shutil, sys, time
from pathlib import Path
settings, hook = Path(sys.argv[1]), sys.argv[2]
data = {}
if settings.exists():
    data = json.loads(settings.read_text(encoding="utf-8") or "{}")
    shutil.copy(settings, f"{settings}.bak-{time.strftime('%Y%m%d-%H%M%S')}")
entry = {"matcher": "Bash|Edit|Write|MultiEdit",
         "hooks": [{"type": "command", "command": f'python3 "{hook}"'}]}
pre = data.setdefault("hooks", {}).setdefault("PreToolUse", [])
if not any("git-safety.py" in json.dumps(e) for e in pre):
    pre.append(entry)
    settings.parent.mkdir(parents=True, exist_ok=True)
    settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[OK] hook git-safety acrescentado a {settings} (cópia de segurança .bak guardada)")
else:
    print(f"[OK] hook git-safety já estava em {settings}")
EOF
fi
