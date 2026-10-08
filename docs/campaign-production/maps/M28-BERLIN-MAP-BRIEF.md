# M28 — ÚLTIMOS QUARTEIRÕES (Berlim, a sul do Tiergarten) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M28-BERLIN-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** quarteirão `RECONSTRUCTED` com classificação explícita em cartela; sem Reichstag; a rua principal é dos blindados (nunca jogável a 2/5); rendições persistem; P-C28 (quarteirão, hora local, contexto de perseguição com fonte).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | quarteirão a sul do Tiergarten, junto do canal Landwehr (≈ 52,50 N 13,36 E); 1–2/5/1945 |
| Classe global | `RECONSTRUCTED` (quarteirão-tipo de prédios de rendimento de 5 pisos com Hinterhöfe); `EXACT` o canal, a ponte batida e a direção do Tiergarten (Overture) |
| O que medir depois | Overture (quarteirões junto do Landwehr; pontes), cadastro de 1940 (Hinterhöfe), fotografia de maio de 1945; P-C28 |
| Origem proposta | a escada do abrigo (`Luftschutzraum`) no pátio do primeiro prédio: `(0, 0, 0)` ao nível do pátio |
| Eixos | metros; X+ leste, Y+ altura (cave −3 m; 5 pisos +17 m; sótão +20 m), Z+ sul (o canal a +Z) |
| Área jogável | X −80…+220 · Z −60…+160: três pátios ligados, um prédio de 5 pisos, a oficina, o arco de saída; a rua principal e a ponte só vistas |
| Compressões declaradas | nenhuma; o quarteirão é compacto por desenho (300 × 220 m) |
| Relógio | 1/5 09:00→19:00 (+ noite) · 2/5 05:30→11:00 (hora de Moscovo; local pendente) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 10 m)

```
     N   ⇖ Tiergarten (s6: o Reichstag só por relato)                          incêndios ⇗
   ═════════════════ RUA PRINCIPAL (blindados 2/5; MG; atirador no telhado da esquina) ═════════════════════
   ┌──────────┐ arco ┌──────────┐ parede aberta ┌──────────────┐ portão ┌────────────┐
   │ PRÉDIO 1 │══════│ PRÉDIO 2 │═══════════════│ PRÉDIO-ALVO  │════════│ ESQUINA    │
   │ (abrigo  │      │          │               │ 5 pisos ·    │        │ (atirador  │
   │  na cave)│      │ [cave:   │               │ 2 escadas ·  │        │  no telhado│
   └────┬─────┘      │  gente]  │               │ sótão (MG)   │        └────────────┘
   ┌────┴─────────┐  └────┬─────┘               └──────┬───────┘
   │ PÁTIO 1 ⊙    │ ═════ │ PÁTIO 2 ════ [OFICINA: portão de ferro, postigo] ════ PÁTIO 3 (grupo vizinho)
   │ posto de     │       │ roupa estendida · bicicletas · aviso meio arrancado · cartazes rasgados
   │ Kravets      │       └───────────────────────────────────────────────────────────────────
   └──────────────┘                     ⇓ ARCO DE SAÍDA (atirador por janelas de 10 s) ⇒ rua já segura (vizinha)
   ═════════════════════════════════════ CANAL LANDWEHR · ponte batida (só vista) ═════════════════════════
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_shelter_yard` | perto | abrigo, pátio 1, o posto | 09:00; 2/5 06:50 |
| `s2_courtyards` | perto | três pátios, arcos, portões, a oficina fechada | 09:15 → 11:00 |
| `s3_building` | perto, vertical | 5 pisos, duas escadas, patamar com barricada, sótão | 11:00 → 14:00 |
| `s4_exit_arch` | perto | o arco, a rua segura, o toldo do posto | 14:00 → 16:30 |
| `s5_street_canal` | médio | a rua principal, a ponte batida, blindados NPC | relógio |
| `s6_city_far` | longe | incêndios, baterias, altifalantes, o Reichstag só por relato | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | abrigo (cs intro: "Posso sair?" — "Ainda não.") | 0 | 1/5 09:00 | — |
| 2 | pátio 1 → arco → pátio 2 (a oficina fechada) → parede aberta/arco → pátio 3 (vizinha) | 150 m | 09:15–11:00 | `obj_m28_recon`, `obj_m28_link`; CP-A, CP-B |
| 3 | prédio-alvo: escada de serviço → patamar → 2.º piso (família) → 3.º (Petrenko) → sótão | vertical, +20 m | 11:00–14:00 | `obj_m28_local_defense` |
| 4 | prédio → pátios → arco de saída (civis por grupos; Petrenko na maca) → posto | 200 m | 14:00–16:30 | `obj_m28_evacuate_civilians`, `obj_m28_evacuate_wounded`; CP-C |
| 5 | janelas do prédio: consolidar; contar setores; noite | 0 | 16:30–19:00 | `obj_m28_consolidate`; CP-D |
| 6 | janelas: confirmar a ordem; setores a recuar | 0 | 2/5 05:30–06:40 | `obj_m28_confirm_ceasefire`; CP-E |
| 7 | pátio 2: a porta da oficina (cs/jogável) | 30 m | 06:40–06:50 | `obj_m28_door` |
| 8 | pátio 1 (cs outro: "Posso sair?" — "Sim.") | 60 m | 06:50–08:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Pátios** (cena 2): parede aberta (rápida; vista do telhado 3 s) vs arco (coberto; passa junto de uma cave com gente — "cave é gente, pátio é passagem").
- **Prédio** (cena 3): escada de serviço (estreita; coberta) vs principal (vista do patamar); abrir a porta da casa de banho com a arma baixa ou passar; o rapaz da HJ foge e ninguém o persegue.
- **Saída** (cena 4): verificar o arco; cobrir; marcar com um pano; sinal por grupos de quatro no intervalo de 10 s; entrar no abrigo com a arma baixa (senão ninguém sai).
- **Janelas** (cenas 5–6): janela da rua (vê o canal; exposta) vs do pátio (coberta; cega); responder só a quem dispara.
- **A porta** (cena 7): aproximar-se e ordenar vs cobrir enquanto Gusev intervém — ambas mantêm o prisioneiro vivo.

