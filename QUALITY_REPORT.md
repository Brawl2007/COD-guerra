## Integração do PR #15 com o sprint visual

Revisão local: **95/95 testes Node**, build **1008,84 kB / 260,28 kB gzip**, 83 colisores GLB verificados e rota completa (26 eventos / CP-A..D). O aviso de chunk grande permanece. A suíte de navegador do conjunto está em execução.

Corrigido na revisão: o impacto com `victim` ignorava o obstáculo/actor retornado pelo traçado e podia reduzir sobreviventes sem acerto. Agora exige colisão com o soldado vivo; a pontaria antecipa o recuo no tabuleiro. Regressão cobre parede, falha, acerto e chegada duplicada. Comparação em 12 sementes preserva reparo ajuda 180–207 s / ignora 206–251 s e sobreviventes ajuda 15–18 / ignora 12; prova em `visual-sprint/integration-cover-comparison.json`.

Conflitos de apresentação resolvidos preservando `pinned`, tiros em voo e os materiais/atmosfera/LOD do sprint. As capturas `visual-sprint/before` e `after` pertencem à revisão visual anterior ao PR #15. As partidas contínuas de `round3` pertencem ao trabalho do Claude. Não equivalem a uma nova partida contínua desta integração nem a playtest humano. Humanos finais e Chromebook continuam pendentes.

# Relatório de qualidade — integração M01

## Sprint visual de M01

Base `0ab60d7`; evidência em `docs/verification/m01-runtime/visual-sprint/`. Node **84/84** e build **995,22 kB / 255,53 kB gzip**, com o aviso de chunk grande. Quatro capturas de antes e quatro de depois, qualidade média/1280×720, sem erros de página/shader/rede no capturador. São continuações de snapshots reais; não uma partida contínua/humana.

A primeira suíte do código final passou 12/13 casos de navegador, incluindo recursos após restauro, troca médio→baixo e bancada francesa. O percurso de entrega falhou com x=15,00/z=−0,60: sprint ultrapassou a posição final, fora do raio real de interação. A aproximação final agora caminha para x=17/z=3, preservando teclas, assertions e orçamentos. A correcção passou o teste isolado e a suíte completa de navegador: **13/13**, sem retries. Não foi ampliado o raio de interação nem alterada a missão.

O primeiro capturador do cenário detalhado excedeu 30 s numa screenshot da retirada. Detalhes de rosto têm LOD, acessórios usam geometria mais leve e pedras pequenas não projectam sombras. As capturas finais de qualidade média registam 397.160 triângulos no reparo e 645.874 na retirada, incluindo passes de sombra; isto não é FPS. Presets baixo/médio/alto têm limites de 112/192/256 puffs; as demolições têm prioridade. Sombras de contacto são aproximações visuais.

Troncos próximos têm obstrução real e caixas reproduzíveis, testadas ao reconstruir destruição. Árvores/detalhes artísticos não são levantamento histórico. Humanos/mãos permanecem procedurais e estilizados, abaixo do realismo das referências; rigs/rostos/uniformes profissionais, composição, playtest humano e GPU do Chromebook continuam pendentes. M01 permanece **PROTÓTIPO JOGÁVEL**.

## Evidências desta integração

M01 está **PROTÓTIPO JOGÁVEL**, usando a fundação do PR #9 e o kit de pontes do Claude completado no PR #11. Nenhuma missão está declarada VALIDADA. O mesmo `Game`/renderer/loop oferece Tczew e a bancada francesa, com estados e saves separados.

