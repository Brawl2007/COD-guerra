# M08 — WATCHTOWER (Guadalcanal, Red Beach → o campo) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M08-GUADALCANAL-PRODUCTION-DOSSIER.md`. **Candidata a primeira missão do Pacífico** (risco técnico 2).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Red Beach, a leste de Lunga Point (≈ 9,42 S 160,08 E) → coqueiral e capim kunai → acampamento japonês → o campo de aviação (ainda sem nome americano); 7–8/8/1942 |
| Classe global | `RECONSTRUCTED`; Lunga Point e o campo `EXACT` em silhueta; a distância praia → campo `COMPRESSED_FOR_GAMEPLAY` |
| O que medir depois | Overture/OSM e imagens: linha de costa de Red Beach, Lunga Point, a pista; mapas USMC de agosto de 1942 (coqueirais Lever Brothers, rio Tenaru/Ilu) — P-C08 |
| Origem proposta | o ponto de desembarque da esquadra na Red Beach: `(0, 0, 0)` na linha de maré |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul (para o interior) |
| Área jogável | X −1 200…+300 · Z −60 (água) … +800; o campo a oeste-sudoeste (x −1 000, z +600) |
| Compressões declaradas | real: Red Beach → campo ≈ 5–6 km; jogo: 1,2 km ("do campo à praia 1,2 km", cena 8). Declarar na cartela do debrief |
| Relógio | 7/8 09:05 → 18:30 (noite em cartela) → 8/8 13:30 → 18:30 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 40 m)

```
     N  ≈≈≈≈≈≈≈≈≈ frota ao largo (transportes, cruzadores; ataque aéreo 13:20 e 12:00) ≈≈≈≈≈≈≈≈≈  s5
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ Higgins ⇒ RED BEACH ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ___________________ praia 400 m __________ ORIGEM (0,0,0) ___ caixas ▭▭▭ __ posto de Gray ⚕ ___
   ♣ ♣ ♣ ♣ ♣ ♣ ♣ coqueiral (ponto de reunião) ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣
   ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣
   """""""""" capim kunai (2 m) """"""""""""""""""""""""""""" (sinais de retirada ⇐) """""""""""
   ▓▓▓▓▓▓ orla da mata ▓▓▓ [ACAMPAMENTO JAPONÊS: tendas, cozinha, barracão com porta] ▓▓▓▓▓▓▓▓
   ▓▓▓▓▓▓▓▓▓▓▓▓ (um contacto pontual: dois homens de construção que fogem) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ♣ ♣ ♣ orla sul do coqueiral: observação dos acessos (binóculos) ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣
   ┌──────────────────────────── O CAMPO (8/8) ───────────────────────────┐
   │ pista de terra (1 km, silhueta) · rolo compressor · hangares de palha │  x −1 000, z +600
   │ oficinas · torre de água · avião japonês destruído                    │
   └──────────────────────────────────────────────────────────────────────┘
     W ⇐ Lunga Point (EXACT, silhueta)                       S ⇓ colinas (fora de limites)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_beach` | perto (7/8) | praia, caixas, Higgins, posto de Gray | 09:05 → 10:15; descarga continua |
| `s2_jungle_camp` | perto | coqueiral, kunai, orla, acampamento | 10:15 → 12:40 |
| `s3_airfield` | perto (8/8) | pista, oficinas, torre de água, avião destruído | 13:30 → 18:30 |
| `s4_companies` | médio | companhias vizinhas; trabalho no campo; equipas de descarga | sim |
| `s5_fleet_sky` | longe | frota; ataques aéreos 13:20 (7/8) e 12:00 (8/8); fumo; transportes a mover-se ao fim de 8/8 | relógio; Tulagi só som muito distante |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | Higgins → rampa (cs intro: **nada**) | 300 m de água (cutscene) | 09:05 | — |
| 2 | praia: 3 caixas à pilha → reunião no coqueiral | 150 m | 09:15–10:15 | `obj_m08_organize`; CP-A |
| 3 | coqueiral → kunai → orla da mata | 800 m | 10:15–12:00 | `obj_m08_advance`; um contacto |
| 4 | acampamento (cs camp; o ruído; identificar) | 60 m | 12:00–12:40 | `obj_m08_camp`; CP-B |
| 5 | orla sul do coqueiral: observar os acessos; a frota sob ataque | 200 m | 13:00–15:30 | `obj_m08_observe_airfield` |
| 6 | noite (cartela 8/8 13:30) | — | — | CP-C (snapshot) |
| 7 | aproximação → o campo: ocupar, oficinas, BAR, cavar | 600 m | 13:30–16:00 | `obj_m08_occupy_airfield` |
| 8 | campo ⇄ praia (posto de Gray): suprimentos; Ruiz colapsa | 1 200 m (compressão) | 16:00–18:00 | `obj_m08_carry`, `obj_m08_water` |
| 9 | posições no campo; vista para o mar (cs outro) | — | 18:00–18:30 | CP-D |

