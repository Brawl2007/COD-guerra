# M15 — ALÉM DO RECIFE (Betio, Red Beach 2) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M15-TARAWA-PRODUCTION-DOSSIER.md`. **Facto útil:** o recife e o cais longo de Betio são `EXACT` em silhueta; a vaga/embarcação, a distância do recife e a maré são P-C15.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Betio, atol de Tarawa (≈ 1,36 N 172,93 E): recife, cais, Red Beach 2; 20/11/1943 |
| Classe global | recife, cais e paliçada `EXACT`/`RECONSTRUCTED`; posições (cratera da MG, posição de troncos) `RECONSTRUCTED` (P-C15) |
| O que medir depois | cartas e fotografia aérea de 1943 (USMC): linha do recife, o cais (≈ 500 m), a paliçada; tabela de marés de 20/11/1943 |
| Origem proposta | a cabeça do cais na areia: `(0, 0, 0)` ao nível da areia |
| Eixos | metros; X+ leste (ao longo da praia), Y+ altura, Z+ sul (para o interior da ilha); o mar/lagoa a −Z |
| Área jogável | X −250…+100 · Z −600 (LCVP no recife) … +80 (posição de troncos); profundidade da água: −1,3 m no recife → 0 na areia |
| Compressões declaradas | 600 jardas de água (≈ 550 m) mantidas; a praia jogável 200 m |
| Relógio | 10:15 → 18:30 (`readyScale` 14:10–17:30) |

## 2. Planta esquemática (norte em cima = a lagoa; 1 carácter ≈ 15 m)

```
     N (lagoa)
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈   navios (s4)
   ≈≈≈≈≈≈≈≈≈ RECIFE ≈≈ [LCVP presa, 10:15] ≈≈ outras LCVP presas ≈≈≈≈≈≈≈≈≈≈≈≈≈≈║≈≈   z −550
   ≈≈ água ao peito ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈║≈≈
   ≈≈ obstáculos de coral ≈≈ (Marchetti preso a 40 m da paliçada) ≈≈≈≈≈≈≈≈≈≈≈≈≈≈║ CAIS
   ≈≈ água à cintura ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈║ de
   ≈≈ joelhos ≈≈ [LVT na areia, a arder] ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈║ madeira
   ______________________ areia ______________________________________________⊙ ORIGEM (0,0,0)
   ▌▌▌▌▌▌▌▌▌▌▌▌▌▌ PALIÇADA de troncos de coqueiro ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌   z +5
   · · (cratera: MG .30 de Dodd/Ferrante, 80 m) · · · · [POSIÇÃO JAPONESA de troncos e areia] · ·  z +40…+80
   · · · · · · · · · · · · · · · · · · · · · · · · (bloqueia o trânsito paliçada ⇄ cais) · · · · ·
   ▓▓▓▓▓▓▓▓▓▓▓▓ interior da ilha: fumo, combate que continua (s5) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_water_beach` | perto | recife, água por profundidades, obstáculos, areia, paliçada | agenda 10:15 → 14:00 |
