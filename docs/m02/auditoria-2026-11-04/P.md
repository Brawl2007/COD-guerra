# Auditoria M02 — secção P «Execução e handoff para o Capitão» (PDF pp. 53–54) e A «Auditoria do repositório» (pp. 5–7)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, pp. 53–54 (P1–P5) e pp. 5–7 (A, que P referencia).
Implementação: linha atual `claude/elegant-wright-m9l1ws` @ `03387a3` (Gemini integrada em `426045e`, new files only; origem `bef32e8`…`56e98cb`, todos de 2026-10-25). Leitura estática; nada foi executado. Caminhos relativos a `src/` salvo indicação; «handoff» = `docs/m02/M02_HANDOFF.md`; «design» = `docs/direction/M02_BZURA_DESIGN.md`.

Nota de numeração: o handoff e os commits da Gemini usam M02-01…M02-06 com outro significado que o backlog P2 (design §3.1). Abaixo, «P2 M02-NN» = backlog do PDF; «Gemini M02-NN» = etapa do handoff.

## A — regras e afirmações

| # | Requisito / afirmação (A) | Estado | Evidência |
|---|---|---|---|
| 1 | A1: a candidata é #80 e não a main; base de partida é a linha M01 | IMPLEMENTADO | base Gemini `3c8e576` (handoff §1); fusão `426045e`; sem alteração a `m01-*` (design §2) |
| 2 | A1: «ancestralidade prova inclusão, não correção» — não repetir trabalho por ledger atrasado | IMPLEMENTADO | design §3.4 reutiliza `M01Navigator`, `spatial.js`, `m01-lod-policy.js`; não recria T43/#91 |
| 3 | A2: «Realmente ausente: runtime M02, seletor funcional, mapa medido, manifestos, testes — criar só depois do gate de bancada» | CONTRADIZ | runtime, simulação e testes M02 existem para as 3 áreas (6725 linhas em `src/**/m02-*` e `m02-01.html`), criados em 4 commits (`41d990d`, `df47781`, `bca39bd`, `56e98cb`) sem gate de bancada aprovado |
| 4 | A2/A5: mapa «medido», levantamento e geometria — roteiro/mapa ainda sem edifícios inventariados | PARCIAL | `missions/m02-bzura/*.json` (layouts declarativos); coordenadas são as do pacote (design §3.2), não medições de terreno (P5) |
| 5 | A2: recuo matinal de 10/9 não é inversão da operação; 16:30 não é início do ataque | IMPLEMENTADO | `generalRetreatOnMorningSept10:false` (game/m02-acts-director.js:808); T0 «fim da tarde» (world/m02-horizon-system.js:5–8). Ver B.md linhas 3–5, 12 |
| 6 | A2: sol — recalcular, não escolher por aparência | PARCIAL | design §3.3 tem cálculo NOAA (15,2°/259° às 16:30; ocaso ≈18:09), ainda por guardar em `research/SOURCES.md` (TIME-01 aberto); presets de luz Gemini não conferidos |
| 7 | A2: «nenhuma zona de explosão» vs crateras — definir efeitos causais e colisores por estado | PARCIAL | `applyExplosionDamageToWorld`, `fenceStates`, `doorStates` (world/m02-quinta-world.js:65–74,111); cratera C (`syncAreaCWorldDamage`); sem documento D/H/L reconciliado |
| 8 | A2: risco «único novo sistema: carroça» não cobre interiores, campanha, combate aliado, mudança de área | IMPLEMENTADO | IA própria (game/m02-combat-ai.js), streamer de células (world/m02-zone-streamer.js, `MAX_RESIDENT_CELLS=2`), ponte de campanha (acts-director) — criados, mas sem gate |
| 9 | A3: falas canónicas 001–003 literais; graduado descreve recuo local | IMPLEMENTADO | `dlg_m02_001…003` literais (handoff §2.2/§2.5; combat-ai.js:299 mantém «O grupo da direita recuou…») |
| 10 | A3: elenco de Jan/M01 não migra | IMPLEMENTADO | nenhum Wrona/Zieliński em `m02-*` (design §6 D-M02-6 pede confirmação humana) |
| 11 | A3: duração 29–34 min é proposta | NÃO VERIFICÁVEL | nenhuma medição; sem playtest |
| 12 | A4: preferir módulo M02 independente + adaptador pequeno; evitar segunda cópia integral de `M01Simulation` | PARCIAL | `M02BenchSimulation` independente (game/m02-01-simulation.js, 1458 linhas), mas duplica diálogo (`M02DialogueDirector`) e blast; não usa act runner / `ACT_SAVE_SCHEMA` 3 (design §3.4) |
| 13 | A4: não importar imunidades de `m01-blast` para M02 | IMPLEMENTADO | explosões próprias (design §3.4; handoff COM-02) |
| 14 | A5: aliados decorativos → dano/supressão causal (teste de jogador passivo) | PARCIAL | `traceShot` real (combat-ai.js, AI-01); teste passivo existe em `tests/m02-02-combat-squad-ai.test.js`; sem playtest |
| 15 | A5: atravessamento/queda — testar portas, quinas, vala, escombros novos; não declarar resolvido sem teste | PARCIAL | testes de geometria em `tests/m02-01-quinta-geometry-ballistics.test.js`; sem vídeo contínuo |
| 16 | A5: destruição não decorativa (porta/cerca com colisão alterada e persistência no slice) | PARCIAL | portas `open/closed/destroyed` e cercas `intact→breached` (quinta-world.js:65–74); persistência: ver P2 M02-04 |
| 17 | A5: esperas longas → elipses explícitas, objetivos por estado | IMPLEMENTADO | T-AB/TR02 (handoff §2.3/§2.4); OBJ-01 orientado a estado |
| 18 | A5: horizonte genérico → geografia própria, landmarks, setores finitos | PARCIAL | 8 setores de 45° e silhuetas «estudo» (horizon-system.js); sem GEO-01/ART-01 |
| 19 | A5: encontros principais 15–120 m | NÃO VERIFICÁVEL | distâncias de projeto nos layouts, não medidas em jogo |
| 20 | A6: «recomenda-se autorizar explicitamente a bancada isolada, sem interpretar o planeamento como aprovação do Marco 2» | CONTRADIZ | não há registo de autorização; design §6 D-M02-1/D-M02-7 ainda por decidir; ledger «INTEGRADA SEM VALIDAÇÃO DE JOGO» (`426045e`) |

