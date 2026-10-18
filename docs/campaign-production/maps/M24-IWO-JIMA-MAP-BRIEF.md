# M24 — AREIA NEGRA (Iwo Jima, Green Beach → costa oeste) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M24-IWO-JIMA-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** não é Omaha pintada de preto; o Suribachi é presença, nunca objetivo; o istmo é `COMPRESSED_FOR_GAMEPLAY` (700 jardas → ≈ 300 m); companhia/terraços/hora do fogo intenso são P-C24.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Iwo Jima (≈ 24,76 N 141,30 E): Green Beach junto ao Suribachi, o istmo até à costa oeste; 19/2/1945 |
| Classe global | Suribachi e a forma do istmo `EXACT` (DEM/Overture: a ilha persiste); terraços, bunker, buracos de aranha e posição da esquadra `RECONSTRUCTED`; o istmo comprimido (declarado) |
| O que medir depois | DEM (terraços de cinza desapareceram em parte: usar fotografias de 1945 para a altura), cartas USMC de D-Day (Green Beach, limite com Red 1), perfil do istmo (700 jardas) |
| Origem proposta | a linha de maré onde o LVT de Reed tocou a areia: `(0, 0, 0)` |
| Eixos | metros; X+ leste (o Suribachi a sudoeste → −X/+Z), Y+ altura, Z+ sul; a costa oeste a −X |
| Área jogável | X −420 (costa oeste) … +80 (água) · Z −150…+200; altura: terraços 0 → +7 m (1,5 + 2,5 + 3 m) → rebordo +12 m |
| Compressões declaradas | istmo 700 jardas (≈ 640 m) → 300 m jogáveis; cartela de compressão no debrief |
| Relógio | 08:50 → 18:00 (`readyScale` 11:30–14:00 e 14:20–17:30) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 15 m)

```
     N        ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ frota (s6) ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ≈≈ COSTA OESTE ≈≈            ▓▓▓ planalto norte (longe) ▓▓▓               ≈≈≈≈ GREEN BEACH ≈≈≈ [LVT-4 ⊙ ORIGEM]
   ≈≈ rebentação ≈≈ [plataforma de cinza entre dois promontórios: consolidação] ≈≈≈                 areia molhada 30 m
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈   ⇐ corredor (pano) ⇐ ISTMO 300 m: buracos de aranha ∘ ∘ ∘ ∘   ═══ TERRAÇO 1 (1,5 m) ═══ [LVT virado]
                     [buraco grande: a bolsa do cantil]   ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘ ∘      ═══ TERRAÇO 2 (2,5 m) ═══ [LVT avariado]
                                ⇑ MG do sul (passagem de Rourke: 40 s)             ═══ TERRAÇO 3 (3 m) ═══ (Rourke 10:20)
                     [tanques atolados, NPC]      [REBORDO: buracos de obus · bunker camuflado (MG oculta) · esquadra vizinha]
   ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ SURIBACHI (EXACT; presença; morteiros e MG do sul) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_green_beach` | perto | areia, terraços, LVTs, vagas a chegar | 09:00 → 09:25 quase sem fogo |
| `s2_terraces` | perto | três degraus de cinza, buracos de obus, o LVT avariado | 09:25 → 10:20 |
| `s3_isthmus` | perto (comprimido) | buracos de aranha, cinza, a passagem exposta | 11:30 → 14:00 |
| `s4_west_coast` | perto | plataforma, promontórios, o outro mar, o corredor | 14:20 → 18:00 |
| `s5_mid` | médio | outras praias, grupos em avanço, tanques atolados, a esquadra vizinha | sim |
| `s6_far` | longe | frota, o Suribachi com fogo, o planalto norte | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | LVT (cs intro: o monte) | 0 | 08:50 | — |
| 2 | areia → terraço 1 (antes de o fogo começar) | 60 m, +1,5 m | 09:00–09:25 | `obj_m24_first_cover`; CP-A |
| 3 | terraços 1–2: reunir; tripulação do LVT; carregar um ferido; Rourke no terraço 3 | 120 m, +5,5 m | 09:25–10:20 | `obj_m24_rally`; CP-B |
| 4 | terraço 3 → rebordo: caixas à vizinha por saltos; ler o fogo; marcar a seteira | 60 m | 10:20–11:30 | `obj_m24_bring_support`, `obj_m24_locate_fire`; CP-C |
| 5 | rebordo → istmo por saltos; a passagem de Rourke (40 s) | 300 m | 11:30–14:00 | `obj_m24_advance_isthmus`, `obj_m24_wounded_passage`; CP-D |
| 6 | buraco grande (calmaria: a bolsa) | 0 | 14:00–14:20 | `obj_m24_calm` |
| 7 | descida → plataforma da costa oeste: ligar; corredor; duas pressões | 150 m | 14:20–17:30 | `obj_m24_link_consolidate`; CP-E |
| 8 | plataforma ao anoitecer (cs outro: a voz) | 0 | 17:30–18:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Os minutos antes** (cena 2): subir o terraço já (exposto 3 s) vs esperar na base (o fogo começa e apanha a praia); ficar com ≥ 3 homens juntos chama o morteiro depois das 09:25.
- **Ler o fogo** (cena 4): o buraco da direita (vê a seteira; exposto ao morteiro) vs o da esquerda (coberto; não vê); três leituras (impactos, relato, observação) antes de marcar.
- **Istmo** (cena 5): saltos entre buracos; granada nos buracos de aranha que disparam; proteger a passagem de Rourke (40 s de supressão) vs seguir Kessler.
- **Costa oeste** (cena 7): buraco do mar (vê o norte; morteiros) vs buraco da rocha (coberto; cego ao corredor); marcar o corredor com um pano.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| areia molhada | nenhuma; cavar não serve (a cinza escorre) | — |
| terraços | a base de cada terraço: a única cobertura | subir custa 3 s exposto |
| buracos de obus | cobertura total | alguns veem a seteira, outros não |
| bunker camuflado | seteira única; a MG só se vê quando dispara | nunca com marcador |
| istmo | buracos de aranha (alguns vazios), cinza revolvida | a MG do sul (Suribachi) varre por janelas |
| plataforma oeste | buracos de obus, rochas negras | pressões do norte |

