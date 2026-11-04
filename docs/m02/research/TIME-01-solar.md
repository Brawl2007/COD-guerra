# TIME-01 — Posição do sol em Łęczyca, 9–10 de setembro de 1939

Classe: **RECONSTRUÍDO** (cálculo astronómico determinista; não é observação histórica de meteorologia/nebulosidade).

## Método
Ferramenta `tools/m02/solar-noaa.mjs` (Node puro): equações NOAA ESRL (Meeus simplificado): longitude média e anomalia, equação do centro, longitude aparente, obliquidade corrigida, declinação, equação do tempo, tempo solar verdadeiro, ângulo horário, zénite/azimute (desde o Norte, sentido horário) e refração atmosférica NOAA para a elevação aparente. Nascer/ocaso com zénite 90,833° (iterado). Local 52,06 N; 19,20 E. Hora local CET = UTC+1, sem horário de verão. A Polónia usava CET em 1939; a ocupação alemã impôs depois outra hora — não aplicada aqui.

Reprodução: `node tools/m02/solar-noaa.mjs` · teste: `node --test tests/m02-10-solar-time01.test.js`.

## Tabela (CET)
| Momento | Elevação | Azimute |
|---|---|---|
| 9/9 16:30 | 15,2° | 259° |
| 9/9 17:00 | 10,7° | 265° |
| 9/9 17:30 | 6,1° | 271° |
| 9/9 ocaso 18:14 | 0° | 280° |
| 10/9 nascer 05:08 | 0° | 80° |
| 10/9 07:30 | 20,8° | 109° |
| 10/9 12:00 | 43,0° | 187° |
| 10/9 16:00 | 19,3° | 253° |

Validação independente (no teste): equação do tempo e declinação tabeladas, nascer/ocaso de Londres e Varsóvia em 21/06/2023 (timeanddate.com) a ±2 min, elevação ao meio-dia solar.

## Divergência face ao cálculo anterior do Capitão
Elevações/azimutes coincidem (≤0,1°). Ocaso 18:14 (não 18:09) e nascer 05:08 (não 05:13): diferença de ~5 min cada, consistente com o uso de zénite 90° em vez de 90,833° (semidiâmetro + refração). Está certo o valor NOAA acima (confirmado com Londres/Varsóvia).
Nota: o «pôr do sol 19:10» do #58 usava CEST (UTC+2); em CET equivale a ~18:10, em linha com 18:14 aqui.

## Presets de luz M02 vs. cálculo
Convenção: norte = −Z, este = +X; `az = atan2(x, −z)`, `elev = atan2(y, hypot(x,z))` a partir de `sunPosition` em `src/render/m02-01-renderer.js` (apenas lido).

| Preset | Preset (elev/az) | Referência | Divergência |
|---|---|---|---|
| afternoon_1939_09_09 (T0) | 30,5° / 247° | 16:30 → 15,2°/259°; 17:30 → 6,1°/271° | elevação +15° a +24° alta; az −12° a −24° |
| night_1939_09_09 (T1) | 45,8° / 42° | sol abaixo do horizonte | é luar fictício; lua não calculada (fase/posição por fazer) |
| morning_1939_09_10 (T2) | 28,9° / 71° | 07:30 → 20,8°/109° | elevação +8°; az −38° (sol deveria estar a SE, não a ENE) |
| afternoon_1939_09_10 (T3) | 30,9° / 248° | 16:00 → 19,3°/253° | elevação +11,6°; az −5° |
| neutral_review | 62,2° / 297° | técnico | n/a |

Recomendação (renderer não alterado): baixar T0 para ~10–15° a ~262° (sombras longas), T2 para ~20° a ~109°, T3 para ~19° a ~253°.
