# Tabela de vãos, linhas de tiro e comparação com o PDF — bancada M02-01 (portão N0)

Ficheiro **gerado** por `tools/m02/openings-table.mjs` (não editar à mão). Prova de geometria/colisão/linha de vista sobre os dados reais do layout; **não** é playtest nem aprova o N0.

- Entrada: `missions/m02-bzura/m02-01-quinta-layout.json` (sha256 `0d4ad89cc0ce74d05e189ee4beae4c68372942b5b1df25d2865cae3fd7527312`), instanciado com `M02QuintaWorld`.
- Cápsula do jogador (`PLAYER_PHYSICS`, src/world/m01-player-physics.js, usada por `m02-01-simulation.js`): raio 0,36 m (Ø 0,72 m), altura em pé 1,80 m, agachado 1,25 m, degrau máximo 0,45 m, sem salto. Olhos: em pé 1,64 m, agachado 1,08 m (`EYE_HEIGHT` de src/config.js e o literal de olhos agachado em `m02-01-simulation.js`).
- Eixos: x este, z sul, y altura (metros). Posição = centro do vão no plano da parede. «Atravessável» = a cápsula passa em linha reta ao longo da normal da parede, com a colisão real (`deepestWall`, `playerSolids`).
- LoS = `world.lineOfSight` (inclui copas) entre dois pontos à mesma altura, 3 m fora/dentro (1,4 m em paredes interiores), perpendiculares à parede. Política de vidro (`BALLISTIC_MATERIAL_POLICY.glass`): o vidro intacto **deixa ver** (`blocksSight` = false: `lineOfSight` ignora-o) mas **pára a bala**, que o parte (`glassBrokenId`; depois o vão fica `broken`). Bala = qualquer outro sólido bloqueia; **não há penetração** em `traceObstruction` (`BALLISTIC_MATERIAL_POLICY.penetrationLoss` só existe como dados).

## 1. Vãos

### 1.1 Geometria e passagem do jogador