## 6. Cobertura, linhas de visão e oclusão (vertical)

| Zona | Cobertura | Observações |
| --- | --- | --- |
| abrigo | cave abobadada; −3 m | nenhum tiro entra |
| pátios | muros, arcos, portões | cegos para a rua; abertos ao céu |
| parede aberta | nenhuma 3 s | vista do atirador do telhado |
| prédio | paredes, patamares, barricada de móveis, apartamentos | oclusão por piso |
| sótão | telhas; a MG (até se render) | domina o pátio e a rua |
| arco de saída | portais | o atirador do prédio seguinte bate-o por janelas de 10 s |
| oficina | portão de ferro com postigo | — |

Linhas de visão: atirador do telhado → parede aberta e rua (100 m); MG do sótão → pátio e rua; atirador do arco → arco (80 m); blindados → fachadas da rua principal. Regra: a IA não vê através de paredes nem soalhos; caves nunca são posições; o cessar-fogo é por setor (mistura sonora por direção).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| atirador do telhado / MG da rua (1/5) | só sobre a parede aberta e a rua |
| defensores do prédio | por piso; recuam para cima; o sótão rende-se à vizinha |
| Petrenko (12:30) | fixo no 3.º piso |
| o rapaz da HJ | nunca atingível (bala à parede) |
| atirador do arco | janelas de 10 s |
| blindados (2/5) | fachadas da rua principal; ≥ 30 m; nunca nos pátios |
| 2/5 06:20 | o último atirador cessa por agenda; os que largam as armas nunca são alvo |
| civis | nunca atingíveis; não saem com armas apontadas |
| limites | a rua principal (nunca a 2/5); o canal; além do pátio 3 (vizinha) |

## 8. Encenação e objetos por zona

- **Abrigo** (cs intro/outro): bancos, malas, candeeiros, a placa, a braçadeira branca; a escada por onde Frau Lehmann sobe no fim.
- **Pátios**: roupa estendida, bicicletas, cartazes rasgados, o aviso meio arrancado (contexto só no debrief, com fonte), armas no chão a 2/5.
- **Prédio**: barricada de móveis, mesas postas, a casa de banho fechada, o sótão.
- **Arco/posto**: o pano, o toldo, macas, água numa panela; o posto muda de aspeto a 2/5.
- **Oficina** (a porta): o portão de ferro, o postigo, a pistola na mesa, quatro homens sentados.
- Persistentes: barricada, parede aberta, sótão, armas no chão, lençóis nas janelas, rendidos (nunca reativam).

## 9. Luz, tempo e som por zona

Sol calculado (52,51 N 13,36 E; hora de Moscovo UTC+3 — P-C28; a validar):

| Hora (Moscovo) | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 1/5 09:00 | 92° | 20° | manhã com fumo; poeira pela escada da cave |
| 13:00 | 155° | 50° | interiores com luz de janelas partidas |
| 17:00 | 240° | 39° | fim de tarde |
| 19:00 | 267° | 22° | incêndios ao anoitecer (pôr do sol ≈ 20:50) |
| 2/5 06:30 | 62° | −1° | madrugada cinzenta a abrir (nascer ≈ 06:40) |
| 09:30 | 98° | 25° | a cidade sem barragem |

Som: abrigo (candeeiro; criança; **nenhum tiro**), pátios (reverberação de fachadas; portões), prédio (escadas; granada abafada; a família atrás da porta; a MG por cima), arco (civis; o atirador por janelas), noite (tiros esparsos por setor; rádio aos pedaços), 2/5 (**altifalante → confirmação → setores a diminuir → metal a cair → passos → choro → uma voz civil clara; nunca mute**), oficina (a porta de ferro; a voz do Feldwebel), fim (a escada; a cidade sem barragem; nunca silêncio total).

## 10. Requisitos de produção do nível

- **Tamanho:** 300 × 220 m com cave, cinco pisos jogáveis parciais e sótão; a cidade em LOD.
- **Assets:** prédios de rendimento (fachadas abertas, Hinterhöfe, escadas, sótão), abrigo com placa, oficina com portão de ferro, barricada, elétrico tombado, ponte batida (vista), Panzer IV/StuG (NPC), lençóis, altifalante.
- **Sistemas (roadmap S12/S3/S4/S9):** cessar-fogo por setores (estado coordenado + mistura por direção), `SURRENDERED` persistente, civis em abrigo com estados, interiores verticais (reutiliza M10/M03).
- **Risco:** 4. **Fallback:** desativação agendada por grupo; saída de civis em cutscenes curtas.
- **Medir primeiro:** um quarteirão real junto do Landwehr (cadastro 1940) para a planta-tipo; hora local do cessar-fogo e contexto com fonte (P-C28).
