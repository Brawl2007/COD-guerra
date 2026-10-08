# M02 — CONTRA-ATAQUE (Bzura / Łęczyca) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M02-BZURA-PRODUCTION-DOSSIER.md` (§0, §2, §3.2–3.3, §5, §7, §10). **Pipeline seguinte:** o de M01 (`MAP.md` → `map-layout.json` → `map-layout.svg` → `MEASUREMENTS.md`). **Nada aqui substitui a pesquisa P-C02 (eixo exato do ataque a Łęczyca).**

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | margem norte do Bzura → acesso norte de Łęczyca (Polónia, 52,06 N 19,20 E) |
| Classe global | `RECONSTRUCTED` (zagroda, pomar, orla da povoação); `EXACT` só para a orientação (Bzura a norte, Łęczyca a sul, torre da igreja como âncora distante); eixo do ataque pendente (P-C02) |
| O que medir depois | Overture/OSM: contorno de Łęczyca, curso do Bzura, estradas norte–sul; DEM GLO-30: planura do vale e valas de drenagem; mapa WIG 1:100 000 (folha Łęczyca) para a rede de 1939 |
| Origem proposta | o portão da zagroda (a quinta murada que domina a estrada): `(0, 0, 0)` ao nível do pátio |
| Eixos | metros; **X+ leste**, **Y+ altura**, **Z+ sul** (o ataque avança para +Z) |
| Área jogável | X −320…+320 · Z −450 (vala de partida) … +650 (orla de Łęczyca); aviso suave além de ±280 em X; fora de limites além de Z −470 (o rio) com 8 s de tolerância, como M01 |
| Compressões declaradas | distância vala → zagroda mantida real-plausível (400 m); zagroda → orla da povoação **comprimida** para 500 m (`COMPRESSED_FOR_GAMEPLAY`; valor real a medir, P-C02) |
| Relógio | 9/9 16:30 → 19:40 (noite em cartela) → 10/9 05:30 → 09:00 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 20 m)

```
                     N (Bzura, rio: fora de limites)
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  z −470
   ====================== vala de partida (CP-A) ==================  z −400
   .  .  .  s3 campos  .  .  .  .  .  .  .  .  .  s3 campos  .  .
   .  .  (companhia W)  .  .  .  .  .  .  .  .  (companhia E)  .  .
   .  .  .  .  .  .  .  .  .   linha do pomar   .  .  .  .  .  .  .   ← eixo curto (exposto)
   .  .  vala de drenagem ————————————————+  .  .  .  .  .  .  .  .   ← eixo longo (coberto, +250 m)
   .  .  .  .  .  .  .  .  .  .  .  .  .  |  .  .  .  .  .  .  .  .
                              [celeiro]   |   MG ⟶ bate linha do pomar e campos
                        ┌────────┐  ┌─────┴────┐
                        │ zagroda│  │  pátio   │  ORIGEM (0,0,0)   z 0
                        └────────┘  └──────────┘
                           ♣ ♣ ♣ ♣ ♣  pomar (macieiras)  ♣ ♣ ♣          z +80…+200
                           ♣ ♣ ♣ ♣ ♣ (alemão ferido)   ♣ ♣ ♣
   ─────────────── estrada N–S com álamos ─────┼──── vala paralela ──  z +250
                                               │  ⇐ corredor da carroça
   ──────────────── caminho da zagroda ───╬═══ cruzamento (CP-D) ══  z +450
                              estrada para E ⟶ (Stukas 06:10; direita recua; carroça a +200 m)
   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒ orla de Łęczyca (s2) ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  z +500…+650
                        ⌂ torre da igreja (âncora, longe)   fumo / colunas (s5)
```

## 3. Setores e camadas (do dossiê §3.2)

| Setor | Camada / distância | O que se vê de lá | Independência |
| --- | --- | --- | --- |
| `s1_north_access` | perto, 0–150 m | vala, campo, zagroda, pomar, estrada, cruzamento | agenda própria 16:30 → 08:20 |
| `s2_town_edge` | médio, 150–500 m | sebe leste e estrada tomadas por outros grupos (17:20/18:00); posições noturnas; recuo por vagas de manhã | sim |
| `s3_fields` | médio | companhias vizinhas em vagas a E e W (16:35–18:30); a direita recua às 06:40 (homens a correr com feridos, a 300 m) | sim |
| `s4_sky` | longe | Stukas sobre a estrada leste 06:10 (impactos ≥ 30 m); 07:50 segunda passagem só som/fumo com marca visual | relógio |
| `s5_columns` | longe | colunas alemãs a sul, fumo de Łęczyca, artilharia | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora de jogo | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | vala de partida (z −400) → campo | 0 | 16:30 | `cs_m02_intro`; CP-A |
| 2 | campo → zagroda, por um de dois eixos | 400 m (pomar) / 650 m (vala) | 16:35–17:05 | escolha de exposição |
| 3 | flanco pelo celeiro → pátio | 60 m | 17:05–17:30 | `obj_m02_take_access`; CP-B |
| 4 | pátio → pomar | 120 m | 17:40–18:10 | pausa; alemão ferido |
| 5 | pomar → estrada/vala paralela → orla | 300 m | 18:10–19:40 | `obj_m02_hold_supply_corridor`; carroça |
| 6 | orla (posições) | 0 | noite (cartela) | CP-C (snapshot 10/9) |
| 7 | orla → cruzamento | 120 m | 05:30–07:30 | Stukas; "a direita recuou" |
| 8 | cruzamento → 200 m de estrada → carroça de feridos | 200 m | 07:30–08:20 | `obj_m02_cover_last_group`; Lis atingido; CP-D |
| 9 | regresso para norte pela zagroda | 500 m (elipse em cutscene) | 08:20–09:00 | `cs_m02_outro` |

