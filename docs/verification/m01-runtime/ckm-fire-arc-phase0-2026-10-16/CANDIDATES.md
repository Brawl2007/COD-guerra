# T47 fase 0b — postos candidatos da ckm na cabeça de ponte oeste

Data: 2026-10-16. Só leitura: nada em `src/`, `missions/`, `assets/` ou `tools/assets/` foi alterado. Ferramenta: `tools/m01-ckm-fire-arc.mjs --candidates` (funções `collectWindowTargets`, `evaluateCandidate`, `describeCandidate`, `candidateReport`). Testes: `tests/m01-ckm-candidate-posts.test.js` (2). Grelha completa: `candidates-grid.csv` (1027 linhas).
Contexto: `REPORT.md` (a seteira da casamata, boca em (25; -2,36; 43), não vê nenhum alemão).

## Método

- Mesma LOS de produção do fogo da MG34: `world.obstacles` (`rayBox`) + `world.traceTerrain`/`heightAt` (equivale a `traceObstruction`/`world.lineOfSight`). Mundo vivo de cada amostra (eventos e flags da simulação reconstruídos em `TczewWorld`).
- Janela: rota completa `route(19390901)`, 1 amostra/s, **só antes de `evt_m01_east_demolition`** (ckm em posição): 787 amostras, 21 600 amostras de inimigo, 848 tuplos únicos (mundo, actor, olho). Fases: `repair` (objectivo `cover_repair` activo, 7680 amostras, 40 actores), `post_repair` (reparação feita, antes de `germans_on_east_spans`; 11 920; 40), `withdrawal` (alemães nos vãos; 2000; 50). `pre_repair`: 0 amostras (nenhum inimigo activo).
- Boca: `heightAt(x,z)` de produção + 0,7 m (chão = terreno; seteira ao nível do chão + 0,7). Contagens iguais para 0,6 e 0,9 m (testado).
- **Estrito** = a linha de produção livre **e** sem entrar em nenhum collider de ponte vivo (treliças `partialCover`, pilares, torres, caixas walkable). A produção ignora as treliças (8,68 m de altura) para balas; o estrito não: "o fogo não atravessa a ponte". `Gap` = menor distância 3D do raio a qualquer collider; `folga ao tabuleiro` = altura mínima do raio sobre a pegada de um tabuleiro/junta.
- Exclusões da grelha (x -40..10, z -20..60, passo 2 m = 1066 pontos): 36 dentro de collider/portal/caixa da casamata (3D, no solo e na boca), 3 sobre tabuleiros (`bridge-deck`), 0 em água/fora de terreno (x ≤ 10 é todo terra). Ficam 1027.

## Resultado global (grelha, estrito)

- Baseline **C0** (seteira actual): 0 alemães em todas as fases (bloqueio: `road_collider_deck_span_01` 15 120 e `road_collider_pier_01` 6480 amostras), igual ao REPORT.
- 686/1027 pontos veem pelo menos 1 alemão; nenhum vê mais de 14 em simultâneo. Dentro de 30 m da casamata: 504 pontos, 404 com linha, 100 sem nenhuma; 198 veem os 14 homens do portão, 60 veem os 10 dos vãos (só em `withdrawal`).
- Os alemães visíveis dividem-se em 3 conjuntos disjuntos: **portão** `de_east_0..13` (x 1053-1057, z 9,5-32; inclui os dois MG34), **reserva norte** `de_east_14..27` (x 1076-1097, z -80..-15), **reserva sul** `de_east_28..39` (x 1076-1094, z 52-96), e **vãos** `de_spans_0..9` (tabuleiro rodoviário, z 39,6-41,8, y olho 1,64; só em `withdrawal`). Nenhum ponto vê portão + vãos.
- 201 dos 504 pontos próximos dependiam de raios que a produção deixa passar através de treliças; o estrito elimina-os.

## Lista curta (todos a ≤ 8 m da caixa da casamata; nenhum sobre tabuleiro)

Azimute: 0° = +X (este), positivo para +Z (sul). Todos os alvos estão a ~1,05 km: os raios são quase horizontais (elevação -0,02°..+0,34°).

| ID | (x, z) | Local | y chão | y boca | repair / post_repair / withdrawal (actores estritos) | Dist. casamata |
|---|---|---|---|---|---|---|
| S1 | (8, 30) | topo do encontro, bordo norte (0,5 m dentro de z 29,5) | -0,35 | 0,35 | 14 / 14 / 14 (`de_east_0..13`) | 4 m |
| S2 | (8, 26) | aterro/planície entre as duas pontes | -3 | -2,3 | 14 / 14 / 14 (`de_east_0..13`) | 8 m |
| S3 | (8, 40) | topo do encontro, eixo da estrada | -0,35 | 0,35 | 0 / 0 / 10 (`de_spans_0..9`) | 0 m |
| S4 | (8, 54) | flanco sul da ponte rodoviária | -3 | -2,3 | 12 / 12 / 12 (`de_east_28..39`, reserva sul) | 8 m |

