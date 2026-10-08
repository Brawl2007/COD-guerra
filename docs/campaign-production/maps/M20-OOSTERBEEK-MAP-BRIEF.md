# M20 — UMA PONTE LONGE DEMAIS (LZ, Oosterbeek, Nederrijn) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M20-OOSTERBEEK-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** três atos em três datas com estados salvos por ato; Arnhem só por relatos; a Operação Berlin (chuva, fitas, botas abafadas, barcos) é `DOCUMENTED` (S-C05); batalhão/LZ/casa/embarque são P-C20.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | LZ a oeste de Arnhem (charnecas entre Wolfheze e Heelsum) → Oosterbeek oeste → a Oude Kerk → prados do polder → margem norte do Nederrijn (≈ 51,98 N 5,84 E); 17, 21 e 25/26 de setembro de 1944 |
| Classe global | a Oude Kerk, o dique, o rio e as ruas de Oosterbeek `EXACT` (Overture); LZ exata, casa-posto, hotel e ponto de embarque `RECONSTRUCTED` (P-C20) |
| O que medir depois | Overture (Oosterbeek, a igreja velha, o polder, o rio, as charnecas), DEM (o dique; a descida da aldeia para o polder); mapas de Market Garden (LZ S/LZ Z; perímetro de 21/9; ponto de travessia de Berlin) |
| Origem proposta | o portão da casa-posto Van Dijk (Ato II): `(0, 0, 0)`; os outros dois tiles têm origens próprias declaradas (LZ: o planador de Reed; polder: a Oude Kerk) |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul (o rio a sul) |
| Área jogável | **três tiles**: A — LZ/charneca 400 × 300 m + estrada/bosque 600 m; B — Oosterbeek oeste 300 × 250 m (casa de 2 pisos + porão, rua, hotel a 150 m); C — polder e dique 300 × 400 m + margem (água até 40 m) |
| Compressões declaradas | A: LZ → Oosterbeek (real 4–6 km) resolvido com cartela e marcha curta; C: Oosterbeek → rio (real ≈ 1 km) jogado em 600 m (`COMPRESSED_FOR_GAMEPLAY`) |
| Relógio | 17/9 13:30→17:00 · 21/9 08:00→14:00 · 25/9 21:30→26/9 03:30 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 20 m nos tiles B/C)

```
   TILE A (17/9)  ♠♠♠ pinhal ♠♠♠  ∿∿∿ charneca: planadores no chão (asas partidas) ∿∿∿  ⊙ Horsa de Reed
                  ──── caminho de areia ──── estrada secundária ──── primeiras casas (Heelsum, ao longe)
                  [cruzamento com quinta] ⇄ 200 m de campo ⇄ [grupo separado: pelotão vizinho] · Kampfgruppe (15:40)
   ····································· (cartela: 21/9) ·····································
   TILE B (21/9)      N
   ══════════ rua com árvores ═══╬═ esquina (viatura queimada; StuG bate aqui) ════════════════
   ┌─────────────────────┐       ║  outro grupo britânico do outro lado da rua (s3)
   │ CASA VAN DIJK       │ ⊙ (0,0,0)                        [HOTEL: posto médico, Cruz Vermelha]
   │ 2 pisos + porão     │   muro do jardim ──── 150 m com dois cruzamentos expostos ────────►
   │ (família no porão)  │   (MG a 200 m: rajadas 8 s / pausa 20 s)
   └─────────────────────┘
   ····································· (cartela: 25/9 21:30) ··································
   TILE C (25/26)   ruas escuras ⇒ jardins ⇒ fitas brancas ─ ─ ─ ─ ⌂ OUDE KERK ─ ─ ─ ─ ⇒ polder
                    ∼∼∼ prados encharcados (água ao joelho) ∼∼∼ MG varre a cada 90 s ∼∼∼ flares 2–4 min
                    ════════════════════════ DIQUE (fila; "doze por barco") ════════════════════════
                    ≈≈≈≈≈≈≈≈ NEDERRIJN: storm boats a cada 6 min ≈≈≈ margem sul: lama, camião, chá ≈≈≈
                         ⇖ artilharia britânica a sul (fogo de apoio, longe)        Arnhem ⇗ (só relatos)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_lz_heath` | perto (17/9) | charneca, planadores, caminho, estrada, cruzamento, campo | 13:30 → 17:00 |