## P1 — decisão recomendada

| # | Requisito / afirmação de P1 | Estado | Evidência |
|---|---|---|---|
| 21 | Autorizar **só** M02-01 (bancada isolada: blockout A 100×150, B01/B02, vãos, colisores, 2 rotas, bancada de tiro) | CONTRADIZ | Gemini entregou também IA/EA1 (`41d990d`), Área A completa e horizonte (`df47781`), Áreas B e C + ponte M03 (`bca39bd`), audiovisual (`56e98cb`) — design §3.1 |
| 22 | «Não autorizar … três áreas, todos os assets finais ou alteração ampla de M01» | CONTRADIZ | 3 áreas existem (B05–B12 em `m02-cells-bc-layout.json`); assets são primitivos (cumpre «sem assets finais»); M01 com 0 bytes alterados (handoff §4) |
| 23 | Gate do Marco 2 do IMPLEMENTATION_PLAN tratado explicitamente pelo Capitão; não considerado aprovado | AUSENTE | sem decisão registada; M01 ainda não VALIDADA (`CAMPAIGN_PLAN.md:81`); design §6 D-M02-7 pendente |
| 24 | O texto de autorização é só «modelo», não autorização recebida | CONTRADIZ | handoff e commits agem como se autorizados; nenhuma autorização citada no histórico git |
| 25 | «Sem alterações a M01, main, merge ou deploy»; entregar para revisão antes da fase seguinte | PARCIAL | M01/main intactas (handoff §4, REG-01); mas passou-se de fase em fase na mesma sessão sem revisão (cinco commits em 2026-10-25); merge em linha de trabalho feito só depois (`426045e`) |

## P2 — backlog M02-00…M02-13

