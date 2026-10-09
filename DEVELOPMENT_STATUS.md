# Estado de desenvolvimento

## Consolidação final de produção M01 V7 — 2026-10-09 UTC

`M01-FINAL-APPROVED-DELIVERIES-INTEGRATION-V7`, branch `codex/m01-final-production-consolidation-v7`, base V6 `cbc7de5668a1b2e4bc646b86548196a5f4f1039a`, [PR draft #59](https://github.com/Brawl2007/COD-guerra/pull/59) contra V6. **READY_FOR_CAPTAIN_REVIEW**. Integra os deltas admitidos de Station V3, armas no checkpoint validado `7dbc0a5` e decals, preservando a V6.

Node completo **474/474 PASS** e build PASS. Browser integral combinado **84/84 PASS** numa única invocação sem filtros ([run 37876099475](https://github.com/Brawl2007/COD-guerra/actions/runs/37876099475), HEAD `e0bb04e2c85208b1d58d8bc44ac091bf16c66458`), workers 1, retries 0, zero skips/flaky/erros globais, 95,6 min; artifact verificado por SHA-256 e CRC. As execuções anteriores 80/84, 82/84 e 83/84 ficam preservadas e nunca são somadas; as três correções foram só de harness, com produção inalterada.

M01 continua **PROTÓTIPO JOGÁVEL**. Sem alegação de FPS, VRAM física ou teste no Chromebook. Provas em `docs/verification/m01-runtime/final-approved-deliveries-integration-v7/HANDOFF.md`.

## Consolidação final de produção M01 V6 — 2026-10-08 UTC

`M01-FINAL-PRODUCTION-CONSOLIDATION-V6`, branch `codex/m01-final-production-consolidation-v6`, base V5 `d277b06937170aa433bc418ef5b83b2925c6d6de`, [PR draft #57](https://github.com/Brawl2007/COD-guerra/pull/57) contra V5. **READY_FOR_CAPTAIN_REVIEW**. HEAD final de código/fixtures `edefda544c702962ad3e378d06fb1bd7e792254e`; produção igual à CI `2a2a56734861b0801234d7ddf3cda66c0100f326`. HEAD exato do pacote final na descrição da PR. Correções de restore de blast, fallback muzzle, buffers dos portais, áudio Low e pagehide persistido preservadas.

Node **460/460 PASS**, build PASS e CI crítico final **6/6 PASS** (run 37821714679). O relatório integral real ficou **83 PASS / 1 FAIL** (run 37802820440); a falha de pointer lock no rig foi corrigida e passou **3/3** cenários, com reprodução pela API nativa. Uma execução crítica posterior e o diagnóstico smoke expuseram orçamento de captura estreito e comparação Low/High de idades diferentes. A comparação agora usa High→Low→High com clock/câmara/snapshot pausados; FX final **2/2 PASS**, além do CI crítico verde. Cobertura conjunta **84 casos distintos**, sem inventar single-full-suite 84/84.

**264 ficheiros protegidos** e **30 pares/60 PNGs** pixel-idênticos à V5, novamente verificados. Oito capturas FX finais inspecionadas; efeitos distantes estão ocultados nas câmaras reais, limitação documentada. Station V3/#54, #56 e demais deltas não aprovados excluídos. Resolver de animações e quatro WIP sem mapeamento permanecem separados. Main/deploy intocados; M01 continua **PROTÓTIPO JOGÁVEL**. Ler `docs/verification/m01-runtime/final-production-consolidation-v6/HANDOFF.md`, matriz e provas. O histórico abaixo conserva as entregas anteriores.

## Contrato de apresentação das animações — 2026-10-08 UTC

`M01-ANIM-CONTRACT-SIM-V1`, base `99309d9`, branch `codex/m01-anim-contract-sim-v1`: motion/odómetro/gait, bodyYaw independente de facing e timestamps reais opcionais persistidos no schema 2. Saves 86/89 e adaptadores existentes preservados. Gameplay byte-equivalente em 41.083 ticks contra a base; A/B com apresentação incluída: 61.055 comparações da auditoria existente + 1.760 novas. Build PASS e restore browser 2/2 PASS. Uma execução completa `npm test`: 343/344; única falha foi a guarda antiga do hash integral da simulação no viewmodel. Corrigida a guarda mantendo o hash da base imutável; os quatro ficheiros de testes afectados passaram 38/38 depois, sem mudar produção. A suíte completa não foi repetida, conforme o escopo. Handoff: `docs/verification/m01-runtime/anim-contract-sim-v1/HANDOFF.md`; estado formal `READY_FOR_CAPTAIN_REVIEW_WITH_KNOWN_FAILURES` pelo resultado vermelho dessa execução completa, sem regressão de runtime observada. M01 continua **PROTÓTIPO JOGÁVEL**; resolver/clips/visual ficam para a próxima tarefa. Main/deploy intocados.

## Station Architecture Production V2 — 2026-10-07

`M01-STATION-ARCHITECTURE-PRODUCTION-V2`, base `99309d9`, branch `codex/m01-station-architecture-production-v2`. **READY_FOR_CAPTAIN_REVIEW**. Substituição visual do bloco da Station por cinco volumes, roof inclinado, marquise e 140 aberturas com recessos/shell fechado; malhas originais partilhadas por material, três LODs. Âncoras/colliders, gameplay, stationDrag, clocks/saves/RNG e 30 clusters de props preservados. 133 ficheiros protegidos byte a byte; rota integral equivalente à base.

28/28 Node focados, build PASS, três casos browser verdes (a fixture de qualidade foi corrigida após um timeout inicial; logs preservados), 22 pares de capturas finais com estado congelado igual, zero erros. Station: 7 lotes, LOD0/1/2 30.881/28.707/13.382 triângulos, 10 mapas 128². P4, precisão do levantamento de 1939 e performance em Chromebook continuam pendentes. M01 permanece **PROTÓTIPO JOGÁVEL**; sem integração da bridge structural do Claude, main ou deploy. Handoff e pontos exatos de integração em `docs/verification/m01-runtime/station-architecture-production-v2-2026-10-07/HANDOFF.md`.


## Auditoria schema 2 — 2026-10-03

Candidato isolado em `codex/m01-schema2-determinism-audit`, base MG34 prone aprovada `fbaac1e4`. Comparação de futuros A/B por tick: 61.055 comparações em duas rotas completas e fixtures definidas, sem divergência depois das correções. Corrigido o destino de recuperação ao restaurar uma continuação; schema 2 recebe backup opcional plano, mantendo CP-A..D planos e legacy compatível. Saves corrompidos não podem sobrescrever métodos/perfil da arma; RNG uint32 e fases conhecidas validados.

242/242 Node (18 novos), build PASS, 4/4 browser focados e **36/36 browser integrais**, zero retries/skips/falhas, 1.182,745 s. Auditoria concluída para revisão do capitão. Provas e limites em `docs/verification/m01-runtime/schema2-determinism-audit-2026-10-03/HANDOFF.md`. Produção alterada apenas na persistência/validação; simulação de combate/relógios/gates, renderer/assets e bancada francesa conservados. M01 permanece **PROTÓTIPO JOGÁVEL**; nenhum marco, playtest humano ou FPS de Chromebook é aprovado por estes testes.

O texto abaixo documenta etapas anteriores, incluindo pendências posteriormente entregues na base MG34. O contexto actual está em `docs/NEXT_CHAT_CONTEXT.md`.


## Resultado desta alteração

M01 passou a **PROTÓTIPO JOGÁVEL** nesta branch. O fluxo usa a fundação Three.js e as pontes do Claude, preservando os históricos dos PRs #9 e #11. A bancada francesa continua seleccionável. O marco 2 ainda não está aprovado como missão validada; faltam o playtest humano, a medição no Chromebook e o trabalho descrito abaixo.

Os PRs #8 e #10 de pesquisa/preparação já estão em `main`. Os PRs #26/#27 estão integrados em `codex/m01-runtime`; #9/#11 já foram substituídos e fechados. Esta revisão preserva o kit e a ligação do Ju 87 do PR #28, com LOD pela distância e provas do raid real, e integra os kits provisórios revistos de vagões #29 e MG34 #30. Os vagões #29 e a MG34 #30 estão agora ligados ao renderer: 65 vagões LOD2 instanciados e os dois atiradores de `grp_de_east`, sem alterar a simulação. Os kits ckm #31, MG34 deitada #33 e vagões danificados #34 foram revistos e integrados na branch própria; a ckm tem agora guarnição, idle/abandon e retirada na simulação; disparo da ckm e deitado MG34 continuam pendentes. Revisão inicial em `docs/verification/m01-runtime/asset-review-2026-10-02/`; nova prova em `docs/verification/m01-runtime/support-runtime-2026-10-02/`. O merge em `main` e a publicação pertencem ao utilizador. O mapa francês conserva as suas coordenadas e arma.

## Implementado e observado

Continuação de 2026-10-02: o handoff `f758daa` passou novamente **132/132 Node**, build e **24/24 navegador** em 538,6 s, zero retries. A integração dos kits #29/#30 passou **136/136 Node** e build; o runtime e o JS de produção são idênticos aos do handoff testado. Evidências e proveniência em `docs/verification/m01-runtime/asset-review-2026-10-02/`. O CI do PR #32 passou separadamente: **136/136 Node, build e 24/24 navegador** (20,8 min), deploy ignorado. Nova ligação: **148/148 Node**, build e **26/26 navegador**, **552,1 s**, zero retries/skips/falhas. Após integrar o kit isolado #34: **153/153 Node** e build; `src/`, testes de navegador e JS de produção são idênticos aos do runtime testado (SHA-256 no relatório). Não atribuir uma segunda execução dos 26 à integração de assets.

- Continuação #35: ckm LOD0 3904/4000, LOD1/2 e clips intactos; **154/154 Node** e build, JS/runtime/browser tests iguais ao candidato anterior. CI 23c403b (37071814929) passou **153/153 Node, build e 26/26 navegador**, 14,9 min, deploy ignorado. Provas em `docs/verification/m01-runtime/ckm-budget-2026-10-02/`; novo CI desta revisão é separado.

- PR #25 do Claude preservado nesta branch: Kowal usa a rkm wz.28 (cabeça, divisa, bolsa e bípode), Bąk saudável a wz.98a. Mira, rajada e troca de carregador de Kowal lêem o disparo/munição/cooldown já guardados; não acrescentam regras de combate. Clarões usam os sockets da arma escolhida.
- S3 encena o ferido ficcional das 04:35:30: começa no pátio, Dudek aproxima-se pela cabeça, arrasta-o de costas no chão, entrega-o na estação e volta ao posto. Saves schema 2 preservam a operação e aceitam estados antigos; os resgates posteriores de Bąk e as demolições conservam-se.

- O trabalho de soldados do Claude (PRs #23/#25, `055da03`) foi preservado e ligado à missão com GLTFLoader, SkeletonUtils e AnimationMixer oficiais. Actores próximos usam rosto, mãos, uniformes, equipamento e 25 clips; actores distantes conservam os proxies e os mesmos IDs. A wz.29 e Bąk ao ombro também usam o rig em primeira pessoa. LODs, limites por qualidade, pausa/restauro, fallback e licença CC0 estão verificados em `docs/verification/m01-runtime/characters/`. Sem serviços pagos ou modelos extraídos de jogos. O ferrolho do NPC termina depois do clarão; as mãos dos sapadores param quando o reparo é suprimido.

- Soldados levantam a arma ao ombro nos disparos, com mãos ligadas à coronha/guarda-mão e recuo procedural. Sob fogo, o tronco curva-se com as botas no chão; o passo levanta um pé. A animação deriva do relógio e dos dados do actor, reproduzindo o mesmo frame após pausa/reload. Galeria e provas em `docs/verification/m01-runtime/combat-animation/`; continuam geometrias provisórias. A tarefa independente do Ju 87 em `docs/THIRD_AGENT_TASK.md` foi entregue no PR #28; a próxima tarefa do Claude está em `docs/CLAUDE_NEXT_TASK.md`.

- A ordem de mudar de cobertura só aparece quando uma salva real é emitida. O HUD distingue portões de Lisewo e dique norte/sul, com distância e direcção relativa ao olhar por oito segundos activos. A origem restaura como dado opcional do schema 2; cobertura obstruída não gera aviso falso. Fumo da boca e poeira de impactos usam partículas suaves em vez de esferas sólidas. Provas por trechos em `docs/verification/m01-runtime/cover-origin/`.

- Demolições leste/oeste mostram durante 12/15 s activos a distância e direcção do impacto real e o destino seguro. A indicação acompanha o olhar, incluindo quem olha para trás dentro da treliça; não roda a câmara. Usa o dano já guardado no save. A poeira continua sujeita à obstrução da ponte; composição e playtest humano permanecem pendentes. Prova por continuação em `docs/verification/m01-runtime/demolition-cue/`.
- A poeira das demolições sobe como uma nuvem única, expande-se e dissipa-se, sem partículas a saltar do topo para a base. Fumo contínuo desvanece antes de repetir o ciclo; emissores finitos desvanecem nos últimos 30 s. Mantêm-se limites e obstrução. Capturas de produção dentro/fora da treliça em `docs/verification/m01-runtime/demolition-dust/`; não aprovam a encenação do colapso.

- Build de produção servido em `/COD-guerra/`, com três modelos OBJ/MTL e materiais próprios. Fallback e diagnóstico para modelos ausentes.
- Disparo semiautomático com yaw/pitch, hitboxes 3D, obstrução por paredes/terreno e teste do cano. NPCs só atacam com visão e exposição; caminhos impossíveis não atravessam paredes. Explosões respeitam obstrução.
- Input limpo ao perder foco/pointer lock; pausa suspende relógio, recarga e simulação. Retomar solicita controlo sem criar outro loop.
- Entrada/retoma de pointer lock protege a orientação contra o salto inicial do cursor observado no CI. Testes verificam que os movimentos seguintes continuam a rodar a câmara.
- Snapshot JSON completo e restauração atómica: actores vivos/mortos, activação, cobertura, munição, recarga, granadas, fase, director, sectores e RNG. Restauração após morte e após reload da página verificadas nos seus respectivos testes.
- Duas simulações reduzidas de sectores avançam sem depender do olhar. Teste de 90 s preserva perdas e eventos; isso ainda não é demonstração visual de batalha histórica.
- Qualidade baixa/média/alta e volume disponíveis; loaders GLB, animações e disposal preparados.

## M01 — Tczew

Estado: **PROTÓTIPO JOGÁVEL**. Estão ligados à engine mapa em metros, perfil wz.29, 12 objectivos, 26 handlers de eventos, cinco agendas de sectores, CP-A..D, legendas, intro/outro com skip e debrief habilitado.

A revisão do PR #10 integrou medidas modernas com incertezas históricas, pontes de cerca de 1 km, limites lidos do JSON em x≈270/401 e perfis propostos de assets/arma. H01-PDF, H02, H30 e T23 foram lidas; decisões e pendências estão em `SOURCE_CHECK.md`. O segundo raid tem janela própria e CP-C deve ser adiado até ela terminar. O debrief habilita apenas textos com fontes lidas.

`M01Simulation` guarda apenas dados. O relógio usa segmentos, snap monotónico e gates; CP-C espera o fim do segundo raid e CP-D guarda a posição/hora reais. O wz.29 exige ferrolho e carrega cinco cartuchos por clipe quando vazio; cargas parciais inserem cartuchos individualmente. O mapa utiliza os colisores GLB exportados em JSON, juntas de tabuleiro, coberturas e prédios provisórios. Não há infantaria alemã na margem oeste. Bombas respeitam 30 m; a demolição oeste espera e o sargento pode escoltar o jogador.

O percurso automático com controlos chega ao debrief, passa pelos quatro checkpoints e conserva baixas/destruição ao restaurar. O navegador de produção verificou controlos, caminhada/entrega, CP-D/restauração e outro/debrief por continuação de snapshots reais.

**Partida contínua no navegador:** M01 foi jogada três vezes do menu ao debrief, cada uma numa única sessão Chromium/SwiftShader (`tools/m01-browser-playthrough.mjs`). Usou teclado, cliques e captura do rato reais, sem snapshots injectados. A partida final demorou 1083 s reais, com 12/12 objectivos e os quatro checkpoints, sem bloqueios, mortes ou perdas de controlo. É um piloto automático, não um playtest humano. A primeira partida revelou cinco problemas, corrigidos nesta branch:
- sapadores longe do ponto de entrega da caixa;
- objectivos sem rumo;
- 4,5 min sem tarefa depois do reparo;
- Bąk ferido atrás do jogador e fora de `bak_wound_point`;
- pelotão leste parado em x≈−109, sem passar pelo corredor.

Evidências em `docs/verification/m01-runtime/continuous/`.

**Segunda ronda** (`--adverse`, 1308 s, 12/12, sem perdas de controlo nem erros):
- **Rotas adversas verificadas:** sair dos limites, cair no Vístula, ficar parado e ficar sem munição. As duas primeiras restauram o CP-A.
- **Corrigido:** quedas do tabuleiro pelas aberturas da treliça.
- **Feito:**
  - Bąk visível ao ser levado e evacuado por Dudek;
  - clarão e coluna de poeira nas demolições, com vibração ao chegar o som;
  - chamada no abrigo com pose sentada procedural, preservada no save;
  - carregadores de Kowal.

A revisão de integração corrigiu a evacuação na entrega de Bąk depois das 06:10 e a inicialização da munição da secção ao carregar saves antigos. Regressões em `tests/m01-continuous-fixes.test.js`.

As poses procedurais agora distinguem posição em pé, agachada, sentada, ferida e transportada. Joelhos/cotovelos e botas usam os mesmos lotes de instâncias, sem decidir estado de combate. A chamada marca `pose: seated` na simulação; saves anteriores continuam aceites. Imagens e limites em `docs/verification/m01-runtime/poses/`.

**Terceira ronda: ameaça em "Proteja o reparo" e "Cubra a retirada".** Antes, o reparo nunca era suprimido e o pelotão leste ficava sempre no mínimo de 12. Causas:
- os sapadores ficavam escondidos de toda a margem leste;
- os atiradores estavam atrás do portal de Lisewo;
- dois terços do reparo terminavam antes do trem das 04:45.

Agora:
- **Origem visível.** O fogo alemão vem da faixa dos portões de Lisewo, entre as pontes: é o que a cabeça de ponte oeste vê por cima da água, porque as treliças tapam o dique. Cada tiro é um dado em voo, com clarão, fumo da boca, traçante (MG), poeira ou faísca, estampido atrasado e estalo perto do jogador.
- **Reparo.** Tiros a menos de 3 m deitam a equipa e param o trabalho. Calar a MG dos portões encurta-o; ignorá-la deixa os sapadores deitados dezenas de vezes.
- **Retirada.** Cada baixa é um tiro real dos alemães do tabuleiro, de 20 em 20 s de relógio sem supressão. O fogo de cobertura do jogador salva homens.
- **HUD.** Uma linha de estado no HUD lê só a simulação.
- **Arte e apresentação.** O portal ferroviário oeste ganhou o arco que faltava no GLB (os dois arcos sobrepunham-se). Os carris da linha sudoeste assentam no terreno.

| Comparação de estado, 12 sementes, depois da fusão | Reparo (real) | Fim do reparo | Supressões | Sobreviventes |
| --- | ---: | --- | ---: | ---: |
| Jogador ajuda | 180–207 s | 05:04–05:08 | 14–34 | 15–18 |
| Jogador ignora | 206–251 s | 05:08–05:15 | 44–83 | 12 |

No navegador, partidas contínuas `--cover help/ignore` do menu ao debrief, com 0 bloqueios ou erros e o HUD igual à simulação em todas as leituras:

| | Antes da fusão | Depois da fusão |
| --- | --- | --- |
| Ajuda | reparo 214 s, 29 supressões, 18 sobreviventes | reparo 189 s, 18 supressões, 17 sobreviventes |
| Ignora | 230 s, 54 supressões, 12 sobreviventes | 236 s, 55 supressões, 12 sobreviventes |

As partidas revelaram um bloqueio, já corrigido: com Bąk entregue depois das 06:10, a demolição oeste ficava presa (a revisão de integração chegou à mesma correcção). Horários históricos, checkpoints e segurança das demolições ficam inalterados. Provas em `docs/verification/m01-runtime/continuous/round3/`.

Este modelo substitui o primeiro protótipo de cobertura do Codex (`0ab60d7`, traços `incoming-shot` e pressão por quase-acertos). Da fusão ficaram:
- as 18 instâncias activas do pelotão e as seis reservas inactivas;
- o "Abrigue-se!" visível durante pelo menos 2,5 s;
- a pose sentada da chamada;
- os alemães agachados quando suprimidos;
- o rumo para a MG no HUD.

Os aliados sob fogo usam uma pose própria, agachados e curvados (`pinned`). O relatório `docs/verification/m01-runtime/cover-combat/` foi regenerado com o modelo actual (mesma seed, ignorar → cobrir: reparo 217 → 173 s, sobreviventes 12 → 18).

## Revisão visual de M01

Texturas em metros no cenário/kit, terreno mais amostrado, céu com nuvens e fumaça/poeira suave em partículas limitadas substituem as cores planas/esferas. Há vegetação e detalhes ferroviários/arquitectónicos, troncos sólidos fora dos percursos, faces/equipamento procedurais com LOD e wz.29 mais detalhado. Comparações reais em `docs/verification/m01-runtime/visual-sprint/`. A simulação conserva horários, actores/sectores, checkpoints e segurança. Árvores próximas acrescentam colisão estática reproduzível; não são levantamento histórico de árvores de 1939.

Os humanos continuam estilizados e o cenário continua provisório: não foi atingido o realismo das referências. Faltam arte/rigs/rostos/animações profissionais, composição e validação em hardware real. Esta revisão não transforma o protótipo numa missão VALIDADA.

**Soldados de 1939 (assets provisórios, integrados nesta branch):**
- GLB polacos e alemães em `assets/models/provisional/m01/characters/`, gerados por `tools/assets/m01-soldiers/` a partir da malha base CC0 do MakeHuman e de geometria/texturas originais.
- Incluem 8 cabeças polacas (elenco do `STORY_BIBLE.md`) e 3 alemãs, wz.31 com capa, *rogatywka* wz.37, M35, correame, kb wz.29/Kar98k com ferrolho e clipe de 5.
- LOD0/1/2: 14,9k/6,0k/1,9k triângulos visíveis (PL), um atlas por nação. O GLB de animações tem 25 clips, incluindo as armas de Kowal e Bąk: ferrolho, recarga por clipe, sapadores normal/sob fogo, transporte de Bąk no `carry_socket`, locomoção, ferido, queda, sentado.
- Verificados por `tests/m01-soldiers-glb.test.js` e capturas inspeccionadas em `docs/assets/m01-soldiers/`. A integração em `src/render/` está nesta branch, com provas em `docs/verification/m01-runtime/characters/`; falta medir no Chromebook.

**rkm wz.28 de Kowal (arma isolada, provisória; o runtime usa a rkm embutida nos GLB dos soldados e os clips `rkm_*` deles, com os mesmos nomes `rkm_aim`/`rkm_fire_burst`):**
- Kit em `assets/models/provisional/m01/weapons/rkm_wz28/`, gerado por `tools/assets/m01-rkm-wz28/`: LOD0/1/2 com 1476/744/234 triângulos, carregador, alavanca de armar e bípode dobrado/aberto em nós separados, sockets e manifesto com medidas estimadas identificadas.
- Prende-se ao osso `weapon` do rig existente; `m01_rkm_wz28_animations.glb` traz `rkm_carry`, `rkm_aim` e `rkm_fire_burst` (3 tiros, como a simulação). Verificado por `tests/m01-rkm-wz28-glb.test.js` e capturas inspeccionadas em `docs/assets/m01-rkm-wz28/`. A rkm embutida já funciona em Kowal com os dez clips dos soldados; este kit isolado fica disponível para usos futuros, sem duplicar a arma nem substituir os clips. Faltam clips específicos de troca/deitado neste kit e confirmar T31 em leitura integral.

**Ju 87 B-1 do raid (asset provisório ligado aos três aviões):** kit original em `assets/models/provisional/m01-aircraft/` (`tools/assets/m01-aircraft/`), LOD0/1/2 com 13 102/4 730/1 636 triângulos, nós `fuselage`, `propeller`, `dive_brake_l/r` e `bomb_sc250`, clips `propeller_spin` e `dive_brakes_extend`. Verificado por `tests/m01-ju87-glb.test.js`, relatório de importação three.js e galeria isolada em `docs/assets/m01-aircraft/` (não é playtest). Três clones partilham geometria/materiais, com LOD nativo por distância (mínimo LOD1 em médio e LOD2 em baixo), hélice amostrada do relógio e fallback por silhueta. Não muda trajectórias ou eventos; a carga SC 250 não documentada fica oculta. O segundo raid conserva o modelo anterior. Provas de produção em `docs/verification/m01-runtime/aircraft/`; falta confirmar T29/T12, freios/lançamento ligados a dados reais e arte final.
**Vagões do trem 963 e do pátio (assets provisórios; trem ligado, pátio pendente):** kit original em `assets/models/provisional/m01-wagons/` (`tools/assets/m01-wagons/`), coberto (tipo G, portas de correr) e aberto (tipo O), genéricos da época porque P16 continua aberta. LOD0/1/2 com 2 332/1 128/516 e 1 948/846/364 triângulos, nós `body`, `wheelset_1/2` e `door_l/r`, clips `wheels_roll` e `doors_open`. Verificado por `tests/m01-wagons-glb.test.js`, relatório de importação three.js e galeria isolada em `docs/assets/m01-wagons/` (não é playtest). Trem 963: 65 vagões com passo 9,10 m, LOD2 instanciado (coberto/aberto), fallback parcial/total; locomotiva anterior preservada. Composição genérica provisória (49 cobertos/16 abertos), não identificação histórica. Rodados/portas parados até existirem velocidade/desembarque na simulação. Pátio oeste pendente: alturas do kit não coincidem com as coberturas `cv_wagon_1/2`; tipos reais aguardam P16.

**Vagões queimados e danificados (assets provisórios, ainda não ligados ao jogo):** em `assets/models/provisional/m01-wagon-damage/` (`tools/assets/m01-wagon-damage/`), coberto e aberto nos estados `burned` e `damaged`, a partir do kit intacto sem o alterar (sha256 conferidos pelo teste). LOD0 com 2 480/2 340 (queimados) e 2 452/2 098 (danificados) triângulos; mesmos pivôs, passo de 9,10 m e sockets do intacto, mais `impact` no danificado e o nó `debris` só visual; sem fogo, fumo nem temporizadores. Verificado por `tests/m01-wagon-damage-glb.test.js`, relatório de importação three.js e galeria isolada em `docs/assets/m01-wagon-damage/` (não é playtest). Falta a simulação escolher vagão e estado (p. ex. `station_wagon_fire`) e o Codex ligar a troca de GLB; colisão continua a ser a do intacto; P16 aberta.

**MG 34 de 1939 (provisória; ligada aos dois atiradores existentes):**
- Kit em `assets/models/provisional/m01/weapons/mg34/`, gerado por `tools/assets/m01-mg34/`: 1,219 m, LOD0/1/2 com 2432/1262/368 triângulos. Tem manga perfurada, coronha, alça e massa, bípode dobrado/aberto e tambor de cinta de 50. A tampa, a alavanca de armar, o tambor e a cinta são nós com pivô. O manifesto traz sockets, mãos, materiais, bytes, fontes (T33, por resumo) e as medidas estimadas marcadas.
- Prende-se ao osso `weapon` do soldado alemão actual, com a Kar98k e o clipe escondidos. `m01_mg34_animations.glb` traz `mg34_aim`, `mg34_fire_burst` (7 tiros a 800/min, como o intervalo da simulação) e `mg34_reload` (troca do tambor), que animam também os nós da arma pelo nome. Verificado por `tests/m01-mg34-glb.test.js` e pelas capturas inspeccionadas em `docs/assets/m01-mg34/`.
- Falta:
  - arte/encaixe da ligação já feita a `de_east_0/1`: uma MG34 por rig, boca real, LOD por distância/qualidade, reserva dentro dos mesmos 18/24/28 actores, pausa/restauro pelo relógio; rajada cortada pelos `firedAt`/`shot` reais, sem recarga inventada;
  - ligar os clips deitados (abaixo), porque o motor não tem pose `prone`;
  - a cinta de 250 e a mira antiaérea;
  - confirmar T33 em leitura integral.

**ckm wz.30 da casamata (`grp_ckm_crew`; idle/abandon e retirada ligados, disparo pendente):**
- Kit em `assets/models/provisional/m01/weapons/ckm_wz30/`, gerado por `tools/assets/m01-ckm-wz30/`: arma de 1,211 m no tripé baixo (cano a 0,64 m), fita de tecido pela esquerda e caixa de aço caqui de 355 × 175 × 85 mm. LOD0/1/2 com 3904/2298/754 triângulos. O LOD0 foi reduzido de 5004 para o orçamento de 4000 com uma variante leve dos cartuchos, aros e tecido; LOD1, LOD2 e clips ficaram byte a byte (antes/depois em `docs/assets/m01-ckm-wz30/ckm_lod0_budget.png`). Direcção, elevação, alavanca, fita e tampa estão em nós com pivô; o manifesto traz sockets, pontos de pega e medidas estimadas identificadas.
- `m01_ckm_wz30_animations.glb` traz `ckm_wz30_{gunner,loader}_{idle,aim,fire_burst,feed,abandon}` para o rig polaco actual, sincronizados com os clips `ckm_wz30_gun_*` da arma. A espingarda fica escondida, para mostrar uma só arma.
- Verificado por `tests/m01-ckm-wz30-glb.test.js` e por capturas inspeccionadas em `docs/assets/m01-ckm-wz30/` (galeria isolada; sem playtest nem FPS).
- Falta:
  - ligar aim/fire_burst/feed a decisões reais de disparo/munição; não deslocar o emissor ae_s2_ckm_east nem inventar tiros no renderer;
  - confirmar T34 em leitura integral, a geometria do tripé e a altura da seteira.

**MG 34 deitada com atirador e municiador (#33 revisto/integrado; ligação à simulação pendente):**
- `assets/models/provisional/m01/weapons/mg34-prone/m01_mg34_prone_animations.glb`, gerado por `tools/assets/m01-mg34-prone/`, traz 9 clips com nomes novos: `mg34_prone_enter/idle/aim/fire_burst/reload/exit` do atirador e `mg34_loader_prone_idle/feed/leave` do municiador. Uma só MG 34 no osso `weapon`, com o bípode aberto e as patas no chão; os clips de pé e o kit da arma ficam intactos (SHA-256 no manifesto).
- Rajada de 7 tiros com eventos a 0,075 s; o manifesto documenta a janela de tiro e o corte depois de 4 ou 6 tiros. Na recarga deitada, o municiador passa o tambor ao atirador (`drum_from_assistant` 1,7 s, `drum_handoff` 2,15 s).
- Cotovelos, joelhos e botas medidos na pele (LBS) a poucos milímetros do chão; mão no punho e face na coronha. Verificado por `tests/m01-mg34-prone-glb.test.js` (incluindo o mixer do three.js) e pelas capturas inspeccionadas em `docs/assets/m01-mg34-prone/` (não é playtest).
- Falta: implementar `pose: prone` e ligar a dupla a `grp_de_east` (Codex); rever arte e posturas em jogo.

**Transições do arrasto do ferido da estação (clips provisórios ligados ao estado real de S3):**
- `assets/models/provisional/m01/characters/station-drag-transitions/m01_station_drag_transitions.glb`, gerado por `tools/assets/m01-station-drag-transitions/`, traz `station_drag_{medic,patient}_{grab,release}` (1,6 s estimados, pares com o mesmo relógio) para os 61 ossos do rig actual, sem malhas e sem deslocar a raiz. Extremos exactos: médico `crouched_idle` ↔ `drag_wounded` t=0, ferido `wounded` ↔ pose de arrasto (tronco erguido pelos sovacos, de costas no chão); a libertação é o agarrar invertido. Eventos `hands_contact`/`grip_ready`/`hands_release`/`settled` só em `extras`; offset do ferido `[0, 0, −0,92]` m e sockets `shoulder_on_ground`/`armpit_grip` no manifesto. Clips e rig reutilizados intactos (SHA-256 no manifesto).
- Verificado por `tests/m01-station-drag-transitions-glb.test.js` (incluindo o mixer do three.js: ferido de costas, mãos a < 0,2 m dos ombros na pega, apertos medidos por cápsulas) e pelas capturas inspeccionadas em `docs/assets/m01-station-drag-transitions/` (não é playtest).
- Ligação entregue: fases guardadas de 1,6 s, pares sincronizados, pose final do paciente segura durante o arrasto, pausa/restauro/interrupção e fallback conjunto. O renderer só amostra dados. 165/165 Node e build; 5/5 navegador focado. Provas em `docs/verification/m01-runtime/station-drag-runtime-2026-10-03/`; 29/29 na regressão integral em 583.108 s, sem falhas/retries/skips/instáveis. Arte/contactos e playtest humano permanecem provisórios.

## Parcial ou pendente

- Soldados próximos, mãos, recarga e transporte já têm rig e clips reais. Arte, encaixe das mãos, uniformes e mixagem continuam a exigir revisão; Civis e alguns actores distantes conservam proxies. Vozes gravadas continuam ausentes.
- Combate remoto, navegação, resgate e feridos têm comportamento reduzido. O arrasto de S3 está encenado; as transições de agarrar/soltar usam os clips reais com fases persistidas (acima); faltam casamatas interiores, feridos carregados pelo pelotão e direcção humana completa. Provas do arrasto em `docs/verification/m01-runtime/station-evacuation/`.
- A alça muda a referência de distância; o tiro ainda usa raio recto com dispersão, conforme fallback documentado. Queda/arrasto balístico pendentes. Pontaria e probabilidade de acerto são tuning de protótipo.
- Trussas têm aberturas e não são paredes sólidas; colisão exacta dos membros metálicos e ruínas pendente. Juntas e posts dos portais usam aproximações conservadoras declaradas.
- Humanos, comboios e aviões são geometrias provisórias próprias; as pontes são o kit GLB do Claude completado no PR #11. Fontes, licenças e incertezas em `ASSET_CREDITS.md` e `BRIDGE_ASSET_REPORT.md`.
- Meta de 30 FPS no Chromebook não foi medida. Chromium com SwiftShader verifica funcionamento, não desempenho de GPU real.
- Campanha M01–M30, tanque, avião, jeep, transições e save da campanha pendentes.
- A partida contínua de M01 no navegador foi feita por piloto automático; **falta um playtest humano completo** e ampliar as rotas adversas (morte em combate e outros objectivos ignorados). Não houve playtest completo da missão francesa nesta sessão.
- Ainda pendente depois da partida contínua:
  - em "Mantenha a cabeça de ponte", a salva de ajuste vem do dique, atrás das treliças: traçante e impactos à vista, origem não;
  - a flecha do fogo alemão é uma aproximação de jogo; o wz.29 continua em recta;
  - afinar a legibilidade e a dificuldade do fogo no reparo e na retirada num playtest humano;
  - de dentro da treliça rodoviária, a coluna da demolição leste fica tapada;
  - o transporte usa o rig; faltam as transições refinadas de agarrar/soltar e os feridos do pelotão.

  Detalhes em `docs/verification/m01-runtime/continuous/README.md`.

## Próximo passo

Completar disparo/munição da ckm, deitado/municiador MG34 e identificação/estado dos vagões com dados reais na simulação, e realizar o playtest humano completo de M01, com atenção ao fogo de cobertura a ~1,2 km (clarões de ~8 px e raio de supressão de 3 m). Modelar encenações e colisões que continuam simplificadas. Medir no Chromebook antes de aprovar o marco 2; só então expandir M02. Graphify permanece em pausa no checkpoint existente.

O trabalho das pontes de Claude foi preservado e completado, incluindo dano persistente em LOD0/1/2. Mapas históricos e inventários específicos continuam úteis para as pendências de P4/P13 e de arte. Não recomeçar essa entrega.

Continuação sem Claude em 2026-10-02: kit de quatro transições do arrasto em 27353ef revisto pelo Codex, 158/158 Node e build. Regeneração preserva GLB/manifesto; galeria isolada inspeccionada. Runtime ainda não toca os novos clips. Codex assume a integração e as próximas tarefas durante a pausa semanal do Claude.

## Continuação ckm — 2026-10-03 UTC

Três actores por ID, fases idle/abandon/retreat persistidas em schema 2, sincronização da arma e dois operadores, terceiro homem com clips existentes e fallback do kit opcional. Elencos legados de 86 actores são normalizados sem alterar os actores anteriores/RNG; grupos novos parciais são rejeitados atomicamente. Saída da casamata e subida são provisórias; disparo/munição/plataforma não foram inventados. 168/168 Node e build; 2/2 navegador focado (48,603 s). Resultado da regressão integral em `docs/verification/m01-runtime/ckm-crew-runtime-2026-10-03/REPORT.md`. M01 permanece protótipo jogável, sem playtest humano/Chromebook ou publicação.
