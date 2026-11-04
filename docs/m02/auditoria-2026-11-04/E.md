# E. Masterplan do mapa: auditoria M02 (PDF pp. 19-22)

Fontes: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf` pp. 19-22 e `tres-areas-referenciais.jpg` (recortes e leitura de pixels).
Dados: `origin/gemini/m02-01-quinta` @ 56e98cbf (`missions/m02-bzura/*.json`, `src/world/m02-quinta-world.js`, `src/world/m02-zone-streamer.js`). Tolerância ±2 m. Repositório não editado.
Contagem por linha (29 linhas agrupadas): IMPLEMENTADO 16 · PARCIAL 2 · EM FALTA 9 · CONTRADIZ 2.

## E1. Escala e envelopes
- IMPLEMENTADO. Envelopes B 240×280 (-120..120 / -140..140) e C 300×360 (-150..150 / -180..180). Evidência: `cells.json` → `cells.B.bounds`, `cells.C.bounds`.
- IMPLEMENTADO. N dentro de A 100×150 (-50..50 / -90..60). Evidência: `layout.bounds.playable`.
- EM FALTA. Envelope A 420×520 (X -210..210 / Z -260..260). `cells.json` só tem B e C; `streamer.js` (linha 153) devolve o layout da quinta sem envelope; nenhum valor ±210/±260 no branch.
- IMPLEMENTADO. Soma 393 600 m² (A+B+C; N está dentro de A). Aritmética: 218 400 + 67 200 + 108 000.
- IMPLEMENTADO. Origem (0,0,0) no pátio; eixos X este, Z sul, Y altura; portão (0,-24) com largura 3,2; edifícios a 0° (bounds alinhados aos eixos, sem campo de rotação). Evidência: `layout.origin`, `layout.axes`, `zones.northGate`.

## E2. Implantação (tabela p. 20)
- IMPLEMENTADO. B01-B12: 12/12 limites e dimensões w×d iguais à tabela (B01-B04 em `layout.buildings`; B05-B08 em `cells.B`; B09-B12 em `cells.C`). Verificado por script.
- IMPLEMENTADO. Centros e formas dos edifícios na imagem coincidem com o JSON, dentro de ~2 m (leitura visual, painéis A, B e C).
- EM FALTA. `dados/plano-espacial.json`, referido em E2, não existe no HEAD local nem na branch.

## E3. Terreno, vias e percursos: A
- IMPLEMENTADO. Entrada (0,-175), posto EA0 (-18,-110), entrada do slice (0,-80). Evidência: `c01Corridor.startP1`, `c01Corridor.outpostPosition`, `layout.start`.
- IMPLEMENTADO. Vala X -48..-42, Z -85..48, fundo Y -1,1, rampas e margens. Evidência: `zones.ditch` (floorY -1.1, bankWidth 1.5, 3 rampas).
- IMPLEMENTADO. Terreno "-0,3...+0,6 m": `terrainHeightAt` dá -0,32 (trincheira EA0) a +0,18 (talude leste, x>38). Diferença de 0,42 m no máximo, dentro de ±2 m.
- IMPLEMENTADO. Rota da vala e rota do pomar, 6 pontos cada, iguais ao texto. Pomar 237 m > vala 167 m, como a PDF afirma. Evidência: `layout.routes`.
- IMPLEMENTADO. Pomar X -24..10, Z 30..60; pátio X -22..16, Z -20..20; poço do pátio (-18,6; -4,6). Evidência: `zones.orchard`, `zones.courtyard`, `cov_well_courtyard`. Horta junto de B01 sem dado.
- EM FALTA. Corredor lateral mínimo de 2 m em torno dos edifícios e alargamentos de manobra perto do portão. Sem campo nem regra no dado.

## E3. Terreno, vias e percursos: B
- IMPLEMENTADO. Cruzamento (0,0). Evidência: `panoramaPoint` P4.
- EM FALTA. Entrada (0,-110) e saída (0,120): sem pontos no JSON (a imagem mostra-os; `playerSpawn` é (0,85)).
- EM FALTA. Rua principal de 5 m com passeios e bermas: sem largura nem polígono de rua.
- CONTRADIZ. Caminho da carroça PDF (-70,60)→(-20,60)→(0,30)→(0,-70). JSON `cartRoute`: (-50,41)→(-20,41)→(0,25)→(0,-70). Desvio de 19-20 m no início e no troço horizontal, 5 m no canto. A imagem confirma z=60 e x≈-72. O início (-50,41) fica dentro de B07 (x -60..-40, z 35..47).
- EM FALTA. Alternativa pedonal pela oficina com coberturas a 12-25 m: sem trajeto pedonal no dado.
- IMPLEMENTADO. B08 massa opaca sem quarto visível. Evidência: `navigable: false`, `solidOpaque: true`.

## E3. Terreno, vias e percursos: C
- EM FALTA. Entrada (0,-145) e antecâmara (0,-60): sem pontos no JSON; `playerSpawn` é (0,-72). A imagem mostra a entrada em z≈-146.
- IMPLEMENTADO. Pátio (-6,-10) (P5); portaria B11 (4..14 / -5..3); abrigo B12 (-64..-46 / 48..60); saída (-85,105), último ponto de `evacRoute`.
- CONTRADIZ. Entrada de evacuação em B09. PDF e imagem usam a porta norte (-30,-20), com troço horizontal em z≈-32 (x -30..-6) e vertical em x=-30. O JSON (`evacRoute`, `evacRouteNote`) entra pela porta este (-12,-5), a partir de (12,-36)→(2,-16)→(2,-8)→(-6,-5). A porta norte existe (`door_b09_north_gate`) mas não é usada.
- IMPLEMENTADO. Saída sul B09 (-30,-2), passagem (-35,25), entrada norte B12 (-58,48), saída sul B12 (-54,60). Evidência: `doors` e `evacRoute`.
- PARCIAL. Desvio (-45,28)→(-45,44) entre `cov_c_evac_wall_1` e `cov_c_evac_wall_2`: existe no JSON e não na imagem. A PDF diz que o JSON "detalha as curvas". Aceitável como refinamento; confirmar.
- IMPLEMENTADO. Reservas (115,90) e (-105,50): grupos EC2 DE-C09..C14 e DE-C15..C20 nessas posições.
- EM FALTA. Largura do corredor exterior final de 4 m e canaleta/ravina a leste. Sem campo no dado.

## Fora de E3 e observações
- PARCIAL. E4, "4 espaços domésticos" em B01: o JSON tem 5 divisões (cozinha, despensa, sala, quarto oeste, quarto este). Não é coordenada.
- EM FALTA. Percurso a sul do slice (0,60)→(0,175), visível na imagem da célula A, sem correspondência no texto nem no JSON (as rotas de A terminam em (0,-24)).
- Código (não é E, mas afeta limites de B/C): em `streamer.js` os `bounds` de B/C são `{...array}`, ficando com chaves "0".."3" e não minX/maxX. Sem consumidor M02 encontrado; latente.
- Código: as `zones` de B/C em `streamer.js` (courtyard -25..25 / -35..35 e ditch fictício) não vêm do dado.
- `docs/m02/M02_HANDOFF.md` (linha 45) fala em corredor norte até Z=-210; o JSON só tem geometria até z=-172,5 (P1 em -175).
