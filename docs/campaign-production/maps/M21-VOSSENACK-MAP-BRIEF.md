# M21 — FLORESTA (Germeter → Vossenack, Hürtgen) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M21-VOSSENACK-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** "diferenciar mata, ravinas, campos e povoação, em vez de plantar árvores sobre um grid plano"; a ravina de evacuação **não é o trilho do Kall**; companhia/ravina/hora são P-C21.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Germeter → crista de Vossenack, floresta de Hürtgen (≈ 50,68 N 6,39 E); 2/11/1944 |
| Classe global | relevo, a crista e a povoação `EXACT` (DEM/Overture); o pinhal, a ravina lateral, a clareira e as casas do flanco oeste `RECONSTRUCTED` (P-C21) |
| O que medir depois | DEM (a crista, os talvegues a norte do eixo Germeter–Vossenack), Overture (Germeter, Vossenack, a estrada), cartas de 1944 (trilhos de madeireiros) |
| Origem proposta | o afloramento da posição de observação na orla leste do pinhal: `(0, 0, 0)` |
| Eixos | metros; X+ leste (Germeter → Vossenack), Y+ altura, Z+ sul; a ravina a −Z |
| Área jogável | X −700 (orla de Germeter) … +500 (cruzamento a oeste de Vossenack) · Z −300 (ravina) … +250 (campos); altura: sobe ≈ 40 m até à crista |
| Compressões declaradas | "pinhal 600 m + campos 300 m" (dossiê): o eixo real Germeter → Vossenack ≈ 1,5 km; o jogo usa ≈ 1,2 km (`COMPRESSED_FOR_GAMEPLAY` leve, a confirmar) |
| Relógio | 09:00 → 18:30 (`readyScale` 11:45–16:30) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m)

```
     N         ⇖ 109.º (norte, s5)
   ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠ \\\\\\ RAVINA LATERAL (talvegue, ribeiro, taludes 3–4 m) \\\\\\ ♠♠♠♠♠♠♠♠♠♠♠♠♠
   ♠♠♠♠♠♠♠♠♠♠♠♠♠ \\ tronco caído ✕ · posição alemã abandonada (fita de minas) · fita branca nova \\ ♠♠
   ♠♠♠ PINHAL (troncos a 2–3 m; visibilidade 15–40 m) ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠
   [GERMETER: buracos com troncos] ── trilho de madeireiros ── clareira de corte (cepos) ── ⊙ AFLORAMENTO (0,0,0)
   ♠♠♠♠♠♠♠♠♠♠♠♠ ~~~ ribeiro (corre para sul) ~~~ ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠ orla sob copas (salva 10:40)
   ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠
                                                      │ campos abertos a subir (300 m): erva alta, cercas,
                                                      │ caminho exposto (200 m vistos da crista) · sebe baixa (MG)
                                                      ▼
                                   ┌─────────────────────────────────────────────┐
                                   │ VOSSENACK OESTE: celeiro · muro · CRUZAMENTO │ ⇒ igreja (E, 600 m; não objetivo)
                                   │ casa com cave (posto) · caminho sul (ligação)│ ⇒ crista a leste sob fogo
                                   └─────────────────────────────────────────────┘
     S         ⇙ 110.º (sul, s5)        ⇗ artilharia alemã de Brandenberg-Bergstein (NE, longe)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_germeter_edge` | perto | buracos com troncos, lama, a crista ao longe | 09:00 |
| `s2_forest_draw` | perto | pinhal, ribeiro, clareira, ravina | 09:10 → 11:45 |
| `s3_ridge_fields` | perto/médio | campos, sebe, caminho exposto | 10:00 → 13:30 |
| `s4_village_west` | perto | celeiro, cruzamento, cave, muro | 11:45 → 18:30 |
| `s5_far` | longe | artilharia da crista de Brandenberg-Bergstein; o 109.º a norte e o 110.º a sul; blindados amigos na estrada (som) | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | orla de Germeter (cs intro: o mapa molhado) | 0 | 09:00 | — |
| 2 | trilho **ou** ribeiro → clareira → afloramento, confirmando 3 referências | 500 m | 09:10–10:00 | `obj_m21_orient`; CP-A |
| 3 | afloramento: dois pontos de tiro; o pelotão avança nos campos; Ames parte | 0–40 m | 10:00–10:40 | `obj_m21_support_advance` |
| 4 | recuo para sob as copas: a salva nas copas; Brenner ferido; Halvorsen some | 60 m | 10:40–10:55 | `obj_m21_treeburst_cover` |
| 5 | ravina: tronco a dois, verificar a posição, marcar com fita **ou** seguir Pruitt pelo aberto | 200 m | 10:55–11:45 | `obj_m21_open_evac`, `obj_m21_carry`; CP-C |
| 6 | orla → campos (taludes e cercas) → celeiro → cruzamento | 400 m | 11:45–13:30 | `obj_m21_reach_village`; CP-B |
| 7 | cruzamento: cave, muro, celeiro; duas pressões; estafeta da direita | 60 m | 13:30–16:30 | `obj_m21_secure_point`, `obj_m21_reorganize`; CP-D |
| 8 | cruzamento ao anoitecer (cs outro: a lama na maca) | 0 | 16:30–18:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Orientação** (cena 2): trilho (rápido; lama; visível de cima) vs ribeiro (lento; coberto); confirmar a direção em três pontos (trilho, ribeiro, clareira) — errar custa tempo, nunca dano.
- **Pontos de tiro** (cena 3): o alto (vê a MG; exposto 5 s por mudança) vs a pedra da esquerda (vê só a sebe; coberto).
- **Copas** (cena 4): encostar ao tronco ou entrar num buraco com tronco por cima; **nunca deitar-se** na clareira (dois avisos antes de dano).
- **A passagem** (cena 5): a ravina (coberta; 10 min de trabalho: tronco, buraco, fita) vs o caminho dos campos (exposto; os maqueiros vão depois sob observação).
- **Acesso** (cena 6): celeiro pela porta (rápido) vs pelo lado (coberto); parar no campo > 10 s chama o morteiro.
- **Cruzamento** (cena 7): janela da cave (vê o caminho; cega ao celeiro) vs muro (vê tudo; exposto aos morteiros).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| buracos com troncos | cobertura total, inclusive de copa | — |
| pinhal | troncos a 2–3 m: cobertura vertical (encostar) | visão 15–40 m; som ocluído e com ecos ("oclusão invertida") |
| clareira/trilho | nenhuma | deitar-se aqui sob copa = apanhar tudo |
| ravina | taludes 3–4 m: cobertura total | a saída para os campos é vista da crista |
| afloramento | rocha | dois pontos com linha para a sebe |
| campos | talude do caminho, cercas | vistos da crista: morteiros sobre quem pára |
| celeiro/cruzamento | pedra, cave, muro | a pressão vem de leste |

