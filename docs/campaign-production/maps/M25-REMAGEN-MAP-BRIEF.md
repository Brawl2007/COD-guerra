# M25 — PONTE AINDA DE PÉ (Remagen, ponte Ludendorff) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M25-REMAGEN-PRODUCTION-DOSSIER.md`. **Facto útil:** a ponte é `EXACT` (325 m, quatro torres; as torres existem hoje) e reutiliza a estrutura jogável de M01; posição da Cia. A, cratera e túnel são P-C25.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Remagen (≈ 50,58 N 7,24 E): a cidade na margem oeste, a ponte Ludendorff, Erpel e o túnel de Erpeler Ley na margem leste; 7/3/1945 |
| Classe global | ponte, torres, margens e o Reno `EXACT` (Overture/DEM; as torres e os encontros persistem); a cratera na rampa, as posições e a encosta de partida `RECONSTRUCTED` (P-C25) |
| O que medir depois | Overture (torres, encontros, ruas de Remagen, estrada da margem leste, a boca do túnel), DEM (a encosta oeste; a Erpeler Ley), plantas da ponte (vãos: 2 × 85 m laterais + 156 m central — a confirmar) |
| Origem proposta | o encontro oeste da ponte (base da torre oeste norte): `(0, 0, 0)` ao nível do tabuleiro, como em M01 |
| Eixos | metros; X+ leste (ao longo da ponte, para a margem leste), Y+ altura, Z+ sul |
| Área jogável | X −900 (encosta) … +500 (margem leste) · Z −200…+200; a ponte X 0…+325; o túnel a X +450 (só a boca) |
| Compressões declaradas | nenhuma na ponte; a cidade (400 m de ruas) e a encosta são `readyScale`; o túnel nunca entrado |
| Relógio | 13:40 → 17:00 (+ cartela 22:00) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m)

```
     N
   ▲ ENCOSTA (cs intro: a ponte inteira) ▲   ▒▒ REMAGEN: ruas, praça, lençóis às janelas ▒▒        ⇗ Erpeler Ley (paredão)
   ▲ half-tracks parados (13:40)          ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒         ▲▲▲▲ atiradores ▲▲▲▲
                                            ┃ rampa oeste: CRATERA ✕ ┃                             ▲▲ [TÚNEL: boca; nunca] ▲▲
   ════════════ estrada ══════════ [T.W.N]═╪═══════════ PONTE LUDENDORFF 325 m ═════════╪═[T.E.N] ═══ estrada da margem ═══
                                   ⊙ ORIGEM  pranchas · fios ao longo do ferro · engenheiros    │ MG (calada 15:50)   [rendido]
                                   [T.W.S]═╪════ troços partidos (viga lateral + guarda-corpo) ═╪═[T.E.S] (escada jogável)
   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ RENO ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
     S         s7: baterias alemãs; retirada por vias distintas                     15:40: a ponte ergue-se e assenta
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_hillside` | perto (intro) | a ponte inteira, a cidade, o Reno | 13:40 |
| `s2_town` | perto | ruas, praça, lençóis, a rampa ao fundo | 13:50 → 15:00 |
| `s3_west_ramp` | perto | cratera, pranchas, torres oeste | 15:00 → 15:40 |
| `s4_bridge_deck` | perto | 325 m de tabuleiro, troços partidos, engenheiros, cargas | 15:41 → 15:55 |
| `s5_east_access` | perto | torres leste, margem, boca do túnel, o rendido | 15:55 → 17:00 |
| `s6_mid` | médio | combates na outra margem, fluxo de tropas e veículos, engenheiros | relógio |
| `s7_far` | longe | baterias alemãs, retirada por vias distintas, o Reno a montante/jusante | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | encosta (cs intro: o espanto) | 0 | 13:40 | — |
| 2 | ruas → esquina com vista para a rampa; observar 10 s; relatar | 400 m | 13:50–15:00 | `obj_m25_approach`; CP-A |
| 3 | torre oeste (janela do piso 1): cobrir a equipa pela borda da cratera; engenheiros avançam | 0 | 15:00–15:30 | `obj_m25_cover_access`; CP-B |
| 4 | borda da cratera: 15:40 (cs 1540: a mão no guarda-corpo) | 0 | 15:38–15:41 | — |
| 5 | tabuleiro: saltos entre vigas; travessia lateral nos troços partidos; não amontoar | 325 m | 15:41–15:55 | `obj_m25_cross`; CP-C |
| 6 | base da torre leste norte (cs pow: o rendido) → 20 m até à margem | 20 m | 15:55–16:05 | `obj_m25_pow` |
| 7 | torre leste sul (escada, 2 pisos) → tabuleiro (transmitir a marcação) → margem (posicionar; o grupo seguinte) | 150 m | 16:05–17:00 | `obj_m25_towers`, `obj_m25_link`, `obj_m25_next_group`; CP-D |
| 8 | margem à noite (cs outro: suprimentos) | 0 | 22:00 (cartela) | — |

## 5. Rotas alternativas e decisões espaciais

