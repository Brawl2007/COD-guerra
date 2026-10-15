# M01-ANIM-LOCOMOTION-RESOLVER-V1 (T35) — prova de aceitação

Estado: **ACEITE** em 2026-10-10 (D18). M01 continua **PROTÓTIPO JOGÁVEL**.

| Campo | Valor |
|---|---|
| Tarefa | T35 `M01-ANIM-LOCOMOTION-RESOLVER-V1` (Animation Resolver, pré-requisito S17 da campanha) |
| Branch | `claude/m01-anim-resolver-v1` |
| Commit de código aceite | `46b210f` (primeiro commit `876b67c` + correção `46b210f`) |
| Base | `5765aa5` (pilha T16 + T17 + T18 + T42) |
| CI x86 que prova a aceitação | run [38043817745](https://github.com/Brawl2007/COD-guerra/actions/runs/38043817745) |
| CI x86 anterior (falhou) | run 38042227351: 10/11 no browser |

## O que muda no jogo

- Os soldados deixam de trocar de pose aos saltos. Agachar e levantar fazem fade de 0,3 s a partir de `postureSince`.
- A morte toca o clip `fallen` completo (1,4 s) a partir de `diedAt`. Antes, a pose final era aplicada de imediato.
- Há fades curtos entre idle, mira, andar, correr e imobilizado (pinned).
- A fase do andar e da corrida segue a distância percorrida (odómetro), para evitar que os pés deslizem.
- Em pausa, a pose fica congelada. Recarga e reconstrução de LOD usam o mesmo blend.
- Trata itens 7, 9 e 11 do playtest 1 (`docs/direction/PLAYTEST_M01.md`, secção 10).

Não trata itens 3, 4 e 8 (soldados parados, cobertura, reação). São IA/simulação e continuam **PENDENTE HUMANO** (H6).
Os clips `crouch_walk` e `sprint` não existem no GLB entregue e ficam para T08.

## Evidência

### Testes e CI

- `npm test` (Node) no CI x86 `38043817745`: **559/559**.
- `npm run build`: **OK** no mesmo run.
- `npm run test:browser` no mesmo run: **11/11**, com `--workers=1 --retries=0`.
- Autoridade (verificação do CI): **OK**.
- Verificador local (Node), resultados reportados no ciclo de aceitação:
  - resolver de animação: 14/14;
  - jogador: 10/10;
  - variação de soldados: 9/9;
  - assets de personagens: 11/11;
  - MG34 deitada: 13/13.
- Browser local em aarch64: timeout. Limitação do ambiente (Chromebook), não do código. A prova browser é a do CI x86.

### Histórico de correções

- O run `38042227351` falhou 1/11: o spec de pausa lia o frame do menu (relógio 0) antes de o save ser desenhado.
- Correção em `46b210f`: o spec espera pelo `drawnAt` (frame carregado). Em `src/render/m01-characters.js` foi acrescentada guarda contra a dica de blend obsoleta.
- Tentativas de correção: 1 de 3. Rejeições de revisão: 0.
- Ciclo de agentes: implementação sonnet-xhigh (3 lançamentos; 2 morreram por rede, `EAI_AGAIN`), captura dos specs sonnet-high, verificador PASS, revisor ACEITE duas vezes, guarda final sonnet-low.

### Capturas (CI x86, nomes mantidos)

| Ficheiro | O que mostra |
|---|---|
| `anim-live-posture-start.jpg` | Postura antes da transição agachar/levantar |
| `anim-live-posture-mid.jpg` | Meio do fade de postura |
| `anim-live-posture-end.jpg` | Postura final após o fade |
| `anim-death-1.jpg`, `anim-death-2.jpg`, `anim-death-3.jpg` | Sequência de morte (clip `fallen` a partir de `diedAt`) |
| `anim-resolver-paused.jpg` | Pose congelada em pausa, sem alteração ao longo dos frames |

Limitação: as capturas são fracas. Os sapadores estão longe da câmara. A prova numérica são os JSON de blend gerados pelos specs (não copiados para esta pasta, ver run acima).

### Limitações conhecidas

- A prova visual é fraca (sapadores longe da câmara). A prova principal é numérica (pesos de blend amostrados por frame).
- A ausência de deslizar dos pés é provada por teste do modelo, não por medição dos ossos renderizados.
- Não foi medido FPS. Não há alegação de desempenho.
- Clips `crouch_walk` e `sprint` ausentes do GLB entregue (T08).
- Itens 3, 4 e 8 do playtest 1 dependem de IA/simulação e de decisão humana (H6).

## Reprodução

- Repetir a CI da branch `claude/m01-anim-resolver-v1` no commit `46b210f`: `npm ci`, `npm test`, `npm run build`, `npm run test:browser` com `--workers=1 --retries=0`.
- Capturas originais: artefactos do run `38043817745`. Os nomes foram mantidos ao copiá-las.
