# M01 — Tczew, 1/9/1939 · "A Primeira Manhã"

**Estado da missão: PLANEJADA.** Pesquisa, mapa, roteiro e dados estão prontos para integração. Nada disto é jogável até a engine consumir os dados (Prompt §58, §62).

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| [`HISTORICAL_RESEARCH.md`](HISTORICAL_RESEARCH.md) | Cronologia do dia, forças, geografia, equipamento, divergências entre fontes, pendências P1–P12 |
| [`SCRIPT.md`](SCRIPT.md) | Roteiro completo: cenas, falas, atuação, set-pieces, checkpoints, skip, debrief, critérios de aceitação |
| [`MAP.md`](MAP.md) + [`map-layout.svg`](map-layout.svg) | Sistema de coordenadas, EXACT/RECONSTRUCTED/COMPRESSED, setores, rota, limites, cobertura, luz e som |
| [`mission.json`](mission.json) | Dados da missão com IDs estáveis: objetivos, eventos, relógio, setores, checkpoints, cenas, falas, debrief |
| [`ENGINE_CONTRACT.md`](ENGINE_CONTRACT.md) | Semântica de gates, tempos, snapshots reais, segurança e campos ainda descritivos |
| [`map-layout.json`](map-layout.json) | Geometria em metros: pontes, pilares, torres, aterro, linha de ignição, cobertura, zonas de demolição, rota dos Stukas |
| [`tools/render-map-svg.mjs`](tools/render-map-svg.mjs) | Regenera o SVG a partir do JSON |
| [`../../research/SOURCES.md`](../../research/SOURCES.md) | Fontes (H01–H30 do prompt, T01–T19 complementares, cálculos C01–C02) |
| [`../../research/equipment-timeline.json`](../../research/equipment-timeline.json) | Equipamento por país e data, incluindo os proibidos em 1939 |
| [`../../STORY_BIBLE.md`](../../STORY_BIBLE.md) | Elenco e arcos de M01; índice dos demais pontos de vista |
| [`../../tests/m01-tczew-data.test.js`](../../tests/m01-tczew-data.test.js) | Validação automática dos dados (não substitui playtest) |

## Comandos

```bash
npm test                                          # inclui a validação dos dados de M01
node --test tests/m01-tczew-data.test.js          # só M01
node missions/m01-tczew/tools/render-map-svg.mjs  # regenera o diagrama do mapa
```

## Integração com a engine (para quem está na engine, no combate e nos checkpoints)

Este pacote não altera `src/`. Pontos de encaixe sugeridos, sem impor arquitetura:

1. **Coordenadas.** Metros, X leste, Y altura, Z sul (norte = −Z). Ver `map-layout.json → coordinateSystem`. O `y` do protótipo antigo é planar, não altura.
2. **Relógio de batalha.** Use `mission.json → clock.segments`: escala por segmento, *snap* ao entregar a mensagem e *gates* segurando o relógio até a prontidão. Pausa e menus suspendem.
3. **Eventos.** Todos têm `id`, `trigger`, `results`, `idempotent` e `persist`; `readiness` e `tolerance` são opcionais. Tipos de gatilho estão documentados em `SCRIPT.md` §12. Condições e efeitos escritos em prosa requerem handlers, conforme `ENGINE_CONTRACT.md`.
4. **Checkpoints.** `restore` lista eventos consumidos, objetivos, atores, destruição, setores e flags; `neverSaveIf` diz quando não salvar. O save guarda dados, nunca objetos Three.js (Prompt §70).
5. **Setores.** Cinco setores com agenda própria (`sectors[].schedule`), independentes do jogador. As baixas de S2 são por ID e persistem entre LODs.
6. **Arma do jogador.** `kb_wz29`: 5 cartuchos, clipe, ferrolho após cada disparo. Alça ajustável recomendada (combate de 150 a 850 m). **Não reaproveitar a M1 Carbine.**
7. **Falas.** `dialogue[].id` é a chave de legenda e áudio. Callouts só tocam com o evento real.
8. **Segurança do jogador.** Bombas nunca caem a menos de 30 m do jogador; as demolições polonesas nunca o matam; nenhuma parede invisível sem aviso.

## Decisões históricas que a engine precisa respeitar

- **Não há combate de infantaria alemã na margem oeste pela manhã.** Nenhuma fonte o apoia. O combate de M01 é de média e longa distância (tabuleiro e margem leste), mais o perigo do bombardeio e da demolição.
- Sem M1 Carbine, MP40 ou MG42. MP38 não é arma padrão dos inimigos de M01.
- Pessoas históricas não falam em cena.
- Não afirmar "o primeiro ataque da Segunda Guerra".

## O que falta

- **Leitura integral das fontes.** A pesquisa original usou resumos de busca. A revisão leu H02 e trechos de H01-PDF, registando divergências; P1–P12 continuam em `HISTORICAL_RESEARCH.md` §11.
- **Medições cartográficas** (P4, P5) para substituir as posições `RECONSTRUCTED`.
- **Assets:** modelos das pontes com torres, trens, uniformes de 1939, Ju 87 e som do wz.29. Documentar em `assets-needed.md` quando a integração começar.
- **Integração, playtest e validação** (Marco 2 do Prompt §77).
