# Auditoria M02 — secção Q «Revisão crítica final» (PDF pp. 55–56)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, pp. 55–56 (Q1 notas, Q2 problemas abertos, Q3 critérios de rejeição, Q4 respostas ao Capitão). As decisões DEC-01..08 vêm de P4 (p. ~54), citadas por Q3/Q4.
Implementação: linha `claude/elegant-wright-m9l1ws` @ `03387a3` (bancada Gemini integrada em `426045ee`). Leitura estática; nenhum código editado, nenhum teste corrido, nada aqui é playtest.
Caminhos relativos a `src/` salvo indicação; «html» = `m02-01.html`; «handoff» = `docs/m02/M02_HANDOFF.md`; «design» = `docs/direction/M02_BZURA_DESIGN.md`; «acts» = `game/m02-acts-director.js`; «ai» = `game/m02-combat-ai.js`; «sim» = `game/m02-01-simulation.js`.
Nota: Q1 são notas editoriais do próprio pacote (não auditáveis como requisito); o que se audita é o que Q2–Q4 afirmam ou exigem.

| # | Risco / decisão / pergunta de Q | Estado | Quem decide | Evidência (ficheiro:linha) |
|---|---|---|---|---|
| 1 | Q1: as notas (6,0–7,5) não qualificam a M02 como produto implementado; sem média de «conclusão» | NÃO VERIFICÁVEL | Capitão | Avaliação editorial, sem contrapartida em código. O handoff:98 reporta «100% de sucesso» em 12 execuções de teste; é teste de estado, não playtest (AGENTS.md) |
| 2 | Q2 Localização histórica: três células ≠ itinerário comprovado; arquitetura modular para deslocar B / mudar A→B (HIST-01/GEO-01) | PARCIAL | Proprietário (fontes) | Modularidade: `m02-cells-bc-layout.json` e `m02-quinta-layout.json` separados, `world/m02-zone-streamer.js`. Mas html:244 afirma «Kwiatkówek–Tum · … · 56.º Regimento / 25.ª DI» como local/unidade; HIST-01/GEO-01 BLOQUEADO em design §7. Ver B.md linhas 2, 13 |
| 3 | Q2 Leśmierz: apoio só para o eixo, não para este pátio/reserva; encenação ficcional; «plausível» ≠ «documentado» | PARCIAL | Proprietário | acts:10 TR03 «Acessos de Leśmierz — 10 de setembro — tarde» e acts:484 `O06 (Área C · Leśmierz)` tratam-no como lugar; sem marca de dramatização no ecrã (B.md linha 17); HIST-02 BLOQUEADO (design §7) |
| 4 | Q2 Ferimento fixo de Lis: Lis sai da célula na transição e regressa ferido; se incapacitado antes, usa esse estado; sem teleporte | PARCIAL | Capitão (ensaio) | Saída: acts:419–423 `detachedOutOfCell`/`LIAISON_OUTSIDE_CELL`. Regresso: acts:598–607 respeita `wasAlreadyIncapacitated`, mas faz `lis.x = -28; lis.z = -22` (reposição direta = teleporte de regresso) e `health = min(…,46)`. Ensaio pedido por Q2: não há playtest; estados em handoff:75–77 |
| 5 | Q2 Autonomia dos aliados: o tiro de apresentação é insuficiente; M02-03 bloqueador; prova = causa + pose + posição | PARCIAL | Capitão (reviewer) | Evolução real: aliados escolhem alvo com LoS e `friendlyFireClear` (ai:524, 861) e disparam `sim.fireActorBurst(ally, enemy, aimPt, 'ally')` (ai:874); tarefas por goal/nó (ai:696–803); testes `tests/m02-02-combat-squad-ai.test.js:39–44` (eventos `ally_hit_enemy`). Falta prova de pose visual; ai:857–858 usa ponto de mira fixo `{12.2,1.38,-30}` para supressão sem LoS (rasto de apresentação). Sem evidência de pose no renderer ligada ao dano |
| 6 | Q2 Horizonte: 8 km "podem funcionar", sem prova de custo no navegador; não vender distância como qualidade | AUSENTE (prova) | Capitão | `world/m02-horizon-system.js:30` `HORIZON_SECTORS_360` e `:36` «Volume de estudo provisório (Tum / Colegiada)»; nenhuma medição de custo/FPS em testes ou handoff (correto: «não inventar FPS»). Panorâmicas pendentes |
| 7 | Q2 Escopo: cortes aceitáveis (carroça estacionária, menos interiores, menos cosmética); inaceitáveis (tirar interior casa/celeiro, esconder horizonte, aliados decorativos) | PARCIAL | Proprietário | Nada foi cortado de forma inaceitável: interiores B01/B02 existem (ai:590 portas físicas; `m02-quinta-layout.json`), horizonte presente (item 6). Carroça já é móvel/danificável (`damageCartWheel`, handoff:145), não estacionária; sem decisão registada de corte. Escopo implementado (Áreas A+B+C+epílogo+ponte M03, handoff:7–11) excede o «slice» de Q4 |
| 8 | Q3: os 18 critérios de rejeição têm plano em O5; nenhum declarado satisfeito por implementação | NÃO VERIFICÁVEL | Capitão | O5 fica fora desta secção (ver `O.md` quando existir; README da auditoria dá N–Q por auditar). O handoff não declara satisfação formal dos 18 critérios |
| 9 | Q3: aceitar mecanismo de bloqueio explícito para o que falta de evidência histórica/técnica | PARCIAL | Proprietário | Bloqueios listados em design §7 (HIST-01/02, GEO-01/02, ART-01, EQP-01, TIME-01, CONT-01, BZ-H01..H14). Mas o código não os aplica: MP 38 (ai:46) e MG34/Kar98k (ai:33, 59; html:247) sem fonte entram; a bancada não bloqueia por eles |
| 10 | Q3: reaproveita #58 e correções M01 sem apagar nem confundir proposta com cânone; 3 falas protegidas e estados de Lis preservados | PARCIAL | Capitão | Falas: handoff:76–77 «Guarda um pouco de água. Todos precisam.», `bz39_c12_01/02`; estados `wounded_evacuated/wounded_walking/missing` (handoff:75). Não confirmei as três falas protegidas contra o PROMPT (NÃO VERIFICADO); M01 intocada não verificada por diff (design:229 prevê REG-01) |
| 11 | Q3: expansão de duração, mapa e clímax precisa de aprovação de direção; o PROMPT principal não é modificado | DECISÃO PENDENTE | Proprietário | design §6 D-M02-1/5/7. Sem aprovação registada. `git` sem alterações a `docs/PROMPT_MESTRE.txt` não verificado |
| 12 | Q4.1 «Pronta para começar? Sim, para bancada isolada de risco limitado, depois da autorização; não para toda a missão nem assets finais»; não comprova M02 jogável | CONTRADIZ (escopo) | Proprietário | Implementado já A+B+C, 12 cenas, epílogo e ponte M03 (handoff:7–11, 66–77). Design `README` auditoria: «INTEGRADA SEM VALIDAÇÃO DE JOGO» (estado correto). D-M02-1 (integração) e D-M02-7 (gate Marco 2) ainda por decidir; a integração `426045ee` já está feita na linha, antes de D-M02-1 |
| 13 | Q4.2 «O que falta»: unidade/itinerário e microcronologia | AUSENTE | Proprietário (fontes) | design §7 HIST-01/02; html:244 e ai:206 «Mensageiro 56 pp» pressupõem unidade (B.md 13) |
| 14 | Q4.2: cartografia obtida/georreferenciada | AUSENTE | Proprietário | design §7 GEO-01/02 (WIG P40 S28 não aberta); `research/SOURCES.md` sem entradas BZ-H (grep `BZ-H\|M02\|Bzura` = 0 hits relevantes; T03 é M01) |
| 15 | Q4.2: arquitetura e silhuetas pré-guerra de Tum | AUSENTE | Proprietário | horizon-system.js:36 «provisório»; ART-01 BLOQUEADO (design §7) |
| 16 | Q4.2: validar equipamento | PARCIAL | Proprietário | `research/equipment-timeline.json` existe (não lido para M02); MP 38 ai:46 sem fonte (EQP-01) |
| 17 | Q4.2: acordar o contrato de campanha (R4 / DEC-07) | CONTRADIZ | Proprietário | Schema próprio: sim:59, 1368 `m02-01-bench-snapshot-v1`/`m02-02-snapshot-v2`; ponte própria `cod-guerra-campaign-bridge-m02-to-m03-v1` (handoff:75). design:235 M02-10 propõe envelope comum, só com D-M02-4 |
| 18 | Q4.2: provar interiores / IA / dano / save | PARCIAL | Capitão | Testes de estado existem (`tests/m02-0[1-6]*.test.js`; `validateM02Snapshot` SAVE-01/02, handoff:147). Sem prova de proporções, contacto da arma, nem save real da campanha |
| 19 | Q4.2: produzir assets/animações/som | AUSENTE | Proprietário | design §5: tudo procedimental/primitivo, licenças de cavalo/VO/sons por definir; `render/m02-01-renderer.js` sem modelos externos |
| 20 | Q4.2: medir e jogar o slice | AUSENTE | Proprietário (playtest) | Sem registo de playtest M02; `tools/m02/run-m02-01.mjs` e `playwright-m02-01.config.js` existem (automação, não jogo humano) |
| 21 | Q4.2: «fonte localizada mas inacessível não conta como confirmação» | CONTRADIZ | Capitão | Fontes BZ-H04/H05/H07/H09 inacessíveis (design §7), mas html:244 já usa 56.º Rgt/25.ª DI como facto |
| 22 | Q4.3 Primeira tarefa: M02-01 blockout independente 100×150 m com B01/B02 | IMPLEMENTADO | — | handoff:7 (M02-01); `tests/m02-01-quinta-geometry-ballistics.test.js`; `missions/m02-bzura/m02-quinta-layout.json` |
| 23 | Q4.3: portas/janelas funcionais, duas rotas, colisões, linhas de tiro verificáveis | IMPLEMENTADO | — | Portas físicas ai:590; eixos Vala/Pomar sim:350, 1257–1262; teste geometria/balística; `friendlyFireClear` ai:524 |
| 24 | Q4.3: entregar vídeo, planta e resultados reais antes de autorizar combate completo e arte | AUSENTE | Capitão | Nenhum vídeo/planta final como entrega em `docs/m02/` (só PDF e auditorias). Combate completo e Áreas B/C já implementados antes do gate (handoff:7–11) |
| 25 | Q4.3: não requer alterar M01, fazer merge ou deploy | PARCIAL | Proprietário | Entrada `m02-01.html` e `src/m02/m02-01-main.js` separadas de M01. Mas houve merge `426045ee`; D-M02-1 pedia exatamente essa autorização (design:253). Alteração a M01: não verificada por diff |
| 26 | DEC-01 cronologia sem recuo geral matinal → **D-M02-2** | PARCIAL | Proprietário | acts:808 `generalRetreatOnMorningSept10: false` (IMPLEMENTADO no código); decisão não registada como aceite (design §6 item 2) |
| 27 | DEC-02 56.º pp proposto sem companhia → **D-M02-3** | CONTRADIZ | Proprietário | design:258 «Até haver resposta, não aparece no ecrã (M02-FIX-1)»; html:244 e ai:206 ainda mostram «56.º Regimento / 25.ª DI» e «Mensageiro 56 pp» |
| 28 | DEC-03 três células → **D-M02-5** | IMPLEMENTADO (sem aceitação) | Proprietário | `m02-quinta-layout.json` + `m02-cells-bc-layout.json`; zonas A/B/C em acts. Decisão por aceitar |
| 29 | DEC-04 clímax local em Leśmierz → **D-M02-5** | IMPLEMENTADO (sem aceitação) | Proprietário | acts:484 O06, SP03 `detonateC10FixedArtillery` (handoff:145); ficção sem marca (item 3) |
| 30 | DEC-05 rota do pomar mais longa nesta planta → **D-M02-5** | NÃO VERIFICÁVEL | Capitão | Rota Pomar existe (sim:1257); comprimento relativo à Vala não medido por mim |
| 31 | DEC-06 CP final antecipado (para C10) → **D-M02-5** | IMPLEMENTADO | Proprietário | acts:529–530 `cp_m02_d_cobertura_retirada`; acts:401 `cp_m02_c_reorganizacao`. O CP «final» fica em C10 (cobertura), conforme DEC-06; confirmar contra O/I |
| 32 | DEC-07 flags legadas mantidas com domínios adicionais explícitos → **D-M02-4** | PARCIAL | Proprietário | Flags com prefixo `m02.` (sim:335, 445–446, 1153–1160; acts:273–383); mas schema e ponte próprios (item 17), não o envelope R4 |
| 33 | DEC-08 sem raides aéreos em horas não confirmadas → **sem D-M02-n** (design:245 S14 «Retirado da M02») | IMPLEMENTADO | Capitão | grep `Stuka\|Luftw\|Ju 87\|06:10\|07:50` = 0 hits no código M02 (B.md linha 26). Linha do `CAMPAIGN_PLAN.md` «M02 reutiliza Ju 87» desatualizada (design:245) |
| 34 | Mapeamento inverso: D-M02-1 (fusão), D-M02-6 (elenco), D-M02-7 (gate) sem DEC | DECISÃO PENDENTE | Proprietário | design §6 itens 1, 6, 7. Q3 menciona «quatro nomes ainda são propostas» (Q1/K): Gruca, Wierzba, Małek, Szymczak em ai:706–707 e sim; «Małek» vs «Malec» da M05 por rever |

