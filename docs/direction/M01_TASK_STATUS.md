# Estado das tarefas do M01 — entregas globais e integração

Reconciliação de 2026-10-14: este quadro reúne entregas aceites em branches diferentes; não descreve tudo como presente no checkout atual. Fontes: esta pilha `codex/m01-continuity-raid-integration-v1` @ `bf202b3` e `claude/m01-integration` @ `8a0c362`, mais branches de áudio e decisões. [Provas e contagem](../verification/m01-runtime/task-reconciliation-2026-10-14/README.md).

**26 tarefas principais DONE/ACEITE confirmadas**, 25 sem fecho no conjunto T00–T52 e T01 anulada. T11 está incorporada em T24, não é outra linha. T53 (app de PC, decisão do utilizador em `claude/m01-decisions-d37-v1`) acrescenta uma tarefa: **26 sem fecho formal incluindo T53**. Esta é uma contagem conservadora de aceitação; contém trabalho parcial e entregas de áudio com CI verde que ainda exigem reconciliação, não 26 tarefas por começar. As subtarefas T02-min/T03-lite/T05a/T06a/T06b não são contadas outra vez como tarefas principais completas.

As dez tarefas T09/T10/T13/T27/T28/T29/T30/T31/T32/T33 estão aceites e integradas na pilha `claude/m01-integration`, mas não estão na pilha desta branch. A união das duas pilhas e do áudio ainda não foi validada. Nunca interpretar ausência no checkout como ausência de entrega.

Proveniência histórica: inspeção estática da V7 `7a5800e` pelo Explorer/Captain; as linhas antigas DONE* continuam sem nova execução na base final. Nesta reconciliação foram lidos handoffs e consultados Git/CI; não foram reexecutados testes do jogo.

Antes de começar qualquer tarefa, o Explorer reconfirma o seu estado no HEAD de trabalho.
A definição de cada tarefa está em `docs/M01_FINAL_ROADMAP.md` §6. Os números de linha do roadmap estão desatualizados
(ex.: a condição `west` está em `m01-simulation.js:474`, não em :465).

Legenda: DONE · PARCIAL · AUSENTE · HUMANO (exige pessoa ou aparelho) · INCERTO (exige leitura de `docs/` ou execução).