| `s2_pier` | perto | o cais, a cabeça do cais, barcos a cada ~20 min | 14:00 → 18:30 |
| `s3_adjacent_beaches` | médio | Red 1 / Red 3, veículos com resultados persistentes, outros grupos | sim |
| `s4_ships_support` | longe | navios, fogo de apoio, aeronaves | relógio |
| `s5_island_interior` | médio/longe | fumo, combate que continua | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | LCVP presa no recife (cs intro) | 0 | 10:15 | CP-A |
| 2 | recife → areia: peito → cintura → joelhos; obstáculos de coral | 550 m | 10:20–11:00 | `obj_m15_wade` |
| 3 | paliçada: reunir; cobrir Brandt (Marchetti a 40 m na água) | 60 s de supressão | 11:00–11:45 | `obj_m15_rally`, `obj_m15_cover_brandt`; CP-B |
| 4 | paliçada → cratera da MG com duas caixas | 80 m | 11:45–12:30 | `obj_m15_link_mg`; CP-C |
| 5 | avanço curto contra a posição de troncos (equipa de assalto própria) | 60 m | 12:30–14:00 | `obj_m15_short_advance` |
| 6 | cabeça do cais (cs pier: a LCVP vazia) | 0 | 14:00–14:10 | — |
| 7 | espaço de desembarque/evacuação: 60 m de areia + cabeça do cais | — | 14:10–17:30 | `obj_m15_hold_landing_space`; CP-D |
| 8 | linha de rebentação (cs outro: "Isto era dele.") | 0 | 17:30–18:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Água** (cena 2): pela lateral do cais (cobertura parcial; mais longo) vs direto pela lagoa (exposto; mais curto); com água ao peito não se dispara.
- **Brandt** (cena 3): cobrir um corredor real (suprimir a MG do flanco direito 60 s) enquanto Brandt vai e volta — sem botão de resgate; ou não cobrir (Brandt vai na mesma, mais devagar).
- **Posição de troncos** (cena 5): a equipa de assalto (engenheiros, lança-chamas) faz o trabalho; o jogador cobre a aproximação e evita a zona de perigo do lança-chamas.
- **Cais** (cena 7): cobrir macas que vão para os barcos (lado do cais) vs cobrir homens que chegam (lado da areia); contra-ataques pontuais às 13:30/15:30.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| recife/água | nenhuma balística; a água só abranda | os obstáculos de coral escondem parcialmente |
| LCVP/LVT | cascos (param tiros) | o LVT arde desde 10:15 |
| cais | estacas e tabuleiro (parcial) | abafa o som (silêncio da cena 6) |
| paliçada | troncos de coqueiro 1,5 m: cobertura total | a MG do flanco direito enfia pela ponta |
| cratera da MG | cratera; sacos | vê a posição de troncos a 60 m |
| posição de troncos | troncos e areia; seteiras | bloqueia o trânsito paliçada ⇄ cais |
| cabeça do cais | sacos, caixas, um LVT morto | aberta à lagoa |

Linhas de visão: MG do flanco direito → água e a ponta da paliçada (200 m); posição de troncos → 60 m de areia; cratera → posição; cais → lagoa. Regra: com água ao peito o jogador não dispara nem corre; a IA não vê o que está sob a linha de água dos obstáculos.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| água | profundidade por zona; peso; sem natação; mortos na água cobertos (sem close) |
| MG do flanco direito | só sobre a água e a ponta da paliçada; silencia por supressão (60 s) |
| posição de troncos | fogo sobre os 60 m; a equipa de assalto tem zona de perigo do lança-chamas marcada |
| contra-ataques (13:30; 15:30) | pontuais; dados |
| maré (17:00) | sobe; os obstáculos ficam submersos; a rebentação chega ao equipamento de Reiner |
| limites | lagoa além do recife (bloqueio suave); interior além da posição (fumo; aviso) |

## 8. Encenação e objetos por zona

- **LCVP** (cs intro): o coxswain; os LVT à frente; "Aqueles veículos passaram."
- **Água**: obstáculos de coral, a correia do equipamento (apertada, depois largada).
- **Paliçada**: Brandt e Marchetti; os sobreviventes.
- **Cratera**: a .30; as duas caixas.
- **Cais** (cs pier): a LCVP vazia no recife; o som abafado.
- **Rebentação** (cs outro): a mochila de Reiner com o nome; Marchetti em maca.
- Persistentes: LVT a arder, LCVP presa, posição de troncos tomada, maré.

## 9. Luz, tempo e som por zona

Sol calculado (1,36 N 172,93 E, UTC+12; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 10:15 | 127° | 54° | sol alto; reflexos na água |
| 12:15 | 181° | 69° | zénite quase |
| 14:15 | 233° | 54° | fumo |
| 16:15 | 247° | 27° | luz baixa sobre a lagoa |
| 17:15 | 250° | 13° | pôr do sol ≈ 18:10, laranja; maré a subir |

Som: recife (motor da LCVP; impactos na água; MG abafada pela água), areia (tiros a 40–200 m), paliçada (troncos; respiração), cratera (a .30), posição (cargas; lança-chamas curto), cais (abafado: silêncio obrigatório), fim (rebentação; a maré).

## 10. Requisitos de produção do nível

- **Tamanho:** 350 × 680 m, dos quais 550 m de água com profundidade variável.
- **Assets:** LCVP, LVT (na areia, a arder), obstáculos de coral, cais de madeira (≈ 500 m), paliçada de troncos, cratera, posição japonesa de troncos, navios em silhueta.
- **Sistemas (roadmap S6):** água rasa/vadear (profundidade, peso, sem disparo ao peito); LVT/LCVP NPC; maré (estado às 17:00).
- **Risco:** 4. **Fallback:** água como lama lenta por zona; maré por troca de estado.
- **Medir primeiro:** distância do recife à praia e o cais (P-C15); maré de 20/11/1943.