Linhas de visão: MG oculta → terraço 3 e rebordo (150–250 m, só por linha); MG do sul → istmo (300 m, janelas 8 s/12 s); morteiros do Suribachi → tudo (por agenda, ≥ 30 m). Regra: a origem do fogo oculto é só flash, som e impactos; a cinza esconde pegadas em 20 s.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| antes das 09:25 | só fogo esparso ≥ 50 m; nenhum tiro direto sobre o jogador |
| 09:25+ | morteiros/artilharia com assobio, ≥ 30 m; MG só sobre linha de visão |
| Rourke (10:20) | fixo no terraço 3 |
| LVT avariado (09:35) | persistente; a tripulação sai |
| tanques atolados | NPC; nunca alvo |
| o bunker | calado pela equipa (lança-chamas/carga, sem plano aberto) |
| limites | o Suribachi (nunca jogável); o planalto norte (aviso); a água além da linha de maré |

## 8. Encenação e objetos por zona

- **LVT** (cs intro): rochas negras; o monte memorizado (3 s); a rampa traseira.
- **Praia/terraços**: pegadas que se desfazem, LVT virado, LVT avariado, equipamento abandonado.
- **Rebordo**: impactos em linha, caixas, o bunker (depois: a seteira negra).
- **Istmo**: buracos de aranha, tanques atolados ao longe; **buraco grande**: a bolsa do cantil "SALAS E.", um capacete.
- **Costa oeste**: o outro mar, o pano no corredor, reforços a chegar.
- **Anoitecer** (cs outro): Finch de costas para o monte; a bolsa guardada.
- Persistentes: LVTs, tanques, buracos de obus, o bunker calado, a bolsa (`salas_item_by`).

## 9. Luz, tempo e som por zona

Sol calculado (24,78 N 141,32 E, UTC+9 — fuso P-C24; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 08:50 | 124° | 33° | manhã clara e fresca; sol atrás da frota (contraluz no mar) |
| 11:50 | 181° | 54° | sol alto; a cinza absorve a luz (sombras fracas) |
| 14:50 | 236° | 33° | sol a oeste sobre o outro mar |
| 16:20 | 250° | 15° | contraluz na costa oeste |
| 17:50 | 260° | −5° | anoitecer; o monte contra o céu com clarões |

Som: LVT (motor; mar; rampa), praia (rebentação → cinza → quase nada), terraços (**o fogo começa** como cadência; ordens entrecortadas), rebordo (tiros concentrados; o lança-chamas curto; a seteira calada), istmo (MG do sul por janelas; tanques a rodar na cinza), buraco grande (lata de água; a rebentação oeste), costa (rebentação perto; pressões abafadas por rocha), anoitecer (silêncio obrigatório).

## 10. Requisitos de produção do nível

- **Tamanho:** 500 × 350 m com três terraços e 12 m de rebordo; o Suribachi em LOD exato.
- **Assets:** LVT-4 (rampa traseira), cinza vulcânica (material com pegadas), terraços, buracos de obus, bunker camuflado, buracos de aranha, Sherman atolado (NPC), rochas negras, o Suribachi.
- **Sistemas (roadmap S5/S7/S11):** cinza como superfície; LVT encenado + veículos avariados persistentes; fogo oculto por impacto.
- **Risco:** 4. **Fallback:** modificador fixo de velocidade; carga em vez de lança-chamas.
- **Medir primeiro:** perfil do istmo e altura dos terraços (fotografias de 1945); limite Green/Red 1 (P-C24).
