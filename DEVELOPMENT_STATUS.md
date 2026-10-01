# Estado de desenvolvimento

## Resultado desta alteração

M01 passou a **PROTÓTIPO JOGÁVEL** nesta branch. O fluxo usa a fundação Three.js e as pontes do Claude, preservando os históricos dos PRs #9 e #11. A bancada francesa continua seleccionável. O marco 2 ainda não está aprovado como missão validada; faltam o playtest humano, a medição no Chromebook e o trabalho descrito abaixo.

Os PRs #8 e #10 de pesquisa/preparação já estão em `main`. Esta integração é proposta num PR próprio para `main`; os PRs #9 e #11 permanecem abertos. O mapa francês conserva as suas coordenadas e arma.

## Implementado e observado

- Soldados levantam a arma ao ombro nos disparos, com mãos ligadas à coronha/guarda-mão e recuo procedural. Sob fogo, o tronco curva-se com as botas no chão; o passo levanta um pé. A animação deriva do relógio e dos dados do actor, reproduzindo o mesmo frame após pausa/reload. Galeria e provas em `docs/verification/m01-runtime/combat-animation/`; continuam geometrias provisórias. O kit Ju 87 foi separado como tarefa para um terceiro agente em `docs/THIRD_AGENT_TASK.md`, independente dos soldados atribuídos ao Claude.

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

## Parcial ou pendente

- Humanos, ViewModel, mãos, recarga, sons e texturas são placeholders; rig/vozes/uniformes finais pendentes.
- Combate remoto, navegação, resgate e feridos têm comportamento reduzido. Evacuação de S3, animação de agarrar, casamatas interiores, feridos carregados pelo pelotão e direcção humana completa faltam.
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
  - o transporte de feridos usa um placeholder.

  Detalhes em `docs/verification/m01-runtime/continuous/README.md`.

## Próximo passo

Playtest humano completo de M01, com atenção ao fogo de cobertura a ~1,2 km (clarões de ~8 px e raio de supressão de 3 m). Modelar encenações e colisões que continuam simplificadas. Medir no Chromebook antes de aprovar o marco 2; só então expandir M02.

O trabalho das pontes de Claude foi preservado e completado, incluindo dano persistente em LOD0/1/2. Mapas históricos e inventários específicos continuam úteis para as pendências de P4/P13 e de arte. Não recomeçar essa entrega.
