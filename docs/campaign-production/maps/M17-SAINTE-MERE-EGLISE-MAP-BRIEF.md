# M17 — ANTES DO AMANHECER (Sainte-Mère-Église, acesso norte) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M17-SAINTE-MERE-EGLISE-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** sem Steele nem a cena da torre; a igreja e a praça `EXACT` em silhueta; a senha e a DZ são P-C17.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | pomar e campos a leste da DZ O, sebes e pátios, a N13 no acesso norte (sentido Neuville-au-Plain), orla de Sainte-Mère-Église (≈ 49,41 N 1,32 W); madrugada de 6/6/1944 |
| Classe global | igreja, praça e traçado da N13 `EXACT` (Overture); pomar, sebes, pátios e o bloqueio `RECONSTRUCTED` (P-C17) |
| O que medir depois | Overture (N13, a cidade, campos), fotografia aérea de 1944 (sebes), DZ O e o stick (P-C17) |
| Origem proposta | o bloqueio de estrada no acesso norte: `(0, 0, 0)` ao nível da N13 |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul (a cidade a +Z, 500 m; Neuville-au-Plain a −Z) |
| Área jogável | X −400…+500 · Z −400…+200; o pomar de aterragem a nordeste (x +350, z −250); a cidade só orla (z +450) |
| Compressões declaradas | pomar → bloqueio 600 m (dossiê) a confirmar contra a DZ O real; a cidade a 500 m |
| Relógio | 01:15 → 06:10 (nascer ≈ 05:58) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m)

```
     N  ⇑ Neuville-au-Plain (N13): reação inimiga por vias coerentes (sondas 04:50/05:05; pressão 05:15)
   ║ N13 ║  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ║      ║  ·  ·  sebes ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋  ♣ ♣ ♣ POMAR (aterragem dispersa, 01:40) ♣ ♣ ♣
   ║      ║  ·  ·  ≋ [quinta: pátio] ≋  caminho de quinta ≋≋≋  ♣ ♣ (Harker a 80 m; Dunning a 150 m) ♣
   ║      ║  ·  ·  ≋≋≋≋≋≋≋≋≋ patrulha alemã (02:40) ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋
   ╬══════╬═ BLOQUEIO ⊙ ORIGEM (0,0,0): grupo do bloqueio (8); veículo ligeiro intercetado ═════════
   ║      ║  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ║      ║  ·  ·  ·  ·  mensageiro ⇅ 500 m ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ║      ║  ▒▒▒▒▒▒ orla de SAINTE-MÈRE-ÉGLISE (3/505 a limpar; incêndio) ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
   ║      ║  ▒▒▒▒▒▒▒▒▒ ⌂ igreja e praça (EXACT, silhueta; sem a torre como cena) ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
     S          ⇑ s5: transporte aéreo, flak, clarões
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_orchard_hedges` | perto | pomar, sebes, caminho, pátio de quinta | 01:40 → 03:30 |
| `s2_roadblock` | perto | o bloqueio, a N13, o veículo intercetado | 03:30 → 06:10 |
| `s3_town` | médio | 3/505 a limpar a cidade; incêndio; sons; tomada às 04:45 | sim |
| `s4_dispersed_groups` | médio | grupos dispersos e combates em acessos distintos | sim |
| `s5_sky_flak` | longe | transporte aéreo, flak, clarões | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | C-47 (cs intro) | — | 01:15 | CP-A |
| 2 | salto → pomar | descida; aterragem dispersa | 01:35–01:40 | `obj_m17_jump`; CP-B |
| 3 | pomar → sebes → caminho: reunir por senha | 150–300 m | 01:40–02:30 | `obj_m17_rally`; CP-C |
| 4 | vias e pátios até ao bloqueio; a patrulha | 600 m | 02:30–03:30 | `obj_m17_recon_avoid` |
| 5 | bloqueio ⇄ orla da cidade (mensageiro) ; veículo ligeiro intercetado | 500 m ida e volta | 03:30–04:30 | `obj_m17_link_groups`, `obj_m17_block_access`; CP-D |
| 6 | bloqueio: sondas e pressão | — | 04:30–05:45 | `obj_m17_hold`; CP-E |
| 7 | bloqueio ao amanhecer (cs outro: a chamada) | 0 | 05:45–06:10 | — |

