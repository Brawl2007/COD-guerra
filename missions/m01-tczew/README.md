# M01 — Tczew, 1/9/1939 · "A Primeira Manhã"

**Estado da missão: PROTÓTIPO JOGÁVEL.** Os dados já são consumidos pelo runtime desta branch, com mapa próprio, wz.29 e CP-A..D. Percurso integral verificado na simulação; controlos, entrega e continuações de CP-D/outro verificados no navegador. Partida contínua, encenação/arte final e performance ainda pendentes; a missão não está VALIDADA.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| [`HISTORICAL_RESEARCH.md`](HISTORICAL_RESEARCH.md) | Cronologia do dia, forças, geografia, equipamento, divergências entre fontes, pendências P1–P16 com estado |
| [`SOURCE_CHECK.md`](SOURCE_CHECK.md) | Verificação de P1–P16: o que foi resolvido, com que fonte, o que falta e o que ler primeiro |
| [`MEASUREMENTS.md`](MEASUREMENTS.md) + [`measurements.json`](measurements.json) | Medições de pontes, pilares, rio, dique, linhas e estação (OSM via Overture, Copernicus DEM) e como reproduzi-las |
| [`CLAUDE_BRIDGE_TASK.md`](CLAUDE_BRIDGE_TASK.md) | Trabalho independente para Claude: kit modular das pontes, sem editar a engine |
| [`ASSETS.md`](ASSETS.md) + [`assets-m01.json`](assets-m01.json) | Lista de assets com dimensões reais, escala, licença, candidatos e política para repositório público |
| [`SCRIPT.md`](SCRIPT.md) | Roteiro completo: cenas, falas, atuação, set-pieces, checkpoints, skip, debrief, critérios de aceitação |
| [`BATTLEFIELD_EXPERIENCE.md`](BATTLEFIELD_EXPERIENCE.md) | Proposta de arquitectura da batalha ao redor: eventos autoritativos, eventos de apresentação e camadas ambiente; o que pode e não pode afectar o gameplay; tarefas `BX-00`–`BX-14` por impacto. Não implementada. |
| [`MAP.md`](MAP.md) + [`map-layout.svg`](map-layout.svg) | Sistema de coordenadas, EXACT/RECONSTRUCTED/COMPRESSED, setores, rota, limites, cobertura, luz e som |
| [`mission.json`](mission.json) | Dados da missão com IDs estáveis: objetivos, eventos, relógio, setores, checkpoints, cenas, falas, debrief |
| [`ENGINE_CONTRACT.md`](ENGINE_CONTRACT.md) | Semântica de gates, tempos, snapshots reais, segurança e campos ainda descritivos |
| [`map-layout.json`](map-layout.json) | Geometria em metros: pontes, pilares, torres, aterro, linha de ignição, cobertura, zonas de demolição, rota dos Stukas |
| [`tools/render-map-svg.mjs`](tools/render-map-svg.mjs) | Regenera o SVG a partir do JSON |
| [`tools/measure_osm_overture.py`](tools/measure_osm_overture.py) | Refaz as medições (Python: `pyarrow`, `shapely`; `rasterio` opcional) |
| [`../../research/weapons/kb_wz29.md`](../../research/weapons/kb_wz29.md) + [`kb_wz29.profile.json`](../../research/weapons/kb_wz29.profile.json) | Ficha do wz.29: dados documentados, regras de comportamento, modelo, animações, som e perfil data-driven |
| [`../../research/SOURCES.md`](../../research/SOURCES.md) | Fontes (H01–H30 do prompt, T01–T30 complementares, G01–G02 geodados, cálculos C01–C02) |
| [`../../research/equipment-timeline.json`](../../research/equipment-timeline.json) | Equipamento por país e data, incluindo os proibidos em 1939 |
| [`../../STORY_BIBLE.md`](../../STORY_BIBLE.md) | Elenco e arcos de M01; índice dos demais pontos de vista |
| [`../../tests/m01-tczew-data.test.js`](../../tests/m01-tczew-data.test.js) | Validação automática dos dados (não substitui playtest) |

