# M07 — INVERNO (Kryukovo, arredores de Moscovo) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M07-KRYUKOVO-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** a captura histórica de Kryukovo (8/12) não é atribuída ao dia 7; a estação é `EXACT` em silhueta, o resto `RECONSTRUCTED`.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Kryukovo, linha Moscovo–Leninegrado (55,98 N 37,17 E); 7–8/12/1941 |
| Classe global | `RECONSTRUCTED` (bosque, ravina, orla de isbás, casa de tijolo); `EXACT` a posição relativa da estação e da linha férrea |
| O que medir depois | Overture/OSM: a estação e a linha, a estrada; DEM: a ravina e o pendor; mapas RKKA 1:50 000 de 1941 para as isbás (P-C07, com fuso e horas de sol) |
| Origem proposta | a casa de tijolo da orla (posto da secção): `(0, 0, 0)` ao nível do chão |
| Eixos | metros; X+ leste (de onde a secção vem), Y+ altura, Z+ sul |
| Área jogável | X −450 (cruzamento/estação) … +500 (isbá de partida) · Z −200…+250; a ravina entre x +100 e +350 |
| Compressões declaradas | nenhuma declarada; distâncias do dossiê (bosque/ravina 400 m; orla 200 m; 120 m exposto até à ravina) são de jogo e devem ser confrontadas com o terreno real |
| Relógio | 7/12 13:30 → 16:20 (noite em cartela) → 8/12 08:00 → 09:30 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 20 m)

```
     N
   ·  baterias e clarões (s5; posição muda com o avanço)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ═══╦══ linha férrea Moscovo–Leninegrado ════════════════════════════════════════════════════
      ║ [ESTAÇÃO] (EXACT, silhueta)      bétulas ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠
   ═══╬═══ CRUZAMENTO (8/12; CP clímax)   ♠ ♠ ♠ ♠ bosque ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠
      ║  x −450                          ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ \\ ravina (cobertura) \\ ♠ ♠ [ISBÁ de partida]
      ║                                  ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ ♠ \\  x +100…+350  \\ ♠ ♠ ♠  x +500  (cs intro)
   ───╫──── rua de isbás ⌂ ⌂ ⌂ ⌂ ⌂ ⌂ ⌂ ────────── borda de campo ─────────────────────────
      ║  [casa danificada: o alemão a tremer]       ⌂ ORIGEM: casa de tijolo (posto) (0,0,0)
      ║         [celeiro: MG] ⟵ 120 m expostos ⟶ (rastos; feridos não retirados) ⟵ ravina
   ·  ·  s3: formação da estrada (T-34 + infantaria), avança por si às 14:40  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  s4: companhias cruzando campos; trenós  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_woods_ravine` | perto | bétulas, ravina, borda de campo, rastos | 13:40 → 14:30 |
| `s2_village_edge` | perto | rua de isbás, casa de tijolo, celeiro (MG), casa danificada; 8/12: cruzamento/estação | 14:30 → 16:20; 08:00 → 09:30 |
| `s3_road_group` | médio | formação da estrada com T-34; avança por si (14:40); contra-ataque curto com blindado ao longe (08:50) | sim |
| `s4_fields` | médio | companhias a cruzar campos; trenós | sim |
| `s5_batteries` | longe | baterias e clarões cuja posição muda com o avanço | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | isbá de partida (cs intro) | 0 | 13:30 | CP-A |
| 2 | bosque → ravina → borda de campo, lendo rastos | 400 m | 13:40–14:30 | `obj_m07_follow` |
| 3 | borda → rua de isbás → casa de tijolo (acesso) | 200 m | 14:30–15:20 | `obj_m07_attack_access`; Dorokhov ferido; CP-B |
| 4 | casa de tijolo ⇄ ravina: corredor do trenó (120 m expostos; MG do celeiro) | 120 m | 15:20–16:00 | `obj_m07_sled_corridor`; CP-C |
| 5 | casa danificada (cs house: o alemão) | 40 m | 16:00–16:20 | `pow_escorted` |
| 6 | casa de tijolo: rádio ao ponto alto; noite; cartela 8/12 | 60 m | 16:20 → 08:00 | `obj_m07_radio`; CP-D (snapshot) |
| 7 | orla → cruzamento junto da estação | 450 m por lances | 08:00–09:10 | `obj_m07_crossroads` |
| 8 | isbá junto do cruzamento (cs outro) | 30 m | 09:10–09:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Rastos** (cena 2): neve compactada (rápida, visível), neve funda (lenta, silenciosa), lama gelada (ruidosa), ravina (cobertura); pegadas novas para oeste, antigas alemãs para leste, marcas de trenó.
- **Acesso** (cena 3): avançar por trechos e pausas com a cobertura da formação da estrada; a rua é cruzada em lances (Dorokhov é atingido ao cruzar: fixo).
- **Corredor do trenó** (cena 4): suprimir a MG do celeiro da casa de tijolo (vê o celeiro a 80 m) ou do flanco da ravina; o trenó só passa com o fogo abaixo do limiar.
- **Cruzamento** (cena 7): avançar pela rua (vista) ou pelos quintais das isbás (cobertos, lentos); manter o grupo junto (chamar Lukin).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| bosque de bétulas | troncos finos (parcial); neve funda | visão 40–80 m; o vento apaga rastos e sons |
| ravina | taludes 2–3 m; cobertura total | vista da MG do celeiro só na saída |
| borda de campo | nenhuma | 120 m expostos ao celeiro |
| rua de isbás | isbás (madeira: param tiros só nas paredes duplas), cercas | quintais ligados |
| casa de tijolo | paredes; janelas; sótão (ponto alto do rádio) | vê o celeiro (80 m) e a rua |
| celeiro | tábuas (não param) | a MG tem 120 m de campo sobre o corredor |
| cruzamento/estação | muro da estação, carruagens | o contra-ataque vem da estrada |