## Contagem

- IMPLEMENTADO: 6 (22, 23, 28, 29, 31, 33; 28/29/31 sem aceitação do proprietário)
- PARCIAL: 12 (2, 3, 4, 5, 7, 9, 10, 16, 18, 25, 26, 32)
- AUSENTE: 7 (6, 13, 14, 15, 19, 20, 24)
- CONTRADIZ: 4 (12, 17, 21, 27)
- NÃO VERIFICÁVEL: 3 (1, 8, 30)
- DECISÃO PENDENTE: 2 (11, 34)
- Total: 34 linhas.

## Desvios prioritários

1. **O código ultrapassou o veredito de Q4.** Q4 autoriza apenas a bancada M02-01 isolada (A) e exige vídeo, planta e resultados antes de combate completo e arte. Estão implementadas as Áreas B e C, o epílogo e a ponte M02→M03 (handoff:7–11, 66–77), sem entrega de vídeo/planta (linha 24) e com D-M02-1 e D-M02-7 por decidir (linha 12). A integração `426045ee` precede a decisão do proprietário.
2. **DEC-02/D-M02-3 não cumprida no ecrã.** O design:258 manda não mostrar o 56.º pp até haver resposta; html:244 e ai:206 mostram-no. Mesma raiz da dificuldade de Q2 sobre localização (linhas 2, 13, 21, 27): uma fonte inacessível usada como confirmação.
3. **Contrato de campanha divergente (DEC-07/D-M02-4).** Schema `m02-*-snapshot` e ponte `…-bridge-m02-to-m03-v1` próprios (sim:59, 1368), contra o envelope comum R4 + S1 que Q4 pede para «acordar». Risco de dois gestores de save (design:235).
4. **Lis (Q2): teleporte de regresso.** acts:601–603 reposiciona Lis em (-28, -22) ao regressar ferido; Q2 diz «não admitir tiro impossível ou teleporte para cumprir o guião». Deve ser verificado em ensaio se o jogador pode ver a reposição.
5. **Leśmierz e equipamento tratados como facto.** Cartela TR03, O06 e SP03 sem marca de dramatização (Q2 «plausível ≠ documentado»); MP 38 (ai:46), MG34/Kar98k (html:247) sem fonte (EQP-01).
6. **Provas em falta que Q2/Q4 listam como condição:** custo do horizonte (linha 6), pose/dano visual dos aliados (linha 5), playtest (linha 20), fontes BZ-H em `research/SOURCES.md` (linha 14).