Linhas de visão: MG da sebe → afloramento (só dos dois pontos; 150–300 m); crista inimiga → caminho exposto (200 m) e campos; cruzamento → caminho leste e sul (100 m). Regra: a IA não vê através da mata; sons distantes parecem próximos (parâmetro por setor).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| salva nas copas (10:40–10:55) | assobio 2 s; primeira salva ≥ 30 m; dano só após dois avisos; Brenner ferido às 10:46 (fixo) |
| morteiros nos campos | só sobre quem está parado > 10 s; aviso; ≥ 30 m |
| trecho aberto (ravina não aberta) | salva ≥ 30 m sobre os maqueiros; Brenner chega na mesma |
| minas | só a zona marcada pela fita alemã no buraco abandonado; aviso de Teague; nunca invisível |
| pressões (14:10; 15:40) | de leste; MG amiga pelo flanco sul |
| limites | a crista a leste (nunca jogável); o pinhal além da ravina (aviso) |

## 8. Encenação e objetos por zona

- **Germeter** (cs intro): o mapa a enrolar; a crista "de trás"; botas a secar inúteis.
- **Pinhal**: cepos, carro de madeireiro, fita velha (lane de minas de outubro), o ribeiro.
- **Copas**: copas desfeitas, galhos no chão, o tronco partido no trilho.
- **Ravina**: a posição abandonada (latas, buraco sem MG, fita alemã), a fita branca nova (3 estacas), a maca sob o talude.
- **Cruzamento**: feno molhado, muro lascado, a lista no verso do mapa.
- **Anoitecer** (cs outro): a lama tirada da maca; Halvorsen pelo caminho sul; o caminho de Germeter vazio.
- Persistentes: copas e galhos, tronco removido, fita, celeiro furado, muro lascado (CP-C salva a rota).

## 9. Luz, tempo e som por zona

Sol calculado (50,68 N 6,39 E, UTC+1; a validar — **nunca visível**: chuva e nuvens baixas):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 09:00 | 131° | 12° | cinzento sem sombras |
| 12:00 | 175° | 24° | luz filtrada sob copas; manchas |
| 15:00 | 221° | 16° | tarde cinzenta |
| 16:30 | 240° | 5° | queda rápida; pôr do sol ≈ 17:05 |
| 18:00 | — | −9° | noite; lanterna tapada |

Som: Germeter (chuva nas agulhas e capacetes; o rebentamento que soa perto), pinhal (passos na lama; ribeiro; ecos por ravinas; a voz de Halvorsen a contar), afloramento (Garands; BAR; MG abafada pela crista), copas (assobio → copa → estilhaços e galhos → ouvido tapado 3 s → chamadas), ravina (tronco a arrastar; respiração sob a maca), campos (morteiros; a mata atrás "calada"), cruzamento (MG amiga pelo flanco; rádio; a crista a leste), noite (lama na maca; 4 s de silêncio).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 200 × 550 m com 40 m de desnível e três biomas (pinhal, campos, orla de povoação).
- **Assets:** pinhal irregular (instâncias com clareiras e cepos), ravina com taludes e ribeiro, buracos com troncos, campos com cercas, celeiro, casa com cave, muro, igreja de Vossenack (silhueta), lama com pegadas.
- **Sistemas (roadmap S10/S5):** artilharia com dano em árvores (copa/tronco/galho), oclusão sonora por relevo e "oclusão invertida", lama por profundidade, minas como zona marcada.
- **Risco:** 3. **Fallback:** galhos por evento; mistura fixa por setor.
- **Medir primeiro:** DEM dos talvegues a norte do eixo e a crista; Germeter e Vossenack (Overture); P-C21.