| Verificação local | Resultado | Alcance |
| --- | --- | --- |
| Testes Node | 92/92 | 43 regressões/dados/GLB já existentes, 18 do runtime de M01, 13 da partida contínua, 3 de poses, 6 de cobertura (revisão do Codex, adaptados ao modelo unificado) e 9 da ameaça nas tarefas de cobertura. Cobrem sapadores, Bąk (incluindo entregue depois das 06:10), rumo, `readyScale`, corredor, evacuação, chamada sentada, munição de Kowal, contenção na treliça e rota. Na cobertura: origem do fogo alemão, supressão do reparo e HUD, ajuda/ignora, parede que protege, baixas só por tiro real e por ID, independência da câmara, horários, tiros em voo no save, migração, tolerância de 120 s, aviso de abrigo e pose `pinned`. |
| Build de produção | Passa | Vite com `/COD-guerra/`, sem recursos externos do jogo. JS ~952 kB / 242 kB gzip; aviso de chunk grande permanece. |
| Navegador de produção | 12/12 | Quatro testes da bancada preservados e oito de M01: modelos/controlos/arma/CP-A, caminhada e entrega, CP-D/reload, outro/debrief, chamada sentada após reload, erro de asset, fogo sobre o reparo e retirada. Os dois últimos continuam saves da rota. O do reparo exige clarão e poeira desenhados, origem a x ≥ 1050, os dois estados do reparo com a pose `pinned`, trabalho que retoma e o HUD igual à simulação. O da retirada exige clarão, baixa real com piso de 12 e a contagem do HUD igual à simulação em todas as amostras. |
| **Partida contínua no navegador** | 3 sessões menu→debrief; final: 1083 s reais, 12/12 objectivos, CP-A..D, 0 bloqueios/mortes/perdas de controlo | Piloto automático com teclado/cliques/pointer lock reais e olhar por `mousemove` relativo; lê só `gameDiagnostics()`/HUD, sem injectar estado. Encontrou e verificou cinco correcções. A segunda ronda (`--adverse`, 1308 s) verificou limites, Vístula, jogador parado e munição, e corrigiu a queda pela treliça. **Não é playtest humano.** Ver `docs/verification/m01-runtime/continuous/`. |
| **Ameaça no reparo e na retirada** | Estado, 12 sementes: ajuda 180–207 s e 15–18 sobreviventes; ignora 206–251 s e 12. Navegador, depois da fusão: ajuda 189 s e 17; ignora 236 s e 12 | Fogo alemão como dados (origem nos portões de Lisewo, tiros em voo, supressão a 3 m) e HUD lido da simulação. Quatro partidas menu→debrief `--cover help/ignore`, duas antes e duas depois da fusão com `0ab60d7`. Em todas: 0 bloqueios ou erros e o HUD igual à simulação em todas as leituras. Encontraram e corrigiram o bloqueio da demolição oeste com Bąk entregue depois das 06:10. Provas em `docs/verification/m01-runtime/continuous/round3/`. A flecha do tiro alemão é aproximação de jogo, não balística medida. |
| Percurso automático de simulação | Completo, 26 eventos, CP-A..D | Controlos com passos de 50 ms, colisão e relógios reais da simulação. Todos os objectivos obrigatórios terminam. Não injecta progressão; **não é partida no navegador**. |
| Morte e restauração | Passam nos quatro snapshots | Actores, baixas, RNG, diálogo, timers, arma, destruição e hora real restaurados. Saves corrompidos rejeitados atomicamente. |
| LOD/destruição | Passa | Peças demolidas e baixas conservadas ao trocar distância/LOD, carregar JSON e reiniciar CP-D no navegador. |
| Cinco agendas durante 90 s | Passa na simulação | Mesmo estado com jogador olhando para frente ou para trás; perdas persistem. Não aprova a direcção visual da batalha. |
| Demolição oeste | Passa na simulação | Gate segura em 06:44:30, libera quando seguros; timeout chama Zieliński, que caminha e escolta o jogador. Sem dano de demolição ao jogador. |
| Colisores | 83 caixas GLB reproduzidas | JSON verificado contra GLB; juntas completam os pequenos intervalos entre vãos. Posts conservadores deixam abertos os arcos dos portais. |

Chromium 153/SwiftShader, viewport 1280×720, Node 24.19.0, Three.js 0.186.1, Vite 8.3.1, Playwright 1.58.2. O daemon `agent-browser` continuou indisponível; Playwright executou a verificação efectiva. Caminhada, captura, cliques, teclas, mira, recarga e skip usam input do navegador. Os testes de CP-D e outro continuam snapshots produzidos pelo percurso integral de simulação; **não comprovam uma partida contínua de M01 no navegador**.

O primeiro teste de caminhada ficou bloqueado num saco de areia: o alvo de strafe deixava pouca folga ao raio do jogador e à amostragem do teclado. O percurso agora contorna a cobertura pelo sul com margem. M01 subdivide frames lentos em passos de até 50 ms, num total máximo de 250 ms por frame, dentro do mesmo loop; teclas de acção/olhar são consumidos uma vez. Isso reduz a desaceleração em software, sem aprovar performance. Um teste de simulação também detectou o pelotão a cair nos intervalos de 2,4 m entre vãos; as juntas visuais/físicas derivadas dos limites GLB corrigem a travessia, sem preencher vãos demolidos.

Capturas e relatório reprodutível em [docs/verification/m01-runtime/README.md](docs/verification/m01-runtime/README.md). O CI publica evidências em `browser-evidence`. Resultados locais são separados de GitHub Actions/Pages; o PR de integração precisa passar o workflow antes do merge.

A rota automática testa movimento/objectivos e não dispara a arma; tiro, recarga, obstrução e resgate são verificados separadamente. Chegar ao debrief nessa rota não aprova a qualidade ou dificuldade do combate.

