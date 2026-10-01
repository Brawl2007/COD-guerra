# Estado de desenvolvimento

## Resultado desta alteração

M01 passou a **PROTÓTIPO JOGÁVEL** nesta branch. O fluxo usa a fundação Three.js e as pontes do Claude, preservando os históricos dos PRs #9 e #11. A bancada francesa continua seleccionável. O marco 2 ainda não está aprovado como missão validada; falta a partida contínua no navegador e o trabalho descrito abaixo.

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

O percurso automático com controlos chega ao debrief, passa pelos quatro checkpoints e conserva baixas/destruição ao restaurar. O navegador de produção verificou controlos, caminhada/entrega, CP-D/restauração e outro/debrief por continuação de snapshots reais. Isso ainda não é uma partida contínua de M01 no navegador. Evidências e limites em `QUALITY_REPORT.md` e `docs/verification/m01-runtime/`.

## Parcial ou pendente

- Humanos, ViewModel, mãos, recarga, sons e texturas são placeholders; rig/vozes/uniformes finais pendentes.
- Combate remoto, navegação, resgate e feridos têm comportamento reduzido. Evacuação de S3, animação de agarrar, casamatas interiores, feridos carregados pelo pelotão e direcção humana completa faltam.
- A alça muda a referência de distância; o tiro ainda usa raio recto com dispersão, conforme fallback documentado. Queda/arrasto balístico pendentes. Pontaria e probabilidade de acerto são tuning de protótipo.
- Trussas têm aberturas e não são paredes sólidas; colisão exacta dos membros metálicos e ruínas pendente. Juntas e posts dos portais usam aproximações conservadoras declaradas.
- Humanos, comboios e aviões são geometrias provisórias próprias; as pontes são o kit GLB do Claude completado no PR #11. Fontes, licenças e incertezas em `ASSET_CREDITS.md` e `BRIDGE_ASSET_REPORT.md`.
- Meta de 30 FPS no Chromebook não foi medida. Chromium com SwiftShader verifica funcionamento, não desempenho de GPU real.
- Campanha M01–M30, tanque, avião, jeep, transições e save da campanha pendentes.
- Não foi jogada uma partida contínua completa de M01 no navegador. O percurso integral de simulação e as continuações no navegador são evidências diferentes. Não houve playtest completo da missão francesa nesta sessão.

## Próximo passo

Jogar M01 continuamente no navegador, testar rotas adversas e a recuperação visual de retardatários/feridos, melhorar orientação do jogador e navegação, modelar encenações/colisões que continuam simplificadas. Medir no Chromebook antes de aprovar o marco 2; só então expandir M02.

O trabalho das pontes de Claude foi preservado e completado, incluindo dano persistente em LOD0/1/2. Mapas históricos e inventários específicos continuam úteis para as pendências de P4/P13 e de arte. Não recomeçar essa entrega.
