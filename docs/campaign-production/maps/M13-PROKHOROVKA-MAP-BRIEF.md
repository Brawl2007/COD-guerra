# M13 — AÇO (Prokhorovka, sovkhoz Oktyabrsky / cota 252.2) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições; **depende da bancada de tanque do Marco 4**. **Fonte:** `missions/M13-PROKHOROVKA-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** a vala antitanque não é encenada como facto; brigada/modelo/clima pendentes (P-C13).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | campos a sudoeste de Prokhorovka ao longo do aterro ferroviário, sovkhoz Oktyabrsky e cota 252.2 (≈ 51,02 N 36,70 E); 12/7/1943 |
| Classe global | relevo, aterro e sovkhoz `EXACT` em posição relativa (DEM e Overture; a linha férrea persiste); posições e sequência `RECONSTRUCTED` (P-C13) |
| O que medir depois | DEM GLO-30 (cota 252.2, ondulação), Overture (linha férrea, estrada, o sovkhoz atual), mapas de 1943 (balkas) |
| Origem proposta | a área de reunião junto do aterro: `(0, 0, 0)` |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul. **O eixo de ataque aponta a sudoeste (azimute ≈ 225°)**; o esquema abaixo está rodado para o pôr na horizontal |
| Área jogável | ≈ 3 200 m ao longo do eixo × 1 000 m de largura; o aterro ferroviário à direita do eixo (noroeste) como limite |
| Compressões declaradas | "3 km de campos + sovkhoz" (dossiê): compatível com a geografia real; nenhuma compressão declarada até P-C13 |
| Relógio | 07:30 → 13:40 |

## 2. Planta esquemática (rodada: o ataque vai da direita para a esquerda; 1 carácter ≈ 80 m)

