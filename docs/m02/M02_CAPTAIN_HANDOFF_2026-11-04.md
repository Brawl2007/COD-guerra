# M02 «Operação Bzura»: handoff do Capitão M02 (2026-11-04)

Estado: **CHECKPOINT INTERCALAR n.º 2** (≈ 21:50 UTC). Desde as 21:01 UTC trabalha-se com **1 agente de cada vez**, por
pedido do proprietário. Este ficheiro é atualizado no fim da sessão.

Veredito: a M02 continua `PLANEJADA` e é uma **bancada isolada, INTEGRADA SEM VALIDAÇÃO DE JOGO**. Nenhum portão
(N0, N1, N6) está aprovado. Não há FPS medido. Os testes de estado não são playtest.

## 1. Base e ramo

- Branch: `claude/elegant-wright-m9l1ws`, criada a partir de `origin/claude/dreamy-ramanujan-6v62vr` @ `03387a31`.
- Push só para esta branch. Sem merge na `main` nem na #80, sem deploy, sem force-push, sem PR.
- Integração na linha da M01: cabe ao Capitão M01, com `merge --no-ff` desta branch.
- Ficheiros da M01: `git diff 03387a3..HEAD -- src/game/m01-* src/render/m01-* src/world/m01-* src/game/game.js src/main.js missions/m01-tczew` está **vazio**.

## 2. Feito e integrado nesta branch (commit e push)

| Passo | Commit(s) | Conteúdo | Prova |
|---|---|---|---|
| 0 Auditorias N, O, P, Q | `b8f78db`, `be954d9`, `625bde0` | `docs/m02/auditoria-2026-11-04/{N,O,P,Q}.md`. P inclui A pp. 5–7 | Leitura estática, sem medições |
| FIX-1 História/equipamento | `5eb85d9` (merge `65ce341`) | Ver lista abaixo | `tests/m02-07-history-text-guard.test.js` |
| FIX-3 Handoff honesto | `5c99744` (cherry-pick de `ac1f2d1`) | Ver lista abaixo | Revisão do Capitão |
| K Texto | `465cd30` (cherry-pick de `bd6a452`) | Ver lista abaixo | `tests/m02-08-dialogue-k.test.js` |
| TIME-01 Sol | `9177808` (merge `1ed037b`), `ba7d06e` | `tools/m02/solar-noaa.mjs` com teste e nota `docs/m02/research/TIME-01-solar.md`. BZ-C02 com as duas definições | `tests/m02-10-solar-time01.test.js`, mais verificação independente do Capitão |
| EQP-01 Pesquisa | `8f5cc55` | `docs/m02/research/EQP-01.md`. É PROPOSTA; nenhuma afirmação acima de PROVÁVEL, porque só se leram resumos | — |
| Testes reforçados | `9f5f44e` (merge `adcd1cd`) | Ver lista abaixo | Suites m02-01…06 |

**FIX-1:**
- «56.º Regimento / 25.ª DI», «56 pp» e «Mensageiro 56 pp» retirados do ecrã e dos dados (DEC-02 pendente).
- Os fuzileiros alemães passam de MP38 a `kar98k`. MG34 e Kar98k ficam com `equipmentStatus:'PROPOSTA_EQP01'`.
- Título do objetivo C12 sem data. A cartela «Varsóvia — 25 de setembro» mantém-se, porque o PDF a tem (C6 p. 15, I1 p. 33).
- As 7 macieiras ficam com `status:'candidata'`. «46» só como total planeado de D2.
- `research/SOURCES.md` passa a ter BZ-H01…H14 (estado: «registada no pacote; conteúdo não guardado») e BZ-C02.

**FIX-3** (matriz de `docs/m02/M02_HANDOFF.md`):
- PERF-01 e PERF-02: NÃO MEDIDO.
- HIST-TEST-01/02: HUMANO.
- REG-01: PENDENTE.
- «PASS (100 %)» passa a «teste de estado verde (não é aceitação)».
- Assinalado que `K-PERSONAGENS-DIALOGOS.md` não existe.

**K (texto):**
- `bz39_c01_02` (Małek) e `bz39_c01_03` (Lis): a segunda exige a primeira e cala-se em combate.
- Condição K2 «olhar livre» e «sem ordem crítica pendente» aplicada a `dlg_m02_001`.
- Nowak, Kowalski e LG01–LG12 com `sourceStatus:'fora_do_pdf'`.
- `bz39_c01_01` e `bz39_c04_05` **já eram literais** (K3 p. 39). A auditoria K.md tinha falsos positivos e ficou anotada.