## Comandos

```bash
npm test                                          # inclui a validação dos dados de M01
node --test tests/m01-tczew-data.test.js          # só M01
node missions/m01-tczew/tools/render-map-svg.mjs  # regenera o diagrama do mapa
python3 missions/m01-tczew/tools/measure_osm_overture.py --dem  # refaz measurements.json
```

## Integração com a engine (para quem está na engine, no combate e nos checkpoints)

A entrega original de pesquisa/preparação preservou `src/`. A integração agora vive em `M01Simulation`, `TczewWorld`, `Wz29` e `M01View`, no mesmo `Game` e loop da bancada. O contrato permanece:

1. **Coordenadas.** Metros, X leste, Y altura, Z sul (norte = −Z). Ver `map-layout.json → coordinateSystem`. O `y` do protótipo antigo é planar, não altura.
2. **Relógio de batalha.** Use `mission.json → clock.segments`: escala por segmento, *snap* ao entregar a mensagem e *gates* segurando o relógio até a prontidão. Pausa e menus suspendem.
3. **Eventos.** Todos têm `id`, `trigger`, `results`, `idempotent` e `persist`; `readiness` e `tolerance` são opcionais. Tipos de gatilho estão documentados em `SCRIPT.md` §12. Condições e efeitos escritos em prosa requerem handlers, conforme `ENGINE_CONTRACT.md`.
4. **Checkpoints.** `restore` lista eventos consumidos, objetivos, atores, destruição, setores e flags; `neverSaveIf` diz quando não salvar. O save guarda dados, nunca objetos Three.js (Prompt §70).
5. **Setores.** Cinco setores com agenda própria (`sectors[].schedule`), independentes do jogador. As baixas de S2 são por ID e persistem entre LODs.
6. **Arma do jogador.** `kb_wz29`: 5 cartuchos, clipe, ferrolho após cada disparo. Alça ajustável recomendada (combate de 150 a ~1100 m). Ficha completa em `research/weapons/kb_wz29.md`. **Não reaproveitar a M1 Carbine.**
7. **Falas.** `dialogue[].id` é a chave de legenda e áudio. Callouts só tocam com o evento real.
8. **Segurança do jogador.** Bombas nunca caem a menos de 30 m do jogador; as demolições polonesas nunca o matam; nenhuma parede invisível sem aviso.

## Decisões históricas que a engine precisa respeitar

- **Não há combate de infantaria alemã na margem oeste pela manhã.** Nenhuma fonte o apoia. O combate de M01 é de média e longa distância (tabuleiro e margem leste), mais o perigo do bombardeio e da demolição.
- Sem M1 Carbine, MP40 ou MG42. MP38 não é arma padrão dos inimigos de M01.
- Pessoas históricas não falam em cena.
- Não afirmar "o primeiro ataque da Segunda Guerra".

## O que falta

- **Verificações específicas:** H01-PDF, H02, H30 e T23 foram lidas; dúvidas remanescentes estão em `SOURCE_CHECK.md`. A leitura não comprova números de perdas do pelotão nem transforma geografia moderna em mapa de 1939.
- **Mapa de 1939** (P4): traçado das vias, contorno da estação, quartel e postos de disparo. Pilares, eixos, rio e dique já foram medidos (P5 resolvida).
- **Assets:** pontes GLB provisórias do Claude com LODs/dano revistos; restantes actores, arma, comboios e aviões são placeholders próprios. Lista, escalas, política de licença e incertezas em `ASSETS.md`, `BRIDGE_ASSET_REPORT.md` e `../../ASSET_CREDITS.md`.
- **Playtest contínuo, direcção humana, navegação/encenação completas e validação** (Marco 2 do Prompt §77). Ver `../../QUALITY_REPORT.md` para distinguir provas de simulação e de navegador.
