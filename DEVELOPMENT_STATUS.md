# Estado de desenvolvimento

## Resultado desta alteração

Marco 0 preservado e Marco 1 implementado na bancada francesa. Three.js/Vite, controlos por gesto, área jogável no build de produção, tiro/obstrução em 3D e checkpoint completo foram verificados localmente. Publicação da fundação passa por PR para `main`; validação em GitHub Actions é uma etapa separada dos resultados locais.

O PR #8 de Claude Code foi revisto, corrigido e integrado em `main` (merge `7cc7b9726c6180516919dd5d11c18ab084dd28d5`). A branch da engine parte desse merge. Nenhum dado de M01 foi ligado ao gameplay francês.

## Implementado e observado

- Build de produção servido em `/COD-guerra/`, com três modelos OBJ/MTL e materiais próprios. Fallback e diagnóstico para modelos ausentes.
- Disparo semiautomático com yaw/pitch, hitboxes 3D, obstrução por paredes/terreno e teste do cano. NPCs só atacam com visão e exposição; caminhos impossíveis não atravessam paredes. Explosões respeitam obstrução.
- Input limpo ao perder foco/pointer lock; pausa suspende relógio, recarga e simulação. Retomar solicita controlo sem criar outro loop.
- Snapshot JSON completo e restauração atómica: actores vivos/mortos, activação, cobertura, munição, recarga, granadas, fase, director, sectores e RNG. Restauração após morte e após reload da página verificadas nos seus respectivos testes.
- Duas simulações reduzidas de sectores avançam sem depender do olhar. Teste de 90 s preserva perdas e eventos; isso ainda não é demonstração visual de batalha histórica.
- Qualidade baixa/média/alta e volume disponíveis; loaders GLB, animações e disposal preparados.

## M01 — Tczew

Estado: **PLANEJADA**. Estão integrados pesquisa preliminar, mapa em metros, roteiro, equipamento por data, 12 objectivos, 25 eventos, cinco sectores, CP-A..D, cenas e falas.

A revisão removeu a silhueta histórica de Juchtman; alinhou o limite do mapa com o aviso em x=419; explicou gates, snaps monotónicos e snapshots reais; registou a leitura parcial de H01-PDF e divergências; desactivou os parágrafos históricos de debrief ainda dependentes de P1/P10. Condições e efeitos em prosa exigem handlers explícitos, conforme `missions/m01-tczew/ENGINE_CONTRACT.md`.

O relógio de batalha de M01, o wz.29, as pontes, comboios, actores de 1939, resgate e demolições **ainda não estão implementados**. P1–P12 continuam documentados, incluindo cartografia e fontes. As medidas provisórias não equivalem a reconstrução histórica aprovada.

## Parcial ou pendente

- Humanos, ViewModel, mãos, recarga, sons e texturas são placeholders; rig/vozes/uniformes finais pendentes.
- Combate remoto é uma fundação reduzida; armas, feridos, suprimento e trajectórias históricas completos faltam.
- Meta de 30 FPS no Chromebook não foi medida. Chromium com SwiftShader verifica funcionamento, não desempenho de GPU real.
- Campanha M01–M30, tanque, avião, jeep, transições e save da campanha pendentes.
- Não foi jogada uma partida completa de M01. Não foi concluído um playtest completo da missão francesa nesta sessão.

## Próximo passo

Implementar o fluxo completo de M01 na mesma engine: mapa com alturas e colisores em metros; perfil wz.29 com ferrolho/clipe; actor IDs e agenda dos cinco sectores; handlers dos objectivos/eventos; cenas com skip e estado final; snapshots CP-A..D. Validar o começo ao debrief, morte/restauração e demolições seguras antes de expandir M02.

Claude Code pode continuar em nova branch na leitura integral de H01-PDF, medições históricas e ficha/licenças de assets. Evitar alterações concorrentes em `src/` enquanto o PR da fundação está em revisão.
