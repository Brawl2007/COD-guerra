# M11 — NOITE NO DESERTO (El Alamein, setor norte) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M11-EL-ALAMEIN-PRODUCTION-DOSSIER.md`. **Facto útil:** 23/10/1942 foi noite de lua cheia (Operação Lightfoot); o corredor com fita branca e lâmpadas tapadas é documentado em geral; o objetivo do batalhão (linha Oxalic) é P-C11.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | setor norte de El Alamein, frente do 2/17.º Batalhão (9.ª Div. Australiana), ≈ 30,85 N 28,90 E; noite de 23/24 de outubro de 1942 |
| Classe global | `RECONSTRUCTED` (corredor, primeira linha, brecha); `EXACT` a direção do ataque (para oeste) e o carácter do terreno (plano, areia e pedra, sem relevo útil) |
| O que medir depois | mapas da 9.ª Div. (AWM) com os corredores e a linha Oxalic do 2/17.º; DEM só para confirmar a planura (P-C11) |
| Origem proposta | a vala de reunião (linha de partida): `(0, 0, 0)` |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul; **o ataque avança para −X (oeste)** |
| Área jogável | X −1 400…+100 · Z −300…+300 (o corredor é a faixa Z ±60; fora da fita é "aviso", não procedimento) |
| Compressões declaradas | corredor de 1,2 km como no dossiê (os corredores reais eram mais longos: declarar `COMPRESSED_FOR_GAMEPLAY` após P-C11) |
| Relógio | 20:30 → 03:40 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 40 m; o ataque vai da direita para a esquerda)

```
     N                                   s4: retaguarda alemã (artilharia, flares)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  [posto vizinho / flanco direito]  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  (200 m; "a direita parou", 00:30)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ≋≋≋ arame ≋≋ [POSTOS] ≋≋ MG ≋≋≋≋≋  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ░░ POSIÇÃO ░░ ╔═ brecha/gap ═╗ ─ ─ ─ ─ ─ ─ ─ fita branca ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ⊙ ORIGEM
   ░░ conquistada ║ (suprimento/  ║  lâmpadas tapadas · engenheiros à frente · 1 200 m        vala de
   ░░ (02:00+)    ╚═ evacuação) ═╝ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ reunião
   ≋≋≋ arame ≋≋≋≋≋≋≋≋≋≋≋≋≋≋  (o homem que rasteja: 60 m fora da fita, 01:30)  ·  ·  ·  ·  ·  (20:30)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  outros corredores (s2): carriers, tanque preso a 300 m  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
     S          ⇐ W: barragem (s3) por setores no horizonte, 21:40; rastejante 22:00; nova 00:00
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_section` | perto | vala, fita, engenheiros, arame, postos, gap, posição | agenda 20:30 → 03:40 |
| `s2_corridors` | médio | outros corredores, blindados presos (um tanque a 300 m), carriers/jipes | sim |
| `s3_barrage` | longe | baterias, clarões por setor, linha de fumo que muda com a operação | eventos 21:40, 22:00, 00:00 |
| `s4_enemy_rear` | longe | artilharia alemã, flares | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | vala de reunião (cs intro: a chamada) | 0 | 20:30 | CP-A |
| 2 | vala (cs barrage: 21:40) | 0 | 21:40 | — |
| 3 | fita → corredor por etapas, atrás dos engenheiros | 800 m | 22:00–22:40 | `obj_m11_follow_engineers` |
| 4 | corredor → arame → postos (primeira linha) | 300 m | 22:40–23:30 | `obj_m11_first_line`; CP-B |
| 5 | brecha para suprimento/evacuação: marcar o gap; cobrir o primeiro carrier | 100 m | 23:30–00:30 | `obj_m11_secure_access`; CP-C |
| 6 | posição → posto vizinho (flanco direito) e volta | 200 m | 00:30–01:30 | `obj_m11_relink` |
| 7 | entre marcas, 60 m fora da fita (cs straggler) | 60 m | 01:30–02:00 | custo humano |
| 8 | posição e corredor até à substituição | — | 02:00–03:20 | `obj_m11_hold_until_relief`; CP-D |
| 9 | posição (cs outro: o cantil) | 0 | 03:20–03:40 | — |

## 5. Rotas alternativas e decisões espaciais

