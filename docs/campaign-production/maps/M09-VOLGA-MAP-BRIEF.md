# M09 — O VOLGA (Stalingrado, travessia e embarcadouro central) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M09-VOLGA-PRODUCTION-DOSSIER.md`.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | margem leste (Krasnaya Sloboda) → Volga → embarcadouro central de Stalingrado → pátios até à estação (≈ 48,71 N 44,52 E); noite de 14/15 de setembro de 1942 |
| Classe global | `RECONSTRUCTED` (embarcadouro, pátios); `EXACT` a largura do rio (≈ 1,2 km no canal principal), a orientação (rio N–S, cidade na margem oeste, alta) e as silhuetas (moinho, estação ao fundo) |
| O que medir depois | Overture/OSM: margens, ilhas e canal; DEM: a escarpa da margem oeste; plantas de 1942 do centro (embarcadouro central, moinho, praça da estação) — P-C09 (e fuso) |
| Origem proposta | o topo das escadas de pedra do embarcadouro central: `(0, 0, 0)` |
| Eixos | metros; X+ leste (para o rio), Y+ altura, Z+ sul (ao longo da margem) |
| Área jogável | Tile rio: X 0…+1 300 (o barco; sem controlo de rota); Tile margem: X −350…+60 · Z −150…+150; altura: escadas +12 m |
| Compressões declaradas | a travessia dura 20 min de jogo (22:45–23:05) para 1,2 km: velocidade de barco a motor plausível com guinadas; sem compressão de distância |
| Relógio | 22:30 → 04:30 (fuso P-C09) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 30 m na margem, ≈ 60 m no rio)

```
     N
   ┌───── estação (silhueta, ao fundo) ──────┐
   │  [ACESSO: edifício junto da estação]    │ x −300   ⟸ rua atingida (00:40) ⟸ quarteirão vizinho
   │   pátios ░░ escadas ░░ muros ░░ cave     │           pátio de evacuação (02:00)
   │   ░░░░░░░░ 300 m de pátios ░░░░░░░░░░    │
   │ [armazéns] [MOINHO]  escadas de pedra ⇓ ORIGEM (0,0,0)  margem oeste (alta, 12 m)
   ╞═══════════ embarcadouro central ══════════╡ x 0        defensores já em combate (Lapin)
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ≈≈≈  VOLGA, 1,2 km  ≈≈  barco a motor (30 homens) ⇐⇐⇐  barcaça vizinha (atingida 22:55) ≈≈≈
   ≈≈≈  holofotes alemães da margem oeste; fogo na água; barcos a cada ~12 min  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ───────── margem leste (Krasnaya Sloboda): cais de madeira, feridos a chegar ───────────  x +1 200
     ⇖ incêndios e baterias em margens diferentes (s5: clarões e som com atraso)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_boat` | perto (travessia) | o barco, a barcaça vizinha, holofotes, fogo na água | agenda: barcaça atingida 22:55 |
| `s2_embankment` | perto | escadas, armazéns, moinho, feridos à espera | sim |
| `s3_courtyards` | perto | pátios, escadas, muros, cave, o acesso | assalto 00:40; pressão 02:10 |
| `s4_other_boats_blocks` | médio | outras embarcações, quarteirões vizinhos, maqueiros | barcos a cada ~12 min |
| `s5_fires_batteries` | longe | incêndios e baterias em margens diferentes; clarões com atraso coerente | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | cais da margem leste (cs intro) | 0 | 22:30 | CP-A |
| 2 | barco: margem leste → embarcadouro | 1 200 m (a bordo; controlo limitado) | 22:45–23:05 | `obj_m09_cross` |
| 3 | embarcadouro: escadas por lances; chamar Yermolin; reunir | 60 m, +12 m | 23:05–23:40 | `obj_m09_rally`; CP-B |
| 4 | pátios → o acesso junto da estação, com a caixa | 300 m | 23:40–00:40 | `obj_m09_carry_to_access`; CP-C |
| 5 | acesso → rua atingida → quarteirão vizinho → pátio de evacuação | 250 m | 00:40–02:00 | `obj_m09_alt_route` |
| 6 | pátio de evacuação (cs pause: o embrulho) | 0 | 02:00–02:10 | — |
| 7 | pátio → escadas do embarcadouro: corredor de evacuação; Vetrov ferido | 300 m | 02:10–03:50 | `obj_m09_hold_river_link`; CP-D |
| 8 | escadas (cs outro: o nome) | 0 | 03:50–04:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **A bordo** (cena 2): mover-se dentro do barco (agachar, esvaziar água, segurar um ferido) — sem escolha de rota; o risco é o barco.
- **Pátios** (cena 4): cave (escura, segura, lenta) vs escadas exteriores (rápidas, vistas da rua).
- **A passagem cai** (cena 5): a rota direta é cortada por agenda; a alternativa passa pelo quarteirão vizinho com o apoio do grupo de lá.
- **Corredor** (cena 7): cobrir das escadas (vê o corredor; exposto ao holofote) ou acompanhar a maca de Vetrov (perto; lento).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| barco | bordas de madeira (não param tudo) | holofotes varrem; fogo na água ilumina |
| escadas de pedra | patamares, muretes | vistas dos pontos altos da margem |
| armazéns/moinho | tijolo; cobertura total | reverberação |
| pátios | muros 2 m, escadas, cave | escuro entre pátios; fogo nas ruas |
| rua atingida | crateras, carroças | batida; é a passagem que cai |
| corredor de evacuação | muretes, uma carroça | o holofote apanha-o por janelas |