## 5. Rotas alternativas e decisões espaciais

- **Dois eixos** (cena 2): a vala de drenagem (cobertura 1,2 m, lama, +250 m, sem linha de visão da MG até aos últimos 60 m) ou a linha do pomar (curta, 400 m, exposta à MG da zagroda a partir dos 250 m). A escolha é do jogador; o grupo segue-o. A vala desemboca no flanco do celeiro; o pomar desemboca de frente para o portão.
- **Flanco da zagroda** (cena 3): celeiro à esquerda (coberto; janela para granada wz.33) vs direita pela sebe (mais rápido, visto do pátio).
- **Corredor** (cena 5): a estrada (rápida, vista das sebes a leste) vs a vala paralela (lenta, coberta); a carroça só usa a estrada.
- **Última passagem** (cena 8): cobrir do cruzamento (vê os 200 m) vs acompanhar o último grupo na estrada (perto de Lis; exposto).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura real | Observações |
| --- | --- | --- |
| vala de partida / vala de drenagem | parapeito de terra, 1,2 m; pára tiros | lama abranda; salgueiros só escondem (não param) |
| campo | sulcos de 0,3 m: só deitado | a MG vê tudo acima de 0,5 m |
| zagroda | muros de tijolo 1,8 m; portão; janelas do celeiro | pátio cego para a estrada até se subir ao muro |
| pomar | troncos de macieira (parcial; param só de frente) | copas tapam a vista da estrada: oclusão visual, não balística |
| estrada / álamos | vala paralela 0,8 m; álamos só silhueta | o corredor é visto das sebes a leste (150–300 m) |
| cruzamento | esquina de muro, carroça tombada | vê 200 m para leste e a orla a sul |

Linhas de visão-chave: MG da zagroda → linha do pomar (400 m) e campo (até 500 m); pátio → estrada até à orla (500 m); cruzamento → estrada leste (300 m: a direita a recuar; Stukas). Regra: a IA não vê através das copas do pomar nem dos muros; o jogador também não.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| impactos de Stuka (06:10, 07:50) | só sobre a estrada leste, ≥ 30 m do jogador; sirene e sombra antes |
| MG da zagroda | fogo como dados, só sobre linha de visão; cadência por janelas |
| sondas alemãs pelas sebes (corredor) | vêm de leste, nunca "de trás" |
| artilharia a norte/sul | só som e clarões (s5) |
| limites | rio a norte (fora de limites); flancos E/W além dos eixos das companhias (aviso suave) |

Nenhuma demolição; nenhuma zona de explosão no mapa.

## 8. Encenação e objetos por zona

- **Vala de partida** (cs intro): câmara baixa ao nível do parapeito; salgueiros; artilharia a norte.
- **Pomar** (cs orchard): o alemão ferido entre duas árvores (estado DOWN, desarmado); água; o mapa de Piotr.
- **Orla à noite** (cs night): homens a dormir sentados; incêndios a sul; o segundo canto do mapa dobrado.
- **Cruzamento** (clímax): a carroça de feridos a 200 m; Lis atingido a meio da estrada (evento fixo).
- **Estrada de regresso** (cs outro): a carroça parte pela mesma estrada; a zagroda ao fundo.
- Objetos persistentes: cartuchos no pátio, portão aberto, macieira partida, a carroça, rastos de rodas, a estrada marcada pelas bombas (persistente após CP-D).

## 9. Luz, tempo e som por zona

Sol calculado (52,06 N 19,20 E; a validar como C01 em M01):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 9/9 16:30 | 259° | 15° | dourado, contraluz para quem olha a oeste; sombras longas para leste |
| 17:30 | 271° | 6° | luz rasante no pomar |
| 18:20 | ~283° | 0° | pôr do sol; crepúsculo até ~19:20 |
| 10/9 05:30 | 85° | 3° | nascer; sombras longas para oeste |
| 07:30 | 109° | 21° | manhã clara |
| 08:30 | 123° | 29° | — |

Tempo: seco, poeira ao contraluz; fumo de Łęczyca a sul. Som por zona: vala (vento nos salgueiros; artilharia a norte); campo (MG abafada pela distância); pátio (reverberação de muro); pomar (quase silêncio; folhas); estrada (carroça; sondas; à noite incêndios); cruzamento (Stukas, estrada, a direita a recuar).

## 10. Requisitos de produção do nível

- **Tamanho:** ≈ 640 × 1 100 m jogáveis; três tiles de detalhe (zagroda/pomar; estrada/cruzamento; orla) e campos de baixo detalhe.
- **Assets de nível:** zagroda (muros, celeiro, poço, portão), macieiras (instâncias), álamos, vala com salgueiros, orla de povoação polaca (fachadas simples), torre de igreja distante, carroça com cavalo (NPC), camião? não.
- **Proxies/LOD:** companhias em vagas a 150–500 m (padrão `pl_east_*` com movimento); a direita a recuar a 300 m; Stukas (Ju 87 V2).
- **Risco:** baixo (risco 2 no roadmap); o único sistema novo é a carroça NPC.
- **Medir primeiro:** o eixo real do ataque (P-C02) e a distância zagroda → orla, para fixar ou corrigir a compressão.
