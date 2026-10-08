# M14 — ESTRADAS SICILIANAS (eixo Gela–Niscemi) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições; **depende da bancada de jeep do Marco 4**. **Fonte:** `missions/M14-GELA-NISCEMI-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** a missão é o comboio de suprimento do dia seguinte (14/7), não a tomada de Niscemi; troço exato pendente (P-C14).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | estrada secundária de Gela para Niscemi (Sicília, ≈ 37,10 N 14,35 E), 14/7/1943; Niscemi no alto |
| Classe global | relevo e silhueta de Niscemi `EXACT` (DEM/Overture); o troço, o aqueduto, a masseria e a quinta Scirè `RECONSTRUCTED` |
| O que medir depois | Overture (estradas Gela–Niscemi, curvas, pontes), DEM (subida para Niscemi), fotografia aérea de 1943 (P-C14) |
| Origem proposta | o ponto de partida do comboio (cena 1): `(0, 0, 0)` |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul; o eixo da estrada sobe para norte-nordeste (Niscemi); o esquema está rodado |
| Área jogável | a estrada em **troços** (8 km reais percorridos em 4 segmentos jogáveis: 4 km de condução; 300 m de reconhecimento a pé; olival 400 m; 3 km finais em condução com entrega); largura jogável 200–400 m em torno da estrada |
| Compressões declaradas | troços de condução com elipses curtas entre eles (cartela de km); o pátio da quinta e o olival em escala real |
| Relógio | 07:00 → 13:00 |

## 2. Planta esquemática (rodada: a estrada sobe da esquerda para a direita; 1 carácter ≈ 100 m)

```
   GELA ⇐ ⊙ PARTIDA (0,0,0) ══ 4 km: curvas, muros, ponte pequena, subida ══╳ AQUEDUTO (cratera de 12/7;
   [2 jeeps + 1 camião]        camião de outra unidade cruza (07:20)         camião italiano capotado)
                                                                              ║ bloqueio
                                                            caminho de quinta ╚══ 300 m a pé ══► [MASSERIA]
                                                                                                    ║
                                  ♣ ♣ ♣ ♣ ♣ ♣ OLIVAL (retardatários HG, 08:50) ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ♣ ╝
                                  ♣ muro ▬▬▬ (reposicionar os suprimentos atrás do muro) ♣ ♣ ♣ ♣ ♣
                                                      ║
                                      ┌───────────────╨──────────────┐
                                      │ QUINTA SCIRÈ: a estrada      │  (09:40) família; Salvatore; a mala
                                      │ atravessa o pátio; telhado   │
                                      │ parcialmente destruído       │
                                      └───────────────╥──────────────┘
                                                      ║ 3 km (segundo grupo cobre a via; posição residual 11:00)
                                                      ╚══════════════► [NISCEMI, no alto: escola = posto] (12:00)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_convoy` | perto | os três veículos, a estrada, o aqueduto, a masseria, o olival, o pátio, a escola | agenda 07:00 → 12:00 |
