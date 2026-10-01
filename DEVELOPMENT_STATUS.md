# Estado de desenvolvimento

## Resultado desta alteração

M01 passou a **PROTÓTIPO JOGÁVEL** nesta branch. O fluxo usa a fundação Three.js e as pontes do Claude, preservando os históricos dos PRs #9 e #11. A bancada francesa continua seleccionável. O marco 2 ainda não está aprovado como missão validada; faltam o playtest humano, a medição no Chromebook e o trabalho descrito abaixo.

Os PRs #8 e #10 de pesquisa/preparação já estão em `main`. Esta integração é proposta num PR próprio para `main`; os PRs #9 e #11 permanecem abertos. O mapa francês conserva as suas coordenadas e arma.

## Implementado e observado

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
  - ameaça legível em "Proteja o reparo" e "Cubra a retirada";
  - "Abrigue-se!" pode não aparecer;
  - de dentro da treliça rodoviária, a coluna da demolição leste fica tapada;
  - o transporte de feridos usa um placeholder.

  Detalhes em `docs/verification/m01-runtime/continuous/README.md`.

## Próximo passo

Playtest humano completo de M01 e rotas adversas. Depois, dar ameaça legível às tarefas de cobertura. Modelar encenações e colisões que continuam simplificadas. Medir no Chromebook antes de aprovar o marco 2; só então expandir M02.

O trabalho das pontes de Claude foi preservado e completado, incluindo dano persistente em LOD0/1/2. Mapas históricos e inventários específicos continuam úteis para as pendências de P4/P13 e de arte. Não recomeçar essa entrega.
