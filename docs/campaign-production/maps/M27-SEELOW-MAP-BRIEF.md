# M27 — PORTÕES DE BERLIM (Oderbruch → sopé de Seelow) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M27-SEELOW-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** a escala da preparação é panorama por eixos; blindados atolam; o objetivo é limitado (uma quinta ao pé das encostas; as alturas nunca jogáveis); fuso, divisão e canal são P-C27.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Oderbruch, da cabeça de ponte de Küstrin ao sopé das alturas de Seelow (≈ 52,53 N 14,38 E); 16/4/1945 |
| Classe global | a planície, os canais de drenagem (Haupt Graben) e as encostas `EXACT` em traçado (Overture/DEM); trincheiras de partida, primeira linha, aqueduto, rampas e a quinta `RECONSTRUCTED` (P-C27) |
| O que medir depois | Overture (canais, estradas, quintas do Oderbruch, a estrada que sobe para Seelow), DEM (a planície a −1…+2 m; as encostas a +40…+60 m), mapas soviéticos de abril de 1945 (setor da 27.ª DG) |
| Origem proposta | a passagem (aqueduto) do canal principal: `(0, 0, 0)` |
| Eixos | metros; X+ leste (sentido do ataque? **não**: o ataque vai para **oeste**); X+ leste por convenção, o ataque avança para −X; Y+ altura; Z+ sul |
| Área jogável | X +1 400 (trincheiras de partida) … −900 (a quinta) · Z −400…+400; as encostas além de X −1 100 só visíveis |
| Compressões declaradas | planície de partida → primeira linha 600 m; primeira linha → canal 300 m; canal → quinta 600 m (dossiê); a distância real Küstrin → Seelow (≈ 10 km) é resumida: o mapa é um **troço** declarado |
| Relógio | 02:40 → 16:00 (hora de Moscovo; `readyScale` em quatro fases) |

## 2. Planta esquemática (norte em cima; o ataque vai da direita para a esquerda; 1 carácter ≈ 40 m)

```
   ⇖ SEELOW (alturas; 88 mm; nunca jogável)        N        s7: baterias, holofotes em linha, formações (atrás, a leste)
   ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ ENCOSTAS ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
   ┌ QUINTA: muro · casa · estábulo · pomar ┐ ⇐ estrada que sobe (nunca)   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   └──── objetivo limitado (10:30–15:00) ───┘ ·  ·  ·  formação da direita (200 m)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ═══ estrada com coluna (T-34 a recuar; ambulância; posto na vala) ═══════════════════════════════════════════════
   ║ CANAL PRINCIPAL ║ [ponte destruída] ║ rampas: T-34 atolado ✕ ║ ⊙ AQUEDUTO ORIGEM (0,0,0) ║ vala do outro lado (o alemão)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   [QUINTA EM RUÍNAS: MG] ─ ─ ─ PRIMEIRA LINHA: trincheiras, ninho, fumo sem ameaça ─ ─ ─ canal menor ─ ─ ─ ─ ─ ─ ─ ─ ─
   ·  ·  ·  ·  ·  ·  ·  ·  vala grande (CP-A/B) ·  ·  ·  ·  ·  PLANÍCIE: valas a cada 80–120 m, lama, poeira ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  TRINCHEIRAS DE PARTIDA
                                                                   holofotes ⇐ (atrás; cegam quem olha para trás) ⇐ Katyusha, 152 mm
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_jump_off` | perto | trincheiras, lama, as rampas de Katyusha atrás, holofotes em linha | 02:40 → 03:30 |
| `s2_oderbruch_flat` | perto | valas, lama, poeira, sombras longas dos holofotes | 03:30 → 04:30 |
| `s3_first_line` | perto | trincheiras batidas, a quinta em ruínas (MG), fumo | 04:30 → 06:00 |
| `s4_canal` | perto | ponte destruída, aqueduto, rampas, blindados | 06:00 → 10:30 |
| `s5_farm` | perto | muro, casa, estábulo, pomar, a estrada que sobe | 10:30 → 16:00 |
| `s6_mid` | médio | eixos de infantaria/blindados, a formação da direita, a coluna, a ambulância | sim |
| `s7_far` | longe | baterias, holofotes, formações, as encostas com 88 mm, Seelow | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | trincheiras (cs intro: 03:00) | 0 | 02:40–03:30 | — |
| 2 | planície por valas, com contagem por voz | 600 m | 03:30–04:30 | `obj_m27_advance_contact`; CP-A |
| 3 | vala grande/talude: identificar 3 posições; suprimir o ninho | 100–300 m de alcance | 04:30–06:00 | `obj_m27_first_cover`, `obj_m27_identify`; CP-B |
| 4 | canal: correr ao T-34 (40 m) e indicar; fila pelo aqueduto; Aliyev ferido | 200 m | 06:00–08:30 | `obj_m27_open_passage`; CP-C |
| 5 | vala do outro lado (o alemão; Bychkov; o mapa com Serov) | 0 | 08:30–08:45 | `obj_m27_pow` |
| 6 | de volta pelo aqueduto com a maca → estrada → ambulância; posto na vala (rádio) | 300 m | 08:45–10:30 | `obj_m27_evacuate`, `obj_m27_relink`; CP-D |
| 7 | pomar → quinta: estábulo, interiores; ligação à direita; contra-ataque | 600 m | 10:30–15:00 | `obj_m27_objective`, `obj_m27_hold`; CP-E |
| 8 | o muro da quinta (cs outro: o mapa) | 0 | 15:00–16:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **Planície** (cena 2): vala (cobertura; lama lenta) vs campo (rápido; sombra longa visível); não olhar para trás (holofotes cegam 2 s).
- **Primeira linha** (cena 3): vala (coberta; enche-se — "não empurrem todos para a mesma vala") vs talude (vista; exposto); distinguir posição sobrevivente de fumo.
- **Canal** (cena 4): indicar ao T-34 (40 m expostos; apoio real) vs passar o aqueduto sem apoio (MG por janelas: lento).
- **Quinta** (cena 7): pomar (coberto; lento) vs estrada (rápida; 88 mm por agenda); consolidar só com ligação (Serov a pé) e flanco (DP no pomar).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| trincheiras de partida | cobertura total | — |
| valas de drenagem | 1–1,5 m; lama no fundo | cobertura e armadilha |
| campo | nenhuma; poeira a 50 m | sombras longas dos holofotes atrás |
| vala grande/talude | 1,5 m / vista | — |
| canal | margens 3 m; ponte destruída; aqueduto 1,5 m de largura | coberto pela MG da quinta em ruínas |
| vala do outro lado | 1,5 m; água ao joelho | — |
| estrada/coluna | veículos (param tiros) | a via dos veículos |
| quinta | muro de tijolo, casa, estábulo, pomar | 88 mm das encostas sobre a estrada |

