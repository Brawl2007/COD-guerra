# PT05 — Vagões do pátio sólidos (M01)

## Problema do playtest

O jogador atravessava os três vagões do pátio.

## Solução

- Uma tabela única de formas dos vagões em `src/world/m01-yard-wagon-layout.js`.
- Essa tabela é usada pelo mundo, em `src/world/tczew-world.js`, para a colisão de movimento, tiros, linha de visão e granadas.
- O renderizador usa a mesma tabela, em `src/render/m01-yard-wagons.js`.
- Os nós de cobertura cv_wagon_1 e cv_wagon_2 não mudaram.
- yard_wagon_1 não foi reposicionado (decisões humanas pendentes).

## Commits

- 1f8bd2d — feat
- 73d339d — workflow
- 32f0c49 + 2783c09 — allowlist dos testes de bytes (D33)
- e085e96 — teste de browser dividido em 3, para cada parte ter o seu tempo; nenhum timeout aumentado, nenhuma verificação removida

## Base e impacto

- Base: 9c459f6.
- Sem mudança no save.
- Golden de jogabilidade byte-idêntico.
- `git diff 9c459f6 HEAD -- src/game src/core missions assets package.json package-lock.json playwright.config.js tests/fixtures` vazio.

## Evidência

- Verifier: PASS.
- Reviewer: ACCEPT (código 1f8bd2d, correção 1 2783c09, correção 2 e085e96).
- CI x86, run 38086004326, na cabeça e085e96:
  - npm test: 602/602.
  - build: OK.
  - Browser `tests/browser/m01-wagon-runtime-integration.spec.js`: 4/4 (`--workers=1 --retries=0`).
- CI anterior 38076694111 falhou por timeout do teste de browser antigo (corrigido pela divisão).

## Como testar

```
bash ~/jogar.sh claude/m01-yard-wagon-colliders-v1
```

- Tentar entrar nos três vagões do pátio pelos lados e pela ponta da rampa.
- Disparar contra eles.
- Atirar uma granada contra um vagão.

## Estado

M01 continua PROTÓTIPO JOGÁVEL.
