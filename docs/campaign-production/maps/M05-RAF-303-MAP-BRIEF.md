# M05 — CÉU EM CHAMAS (RAF Northolt / sudeste de Inglaterra) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições; **depende da bancada de avião do Marco 4** (sem bancada aprovada não há missão). **Fonte:** `missions/M05-RAF-303-PRODUCTION-DOSSIER.md`.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | RAF Northolt (51,55 N 0,42 W) → sudeste de Londres → estuário do Tamisa → Kent → regresso; 15/9/1940 |
| Classe global | aeródromo `EXACT` em silhueta (pista, dispersal, torre); o céu e as referências `RECONSTRUCTED`; o volume de voo `COMPRESSED_FOR_GAMEPLAY` |
| O que medir depois | planta de Northolt em 1940 (RAF; orientação das pistas), posições das linhas de balões de barragem de Londres, costa do estuário e de Kent (Overture); rotas do raid das 14:00 de 15/9 (ORB do 303 — P-C05) |
| Origem proposta | cabeceira da pista principal de Northolt: `(0, 0, 0)` ao nível do solo (y = altitude real do aeródromo, a fixar) |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul |
| Volume jogável | 40 × 40 km × 6 000 m: Londres a SE (x +15…+25 km, z +5…+10 km), estuário a E (x +30…+40 km), Kent a SE (z +15…+25 km); aviso de combustível/controlo nas bordas |
| Compressões declaradas | distâncias reais (Northolt → estuário ≈ 55 km) comprimidas para o volume de 40 km, com velocidades de Hurricane reais: um troço de 40 km ≈ 5 min, compatível com os tempos do dossiê |
| Relógio | 13:40 → 15:20 (BST) |

## 2. Planta esquemática (vista de cima; 1 carácter ≈ 1 km; alturas em cortes de cena)

