# M01-DISTANT-FRONT-IMPOSTORS-V1 (T20) — evidência

- Commit aceite: `676a4557fcaaad59711e8edcd2f0934f7ad681cf` (base `71ad067`).
- Integração: a branch parte de `71ad067`, não da ponta do stack `3388c24`.
- Estado: ACCEPTED. Verifier PASS, reviewer ACCEPT e consulta de risco Jev "medium" (confiança 0.72, chamada 4/100) são
  os números reportados no handoff do Captain; não foram re-verificados neste documento.
- Tentativas de correção: 4 de 5 (orçamento elevado de 3 para 5 em 2026-10-10).

## CI e autoridade

- CI x86, run `38047289527`:
  - `npm test`: 544 passam, 0 falham (`evidence/npm-test.tap`).
  - `npm run build`: `✓ built in 307ms` (`evidence/build.log`).
  - Browser: 13 passam, 1 worker (`evidence/browser.log`).
  - Autoridade: `authority diff clean against 71ad067`; sem referência a `m01-impostors` em `src/game`, `src/world`, `src/core`
    (`evidence/authority.log`).
- Captura BEFORE na base `71ad067` (`evidence/before/browser-before.log`): 4 passam. Esta é a execução de captura com
  `M01_IMPOSTORS_BASELINE=1`, não uma segunda passagem de CI.

## Causa e correção

- Causa da falha anterior: o denominador da medição. Das 66 impostores dentro do enquadramento, 54 estão ocultas por profundidade
  pelos tabuleiros, treliças e pilares da ponte, vistas das câmaras declaradas na margem oeste. Os rects dessas figuras são
  pixel-idênticos com impostores ligados e desligados (maxDiff 0). Com todos os rects no denominador, a fracção alterada fica
  limitada a 52/300 = 0,17 (vista 10) e 80/400 = 0,20 (vista 12), mesmo que todos os pixels visíveis mudassem.
- Correção: oráculo geométrico de linha de visão, conservador, decidido só pela geometria da simulação (sem ler pixels).
  Os segmentos olho-figura (centro e cabeça) têm de passar pelo terreno (`world.traceTerrain`, que inclui as lajes do tabuleiro),
  por todos os obstáculos do mundo, pelas caixas de colisão da ponte e pela alma sólida entre cada par de treliças. O mundo
  fresco (sem demolição) é a geometria máxima, pelo que o conjunto livre é conservador.
- Limiares inalterados, aplicados às figuras com linha de visão livre (`tests/browser/m01-distant-front-impostors.spec.js`):
  `CHANGED_DL=16`, `MIN_IN_VIEW=15`, `MIN_RECT_HIT=0.8`, `MIN_UNION_CHANGED=0.2`, `MIN_MEAN_ABS=8`, `MIN_FREE_SIGHTLINE=10`
  (piso de 10 figuras com linha de visão livre).
- As figuras bloqueadas são reportadas (`sightline.blocked`), não afirmadas.

## Números por vista (diagnósticos da CI)

Fonte: `test-results/*/m01-impostors-view*-diagnostics.json` da CI. "Hit" não está guardado no JSON; é calculado como a fracção
de rects com `changedPixels >= 1` em `statsSighted.each`, a mesma fórmula do spec (linha 236).

| Vista | Qualidade | Linha de visão livre | Bloqueadas | Figuras sighted: changed (união) | meanAbs (união) | Hit (sighted) | Todos os rects: changed (`stats.union`) |
|---|---|---|---|---|---|---|---|
| view10 | Baixa | 12 | 54 | 0,731 (38 de 52 px) | 45,57 | 12/12 (1,00) | 0,127 (38 de 300 px) |
| view10 | Alta | 12 | 54 | 0,712 (37 de 52 px) | 45,10 | 12/12 (1,00) | 0,123 (37 de 300 px) |
| view12 | Alta | 12 | 54 | 0,925 (74 de 80 px) | 108,18 | 12/12 (1,00) | 0,185 (74 de 400 px) |

- Em todas as vistas, as 54 bloqueadas dão `maxDiff 0` na união ligado/desligado (`statsBlocked.union`).
- Os limiares (união 0,2; meanAbs 8; hit 0,8) são cumpridos em todas as vistas, com as 12 figuras livres.
- Figuras por vista: vista 10 com 66 selecionadas (18 `pl_east`, 48 `de`), capacidade 128 (Alta) e 64 (Baixa). Vista 12 com 78
  selecionadas (ver limitações).
- Contagens de desenho (diagnóstico, não são FPS): vista 10 Baixa 234 com impostores contra 232 sem (2 malhas, uma por nação);
  vista 10 Alta 465 contra 463; vista 12 Alta 302 contra 300. Triângulos da cena: vista 10 Baixa 460 563 contra 565 767;
  vista 10 Alta 852 843 contra 1 168 719; vista 12 Alta 796 510 contra 1 169 350. Nenhum FPS foi medido nem declarado.

## Capturas copiadas

| Ficheiro | Vista | Qualidade | Conteúdo |
|---|---|---|---|
| `m01-impostors-view12-high-crop4x.png` | view12 | Alta | Recorte 4x da janela 549–709 × 340–373, com impostores |
| `m01-impostors-view12-high-impostors-off-crop4x.png` | view12 | Alta | Mesmo recorte, impostores desligados (mesmo instante em pausa) |
| `m01-impostors-view10-high-crop4x.png` | view10 | Alta | Recorte 4x da janela 578–689 × 344–374, com impostores |
| `m01-impostors-view10-high-impostors-off-crop4x.png` | view10 | Alta | Mesmo recorte, impostores desligados (mesmo instante em pausa) |

Os recortes têm cerca de 12–19 KB cada. As figuras medem cerca de 3 px de altura no ecrã; a diferença entre ligado e desligado é
pequena à vista, e a prova assenta nas medições acima, não na inspecção visual. Os PNG completos e os diagnósticos JSON ficam no
artefacto da CI, não neste repositório.

## Limitações

- Pelotão polaco (`pl_east`, 18 figuras, na laje da ponte rodoviária, z ≈ 38): não tem linha de visão a partir de nenhuma das
  duas vistas de teste. A prova A/B em pixels cobre só os alemães (12 por vista). O pelotão é afirmado por contagem, distância,
  altura, contraste e fase. Seguimento: adicionar uma vista de teste a partir do tabuleiro rodoviário ou da aproximação leste, onde
  o pelotão seja visível.
- Vista 12: 78 figuras selecionadas, das quais 12 não são do pelotão nem `de` (`ckm_loader`, `ckm_gunner`, `ckm_reserve`,
  `leon_dudek`, `szymon_kowal`, `staszek_pawlak`, `east_platoon_voice`, `pawel_krawiec`, `sapper_2`, `sapper_3`, `marek_zielinski`,
  `generic_rifleman`, entre 366 m e 724 m). Estas não estão nos 66 rects medidos nem no oráculo de linha de visão; a sua presença
  no enquadramento não é verificada aqui.
- Nenhum FPS foi medido nem declarado.
- As câmaras de teste (vistas 10 e 12) são as declaradas na spec; nesta entrega não há vista a partir do tabuleiro rodoviário.

## Reprodução

- `node --test tests/m01-impostors.test.js`
- `npx playwright test tests/browser/m01-distant-front-impostors.spec.js --workers=1 --retries=0`
- Registo de regressão: `.agent/regression/records/M01-DISTANT-FRONT-IMPOSTORS-V1.json`.
