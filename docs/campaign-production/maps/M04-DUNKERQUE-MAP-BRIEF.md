# M04 — ATÉ O MAR (perímetro de Dunquerque, setor leste) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M04-DUNKERQUE-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** setor leste (La Panne / Bray-Dunes / canal Furnes–Nieuport); o molhe de Dunquerque não entra (setor errado); sem franceses neste setor.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | sul de La Panne → canal Furnes–Nieuport → praia de La Panne/Bray-Dunes (Bélgica/França, ≈ 51,10 N 2,59 E), 31/5/1940 |
| Classe global | `RECONSTRUCTED`; `EXACT` para a orientação (canal a sul, praia a norte, Dunquerque a oeste com a coluna de fumo) e para o "cais de camiões" como facto de Bray-Dunes |
| O que medir depois | Overture/OSM: linha de costa, dunas, traçado do canal Furnes–Nieuport e eclusas; DEM: dique e dunas; fotografia aérea de 1940 (IWM) para a fila de camiões (P-C04 também fixa o fuso) |
| Origem proposta | o entroncamento (cena 2): `(0, 0, 0)` ao nível da estrada |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul (o canal a +Z, a praia a −Z) |
| Área jogável | **três tiles** ligados por deslocamentos comprimidos: Tile A estrada/quintas (X −200…+500, Z −100…+200); Tile B canal (Z +1 400…+1 600, X −150…+150); Tile C dunas/praia (Z −1 300…−1 000, X −300…+300, com água até −1 040) |
| Compressões declaradas | entroncamento → canal: real ≈ 4–5 km, jogo 1,4 km com elipse de 09:00–10:30 (`COMPRESSED_FOR_GAMEPLAY`); canal → praia: elipse total em cartela ("19:30 — ordem de retirar") |
| Relógio | 06:30 → 22:40 (`readyScale` 10:30–15:00; elipse 15:00–19:30) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m no Tile A)

```
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ MAR (contratorpedeiro ao largo, holofote) ≈≈≈≈≈≈≈   TILE C  z −1 300
   ≈≈≈≈ botes a cada ~8 min ≈≈ [cais de camiões ▭▭▭▭▭ na água] ≈≈≈≈≈≈≈≈≈   (noite)
   ______________ praia 400 m até ao bote designado ______________________
   ∧∧∧ dunas ∧∧∧ [posto de socorro: Whitfield a 250 m] ∧∧∧ filas de homens ∧
   ·················· (elipse em cartela 19:30) ····························
                                  ⇑ norte
   ──┬───── fila de camiões sem gasolina ─────┬──────────────────────────   TILE A  z −100
     │ cs intro (06:30)                       │
   ══╪═══════ estrada 600 m ═════════╬════════╪═══ entroncamento ORIGEM (0,0,0)
     │  valas    [quinta]            ║        │   camião parte com lugares a menos
     │                               ║ 300 m de estrada aberta ──► fila de salgueiros
     │   Stukas 07:50 / 08:30 (sobre a coluna e o camião; ≥ 30 m)
     │   estrada atingida 09:00 ✕ (rota cortada)
     └──► pátios de duas quintas (gado solto) ──► (compressão) ──► canal
   ·················· (compressão 1,4 km) ·······································
   ──────── dique ──────── [casa de eclusa] ──── posição da secção ──────   TILE B  z +1 500
   ≈≈≈≈≈≈≈≈≈≈ canal Furnes–Nieuport (botes alemães a 200 m, 12:30) ≈≈≈≈≈≈≈≈
   ·  ·  ·  · margem sul: sondas; pelotão britânico vizinho a oeste (telefone) ·
                      ⇖ Dunquerque: coluna de fumo preto (âncora, oeste)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_road_junction` | perto (manhã) | camiões, fila, entroncamento, estrada aberta, quintas | agenda 06:30 → 10:30 |
| `s2_canal` | perto (dia) | dique, eclusa, canal, margem sul, pelotão vizinho | 10:30 → 15:00 (`readyScale`) |
| `s3_beach` | perto (noite) | dunas, posto, praia, cais de camiões, botes, bote designado | 19:30 → 22:20; barcos a cada ~8 min |
| `s4_perimeter_mid` | médio | pelotão vizinho, botes rechaçados, outras colunas | sim |
| `s5_sea_sky` | longe | navios, Stukas, combate aéreo, incêndios de Dunquerque | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | fila de camiões (cs intro) | 0 | 06:30 | — |
| 2 | estrada → entroncamento, reunindo desgarrados | 600 m | 06:35–07:30 | `obj_m04_rearguard`; CP-A |
| 3 | entroncamento → 300 m de estrada aberta até aos salgueiros, cobrindo a passagem | 300 m | 07:30–09:00 | `obj_m04_cover_passage`; Stukas |
| 4 | estrada cortada → pátios de duas quintas → (compressão) → canal | 400 m jogáveis + elipse | 09:00–10:30 | `obj_m04_find_route`; CP-B |
| 5 | posição no dique; posto vizinho (telefone); munição à Bren | 150 m de margem | 10:30–15:00 | `obj_m04_hold_canal` |
| 6 | (cartela 19:30) dunas → praia → cais de camiões, com feridos | 250 m | 19:30–20:30 | `obj_m04_deliver_wounded`; CP-C |
| 7 | dunas (posto; Whitfield a 250 m) → 400 m de praia → bote designado | 400–650 m | 20:30–22:20 | `obj_m04_last_move` + `obj_m04_whitfield`; CP-D recuperável |
| 8 | bote → contratorpedeiro | — | 22:20–22:40 | `cs_m04_outro` |