```
  ⇖ NW                   ════════════ ATERRO FERROVIÁRIO (limite direito do eixo) ═══════════════════
   ▓ [cota 252.2]  ▓▓                                                                        ⊙ ÁREA DE
   ▓▓ [SOVKHOZ: silo, edifícios]  ·  ·  · depressões · ·  balka  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  REUNIÃO
   ▓ ponto de reunião (atrás do aterro) ⇐ manobra final ⇐ [depressão: torre lenta; o tanque vizinho a arder]
   ·  ·  ·  ·  ·  ·  posições AT alemãs ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (07:30)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  linha de partida (08:30)
   ·  ·  ·  ·  infantaria motorizada a seguir  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  brigada em coluna (2 km de marcha) ⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐⇐
                                                      aviação e artilharia alemã (s5) ⇑
  ⇙ SW (objetivo)                                                                             NE ⇗ (Prokhorovka)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| tripulação / o tanque | perto | interior (fendas, periscópio), o casco, a torre | — |
| brigada | médio (50–500 m) | coluna, formações vizinhas, veículos que param ou ardem | agenda própria |
| infantaria motorizada | médio | a seguir; toma o edifício do sovkhoz com apoio | sim |
| posições AT e veículos alemães | médio (300–1 200 m) | identificados por Fomin; o Pz IV que atinge o vizinho | dados |
| artilharia e aviação alemã | longe | impactos nos campos; aviões | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | área de reunião (cs intro: escotilha) | 0 | 07:30 | — |
| 2 | marcha em coluna até à linha de partida | 2 000 m | 07:45–08:30 | `obj_m13_drive`; CP-A |
| 3 | linha de partida → campos → orla do sovkhoz (decisão: depressão vs faixa exposta) | 1 000 m | 08:30–09:45 | `obj_m13_first_contact`; CP-B |
| 4 | orla: avaria recuperável; reposicionar na depressão | 100 m | 09:45–10:30 | `obj_m13_damage`; CP-C |
| 5 | depressão: o tanque vizinho a 60 m (cs neighbor) | 0 | 10:30–11:00 | custo humano |
| 6 | depressão → flanco do sovkhoz → edifícios → reunião atrás do aterro | 600 m | 11:00–12:40 | `obj_m13_final_maneuver`; CP-D |
| 7 | reunião; motor desligado (cs outro: a chamada) | 0 | 12:40–13:40 | — |

## 5. Rotas alternativas e decisões espaciais

- **Marcha** (cena 2): manter distância na coluna; valas e o aterro limitam (a bancada ensina inércia e torre independente).
- **Primeiro confronto** (cena 3): cobertura por depressão (lenta; protegida) vs apoiar a infantaria numa faixa mais exposta (rápida; AT).
- **Torre lenta** (cena 4): girar o casco para apontar (Grach com a manivela); escolher a depressão onde reposicionar.
- **O tanque que arde** (cena 5): disparar ao Pz IV (cortaria a saída dos sobreviventes) vs cobrir a zona (HE sobre a infantaria que os caça; fumo) e permitir a saída.
- **Manobra final** (cena 6): flanco do sovkhoz pela depressão (coberto) vs pela estrada (rápido; AT).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| aterro ferroviário | cobertura total de um lado; obstáculo | limite do eixo |
| depressões/balkas | casco abaixo do horizonte (hull-down) | a torre lenta obriga a girar o casco |
| campos | nenhuma; poeira e fumo | AT a 300–1 200 m |
| sovkhoz | edifícios de tijolo, silo | a infantaria toma o edifício |
| ponto de reunião | atrás do aterro | — |

Linhas de visão: AT alemão → campos (até 1 200 m); da depressão → orla do sovkhoz (300 m); o tanque vizinho a 60 m (pela fenda). Regra: poeira e fumo reduzem a visão sem apagar silhuetas; sem glare às 08:30 (S-C06: sol a leste, atrás da brigada).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| artilharia/aviação alemã | impactos ≥ 30 m do tanque; aviso pelas sombras e assobio |
| posições AT | identificadas por Fomin; fogo como dados sobre linha de visão |
| avaria (09:45) | impacto no anel da torre: recuperável (rotação lenta), nunca destruição |
| perda do tanque | se o tanque arder, **restaurar CP-C** (saída a pé não projetada) |
| o tanque vizinho (60 m) | sobreviventes nunca atingíveis pelo jogador; o Pz IV a 400 m |
| limites | o aterro (direita); além do sovkhoz (fogo AT; aviso) |

## 8. Encenação e objetos por zona

- **Interior** (cs intro/outro): luz pelas fendas, poeira, metal a estalar com o motor desligado; a escotilha; a chamada.
- **Campos**: dois tanques da formação vizinha param, um arde; veículos imobilizados persistem.
- **Depressão**: o tanque vizinho a arder; 2 saem, 1 ferido, 1 preso; a manivela da torre.
- **Sovkhoz**: o silo, o edifício tomado pela infantaria.
- Persistentes: destroços, o tanque vizinho queimado, crateras.

## 9. Luz, tempo e som por zona

Sol calculado (51,03 N 36,73 E, UTC+3; a validar — nascer ≈ 05:00):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 07:30 | 85° | 25° | sol a leste, atrás da brigada que ataca a SW |
| 09:30 | 110° | 44° | poeira; nuvens de chuva na frente (sem tempestade) |
| 11:30 | 149° | 58° | fumo negro do tanque vizinho |
| 13:30 | 204° | 59° | sol alto; motor desligado |

Som: interior (motor V-2, metal, intercomunicador, a manivela), coluna (motores), campos (AT a bater, impactos de artilharia, aviões), depressão (o fogo do tanque vizinho; homens a gritar), sovkhoz (infantaria; HE), reunião (silêncio com metal a estalar).

## 10. Requisitos de produção do nível

- **Tamanho:** 3 200 × 1 000 m de campos ondulados com o aterro e o sovkhoz.
- **Assets:** T-34/76 (interior e exterior; modelo exato P-C13), Pz IV e AT (proxies), infantaria motorizada, aterro ferroviário, sovkhoz (silo, edifícios), balkas; **licenças e escala verificadas**.
- **Sistema:** bancada de tanque (S8) [C]/[D]: condução com inércia, casco/torre independentes, avaria recuperável, câmara externa em momentos seguros, checkpoints com estado da brigada.
- **Risco:** 5. **Fallback:** nenhum (espera pela bancada).
- **Medir primeiro:** DEM da cota 252.2 e do sovkhoz; posição da brigada e clima (P-C13).