## 5. Rotas alternativas e decisões espaciais

- **Mata** (cena 3): trilho de retirada japonês (pegadas; rápido; o contacto pontual) vs kunai (lento; sem contacto; visão a 3 m).
- **Acampamento** (cena 4): o ruído vem da mata a leste; disparar ao ruído fere um dos seus (tiro real) — a decisão é espacial: a posição de Jessup ao sair da mata.
- **Campo** (cena 7): oficinas pela porta (rápido; atiradores esporádicos recuam) vs pelo pátio (coberto).
- **Transporte** (cena 8): levar Ruiz às costas (`carriedBy`, lento) ou apoiá-lo até Gray; o poço de água fica a 80 m do posto.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| praia | caixas, troncos de coqueiro caídos | aberta ao mar e ao céu |
| coqueiral | troncos (param tiros; estreitos) | luz em feixes; visão 60–120 m entre fiadas |
| kunai | nenhuma balística; oclusão visual total (2 m) | o jogador e a IA veem 3 m |
| orla/acampamento | tendas (não param), barracão (tábuas), mesa de campanha | sombra densa |
| campo | rolo compressor, oficinas (chapa), torre de água, avião destruído | pista aberta 1 km |

Linhas de visão: orla sul do coqueiral → pista e hangares (400–600 m, binóculos); praia → frota (2–6 km); campo → mar (ao pôr do sol). Regra: ninguém vê através do kunai; os atiradores do campo só disparam de onde têm linha.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| contacto pontual (cena 3) | dois homens disparam e fogem; dramatização a verificar por setor |
| o ruído (cena 4) | são os seus; disparar primeiro fere um deles (`m08.friendly_fire`) |
| ataque aéreo à frota (13:20; 12:00 de 8/8) | só ao largo; flak; um navio atingido sem nome; nada sobre a praia |
| atiradores do campo (8/8) | 3–4; recuam; dados |
| calor | Ruiz colapsa (evento fixo); o jogador nunca sofre dano por calor |
| limites | colinas a sul (aviso); mar além da linha de rebentação |

Sem artilharia inimiga; sem batalha noturna (regra §79).

## 8. Encenação e objetos por zona

- **Rampa** (cs intro): 3 s de silêncio; "Espalhem-se."
- **Praia**: pilha de caixas (nenhuma diz "comida"), jipe, macas vazias; o posto de Gray.
- **Acampamento** (cs camp): tigelas de arroz ainda mornas, chá, ferramentas, a porta encostada no barracão.
- **Campo**: rolo compressor, sacos de arroz, o avião destruído; "ainda não tem nome nosso".
- **Horizonte** (cs outro): a frota a afastar-se; Gray recebe homens; Marsh e a comida.
- Persistentes: caixas abertas, buracos cavados, o acampamento revistado.

## 9. Luz, tempo e som por zona

Sol calculado (9,43 S 160,05 E, UTC+11; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 7/8 09:05 | 62° | 34° | manhã tropical dura |
| 11:05 | 37° | 57° | — |
| 13:05 | 339° | 62° | sol quase a pino, **a norte** (hemisfério sul) |
| 15:05 | 303° | 43° | sol a oeste sobre a frota |
| 17:05 | 290° | 16° | pôr do sol ≈ 18:05, laranja sobre o mar |

Tempo: calor húmido; insetos à noite. Som: praia (rebentação, descarga, Higgins), coqueiral (vento nas copas), kunai (só o próprio corpo), acampamento (silêncio; o ruído na mata), campo (rolo, oficinas, flak ao large), fim (mar; sem combate).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 500 × 860 m com dois estados (7/8 e 8/8).
- **Assets:** coqueiral (instâncias), kunai (volume de oclusão), acampamento japonês, pista e hangares de palha, rolo compressor, torre de água, avião destruído (tipo a confirmar), Higgins (NPC), frota em silhueta, jipe.
- **Sistemas (roadmap):** [B] vegetação alta como oclusão; [C] frota/aviões como proxies com evento (navio atingido); descarga como proxies.
- **Risco:** 2. **Fallback:** nenhum necessário além dos proxies.
- **Medir primeiro:** posição real de Red Beach e da pista para fixar a compressão de 5–6 km → 1,2 km (P-C08).
