# M01 — R0: matriz de requisitos da proposta de reconstrução (2026-10-23)

**Base auditada:** candidata única PR #80, `claude/quirky-heisenberg-9l4m7b` @ `9c1d7f2` (código = `40787b2`). Branch desta auditoria: `claude/exciting-bohr-k8v5xm` (fast-forward da #80; só documentação).
**Entrada:** «Proposta de reconstrução da M01» e «Adenda final — padrão WaW + WWII» do proprietário (2026-10-23), depois do playtest da #80 com resultado **NÃO APROVADA**.
**Método:** leitura estática do código, dados e documentos (`m01-simulation.js`, `m01-squad.js`, `m01-deck-assault.js`, `m01-barks.js`, `mission.json`, `map-layout.json`, `src/render/m01-*`, `COD_WAW_WWII_BENCHMARK.md`, `M01_INTEGRATION_LEDGER.md`, `M01_CAPTAIN_HANDOFF_2026-10-22.md`, `HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md`). Não se correram testes nem browser nesta fase.
**Limites:** as fontes históricas externas (muzeum1939.pl, konflikty.pl, derela.pl, mostytczewskie.pl) **não são acessíveis** a partir deste ambiente cloud (HTTP 000 / DNS). A coluna histórica usa só o que o repositório já regista; nada foi confirmado de novo.

## Estados