Amostras estritas por fase (repair / post_repair / withdrawal): S1 2687 / 4172 / 560; S2 2688 / 4172 / 560; S3 0 / 0 / 358; S4 2304 / 3576 / 480.

### S1 — encontro, bordo norte (recomendado se se quiser ficar na cabeça da ponte)
- Vê os 14 do portão (todos, incluindo MG34). Produção deixaria passar 28 actores, mas 126 tuplos atravessam treliças `rail_collider_truss_S_span_02..05`/`N_span_03` (descartados); estrito 213/339 tuplos.
- Cortes do resto (censo de produção): `road_collider_tower_01_n` 5010 amostras, `tower_02_s` 1590, `tower_02_n` 160, `tower_05_n` 1. Folga: **gap mínimo 0,04 m** (o raio para `de_east_0` raspa `road_collider_tower_05_n`, z 31,35); frágil a qualquer mudança de 5 cm. Sem sobreposição com tabuleiros.
- Direcção da seteira: azimute -0,52° ao centro dos fuzileiros (-1,12° a +0,08°), elevação -0,015°..+0,037°; 1045-1049 m. Praticamente +X puro, igual à seteira actual.

### S2 — aterro entre as pontes (mais limpo)
- Mesmos 14 actores; produção == estrito (214 tuplos), 0 raios por estrutura, **gap mínimo 0,98 m**. Sem sobreposição com tabuleiros (raio a z 26→9,5-32, fora das pegadas).
- Cortes: `road_collider_pier_01` 4240, `pier_02` 2120, `rail_collider_deck_span_02/03/04/05` 2120/1590/530/530, `rail pier_02/03` 1590/1060, torres 03_n/04_n 267/133 (reserva e vãos).
- Azimute -0,30° (-0,90° a +0,30°), elevação +0,13°..+0,18°. É terreno aberto a 3 m abaixo do topo do encontro: exige abrigo/trincheira novos (fora da casamata).

### S3 — eixo da estrada sobre o encontro (vãos)
- Só vê os 10 alemães dos vãos, e só em `withdrawal` (358 das 400 amostras). Fogo ao longo da faixa de rodagem entre treliças, **0,351 m acima do tabuleiro** (folga ao tabuleiro; gap 0,35 m). 90 tuplos adicionais atravessam `rail_collider_truss_S_span_03/04`, `N_span_04` (descartados).
- Cortes: torres `01_n/01_s` (4240 cada), `02_n/02_s`, `03_*`, `04_n`; `COL_portal_lisewo_1912` 42 (portal do outro lado).
- Azimute -0,02°..+0,10°, elevação +0,07°; 983-1051 m. Está sobre a rota do jogador (-10,40 → 30,40) e sobre a estrada: aceitável só como posto secundário; não cobre o portão.

### S4 — flanco sul (cobre só a reserva)
- Vê `de_east_28..39` (12) em todas as fases; **não** vê o portão (cortado por `pier_01` 5300, `deck_span_01` 4770, `pier_02` 4770). 0 raios por estrutura, gap 3,5 m. Azimute -0,11°..+2,24°, elevação +0,16°; 1068-1087 m. Não cumpre o critério (1) para o portão/vãos; fica só como alternativa para a reserva.

## Recomendação e incertezas

- **S1 e S2 são os únicos que dão linha estrita ao portão durante toda a janela com a ckm em posição.** S2 é geometricamente mais seguro (gap 0,98 m, sem depender de rasar a torre 05); S1 mantém o posto no encontro (4 m da casamata, "bunker na cabeça de ponte oeste") mas com margem de 4 cm a `tower_05_n`. Nenhuma linha atravessa o tabuleiro: o fogo passa em corredor lateral aberto.
- Sem posto que cubra portão e vãos. Todos os vãos exigiriam fogo ao longo do eixo (S3).
- Não é prova histórica de P12 (posição exacta continua aberta). O mapa não define abertura; qualquer posto novo precisa de `CKM_POSITION`/`cv_casemate_emb_s` e re-baseline do golden (ver REPORT.md, opção c).
- Alvos tratados por um único ponto (olho de produção) e por amostras de 1 s; distâncias de 1,05 km podem exceder o alcance prático da ckm: conferir o perfil na fase 1. Não é playtest nem medição de FPS.

## Reprodução

```
node tools/m01-ckm-fire-arc.mjs --candidates --out-csv docs/verification/m01-runtime/ckm-fire-arc-phase0-2026-10-16/candidates-grid.csv --out-json <json>   # ~75 s
node --test tests/m01-ckm-candidate-posts.test.js
```
CSV: `x,z,groundY,muzzleY,distCasemateM,azCentreDeg,prodClear*,strictClear*,strictRepair*,strictWithdrawal*,throughBridgeEntries,minDeckClearanceM,minTargetDistM,maxTargetDistM`.