## 5. Rotas alternativas e decisões espaciais

- **Estrada aberta** (cena 3): cobrir dos salgueiros vs carregar uma maca 60 m na estrada (exposto às passagens de Stuka com sirene e sombra).
- **Rota acabou** (cena 4): a estrada é cortada por agenda; a única rota é pelos pátios (portão a abrir; gado solto); não há "atalho" que evite a elipse.
- **Canal** (cena 5): posto vizinho a oeste (telefone), Bren a leste (munição), recuo de posto (cobrir) — três direções no mesmo dique de 150 m.
- **Praia** (cena 7): ir buscar Whitfield ao posto (250 m para trás, sob artilharia com assobio) antes de o bote encher, ou ir direto ao bote; o bote avisa três vezes (Hale) e parte; perder o bote restaura CP-C com o bote seguinte (**nunca falha**).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| fila de camiões | camiões (param tiros); pneus queimados | sombra das Stukas passa por cima |
| estrada/valas | valas 0,8 m; quinta | os salgueiros só escondem |
| pátios | muros de quinta 1,6 m; portões | cegos para a estrada |
| dique/eclusa | dique 2 m (cobertura total do lado do canal); casa de eclusa | o canal é a linha de visão: 60–200 m |
| dunas | reentrâncias de areia (parcial) | artilharia com assobio; holofote do navio |
| praia | nenhuma; o cais de camiões (lateral) | fila de homens; a água até à cintura no cais |

Linhas de visão: salgueiros → entroncamento (300 m); dique → margem sul (60–200 m); dunas → praia e bote (400 m); praia → contratorpedeiro ao largo (1–2 km, silhueta).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| Stukas (07:50, 08:30) | alvos adequados (coluna, camião); sirene, sombra, tempo de reação; bombas ≥ 30 m |
| estrada atingida (09:00) | evento agendado; zona de impacto definida fora do jogador |
| botes alemães no canal (12:30) | a 200 m; rechaçados pelo pelotão vizinho (dados) |
| artilharia na praia | sempre com assobio; ≥ 30 m |
| água | praia: até à cintura no cais de camiões; velocidade reduzida; sem natação |
| o bote | avisa 3×; parte; checkpoint recuperável |
| limites | Tile A: além dos campos (aviso); Tile B: só o dique e 50 m atrás; Tile C: mar além do cais (bloqueio suave) |

## 8. Encenação e objetos por zona

- **Fila de camiões** (cs intro): pneus queimados, homens a dormir sentados, Whitfield e o estranho; câmara ao nível da estrada.
- **Entroncamento**: o camião com motor; o motorista; a fila; a correia de lona (Whitfield corta-a — o objeto de M20).
- **Quintas**: mesa posta (família belga evacuada a 28/5), gado solto, canhão AT sem culatra.
- **Dique**: casa de eclusa, telefone, a Bren sem tripé largada.
- **Praia**: cais de camiões na água, equipamento na areia, holofote, o bote de Hale.
- **Bote** (cs outro): o lugar vazio ou Whitfield; o motor que engole as vozes.

## 9. Luz, tempo e som por zona

Sol calculado (51,10 N 2,59 E; hora de verão +2, P-C04; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 06:30 | 62° | 6° | nublado; vento norte; fumo preto a oeste |
| 09:30 | 95° | 33° | sol fraco entre nuvens |
| 12:30 | 146° | 57° | sol entre nuvens no canal |
| 18:30 | 270° | 29° | (elipse) |
| 20:00 | 287° | 15° | contraluz do mar com fumo preto |
| 21:30 | 303° | 2° | pôr do sol ≈ 21:40; crepúsculo longo |
| 22:20 | — | < −5° | noite a cair; incêndios; holofote |

Som: estrada (pneus, sirene de Stuka, sombra); pátios (gado, portão); dique (água do canal, Bren curta, telefone); praia (ondulação, filas, motores de bote, artilharia com assobio, holofote em silêncio); bote (motor que abafa tudo — silêncio canónico).

## 10. Requisitos de produção do nível

- **Tamanho:** três tiles (≈ 700 × 300 m; 300 × 200 m; 600 × 300 m) com elipses em cartela entre eles.
- **Assets:** camiões Bedford/Morris sabotados, quinta flamenga, dique e casa de eclusa, dunas, "cais de camiões", botes pequenos (NPC com lugares), contratorpedeiro (silhueta ao largo), coluna de fumo de Dunquerque.
- **Sistemas novos (roadmap S6/S7):** água de praia (profundidade, velocidade, som); barcos com agenda e lugares; multidão em fila (proxies).
- **Risco:** 4. **Fallback:** barcos em cutscene; praia sem água dinâmica (cais como passadiço).
- **Medir primeiro:** linha de costa e posição do cais de camiões (Bray-Dunes, fotografia de 1940); traçado do canal e eclusas; confirmar o fuso (P-C04).