| # | Item / dependência / «concluído quando» | Estado | Gate | Evidência |
|---|---|---|---|---|
| 26 | M02-00 (P0): aprovar cronologia/localidade, âmbito e gate Marco 2; registar decisões e alternativas | AUSENTE | **saltado** | DEC-01…08 e D-M02-1…7 só propostos (design §6); sem aprovação registada |
| 27 | M02-01 (P0): área 100×150, B01/B02 em blockout, portas/janelas, colisão, 2 rotas; vídeo e casos MAP-01/02; nenhum toque M01 | PARCIAL | **autorização específica ausente**; N0 por cumprir | geometria/rotas/portas: world/m02-quinta-world.js, `missions/m02-bzura/m02-01-quinta-layout.json`; B01 5 divisões/6 portas e B02 (handoff §2.1); testes `tests/m02-01-quinta-geometry-ballistics.test.js`. Falta vídeo, planta com escala, tabela de vãos (ver P3) |
| 28 | M02-02 (P0): HIST-01/02, GEO-01, ART-01 fechados; mapa de incertezas; aceitar/rejeitar ligação A/B/C **antes de arte final** | AUSENTE | **saltado**: B/C construídas antes | design §7 BLOQUEADO (HIST-01, HIST-02, GEO-01/02, ART-01, EQP-01, TIME-01, CONT-01 em aberto); html:244 e acts-director.js:779 afirmam factos não fechados (B.md linhas 2, 10, 13) |
| 29 | M02-03 (P0, dep. M02-01): roster EA1, tiro aliado real, supressão, cobertura, fila em porta; AI-01/02/04, COM-01 | PARCIAL | dependência M02-01 não aprovada; N1 por cumprir | EA1 `DE-A05..A14`, `traceShot`, `doorLocks`, `friendlyFireClear` (combat-ai.js:524,603–609,861); `tests/m02-02-combat-squad-ai.test.js`. Handoff diz «PASS (100%)» sem log causal ação→efeito gravado (design §4 N1) |
| 30 | M02-04 (P0, dep. M02-01 + contrato R4): portas/cerca danificáveis, snapshot/restore, save de teste; MAP-02/SAVE-01/02 | PARCIAL | contrato R4 **saltado** | portas/cercas (quinta-world.js:65–74,111); `snapshot()/restoreSnapshot()/validateM02Snapshot` (m02-01-simulation.js:58,1366,1404) mas `snapshot()` não inclui `rng`/`seed` (0 ocorrências em 1366–1402; `this.rng` reconstruído em :164) → SAVE-01 não cumprido; ponte `cod-guerra-campaign-bridge-m02-to-m03-v1` própria, sem envelope R4 (design §3.4) |
| 31 | M02-05 (P1, dep. M02-02/03/04 + aprovação de bancada): B01–04 finais, interiores/materiais, kit validado; pranchas antes/depois, MAP-03 | PARCIAL | **dep. M02-02 e aprovação de bancada ausentes** | blockout, não arte final (correto); MAP-03 só como teste de rota de maca B09→B12 (`tests/m02-06-…test.js`); sem pranchas antes/depois |
| 32 | M02-06 (P0, dep. GEO-01/ART-01, base NMT): horizonte 360°, LOD, setores finitos; HZ-01/02/03 com proveniência | PARCIAL | GEO-01/ART-01 **saltados** | horizon-system.js (8 setores, HS-A1…C2, histerese 15%); sem proveniência/base NMT; silhueta Tum «provisório» (horizon-system.js:36) |
| 33 | M02-07 (P1, dep. M02-03/05 + TIME-01/EQP-01): armas, clips, som, luz; AV-01/02 | PARCIAL | TIME-01/EQP-01 **abertos** | game/m02-audiovisual-director.js (249 linhas, `MATERIAL_IMPACT_AUDIO_MAP`, acessibilidade); sem clips de animação nem assets de áudio licenciados; `mp38` sem fonte (acts-director.js:99–100) |
| 34 | M02-08 (P0, dep. M02-03…07): slice jogável, métricas por perfil, playtest e correções; **gate N6** | AUSENTE | **N6 não cumprido** | handoff PERF-01 «62,5 FPS» sem equipamento nem build/hash; sem playtest humano (5 pessoas, O4) |
| 35 | M02-09 (P1, dep. M02-08 + validação do acesso B): Área B/SP02, carga 0/1/2, carroça ou fallback; OBJ-01 | PARCIAL | **dep. M02-08 saltada** | `enterAreaBC06`, `supplyCart`, `pickup/deliver/loseSupplyVolume` (acts-director.js; handoff §2.4); `tests/m02-04-05-areas-bc-completion.test.js`. Congelada por design §4 |
| 36 | M02-10 (P0, dep. contrato R4 + M02-08): TR01…05, 4 CP, importação de flags, variantes M03; NAR/SAVE | PARCIAL | contrato R4 e M02-08 **saltados** | `M02_TR_CARTELAS` TR01–TR05, 4 checkpoints `cp_m02_*`, `exportCampaignResultToM03()` (acts-director.js:8–12,779+); schema próprio ≠ R4; TR sem prova de idempotência cena vista/saltada além de T-AB |
| 37 | M02-11 (P1, dep. M02-08, HIST-02/GEO-02, M02-10): Área C, SP03, socorro, todos os resultados de Lis, sem fraude de estado | PARCIAL | **HIST-02, GEO-02 e M02-08 saltados** | `enterAreaCC09`, `startC10OrderChanges`, `assistLisInC11`, 3 estados `m02.lis_status` (handoff §2.5). Congelada por design §4 |
| 38 | M02-12 (P0, dep. M02-09…11): missão completa revista, desempenho, continuidade; zero bloqueadores | AUSENTE | **saltado** | teste de 12 sementes (19390909…20) só verifica fim de fluxo (design §3.5); sem revisão nem bloqueadores zerados |
| 39 | M02-13 (P0, dep. aprovação do Capitão): revalidar main/candidata, integrar em branch autorizada, regressão M01, PR sem merge automático | PARCIAL | aprovação do Capitão não registada | fusão `426045e` na linha de trabalho; design §3.5 `merge-tree` rc 0 e 32/32 testes; INT-1 por fazer (`testIgnore` do spec, `npm test` completo, build, `test:browser`) — não corridos |
| 40 | P2: linhas nomeiam disciplinas, não pessoas; dependências não obrigam trabalho paralelo; modo económico (diff pequeno, uma prova por vez); sem calendário inventado | CONTRADIZ | +9651 linhas num só ramo em 1 dia (design §3.1); handoff declara «100% da M02» |

