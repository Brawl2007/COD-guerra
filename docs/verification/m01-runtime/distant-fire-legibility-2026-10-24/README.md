# VIS-a: legibilidade do fogo à distância (renderer), 2026-10-24

Branch `claude/exciting-bohr-k8v5xm-visa` (base `eedc860`). Só apresentação: `src/render/m01-shot-fx.js` (novo), `src/render/m01-view.js` (`updateShotFx`), `src/render/m01-impostors.js` (contraste DE). Nada em `src/game`, goldens, saves, viewmodel em primeira pessoa nem `m01-soldier-batching.js`. O renderer só lê o que a simulação já emitiu.

## O que a auditoria encontrou (antes)

- Clarão alemão de jogo: janela por ator (`a.shot`), só `team==='enemy'`; display fire: janela de 0,15 s por ator (uma rajada de display dava brilho contínuo, não ritmo); **o rkm do Kowal, os fuzileiros polacos e a retaguarda não tinham clarão**; tamanho = 0,8 % da distância (raio 8 m a 1 km), sem noção de píxeis nem de luz.
- Fumo: só por ator inimigo de jogo; nenhum para display fire nem para aliados.
- Impostores: DE e PL com a mesma luminância (só diferiam em matiz ténue).

## O que mudou

- Um clarão **por tiro real**: `enemyFire.rounds` (espingardas e MG34 tiro a tiro), `display.rounds`, e o estado de fogo de atores aliados (`firedAt` + `shot`: rkm = round(shot0/0,11) tiros a 0,11 s; espingarda = 1). Janela 0,06 s (a do próprio MG34), pelo que as rajadas piscam nos tiros. Atirador morto/inativo não clareja. O ckm mantém o seu módulo.
- Posição: boca real do corpo desenhado (<150 m), ponto do fuzil da silhueta (0,74 h) se o ator é impostor, origem do tiro nos restantes.
- Tamanho em píxeis: raio físico de perto; piso de 5 px (espingarda) / 7 px (MG) de diâmetro a 1366x768, até +30 % no escuro; tom da instância por luz do dia (1,0 de noite, 0,62 ao meio-dia). A 1 km o raio fica abaixo de 6 m (antes 8 m). Nenhum soldado foi ampliado.
- Fumo: tabela fixa de 64 atiradores (1 nuvem por atirador, renovada pelo tiro seguinte), tetos por nível 12/24/40 (low/medium/high). Clarões iguais em todos os níveis. Zero alocações por frame (teste mede o heap).
- Impostores: contraste mínimo DE 3,9 (PL 3,0): a 350–700 m o DE é claramente mais claro (Y 0,42–0,58 vs 0,31–0,43), mesmo tamanho. Impacto de poeira: os tiros de jogo já criam poeira no `round-impact`; os de display/`east` não têm ponto de impacto na simulação e não foi inventado.

## Testes (executados)

`tests/m01-shot-fx.test.js` (10): dimensionamento em píxeis, ritmo do MG34 (6 tiros a 0,075 s, apagado nos intervalos), 1 clarão por tiro/janela, rkm 2..5 tiros a 0,11 s e espingarda aliada, limites dos pools, heap sem crescimento em 30 000 frames, caps por nível, ponto do impostor, view só lê, e **rota real amostrada tick a tick**: cada tiro alemão (enemy-fire + attrition), cada tiro aliado (npc-shot) e cada tiro de display visível num tick dá exatamente um clarão no atirador certo. Ajustei `tests/m01-display-fire.test.js` (o teste do clarão de display passou de janela 0,15 s por ator para 1 clarão por tiro de 0,06 s; `DISPLAY_FLASH_SEC` mantém-se para o canhão fixo do Panzerzug). Contraste DE/PL em `tests/m01-impostors.test.js`. Corrida focada final: 9 ficheiros, 124 testes, 124 passam (impostors, actor-legibility, combat-feedback, east-front, display-fire, mg34-prone-presentation, battlefield-fx, ckm-live-presentation, shot-fx); `npm run build` ok. A suite completa `npm test` não foi corrida.

## Evidência visual (Chromium headless/SwiftShader 1366x768, `tools/verification/m01-distant-fire-capture.mjs`)

Saves reais da rota (piloto de apoio), um tick antes de um `enemy-fire` a x>=690: posto da reparação (-120,16) às ~04:49 (kar98k) e ~04:45 (MG34), posto do tabuleiro (37,42) às ~06:00. Os dois builds correm em tempo real a partir do mesmo save; a captura é o canvas no primeiro frame com clarão (não é o mesmo instante). `pairs/` = antes (esq.) e depois (dir.), recorte ampliado 4x; `frames/` = frame inteiro (`-rings` com anéis nos clarões que a view reportou: vermelho DE, ciano PL); `report-*.json` com câmara e `distantFire`.

O que vi (avaliação honesta):
- **Posto da reparação, olhando a leste (~1,2 km):** os clarões alemães aparecem como discos amarelos de ~5–6 px junto ao portal ferroviário e **localizam-se** no ecrã (o par de clarões em `snap-post1-kar98k-pair-1.png`); o atirador em si não se vê (3 px de silhueta atrás de obstáculos). Antes já havia clarão alemão de forma semelhante (um pouco maior); o novo é o clarão do **rkm do Kowal** (disco à direita, a 50 m), ausente antes, e o ritmo por tiro.
- **Posto do tabuleiro (~1,0 km):** o clarão alemão **não é localizável**: o atirador está atrás da treliça e o clarão (com teste de profundidade, correto) fica tapado; resta, no máximo, um ponto claro de 1–2 px no fim do tabuleiro (`snap-post2-kar98k-pair-*.png`, igual antes e depois). Não fiz o renderer "ver através" da estrutura: seria decidir visibilidade.
- DE vs PL como silhuetas: a 350–700 m diferem em tom; acima de ~800 m ambos são quase pretos de 3 px e o tom não os separa. Capacete M35 vs wz.31 não é resolvível (0,3 px a 350 m), por isso não foi desenhado.

## Para um humano julgar

Se o disco de 5–7 px lê bem no portátil de referência (HD 5500, 1366x768) e à luz real; se o fumo de 3 px é visível ou só ruído; se o DE mais claro a 350–700 m parece natural; FPS não foi medido.
