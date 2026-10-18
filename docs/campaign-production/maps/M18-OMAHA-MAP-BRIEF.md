# M18 — OVERLORD (Omaha, setor Fox Green) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M18-OMAHA-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** Fox Green entre as saídas E-1 e E-3; secção e saída exatas pendentes (P-C18); sem invulnerabilidade na água.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Omaha Beach, setor Fox Green (Colleville-sur-Mer, ≈ 49,36 N 0,85 W); 6/6/1944, maré a subir |
| Classe global | praia, banco de seixos, falésia e saídas E-1/E-3 `EXACT` em traçado (Overture/DEM; a praia persiste); obstáculos, trincheira e trilho `RECONSTRUCTED` (P-C18) |
| O que medir depois | DEM (falésia de ~30 m, o trilho), Overture (linha de costa, E-1 e E-3), fotografias aéreas de 6/6 (obstáculos, casamatas de E-3); tabela de maré |
| Origem proposta | o pé do banco de seixos no eixo da secção: `(0, 0, 0)` ao nível da areia |
| Eixos | metros; X+ leste (ao longo da praia; E-3 a leste, E-1 a oeste), Y+ altura, Z+ sul (para a falésia); o mar a −Z |
| Área jogável | X −300…+300 · Z −400 (LCVP) … +180 (trincheira acima da praia); altura: 0 → +30 m na falésia |
| Compressões declaradas | 300 m de praia com obstáculos (dossiê) — a praia real à maré baixa era mais larga: declarar após a tabela de maré (P-C18) |
| Relógio | 06:25 → 12:00 |

## 2. Planta esquemática (norte em cima = o mar; 1 carácter ≈ 15 m)

```
     N (Canal da Mancha)  ≈≈≈≈≈≈≈≈≈ frota, fogo naval, aviação (s5) ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ≈≈≈≈≈≈≈≈≈≈≈ [LCVP a 400 m, 06:25] ≈≈≈≈≈≈≈≈ outras embarcações ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈  z −400
   ≈≈ água ao peito ≈≈ ✕ ouriços ✕ ≈≈ | estacas | ≈≈ ✕ ≈≈ | ≈≈ ✕ ≈≈ (maré a subir) ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ____________________ areia 300 m ______ feridos, macas desde 09:00 ______ fluxo de outros grupos ____
   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ BANCO DE SEIXOS ⊙ ORIGEM (0,0,0) ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  z 0
   ≋≋≋≋≋≋≋≋≋≋≋ arame acima dos seixos (40 m expostos; bangalore) ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋  z +40
   ▲▲▲▲ FALÉSIA ▲▲ erva a arder (fumo desde 07:30) ▲▲ trilho entre E-1 e E-3 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲  z +60…+150
   ▲▲ outros grupos sobem pela esquerda (08:30) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲ casamatas de E-3 ⟶ (MG; silhueta) ▲▲
   ═══════════ TRINCHEIRA ALEMÃ acima da praia (10:00) ══════ contra-ataque 10:30 ═══════════════  z +180
     S   E-1 ⇐ (oeste)                                                                 (leste) ⇒ E-3
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_beach_section` | perto | água, obstáculos, areia, feridos | 06:30 → 07:40 |
| `s2_shingle_wire` | perto | seixos, arame, a equipa de abertura | 07:00 → 08:40 |
| `s3_bluff` | perto | trilho, fumo de erva, posições no topo, trincheira | 08:40 → 12:00 |
| `s4_neighbor_sectors` | médio | Easy Red / Fox Green, outros grupos, saídas | outros sobem 08:30 |
| `s5_fleet_sky` | longe | frota, embarcações, aviação, fogo naval | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | LCVP (cs intro) | 0 | 06:25 | CP-A |
| 2 | rampa → água → obstáculos → areia → seixos | 300 m | 06:30–07:00 | `obj_m18_reach_cover`; CP-B |
| 3 | seixos: reunir pela voz; Whitaker ferido (fixo); Price atende | 60 m | 07:00–07:40 | `obj_m18_regroup`; CP-C |
| 4 | seixos → arame (40 m expostos) com as secções de bangalore | 40 m | 07:40–08:40 | `obj_m18_deliver_material`; CP-D |
| 5 | trilho na falésia pelo fumo | 150 m (+30 m) | 08:40–10:00 | `obj_m18_climb` |
| 6 | trincheira acima da praia; manter o acesso | 100 m | 10:00–11:30 | `obj_m18_consolidate`; CP-E |
| 7 | borda da falésia (cs outro: a praia de cima) | 0 | 11:30–12:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Rampa** (cena 2): usar os obstáculos (ouriços, estacas) como cobertura parcial vs correr pela areia; agachar na água; a maré sobe (os obstáculos desaparecem).
- **Seixos** (cena 3): a única cobertura contínua; reunir pela voz; Price entre obstáculos com Bell a cobrir a passagem.
- **Arame** (cena 4): levar as secções à equipa pelo troço esquerdo (mais curto; MG de E-3 em janelas) ou pelo direito (mais longo; fumo).
- **Falésia** (cena 5): subir pelo trilho (fumo; posições em cima) ou pela esquerda com os outros grupos (mais lento; mais gente).
- **Trincheira** (cena 6): rotação por salvas; sinalizar o acesso para os seguintes.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| água | nenhuma; os obstáculos (parcial) | sem invulnerabilidade |
| areia | nenhuma; cadáveres e destroços (parcial) | batida de E-3 e do topo |
| banco de seixos | 1–1,5 m; cobertura total deitado | o silêncio de 1–2 s |
| arame | nenhuma | 40 m expostos |
| falésia | erva a arder (fumo simétrico), dobras do terreno | posições no topo só veem o que o fumo deixa |
| trincheira | cobertura total | vê a praia inteira |

