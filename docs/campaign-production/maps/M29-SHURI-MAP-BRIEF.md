# M29 — SHURI (Wana → castelo de Shuri) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M29-SHURI-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** a esquadra chega às ruínas depois de A/1/5; o castelo na zona da 77.ª (limite de setor com aviso); sem "boss"; companhia, rota e limite são P-C29.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Wana Draw e crista de Wana → planalto de Shuri → ruínas do castelo (≈ 26,22 N 127,72 E); 28–29/5/1945 |
| Classe global | relevo (garganta, crista, planalto) e o castelo `EXACT` (DEM/Overture; o castelo foi reconstruído: usar a planta das muralhas); posições, trilhos, o corredor de lama e o limite de setor `RECONSTRUCTED` (P-C29) |
| O que medir depois | DEM (Wana Draw, a crista, a subida para Shuri), Overture (muralhas e escadas do castelo, a estrada-limite), mapas da 1.ª Div. Marines e da 77.ª (limites de setor em 28–29/5) |
| Origem proposta | o posto de Gray na saída do Wana Draw (a lona): `(0, 0, 0)` |
| Eixos | metros; X+ leste (para a crista e Shuri), Y+ altura, Z+ sul; a 77.ª a leste da estrada-limite |
| Área jogável | Ato I: X 0…+600 · Z −200…+200 (garganta, crista, saliência, corredor); Ato II: X +600…+1 300 (planalto, cidade arrasada, ruínas até à estrada-limite); altura +0 → +90 m |
| Compressões declaradas | a rota Wana → castelo (real ≈ 1,5–2 km) jogada em 1,3 km (`COMPRESSED_FOR_GAMEPLAY` leve, a confirmar) |
| Relógio | 28/5 07:00→17:00 (+ noite) · 29/5 07:30→13:00 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m; o avanço vai da esquerda para a direita)

```
     N          ⇑ eixos de outras unidades (s7)                                 ⇑ 77.ª DIVISÃO (zona; só rádio)
   ▲▲▲▲ CRISTA DE WANA: cavernas ◘ ◘ · saliência (MG) · túmulo com sacos ▲▲▲▲   ▒▒▒ PLANALTO DE SHURI ▒▒▒ ║ ESTRADA-LIMITE
   ▲▲ trilho da meia-encosta (firme; visto) ▲▲ [SALIÊNCIA: buraco de Cole; 3 salvas 14:08–14:10] ▲▲  ▒ cidade arrasada ▒ ║ (parar até
   ⊙ WANA: buracos com água · LONA (posto de Gray) · macas ═══ gargalo ═══ trilho do fundo (lama funda; coberto) ═══ ▒ túmulos ▒ ║ confirmação)
   ▲▲ cavernas batidas ◘ ◘ ▲▲ [caverna do morteiro, 300 m] ▲▲ CORREDOR 30 m: tronco ✕ + pranchas ▲▲▲▲▲▲▲▲   ▒ tanque Type 95 ▒ ║
   ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲   ▒ cavernas vazias · cozinha ▒ ║
                                                                                  ┌── RUÍNAS DO CASTELO ──┐ ║
                                                                                  │ escadas · portão · muros│ ║ A/1/5 já lá (10:15)
                                                                                  └─────────────────────────┘ ║
     S        ⇓ retirada japonesa para sul (22–29/5; só relato e tiros distantes)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_wana_exit` | perto | buracos com água, lona, posto, macas | 07:00; 29/5 07:30 |
| `s2_gorge_trails` | perto | dois trilhos, gargalo, fio telefónico | 07:15 → 09:30 |
| `s3_ridge` | perto | cavernas, saliência, túmulo | 09:30 → 14:00 |
| `s4_corridor` | perto | 30 m de lama funda, tronco | 14:10 → 17:00 |
| `s5_shuri_plateau` | perto (29/5) | cidade arrasada, túmulos partidos, o tanque, cavernas vazias | 08:00 → 10:00 |
| `s6_castle_ruins` | perto | escadas, portão, muros; a estrada-limite a leste | 10:15 → 13:00 |
| `s7_mid` | médio | outros eixos, forças de cobertura em retirada, A/1/5 ao longe, a 77.ª por rádio | sim |
| `s8_far` | longe | frota invisível pela chuva, apoio, aviação do dia (só som) | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | Wana (cs intro: lona; Cole de perto) | 0 | 28/5 07:00 | — |
| 2 | garganta por um de dois trilhos; emendar o fio; cobrir macas no troço visto | 300 m | 07:15–09:30 | `obj_m29_recon`, `obj_m29_protect_comms`; CP-A |
| 3 | crista: flanquear a saliência pela meia-encosta; cobrir a demolição das cavernas | 200 m, +40 m | 09:30–13:30 | `obj_m29_support_advance`; CP-B |
| 4 | saliência: três salvas; Cole; tronco e pranchas no corredor; Gray sobe; a maca desce | 30 m | 14:00–15:30 | `obj_m29_open_corridor`, `obj_m29_restrain_tully`; CP-C |
| 5 | corredor: fita; carregadores; noite | — | 15:30–17:00 | `obj_m29_supply_passage` |
| 6 | Wana/saliência (cs day2: a retirada reportada) | 0 | 29/5 07:30 | CP-D |
| 7 | crista → planalto (cavernas vazias, cozinha) → subida às ruínas depois de A/1/5 → parar na estrada-limite → consolidar | 700 m, +50 m | 08:00–11:30 | `obj_m29_verify`, `obj_m29_castle`, `obj_m29_sector_limit`, `obj_m29_consolidate`; CP-E |
| 8 | ruínas (cs outro: a carta) | 0 | 11:30–13:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Trilhos** (cena 2): fundo (lama funda; coberto) vs meia-encosta (firme; visto da caverna); nunca ≥ 4 no gargalo.
- **Crista** (cena 3): flanquear pela meia-encosta (visto; rápido) vs pelo fundo (coberto; lama); o túmulo só é posição depois de disparar.
- **Sinalizado** (cena 4): corredor primeiro (Gray em 90 s) vs Tully primeiro (o corredor atrasa 30 s; Gray chega na mesma); nenhum ramo muda Cole.
- **Castelo** (cena 7): subir pelas escadas (vista; rápido) vs pelo muro (coberto; lento); **parar na estrada** até à confirmação (2 min); posicionar nas ruínas.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| buracos de Wana | cheios de água até meio | a lona não protege de nada |
| trilho do fundo | lama funda; taludes | coberto |
| meia-encosta | rochas | visto da caverna do meio |
| gargalo | rochas dos dois lados | ≥ 4 homens = morteiro |
| crista | cavernas (entradas), saliência, o túmulo com sacos | a MG da saliência recua por túnel |
| corredor | nenhuma 30 m (lama funda) | o morteiro cala-se às 14:20 |
| planalto | escombros, túmulos partidos, o tanque | dois atiradores recuam |
| ruínas | muros de calcário, escadas, o portão | pedra molhada |