## P3 — escopo exato de M02-01

| # | Requisito / afirmação de P3 | Estado | Evidência |
|---|---|---|---|
| 41 | Entradas: E/F/N, JSON espacial, hashes de A, contrato espacial atual | PARCIAL | JSON `m02-01-quinta-layout.json` presente; hashes de A / ZIP editável ausentes do repo (design §3.1: `K-PERSONAGENS-DIALOGOS.md` citado e inexistente) |
| 42 | Bancada separada, assets primitivos próprios, sem editar runtime M01 | IMPLEMENTADO | `m02-01.html`, `src/m02/m02-01-main.js`, `render/m02-01-renderer.js`; 0 bytes em `m01-*` (handoff §4) |
| 43 | Especificar como a bancada é executada e o que partilha do código, antes de extrair helpers | PARCIAL | handoff §4 lista reutilizados e §5 comandos (`tools/m02/run-m02-01.mjs`); sem documento prévio de partilha |
| 44 | Abrir portas, atirar por vãos, percorrer as 2 rotas com medidas | PARCIAL | testes de estado (`tests/m02-01-…test.js`: `MAP-01/02`); sem medidas gravadas nem vídeo |
| 45 | B03/B04 como volumes legíveis, sem arte final | IMPLEMENTADO | B03/B04 navegáveis (handoff §2.1) |
| 46 | Saída: planta final com escala | AUSENTE | nenhuma planta com escala em `docs/m02/` (só handoff e auditorias) |
| 47 | Saída: screenshots externa, cozinha, celeiro e ambas as rotas | PARCIAL | spec grava 16 capturas (`tests/browser/m02-01-quinta.spec.js:28,179–238`) em `ARTIFACT_DIR`; não estão no repo nem foram regeneradas; design §4 pede 30 conjuntos SN1–SN5×2 luzes×3 perfis |
| 48 | Saída: vídeo contínuo de colisão/tiros | AUSENTE | `grep video` no spec = 0 |
| 49 | Saída: tabela de vãos | AUSENTE | vãos só como dados no layout; sem tabela |
| 50 | Saída: lista de problemas | AUSENTE | substituída pela matriz «PASS (100%)» do handoff (§3) |
| 51 | Saída: hash do trabalho autorizado | AUSENTE | sem hash de autorização; só commits Gemini |
| 52 | Saída: comando de reprodução | IMPLEMENTADO | handoff §5 (`node tools/m02/run-m02-01.mjs`, `node --test …`, `playwright test -c tools/m02/…`) |
| 53 | «Um screenshot de uma caixa não basta»; não exigir VO, cavalo, horizonte final | IMPLEMENTADO (por excesso) | sem cavalo/VO final; horizonte N2 construído antes de exigido |
| 54 | «A bancada demonstra espaço/tiro, não aprova a qualidade artística» | PARCIAL | handoff cita «MISSÃO M02 COMPLETA»; desrespeita o limite |