```
     N
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  NORTHOLT ✈ ORIGEM (0,0)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  pista / dispersal / torre  ·  ·  ·  nuvens a 1 500 m  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ◌◌◌ balões de barragem ◌◌◌  LONDRES (silhueta, flak própria)  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  INTERCEÇÃO 4 500 m (Do 17 ✚ escolta Bf 109 acima)  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ESTUÁRIO DO TAMISA ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (separação; Dębski atingido; paraquedas)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  KENT (campos, costa)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   regresso ⟵⟵⟵ rumo W/NW com o sol a SW nos olhos (14:40) ⟵⟵⟵  Do 17 solitário cruza a rota (opcional)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| cockpit / secção de Zych (3 aviões) | perto | o ala, o líder, instrumentos, o remendo | — |
| esquadrão 303 | médio (0,5–3 km) | os outros aviões à frente; rastos | agenda do controlo |
| outros esquadrões / outras altitudes | longe (3–20 km) | pontos e rastos; ataques noutros setores | relógio da batalha |
| formação inimiga (Do 17 + Bf 109) | médio → perto | a formação, a escolta a mergulhar | agenda; reage à passagem |
| solo (Londres, estuário, Kent, Northolt) | referências | balões, flak própria, costa, a torre de Northolt | — |

## 4. Rota principal

| # | De → para | Distância / altitude | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | dispersal (cs intro) | solo | 13:40 | — |
| 2 | pista → subida → formação à direita de Zych | 0 → 3 000 m sobre o oeste de Londres | 13:46–13:56 | `obj_m05_takeoff`, `obj_m05_form`; CP-A (solo), CP-B (em voo) |
| 3 | sudeste de Londres | 4 500 m | 13:56–14:10 | `obj_m05_intercept`: uma passagem, 15 s de munição no total |
| 4 | estuário | 4 000 → 2 000 m | 14:10–14:20 | separação; Dębski atingido; paraquedas ao longe; decisão |
| 5 | estuário → Kent → rumo a Northolt | 2 000 → 1 000 m | 14:20–14:40 | `obj_m05_escort_wingman`; CP-C |
| 6 | Kent → Northolt; aproximação | 1 000 → 0 | 14:40–15:05 | `obj_m05_return`, `obj_m05_land`; CP-D recuperável antes da aproximação |
| 7 | dispersal (cs outro) | solo | 15:05–15:20 | — |

## 5. Rotas alternativas e decisões espaciais

- **Interceção:** aproximar por cima com o sol atrás (sol a S/SSW, el 40°) ou de lado; uma passagem só; evitar colisão com a formação.
- **Separação (14:10):** perseguir o Do 17 que se desgarra (reivindicação; afasta-se do ala) vs ficar com Dębski ("Vejo a costa. Fique comigo mais uma milha.").
- **Escolta:** voar ao lado e abaixo da velocidade; afastar um Bf 109 que tenta aproveitar; Dębski decide saltar sobre Kent ou continuar.
- **Regresso:** o Do 17 solitário cruza a rota (atacar ou não; o combustível decide); a aproximação pode ser abortada e refeita; falha só por risco real (velocidade, trem).

## 6. "Cobertura", linhas de visão e referências

- Não há cobertura: há **sol** (contraluz para quem olha a S/SW), **nuvens a 1 500 m** (esconder/ser escondido), **altitude** (quem está acima vê primeiro) e **distância** (pontos antes de silhuetas).
- Referências de navegação (sem HUD de mapa): o Tamisa e as suas curvas, os balões de Londres, a costa do estuário, a linha de Kent, a torre e a pista de Northolt.
- Linhas de visão-chave: formação vista a 8–10 km como pontos; escolta acima a 1 000 m; o paraquedas a 3–4 km; a costa a 15 km.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| flak própria sobre Londres | zona marcada por rebentamentos; o controlo avisa; dano só se o jogador insistir |
| balões de barragem | obstáculos reais abaixo de 1 500 m sobre Londres; colisão possível, mas só com aviso visual claro |
| colisão com a formação | evitada por desenho da passagem; sem "ram" |
| bordas do volume | combustível e controlo ("Retornem"), nunca parede invisível |
| aterragem | falhar só por velocidade/trem; abortar e refazer permitido |

## 8. Encenação e objetos

- **Dispersal** (cs intro/outro): cadeiras, mesa, telefone, Hurricanes com mecânicos; o remendo na asa; a cadeira vazia e o capacete pendurado no fim.
- **Em voo:** o ala à direita; a formação como "lápis voadores"; o paraquedas ao longe; o glare de regresso.
- Persistentes: furos na asa de Malec; Dębski aterrado ou ausente.

## 9. Luz, tempo e som

Sol calculado (51,27 N 0,52 E, BST; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 13:40 | 196° | 41° | sol a sul-sudoeste; nuvens dispersas |
| 14:10 | 205° | 39° | interceção: atacar com o sol atrás = vir de SSW/por cima |
| 14:40 | 214° | 37° | regresso para W/NW com glare a SW |
| 15:10 | 223° | 34° | aproximação |

Som: motor Merlin (rpm), rádio do controlo, vento, as 8 × .303 em 15 s totais, o silêncio após a separação, o motor a desligar no dispersal.

## 10. Requisitos de produção do nível

- **Volume:** 40 × 40 × 6 km com LOD de solo (Londres, estuário, Kent) e nuvens a 1 500 m.
- **Assets:** Northolt (pista, dispersal, torre), Hurricane Mk I (exterior/cockpit), Do 17, Bf 109E, balões, flak; **todos com autoria/licença e escala verificadas**.
- **Sistema:** bancada de avião (S8) [C]/[D]: voo assistido configurável, câmara externa permitida (MASTER-STORY-BIBLE §9), checkpoints em voo (estado completo).
- **Risco:** 5. **Fallback:** nenhum (a missão espera pela bancada).
- **Medir primeiro:** orientação das pistas de Northolt em 1940 e a geometria do estuário para fixar a compressão.
