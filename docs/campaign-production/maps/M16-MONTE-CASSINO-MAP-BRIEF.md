# M16 — MONTANHA (Monte Cassino, encosta norte / cota 593) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M16-MONTE-CASSINO-PRODUCTION-DOSSIER.md`. **Facto útil:** a abadia e as cotas são `EXACT` (DEM); a trilha, a dobra de rocha e a posição de acesso são `RECONSTRUCTED` (P-C16: batalhão; cota 593 vs 569).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | encosta norte do maciço de Cassino, setor da cota 593 (Monte Calvário), Albaneta, a abadia (≈ 41,49 N 13,81 E); 17–18/5/1944 |
| Classe global | relevo `EXACT` (DEM GLO-30), abadia `EXACT` em silhueta e altura; posições `RECONSTRUCTED` |
| O que medir depois | DEM (cotas 593/569, a dobra, o trilho), Overture (abadia, Albaneta), mapas do II Corpo Polaco (P-C16) |
| Origem proposta | a posição de partida na encosta norte: `(0, 0, 0)` |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul (a abadia a sul-sudoeste; a cota 593 a sul) |
| Área jogável | X −400…+400 · Z 0…+900; **altura**: +0 → +180 m (encosta real) |
| Compressões declaradas | "encosta 800 m com três percursos": a distância real partida → cota 593 a confirmar; o trilho para a abadia (18/5) só até ao ponto de vista |
| Relógio | 17/5 06:30 → 18:00 (`readyScale` 13:00–18:00) → noite (cartela) → 18/5 05:30 → 11:00 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m; alturas crescem para sul)

```
     N
   ⊙ POSIÇÃO DE PARTIDA (0,0,0) · rochas · companhias noutros eixos (s2) ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  trilha (rápida; vista da cota) ──────╮   talude (lenta; coberta) ╮   rocha (muito lenta) ╮  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ╰──────────┬───────────────╯────────────────────╯  ·  ·  ·  ·
   ·  ·  ·  [DOBRA DE ROCHA: pausa protegida; Kaleta]  ╪  linha protegida de descida ⇐ feridos ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  │  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ▲▲▲▲▲▲▲▲▲▲▲▲▲ SETOR DA COTA 593 ▲▲▲▲▲▲▲▲ [posto] ▲▲▲ [POSIÇÃO DE ACESSO] ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
   ▲▲ campos de tiro alemães ▲▲▲ outra formação assume cobertura (10:00) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
   ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
   ·  ·  ·  ·  ·  18/5: trilho de reconhecimento ──────────► ponto de vista: A ABADIA (EXACT) ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  Albaneta (s2)  ·  ·  ·  ·  ·  ·  ·  bandeira dos lanceiros 10:20 (ao longe) ·
     S   ⇓ Cassino em ruínas (s3, panorama)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_slope_593` | perto | partida, três percursos, dobra, setor da cota, posição de acesso, trilho | agenda 06:30 → 11:00 (18/5) |
| `s2_other_slopes` | médio | outras encostas e vales com deslocamento e fogo; Albaneta; Widmo | outra formação 10:00; contra-ataques 15:00 |
| `s3_support` | longe | posições de apoio; panorama de Cassino; cidade em ruínas | relógio |
| `s4_abbey` | longe → perto (18/5) | a abadia; a bandeira às 10:20 | retirada alemã noturna; patrulha 10:20 |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | partida (cs intro: a carta) | 0 | 06:30 | — |
| 2 | partida → setor da cota por um de três percursos | 800 m (+120 m) | 08:00–09:00 | `obj_m16_approach`; CP-A |
| 3 | setor da cota: cobrir; mensagem ao posto; munição | 100–200 m por lances | 09:00–11:00 | `obj_m16_support_advance`; CP-B |
| 4 | dobra de rocha → linha protegida de descida com Kaleta e dois feridos | 150 m (−40 m) | 11:00–13:00 | `obj_m16_evacuate`; CP-C |
| 5 | retomar o avanço no setor | — | 13:00–18:00 | `obj_m16_resume` |
| 6 | noite na cota (cs date: 18/5 05:30) | — | — | CP-D |
| 7 | posição de acesso → trilho → ponto de vista da abadia | 400 m | 05:30–10:30 | `obj_m16_consolidate`, `obj_m16_recon`; CP-E |
| 8 | ruínas junto do trilho (cs outro: a carta no bolso) | 0 | 10:30–11:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Três percursos** (cena 2): trilha (rápida; vista da cota: fogo), talude (lenta; coberta), rocha (muito lenta; quase cega para o inimigo); a observação da encosta explica o fogo.
- **Apoio** (cena 3): levar mensagem ao posto (lances curtos) ou munição (mais peso); o deslocamento lateral só é possível depois de outra formação assumir cobertura (evento 10:00).
- **Kaleta** (cena 4): carregar com os carregadores pela linha protegida (lento) ou guardar a carta e cobrir a descida; nenhum prémio por abandonar o ferido.
- **Reconhecimento** (cena 7): dois atiradores residuais recuam; o trilho leva ao ponto de vista; a abadia nunca é entrada como combate.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| partida | rochas grandes | — |
| trilha | nenhuma; vista da cota | o fogo da cota é legível pela poeira dos impactos |
| talude | terra e rocha; coberto da cota | lento |
| rocha | fendas; cobertura total | muito lento |
| dobra de rocha | sombra e rocha; pausa protegida | a linha de descida é coberta |
| setor da cota | muretes de pedra, crateras, corpos cobertos | campos de tiro alemães por setores |
| posição de acesso | sangar de pedra | — |
| trilho da abadia | muros em ruínas | posições abandonadas visíveis |

