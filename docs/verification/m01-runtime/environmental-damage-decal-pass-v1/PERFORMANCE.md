# Performance — danos ambientais M01

Build de produção (`npm run preview`), Chromium headless com ANGLE/SwiftShader, 1280×720, qualidade Alta, as mesmas vistas e estados de `tests/browser/m01-damage-decals.spec.js` (BEFORE = ganchos da base `99309d9`). São contadores de carga do renderer (`renderer.info`) e tempos de CPU do módulo, **não FPS**, nem medições de GPU ou de Chromebook.

## Orçamento declarado (`M01_DAMAGE_DECAL_LIMITS`)

| Qualidade | Marcas | Detritos | Brasas | Alcance | Cluster |
|---|---:|---:|---:|---:|---:|
| low | 48 | 64 | 0 | 55 m | 4 |
| medium | 96 | 128 | 24 | 90 m | 5 |
| high | 144 | 192 | 40 | 130 m | 6 |

Global: 16 explosões, 6000 triângulos de resíduo, até **4 draw calls** e **2 texturas** (atlas de cor 512×256 RGBA + altura 512×256 R8; cerca de 0,9 MB em GPU com mipmaps). Pools instanced alocados uma vez para Alta (144/192/40). Sem luzes, render targets, colliders ou sombras projectadas novas.

## Contadores do renderer, BEFORE → AFTER

| Vista (Alta) | Draw calls BEFORE → AFTER | Triângulos BEFORE → AFTER | Texturas | Geometrias | Marcas | Resíduo (tri) | Detritos | Brasas |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| portal-brick | 174 → 178 | 389.017 → 389.087 (+0.02 %) | 110 → 112 | 251 → 255 | 4 | 0 | 2 | 0 |
| track-bed | 137 → 139 | 413.367 → 413.435 (+0.02 %) | 107 → 109 | 226 → 230 | 4 | 0 | 3 | 0 |
| repair-crater | 359 → 359 | 777.285 → 779.842 (+0.33 %) | 110 → 112 | 270 → 274 | 0 | 659 | 121 | 0 |
| station-facade | 215 → 217 | 654.408 → 657.487 (+0.47 %) | 124 → 126 | 256 → 260 | 0 | 659 | 121 | 0 |
| east-deck-end | 210 → 212 | 698.122 → 701.201 (+0.44 %) | 62 → 64 | 327 → 331 | 0 | 659 | 121 | 0 |
| west-bridgehead | 319 → 319 | 750.271 → 753.164 (+0.39 %) | 110 → 112 | 284 → 288 | 0 | 1235 | 134 | 10 |

Os decals acrescentam no máximo 4 draw calls (marcas, resíduo, detritos, brasas), +2 texturas e +4 geometrias. Os seus próprios triângulos, pelos diagnósticos (resíduo + 20 por detrito + 2 por marca/brasa), vão de 48 a 3.935 nestas vistas, 0,01 % a 0,52 % dos triângulos do frame AFTER. As diferenças totais do frame (0 a +4 draw calls, +0,02 % a +0,47 % de triângulos) incluem também variação de conteúdo entre as continuações BEFORE e AFTER (NPC, FX, frames diferentes).

## CPU do módulo nas rotas reais (Node, esta máquina)

`node tools/verification/m01-damage-decals-cpu.mjs <support|nosupport> <low|medium|high>` alimenta o módulo com os eventos da própria rota completa (sem renderer). Todas as árvores sólidas contam como LOD próximo (pior caso para marcas em casca).