| T | Tarefa | Estado | Evidência / o que falta |
|---|---|---|---|
| 00 | Consolidação dos planos | INCERTO | Planos paralelos em PR #56/#58/#44 fora do trunk |
| 01 | Baseline FPS no Chromebook | ANULADA | D13: o Chromebook deixou de ser plataforma-alvo |
| 02 | Continuidade roteiro/dados | PARCIAL: T02-min ACEITE | Posto/rota oeste elegíveis com LOS real; dlg019 só após destruição. CI 38582392486 verde; T02b (outras falas/pré-roll) continua pendente. Handoff continuity-raid-integration-v1. |
| 03 | Explosões ancoradas ao terreno | PARCIAL: T03-lite ACEITE | Aéreos e predição assentes no terreno depois de safeImpact. Fumo de granadas continua pendente; CI 38582392486 verde. |
| 04 | HUD cinemático | DONE* | `src/ui/m01-hud.js`, `tests/m01-hud-presentation.test.js`, spec browser |
| 05 | Campos de dados do áudio | PARCIAL: T05a CI VERDE | Branch `claude/m01-audio-data-fields-v1` @ `899937f`, CI38120863543 PASS; `activeFrom`, zonas/superfícies e contrato existem nessa branch. Fecho integral T05 e integração pendentes. |
| 06 | Núcleo de áudio | PARCIAL: T06a/T06b CI VERDE | Núcleo, director e música em `claude/m01-audio-director-music-v1` @ `af81657`; CI38132511927 e CI38138498956 PASS. Não estão nesta branch nem em `claude/m01-integration`; aceitação integral T06 por reconciliar. |
| 07 | Contrato de animação | PARCIAL | `src/game/m01-animation-presentation.js` + `tests/m01-animation-contract.test.js`; hitboxes prone por confirmar |
| 08 | Biblioteca de clips V2 | **ACEITE** | `claude/m01-anim-clip-library-v2` @ 0579302, CI 38115976563; integrado na pilha `claude/m01-stack-integration-t08-t12-v1` (merge --no-ff) |
| 09 | Pipeline de texturas | **ACEITE** | `codex/m01-t09-t28-materials-closeout-v1` @ `c739b08`, 2026-10-11; 16 famílias originais, atlas albedo/normal/ORM High1024/Low512, manifesto SHA/licença, registo partilhado e galeria 1/5/20 m; CI 38174455690 (639/639, 173 tooling, build) e 38174455699 (atlas 3/3). Integrada em `claude/m01-integration` @ `3bdcd99`; junção Node 639/639 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 10 | Kit de vegetação | **ACEITE** | `codex/m01-t10-t29-vegetation-v2` @ `cc3f459`, 2026-10-13; 43 modelos originais GLB/LOD/impostores e atlas CC0; verifier PASS/reviewer ACCEPT; provas em `docs/verification/m01-runtime/m01-t10-t29-vegetation-v2/`. Integrada em `claude/m01-integration` @ `403c748`; junção Node677/677 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 12 | Kit de props | **ACEITE** | CI 38104348154 (x86) + triagem 0 NEW; integrado por cherry-pick -x de 5ee62a8, 7564b6f, b4e5fd6 (D36); ligação ao jogo T33 aceite na outra pilha, ainda fora desta branch |
| 13 | Estruturas de campo | **ACEITE** | `codex/m01-t13-t32-field-structures-v1` @ `cbbe0d7`, 2026-10-12; 4 tipos, 15 GLBs (3 LODs e posto destruído), CC0/SHA, bounds físicos verificados e envelopes decorativos explícitos, 15 capturas + 5 ângulos de detalhe. Verifier PASS/reviewer ACCEPT; CI38225594014 Node648/tooling173/build, CI38225594010 4/4. Integrada em `claude/m01-integration` @ `80b0474`; resultado da junção Node648/648 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 14 | Materiais das pontes V2 | PARCIAL / BLOCKED | Trabalho existe em `codex/m01-t14-t41-bridge-finish-v2` @ `fd2b0c7`; README declara nenhuma aceitação, verifier/perf FAIL e CI falha. Correção delimitada pendente; não contar como tarefa aceite. |
| 15 | Portão FX V3 | DONE* | `m01-battlefield-fx-profile.js`, `m01-fx-textures.js` na V7; tabela fechado/aberto não verificada |
| 16 | Luz da madrugada | DONE* | `claude/m01-lighting-dawn-v1` @ `3386fc2`, CI 37918399233 (490/490, spec 8/8); duas cascatas em Média/Alta |
| 17 | Mergulho dos Stuka | DONE* (D29: sem defeito de laço/paragem em 909bf43) | `claude/m01-stuka-dive-sequence-v1` @ `4c64beb`, CI 37930134740 (502/502, spec 5/5); sem ciclo, bombas visíveis, raid 05:30 numa passagem (D15) |
| 18 | Set piece de demolição V2 | DONE* | `claude/m01-demolition-setpiece-v2` @ `b296374`, CI 37959483518 (520/520, browser 9/9); colapso 3,2 s, clarão distante, tremor ao chegar o som, detritos/salpicos, chuva de terra (D16) |
| 19 | Feedback do tiro do jogador | DONE* | `08d2e81`, CI 37890545910 (D12) |
| 20 | Impostores da frente distante | **ACEITE** | 676a455 (integrado na pilha em `claude/m01-stack-integration-t44-t20-v1` @ 909bf43, CI 38054298392), CI 38047289527; pelotão polaco sem prova de píxeis nas vistas de teste |
| 21 | Ambient director | AUSENTE | Depende de T22 |
| 22 | Battle readout / display rounds | **ACEITE** | `1881df1` (branch `claude/m01-display-fire-readout-v1`, workflow `cf7c2d7`), CI 38070927878 (628/628, golden ✔, 12 sementes, browser 7+2). Fogo de exibição separado e não guardado, RNG próprio; `battleReadout`; ainda sem perfis (T23). |
| 23 | Frente leste visível | **ACEITE** | b9c6c6b, integrado em `claude/m01-stack-integration-t23-pt05-v1` @ 1990a58. PT05 (vagões no pátio, 6ef1027): ACEITE, integrado no mesmo ramo |
| 24 | Chegada do comboio | PARCIAL | Módulos locomotiva/Panzerzug/vagões; chegada por `battleClock` em falta |
| 25 | Horário do raid das 05:30 | ACEITE | Seis impactos fixos fora da área, fumo persistente e agenda opcional schema 2; legacy sem replay, áudio aéreo após reload. Inclui pré-requisito T03-lite. |
| 26 | Beats de cena | PARCIAL | Letterbox no HUD; tabela de cues por fazer |
| 27 | Relevo natural | **ACEITE** | `codex/m01-t27-t30-relief-horizon-v1` @ `4e5389b`, 2026-10-13;61 hulls+20m e geometria protegida exacta, relevo exterior/chunks; verifier PASS/reviewer ACCEPT, CI669Node/173tooling/build92, browser2/2;24 futuros idênticos à base. Integrada em `claude/m01-integration` @ `14d37c5`; junção Node669/669 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 28 | Material macro do terreno | **ACEITE** | `c739b08`, branch T09/T28; caminhos, balastro, lama/margem húmida, detalhe e projecção triplanar nas encostas; Low macro-only; geometria/colisores/simulação preservados. CI 38174455699 terreno 9/9 a 1/5/50 m + churn pausado; conjunto High 27 MiB descodificados. Integrada em `claude/m01-integration` @ `3bdcd99`; junção Node 639/639 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 29 | Vegetação em runtime V2 | **ACEITE** | `codex/m01-t10-t29-vegetation-v2` @ `cc3f459`, 2026-10-13; GLB real, vento/LOD/qualidade, 17 troncos e layout físico preservados; CI/futuros24 PASS, verifier PASS/reviewer ACCEPT; integração autorizada em `claude/m01-integration`. Integrada em `claude/m01-integration` @ `403c748`; junção Node677/677 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 30 | Paisagem distante | **ACEITE** | `4e5389b`, branch T27/T30; Tczew/Lisewo original sobre triângulos reais, cinco submissões<=10, vistas canónicas com controlos iguais; quatro restauros/reload plateau536/134. Verifier PASS/reviewer ACCEPT, CI verde; sem FPS medidos. Integrada em `claude/m01-integration` @ `14d37c5`; junção Node669/669 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 31 | Leito da via V2 | **ACEITE** | `codex/m01-t31-t33-rail-props-v1` @ `6878d01`, 2026-10-12; 4 batches, travessas0,63/1,26m, talas15m, agulha, encontros medidos nos GLBs e via única dos trens. Verifier PASS/reviewer ACCEPT; CI38279380748 Node661/tooling173/build e CI38279380744 browser3/3;15 vistas pausadas. Integrada em `claude/m01-integration` @ `096a393`; junção Node661/661 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 32 | Estruturas de campo em runtime | **ACEITE** | `cbbe0d7`, branch T13/T32; modelos opcionais substituem proxies, LOD/estado/destruição, ready em pausa e ownership parcial/stale; 11 pares A/B, Low/High/falha/reload, 3 restauros com plateau343. Colisores83 e rota26eventos/4CP/saúde92 iguais; produção3/3 e CI4/4 PASS. Integrada em `claude/m01-integration` @ `80b0474`; resultado da junção Node648/648 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 33 | Props em runtime V2 | **ACEITE** | `codex/m01-t31-t33-rail-props-v1` @ `6878d01`, 2026-10-12;42 GLBs/21 tiposT12 reais em3 batches, quality/fallback/partial-stale/paused restore seguros, recurso plateau. Verifier PASS/reviewer ACCEPT, CI verde; licençaT12 preservada. Integrada em `claude/m01-integration` @ `096a393`; junção Node661/661 e build PASS. **Fora desta branch; presente na integração 8a0c362.** |
| 34 | Vida no pátio da estação | PARCIAL | Evacuação existe; tarefas novas por fazer |
| 35 | Animation Resolver | **ACEITE** | 46b210f, CI 38043817745 (559/559, build, browser 11/11); fades de postura, morte `fallen` a partir de `diedAt`, odómetro (D18). Itens 3, 4 e 8 do playtest seguem em H6. Pré-requisito S17 da campanha |
| 36 | Guarnições/evacuação | PARCIAL | `carriedBy`; municiador MG34 e fases do ckm por fazer |
| 37 | IK e orçamento | AUSENTE | — |
| 38 | Posturas de combate | AUSENTE | — |
| 39 | Sensação do viewmodel V2 | **ACEITE** | 29ba3cf, CI 38045111352 (574/574, build, browser 9/9); mira 0,30/0,22 s com curva, FOV 70→48, respiração e bob pelo relógio da simulação, arma baixa perto de paredes (D22). Manga/mão junto a parede vai para T40; H8 pendente humano |
| 40 | Braços FP e transporte | AUSENTE | — |
| 41 | Acabamento das pontes em runtime | PARCIAL / BLOCKED | Trabalho existe em `codex/m01-t14-t41-bridge-finish-v2` @ `fd2b0c7`; README declara nenhuma aceitação, verifier/perf FAIL e CI falha. Correção delimitada pendente; não contar como tarefa aceite. |
| 42 | Água do Vístula | DONE* | `claude/m01-water-vistula-v1` @ `71ad067`, CI 37988900379 (535/535, browser 15/15 incl. regressão T18); fresnel + céu de T16, fluxo para norte pelo relógio, espuma nos pilares, margem molhada, Low sem reflexo mas com tom (média 59→99) (D17) |
| 43 | Política de LOD | AUSENTE | — |
| 44 | Grading/pós-processamento | **ACEITE** | 4f27f90 (integrado na pilha em `claude/m01-stack-integration-t44-t20-v1` @ 909bf43, CI 38054298392), CI 38045943911 |
| 45 | Assets de áudio | AUSENTE | Exige licenças |
| 46 | Mistura e opções de áudio | AUSENTE | — |
| 47 | Guarnição do ckm (fogo) | AUSENTE | Sem fogo nem munição na simulação. Depende de T22 (display rounds) e T05. |
| 48 | Retirada alemã | AUSENTE | Depende de T22/T35 |
| 49 | Orçamento de performance | REVER | T01 anulada (D13); orçamento a definir para a plataforma-alvo nova |
| 50 | Loading e bundle | INCERTO | Aviso >500 kB no build |
| 51 | Fecho visual integrado | AUSENTE | Final |
| 52 | Playtest humano | **HUMANO** | Final do Marco 2 |
| 53 | App de PC instalável | AUSENTE | Decisão do utilizador D37 e definição em `claude/m01-decisions-d37-v1` @ `d5afc09`; depende de T51/T52. Escopo acrescentado fora do roadmap desta branch. |

\* DONE só significa que o entregável existe e está integrado. A execução na base final não foi verificada.

Nota (2026-10-11): a lista de exceções das 3 guardas byte-a-byte passou a um helper partilhado (`tests/helpers/m01-byte-guard-allowlist.js`, fb9968b, CI 38114823680); a corrida do spec de impostores foi corrigida em 1990a58 (espera por um frame renderizado no relógio carregado).

Atualização 2026-10-14: T02/T03/T25 referem-se exclusivamente à branch `codex/m01-continuity-raid-integration-v1`, base `2d65dd0`. Provas e gates atuais em `docs/verification/m01-runtime/continuity-raid-integration-v1/HANDOFF.md`.