Regra: a IA não vê através das isbás nem da ravina; o vento reduz o alcance sonoro (oclusão por tempo).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| MG do celeiro | só sobre o corredor de 120 m e a saída da ravina; silencia por supressão |
| Dorokhov ferido (cena 3) | evento fixo ao cruzar a rua; nunca "evitável" |
| frio | sem medidor punitivo (§79); afeta NPCs e o copo, não o jogador |
| blindado do contra-ataque (08:50) | ao longe; dispara contra a estação; nunca entra na rua |
| artilharia | ≥ 30 m; clarões ao longe |
| limites | bosque além de x +550 (aviso); campos a sul (companhias; aviso) |

## 8. Encenação e objetos por zona

- **Isbá** (cs intro/outro): vapor da roupa junto do forno; Saveliev e os dedos; o copo de lata.
- **Bosque/ravina**: cavalo morto, trenó tombado, rastos velhos e novos.
- **Zona exposta**: feridos não retirados (um já morto, coberto); o trenó de Belova e Grisha.
- **Casa danificada** (cs house): parede com estilhaços; o alemão sem luvas a tremer (DOWN/SURRENDERED).
- **8/12**: o mesmo lugar com neve nova, isbás apagadas, trenós a passar, T-34 na rua; a estação.
- Persistentes: rastos (apagados pela neve nova no snapshot), o trenó, o ícone tapado na isbá.

## 9. Luz, tempo e som por zona

Sol calculado (55,98 N 37,17 E, UTC+3; a validar — P-C07):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 7/12 13:30 | 196° | 10° | sol baixo a sul; sombras azuis longas para norte |
| 15:30 | 222° | 2° | rasante; pôr do sol ≈ 15:50 |
| 16:20 | — | −3° | quase noite; fogo de uma isbá |
| 8/12 08:00 | 122° | −6° | escuro cinzento; nevoeiro de gelo |
| 09:00 | 134° | 0° | nascer ≈ 08:55 (o dossiê diz ~08:40: fixar em P-C07) |

Som: bosque (vento, neve a ranger por profundidade), ravina (abafado), rua (MG do celeiro, isbás de madeira), casa de tijolo (forno, rádio com antena), cruzamento (silêncio obrigatório antes do assalto; depois a estação e o blindado ao longe).

## 10. Requisitos de produção do nível

- **Tamanho:** 950 × 450 m com dois estados (7/12 e 8/12).
- **Assets:** bétulas (instâncias), ravina, isbás (madeira), casa de tijolo com sótão, celeiro, estação (silhueta EXACT), trenó com cavalo (NPC), T-34 proxies.
- **Sistemas novos (roadmap S5/S7/S3):** neve com profundidade, velocidade, rastos dinâmicos e vento; trenó NPC com agenda; `SURRENDERED` (ou encenação).
- **Risco:** 4. **Fallback:** neve por zona com rastos pré-cozidos; trenó por evento.
- **Medir primeiro:** distância orla → estação e a ravina real (DEM); horas de sol (P-C07).