O primeiro [CI da integração](https://github.com/Brawl2007/COD-guerra/actions/runs/36810870354) passou Node/build e oito testes de navegador. A assertion de recusa do segundo disparo falhou porque a espera pelo HUD/transporte ultrapassou o ciclo de 1,05 s; o segundo disparo era então legítimo. O teste agora agrupa um double-click nativo antes de ler o HUD, preservando a verificação de uma única bala, e mantém a recusa temporal exacta no teste da arma. Sem retries ou mudança de orçamento.

A revisão de integração do PR #14 reproduziu e corrigiu dois casos: entrega de Bąk depois da demolição leste sem iniciar evacuação, e saves antigos aceites sem repor os 30 cartuchos de Kowal. O teste de entrega já não atribui a tarefa ao socorrista; a regressão de save antigo verifica o reabastecimento e a conservação da munição. As partidas contínuas anexadas são as do Claude, anteriores a estas duas correcções; a revisão verifica os casos na simulação e repete a suíte de navegador.

Poses: os três testes novos verificam a chamada e o save, matrizes reais dos lotes (altura da cabeça, botas no chão, ferido horizontal e corpo transportado), capacidade para o elenco completo, ausência de mutação do actor e rejeição atómica de pose desconhecida. A captura de produção continua o outro alcançado pela simulação; a galeria isolada compara modelos e não é uma partida. Ambas foram inspeccionadas. Geometrias e movimentos continuam provisórios, sem rig/vozes finais ou alegação de FPS. Reprodução em `docs/verification/m01-runtime/poses/README.md`.

Cobertura (modelo unificado depois da fusão com `0ab60d7`): duas rotas completas de simulação com a mesma seed compararam ausência de disparos com apoio por pontaria/input, ferrolho e recarga.
- Reparo: 217,5 → 173,4 s. Tiros a menos de 3 m dos sapadores: 48 → 8.
- Retirada: tiros a menos de 3 m do pelotão 277 → 146; tiros letais 6 → 0; sobreviventes 12 → 18.
- A rota com apoio disparou 30 vezes e conservou 15 cartuchos.

Os 18 homens activos correspondem à contagem e as seis posições antigas ficam inactivas. Tiros em voo e mortos por ID persistem, sem baixas pelo simples relógio nem dependência da câmara. Passam também os casos com parede, inimigos inactivos ou suprimidos, save/reload e migração. Os parâmetros são tuning de protótipo. [Relatório e capturas](docs/verification/m01-runtime/cover-combat/README.md).

A primeira suíte de navegador desta revisão passou os oito testes de M01 e três franceses. A caminhada francesa excedeu os 20 s locais: o diagnóstico após timeout tinha y=709,84 (alvo y≥600), sem assets falhados. A segunda execução passou 12/12 em 4,1 min com `CI=1`, os orçamentos já versionados, mesmas assertions/viewport e zero retries automáticos. O trace inicial foi conservado. As capturas novas são continuações por trechos, não uma nova partida contínua; essa repetição e o playtest humano continuam necessários.

Fusão da terceira ronda com `0ab60d7`. A primeira suíte de navegador depois da fusão falhou nos oito testes de M01, todos com o mesmo erro de página: `this.syncIncoming is not a function`. Era uma chamada aos traços `incoming-shot`, removidos na fusão, que ficara no ciclo de render. Sem essa chamada, 7/8 passaram. O teste da retirada lia o clarão no instante da baixa, quando o clarão já se tinha apagado; passou a amostrar até à primeira baixa. A execução final passou 12/12 em 2,5 min, sem retries, e as duas partidas contínuas `--cover help/ignore` foram repetidas sobre o mesmo build.

## Limites de M01

- Playtest humano, performance no Chromebook e novas rotas adversas pendentes. Limites, Vístula, espera de dois minutos e reabastecimento já foram observados na segunda ronda. A partida contínua por piloto automático e a primeira revisão de ritmo estão feitas. Não há medição ou alegação de FPS de hardware.
- Modelos humanos, arma/mãos, comboios, aviões, terreno e prédios são placeholders originais. Vozes, animações finais e uniformes completos pendentes. As pontes são o kit GLB provisório revisto.
- Feridos/resgate e navegação têm comportamento reduzido; a chamada usa uma pose sentada procedural; falta a encenação completa de S3, pelotão carregando feridos, interiores de casamata e animação de agarrar do sargento.
- Sectores conservam estados/IDs mas não representam todos os sistemas de suprimento, moral, ferimentos e munição de NPCs exigidos no plano. Fogo e precisão usam tuning explícito de protótipo.
- Alça 300/500/800/1000 m é referência, com raio recto/dispersão; queda/arrasto balístico pendentes. Treliças não são paredes opacas; colisão exacta de barras/ruínas pendente.
- P4/P13, medidas modernas versus 1939, poses de dano e forma/presença de portais continuam classificados em `SOURCE_CHECK.md` e `BRIDGE_ASSET_REPORT.md`. Remover o portal oeste é resultado do roteiro do protótipo; não comprova o dano histórico exacto do portal.
- M02–M30 e o save/transições da campanha permanecem por implementar.

## Histórico da fundação

## Evidências locais

| Verificação | Resultado | O que demonstra |
| --- | --- | --- |
| `npm test` | 36/36 passam | 11 testes preservados, 15 regressões da fundação e 10 validações de dados de M01 |
| `npm run build` | Passa | Build Vite de produção com assets originais; JS ~698 kB / 181 kB gzip |
| Playwright sobre produção | 4/4 passam, 45,2 s | Prefixo/assets; orientação na captura/retoma, yaw/pitch por eventos relativos; disparo/recarga/pausa; percurso/checkpoint/reload; erro de save e fallback |
| Inspecção de capturas | Menu e jogo inspeccionados | Layout a 1280×720; correcção dos triângulos sobrepostos dos placeholders e escala do ViewModel |
| Revisão PRs #8 e #10 | Integrados com correcções | Contrato de engine, fontes lidas, geometria moderna explicitada, cronologia e debrief revistos |

O teste de tiro detecta acerto horizontal e falha acima da cabeça, paredes/terreno e bloqueio do cano. A IA não dispara de cobertura sem visão. O teste de explosão distingue actor obstruído de actor exposto. Saves inválidos são rejeitados sem modificar a simulação; decisões futuras reproduzem-se após restaurar o RNG. Um teste de morte conserva o checkpoint vivo e as baixas anteriores.

## Ambiente e limites

Node 24.19.0, Three.js 0.186.1, Vite 8.3.1, Playwright 1.58.2; Chromium 153 com SwiftShader em ambiente Linux, 1280×720. O download padrão de Chromium falhou neste ambiente; foi usado `CHROME_EXECUTABLE`, descrito no runbook. O daemon de agent-browser não arrancou; a verificação efectiva foi Playwright.

O build emite aviso de chunk maior que 500 kB. Não é erro de compilação; reduzir/cortar carregamento será avaliado com medição real. FPS, memória prolongada e budgets no Chromebook ainda não medidos. Não há relatório de performance fabricado.

As capturas e traces ficam em `test-results/`; o CI publica `browser-evidence`. O PR deve passar o workflow antes de merge; os resultados locais não comprovam que Actions/Pages já publicaram esta branch.

As duas primeiras execuções do CI passaram instalação, Node e build, mas excederam o tempo do navegador. O trace mostrou o primeiro teste a concluir disparo/recarga/pausa e a expirar ao capturar a imagem final; a caminhada também excedeu 20 s com renderização em software. Mantêm-se viewport 1280×720, controlos e assertions; o CI recebe orçamento de 180 s por teste e 120 s para o percurso, sem retries. Falhas futuras incluem diagnóstico serializável. Estes tempos não são uma aprovação de performance no Chromebook.

O CI da fundação passou no commit `3e53a9e` ([execução 36794814275](https://github.com/Brawl2007/COD-guerra/actions/runs/36794814275)): Node, build e quatro testes de navegador. A actualização sobre o PR #10 volta a passar pelo workflow; a leitura de fontes não é um playtest.

Na [execução 36797484230](https://github.com/Brawl2007/COD-guerra/actions/runs/36797484230), Node e build passaram, mas o percurso falhou: o diagnóstico no trace registou yaw −0,462 e pitch 0,968 antes de qualquer movimento intencional. A captura do cursor gerou um salto de coordenadas. O input agora espera `pointerlockchange` e descarta a primeira amostra relativa em cada entrada/retoma. Uma regressão verifica as duas ordens de entrega do salto; o teste de navegador exige orientação inicial preservada. Eventos DOM relativos verificam yaw/pitch, porque movimentos absolutos do Playwright neste Chromium headless produzem pares de recentragem que se cancelam. Captura, cliques, teclas e percurso continuam a usar input do navegador. A nova execução do CI deve validar esta correcção.

## Critérios ainda não aprovados

Na entrega anterior, M01 permanecia PLANEJADA. Esta integração já fornece runtime e verificações descritos no início do relatório; cartografia histórica, respostas específicas, partida contínua e validação de todos os critérios visuais ainda pendentes. Testes de cronologia/medidas continuam sem comprovar historicidade.

Arte final, soldados riggados, mãos convincentes, áudio gravado, mixagem e validação no Chromebook são trabalho posterior. A bancada francesa permite testar a fundação e não representa Tczew.