- **VALIDADO**: confirmado em playtest humano. **Nenhuma linha está neste estado** (o único playtest da #80 reprovou a missão).
- **IMPLEMENTADO SEM PLAYTEST**: código e testes de estado presentes, cumpre o requisito no papel.
- **PARCIAL**: existe uma parte; a lacuna está descrita.
- **AUSENTE**: não existe no código nem nos dados.
- **NÃO VERIFICADO**: não foi possível confirmar nesta auditoria (precisa de execução, imagem ou fonte).

## Factos estruturais que condicionam o plano

1. **Área jogável:** x −460…440 m, z −80…140 m (900 × 220 m; `map-layout.json:22`). Lisewo, a frente norte, a oeste e Szymankowo ficam todos **fora** dela.
2. **Relógio:** 04:30:00–07:05:00 (`mission.json:376`), com salto 06:45 → 07:05. Os atos VI (curto) e VII (tarde) não existem.
3. **Setores da M01 são rótulos de horário**: `s1…s5` com `independentOfPlayer:true` copiam o `schedule` para `sector.state`; não há simulação por setor. `sector-battle.js`/`battle-director.js` só servem o sandbox antigo (`src/game/simulation.js`).
4. **Os bombardeamentos são só apresentação:** `mission.json:814` diz «nenhum impacto no reparo ou no jogador»; os seis `raidTargets` estão fora da área. Os danos persistem visualmente mas não mudam a colisão (`collidersAdded:0`) nem ferem ninguém.
5. **IA:** `m01-simulation.js:228`, «No movement between cover nodes yet … no callout events». A cobertura é postura em slots autorados; a coordenação de lanços (`m01-squad.js`) só começa depois das 06:10.

## 1. Problemas do playtest da #80 (secção 2 da proposta)

| # | Problema | Estado do sistema | Causa no código (evidência) | Fase |
|---|---|---|---|---|
| 1 | Melhoria dos soldados muito pequena | PARCIAL | Variedade de clips e IA fatia 1 entraram (`m01-animation-variety.js`), mas sem mudança de cobertura nem decisões novas | R2, R6 |
| 2 | Aliados e inimigos pouco inteligentes | PARCIAL | Sem movimento entre coberturas nem callouts (`m01-simulation.js:228`); alemães com uma só linha de aproximação, sem flanqueio nem granadas | R2 |
| 3 | Mãos e dedos não seguram as armas | PARCIAL | Viewmodel: 3 clips autorados (`aim`, `reload_clip`, `fire_bolt`) e pose procedural (`m01-viewmodel.js`); sem perfil de pega por arma nem teste de atravessamento dos dedos | R6 |
| 4 | Defeitos ao apontar e recarregar | NÃO VERIFICADO | Precisa de captura em jogo; não há clips de interrupção/recuperação da recarga | R6 |
| 5 | Poses demasiado semelhantes antes do ataque | PARCIAL | Só 6 atores de pátio (`m01-yard-life.js`, `YARD_IDS`); café/limpeza são poses procedurais; não há fumar, munições, mensageiro nem binóculos | R1, R6 |
| 6 | A ação demora a ficar interessante | PARCIAL | Combate a leste só a partir das 04:46 (comboio 963); 04:30–04:34 sem atividade jogável; o bombardeamento não tem consequências | R1 |
| 7 | Combate distante ilegível | PARCIAL | Impostores ligados em runtime (`m01-view.js:126,243,799`), mas o alemão mais próximo está a 430 m (controlo) e a < 300 m em 0 % do tempo; clarões próprios só da ckm | R1, R4 |
| 8 | Polacos fazem pouco contra o ataque | PARCIAL | Retaguarda (`m01-rearguard.js`) e ckm disparam; nada de Bofors 37 mm, blindados ferroviários polacos nem contra-ação | R2, R5 |
| 9 | Sapadores sem trabalho visível | PARCIAL | Reparo é uma barra 0–100 (`REPAIR_WORK_SEC`) com pausa sob supressão; cabos/ferramentas decorativos; uma só pose `sapper_work` | R3 |
| 10 | Soldados sobrevivem ao lado das bombas | AUSENTE (sistema) | Impactos aéreos fora da área e sem dano (`mission.json:814`); não há dano de explosão a NPC | R3 |
| 11 | Acontecimentos em ciclos previsíveis | PARCIAL | Estrutura global por relógio; ciclo calmo da ckm 18 s fixo; vida do pátio por horário | R1, R2, R7 |
| 12 | Faltam veículos, equipamento e setores ativos | PARCIAL | Panzerzug, comboio 963 e 3 Ju 87 só animados; sem FT-17/TK-3 ferroviários, Bofors, camiões ou motos | R4, R5 |
| 13 | Longe da intensidade pretendida | PARCIAL | Soma de 6, 7, 10 e 11 | R1–R7 |
| 14 | História de Tczew pouco presente | PARCIAL | Setores E, F, G e J só como fogo distante ou texto; ato VII ausente | R4 |
| — | Problemas antigos (paredes, gravidade, MG mecânica, HUD, áudio, sincronia de falas) | NÃO VERIFICADO | Corrigidos em estado na #80 (0 atravessamentos, gravidade 9,81, MG cv 0,98, ver benchmark); **não declarar presentes nem resolvidos sem novo teste** | R9 |

## 2. Requisitos da proposta (secções 3–13)

### 2.1 Geografia (secção 3.2)

| Setor | Estado | Evidência | Lacuna |
|---|---|---|---|
| A Cidade de Tczew | PARCIAL | Estação (`m01-station-architecture.js:6`), barracão ferroviário (`m01-environment.js:103`), silhuetas urbanas fora da área (`m01-far-landscape.js:6`), 1 civil + 3 figurantes | Sem ruas jogáveis, quartel, central elétrica nem posto de socorro com geometria; localização do quartel por confirmar (`HISTORICAL_RESEARCH.md:138`) |
| B Cabeça de ponte oeste | IMPLEMENTADO SEM PLAYTEST | Trincheiras e sacos (`m01-environment.js:112–124`), posto da ckm S2, casamata, abrigo, posto avançado | Posto de comando sem geometria; posição da ckm é reconstrução |
| C Ponte ferroviária | IMPLEMENTADO SEM PLAYTEST | `map-layout.json:44` (EXACT, 9 vãos), `m01-bridge-structure.js`, `m01-demolition.js` | Encontro leste (x ≈ 800) fora da área; demolição só apresentação |
| D Ponte rodoviária | IMPLEMENTADO SEM PLAYTEST | `map-layout.json:58`, torres, coberturas `cv_road_truss_*` | Torres e pilares RECONSTRUCTED; danos progressivos ausentes |
| E Lisewo, margem leste | PARCIAL (visível, não jogável) | Dique, portões, comboio 963, Panzerzug (`map-layout.json:312–339`), atiradores dos portões (`m01-simulation.js:153`) | Fora da área (x > 440): só fogo e som; nenhum combate a ver de perto; retirada dos defensores só narrada |
| F Frente norte | PARCIAL | Origens de fogo e som distantes (`m01-terrain-envelope.js:51`, `battlefield-audio.js:545`), evento 07:00 | Sem geometria nem combate; «Koźlin/Koźliny» por confirmar (SOURCE_CHECK P9); Pszczółki só em docs |
| G Oeste/noroeste | AUSENTE | 0 ocorrências de Szpęgawa e Suchostrzygi no repositório | Precisa de fonte antes de qualquer posição |
| H Margens do Vístula | IMPLEMENTADO SEM PLAYTEST | Canal, água e vegetação (`m01-water.js`, `m01-terrain-relief.js:10`) | Sem defesa contra travessia depois das demolições (e nenhuma fonte no repo a documenta, ver §3) |
| I Apoio e comando | PARCIAL | Vagões, props do pátio, mensageiro Pawlak, reserva da ckm | Sem comando, depósito ou transporte de feridos jogável |
| J Szymankowo | AUSENTE | Só falas `dlg_m01_001`/`008` (dramatização marcada) e `db_06` | Sem cena, mapa de operações ou área |

### 2.2 Cronologia (secção 4)

| Ato | Estado | Evidência | Lacuna |
|---|---|---|---|
| I Antes das 04:34 | PARCIAL | Prelúdio 04:30–04:34 em tempo real; vida do pátio (`m01-yard-life.js`) | 4 min, 6 atores, sem preparação jogável nem variedade (fumar, munições, sapadores a inspecionar) |
| II Bombardeamento 04:34 | PARCIAL | `evt_m01_bombing_0434`, 3 Ju 87, fumo e danos persistentes | Sem baixas, feridos nem alteração do terreno pelas bombas; o ferido da estação é um evento fixo |
| III Cabeça leste ~04:45 | PARCIAL | Comboio 963 às 04:45, Panzerzug ~04:52, fogo dos portões | Só à distância; o jogador está no reparo |
| IV 04:50–06:00 | PARCIAL | Reparo, `seg_hold` comprimido 24×, assalto do tabuleiro, retaguarda | Sem contra-ação polaca nem blindados ferroviários polacos; coordenação ausente |
| V Retirada e demolição 06:00–06:45 | IMPLEMENTADO SEM PLAYTEST | Retirada 06:00, demolições 06:10/06:45, escolta SP-08, lanços da esquadra | Demolição sem consequência física na colisão; playtest pendente |
| VI Depois das pontes | PARCIAL | 06:45–07:05 com salto de relógio | Sem defesa da margem oeste nem reorganização jogável |
| VII Defesa da cidade (tarde) | AUSENTE | A missão acaba às 07:05 | Exige nova área/ato e fontes (ataque de Koźlin(y) ~07:00 de fonte única; retirada «ao anoitecer», T03) |

### 2.3 Sistemas (secções 5–13)

| ID | Requisito | Estado | Evidência | Lacuna |
|---|---|---|---|---|
| AI-1 | Soldado: observar, cobrir, posição de tiro, recarga, supressão, explosões, ferimentos, ajudar, ordens, retirada | PARCIAL | Visão por linha de vista e memória de 60 s (`sees`, `ai.seen`); espreitar, cadência e recarga 3,4 s; `aiPinned`/`recover`; estado `WOUNDED` | Sem escolha dinâmica de cobertura nem de posição; sem reação a explosões; ajuda e arrasto só em eventos fixos; aliados sem decisão de retirada própria |
| AI-2 | Coordenação de esquadra no combate principal | PARCIAL | Lanços entre postos, equipa A e Kowal (`m01-squad.js`), depois das 06:10 | Nada em 05:30–06:10; sem callouts de avistamento nem líder que se adapte |
| AI-3 | IA alemã | PARCIAL | Assalto do tabuleiro com `advance/cover/hold/fallback` e recuo por baixas (`m01-deck-assault.js`); MG34 com fogo de busca; sem omnisciência (`sees`) | Uma linha de aproximação; portão estático; sem flanqueio, granadas nem busca com movimento; mínimo 430 m |
| AI-4 | Estado emocional na animação; falas por eventos | PARCIAL | 62 regras reativas (`m01-barks.js`); animação lê supressão, ferimento, recarga e cobertura | Sem estados cansado, alarmado ou em pânico; ainda há falas por `poll` e cenas a horas fixas |
| WPN-1 | Arma 1.ª pessoa: dedos, recarga, transições, sem atravessamentos | PARCIAL | `m01-viewmodel.js`: 3 clips, marcadores mecânicos, recuo, `wallClearance`; testes `m01-viewmodel-feel`, `m01-fp-arms` | Uma só arma (kb wz.29); sem clips de sprint, interrupção ou troca; dedos não verificados; licença fp-arms-v2 pendente |
| WPN-2 | Armas em 3.ª pessoa | PARCIAL | Pin das mãos com IK até 45 m/16 atores (`m01-hand-pin.js`); arma por papel | Sem verificação visual; pouca variedade por papel |
| ANIM-1 | Atividade variada antes e durante o combate | PARCIAL | 3+3 idles, 4 fidgets; tarefas `clean_weapon`, `coffee`, `map`, `patrol`… | Ver problema 5 |
| SAP-1 | Operação técnica dos sapadores em 10 etapas | PARCIAL | Buscar caixa → entregar → `cover_repair` 0–100 com pausa sob supressão → `repair_complete` → `order_demolish` | Faltam identificar, inspecionar, verificar e preparar como etapas; abrigo por decisão própria; cabos/ferramentas funcionais; detonação e verificação |
| DMG-1 | Explosões com consequências | PARCIAL | Danos persistentes guardados no save (`sectors.damage`, `m01-damage-decals.js`, `m01-station-damage.js`); granada do jogador fere | Bombas sem dano a soldados, posições, cobertura ou tarefas (facto 4) |
| VIS-1 | Legibilidade à distância | PARCIAL | Impostores T20 por nação, contraste mínimo, rim/perspectiva aérea nos alemães | Distância real do combate; clarões por atirador além da ckm; observação por binóculos ausente |
| VEH-1 | Veículos e equipamento históricos | PARCIAL | Panzerzug (animado, canhão de exibição), comboio, 3 Ju 87, carroças estáticas | FT-17/TK-3 ferroviários, Bofors 37 mm, 76,2 mm, camiões e motos: AUSENTE (e ver §3 sobre as fontes); nada funcional em jogo |
| AUD-1 | Áudio por geografia, camadas, sem repetição | PARCIAL | Bandas por distância, atraso do som, absorção, 4 vozes por arma; camadas de vento, comboio, aviões; Ju 87 | Tudo sintetizado (T45 BLOQUEADA, humano); sem camada contínua de rio; sem etiqueta de áudio provisório; ninguém ouviu |
| PERF-1 | Qualidade escalável e desempenho medido | PARCIAL | Low/Medium/High, deteção automática, LOD com histerese, impostores instanciados, Skeleton partilhado (WP4) | Sem Ultra; ≈26 draw calls por soldado; sem FPS no PC (T49); sem simulação por regiões |
| EVT-1 | Sem ciclos previsíveis | PARCIAL | Jitter na cadência (Kowal 71 % → 2,2 % de repetição) | Guião global por relógio; ciclos fixos da ckm e do pátio |
| WAR-1 | Guerra noutros setores sem o jogador | PARCIAL | Combate a leste por tick, independente da posição | Setores sem simulação (facto 3); só `distant-shot` pontuais a norte |

## 3. Afirmações históricas da proposta contra o que o repositório documenta

Fontes externas inacessíveis daqui. Nada disto pode ir para o jogo como facto antes de ler as fontes (regra: «não inventar novas batalhas ou posições»).

| Afirmação | No repositório | Estado |
|---|---|---|
| 2.º Batalhão com ~1.068 militares | Sem efetivo registado | NÃO VERIFICADO |
| Ataque aéreo às 04:34 | 04:34 (H02, T10) contra 04:35 (T12); 3 Ju 87 da 3./StG 1 (T12) contra 6 aviões (T11) | DIVERGENTE (já registado) |
| Comboio e Panzerzug ~04:45; aviso de Szymankowo | Comboio 963 ~04:45; Panzerzug 7 «hora imprecisa»; aviso em T13 | PARCIAL |
| Combate e retirada em Lisewo | Retirada do pelotão leste ~06:00 (T01, T08) | Coerente |
| FT-17 e TK-3 em via férrea em Tczew | Sem referência | NÃO VERIFICADO: **bloqueia R5** |
| Bofors 37 mm | Bofors wz.36 no pelotão AT (T03, T08) | Fonte citada, não relida |
| 76,2 mm sem munição | Sem referência | NÃO VERIFICADO |
| Demolições 06:00–06:45 | 06:10 e 06:45 (H01) contra 06:40 (T01, T04, T07, T09) | DIVERGENTE leve |
| Combate durante o dia; norte e oeste | Pszczółki (T16), Koźlin(y) ~07:00 (T08, fonte única), retirada 18:00–20:00 (T03); Szpęgawa/Suchostrzygi sem fonte | PARCIAL; G sem fonte |
| Travessias alemãs do rio depois das demolições | `HISTORICAL_RESEARCH.md` §10 não regista nenhuma | NÃO VERIFICADO: **não implementar sem fonte** |
| Morteiros | Mencionados (T03) | Fonte citada, não relida |
| Atiradores furtivos, camiões, motos | Sem referência | NÃO VERIFICADO |

## 4. Matriz WaW / WWII (adenda, secção 8)

Nenhuma sequência de WaW ou WWII foi jogada ou analisada nesta auditoria; as colunas de referência ficam **NÃO VERIFICADO**, como no benchmark existente. A coluna COD-guerra resume o estado do código, não a sensação.

| # | Critério | Referência (WaW/WWII) | COD-guerra (código) | Deficiência principal | Fase |
|---|---|---|---|---|---|
| 1 | Intensidade do combate | NÃO VERIFICADO | PARCIAL: maior intervalo sem contacto 27,5 s (controlo); 33,5 s depois da demolição leste | Inimigo ≥ 430 m; bombas sem consequências | R1 |
| 2 | Inteligência e coordenação | NÃO VERIFICADO | PARCIAL: IA por homem, supressão; coordenação só na retirada | Sem cobertura dinâmica, callouts nem flanqueio | R2 |
| 3 | Realismo das animações | NÃO VERIFICADO | PARCIAL: 101 clips, `standing_idle` 59 % | Sem camada aditiva nem estados emocionais | R6 |
| 4 | Armas na 1.ª pessoa | NÃO VERIFICADO | PARCIAL: só a wz.29, 3 clips | Dedos e recarga reprovados no playtest | R6 |
| 5 | Variedade de acontecimentos | NÃO VERIFICADO | PARCIAL: guião por relógio | Ciclos fixos | R1, R2 |
| 6 | Apresentação cinematográfica | NÃO VERIFICADO | PARCIAL: comboio, Panzerzug, Ju 87, demolições | Sem momentos de impacto no espaço do jogador | R1, R7 |
| 7 | Atmosfera audiovisual | NÃO VERIFICADO | PARCIAL: áudio sintetizado com camadas | Sem gravações (T45) | R7 |
| 8 | Companheiros | NÃO VERIFICADO | PARCIAL: Kowal, Dudek, Bąk com falas reativas | Perdas sem consequência na unidade; polaco por rever | R2, R7 |
| 9 | Ritmo | NÃO VERIFICADO | PARCIAL: compressão 24×, cartão «Mais tarde…» | Arranque lento (04:30–04:46) | R1 |
| 10 | Guerra em grande escala | NÃO VERIFICADO | PARCIAL: setores como rótulos de horário | Sem simulação por setor | R4 |

Para preencher as colunas de referência é preciso que um humano jogue (ou forneça análise de vídeo de) sequências concretas; até lá, só a proposta do proprietário descreve a referência.

## 5. Divisão do trabalho

Regras: uma só candidata (#80); cada pacote numa branch própria a partir da #80; merge `--no-ff` na candidata depois de `npm test` focado + golden com emenda documentada; máximo 4 agentes; sem `main`, sem deploy; nenhuma linha passa a VALIDADO sem playtest humano.

| Pacote | Fase | Objetivo | Depende de | Agente | Validação técnica | Critério de integração |
|---|---|---|---|---|---|---|
| R1-a Bombas com consequências | R1/R3 | Impactos de 04:34 e 05:30 dentro da área com dano por distância/cobertura a NPC (nunca ao jogador em cena, F4), feridos e cobertura destruída | — | opus-medium (desenho) → sonnet-max | Teste de dano por raio/cobertura; golden com emenda; saves antigos carregam | Primeira diferença do golden nomeada; 0 mortes injustas do jogador (F1) |
| R1-b Abertura viva | R1 | 04:30–04:34 com atividade (pátio maior, sapadores a inspecionar cabos, mensageiro) e contacto visível mais cedo | — | sonnet-medium | Contagem de atores ativos e de atividades distintas; intervalo até ao primeiro estímulo | Sem alterar horas históricas |
| R2-a Coordenação 05:30–06:10 | R2 | Callouts de avistamento, troca de cobertura, líder que reage (era a próxima ação técnica do handoff) | — | opus-medium → sonnet-max | Rotas do golden; repetição < limiar; emenda 16 | Linha «Coordenação aliada» do benchmark passa de PARCIAL a IMPLEMENTADO SEM PLAYTEST. **FEITO 2026-10-24 (ramo `claude/exciting-bohr-k8v5xm-r2a`, emenda 17, local, sem playtest):** `docs/verification/m01-runtime/squad-coordination-r2a-2026-10-24/README.md` |
| R2-b IA alemã | R2 | Segunda linha de aproximação, granadas, busca com movimento, `safeX` mais a oeste (decisão humana pendente) | R2-a | sonnet-max | Distância mínima < 300 m em parte da janela; 0 atravessamentos | Decisão do proprietário sobre `safeX`. **FEITO 2026-10-24 (ramo `claude/exciting-bohr-k8v5xm-r2b`, emenda 18, local, sem playtest; `safeX` 450 → 250):** fogo polaco real da secção, assalto por linhas de aproximação, vigas alternadas, alvos polacos, busca e granada de mão (estas duas existem e ficam a 0 nas 24 rotas); `docs/verification/m01-runtime/german-ai-r2b-2026-10-24/README.md` |
| R3-a Sapadores em etapas | R3 | Etapas identificar → inspecionar → reparar → verificar → preparar → detonar → verificar, com estado na simulação e clips/poses distintos; abrigo por decisão própria | R1-a | opus-medium → sonnet-max + sonnet-high (render) | Teste por etapa; save/restore no meio de cada etapa | Sem instrução técnica real de explosivos |
| R4-a Geografia e atos | R4 | Decidir como representar E, F, G, J e os atos VI–VII (área nova, transição ou mapa de operações) | Fontes (§3) | fable-medium (desenho) + humano | Documento de desenho | **Decisão do proprietário** (escopo grande) |
| R5-a Equipamento | R5 | Bofors 37 mm e equipamento polaco documentado | Fontes (§3) | — | — | Só depois de confirmar FT-17/TK-3/76,2 mm nas fontes |
| R6-a Mãos e armas | R6 | Perfil de pega por arma, testes de atravessamento dos dedos, clips de interrupção/recuperação | Licença fp-arms-v2 | sonnet-xhigh | Capturas por fase da recarga; teste de distâncias dedo–arma | Inspeção visual humana |
| R7-a Áudio e vida | R7 | Camada de rio, etiqueta de áudio provisório, quebrar ciclos fixos (ckm 18 s, pátio) | R1-b | sonnet-medium | Testes de áudio existentes | — |
| R8-a Desempenho | R8 | Fundir malhas por soldado (≈26 → 2–3 draw calls), nível Ultra, sombras em Medium | — | sonnet-high | Banco `m01-render-perf-bench.mjs` | FPS no PC (T49, humano) |
| R9 | R9 | Playtest integral | Todos | humano | — | Aprovação do proprietário |

**Ordem proposta (economia de tokens, um pacote de cada vez):** R1-a → R2-a → R3-a → R1-b → R2-b → R6-a → R7-a → R8-a. R4-a e R5-a avançam só com decisões e fontes.

## 6. Decisões que só o proprietário pode tomar

1. **Escopo geográfico e temporal (R4):** a área atual tem 900 × 220 m e a missão acaba às 07:05. Representar Lisewo de perto, a frente norte/oeste e a tarde exige novas áreas jogáveis ou atos. Opções: (a) manter a M01 até 07:05 e reforçar o que se vê à distância; (b) acrescentar atos VI–VII numa segunda área; (c) dividir em várias missões.
2. **Fontes:** as fontes externas não abrem neste ambiente. Ou se permite o acesso de rede a esses domínios, ou se fornecem os PDFs no repositório; sem isso, R4-a e R5-a ficam bloqueados.
3. Pendentes do handoff: dureza do nível soldado, graça de reação 1,2 s, `safeX`, licença fp-arms-v2, gravações T45, FPS no PC (T49).