- **Cidade** (cena 2): praça (rápida; atirador do outro lado) vs beco (lento; coberto); janelas nunca são alvo.
- **Cobertura** (cena 3): janela alta (vê a seteira da torre leste; exposta ao morteiro) vs baixa (vê só a rampa); mudar de janela quando a MG encontra o jogador.
- **Atravessar** (cena 5): esperar a pausa da MG na viga (coberto; lento) vs correr o troço aberto (rápido; exposto); nunca tocar em fios (não interativos).
- **O rendido** (cena 6): escoltar 20 m até à margem vs calar-se (Ortega decide em 10 s).
- **Torre sul** (cena 7): pela escada (coberta; lenta) vs pela porta (rápida; exposta); dar espaço ao grupo seguinte (recuar para a margem).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| ruas de Remagen | esquinas, becos | atiradores do lado leste a 300–600 m |
| torres oeste | basalto; janelas por piso | a MG das torres leste bate a rampa |
| rampa/cratera | a borda da cratera; pranchas | passagem de um de cada vez |
| tabuleiro | vigas laterais (cobertura parcial), guarda-corpo | a MG das torres leste varre o eixo por janelas (6 s/14 s) |
| torres leste | basalto; escada interior | a torre sul tem atiradores em dois pisos |
| margem leste | muretes, a estrada | fogo esparso do túnel (40 s) e do paredão |

Linhas de visão: torres leste → rampa e tabuleiro (325 m); Erpeler Ley → tabuleiro e margem; encosta oeste → tudo (a imagem única). Regra: a estrutura de M01 (vigas, guarda-corpo, pilares) com `planMetalStress` só como vibração; nenhum colapso.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| MG das torres leste | rajadas 6 s / pausas 14 s sobre rampa e tabuleiro; calada por outro grupo às 15:50 |
| morteiros/artilharia | ≥ 30 m; assobio; nenhum bombardeamento aéreo em 7/3 |
| 15:40 | a detonação nunca fere o jogador (cutscene); a ponte ergue-se e assenta |
| fios/cargas | nunca interativos; os engenheiros cortam-nos por agenda |
| túnel | fogo esparso por rajadas; nunca ataque em massa; nunca entrado |
| civis | nunca alvo (disparar sobre janelas = aviso) |
| limites | o Reno (só pela ponte); a Erpeler Ley (nunca); a cidade além das ruas do eixo |

## 8. Encenação e objetos por zona

- **Encosta** (cs intro): half-tracks, binóculos, a ponte inteira; 3 s de silêncio.
- **Cidade**: lençóis, a praça, portadas a fechar.
- **Rampa**: a cratera, pranchas, fios ao longo do guarda-corpo, a chave de Hanlon.
- **15:40**: poeira, lascas, a mão no guarda-corpo (2 s).
- **Tabuleiro**: cargas atiradas ao rio (som), pranchas partidas, o primeiro homem na margem (NPC, 15:45).
- **Acesso leste**: o capacete de Hartmann no chão; o tabuleiro a ranger.
- **Margem**: pranchas verdes/vermelhas, cordas, half-tracks (16:45), M26 à noite (22:00, cartela).
- Persistentes: cratera, pranchas partidas, fios cortados, a poeira assentada após CP-C.

## 9. Luz, tempo e som por zona

Sol calculado (50,58 N 7,24 E, UTC+1; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 13:40 | 197° | 33° | encoberto; luz plana e fria |
| 15:40 | 229° | 22° | a mesma luz com poeira |
| 17:00 | 247° | 12° | a cair; pôr do sol ≈ 18:20 |
| 22:00 | — | noite | lanternas e faróis tapados |

Som: encosta (motores em ralenti; vento sobre o Reno; **espanto** 3 s), cidade (pedra; lençóis; a MG a bater a rampa ao longe), rampa (supressão por janelas; alicates; impactos na pedra), 15:40 (**estrondo → metal → 2 s de nada**), tabuleiro (passos metálicos; o metal sob os pés; a água abaixo), acesso leste (o tabuleiro a ranger; a voz do rendido), margem (serras; martelos; o túnel por rajadas; o grupo seguinte), noite (metal sob peso; motores baixos).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 400 × 400 m, dos quais a ponte 325 m reutiliza a estrutura jogável de M01.
- **Assets:** ponte Ludendorff EXACT (tabuleiro ferroviário com pranchas, quatro torres de basalto, vigas), cratera, Remagen (ruas e praça), estrada da margem leste, boca do túnel, half-track M3, M26 (NPC), Volkssturm idoso, civis às janelas.
- **Sistemas (roadmap):** [A] ponte de M01 (`planMetalStress` como vibração), supressão por janelas; [B] travessia lateral, engenheiros NPC; [C] veículos a cruzar, `SURRENDERED`.
- **Risco:** 2 (**candidata a produção cedo**). **Fallback:** veículos como som + cartela; rendição encenada.
- **Medir primeiro:** vãos e torres (planos da ponte), a rampa oeste e a cratera (P-C25), a boca do túnel.
