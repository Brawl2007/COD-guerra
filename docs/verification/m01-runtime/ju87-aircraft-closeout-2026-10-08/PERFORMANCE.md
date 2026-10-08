# Performance — contadores do renderer

Build de produção, viewport 1280×720, Chromium headless com ANGLE/SwiftShader, mesmas capturas de [BEFORE_AFTER.md](BEFORE_AFTER.md). Os valores são `renderer.info` do frame pausado (`gameDiagnostics().drawCalls/triangles/geometries/textures`, cena principal e passagem da arma). **Não são FPS**, nem medição num Chromebook físico.

| Captura | Qualidade | Draw calls BASE → CANDIDATA | Triângulos BASE → CANDIDATA | Geometrias | Texturas | Par |
|---|---|---:|---:|---:|---:|---|
| raid-low-t30 | low | 144 → 150 | 367909 → 368788 (+0.24 %) | 212 → 223 | 108 → 113 | [PAIR-raid-low-t30.png](pairs/PAIR-raid-low-t30.png) |
| raid-high-t30 | high | 154 → 160 | 438817 → 440698 (+0.43 %) | 219 → 230 | 109 → 114 | [PAIR-raid-high-t30.png](pairs/PAIR-raid-high-t30.png) |
| raid-low | low | 159 → 161 | 384985 → 385278 (+0.08 %) | 212 → 223 | 108 → 113 | [PAIR-raid-low.png](pairs/PAIR-raid-low.png) |
| raid-medium | medium | 168 → 170 | 431398 → 432025 (+0.15 %) | 218 → 229 | 109 → 114 | [PAIR-raid-medium.png](pairs/PAIR-raid-medium.png) |
| raid-high | high | 173 → 175 | 450261 → 450888 (+0.14 %) | 219 → 230 | 109 → 114 | [PAIR-raid-high.png](pairs/PAIR-raid-high.png) |

## Leitura

- **Draw calls:** +2 por Ju 87 dentro do frustum (vidro da capota e disco da hélice). A +4 s só o avião visado está no ecrã (+2); a +30 s estão os três (+6). O disco de dupla face é desenhado numa só passagem (`forceSinglePass`); sem isso o three.js desenha materiais transparentes de dupla face em duas passagens (+3 por avião).
- **Triângulos:** +0,08 % a +0,43 % do frame (LOD2: 1 929 contra 1 636; LOD1: 5 357 contra 4 730 por avião).
- **Texturas (`renderer.info.memory.textures`, texturas na GPU):** +5 nas três qualidades. Entram a textura do disco, o céu de ambiente e os alvos do seu PMREM, e o ORM do LOD2 (Baixa) ou o mapa de normais do LOD1 (Média/Alta). As texturas do LOD0 nunca chegam à GPU no caminho actual, porque o LOD0 nunca é seleccionado.
- **Geometrias:** +11 em todas as qualidades: 9 planos internos do PMREM do céu de ambiente (three.js r186) e as 2 malhas novas (`canopy`, `propeller_disc`); os clones por nível partilham a geometria. As +6 adicionais em Média/Alta que o verificador independente encontrou vinham do warm-up de shaders, entretanto retirado (ver abaixo).
- **Materiais:** um clone leve por avião × nível × material (27 instâncias, até 4 programas: `ju87_b1` com e sem mapa de normais, vidro, disco), compilados no primeiro uso como na base.
- **Download:** LOD0/1/2 = 922/359/136 kB (antes 652/248/96 kB). Os três LOD continuam a ser descarregados em qualquer qualidade, como antes; o LOD0 (~24 MB de texturas descodificadas) nunca aparece no caminho actual. Carregá-lo só quando for necessário é o próximo passo recomendado para memória.

## Custo de carregamento e primeiro frame do raid

[`tools/verification/m01-ju87-load-longtasks.mjs`](../../../../tools/verification/m01-ju87-load-longtasks.mjs) mede, no build de produção, as tarefas longas (`PerformanceObserver('longtask')`) desde a abertura da página até 4 s depois de os três LOD do Ju 87 estarem carregados (menu). Com `MODE=raid`, carrega também o snapshot genuíno do início do raid com **Continuar** e mede, nos 8 s seguintes, as tarefas longas e o intervalo entre frames (`requestAnimationFrame`). Chromium/SwiftShader, Baixa; não é Chromebook nem FPS de hardware.

| Build (Baixa, 3 repetições) | Tarefas longas no carregamento | Início do raid: tarefas longas | Início do raid: intervalo entre frames (mediana / máximo) |
|---|---:|---:|---:|
| BASE `99309d9` | 4,0–4,4 s | 0–81 ms | ~0,70–0,77 s / 1,08–1,48 s |
| Candidata com warm-up (`compileAsync` ao carregar) | 5,9–6,4 s | 0–61 ms | ~0,68–0,78 s / 0,95–1,17 s |
| Candidata sem warm-up (código equivalente ao runtime final) | 4,4–4,7 s | 0–57 ms | ~0,75–0,77 s / 0,92–1,20 s |

Fonte: [logs/raid-start-frames.log](logs/raid-start-frames.log); corridas anteriores com o mesmo método em [logs/load-longtasks.log](logs/load-longtasks.log) (base 5,85–6,31 s contra 8,2–9,0 s com warm-up) e [logs/raid-start-longtasks.log](logs/raid-start-longtasks.log). O warm-up acrescentava uma tarefa longa de ~1,5–2 s ao carregamento sem melhoria mensurável no primeiro frame dos aviões, por isso foi retirado: o runtime final compila no primeiro uso, como a base, e custa ~0,3–0,5 s a mais no carregamento (GLB e texturas maiores). O efeito da compilação de shaders num GPU real fica por medir num Chromebook.

## Cenas sem Ju 87 visível

O mesmo script, com `MODE=cover` e `MODE=repair`, usa os snapshots de dois testes de navegador: "adjustment salvo at the gates" e "German fire on the repair". Nestas cenas, depois das 04:40:00, os Ju 87 já não estão visíveis. Medi o intervalo entre frames e o relógio da missão nos 8 s seguintes a **Continuar**. Base e candidata correram intercaladas, uma build servida de cada vez, em Baixa, com 3 corridas cada.

| Cena | Build | Frames em ~10 s | Intervalo máximo entre frames | Relógio da missão em 8 s | Tarefas longas no carregamento |
|---|---|---:|---:|---:|---:|
| Salva nos portões | BASE | 13–14 | 2,07–2,17 s | +1,30 s | 4,2–4,7 s |
| Salva nos portões | CANDIDATA | 13–14 | 1,90–2,20 s | +1,53–1,55 s | 4,5–4,6 s |
| Fogo alemão no reparo | BASE | 17–19 | 1,85–2,02 s | +2,07–2,55 s | 4,1–4,2 s |
| Fogo alemão no reparo | CANDIDATA | 18–19 | 1,78–1,95 s | +2,30–2,57 s | 4,1–4,6 s |

Fonte: [logs/scene-frames.log](logs/scene-frames.log). Com os aviões fora do ecrã, a candidata desenha ao mesmo ritmo que a base; os GLB maiores só pesam no carregamento. Este SwiftShader desenha 1–2 frames por segundo nestas cenas, o que explica as falhas de testes de navegador com esperas curtas em tempo real, que acontecem nas duas builds (ver [HANDOFF.md](HANDOFF.md)).