**Testes reforçados:**
- As asserções de AI-02 ficam incondicionais, e há um AI-02 novo por som.
- O3 passa a determinismo real: 3 sementes × 2 execuções × 1800 ticks, comparando o snapshot a cada 60 ticks.
- Os ciclos vazios passam a exigir comprimento.

**Depois do checkpoint n.º 1 (21:01 UTC):**

| Passo | Commit(s) | Conteúdo |
|---|---|---|
| FIX-2 Saves | merge `023734d` (de `270cd44`, `32a933b`, `d8648f4`), `58e7976` | Snapshot v2 com semente e estado do RNG, granadas em voo, fechaduras de portas, registos, data narrativa e versão de layout. Restauro em fases. `src/game/m02-save-store.js` grava com staging e `previous`. Proposta de envelope em `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md` (D-M02-4). Os 2 testes `todo` independentes passaram a obrigatórios e passam |
| Higiene de testes (passo 1) | `e74c952` | O `playwright.config.js` principal ignora `m02-*.spec.js` (a lista dá 219 testes em 62 ficheiros, 0 da M02). Os artefactos vão para `test-results/`. O servidor é reutilizado fora do CI |
| Cabeçalho da bancada, SN3/SN4 | `5fee9ee` | O cabeçalho deixa de dizer «Missão M02 Completa» e «Bancada de produção» e diz bancada isolada, não validada, 9–10 Set. Kwiatkówek–Tum fica só como referência tipológica. SN3 passa a (-23,-12) e SN4 a (8,-28), do PDF N; os dois pontos estão fora de B01 e B02 |
| N0 capturas (passo 10) | `e74c952`, `d3c3af0`, `dbb4436` | Ver lista abaixo |

**N0 capturas:**
- `tests/browser/m02-n0-captures.spec.js` gera 30 conjuntos: SN1–SN5 × 2 luzes × 3 perfis. Cada conjunto tem **4 direções**, porque o PDF N define os SN como pontos de revisão 360°. O total é de 120 PNG, gravados em `test-results/m02-artifacts/n0/` com o manifesto v2.
- O HUD fica escondido nas capturas. Antes, as capturas passavam 30/30 só porque o HUD dava variação à imagem.
- O limiar de imagem uniforme foi calibrado com imagens observadas.

**Revisão adversarial independente do FIX-2: REJEITADO.** A revisão foi só de leitura, com scripts de prova em
`scratchpad/review/`. Defeitos confirmados por execução:
- **P0:** x/z ficam NaN nas Áreas B e C. A causa está em `m02-zone-streamer.js:176-177` (`bounds` em array espalhado num objeto) e dispara em `clampToMap` da M01. Por isso o cp_c e o cp_d nunca persistem.
- **P1:**
  - os checkpoints automáticos são gravados a meio do `tick()`, e o restauro não reproduz a continuação;
  - uma granada que mata o último defensor deixa um snapshot inválido no índice;
  - recarregar a página apaga o save bom (o construtor chama `reset()`, que grava o cp_a), e o F9 só lê a memória.
- **P2:**
  - a loja reconstrói a partir de `previous` quando `current` é ilegível (perde checkpoints) e não tem compare-and-swap entre separadores;
  - o validador aceita enums inválidos e um `weapon.profile` com damage 9999 vindo do save;
  - a acessibilidade e a data narrativa estão misturadas no save, e `m02.completed=true` é posto na Área A;
  - `saveCheckpoint`/`restoreCheckpoint` devolvem referências partilhadas.
- **Sem defeito, testado:** snapshots entre ticks nos 4 modos de restauro, nas Áreas A, B (com o limite corrigido em memória) e C.

**FIX-2b**, que corrige todos estes defeitos, está **EM CURSO** como agente único (worktree `m02-fix2b`).

**Testes corridos (checkout principal):**
- `node --test --test-concurrency=1 tests/m02-*.test.js` em `58e7976`: **76/76 pass, 0 fail, 0 todo**. Em `465cd30` eram 54 pass e 2 todo.
- `node --test tests/m01-tczew-data.test.js`: 14/14.
- `npm run build`: passa. `dist/` só tem `index.html`; o build principal não muda.
- Browser M02: `CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4391 npx playwright test -c tools/m02/playwright-m02-01.config.js` → **2 passed (2,4 min)** em SwiftShader, com o spec antigo e o N0. Prova N0 automática: **30/30 conjuntos**, 120 PNG, todos no ponto do PDF (desvio 0 m), 0 erros de consola. Árvore de trabalho = `dbb4436`.
- Isto **não aprova o N0**. Continuam pendentes:
  - a leitura humana das 120 imagens;
  - a oclusão;
  - os interiores;
  - o vídeo das duas rotas;
  - a planta com escala e a tabela de vãos (o patch WIP `n0-plan` está incompleto).
  - Além disso, as luzes usadas são os presets atuais, que estão errados segundo o TIME-01.