| `s2_oosterbeek_west` | perto (21/9) | casa, muro, esquina, rua, hotel/posto, cruzamentos | 08:00 → 14:00 |
| `s3_other_perimeter` | médio | outros trechos do perímetro; o outro grupo do outro lado da rua | sim |
| `s4_arnhem_far` | longe | Arnhem, fogo de apoio, travessias — só som e clarões | relógio |
| `s5_polder_river` | perto (25/9) | ruas, jardins, Oude Kerk, prados, dique, água, barcos | 22:00 → 03:30 |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | Horsa → LZ (cs intro) | 0 | 17/9 13:30 | — |
| 2 | caminho de areia **ou** estrada → ponto de reunião | 600 m | 13:45–15:00 | `obj_m20_assemble`; CP-A |
| 3 | cruzamento → 200 m de campo → grupo separado; Kampfgruppe; contagem | 200 m | 15:00–17:00 | `obj_m20_link_up` |
| 4 | casa Van Dijk (cs day2: a contagem) | 0 | 21/9 08:00 | CP-B |
| 5 | três postos (janela, muro, esquina); recuo controlado | 60 m | 08:30–11:00 | `obj_m20_posts` |
| 6 | muro → hotel (150 m, dois cruzamentos) → de volta com Ashby na maca | 300 m | 11:00–14:00 | `obj_m20_aid_post`, `obj_m20_wounded_passage`; CP-C |
| 7 | hotel (cs penn: a ordem; Penn fica) | 0 | 25/9 21:30 | CP-D |
| 8 | ruas → jardins → Oude Kerk → prados → dique → barco | 600 m (compressão) | 22:00–01:30 | `obj_m20_follow_tapes`, `obj_m20_keep_group`, `obj_m20_embark`; CP-E recuperável |
| 9 | o rio → margem sul (cs outro: remos) | 300 m (cutscene) | 01:30–03:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Vias** (cena 2): caminho do bosque (sombra; lento) vs estrada (rápido; aberto); ambas chegam.
- **Ligação** (cena 3): correr o campo de 200 m (o jogador) ou mandar Vane; o Kampfgruppe sonda a estrada a 80–150 m.
- **Postos** (cena 5): recuar da esquina para o muro à ordem de Birch; cedo demais expõe o outro grupo (um proxy ferido).
- **Passagem de feridos** (cena 6): atravessar os dois cruzamentos nos intervalos da MG (20 s); carregar a traseira da maca ou cobrir.
- **Fitas** (cena 8): seguir as fitas (3 m de visibilidade) e as vozes; parar sob flare; vadear o prado; voltar 40 m a chamar Vane; esperar o barco seguinte se o grupo não estiver inteiro.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| charneca/pinhal | troncos finos, dunas de areia baixas | tarde clara: visão longa |
| cruzamento/quinta | muros | o campo de 200 m é aberto |
| casa Van Dijk | tijolo, colchões nas janelas, porão | o StuG nunca lhe acerta (bate na esquina) |
| muro do jardim | 1,4 m | — |
| esquina | viatura queimada | batida pelo StuG a 300 m |
| cruzamentos até ao hotel | nenhuma; portais | MG a 200 m por rajadas |
| hotel | salão com janelas tapadas | — |
| ruas/jardins (noite) | sebes, cercas, estacas com fitas | escuridão; flares |
| prados | nenhuma; água ao joelho | MG a 150–300 m; traçantes a 1,5 m: deitar |
| dique | 2 m: cobertura total do lado do rio | a fila |