## 5. Rotas alternativas e decisões espaciais

- **Salto** (cena 2): pequenas correções; aterragem no pomar (nunca na cidade nem na árvore da torre).
- **Senha** (cena 3): reunir pela voz ("Flash"/"Thunder" se confirmado — P-C17); Harker a 80 m, Dunning a 150 m, dois de outro stick; o equipamento de Marchand numa sebe.
- **Patrulha** (cena 4): contornar pelo pátio da quinta (lento; silencioso) ou emboscada curta no caminho (rápido; ruído); a missão segue em ambos.
- **Bloqueio** (cena 5): correr como mensageiro à orla da cidade e voltar; interromper um veículo ligeiro no acesso (posição do bloqueio na curva).
- **Defesa** (cena 6): rotação por salvas entre a sebe do bloqueio e a valeta; não matar cada soldado escondido.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| pomar | macieiras (troncos) | escuro legível com lua entre nuvens |
| sebes | taludes com sebe 1,5–2 m: cobertura total e oclusão | passagens raras |
| caminho de quinta | valetas | a patrulha vem por aqui |
| pátio de quinta | muros, um celeiro | contorno silencioso |
| bloqueio | sebe, valeta, o veículo intercetado | vê 200 m de N13 para norte |
| orla da cidade | muros de jardim | a cidade é dos outros |

Linhas de visão: bloqueio → N13 (200 m para norte; 100 m para sul); pomar cego para tudo; a igreja como silhueta a 500 m. Regra: de noite a IA ouve antes de ver; sebes bloqueiam visão e som.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| flak e transporte aéreo | só céu; clarões; nunca sobre o jogador |
| aterragem | rolamento automático; sem dano; nunca na árvore nem na cidade |
| patrulha (02:40) | 6 homens numa via coerente; contornável |
| veículo ligeiro (03:50) | intercetado no bloqueio; não é "boss" |
| sondas (04:50; 05:05) e pressão (05:15) | pelo norte, pela N13 e sebes; dados |
| a cidade | tomada pelo 3/505 às 04:45 sem Cole; nunca jogável além da orla |
| limites | além das sebes a leste/oeste (aviso); a N13 para norte além de 300 m |

## 8. Encenação e objetos por zona

- **C-47** (cs intro): luzes vermelhas, a porta, o toque no ombro, "Contei cinco antes de…".
- **Pomar**: paraquedas nas macieiras; o cordel do salto; o equipamento de Marchand numa sebe (musette com o nome).
- **Bloqueio**: o veículo ligeiro intercetado; a sebe; a valeta.
- **Amanhecer** (cs outro): a chamada com faltas; a musette fechada com o cordel; moradores a sair ao fundo; o incêndio da noite.
- Persistentes: paraquedas, o veículo, posições do bloqueio.

## 9. Luz, tempo e som por zona

Sol calculado (49,41 N 1,32 W, UTC+2; a validar): noite até ~05:00 (el −17° às 02:15; −6° às 05:15; nascer ≈ 05:58). Luz: luz vermelha do avião; lua quase cheia entre nuvens (legível); clarões de flak; o incêndio na cidade (facto); 05:45 azul → dourado.

Som: avião (motores; a porta), descida (vento; flak ao longe), pomar (vozes baixas; senha), sebes (abafado), caminho (a patrulha), bloqueio (a N13; o veículo; a cidade a 500 m: tiros e o incêndio), amanhecer (pássaros; a chamada).

## 10. Requisitos de produção do nível

- **Tamanho:** 900 × 600 m de bocage noturno + a orla da cidade em LOD.
- **Assets:** C-47 (interior), paraquedas, macieiras, sebes com taludes, quinta normanda, bloqueio, veículo ligeiro alemão, igreja/praça em silhueta, incêndio.
- **Sistemas (roadmap S15/S4-lite):** paraquedas com controlo limitado; senha como interação de fala; veículo NPC; noite com lua entre nuvens.
- **Risco:** 3. **Fallback:** descida em cutscene.
- **Medir primeiro:** N13 e a orla da cidade (Overture); a DZ O e o stick (P-C17) para fixar o pomar.