- **Corredor** (cena 3): dentro da fita (seguro; lento; etapas da barragem rastejante) vs atalho fora da fita (aviso de risco; nunca procedimento de desminagem).
- **Primeira linha** (cena 4): atravessar o arame onde os engenheiros abriram (marcado) vs flanquear o posto pela lateral (mais perto da MG).
- **Gap** (cena 5): marcar com a lâmpada de um lado ou do outro da brecha: muda de onde o carrier entra e o que a Vickers cobre.
- **O homem que rasteja** (cena 7): desviar pelo trilho das marcas (seguro se o tempo permitir) ou continuar; a equipa de Ellis/Lund decide com o jogador.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| vala de reunião | 1,2 m | — |
| corredor | nenhuma (areia); as crateras da barragem | lua cheia: silhuetas a 100–200 m; clarões a oeste recortam tudo |
| arame/postos | postos de areia e sacos (cobertura total), arame | a MG tem um arco de 60° sobre o corredor |
| gap | marcas, uma cratera | visto dos postos vizinhos alemães |
| posição conquistada | postos virados ao contrário; sacos | pressão por salvas de oeste |
| flanco direito | 200 m abertos até ao posto vizinho | fumo reduz a lua |

Linhas de visão: MG alemã → corredor (300 m); posição → gap (100 m); posição → posto vizinho (200 m); tanque preso a 300 m (s2) sempre visível como silhueta. Regra: de noite a IA dispara sobre o que a lua e os clarões mostram; flares revelam por 20 s.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| barragem própria (21:40; rastejante 22:00; 00:00) | por setores no horizonte e à frente do corredor; nunca sobre o jogador (etapas); ruído de banda larga |
| fora da fita | aviso (Fraser/Barrow); dano só se o jogador insistir além de 60 m; nunca mina invisível instantânea |
| MG da primeira linha | arco sobre o corredor; silencia por supressão/flanqueio |
| artilharia alemã e flares | ≥ 30 m; flares com som 1 s antes |
| contra-ataque (00:30–02:00) | por salvas de oeste; rotação de cobertura |
| limites | lateral do corredor (aviso); retaguarda (nunca necessária) |

## 8. Encenação e objetos por zona

- **Vala** (cs intro): a chamada; quem voltou de Tobruk (variantes); a lua.
- **21:40** (cs barrage): o horizonte inteiro a acender por setores; 10 s sem falas.
- **Corredor**: fita branca, lâmpadas tapadas, marcas; engenheiros com tarefa própria.
- **Primeira linha**: arame cortado, postos, cartuchos.
- **Gap**: a lâmpada; o primeiro carrier; o tanque preso ao longe.
- **O homem que rasteja**: entre marcas, 60 m fora da fita.
- **Posição** (cs outro): macas; o cantil "Não sobrou muito."
- Persistentes: fita, gap marcado, postos conquistados, o tanque preso.

## 9. Luz, tempo e som por zona

Sol: noite toda (el < −40°). **Lua cheia** (dossiê): 20:30 az 90°, el 25°, `#c9d4e8` fraca, sombras nítidas; 03:20 lua baixa a oeste. Clarões da barragem a 1–2 Hz no horizonte oeste (`#ffd27a`) a partir das 21:40. Tempo: seco; poeira da barragem; fumo que muda com a operação.

Som por zona: vala (silêncio; a chamada; depois a parede de som), corredor (barragem rastejante à frente; passos na areia; engenheiros), primeira linha (MG por arcos; arame), gap (carriers; o tanque preso ao longe), flanco (lâmpada; telefone), posição (salvas; a Vickers; a substituição a chegar).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 500 × 600 m planos; a noite e a fita são o nível.
- **Assets:** fita e lâmpadas tapadas, postos de areia, arame, crateras, Vickers, Bren carrier e jipe (NPC), tanque preso (proxy), flares.
- **Sistemas (roadmap S10 leve/S7):** barragem por setores (eventos + áudio em banda larga), fita dinâmica, lâmpada, veículos NPC, reatribuição de falas por flags de M06.
- **Risco:** 3. **Fallback:** barragem como luz/som por evento sem partículas de campo.
- **Medir primeiro:** os corredores e a linha Oxalic do 2/17.º (AWM) para decidir a compressão do corredor.