Linhas de visão: StuG → esquina (300 m); MG do cruzamento → 2 cruzamentos (200 m); MG do prado → prado inteiro (300 m, só com flare/traçantes); dique → rio e barcos (40 m). Regra: de noite a IA dispara por traçantes e flares; a lanterna é proibida.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| Kampfgruppe (17/9 15:40) | 6–8 homens; recua após 4–6 baixas ou 6 min |
| sondas (21/9 09:00; 10:20) | 60–120 m; a segunda força o recuo da esquina |
| StuG | a 300 m; só a casa da esquina; nunca a casa Van Dijk; nunca < 30 m do jogador sem motor antes |
| MG do cruzamento | rajadas 8 s / pausas 20 s (legível) |
| flares (25/9) | som 1 s antes; parar; correr sob flare = rajada (dados) e grupo disperso |
| MG do prado | uma passagem a cada 90 s; traçantes visíveis |
| artilharia britânica | só a sul; nunca sobre o jogador |
| o barco | 12 lugares, 6 min; perder o barco restaura CP-E com o seguinte |
| limites | A: pinhal além da LZ; B: a rua para Arnhem (nunca); C: o rio além do dique só no barco |

## 8. Encenação e objetos por zona

- **LZ** (cs intro): planadores partidos, contentores, a bicicleta do holandês; a alça da bolsa (correia de M04).
- **Estrada**: bandeiras laranja tímidas, mesa com água à porta, o estafeta.
- **Casa Van Dijk** (cs day2): colchões, chaleira, a boneca no degrau do porão; a contagem.
- **Hotel**: feridos no chão, cartazes, o relógio parado; Marsh e Ashby; Penn.
- **Noite** (cs penn): velas, ligaduras, lençol rasgado nas botas.
- **Polder**: fitas, estacas, equipamento largado, um capacete cheio de água; o engenheiro canadiano.
- **Margem sul** (cs outro): lama, camião, lata de chá; "quatro".
- Persistentes por ato: janela desfeita, colchão a arder (apagado em 25/9), viatura queimada; `ammo_day1/2/3`.

## 9. Luz, tempo e som por zona

Sol calculado (51,99 N 5,84 E, UTC+2; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 17/9 13:30 | 180° | 40° | tarde clara; sombras curtas |
| 16:30 | 233° | 28° | luz dourada; pôr do sol ≈ 19:45 |
| 21/9 08:00 | 95° | 5° | nublado frio; sem sombras |
| 14:00 | 190° | 38° | nublado |
| 25/9 22:00 → 03:30 | — | −25° … −39° | noite fechada; chuva forte; flares; clarões a sul |

Som: LZ (vento na urze; planadores a aterrar; nenhum tiro), estrada (areia; bicicletas; rádio em ruído), ligação (tiros no pinhal; vozes a 200 m), casa (chaleira; morteiros; silêncio entre respostas), postos (Bren em rajadas de 3; o StuG na esquina), hotel (silêncio obrigatório; MG por rajadas), noite (chuva nas copas e capacetes; botas abafadas; sussurros; flare; traçantes), rio (remos; chuva; motor baixo — silêncio obrigatório).

## 10. Requisitos de produção do nível

- **Tamanho:** três tiles (≈ 1 000 × 300; 300 × 250; 300 × 440 m) com estados por ato.
- **Assets:** Horsa (interior/aterragem, encenado), charneca e pinhal, casas burguesas de Oosterbeek (2 pisos + porão), hotel com bandeira, Oude Kerk (silhueta exata), polder com água, dique, storm boat (NPC com lugares), flares, fitas.
- **Sistemas (roadmap S2 [D]/S6/S15/S14):** três segmentos de relógio com snapshot; água em prado/dique; barco com agenda; flare como luz com aviso; Horsa encenado.
- **Risco:** 5. **Fallback:** três sub-missões encadeadas; prado como lama; barco em cutscene.
- **Medir primeiro:** Oosterbeek oeste e o polder até ao rio (Overture/DEM); o ponto de travessia de Berlin (P-C20).
