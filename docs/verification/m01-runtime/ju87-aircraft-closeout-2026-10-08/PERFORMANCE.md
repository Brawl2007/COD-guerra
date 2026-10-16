# Performance — contadores do renderer

Build de produção, viewport 1280×720, Chromium headless com ANGLE/SwiftShader, mesmas capturas de [BEFORE_AFTER.md](BEFORE_AFTER.md). Os valores são `renderer.info` do frame pausado (`gameDiagnostics().drawCalls/triangles/geometries/textures`, cena principal e passagem da arma). **Não são FPS**, nem medição num Chromebook físico.

| Captura | Qualidade | Draw calls BASE → CANDIDATA | Triângulos BASE → CANDIDATA | Geometrias | Texturas | Par |
|---|---|---:|---:|---:|---:|---|
| raid-low-t30 | low | 144 → 150 | 367909 → 368788 (+0.24 %) | 212 → 223 | 108 → 113 | [PAIR-raid-low-t30.png](pairs/PAIR-raid-low-t30.png) |
| raid-high-t30 | high | 154 → 160 | 438817 → 440698 (+0.43 %) | 219 → 236 | 109 → 114 | [PAIR-raid-high-t30.png](pairs/PAIR-raid-high-t30.png) |
| raid-low | low | 159 → 161 | 384985 → 385278 (+0.08 %) | 212 → 223 | 108 → 113 | [PAIR-raid-low.png](pairs/PAIR-raid-low.png) |
| raid-medium | medium | 168 → 170 | 431398 → 432025 (+0.15 %) | 218 → 229 | 109 → 114 | [PAIR-raid-medium.png](pairs/PAIR-raid-medium.png) |
| raid-high | high | 173 → 175 | 450261 → 450888 (+0.14 %) | 219 → 236 | 109 → 114 | [PAIR-raid-high.png](pairs/PAIR-raid-high.png) |

## Leitura

- **Draw calls:** +2 por Ju 87 dentro do frustum (vidro da capota e disco da hélice). A +4 s só o avião visado está no ecrã (+2); a +30 s estão os três (+6). O disco de dupla face é desenhado numa só passagem (`forceSinglePass`); sem isso eram +3 por avião (medido numa captura anterior: 144 → 153 e 154 → 163 a +30 s).
- **Triângulos:** +0,08 % a +0,43 % do frame (LOD2: 1 929 contra 1 636; LOD1: 5 357 contra 4 730 por avião).
- **Texturas (`renderer.info.memory.textures`, texturas na GPU):** +5 nas três qualidades. Entram a textura do disco, o céu de ambiente e os alvos do seu PMREM, e o ORM do LOD2 (Baixa) ou o mapa de normais do LOD1 (Média/Alta). As texturas do LOD0 nunca chegam à GPU no caminho actual, porque o LOD0 nunca é seleccionado.
- **Geometrias:** +11 a +17 (malhas novas `canopy`/`propeller_disc` e os clones por nível).
- **Materiais:** um clone leve por avião × nível × material (27 instâncias, 4 programas: `ju87_b1` com e sem mapa de normais, vidro, disco). Os programas e o PMREM são preparados com `compileAsync` ao carregar, antes do primeiro frame do raid.
- **Download:** LOD0/1/2 = 922/359/136 kB (antes 652/248/96 kB). Os três LOD continuam a ser descarregados em qualquer qualidade, como antes; o LOD0 (~24 MB de texturas descodificadas) nunca aparece no caminho actual. Carregá-lo só quando for necessário é o próximo passo recomendado para memória.