- **Não corrido:** `npm test` completo.

## 3. Em curso, interrompido ou por começar

| Trabalho | Estado | Onde está |
|---|---|---|
| FIX-2b defeitos da revisão adversarial | **EM CURSO**: é o único agente ativo | worktree `m02-fix2b` |
| 1 Higiene de testes e N0 (30 capturas) | **Aplicado e corrigido** (`e74c952`, `d3c3af0`, `dbb4436`); o patch fica só como histórico | — |
| N0 Planta e tabela de vãos | **Parado a meio**, sem a planta SVG nem o teste | `docs/m02/wip/2026-11-04/n0-plan.patch` |
| 9 Ambiente G/H/L (reuso de `m01-area-*`, horizonte L3) | **Parado a meio**, não revisto | `docs/m02/wip/2026-11-04/env-GHL.patch`: `src/render/m02-environment.js`, `src/world/m02-environment-area.js`, horizonte |
| 6–7 Roteiro C e set pieces J/E/F | **Não começado** (o agente foi parado sem diff) | — |
| 8 Combate D | **Não começado** (o agente foi parado sem diff) | — |

Os patches em `docs/m02/wip/` são trabalho parcial de agentes interrompidos. **Não foram aplicados nem revistos.**
Ou se reaplicam com `git apply --3way` e se terminam, ou se apagam.

## 4. Achados novos que exigem ação

- **TIME-01 corrigido:**
  - O ocaso de 9/9 é ≈ **18:14** e o nascer de 10/9 ≈ **05:08**, pela definição padrão NOAA (zénite 90,833°).
  - 18:09 e 05:13 eram o centro geométrico do disco (zénite 90°).
  - Confirmado com uma implementação independente. Os dois pares estão registados no BZ-C02.
- **Presets de luz da bancada errados** face ao cálculo (`docs/m02/research/TIME-01-solar.md`):
  - T0: o sol está 15–24° alto.
  - T2: o azimute está errado em 38° (ENE em vez de SE).
  - T3: a elevação está +11,6°.
  - T1 noite: usa um «sol» acima do horizonte.
- **C02:** os 4 hostis do EA0 veem o Piotr no tick 0. O primeiro contacto acontece em < 15 s, contra os 30–60 s do PDF (vai para o passo 6).
- ~~«Kwiatkówek–Tum» como local~~ **corrigido** em `5fee9ee`: passa a ser referência tipológica (GEO-01).
- ~~SN3/SN4 desviados do PDF~~ **corrigido** em `5fee9ee`.
- **Lis no C11:** reaparece em (-28,-22) por teleporte (`m02-acts-director.js`), o que Q2 proíbe (passo 7).
- **EQP-01:** a pesquisa não conseguiu ler as páginas completas, porque havia DNS bloqueado na sessão.

## 5. Decisões pendentes do proprietário (D-M02-1…7, `docs/direction/M02_BZURA_DESIGN.md` §6)

| ID | Decisão | Estado nesta branch |
|---|---|---|
| D-M02-1 | Aceitar a fusão isolada da bancada (M02-INT-1) | Fusão feita na linha (`426045ee`) como INTEGRADA SEM VALIDAÇÃO DE JOGO. **Falta a ratificação.** |
| D-M02-2 (DEC-01) | Cronologia sem recuo geral; «cobertura da retirada» com sentido local | Texto conforme. Pendente |
| D-M02-3 (DEC-02) | 56.º pp como enquadramento | **Retirado do ecrã** até haver decisão (FIX-1) |
| D-M02-4 (DEC-07) | Envelope de save comum com o condutor de atos da M01 | Proposta em preparação no FIX-2 (`docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md`). `m01-acts.js` não é alterado |
| D-M02-5 (DEC-03/04/05/06) | Três células; clímax local em Leśmierz; rota do pomar mais longa; CP final em C10 | Pendente. A rota do pomar ainda não foi medida |
| D-M02-6 | Elenco: Gruca, Wierzba, Małek, Szymczak; «Małek» vs «Malec» (M05) | Pendente |
| D-M02-7 | A bancada pode avançar antes da aprovação da M01, sem promover o estado | Pendente |

Outras decisões: as portas de B08 (F) e EQP-01 (validação das armas).
