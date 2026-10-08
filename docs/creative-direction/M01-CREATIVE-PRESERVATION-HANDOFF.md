# M01 — CREATIVE PRESERVATION HANDOFF · Estado, preservação, antes/depois, revisão e instruções

**TASK_ID** `M01-COMPLETE-NARRATIVE-GAMEPLAY-ATMOSPHERE-DIRECTION-V1` · **Branch** `claude/upbeat-ptolemy-rzqu5g` (base `main` @ `72bbcdd`) · **Data** 2026-10-08
**Natureza da entrega:** 15 documentos de direção criativa em `docs/creative-direction/`. **Nenhum ficheiro de código, dados de missão, assets, workflows ou documentação existente foi modificado.** M01 continua **PROTÓTIPO JOGÁVEL**. Nada aqui é implementação nem certificação.

## 1. Estado real do projeto (inspecionado em 2026-10-08)

| Item | Estado | Evidência |
| --- | --- | --- |
| `main` | `72bbcdd` (PR #24). M01 PROTÓTIPO JOGÁVEL com runtime, 12 objetivos, 26 eventos, CP-A..D, cobertura/fogo alemão como dados, partidas contínuas por piloto automático. | `DEVELOPMENT_STATUS.md`, `QUALITY_REPORT.md` |
| Consolidação V5 `codex/m01-ready-deliveries-consolidation-v5` @ `d277b06` (PR #52, **draft**) | **EM INTEGRAÇÃO**, não certificada: Station V2 (PR #42), Animation Contract V1 (PR #43), train detail/65 vagões, Bridge Structural V2, HUD Cinematic V1, Vegetation V1, Battlefield Audio V1, Ju 87 V2, First-person Weapon V1, Damage Decals V1, motion clips V1 (PR #49), ckm crew, MG34 prone, stationDrag, schema-2 audit. CI: shard 3 cancelado por runner; 3 testes Playwright de FX falham (PR #53 diagnostica). **Animation Resolver não existe.** | PR #52/#53 (comentário na Issue #55), `docs/verification/m01-runtime/ready-deliveries-consolidation-v5/HANDOFF.md`, V2 `INTEGRATION_LOG.md` |
| `codex/m01-final-production-consolidation-v6` | mesmo SHA da V5 (`d277b06`) | `git` |
| Station V3 `codex/m01-station-visual-fidelity-v3` (PR #54) | **READY_FOR_CAPTAIN_REVIEW**, fora da V5 | handoff da V3 |
| Battlefield FX polish V3, Soldier Visual Variation, wz.29 ViewModel runtime | já contidos na V5 (sem commits à frente) | `git log V5..branch` vazio |
| Soldier locomotion/animation architecture (`codex/m01-soldier-locomotion-animation`) | **PROPOSTO** (arquitetura + protótipo; 6 commits à frente da V5) | `docs/architecture/SOLDIER_ANIMATION_SYSTEM.md` |
| World Interaction System (`codex/m01-world-interactions`) | **PROPOSTO** (7 commits à frente) | `docs/architecture/WORLD_INTERACTION_SYSTEM.md` |
| Narrativa de campanha (PR #44 `codex/campaign-script-polish-v2-30-missions`) | **PROPOSTO** (draft contra `main`; 8 documentos em `docs/campaign/`) | PR #44 |
| Quatro tarefas "EM PROGRESSO" referidas na Issue #55 | **não identificadas inequivocamente**; esta entrega não as infere nem lhes toca | Issue #55 |
| Ficheiros narrativos (`mission.json`, `SCRIPT.md`, `STORY_BIBLE.md`) | idênticos em `main` e V5 | `git diff` |
| Playtest humano, Chromebook, VO, arte final de humanos | **PENDENTES** | todos os handoffs |

## 2. O que esta entrega acrescenta (resumo)

| Documento | Conteúdo |
| --- | --- |
| Master Story Bible | logline, três motivos (distância, contar, a ponte civil), temas → cenas, cinco atos sobre a estrutura aprovada, conflitos, o momento moral, arcos, objetos, antes/depois, lista de proteção, critérios narrativos |
| Historical Validation | cronologia validada hora a hora com classes, luz/som/clima, forças, divergências, Szymankowo, matriz de asserções do conteúdo novo, proibições, pendências novas (P-NOVA-1..7), gate por cena; registo honesto do que não foi possível ler nesta sessão |
| Character Bible | 10 personagens aprofundadas + 6 vagas existentes nomeadas (Rusek; Hajduk/Cyra/Piszczek; Wąs/Lenc), retrato coletivo dos alemães, regras de pessoas históricas, mapa de relações, evolução por ato, direção de elenco/voz |
| Dialogue Production Script | política de idioma (VO polaco, legendas PT), mapa das 70 falas canónicas, ≈55 falas novas com gatilho real/condição/cooldown/prioridade/classe e referência em polaco, callouts a ligar, variação anti-repetição, contrato de silêncio |
| Complete Cinematic Screenplay | 11 cenas no formato do brief §27, com timelines, atuação, som, luz, transições, consequências, fallbacks, critérios; cenas paralelas |
| Gameplay Variety Design | análise dos 5 setores (10 pontos cada) e dos 12 objetivos (hoje/risco/proposta/critério), catálogo de situações, o que não se propõe, 10 expansões separadas |
| Cinematic Gameplay Set Pieces | 9 set pieces no formato do brief §11 + micro-situações + regras transversais |
| Environmental War Storytelling | roteiro ambiental por setor e hora (estado inicial, atividade, tensão, combate, humanos, consequências, transição), catálogo de detritos com origem, "o que se vê às 07:05" |
| Atmosphere Art Direction | paleta mestra, tabela de luz por hora sobre os uniforms reais, céu, glare, névoa/fumo/poeira, materiais, por setor, antes/depois, método de prova |
| Audio & Music Direction | inventário do áudio V1, mapa sonoro por hora e distância, camadas novas, contrato de silêncio, política de música (um motivo, duas aparições), assinaturas, acessibilidade |
| Cinematic Shot Bible | princípios de primeira pessoa, vocabulário, shot list por cena, orçamento de controlo retirado (≤ 9 %), transições, regras de atuação |
| Integration Matrix | inventário dos sistemas reais, ≈60 propostas com ID/classe/ficheiro/mecanismo/persistência/dependência/teste, estados persistentes, leituras por agente, conflitos com trabalho em curso |
| Creative Production Roadmap | fase 0 (pré-requisitos), 5 fases por prioridade/esforço/risco, grafo de dependências, riscos, critérios de saída |
| Campaign Creative Vision | o que M01 estabelece, seis movimentos (PR #44), uma situação central por missão, verbos, atmosfera por frente, oito regras |
| Este handoff | estado, preservação, antes/depois, problemas, revisão, instruções |

## 3. Conteúdo preservado (não tocado, não contradito)

1. `mission.json` integral (IDs, 12 objetivos, 26 eventos, gates, tolerâncias, segmentos, 4 checkpoints, 6 cutscenes, 70 falas, callouts, flags, debrief).
2. `SCRIPT.md`, `STORY_BIBLE.md`, `HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md`, `MAP.md`, `ENGINE_CONTRACT.md`, `research/*`.
3. Todo o `src/`, `tests/`, `tools/`, `assets/`, workflows.
4. Todas as branches/PRs de outros agentes (V2–V6, #42–#54, Station V3, locomotion, world-interactions, PR #44).
5. Regras: Nowicki `missing`; Bąk nunca morre; a demolição polaca nunca mata o jogador; nenhum alemão na margem oeste; Kowal nunca suprime os alemães do tabuleiro; pessoas históricas fora de cena; bombas ≥ 30 m; a bancada francesa.

## 4. Antes / depois (exemplos concretos)

### 4.1 A ordem (05:30)
**Antes** (`SCRIPT.md` Cena 6): Pawlak chega, 033, 034; o raid das 05:30 "representado por som e fumaça distantes".
**Depois** (doc 2, Cena 6 / SP-05): todos olham para cima 2 s; Zieliński diz "Cinco e meia." **antes** de Pawlak falar (sabe o que vem); 033 e 034 ditas **sob** o zumbido alto; às 05:34 Pawlak: "Cinco e trinta e quatro. Acabou lá em cima."; CP-C. Mesmo evento, mesma hora, mesmo gate.

### 4.2 Depois da explosão leste (06:10)
**Antes:** 045 "…Lá se foi o outro lado.", 046 "Todos fora da ponte!"; alemães recuam com feridos "sem close e sem humilhação".
**Depois:** + apito anunciado por Krawiec ("Três toques. Depois, chão."), Pawlak a dizer a hora, 2 s sem som, Jan "Dois segundos.", Rusek a querer disparar sobre quem rasteja, Zieliński "Esses já não vêm.", Kowal "Não é tiro, é pontaria."; se o jogador dispara sobre caídos, "Não gasto cartuchos com quem já caiu. Nem você." e 20 s sem falas. Nenhuma mudança no estado da simulação além de uma flag opcional.

### 4.3 A retirada (06:10–06:45)
**Antes:** sair da ponte; contar (049); avisos; demolição; 052.
**Depois:** + a guarnição da ckm a sair da casamata com a arma ("Esta não fica. Vem connosco." / "Capral, e se eles atravessarem?" / "Então é por isso que a levamos."), Zieliński a mandá-los para a estação, a contagem dita um homem de cada vez, Krawiec "Oitenta anos. Quarenta segundos." depois de Lipski. Mesmos gates, mesma escolta, mesmo CP-D.

### 4.4 Atmosfera
**Antes:** interpolação única de duas cores de fundo, Sol `#ffe0b0`, skylight constante, exposição 1,08.
**Depois:** sete keyframes de cor por hora, skylight baixo nas horas azuis, glare a leste, névoa fina do rio até 05:00, haze de fumo acumulado, materiais dessaturados; tudo com capturas A/B e equivalência de rota como prova.

## 5. Problemas encontrados durante a investigação (para corrigir fora desta entrega)

| # | Problema | Onde | Sugestão |
| --- | --- | --- | --- |
| 1 | `SCRIPT.md` diz "Estado: **PLANEJADA** … ainda não é uma missão jogável" enquanto `mission.json`, README e DEVELOPMENT_STATUS dizem PROTÓTIPO JOGÁVEL | `missions/m01-tczew/SCRIPT.md` linha 3 | atualizar o estado (doc) |
| 2 | `SCRIPT.md` §7 dá CP-B em (−148, −3, **30**); `mission.json` tem `[-148, -3, 14]` | `SCRIPT.md` §7 | corrigir a tabela para 14 |
| 3 | `missions/campaign-plan.json` mantém `m01.status = PLANEJADA` | `campaign-plan.json` | atualizar quando o estado for formalizado |
| 4 | Callouts especificados sem `id` (`npc_reloading`, `player_reloading_near_ally`, `ally_hit`, `cover_rotation`, `sun_glare_player_facing_east`) não estão ligados; só os dois `co_m01_*` tocam | `mission.json → callouts.lines`, `m01-simulation.js` | N-07/N-08 na matriz |
| 5 | Registo de tratamento misto (pt-BR "você"/"Cubro você" vs HUD V1 "Polónia", "Espaço · saltar cena") | `mission.json`, `src/ui/m01-hud.js` | decisão de localização antes de gravar VO |
| 6 | `generic_rifleman` é ao mesmo tempo o falante de 016 e o ferido do pátio (`STATION_PATIENT`) | `m01-simulation.js` | aceitável; documentado na Character Bible §11.4 |
| 7 | `evt_m01_second_air_pass` emite um `distant-shot` (som) e **nenhum fumo**: a "segunda passagem com explosões" não deixa marca visual | `consume()` | E-04 na matriz |
| 8 | O pelotão leste não dispara visivelmente antes das 06:00 (os `pl_east_*` só ativam no recuo): S2 só tem clarões alemães durante 04:46–06:00, embora a agenda diga "fogo do pelotão leste" | simulação/apresentação | G-07 / emissores de apresentação |
| 9 | Topónimo "Koźlin"/"Koźliny" continua pendente (P9); o evento chama-se `kozliny_attack_distant` | docs | manter "ataque vindo do norte" em texto visível |
| 10 | A fila de legendas é FIFO sem prioridade: falas ambientais podem atrasar avisos | `line()`/`tick()` | N-10 |
| 11 | O áudio tem o perfil da ckm wz.30, mas a simulação nunca decide fogo da ckm; a guarnição existe e abandona a arma | `battlefield-audio.js`, `m01-simulation.js` | a direção transforma a limitação em história (a arma que não disparou); não inventar fogo |
| 12 | `docs/verification/m01-runtime/continuous/README.md` referido no DEVELOPMENT_STATUS existe; mas as partidas contínuas pertencem a builds anteriores à V5: não há partida contínua da V5 | evidências | repetir o piloto automático sobre a V5 (Issue #55) |
| 13 | Acesso a fontes externas bloqueado nesta sessão (DNS): nenhuma leitura nova; só resumos de busca (S01–S08) | ambiente | P-NOVA-2..4 |

## 6. Revisão criativa profissional (0–10, com justificação)

| # | Critério | Nota | Justificação (e fragilidade) |
| --- | --- | --- | --- |
| 1 | Qualidade da história | 8 | Estrutura aprovada já era forte; os três motivos dão-lhe espinha. Fragilidade: a história depende de silêncios e gestos que exigem o Animation Resolver. |
| 2 | Autenticidade histórica | 8 | Tudo classificado; divergências registadas; proibições explícitas. Fragilidade: S01–S08 não lidos; P8/P13 abertos. |
| 3 | Originalidade | 7 | Nenhuma cena/fala/enquadramento de CoD; o momento moral nasce da geometria real (700 m). Fragilidade: "a caneca" e "a chamada" já eram canónicas; o novo é aprofundamento, não invenção radical. |
| 4 | Profundidade das personagens | 8 | 16 pessoas com contradição, medo e padrão de voz. Fragilidade: Rusek e a guarnição só têm 2–5 falas: profundidade por gesto depende da Fase 3. |
| 5 | Naturalidade dos diálogos | 7 | ≤ 6 palavras em combate; sem discursos. Fragilidade: registo misto a decidir; referências em polaco por rever por nativo. |
| 6 | Impacto emocional | 8 | Seis silêncios, a perda sem corpo, o número dito em voz alta. Fragilidade: sem VO, as legendas carregam tudo. |
| 7 | Brutalidade contextualizada | 7 | Um único momento (Rusek/111) com causa, duas reações e consequência; Szymankowo só relatado. Fragilidade: M01, por facto histórico, tem pouco contacto; a intensidade de WAW não cabe aqui e não deve ser forçada. |
| 8 | Atmosfera sombria | 7 | Paleta, luz por hora, glare, haze, materiais; respeita o clima. Fragilidade: sem volumétricos/AO; humanos provisórios limitam a "imagem única". |
| 9 | Environmental storytelling | 8 | Hora a hora, detritos com origem, o que se vê às 07:05. Fragilidade: muitos props são [B]; S3 vive de [C] (carroças, extras). |
| 10 | Variedade de gameplay | 7 | Verbos distintos por objetivo dentro da estrutura; fetch quest reconvertido; retirada com contagem. Fragilidade: o verbo "disparar a clarões" ainda domina 04:46–06:10; as expansões que mais mudam (pares, ckm, MG que sobe) são [B]/[C]. |
| 11 | Qualidade dos set pieces | 8 | Nove, todos jogáveis, todos sobre eventos existentes, com fallbacks e persistência. Fragilidade: SP-05/SP-06 são "de espera" por desenho; exigem a Fase 3 para não parecerem vazios. |
| 12 | Participação dos companheiros | 7 | Iniciativa já existente (Kowal, Dudek, sapadores, pelotão) agora verbalizada e dirigida. Fragilidade: sem Resolver, os gestos não existem; Kowal não pode suprimir o tabuleiro (regra). |
| 13 | Direção cinematográfica | 7 | Primeira pessoa dirigida com shot list; ≤ 9 % de controlo retirado. Fragilidade: sem câmara externa; o plano final é opcional [C]. |
| 14 | Direção sonora | 8 | Base V1 excelente; mapa por hora; contrato de silêncio; música quase ausente. Fragilidade: sem passos nem água hoje; sem escuta humana. |
| 15 | Ritmo da missão | 8 | Curva com quatro silêncios obrigatórios; esperas com conteúdo. Fragilidade: `readyScale` 27× depois do reparo pode parecer abrupto; proposto mostrar a luz a mudar. |
| 16 | Integração com os sistemas existentes | 9 | ≈60 propostas mapeadas a ficheiros/mecanismos reais; maioria [A]; nenhum campo obrigatório novo; conflitos com WIP identificados. Fragilidade: V5 ainda não está verde. |
| 17 | Continuidade da campanha | 8 | Visão alinhada com o PR #44; oito regras herdadas; M25 como espelho de M01. Fragilidade: M02–M30 continuam planos. |
| 18 | Potencial de memorização | 8 | Clarão/som, caneca, número em voz alta, "Esses já não vêm.", a guarnição com a arma, "Oitenta anos." Fragilidade: tudo depende de execução (VO, gestos, luz). |

**As cinco maiores fragilidades e o que foi corrigido na revisão desta entrega:**
1. *O tiro sobre caídos a 700 m raramente acerta* (wz.29, alça 1000): a reação 111 ficaria quase inativa. **Corrigido:** o gatilho passou a "tiro do jogador que **passa a < 3 m** de um alemão caído/em retirada **ou** o atinge", usando a mesma lógica de aproximação já usada para a supressão (docs 1, 7, 12 atualizados).
2. *Rusek "molhado até ao peito"* implicava uma travessia de água não plausível para quem veio pelo tabuleiro. **Corrigido:** "sujo de terra e fuligem, o uniforme rasgado no ombro" (doc 6).
3. *Registo de tratamento*: as falas novas seguiam o "você" canónico, mas o HUD é pt-PT. **Decisão registada** como pré-requisito da Fase 1 (doc 13), não resolvida unilateralmente.
4. *Cartela 3* podia atrasar o fade-in do HUD V1. **Corrigido:** alternativa de três linhas na cartela 2 (doc 2/10).
5. *Esperas (SP-05/SP-06)* dependiam de gestos inexistentes. **Corrigido:** cada espera recebeu falas [A] (112/164/115/161/141/113) que não dependem do Resolver.

**Perguntas críticas (respostas honestas):**
- A missão tem personalidade? **Sim**: distância, contar, a ponte civil; nenhuma outra missão da campanha pode ter as mesmas três.
- O jogador vai sentir medo? **Nos motores, no sol e na última chamada, sim; no combate a 1 km, menos**: é tensão, não medo. Aceita-se: é a verdade de Tczew.
- Os companheiros parecem humanos? **Em texto, sim; em jogo, só com a Fase 3.**
- O ambiente parece uma guerra real? **Com a Fase 2, uma guerra à distância; os humanos provisórios continuam a ser o limite.**
- Existe variedade suficiente? **Suficiente para 20 minutos; não para 40.** A duração-alvo (18–24 min) protege a missão.
- As situações jogáveis são memoráveis? **Três são (SP-01, SP-07, SP-08); as outras são boas.**
- O jogo está demasiado dependente de cutscenes? **Não** (≤ 9 %).
- Os acontecimentos fazem sentido historicamente? **Sim**, com as pendências declaradas.
- O roteiro respeita o progresso técnico? **Sim**; nada muda nos contratos sem [D].
- Estamos a criar algo original ou a imitar CoD? **Original**: o combate a 1 km, o trabalho protegido, a demolição própria e a contagem não existem nesses jogos.

## 7. Sondas de playtest (acrescentar ao protocolo M01 do PR #44)

1. Depois das 04:34, o jogador consegue dizer de onde vieram os aviões? (SP-01)
2. Durante o reparo, o jogador percebe que calar a MG retoma o trabalho sem ler o HUD? (SP-04)
3. Às 05:30, o jogador olha para cima? Espera bombas? (SP-05)
4. Às 06:10, o jogador estava a olhar para leste? Ouviu o som depois? (SP-07)
5. O jogador disparou sobre os caídos? O que fez depois de 111? (momento moral)
6. O jogador diz o número do pelotão antes de o HUD o mostrar? (O11)
7. No abrigo, para onde olhou durante os 7 s de silêncio? (SP-09)
8. Que objeto recorda? Que pessoa? Que silêncio?

## 8. Instruções para os agentes de implementação

1. **Não implementar nada antes de a V5 estar verde** (Issue #55) e de o Capitão aprovar esta direção, no todo ou por fase.
2. **Começar pela Fase 1** (doc 13): só dados e falas ligadas a eventos existentes; prova por A/B de rota e 12 sementes.
3. **Nunca** tocar nas três falas verificadas literalmente, nos relógios, nos gates, nas regras de segurança, no modelo de fogo, na regra de Kowal, nos checkpoints, no schema (campos novos só opcionais).
4. **Cada proposta tem um ID** na matriz (doc 12): referir o ID no commit e no handoff; marcar o estado (feito/parcial/rejeitado) numa tabela de acompanhamento em `docs/verification/m01-runtime/<tarefa>/HANDOFF.md`, como as entregas anteriores.
5. **Antes de gravar VO:** decisão de registo (pt-PT/pt-BR), P-NOVA-1 (nomes), revisão nativa do polaco, licenças.
6. **Antes de qualquer alteração visual:** fixtures de câmara existentes, estado congelado, hash igual, contadores; sem FPS inventado.
7. **Respeitar** o Animation Resolver (próxima tarefa anunciada), Station V3 (PR #54) e o diagnóstico de FX (PR #53): não criar caminhos paralelos.
8. **Atualizar** `DEVELOPMENT_STATUS.md`/`docs/NEXT_CHAT_CONTEXT.md` de forma aditiva quando uma fase entrar em código; esta entrega não os alterou de propósito (são ficheiros com histórico concorrente em várias branches).

## 9. Estado da branch e validação

- Branch `claude/upbeat-ptolemy-rzqu5g`, base `main` @ `72bbcdd`. Ficheiros novos: 15 documentos + `README.md` em `docs/creative-direction/`. Nenhum ficheiro existente modificado. Sem alterações em `main`, deploy, Pages, workflows ou branches de outros agentes.
- Validação executada nesta sessão: `npm ci` e `npm test` sobre a árvore com os documentos (resultado na secção 9.1). Testes de navegador não executados (sem alterações de código; o ambiente desta sessão não tem Chromium verificado). **Não há playtest humano nem medição de FPS.**
- PR: draft contra `main`, conforme instrução da tarefa e `AGENTS.md` ("abrir PR para main"), **sem merge**. A integração em código acontece por fases, em branches próprias, sobre a V5.

### 9.1 Resultado dos testes
- `npm ci` (Node v22.22.0, npm 10.9.4): concluído sem erros.
- `npm test` sobre a árvore `main` @ `72bbcdd` + estes documentos: **108/108 testes Node, 0 falhas, 0 cancelados, 0 ignorados** (17,8 s). Inclui `tests/m01-tczew-data.test.js` (validação dos dados de M01: IDs, cronologia, equipamento, falas obrigatórias, classificações, checkpoints, setores, geometria, debrief), que continua verde porque `mission.json` e os documentos de pesquisa **não foram alterados**.
- Não executados: `npm run build` (sem alteração de código ou assets) e `npm run test:browser` (sem Chromium verificado nesta sessão; sem alterações de runtime). Os 344 testes Node da V5 pertencem à consolidação V5 e não foram executados aqui (esta branch parte de `main`).
- Verificação dos documentos: links internos entre os 16 ficheiros resolvidos; IDs de falas novas usados nos roteiros existem no guião de diálogos; nenhum placeholder.