Linhas de visão: casamatas de E-3 → praia e arame (300–600 m, por janelas); topo → trilho (100 m, reduzido pelo fumo); trincheira → praia (300 m). Regra: o fumo reduz a visão simetricamente; a maré muda o que é cobertura.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| morteiros (praia e seixos) | assobio; ≥ 30 m; Whitaker ferido é evento fixo (07:20) |
| MG de E-3 | por janelas sobre a praia e o arame; silencia quando outros grupos sobem (08:30+) |
| fogo naval | só sobre o topo e as saídas; nunca sobre a praia jogável |
| contra-ataque (10:30) | pontual; na trincheira |
| maré | sobe durante a missão; os obstáculos submergem; macas na praia desde 09:00 |
| limites | mar além da LCVP; falésia além das saídas (aviso) |

## 8. Encenação e objetos por zona

- **LCVP** (cs intro): espaço apertado; "meses depois da Sicília"; Lane reconhece cada um.
- **Praia**: ouriços, estacas, uma embarcação atingida, equipamento, feridos.
- **Seixos**: Price a tratar; Whitaker; as secções de bangalore.
- **Falésia**: erva a arder, posições no topo, outros grupos a subir.
- **Trincheira**: equipamento alemão; o acesso sinalizado.
- **Borda** (cs outro): as mesmas embarcações, agora entre destroços e socorro; macas; Price presente ou evacuado (variante).
- Persistentes: destroços, o arame aberto, a trincheira ocupada.

## 9. Luz, tempo e som por zona

Sol calculado (49,37 N 0,88 W, UTC+2; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 06:25 | 57° | 3° | cinzento; mar picado; fumo |
| 08:25 | 79° | 21° | fumo de erva (haze castanho) |
| 10:25 | 102° | 40° | a luz a abrir |
| 11:25 | 117° | 49° | — |

Som: LCVP (motores, rampa), água (impactos abafados; respiração), areia (tudo ao mesmo tempo), seixos (1–2 s de silêncio; a voz), arame (bangalore; MG por janelas), falésia (fumo; tiros em cima), trincheira (contra-ataque; a praia lá em baixo), borda (macas; o mar).

## 10. Requisitos de produção do nível

- **Tamanho:** 600 × 580 m com 30 m de falésia e maré a subir.
- **Assets:** LCVP, obstáculos (ouriços, estacas, portões belgas), banco de seixos, arame, falésia com erva a arder, casamatas de E-3 (silhueta), trincheira alemã, frota em silhueta.
- **Sistemas (roadmap S6/S5):** água de praia (reutiliza M04), terreno vertical (reutiliza M16), fumo que reduz visão simetricamente, maré por estado.
- **Risco:** 4. **Fallback:** maré por troca de estado; fumo por volume fixo.
- **Medir primeiro:** largura da praia à hora da maré (P-C18) e a posição das saídas E-1/E-3.