Linhas de visão: caverna → troço visto (120 m); saliência → trilho da meia-encosta (150 m); caverna do morteiro a 300 m (só fumo); a 77.ª só por rádio. Regra: a chuva reduz a visibilidade a 80–150 m sem inimigos invisíveis (tudo o que dispara mostra flash).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| atirador da caverna | só sobre o troço visto; por janelas |
| gargalo | aviso de Cole antes do morteiro (≥ 30 m) |
| salvas de 14:08–14:10 | assobio; a terceira atinge o buraco de Cole (fixo); sempre ≥ 30 m do jogador |
| retaguarda japonesa (29/5) | dois atiradores que recuam; nenhum ator nas ruínas |
| artilharia da 77.ª | planeada sobre a zona leste; cancelada por rádio; ultrapassar a estrada antes da confirmação = impacto ≥ 50 m e aviso; nunca no jogador |
| quedas | relevo em degraus; sem morte por queda |
| limites | a estrada-limite (zona com aviso); o sul do planalto (retirada; nunca) |

## 8. Encenação e objetos por zona

- **Wana** (cs intro): lona esticada, macas, água nos buracos, a carta mole, Cole sentado no bordo.
- **Garganta**: fio no chão, cavernas batidas, lama com rastos.
- **Crista**: túmulo com sacos, cavernas seladas, cartuchos na lama.
- **Saliência**: o buraco de Cole, o tronco, as pranchas, água vermelha (reduzida).
- **Planalto**: cidade arrasada, túmulos partidos, o tanque Type 95, a cozinha com arroz frio.
- **Ruínas** (cs outro): escadas, portão, Gray num canto abrigado, Marsh com a carta e a manga.
- Persistentes: fio emendado, cavernas seladas, pranchas, fita, Cole ausente (snapshot), o limite respeitado ou não.

## 9. Luz, tempo e som por zona

Sol calculado (26,22 N 127,72 E, UTC+9; a validar — **nunca visível**: chuva contínua):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 28/5 07:00 | 74° | 17° | cinzento; sem direção |
| 13:00 | 240° | 81° | quase a pino; luz difusa |
| 17:00 | 282° | 28° | luz a cair; chuva mais forte |
| 29/5 07:30 | 76° | 23° | chuva fina; quieto |
| 10:30 | 94° | 63° | instantes de abertura entre nuvens sobre o planalto |
| 12:30 | 190° | 85° | meio-dia sem sombras |

Som: Wana (chuva na lona sobre veículos ao longe; água nos buracos; macas), garganta (água nas valas; o fio; o atirador abafado pela chuva), crista (MG abafada; cargas surdas; fósforo ao longe), saliência (**três assobios**; salvas; chuva; "Ninguém."), corredor (tronco; pranchas; carregadores na lama), 29/5 (chuva fina; quase silêncio; tiros distantes para sul), planalto (escombros; pedra molhada), ruínas (chuva na pedra; Gray a rasgar ligadura; quase silêncio).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 300 × 400 m com 90 m de desnível e dois estados (28 e 29/5).
- **Assets:** buracos com água, lona, cavernas, saliência, túmulo okinawano com sacos, lama por profundidade, tronco e pranchas, cidade arrasada, tanque Type 95 (destruído), ruínas do castelo (muralhas e escadas exatas), estrada-limite.
- **Sistemas (roadmap S5/S13):** chuva e lama (reutiliza M21/M27); limite de setor com aviso e confirmação; maca/obstáculo a dois.
- **Risco:** 3. **Fallback:** modificador fixo por zona; paragem forçada em cutscene.
- **Medir primeiro:** DEM de Wana → Shuri; as muralhas do castelo; o limite de setor de 29/5 (P-C29).