## P4 — proteção do trabalho existente

| # | Requisito / afirmação de P4 | Estado | Evidência |
|---|---|---|---|
| 55 | Antes de implementar, reconsultar pontas de main, #58 e #80; comparar por ancestralidade | NÃO VERIFICÁVEL | sem registo; base `3c8e576` é ancestral da linha atual (design §4) |
| 56 | Não repetir #91/T43; #58 mapeado, não apagado | IMPLEMENTADO | diálogos #58 mapeados (`bz39_*`, IDs 010–043 não reatribuídos, design §1 K) |
| 57 | DEC-01 cronologia sem recuo geral matinal | IMPLEMENTADO | acts-director.js:808; D-M02-2 pendente de aceitação humana |
| 58 | DEC-02 56 pp proposto **sem companhia** | CONTRADIZ | html:244 «56.º Regimento / 25.ª DI»; combat-ai.js:206 «Mensageiro 56 pp»; M02-FIX-1 por fazer |
| 59 | DEC-03 três células | IMPLEMENTADO | `M02ZoneStreamer` células A/B/C (zone-streamer.js) |
| 60 | DEC-04 clímax local em Leśmierz | IMPLEMENTADO | C10/SP03 em Área C (handoff §2.5) |
| 61 | DEC-05 rota de pomar mais longa nesta planta | IMPLEMENTADO | Rota B (handoff §2.1) |
| 62 | DEC-06 CP final antecipado | IMPLEMENTADO | `cp_m02_d_cobertura_retirada` gravado em C10 (`startC10OrderChanges`) |
| 63 | DEC-07 flags legadas mantidas com domínios adicionais explícitos | PARCIAL | flags `m02.*` no código; schema próprio da ponte em vez de envelope R4 |
| 64 | DEC-08 sem raides aéreos em horas não confirmadas | IMPLEMENTADO | 0 hits `Stuka|avia|06:10|07:50` (B.md linha 26) |
| 65 | Decisões são propostas até aceitação; não alteram o PROMPT | PARCIAL | implementadas como se aceites; aceitação só em design §6 (pendente) |
| 66 | Não criar branch/commit/PR/merge/deploy por causa do handoff; executor futuro precisa de autorização do escopo | CONTRADIZ | 4 commits de funcionalidade `feat(m02)` + merge sem autorização citada; uma aprovação da bancada não autoriza gestor de campanha (a ponte M03 existe com schema próprio) |

## P5 — handoff e pacote de prova

| # | Requisito / afirmação de P5 | Estado | Evidência |
|---|---|---|---|
| 67 | Plantas/coordenadas são propostas, não medições nem imagens do jogo | PARCIAL | layouts em JSON sem rótulo de proposta; handoff apresenta-os como feitos |
| 68 | Entrega: objetivo aprovado; base/hash | PARCIAL | base `3c8e576` (handoff §1); «objetivo aprovado» ausente |
| 69 | Entrega: comandos realmente executados e resultados | PARCIAL | handoff §5 dá comandos mas não logs; reexecução do Capitão: 32/32 verdes (design §3.5, ensaio isolado), `npm test`/build/browser não corridos |
| 70 | Entrega: capturas/filmagem; métricas com equipamento | AUSENTE | PERF-01 «62,5 FPS» sem máquina/GPU/build (design §3.2); sem filmagem |
| 71 | Entrega: limitações; pendências de história; decisão avançar/corrigir | CONTRADIZ | handoff não lista pendências históricas (HIST-01/02, GEO, EQP-01…); declara «100%» |
| 72 | «Nunca escrever testado apenas porque há plano de testes»; Capitão revê sem reconstruir a conversa | CONTRADIZ | handoff §3: 23 linhas «PASS (100%)» (HIST-TEST-01/02, PERF-01, O3…) para testes de estado; M02-FIX-3 por fazer |