| ID | Edifício · parede | Centro (x; z) m | Offset (m) | L × A livre (m) | Peitoril → lintel (m) | Estado inicial | Atravessável (estado inicial) | Atravessável se aberto (em pé / agachado) | Folga vs Ø 0,72 (m) | Raio livre máx. (m) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| door_b01_east_main | B01 · b01_wall_east (este) | -26,00; -15,50 | 2,50 | 1,10 × 2,10 | 0,00 → 2,10 | porta closed | não (door_b01_east_main_leaf) | sim / sim | 0,38 | 0,55 |
| door_b01_north_service | B01 · b01_wall_north (norte) | -37,00; -18,00 | 3,00 | 1,00 × 2,10 | 0,00 → 2,10 | porta closed | não (door_b01_north_service_leaf) | sim / sim | 0,28 | 0,50 |
| door_b01_kitchen_pantry | B01 · b01_wall_mid_v1 (interior) | -33,00; -15,50 | 2,50 | 1,00 × 2,10 | 0,00 → 2,10 | porta open | sim | sim / sim | 0,28 | 0,50 |
| door_b01_pantry_hall | B01 · b01_wall_mid_v2 (interior) | -31,00; -15,50 | 2,50 | 1,00 × 2,10 | 0,00 → 2,10 | porta open | sim | sim / sim | 0,28 | 0,50 |
| door_b01_kitchen_westbed | B01 · b01_wall_mid_h (interior) | -37,00; -13,00 | 3,00 | 1,00 × 2,10 | 0,00 → 2,10 | porta closed | não (door_b01_kitchen_westbed_leaf) | sim / sim | 0,28 | 0,50 |
| door_b01_hall_eastbed | B01 · b01_wall_mid_h (interior) | -29,00; -13,00 | 11,00 | 1,00 × 2,10 | 0,00 → 2,10 | porta open | sim | sim / sim | 0,28 | 0,50 |
| win_b01_west_kitchen | B01 · b01_wall_west (oeste) | -40,00; -15,50 | 2,50 | 1,30 × 1,10 | 0,95 → 2,05 | vidro open | não (peitoril 0,95 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| win_b01_east_hall | B01 · b01_wall_east (este) | -26,00; -17,10 | 0,90 | 1,00 × 1,10 | 0,95 → 2,05 | vidro intact | não (peitoril 0,95 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| win_b01_east_bed | B01 · b01_wall_east (este) | -26,00; -10,50 | 7,50 | 1,30 × 1,10 | 0,95 → 2,05 | vidro open | não (peitoril 0,95 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| win_b01_north_hall | B01 · b01_wall_north (norte) | -29,00; -18,00 | 11,00 | 1,20 × 1,10 | 0,95 → 2,05 | vidro intact | não (peitoril 0,95 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| door_b02_north_gate | B02 · b02_wall_north (norte) | 24,00; -38,00 | 12,00 | 3,00 × 3,00 | 0,00 → 3,00 | porta open | sim | sim / sim | 2,28 | 1,50 |
| door_b02_south_door | B02 · b02_wall_south (sul) | 30,00; -24,00 | 18,00 | 1,20 × 2,20 | 0,00 → 2,20 | porta closed | não (door_b02_south_door_leaf) | sim / sim | 0,48 | 0,60 |
| win_b02_west_mg | B02 · b02_wall_west (oeste) | 12,00; -30,00 | 8,00 | 1,80 × 1,15 | 1,00 → 2,15 | vidro open | não (peitoril 1,00 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| door_b03_north | B03 · b03_wall_north (norte) | 29,00; 0,00 | 9,00 | 2,40 × 2,40 | 0,00 → 2,40 | porta open | sim | sim / sim | 1,68 | 1,20 |
| door_b03_south | B03 · b03_wall_south (sul) | 29,00; 12,00 | 9,00 | 2,40 × 2,40 | 0,00 → 2,40 | porta open | sim | sim / sim | 1,68 | 1,20 |
| door_b03_east_tack | B03 · b03_wall_east (este) | 38,00; 9,50 | 9,50 | 1,00 × 2,10 | 0,00 → 2,10 | porta closed | não (door_b03_east_tack_leaf) | sim / sim | 0,28 | 0,50 |
| win_b03_west_high | B03 · b03_wall_west (oeste) | 20,00; 6,00 | 6,00 | 1,20 × 0,70 | 1,75 → 2,45 | vidro open | não (peitoril 1,75 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| win_b03_north_high | B03 · b03_wall_north (norte) | 23,50; 0,00 | 3,50 | 1,20 × 0,70 | 1,75 → 2,45 | vidro open | não (peitoril 1,75 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| win_b03_south_high | B03 · b03_wall_south (sul) | 34,50; 12,00 | 14,50 | 1,20 × 0,70 | 1,75 → 2,45 | vidro open | não (peitoril 1,75 m > degrau 0,45 m) | não (peitoril) | n/a | n/a |
| door_b04_south | B04 · b04_wall_south (sul) | -31,80; 26,00 | 5,20 | 1,00 × 2,00 | 0,00 → 2,00 | porta open | sim | sim / sim | 0,28 | 0,50 |

Total: 12 portas e 8 janelas (20 vãos).

### 1.2 Linha de vista e de tiro através do vão

Estado «inicial» = o do layout; «aberto» = porta aberta / vidro aberto. Alturas absolutas ao piso: olhos em pé 1,64 m, agachado 1,08 m, meio-vão = (peitoril + lintel) / 2 (porta: a meio da altura).

| ID | Estado inicial | LoS em pé (inicial) | LoS agachado (inicial) | Tiro a meio-vão (inicial) | LoS em pé (aberto) | Tiro a meio-vão (aberto) |
| --- | --- | --- | --- | --- | --- | --- |
| door_b01_east_main | porta closed | não (door_b01_east_main_leaf) | não (door_b01_east_main_leaf) | não (door_b01_east_main_leaf) (h 1,05) | sim | sim |
| door_b01_north_service | porta closed | não (door_b01_north_service_leaf) | não (door_b01_north_service_leaf) | não (door_b01_north_service_leaf) (h 1,05) | sim | sim |
| door_b01_kitchen_pantry | porta open | sim | sim | sim (h 1,05) | sim | sim |
| door_b01_pantry_hall | porta open | sim | sim | sim (h 1,05) | sim | sim |
| door_b01_kitchen_westbed | porta closed | não (door_b01_kitchen_westbed_leaf) | não (door_b01_kitchen_westbed_leaf) | não (door_b01_kitchen_westbed_leaf) (h 1,05) | sim | sim |
| door_b01_hall_eastbed | porta open | sim | sim | sim (h 1,05) | sim | sim |
| win_b01_west_kitchen | vidro open | sim | sim | sim (h 1,50) | sim | sim |
| win_b01_east_hall | vidro intact | sim | sim | pára no vidro, que parte (win_b01_east_hall_glass) (h 1,50) | sim | sim |
| win_b01_east_bed | vidro open | sim | sim | sim (h 1,50) | sim | sim |
| win_b01_north_hall | vidro intact | sim | sim | pára no vidro, que parte (win_b01_north_hall_glass) (h 1,50) | sim | sim |
| door_b02_north_gate | porta open | sim | sim | sim (h 1,50) | sim | sim |
| door_b02_south_door | porta closed | não (door_b02_south_door_leaf) | não (door_b02_south_door_leaf) | não (door_b02_south_door_leaf) (h 1,10) | sim | sim |
| win_b02_west_mg | vidro open | sim | sim | sim (h 1,57) | sim | sim |
| door_b03_north | porta open | sim | sim | sim (h 1,20) | sim | sim |
| door_b03_south | porta open | sim | sim | sim (h 1,20) | sim | sim |
| door_b03_east_tack | porta closed | não (door_b03_east_tack_leaf) | não (door_b03_east_tack_leaf) | não (door_b03_east_tack_leaf) (h 1,05) | sim | sim |
| win_b03_west_high | vidro open | não (win_b03_west_high_sill) | não (win_b03_west_high_sill) | sim (h 2,10) | não (win_b03_west_high_sill) | sim |
| win_b03_north_high | vidro open | não (win_b03_north_high_sill) | não (win_b03_north_high_sill) | sim (h 2,10) | não (win_b03_north_high_sill) | sim |
| win_b03_south_high | vidro open | não (win_b03_south_high_sill) | não (win_b03_south_high_sill) | sim (h 2,10) | não (win_b03_south_high_sill) | sim |
| door_b04_south | porta open | sim | sim | sim (h 1,00) | sim | sim |

## 2. Linhas de tiro da MG34 de B02

Fonte única: `mgEmplacement` do layout. PDF F3 p. 24 (12,00; -30,00); layout (12,00; -30,00), boca a 1,42 m, olhos do artilheiro 1,48 m; artilheiro `DE-A05` (13,20; -30,00), atrás da abertura no eixo de tiro, a 1,2 m da boca. A simulação (`evaluateMgLineOfFire`), o disparo do artilheiro (`fireActorBurst`), o rasto das rajadas, os pontos de supressão da secção e o desenho do renderer usam a mesma boca (`m02MgMuzzle`): (12,00; -30,00), altura 1,42 m. Arco: centro 3,142 rad (oeste), meio-ângulo 1,38 rad (79,1°), alcance 95 m.

A parede oeste de B02 está em x 11,88…12,12 (espessura 0,24 m) e o vão `win_b02_west_mg` abre z -30,90…-29,10, y 1,00…2,15: a boca (x = 12,00, y = 1,42, z = -30,00) está **dentro do vão**, por isso o raio de fogo verifica montantes, peitoril e lintel (PDF F3: «raio de arma verifica montantes e parapeito»). O artilheiro aponta pelo prolongamento do cano através da boca: a linha de pontaria é o raio da boca.

Estado: **Sim** = `M02BenchSimulation.evaluateMgLineOfFire` (a função real, sem espelho): EXPOSTO = no arco, sem obstrução balística e com LoS; coberto (id) = primeiro sólido no raio. **Real** = o disparo da MG: `traceShot` desde a boca até aos olhos do alvo (a chamada de `fireActorBurst`, sem dispersão) e `world.lineOfSight` desde a boca; «vê» = a bala chega ao alvo e há linha de vista, «bloqueado (id)» = o primeiro sólido atingido. Sim e Real têm de coincidir em todas as amostras.

### 2.1 Pontos SN1–SN5 (coordenadas do PDF; SN1 = arranque (0; -80))

| Ponto | (x; z) m | Dist. 3D à boca (m) | Sim · em pé | Sim · agachado | Real · em pé | Real · agachado |
| --- | --- | --- | --- | --- | --- | --- |
| SN1 | 0,00; -80,00 | 51,42 | EXPOSTO | EXPOSTO | vê | vê |
| SN2 | -45,00; -5,00 | 62,25 | coberto (cov_gate_wall_west) | coberto (cov_gate_wall_west) | bloqueado (cov_gate_wall_west) | bloqueado (cov_gate_wall_west) |
| SN3 | -23,00; -12,00 | 39,36 | EXPOSTO | EXPOSTO | vê | vê |
| SN4 | 8,00; -28,00 | 4,48 | EXPOSTO | EXPOSTO | vê | vê |
| SN5 | 0,00; 45,00 | 75,95 | fora de arco | fora de arco | fora de arco | fora de arco |

PDF N2 (p. 48): «MG visível/audível na abertura oeste de B02 … ameaça identificável a cerca de 51 m». Distância horizontal arranque → boca: 51,4 m. LoS do jogador (em pé) à boca da MG (12,00; 1,42; -30,00): sim; ao artilheiro DE-A05 (atrás da abertura): não (b02_wall_west_seg_0).

### 2.2 Rota «vala» (comprimento 166,7 m; amostra a cada 10 m)

| s (m) | (x; z) m | Dist. 3D (m) | Sim · em pé | Sim · agachado | Real · em pé |
| --- | --- | --- | --- | --- | --- |
| 0 | 0,0; -80,0 | 51,4 | EXPOSTO | EXPOSTO | vê |
| 10 | -9,8; -77,8 | 52,5 | EXPOSTO | EXPOSTO | vê |
| 20 | -19,5; -75,7 | 55,5 | EXPOSTO | EXPOSTO | vê |
| 30 | -29,3; -73,5 | 60,0 | EXPOSTO | EXPOSTO | vê |
| 40 | -39,0; -71,3 | 65,7 | EXPOSTO | EXPOSTO | vê |
| 50 | -45,0; -66,1 | 67,5 | EXPOSTO | coberto (ditch_east_lip_north) | vê |
| 60 | -45,0; -56,1 | 62,7 | EXPOSTO | coberto (ditch_east_lip_north) | vê |
| 70 | -45,0; -46,1 | 59,2 | EXPOSTO | coberto (ditch_east_lip_north) | vê |
| 80 | -45,0; -36,1 | 57,3 | EXPOSTO | coberto (ditch_east_lip_north) | vê |
| 90 | -45,0; -26,1 | 57,1 | EXPOSTO | coberto (ditch_east_lip_north) | vê |
| 100 | -45,0; -16,1 | 58,7 | coberto (cov_gate_wall_west) | coberto (cov_gate_wall_west) | bloqueado (cov_gate_wall_west) |
| 110 | -45,0; -6,1 | 61,8 | coberto (cov_gate_wall_west) | coberto (cov_gate_wall_west) | bloqueado (cov_gate_wall_west) |
| 120 | -36,3; -2,9 | 55,4 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 130 | -26,6; -0,6 | 48,5 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 140 | -18,5; -4,9 | 39,5 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 150 | -11,4; -11,8 | 29,6 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 160 | -4,6; -19,1 | 19,8 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 167 | 0,0; -24,0 | 13,4 | EXPOSTO | EXPOSTO | vê |

Resumo: 11/18 amostras expostas em pé, 6/18 agachado (critério da simulação). Amostras em que a avaliação da simulação e o disparo real discordam (em pé ou agachado): 0.

### 2.3 Rota «pomar» (comprimento 237,2 m; amostra a cada 10 m)

| s (m) | (x; z) m | Dist. 3D (m) | Sim · em pé | Sim · agachado | Real · em pé |
| --- | --- | --- | --- | --- | --- |
| 0 | 0,0; -80,0 | 51,4 | EXPOSTO | EXPOSTO | vê |
| 10 | 8,6; -75,0 | 45,1 | fora de arco | fora de arco | fora de arco |
| 20 | 17,3; -69,9 | 40,3 | fora de arco | fora de arco | fora de arco |
| 30 | 25,9; -64,9 | 37,6 | fora de arco | fora de arco | fora de arco |
| 40 | 34,6; -59,9 | 37,5 | fora de arco | fora de arco | fora de arco |
| 50 | 43,0; -54,7 | 39,7 | fora de arco | fora de arco | fora de arco |
| 60 | 43,0; -44,7 | 34,3 | fora de arco | fora de arco | fora de arco |
| 70 | 43,0; -34,7 | 31,4 | fora de arco | fora de arco | fora de arco |
| 80 | 43,0; -24,7 | 31,4 | fora de arco | fora de arco | fora de arco |
| 90 | 43,0; -14,7 | 34,5 | fora de arco | fora de arco | fora de arco |
| 100 | 43,0; -4,7 | 40,0 | fora de arco | fora de arco | fora de arco |
| 110 | 43,0; 5,3 | 47,0 | fora de arco | fora de arco | fora de arco |
| 120 | 43,0; 15,3 | 54,9 | fora de arco | fora de arco | fora de arco |
| 130 | 43,0; 25,3 | 63,4 | fora de arco | fora de arco | fora de arco |
| 140 | 35,4; 30,3 | 64,6 | fora de arco | fora de arco | fora de arco |
| 150 | 26,2; 34,2 | 65,8 | fora de arco | fora de arco | fora de arco |
| 160 | 17,0; 38,1 | 68,3 | fora de arco | fora de arco | fora de arco |
| 170 | 7,9; 41,8 | 71,9 | fora de arco | fora de arco | fora de arco |
| 180 | 4,5; 32,4 | 62,9 | fora de arco | fora de arco | fora de arco |
| 190 | 1,1; 23,0 | 54,1 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 200 | 0,0; 13,2 | 44,9 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 210 | 0,0; 3,2 | 35,3 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 220 | 0,0; -6,8 | 26,1 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 230 | 0,0; -16,8 | 17,9 | coberto (cov_gate_wall_east) | coberto (cov_gate_wall_east) | bloqueado (cov_gate_wall_east) |
| 237 | 0,0; -24,0 | 13,4 | EXPOSTO | EXPOSTO | vê |

Resumo: 2/25 amostras expostas em pé, 2/25 agachado (critério da simulação). Amostras em que a avaliação da simulação e o disparo real discordam (em pé ou agachado): 0.

## 3. Comparação PDF ↔ layout (B01–B04)

Fonte PDF: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, secção F (pp. 23–25) e N (p. 47). ✓ = igual; ✗ = diverge (entra na lista de problemas).

### 3.1 Dimensões e implantação

| Edifício | PDF (página) | Implantação X…, Z… PDF | Implantação layout | L × P PDF | L × P layout | Beiral / cumeeira PDF | Beiral / cumeeira layout | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B01 | F2, p. 24 | X -40…-26, Z -18…-8 | X -40…-26, Z -18…-8 | 14 × 10 | 14 × 10 (bounds 14 × 10) | 2,8 / 5,2 | 2,8 / 5,2 | ✓ |
| B02 | F3, p. 24 | X 12…36, Z -38…-24 | X 12…36, Z -38…-24 | 24 × 14 | 24 × 14 (bounds 24 × 14) | 3,6 / 7,2 | 3,6 / 7,2 | ✓ |
| B03 | F4, p. 25 | X 20…38, Z 0…12 | X 20…38, Z 0…12 | 18 × 12 | 18 × 12 (bounds 18 × 12) | não indicado | 3,0 / 5,4 | ✓ |
| B04 | F5, p. 25 | X -37…-29, Z 20…26 | X -37…-29, Z 20…26 | 8 × 6 | 8 × 6 (bounds 8 × 6) | não indicado | 2,4 / 3,8 | ✓ |

B03 e B04: o PDF não fixa beiral/cumeeira (F4 diz só «volume mais baixo que B02»; layout B03 3,0 / 5,4 m < B02 3,6 / 7,2 m ✓).

### 3.2 Vãos e divisões citados no PDF

| Elemento | PDF diz (página) | Layout | Resultado |
| --- | --- | --- | --- |
| B01 divisões | cozinha u0-7/v0-5; despensa u7-9/v0-5; sala u9-14/v0-5; quartos u0-7/v5-10 e u7-14/v5-10 (F2, p. 24) | cozinha u0-7/v0-5; despensa u7-9/v0-5; sala u9-14/v0-5; quarto_oeste u0-7/v5-10; quarto_este u7-14/v5-10 | ✓ |
| door_b01_east_main posição | entrada a este em u=14 m, v=2,5 m (F2, p. 24) | parede este, v = 2,50 (centro z = -15,50) | ✓ |
| door_b01_east_main largura | 1,00 m (F1, p. 23: folga pedonal 1,0 m) | 1,10 m (≥ mínimo) | ✓ |
| door_b01_north_service posição | saída de serviço norte em u=3, v=0 (F2, p. 24) | parede norte, u = 3,00 | ✓ |
| B01 portas internas | cozinha–despensa, despensa–sala, cozinha–quarto oeste, sala–quarto este (F2, p. 24) | kitchen_pantry, pantry_hall, kitchen_westbed, hall_eastbed | ✓ |
| B01 janelas | janela oeste da cozinha e janela leste da sala (F2, p. 24; a planta p. 23 mostra mais vãos) | west_kitchen (oeste), east_hall (este), east_bed (este), north_hall (norte) | ✓ |
| B02 faixas | v0-4 armazenamento, v4-10 corredor, v10-14 palha (F3, p. 24) | armazenamento_norte v0-4; corredor_trabalho v4-10; palha_sul v10-14 | ✓ |
| door_b02_north_gate | portão norte centrado em u12, vão de 3 m (F3, p. 24) | parede norte, u = 12,00, largura 3,00 m | ✓ |
| door_b02_south_door | porta sul u18, 1,2 m (F3, p. 24) | parede sul, u = 18,00, largura 1,20 m, closed | ✓ |
| win_b02_west_mg | abertura oeste u0/v8, usada pela MG (F3, p. 24) | parede oeste, v = 8,00, largura 1,80 m, peitoril 1,00 | ✓ |
| B02 posição da MG | MG a (12; -30) (F3, p. 24) | mgEmplacement (12,00; -30,00); boca da simulação (12,00; -30,00) | ✓ |
| B03 corredor | corredor central norte-sul u7-11 (F4, p. 25) | corredor_estabulo u7-11 | ✓ |
| door_b03_north | portas norte/sul de 2,4 m (F4, p. 25) | 2,40 × 2,40 m, u 7,80…10,20 (corredor u7…11) | ✓ |
| door_b03_south | portas norte/sul de 2,4 m (F4, p. 25) | 2,40 × 2,40 m, u 7,80…10,20 (corredor u7…11) | ✓ |
| B03 janelas altas | pequenas janelas altas em ambas as fachadas longas, N e S (F4, p. 25) | win_b03_west_high (oeste; 1,20 m, peitoril 1,75), win_b03_north_high (norte; 1,20 m, peitoril 1,75), win_b03_south_high (sul; 1,20 m, peitoril 1,75) | ✓ |
| B03 acesso a arreios | acesso pequeno a arreios pelo leste, arrecadação a sudeste (F4, p. 25; F1 p. 23: porta pedonal 1,0 m) | portas B03: norte, sul, este; este: door_b03_east_tack (1,00 × 2,10 m, v = 9,50) | ✓ |
| door_b04_south | porta sul 1 m (F5, p. 25) | parede sul, u = 5,20, largura 1,00 m | ✓ |

## 4. Pontos de captura SN1–SN5: PDF ↔ layout ↔ `PANORAMA_VIEWS`

PDF: N p. 47 (planta) e N5 p. 49 (texto). Layout: `slicePanoramaPoints`. Código: `PANORAMA_VIEWS` em src/m02/m02-01-main.js (lido por análise de texto; o ficheiro usa `window`). Δ = distância horizontal ao PDF.

| Ponto | PDF (x; z) | Layout (x; z) | Δ layout (m) | main.js (x; z) | Δ main.js (m) | Rumo main.js (rad) | Cápsula livre em main.js? | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SN1 | 0,00; -80,00 | 0,00; -80,00 | 0,00 | 0,00; -80,00 | 0,00 | 1,571 | sim | ✓ |
| SN2 | -45,00; -5,00 | -45,00; -5,00 | 0,00 | -45,00; -5,00 | 0,00 | 0,250 | sim | ✓ |
| SN3 | -23,00; -12,00 | -23,00; -12,00 | 0,00 | -23,00; -12,00 | 0,00 | 3,142 | sim | ✓ |
| SN4 | 8,00; -28,00 | 8,00; -28,00 | 0,00 | 8,00; -28,00 | 0,00 | 0,000 | sim | ✓ |
| SN5 | 0,00; 45,00 | 0,00; 45,00 | 0,00 | 0,00; 45,00 | 0,00 | -1,571 | sim | ✓ |

## 5. Rotas percorridas pela cápsula e posição dos atores

Percurso com `movePlayer` (a mesma física da simulação), passos de 0,12 m, em pé, entre os pontos de cada rota do layout.

| Rota | Pontos (x; z) | Chega ao fim? | Cota mínima (m) | Observação |
| --- | --- | --- | --- | --- |
| ditch | 0; -80 → -45; -70 → -45; -5 → -24; 0 → -15; -8 → 0; -24 | sim | -1,10 | sem bloqueio |
| orchard | 0; -80 → 43; -55 → 43; 27 → 8; 42 → 0; 20 → 0; -24 | sim | -0,17 | sem bloqueio |

| Ator | Papel | (x; z) m | Dentro de sólido? |
| --- | --- | --- | --- |
| jogador (start) | início | 0,00; -80,00 | não |
| pl_gruca | PL leader | -1,80; -78,80 | não |
| pl_lis | PL assault_house | -4,20; -79,20 | não |
| pl_wierzba | PL flanker | 2,10; -78,90 | não |
| pl_malek | PL recruit | -6,00; -80,20 | não |
| pl_szymczak | PL medic | -3,20; -81,80 | não |
| pl_aux_01 | PL rkm_gunner | 1,40; -78,40 | não |
| pl_aux_02 | PL rkm_loader | 2,90; -79,80 | não |
| DE-A05 | EA1 mg_gunner (B02) | 13,20; -30,00 | não |
| DE-A06 | EA1 mg_loader (B02) | 15,20; -28,80 | não |
| DE-A07 | EA1 rifleman (B01) | -36,50; -15,50 | não |
| DE-A08 | EA1 rifleman (B01) | -28,50; -15,50 | não |
| DE-A09 | EA1 rifleman (B03) | 29,00; 2,20 | não |
| DE-A10 | EA1 rifleman (B03) | 29,00; 9,80 | não |
| DE-A11 | EA1 rifleman | -5,50; -22,50 | não |
| DE-A12 | EA1 reserve | -16,80; -4,60 | não |
| DE-A13 | EA1 reserve | -9,50; 18,20 | não |
| DE-A14 | EA1 rifleman_c04 | -5,50; 36,50 | não |
| DE-A01 | EA0 outpost_rifleman | -21,50; -110,20 | não |
| DE-A02 | EA0 outpost_rifleman | -18,00; -110,00 | não |
| DE-A03 | EA0 outpost_rifleman | -14,20; -110,40 | não |
| DE-A04 | EA0 outpost_rifleman | -11,00; -111,20 | não |

Contagem: 10 inimigos EA1 (PDF N1 p. 48: «dez defensores EA1» ✓), 4 EA0 em Z ≈ -110 (fora da Área A, Z -90…60; PDF N1: «o posto EA0 … fica fora deste ensaio»).

## 6. Lista de problemas

Gerada automaticamente: 0 ERRO, 1 AVISO, 3 INFO. ERRO = contradiz um critério verificável (colisão, largura, PDF); AVISO = a rever pelo Capitão; INFO = coerente com o PDF mas relevante para a captura/jogo.

| # | Sev. | Área | Elemento | Descrição |
| --- | --- | --- | --- | --- |
| 1 | AVISO | portão norte | northGate | `zones.northGate.width` = 3,20 m mas o vão entre os muros (cov_gate_wall_west / cov_gate_wall_east) é 3,60 m. |
| 2 | INFO | linha de tiro | win_b03_west_high | peitoril 1,75 m acima dos olhos em pé (1,64 m): sem linha de vista a um jogador em pé, mesmo aberta; coerente com PDF F4 p. 25 («sem atirar por uma janela alta incompatível»). |
| 3 | INFO | linha de tiro | win_b03_north_high | peitoril 1,75 m acima dos olhos em pé (1,64 m): sem linha de vista a um jogador em pé, mesmo aberta; coerente com PDF F4 p. 25 («sem atirar por uma janela alta incompatível»). |
| 4 | INFO | linha de tiro | win_b03_south_high | peitoril 1,75 m acima dos olhos em pé (1,64 m): sem linha de vista a um jogador em pé, mesmo aberta; coerente com PDF F4 p. 25 («sem atirar por uma janela alta incompatível»). |

Limites desta prova: geometria/colisão estática de cápsula e raios retos; não cobre IA, animação, portas a abrir com tempo, desempenho, aparência nem jogo real.