Linhas de visão: MG da quinta em ruínas → canal/aqueduto (200 m, por janelas 5 s/12 s); encostas → estrada e pomar (88 mm por agenda); holofotes → tudo atrás (cegueira ao olhar). Regra: partículas nunca escondem as formações (regra de arte); a MG só sobre linha de visão.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| barragem (03:00–03:30) | nunca fere o jogador; panorama por eixos |
| holofotes (03:30–05:30) | cegam 2 s ao olhar para trás; sem dano |
| MG da quinta em ruínas | por janelas sobre o aqueduto; suprimida pelo T-34 (se indicado) ou passada por janelas |
| blindados | atolam (estado); param se há alguém na via (buzina + grito); Panzerfaust só contra NPC |
| Aliyev (07:50) | ferimento fixo na anca ao passar o aqueduto |
| 88 mm | sobre a estrada a cada 70 s; ≥ 30 m |
| contra-ataque (13:40) | pomar; StuG ao longe não entra |
| limites | as encostas (nunca); o canal fora do aqueduto (água funda; bloqueio); atrás das trincheiras de partida |

## 8. Encenação e objetos por zona

- **Trincheiras** (cs intro): o mapa dobrado (a dobra de M26), o copo (variante), rampas de Katyusha, holofotes a acender.
- **Planície**: cavalo morto, fios, valas.
- **Primeira linha**: trincheiras batidas, posições vazias com equipamento, a quinta em ruínas.
- **Canal**: a ponte destruída, o T-34 atravessado na rampa, pranchas, água; **vala do outro lado**: o alemão, o torniquete, o mapa com Serov.
- **Estrada**: a coluna, a ambulância, o posto na vala.
- **Quinta** (cs outro): muro, estábulo, pomar, a estrada que sobe; Kravets na via.
- Persistentes: crateras, a ponte, o T-34 atolado, o estábulo, formações (onde estão os eixos).

## 9. Luz, tempo e som por zona

Sol calculado (52,53 N 14,38 E; relógio em hora de Moscovo UTC+3 — P-C27; a validar):

| Hora (Moscovo) | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 02:40 | — | −27° | noite; brilho de incêndios |
| 05:20 | 51° | −15° | holofotes na poeira (acesos 03:30–05:30) |
| 06:40 | 68° | −4° | amanhecer cinzento ≈ 07:05 |
| 09:20 | 99° | 20° | manhã; poeira a assentar |
| 12:00 | 139° | 41° | sol fraco |
| 14:40 | 194° | 47° | tarde |
| 16:00 | 220° | 41° | — |

Som: trincheiras (mapa; copo; motores desligados; **barragem por eixos**), planície (**zumbido elétrico dos holofotes**; vento; vozes abafadas; ouvido tapado 3 s), primeira linha (MG abafada pela poeira; silêncio depois das rajadas), canal (T-34 a rodar na lama; lagarta a rasgar; o canhão; a água do aqueduto), vala (a voz do alemão; o torniquete), estrada (**ambulância**; buzina; coluna; rádio), quinta (88 mm; DP; interiores; contra-ataque), fim (a coluna devagar; silêncio relativo 4 s).

## 10. Requisitos de produção do nível

- **Tamanho:** 2 300 × 800 m planos + encostas em LOD; o panorama da barragem a 300–800 m atrás.
- **Assets:** trincheiras, rampas de Katyusha e 152 mm (NPC), holofotes AA, valas de drenagem, lama, canal com ponte destruída e aqueduto, T-34-85/SU-76 (NPC que atolam), ambulância GAZ, quinta do Oderbruch (muro, estábulo, pomar), as encostas de Seelow.
- **Sistemas (roadmap S14/S5/S7/S3):** barragem como panorama; holofotes com cegueira; lama/água; blindados que atolam e param por presença; `SURRENDERED`/DOWN.
- **Risco:** 4. **Fallback:** holofotes fixos; T-34 estático; cena encenada.
- **Medir primeiro:** o canal principal e as rampas (Overture/DEM), o troço da 27.ª DG e o fuso (P-C27).