Linhas de visão: margem oeste alta → rio (holofotes e MG a 400–1 200 m); escadas → corredor (120 m); pátios cegos para a rua até às saídas. Regra de M01 para som: clarões primeiro, som com atraso pela distância.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| o barco | leva impactos (um homem ferido); **nunca afunda**; a barcaça vizinha arde (22:55) a ≥ 60 m |
| holofotes | iluminam por janelas; não causam dano |
| assalto alemão (00:40) | corta a rua; impactos ≥ 30 m; a rota alternativa existe sempre |
| pressão (02:10) | sobre o corredor; MG por janelas; Vetrov ferido é fixo |
| água | o jogador nunca cai ao rio (bordas altas do barco; escadas com murete) |
| limites | o rio só a bordo; a cidade além dos pátios ligados (aviso) |

## 8. Encenação e objetos por zona

- **Margem leste** (cs intro): cais de madeira, feridos a chegar, a cidade a arder refletida; Antonov tenta decorar o nome do starshina.
- **Barco**: água a esvaziar, o ferido seguro, a barcaça a arder.
- **Embarcadouro**: escadas, Lapin em combate, feridos à espera de barco.
- **Pátios/acesso**: a caixa de munição; a cave; o edifício junto da estação.
- **Pátio de evacuação** (cs pause): o embrulho que Vetrov manda guardar.
- **Escadas** (cs outro): "Vetrov. Sasha Vetrov."; barcos a chegar e a partir durante a conversa.
- Persistentes: barcaça a arder, rua cortada, crateras, a maca de Vetrov.

## 9. Luz, tempo e som por zona

Sol calculado (48,72 N 44,52 E, UTC+4; a validar — P-C09): **noite toda** (el entre −20° e −38° de 22:30 a 04:30; nascer ≈ 06:10). Luz: fogo (horizonte oeste `#c8501e`, zénite `#120a0a`), reflexos no rio, holofotes alemães, madrugada cinzenta com fumo às 04:00.

Som: margem leste (motores, feridos, a cidade ao longe), rio (motor, água, impactos, holofote em silêncio, a barcaça), escadas (combate perto, reverberação de pedra), pátios (escuro; tiros a 30–120 m), corredor (MG por janelas; o rio ao fundo), fim (barcos a chegar/partir; o nome).

## 10. Requisitos de produção do nível

- **Tamanho:** rio 1 300 × 300 m (a bordo) + margem 410 × 300 m com 12 m de escarpa e verticalidade de pátios.
- **Assets:** barco a motor (NPC com controlo limitado a bordo), barcaça, cais de madeira, escadas de pedra, armazéns, moinho (silhueta), pátios de tijolo, cave, carroças, estação ao fundo.
- **Sistemas novos (roadmap S6):** barco NPC com movimento e guinadas, jogador a bordo (agachar, interações); água só como superfície (nunca se nada).
- **Risco:** 4. **Fallback:** travessia em cutscene com plano fixo e interações mínimas.
- **Medir primeiro:** largura do canal principal e altura da escarpa; posição do embarcadouro central e do moinho (P-C09).
