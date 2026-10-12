#!/usr/bin/env bash
# Prepara uma versão do jogo para playtest numa pasta própria, sem tocar na pasta de trabalho do Captain,
# e serve-a em http://127.0.0.1:4173/COD-guerra/.
#
# Uso:  .agent/tools/jogar.sh <branch-ou-commit> [--build-only]
#
# Variáveis opcionais:
#   JOGAR_DIR           pasta de jogo (padrão: ~/projetos/COD-guerra-jogar)
#   JOGAR_NODE_MODULES  dependências já instaladas, reaproveitadas por ligação simbólica
#                       (padrão: ~/projetos/COD-guerra-v7-cert/node_modules, depois o node_modules deste checkout)
set -euo pipefail

usage() {
  echo "Uso: $0 <branch-ou-commit> [--build-only]" >&2
  exit 2
}

[ $# -ge 1 ] || usage
REF="$1"
shift
BUILD_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=1 ;;
    *) usage ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)"
DIR="${JOGAR_DIR:-$HOME/projetos/COD-guerra-jogar}"
PORT=4173
URL="http://127.0.0.1:${PORT}/COD-guerra/"

if ! git -C "$ROOT" fetch origin --quiet 2>/dev/null; then
  echo "Aviso: não consegui atualizar do GitHub; uso o que já está em disco." >&2
fi

if git -C "$ROOT" rev-parse --verify --quiet "origin/${REF}^{commit}" >/dev/null; then
  TARGET="origin/${REF}"
elif git -C "$ROOT" rev-parse --verify --quiet "${REF}^{commit}" >/dev/null; then
  TARGET="${REF}"
else
  echo "Não encontro '$REF' (nem origin/$REF). Confirma o nome da branch." >&2
  exit 1
fi
COMMIT="$(git -C "$ROOT" rev-parse --short "$TARGET")"

# A pasta de jogo tem de ser uma worktree deste mesmo repositório.
common_root="$(cd "$ROOT" && realpath "$(git rev-parse --git-common-dir)")"
if [ -e "$DIR" ]; then
  dir_common="$(cd "$DIR" 2>/dev/null && realpath "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null || true)"
  if [ -z "$dir_common" ] || [ "$dir_common" != "$common_root" ]; then
    echo "$DIR existe e não é uma pasta de jogo deste repositório. Usa outra com JOGAR_DIR." >&2
    exit 1
  fi
  # node_modules é a ligação às dependências: não conta como alteração.
  if [ -n "$(git -C "$DIR" status --porcelain -- . ':(exclude)node_modules')" ]; then
    echo "A pasta de jogo $DIR tem alterações; não mexo nela. Estado atual:" >&2
    git -C "$DIR" status --short -- . ':(exclude)node_modules' >&2
    exit 1
  fi
  git -C "$DIR" checkout --quiet --detach "$TARGET"
else
  git -C "$ROOT" worktree add --quiet --detach "$DIR" "$TARGET"
fi

# Dependências: reaproveita as já instaladas, sem duplicar o node_modules no disco.
NM_SRC="${JOGAR_NODE_MODULES:-}"
if [ -z "$NM_SRC" ]; then
  for candidate in "$HOME/projetos/COD-guerra-v7-cert/node_modules" "$ROOT/node_modules"; do
    if [ -d "$candidate" ]; then
      NM_SRC="$candidate"
      break
    fi
  done
fi
if [ -L "$DIR/node_modules" ] && [ ! -e "$DIR/node_modules" ]; then
  rm "$DIR/node_modules"   # ligação partida de uma execução anterior
fi
if [ ! -e "$DIR/node_modules" ]; then
  if [ -z "$NM_SRC" ] || [ ! -d "$NM_SRC" ]; then
    echo "Sem dependências instaladas. Corre 'npm ci' em $DIR (ocupa mais disco) ou define JOGAR_NODE_MODULES." >&2
    exit 1
  fi
  ln -s "$NM_SRC" "$DIR/node_modules"
  echo "Dependências reaproveitadas de $NM_SRC."
fi

echo "Versão: $REF (commit $COMMIT). Anota isto na ficha."
cd "$DIR"
if ! npm run build; then
  echo "O build falhou. Se o erro for um módulo em falta, a versão mexeu nas dependências: corre 'npm ci' em $DIR." >&2
  exit 1
fi

if [ "$BUILD_ONLY" -eq 1 ]; then
  echo "Build pronto em $DIR/dist (não servi nada: --build-only)."
  exit 0
fi

if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "O porto $PORT já está em uso por outro preview. Para-o (Ctrl+C no terminal dele) e corre de novo." >&2
  exit 1
fi
echo "A servir $URL — para parar, Ctrl+C."
echo "Para a ficha: branch $REF · commit $COMMIT"
exec npm run preview