| `s2_other_roads` | médio | patrulhas e comboios noutras estradas (camião que cruza às 07:20) | agenda |
| `s3_access_road` | médio | segundo grupo que cobre a via; posição alemã residual (11:00), resolvida por eles | sim |
| `s4_sky_far` | longe | movimento aéreo, fumo, fogo de apoio pertinente | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | partida (cs intro: o espelho) | 0 | 07:00 | CP-A |
| 2 | 4 km de estrada em condução, com distância entre veículos | 4 000 m | 07:05–07:40 | `obj_m14_drive` |
| 3 | aqueduto bloqueado → 300 m a pé até à masseria → informar | 300 m | 07:40–08:40 | `obj_m14_recon_alt`; CP-B |
| 4 | caminho de quinta pelo olival: contacto; proteger carga e passageiros | 400 m | 08:40–09:40 | `obj_m14_protect_convoy`; CP-C |
| 5 | pátio da quinta Scirè (cs family) | 0 | 09:40–10:30 | custo humano |
| 6 | pátio → Niscemi (escola), com o segundo grupo a cobrir | 3 000 m | 10:30–12:00 | `obj_m14_deliver`; CP-D |
| 7 | escola (cs outro) | 0 | 12:00–13:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Condução** (cena 2): manter 30–50 m entre veículos (indicador discreto); curvas e muros físicos; o camião que cruza obriga a encostar.
- **Bloqueio** (cena 3): não há volta pela estrada; o caminho de quinta é a alternativa; reconhecer a pé antes de meter os veículos.
- **Olival** (cena 4): usar o jeep para reposicionar os suprimentos atrás do muro (condução sob fogo) ou proteger a retaguarda a pé enquanto outros o fazem.
- **A estrada passa pela casa** (cena 5): a rota segura dos moradores é pelo muro, atrás do camião; Doyle grita, Price mostra o caminho.
- **Entrega** (cena 6): a posição residual é do segundo grupo; o comboio não para para a resolver.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| estrada entre muros | muros de pedra 1,2–1,8 m (cobertura total para peões; os veículos ficam expostos por cima) | curvas cegas |
| aqueduto | a cratera; o camião italiano | — |
| caminho de quinta | muros baixos, valetas | olival à vista |
| olival | troncos de oliveira (largos; param tiros), o muro | os retardatários a 80–150 m numa posição coerente |
| pátio da quinta | casa, muro, o camião como anteparo | a estrada atravessa-o |
| estrada final | muros; Niscemi no alto | a posição residual a 400 m, resolvida pelo segundo grupo |

Linhas de visão: olival → caminho (150 m); pátio → estrada em dois sentidos (100 m); Niscemi vê o vale (silhueta). Regra: os veículos não "param" tiros para quem está dentro; a lona do camião não protege.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| condução | colisão com muros e veículos (dano ao jeep, não ao jogador); sem precipícios na estrada jogável |
| retardatários HG (08:50) | 4 homens; fogo sobre o camião e passageiros; dados; não perseguir |
| posição residual (11:00) | à distância; do segundo grupo |
| civis | nunca alvo; Salvatore atravessa com a mala por agenda |
| limites | fora da estrada e do olival (aviso); Niscemi só o posto |

## 8. Encenação e objetos por zona

- **Partida** (cs intro): o espelho do jeep (Lane vê-se); Price com o homem do pé ferido.
- **Aqueduto**: cratera de 12/7, camião italiano capotado, cartuchos antigos.
- **Masseria**: um pátio vazio; uma cisterna; a porta fechada.
- **Olival**: posição dos retardatários; o muro; a carga reposicionada.
- **Quinta Scirè** (cs family): telhado destruído, a mala de Salvatore, a família a desconfiar.
- **Escola** (cs outro): o destinatário confere; o velho com a perna ligada; a casa ocupada por outra família.
- Persistentes: a cratera, o camião capotado, a carga danificada ou intacta (`integridade`).

## 9. Luz, tempo e som por zona

Sol calculado (37,15 N 14,39 E, UTC+2; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 07:00 | 71° | 12° | sol baixo a leste; sombras longas nos muros; cigarras |
| 09:00 | 88° | 35° | luz dura no olival |
| 11:00 | 110° | 58° | haze de calor |
| 13:00 | 173° | 75° | zénite |

Som: estrada (motor do jeep, pneus na terra, muros a refletir), aqueduto (silêncio; moscas), olival (cigarras; tiros a 80–150 m; o motor sob fogo), pátio (vozes em siciliano, a mala), estrada final (o segundo grupo ao longe), escola (silêncio de meio-dia).

## 10. Requisitos de produção do nível

- **Tamanho:** 8 km de estrada em quatro troços jogáveis (corredor de 200–400 m), olival 400 × 200 m, pátio 60 × 40 m.
- **Assets:** jeep (bancada), camião GMC, muros de pedra seca (instâncias), aqueduto, camião italiano, masseria, oliveiras, quinta siciliana com telhado destruído, Niscemi em silhueta.
- **Sistemas (roadmap S8/S4/S7):** bancada de jeep [C] (condução, distância entre veículos, condução sob fogo); civis com rotas; veículos NPC.
- **Risco:** 5 (bancada). **Fallback:** nenhum para a condução; civis em cutscene.
- **Medir primeiro:** o troço real e a subida (P-C14) para fixar os quatro segmentos.