| Rota / qualidade | impact() mediana / p99 / máx (ms) | update() mediana / p99 / máx (ms) | reconstruções do resíduo: n, mediana / máx (ms) | Pico marcas / detritos / brasas / tri resíduo | colocadas / sem superfície / fora de alcance / expiradas |
|---|---|---|---|---|---|
| no-support / high | 0.0697 / 0.396 / 1.561 | 0.0166 / 0.0945 / 3.498 | 7, 3.4947 / 21.051 | 122 / 139 / 17 / 1235 | 357 / 175 / 291 / 328 |
| no-support / low | 0.064 / 0.4837 / 1.503 | 0.0094 / 0.084 / 2.031 | 7, 4.349 / 17.377 | 48 / 63 / 0 / 1235 | 239 / 174 / 413 / 76 |
| no-support / medium | 0.0553 / 0.49 / 3.031 | 0.0141 / 0.0771 / 1.707 | 7, 4.2329 / 14.304 | 96 / 127 / 17 / 1235 | 297 / 174 / 352 / 226 |
| support / high | 0.0498 / 0.7243 / 0.868 | 0.0114 / 0.0854 / 3.623 | 7, 4.4508 / 14.431 | 26 / 134 / 17 / 1241 | 68 / 142 / 52 / 68 |
| support / low | 0.0457 / 0.6461 / 0.895 | 0.008 / 0.0578 / 2.142 | 7, 3.2581 / 15.395 | 18 / 62 / 0 / 1241 | 45 / 142 / 75 / 45 |
| support / medium | 0.0424 / 0.6222 / 0.769 | 0.0097 / 0.0711 / 4.527 | 7, 4.4293 / 17.834 | 23 / 107 / 17 / 1241 | 59 / 142 / 61 / 59 |

- `impact()` por evento: mediana 0,04–0,07 ms, p99 abaixo de 0,75 ms, máximo 0,8–3 ms.
- `update()` por frame, sem reconstrução: mediana de 0,01–0,02 ms, p99 abaixo de 0,1 ms; máximos isolados de 1,7–4,5 ms (picos pontuais em mais de 20 000 chamadas por rota; a causa não foi isolada).
- Reconstrução do resíduo: 7 por rota (a construção inicial, vazia, e uma por cada uma das 6 explosões gravadas), mediana 3–4,5 ms, máximo 14–21 ms quando já há várias explosões e entra uma demolição. Acontece no frame da explosão ou ao restaurar.
- Atlas procedural: cerca de 0,36 s de CPU no total, pintado em 64 fatias (mediana cerca de 5 ms) por temporizador a partir da criação da vista M01; não bloqueia o construtor. Os testes de browser esperam por ele no menu antes de continuar.

## Diagnóstico do teste `m01-battlefield-fx` que expirou no CI

O teste existente "real in-flight round…" captura o jogo a correr em Alta logo depois de um impacto real, com `page.screenshot` limitado a 30 s. Expirou no run `37720348114` (`b084bba`, branch `codex/…`) e nos dois runs de `f745952` (`37759525691` e `37759527952`); passou nos outros três runs concluídos deste workflow.

Causa medida ([logs/session-probes.txt](logs/session-probes.txt), entradas 7 e 8): este passe dá às balas alemãs que acertam em madeira ou pedra desenhadas o FX da superfície, com lascas. O lote de lascas do `M01View` só ganhava `instanceColor` na primeira lasca; o three.js muda então o programa da malha e, em WebGL por software, o primeiro desenho constrói um pipeline novo. Sonda A/B no estado exacto do teste (produção, Chromium/SwiftShader preso a 2 núcleos, 6 capturas de cada lado): base 8,6–9,9 s (mediana 9,2 s), candidato 9,2–16,3 s (mediana 11,4 s), intervalo mediano entre frames (só intervalos acima de 1 s) 2,28 s contra 2,42 s. Instrumentada: em cada captura do candidato foi ligado um programa novo `MeshStandardMaterial` com `USE_INSTANCING_COLOR` 8,6–9,5 s depois do impacto, num frame de 6,4–6,6 s de CPU; a base não liga nenhum programa depois do impacto. Nos runners do CI, mais lentos, esse frame cai dentro da janela de 30 s da captura.

Correcção: o lote de lascas tem cores de instância desde a construção e é desenhado uma vez, sem píxeis, no primeiro frame, junto com o aquecimento dos decals. Na mesma sonda depois da correcção: 9,5–9,7 s, nenhum programa novo nem frame longo de CPU depois do impacto (entrada 9). A hipótese anterior (pipeline das marcas no primeiro impacto), tratada em `61db784`, não era a causa: as malhas do módulo já estavam aquecidas.

A base tem a mesma paragem latente na primeira lasca de uma sessão (quando a simulação reporta madeira ou pedra) e, nas explosões, no lote `battlefieldShards`, cujas cores de instância também nascem no primeiro uso. A primeira fica resolvida por esta correcção; a segunda fica fora deste passe.
