# Estado das tarefas T00–T52 do M01 na V7

Base inspecionada: V7 `7a5800e`. Método: inspeção estática. Feita pelo Explorer (Haiku) e verificada pontualmente pelo Captain com `grep`/`ls`.
**Nenhum teste foi executado nesta reconciliação.** Os estados vêm da presença de ficheiros e símbolos.

Antes de começar qualquer tarefa, o Explorer reconfirma o seu estado no HEAD de trabalho.
A definição de cada tarefa está em `docs/M01_FINAL_ROADMAP.md` §6. Os números de linha do roadmap estão desatualizados
(ex.: a condição `west` está em `m01-simulation.js:474`, não em :465).

Legenda: DONE · PARCIAL · AUSENTE · HUMANO (exige pessoa ou aparelho) · INCERTO (exige leitura de `docs/` ou execução).

| T | Tarefa | Estado | Evidência / o que falta |
|---|---|---|---|
| 00 | Consolidação dos planos | INCERTO | Planos paralelos em PR #56/#58/#44 fora do trunk |
| 01 | Baseline FPS no Chromebook | ANULADA | D13: o Chromebook deixou de ser plataforma-alvo |
| 02 | Continuidade roteiro/dados | AUSENTE | `west=p.x>-200` (:474) por mudar; re-timing de falas por fazer |
| 03 | Explosões ancoradas ao terreno | AUSENTE | Fumo `<240` s (:894); granadas ainda a 240 s |
| 04 | HUD cinemático | DONE* | `src/ui/m01-hud.js`, `tests/m01-hud-presentation.test.js`, spec browser |
| 05 | Campos de dados do áudio | PARCIAL | Sem `activeFrom`, `audioZones` nem `surfaces` |
| 06 | Núcleo de áudio | PARCIAL | `src/core/battlefield-audio.js` + teste com FakeAudioContext; sem `src/core/audio/` nem director |
| 07 | Contrato de animação | PARCIAL | `src/game/m01-animation-presentation.js` + `tests/m01-animation-contract.test.js`; hitboxes prone por confirmar |
| 08 | Biblioteca de clips V2 | PARCIAL | Seis clips V5; conjunto do Anexo B incompleto |
| 09 | Pipeline de texturas | **ACEITE** | `codex/m01-t09-t28-materials-closeout-v1` @ `c739b08`, 2026-10-11; 16 famílias originais, atlas albedo/normal/ORM High1024/Low512, manifesto SHA/licença, registo partilhado e galeria 1/5/20 m; CI 38174455690 (639/639, 173 tooling, build) e 38174455699 (atlas 3/3). Integrada em `claude/m01-integration` @ `3bdcd99`; junção Node 639/639 e build PASS. |
| 10 | Kit de vegetação | PARCIAL | Vegetação procedimental em runtime (`m01-vegetation-art.js`, `-layout.js`); sem kit GLB/LOD/impostores |
| 12 | Kit de props | **ACEITE** | `claude/m01-prop-kit-v1` @ `fe7982f`, integrado em `claude/m01-integration` @ `443f74d`: 21 props procedurais LOD0/LOD1 (≤1440/≤276 tris), manifesto, `tests/m01-props-kit.test.js`, capturas em `docs/assets/m01-props/`; licença provisória; ligação ao jogo é T33 |
| 13 | Estruturas de campo | **ACEITE** | `codex/m01-t13-t32-field-structures-v1` @ `cbbe0d7`, 2026-10-12; 4 tipos, 15 GLBs (3 LODs e posto destruído), CC0/SHA, bounds físicos verificados e envelopes decorativos explícitos, 15 capturas + 5 ângulos de detalhe. Verifier PASS/reviewer ACCEPT; CI38225594014 Node648/tooling173/build, CI38225594010 4/4. Integrada em `claude/m01-integration` @ `80b0474`; resultado da junção Node648/648 e build PASS. |
| 14 | Materiais das pontes V2 | PARCIAL | `tools/assets/m01-bridges`; regeneração de materiais por confirmar |
| 15 | Portão FX V3 | DONE* | `m01-battlefield-fx-profile.js`, `m01-fx-textures.js` na V7; tabela fechado/aberto não verificada |
| 16 | Luz da madrugada | DONE* | `claude/m01-lighting-dawn-v1` @ `3386fc2`, CI 37918399233 (490/490, spec 8/8); duas cascatas em Média/Alta |
| 17 | Mergulho dos Stuka | DONE* | `claude/m01-stuka-dive-sequence-v1` @ `4c64beb`, CI 37930134740 (502/502, spec 5/5); sem ciclo, bombas visíveis, raid 05:30 numa passagem (D15) |
| 18 | Set piece de demolição V2 | DONE* | `claude/m01-demolition-setpiece-v2` @ `b296374`, CI 37959483518 (520/520, browser 9/9); colapso 3,2 s, clarão distante, tremor ao chegar o som, detritos/salpicos, chuva de terra (D16) |
| 19 | Feedback do tiro do jogador | DONE* | `08d2e81`, CI 37890545910 (D12) |
| 20 | Impostores da frente distante | **ACEITE** | 676a455 (branch `claude/m01-distant-front-impostors-v1`, base 71ad067, por integrar na pilha), CI 38047289527; pelotão polaco sem prova de píxeis nas vistas de teste |
| 21 | Ambient director | AUSENTE | Depende de T22 |
| 22 | Battle readout / display rounds | PARCIAL | `ROUND_KINDS` existe (`m01-fire.js:8`); sem `display` nem `battleReadout` |
| 23 | Frente leste visível | AUSENTE | Depende de T22 |
| 24 | Chegada do comboio | PARCIAL | Módulos locomotiva/Panzerzug/vagões; chegada por `battleClock` em falta |
| 25 | Horário do raid das 05:30 | AUSENTE | Depende de T03 |
| 26 | Beats de cena | PARCIAL | Letterbox no HUD; tabela de cues por fazer |
| 27 | Relevo fora do envelope | AUSENTE | — |
| 28 | Material macro do terreno | **ACEITE** | `c739b08`, branch T09/T28; caminhos, balastro, lama/margem húmida, detalhe e projecção triplanar nas encostas; Low macro-only; geometria/colisores/simulação preservados. CI 38174455699 terreno 9/9 a 1/5/50 m + churn pausado; conjunto High 27 MiB descodificados. Integrada em `claude/m01-integration` @ `3bdcd99`; junção Node 639/639 e build PASS. |
| 29 | Vegetação em runtime V2 | INCERTO | Depende de T10 |
| 30 | Paisagem distante | AUSENTE | — |
| 31 | Leito da via V2 | **ACEITE** | `codex/m01-t31-t33-rail-props-v1` @ `6878d01`, 2026-10-12; 4 batches, travessas0,63/1,26m, talas15m, agulha, encontros medidos nos GLBs e via única dos trens. Verifier PASS/reviewer ACCEPT; CI38279380748 Node661/tooling173/build e CI38279380744 browser3/3;15 vistas pausadas. Integrada em `claude/m01-integration` @ `096a393`; junção Node661/661 e build PASS. |
| 32 | Estruturas de campo em runtime | **ACEITE** | `cbbe0d7`, branch T13/T32; modelos opcionais substituem proxies, LOD/estado/destruição, ready em pausa e ownership parcial/stale; 11 pares A/B, Low/High/falha/reload, 3 restauros com plateau343. Colisores83 e rota26eventos/4CP/saúde92 iguais; produção3/3 e CI4/4 PASS. Integrada em `claude/m01-integration` @ `80b0474`; resultado da junção Node648/648 e build PASS. |
| 33 | Props em runtime V2 | **ACEITE** | `codex/m01-t31-t33-rail-props-v1` @ `6878d01`, 2026-10-12;42 GLBs/21 tiposT12 reais em3 batches, quality/fallback/partial-stale/paused restore seguros, recurso plateau. Verifier PASS/reviewer ACCEPT, CI verde; licençaT12 preservada. Integrada em `claude/m01-integration` @ `096a393`; junção Node661/661 e build PASS. |
| 34 | Vida no pátio da estação | PARCIAL | Evacuação existe; tarefas novas por fazer |
| 35 | Animation Resolver | **ACEITE** | 46b210f, CI 38043817745 (559/559, build, browser 11/11); fades de postura, morte `fallen` a partir de `diedAt`, odómetro (D18). Itens 3, 4 e 8 do playtest seguem em H6. Pré-requisito S17 da campanha |
| 36 | Guarnições/evacuação | PARCIAL | `carriedBy`; municiador MG34 e fases do ckm por fazer |
| 37 | IK e orçamento | AUSENTE | — |
| 38 | Posturas de combate | AUSENTE | — |
| 39 | Sensação do viewmodel V2 | **ACEITE** | 29ba3cf, CI 38045111352 (574/574, build, browser 9/9); mira 0,30/0,22 s com curva, FOV 70→48, respiração e bob pelo relógio da simulação, arma baixa perto de paredes (D22). Manga/mão junto a parede vai para T40; H8 pendente humano |
| 40 | Braços FP e transporte | AUSENTE | — |
| 41 | Acabamento das pontes em runtime | PARCIAL | Portal polish existe |
| 42 | Água do Vístula | DONE* | `claude/m01-water-vistula-v1` @ `71ad067`, CI 37988900379 (535/535, browser 15/15 incl. regressão T18); fresnel + céu de T16, fluxo para norte pelo relógio, espuma nos pilares, margem molhada, Low sem reflexo mas com tom (média 59→99) (D17) |
| 43 | Política de LOD | AUSENTE | — |
| 44 | Grading/pós-processamento | **ACEITE** | 4f27f90 (branch `claude/m01-postprocess-grading-v1`, base 71ad067, por integrar na pilha), CI 38045943911 |
| 45 | Assets de áudio | AUSENTE | Exige licenças |
| 46 | Mistura e opções de áudio | AUSENTE | — |
| 47 | Guarnição do ckm (fogo) | AUSENTE | Sem fogo nem munição na simulação. Depende de T22 (display rounds) e T05. |
| 48 | Retirada alemã | AUSENTE | Depende de T22/T35 |
| 49 | Orçamento de performance | REVER | T01 anulada (D13); orçamento a definir para a plataforma-alvo nova |
| 50 | Loading e bundle | INCERTO | Aviso >500 kB no build |
| 51 | Fecho visual integrado | AUSENTE | Final |
| 52 | Playtest humano | **HUMANO** | Final do Marco 2 |

\* DONE só significa que o entregável existe e está integrado. A execução na base final não foi verificada.
