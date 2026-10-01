# Estado de desenvolvimento

## Resultado desta alteração

Marco 0 preservado e Marco 1 implementado na bancada francesa. Three.js/Vite, controlos por gesto, área jogável no build de produção, tiro/obstrução em 3D e checkpoint completo foram verificados localmente. Publicação da fundação passa por PR para `main`; validação em GitHub Actions é uma etapa separada dos resultados locais.

O PR #8 de Claude Code foi revisto, corrigido e integrado em `main` (merge `7cc7b9726c6180516919dd5d11c18ab084dd28d5`). A branch da engine inclui também o PR #10, integrado em `main` no merge `c5d086151e4f55ffc20647e9d6aebc3f4af87843`. Nenhum dado de M01 foi ligado ao gameplay francês.

## Implementado e observado

- Build de produção servido em `/COD-guerra/`, com três modelos OBJ/MTL e materiais próprios. Fallback e diagnóstico para modelos ausentes.
- Disparo semiautomático com yaw/pitch, hitboxes 3D, obstrução por paredes/terreno e teste do cano. NPCs só atacam com visão e exposição; caminhos impossíveis não atravessam paredes. Explosões respeitam obstrução.
- Input limpo ao perder foco/pointer lock; pausa suspende relógio, recarga e simulação. Retomar solicita controlo sem criar outro loop.
- Snapshot JSON completo e restauração atómica: actores vivos/mortos, activação, cobertura, munição, recarga, granadas, fase, director, sectores e RNG. Restauração após morte e após reload da página verificadas nos seus respectivos testes.
- Duas simulações reduzidas de sectores avançam sem depender do olhar. Teste de 90 s preserva perdas e eventos; isso ainda não é demonstração visual de batalha histórica.
- Qualidade baixa/média/alta e volume disponíveis; loaders GLB, animações e disposal preparados.

## M01 — Tczew

Estado: **PLANEJADA**. Estão integrados pesquisa preliminar, mapa em metros, roteiro, equipamento por data, 12 objectivos, 26 eventos, cinco sectores, CP-A..D, cenas e falas.

A revisão do PR #10 integrou medidas modernas com incertezas históricas, pontes de cerca de 1 km, limites lidos do JSON em x≈270/401 e perfis propostos de assets/arma. H01-PDF, H02, H30 e T23 foram lidas; decisões e pendências estão em `SOURCE_CHECK.md`. O segundo raid tem janela própria e CP-C deve ser adiado até ela terminar. O debrief habilita apenas textos com fontes lidas.

O relógio de batalha de M01, o wz.29, as pontes, comboios, actores de 1939, resgate e demolições **ainda não estão implementados**. Condições e efeitos em prosa exigem handlers explícitos, conforme `ENGINE_CONTRACT.md`. Medidas provisórias e testes de dados não equivalem a reconstrução histórica ou missão jogável aprovadas.

## Parcial ou pendente

- Humanos, ViewModel, mãos, recarga, sons e texturas são placeholders; rig/vozes/uniformes finais pendentes.
- Combate remoto é uma fundação reduzida; armas, feridos, suprimento e trajectórias históricas completos faltam.
- Meta de 30 FPS no Chromebook não foi medida. Chromium com SwiftShader verifica funcionamento, não desempenho de GPU real.
- Campanha M01–M30, tanque, avião, jeep, transições e save da campanha pendentes.
- Não foi jogada uma partida completa de M01. Não foi concluído um playtest completo da missão francesa nesta sessão.

## Próximo passo

Implementar o fluxo completo de M01 na mesma engine: mapa com alturas e colisores em metros; perfil wz.29 com ferrolho/clipe; actor IDs e agenda dos cinco sectores; handlers dos objectivos/eventos; cenas com skip e estado final; snapshots CP-A..D. Validar o começo ao debrief, morte/restauração e demolições seguras antes de expandir M02.

Claude Code tem uma tarefa independente e concreta em `missions/m01-tczew/CLAUDE_BRIDGE_TASK.md`: kit GLB das duas pontes, peças para destruição, LODs, fontes e verificação. Mapas históricos e inventários específicos continuam úteis para as pendências restantes. Evitar alterações concorrentes em `src/` enquanto o PR da fundação está em revisão.
