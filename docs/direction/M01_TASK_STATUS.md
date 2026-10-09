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
| 09 | Pipeline de texturas | AUSENTE | Sem `tools/assets/m01-materials` |
| 10 | Kit de vegetação | PARCIAL | Vegetação procedimental em runtime (`m01-vegetation-art.js`, `-layout.js`); sem kit GLB/LOD/impostores |
| 12 | Kit de props | AUSENTE | — |
| 13 | Estruturas de campo | AUSENTE | — |
| 14 | Materiais das pontes V2 | PARCIAL | `tools/assets/m01-bridges`; regeneração de materiais por confirmar |
| 15 | Portão FX V3 | DONE* | `m01-battlefield-fx-profile.js`, `m01-fx-textures.js` na V7; tabela fechado/aberto não verificada |
| 16 | Luz da madrugada | DONE* | `claude/m01-lighting-dawn-v1` @ `3386fc2`, CI 37918399233 (490/490, spec 8/8); duas cascatas em Média/Alta |
| 17 | Mergulho dos Stuka | DONE* | `claude/m01-stuka-dive-sequence-v1` @ `4c64beb`, CI 37930134740 (502/502, spec 5/5); sem ciclo, bombas visíveis, raid 05:30 numa passagem (D15) |
| 18 | Set piece de demolição V2 | DONE* | `claude/m01-demolition-setpiece-v2` @ `b296374`, CI 37959483518 (520/520, browser 9/9); colapso 3,2 s, clarão distante, tremor ao chegar o som, detritos/salpicos, chuva de terra (D16) |
| 19 | Feedback do tiro do jogador | DONE* | `08d2e81`, CI 37890545910 (D12) |
| 20 | Impostores da frente distante | AUSENTE | (Distant Battlefield foi excluído pela V7) |
| 21 | Ambient director | AUSENTE | Depende de T22 |
| 22 | Battle readout / display rounds | PARCIAL | `ROUND_KINDS` existe (`m01-fire.js:8`); sem `display` nem `battleReadout` |
| 23 | Frente leste visível | AUSENTE | Depende de T22 |
| 24 | Chegada do comboio | PARCIAL | Módulos locomotiva/Panzerzug/vagões; chegada por `battleClock` em falta |
| 25 | Horário do raid das 05:30 | AUSENTE | Depende de T03 |
| 26 | Beats de cena | PARCIAL | Letterbox no HUD; tabela de cues por fazer |
| 27 | Relevo fora do envelope | AUSENTE | — |
| 28 | Material macro do terreno | AUSENTE | Depende de T09 |
| 29 | Vegetação em runtime V2 | INCERTO | Depende de T10 |
| 30 | Paisagem distante | AUSENTE | — |
| 31 | Leito da via V2 | INCERTO | — |
| 32 | Estruturas de campo em runtime | AUSENTE | Depende de T13 |
| 33 | Props em runtime V2 | PARCIAL | `m01-environment-props.js`; kit T12 em falta |
| 34 | Vida no pátio da estação | PARCIAL | Evacuação existe; tarefas novas por fazer |
| 35 | Animation Resolver | AUSENTE | **Pré-requisito S17 da campanha** |
| 36 | Guarnições/evacuação | PARCIAL | `carriedBy`; municiador MG34 e fases do ckm por fazer |
| 37 | IK e orçamento | AUSENTE | — |
| 38 | Posturas de combate | AUSENTE | — |
| 39 | Sensação do viewmodel V2 | INCERTO | — |
| 40 | Braços FP e transporte | AUSENTE | — |
| 41 | Acabamento das pontes em runtime | PARCIAL | Portal polish existe |
| 42 | Água do Vístula | AUSENTE | — |
| 43 | Política de LOD | AUSENTE | — |
| 44 | Grading/pós-processamento | AUSENTE | T16 feita; já não espera por T01 (D13) |
| 45 | Assets de áudio | AUSENTE | Exige licenças |
| 46 | Mistura e opções de áudio | AUSENTE | — |
| 47 | Guarnição do ckm (fogo) | AUSENTE | Sem fogo nem munição na simulação. Depende de T22 (display rounds) e T05. |
| 48 | Retirada alemã | AUSENTE | Depende de T22/T35 |
| 49 | Orçamento de performance | REVER | T01 anulada (D13); orçamento a definir para a plataforma-alvo nova |
| 50 | Loading e bundle | INCERTO | Aviso >500 kB no build |
| 51 | Fecho visual integrado | AUSENTE | Final |
| 52 | Playtest humano | **HUMANO** | Final do Marco 2 |

\* DONE só significa que o entregável existe e está integrado. A execução na base final não foi verificada.