## Decisões pendentes do proprietário

- **D-M02-1 Integração** da bancada (já fundida na linha em `426045ee`): ratificar ou reverter; ligada a Q4.1 e Q3 (expansão exige aprovação).
- **D-M02-2 = DEC-01** cronologia sem recuo geral matinal (código já cumpre; falta aceitação).
- **D-M02-3 = DEC-02** 56.º pp apenas proposto: retirar do html:244 e ai:206 (M02-FIX-1) até haver resposta.
- **D-M02-4 = DEC-07** contrato de save comum (R4 + S1) ou aceitar o schema próprio.
- **D-M02-5 = DEC-03/04/05/06** três células, clímax em Leśmierz, pomar mais longo, CP final antecipado: implementados, sem aceitação.
- **D-M02-6 Elenco:** Gruca, Wierzba, Małek (conflito com Malec da M05), Szymczak; Jan Wrona fora.
- **D-M02-7 Gate do Marco 2:** pode a bancada avançar antes de a M01 estar aprovada? (Q4.1 «depois da autorização correspondente».)
- **DEC-08** (sem raides aéreos em horas não confirmadas): sem D-M02-n; sugere-se registar como aceite, o código já cumpre e o design:245 retira S14.
- **Cortes de escopo (Q2):** confirmar se a carroça passa a estacionária ou se se mantém móvel (código já móvel).
- **Fontes (HIST-01/02, GEO-01/02, ART-01, EQP-01, TIME-01, CONT-01):** fornecer ou aceitar o mecanismo de bloqueio e a marca de «ficção» no ecrã.