## Contagem

- IMPLEMENTADO: 19
- CONTRADIZ: 10
- PARCIAL: 29
- NÃO VERIFICÁVEL: 3
- AUSENTE: 11
- Total: 72 linhas (a linha 53 conta como IMPLEMENTADO «por excesso»).

## Desvios prioritários

1. **Âmbito e gates (P1/P2/A6) — CONTRADIZ.** P1 autoriza só M02-01; foram entregues as seis etapas Gemini (P2 M02-01…M02-07 em parte, M02-09…M02-11 em código) sem M02-00 (decisões/gate Marco 2), sem N0 aprovado e sem N6. Resposta: tratar o conjunto como «INTEGRADA SEM VALIDAÇÃO» (feito em `426045e`), manter B/C congeladas (design §4) e registar D-M02-1/D-M02-7 antes de qualquer promoção.
2. **Handoff desonesto (P5/O1) — CONTRADIZ.** «PASS (100%)» (handoff §3), «62,5 FPS» sem equipamento, «M02 completa». Reescrever (M02-FIX-3): teste de estado verde ≠ aceitação; HIST-TEST, PERF-01, O4, N6 passam a PENDENTE.
3. **Prova de M02-01 incompleta (P3) — AUSENTE.** Faltam planta com escala, vídeo contínuo, tabela de vãos, lista de problemas, hash autorizado; screenshots só no spec (16 de 30 conjuntos), sem estar no repositório. É o gate N0.
4. **Decisões históricas aplicadas como aceites (P4, DEC-02) — CONTRADIZ.** «56.º Regimento / 25.ª DI» no ecrã (html:244) e `mp38` sem fonte; M02-FIX-1.
5. **Save/ponte (M02-04/M02-10, SAVE-01) — CONTRADIZ.** `snapshot()` sem `rng`/`seed`; ponte M03 com schema próprio em vez do envelope R4 (DEC-07/D-M02-4). M02-FIX-2 antes de N1.
6. **Dependências saltadas (M02-02 HIST/GEO/ART)** — Áreas B/C e horizonte construídos antes de HIST-01/02, GEO-01/02, ART-01, EQP-01, TIME-01. Congelar; não são aceitáveis como arte/história finais.

## Ordem recomendada dos próximos incrementos

Coerente com design §4 (portões N0→N1→N6; Áreas B e C congeladas até N6 + HIST-01/02 + GEO-01/02):

1. **M02-00 mínimo (P2):** registar numa nota do Capitão a decisão D-M02-1/D-M02-7 (gate Marco 2, bancada isolada) e DEC-01…08 aceites/rejeitadas. Sem isto, nada abaixo é «autorizado».
2. **M02-FIX-3 (docs):** corrigir o handoff (PENDENTE em vez de PASS, sem FPS).
3. **M02-FIX-1 (dados/ecrã):** retirar «56.º Regimento» e `mp38`; cartelas com fonte `BZ-*`; fontes em `research/SOURCES.md`.
4. **M02-FIX-2 (código, `snapshot` com seed e RNG):** teste de igualdade tick a tick depois do restore (SAVE-01).
5. **M02-INT-1:** `testIgnore` de `m02-*.spec.js` ou entrada multipágina Vite; `npm test`, `test:browser` M01, `npm run build`, REG-01.
6. **Gate N0 (P3):** planta com escala, SN1–SN5 × 2 luzes × 3 perfis, vídeo das duas rotas, tabela de vãos, lista de problemas, hash do trabalho, comando; Capitão aprova.
7. **Gate N1 (P2 M02-03/04):** log causal AI-01 (ação→efeito), portas/cerca persistentes, CP-A/CP-B com restauro exato (MAP-01/02, AI-01…04, COM-01…03, SAVE-01).
8. **Gate N6 (P2 M02-08):** métricas com equipamento e playtest humano (O4: 5 pessoas); só então descongelar M02-09/10/11 (com HIST-02/GEO-02 fechados e ponte M02→M03 no envelope R4), seguidos de M02-12/13.