Linhas de visão: cota 593 → trilha (300–500 m); posto → setor (100 m); ponto de vista → abadia (600–900 m; silhueta exata); Albaneta a oeste. Regra: eco por relevo (sons de outras encostas chegam com atraso e direção falsa); o jogador e a IA veem a mesma encosta.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| fogo da cota (cena 2) | sobre a trilha; assobio e poeira; ≥ 30 m do jogador em impactos de artilharia |
| contra-ataques (15:00) | no setor; rotação de cobertura |
| Kaleta (cena 4) | ferimento fixo (perna); nunca "evitável" |
| retirada alemã noturna | posições abandonadas a 18/5; dois atiradores recuam |
| quedas | o relevo é jogável em degraus; sem morte por queda (bordas com rocha) |
| limites | encosta abaixo da partida (aviso); a abadia (só vista) |

## 8. Encenação e objetos por zona

- **Partida** (cs intro): a carta passa de mão em mão; a abadia ao fundo na altura correta; capacetes cobertos de 12/5.
- **Setor da cota**: muretes, crateras, o posto, corpos cobertos.
- **Dobra de rocha**: Kaleta; a carta muda de bolso; os carregadores Pietrzak e Sowa.
- **Cota à noite** (cs date): posições abandonadas visíveis ao amanhecer.
- **Trilho** (cs outro): ruínas; um ferido de outra unidade a ser descido; a carta manchada no bolso.
- Persistentes: crateras, muretes, a cota conquistada, a bandeira ao longe (18/5 10:20).

## 9. Luz, tempo e som por zona

Sol calculado (41,49 N 13,81 E, UTC+2; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 17/5 06:30 | 70° | 7° | luz rasante de leste sobre a encosta; pedra branca |
| 09:30 | 100° | 40° | poeira de impactos |
| 12:30 | 161° | 67° | sombra de rocha na dobra |
| 15:30 | 246° | 52° | tarde |
| 18/5 05:30 | ~60° | ~−3° | azul; nascer ≈ 05:50 |
| 10:00 | 106° | 46° | manhã clara; a bandeira |

Som: partida (vento; a carta), trilha (impactos com poeira; eco por relevo), dobra (sombra; respiração; a maca), setor (combate por lances; mensagens), noite (silêncio relativo; fogo que diminui), trilho (ruínas; a patrulha dos lanceiros ao longe).

## 10. Requisitos de produção do nível

- **Tamanho:** 800 × 900 m com 180 m de desnível real.
- **Assets:** rocha e talude (materiais por inclinação), muretes de pedra, sangars, crateras, a abadia (silhueta exata), Albaneta, capacetes polacos, maca em encosta.
- **Sistemas (roadmap S5-vertical/S10):** terreno vertical com velocidade por inclinação; maca a dois em encosta; eco por relevo.
- **Risco:** 3. **Fallback:** velocidade por zona; eco fixo por setor.
- **Medir primeiro:** DEM da cota 593 e da dobra; o batalhão e a trilha (P-C16).
