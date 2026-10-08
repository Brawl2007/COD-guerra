# M19 — BOCAGE (setor de Caumont) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M19-CAUMONT-BOCAGE-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** a linha de visão não atravessa vegetação (para o jogador e para a IA); posição do 16.º no flanco pendente (P-C19).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | flanco do setor de Caumont-l'Éventé (≈ 49,09 N 0,80 W), bocage normando; 13/6/1944 |
| Classe global | `RECONSTRUCTED` (quinta, sebes, caminho encaixado, cruzamento); a geometria do bocage `EXACT` em tipo (sebes sobre taludes, caminhos encaixados) |
| O que medir depois | fotografia aérea de 1944 (IGN) para um padrão real de sebes no setor; Overture para os caminhos; P-C19 |
| Origem proposta | o portão do pátio da quinta abandonada: `(0, 0, 0)` |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul (o flanco patrulhado a sul e a leste) |
| Área jogável | X −150…+550 · Z −100…+450; parcelas de 60–120 m entre sebes |
| Compressões declaradas | "500 m de sebes" (dossiê): as parcelas são de escala real; nenhuma compressão |
| Relógio | 07:30 → 12:30 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 15 m)

```
     N        ⇖ Caumont (18.º/26.º; combates; artilharia além das colinas — s4)
   ┌──────────┐  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   │ QUINTA   │ ⊙ ORIGEM (0,0,0): pátio, varal, galinheiro  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   └────┬─────┘  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ≋≋≋≋≋╪≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋ sebe A (alta) ≋≋≋≋≋≋ abertura ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋
   ·  ·  │ parcela 1 (vaca)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  talude (vê e é visto) ·  ·  ·  ·
   ≋≋≋≋≋╪≋≋≋≋≋ sebe B (baixa) ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋
   ·  ·  ╽ caminho encaixado (cego; coberto) ·  ·  parcela 2: orla com SINAIS (fio, cigarros, capacete)
   ·  ·  ║  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ≋≋≋≋≋ sebe norte ≋≋ [POSIÇÃO: MG 42 + 6] ≋≋≋≋≋
   ·  ·  ║  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  [construção de pedra]  abertura lateral ⇒ flanco
   ·  ·  ║  tronco ✕ (dois homens)  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ═══╬═╬══════ CRUZAMENTO: o transporte (10:45); reação 1 (11:15) e 2 (11:50); o rendido ══════════
      ║ ⇐ outro grupo no trecho seguinte (s3)        [quinta vizinha: Lefranc à porta]
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_farm_hedges` | perto | quinta, sebes, taludes, caminho encaixado, orla, posição | 07:30 → 10:30 |
| `s2_crossroads` | perto | cruzamento, tronco, o transporte, a quinta vizinha | 10:30 → 12:30 |
| `s3_other_patrols` | médio | patrulhas e transporte em vias distintas; outro grupo no trecho seguinte | sim |
| `s4_beyond_hills` | longe | artilharia; combates de Caumont; 2.ª Pz Div. | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | quinta (cs intro: o varal) | 0 | 07:30 | CP-A |
| 2 | sebes/taludes/caminho: marcar três passagens | 300 m | 07:40–08:40 | `obj_m19_patrol` |
| 3 | orla da parcela 2: sinais; transmitir | 100 m | 08:40–09:30 | `obj_m19_signs_transmit`; CP-B |
| 4 | observar até a MG se mover **ou** flanquear pela abertura lateral | 60–120 m | 09:30–10:30 | `obj_m19_engage` |
| 5 | caminho encaixado → cruzamento: tronco a dois; cobrir a entrada do transporte | 150 m | 10:30–11:15 | `obj_m19_open_route`; CP-C |
| 6 | cruzamento (cs pow: o rendido) | 0 | 11:15–11:40 | `obj_m19_pow` |
| 7 | cruzamento e posição de flanco: ligação; reação 2 | 50 m | 11:40–12:15 | `obj_m19_hold_flank`; CP-D |
| 8 | cruzamento (cs outro: água) | 0 | 12:15–12:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Passagens** (cena 2): caminho encaixado (coberto; cego) vs talude (vê; exposto).
- **Contacto** (cena 4): observação prolongada (a MG move-se ~09:50; atacar quando a guarnição muda) vs flanqueamento pela abertura lateral (exposição; resultado proporcional).
- **Rota** (cena 5): o tronco é obstáculo a dois; o outro grupo mantém o trecho seguinte (Lane não escolta toda a estrada).
- **Ligação do flanco** (cena 7): posição no cruzamento (vê os dois braços) vs na construção de pedra (janelas; cega ao sul).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| sebes sobre taludes | talude 1–1,5 m + sebe 1–3 m: cobertura e **oclusão total** | aberturas raras; o jogador vê o que a IA vê |
| caminho encaixado | taludes dos dois lados: coberto e cego | — |
| talude isolado | vê a parcela; é visto | — |
| construção de pedra | janelas | — |
| cruzamento | esquina de muro, o tronco, carroça | vê 100 m em cada braço |
| quinta | muros do pátio; o varal | — |

Linhas de visão: posição alemã → parcela 2 (60–120 m, só pelas aberturas); cruzamento → braços (100 m); nada atravessa sebes. Regra absoluta: **oclusão simétrica** (visão e som) para o jogador e para a IA.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| posição alemã (MG 42 + 6) | só ativa quando observada/aproximada; recua; um fica desarmado |
| reações 1 e 2 (11:15; 11:50) | pontuais, com aviso; dados |
| artilharia | só além das colinas (s4) |
| o rendido | nunca volta a combater; disparar sobre ele tem custo e não termina a missão |
| o camião | pode ser destruído → continua a pé (sem falha) |
| limites | além das sebes exteriores (aviso); Caumont (nunca) |

## 8. Encenação e objetos por zona

- **Quinta** (cs intro): varal com roupa, louça na mesa, uma bicicleta, galinheiro vazio; Price ou Lindqvist (variante).
- **Parcela 2**: fio de telefone de campanha, cigarros, terra remexida, um capacete.
- **Posição**: MG 42, cartuchos; a sebe aberta.
- **Caminho/cruzamento**: o tronco, poeira de pneus, o camião.
- **Cruzamento** (cs pow): a arma no chão; o Soldbuch "Weber"; Lefranc à porta da quinta vizinha.
- **Fim** (cs outro): o comboio a passar; o prisioneiro sentado; Morgan assume a vigia.
- Persistentes: passagens marcadas, sebe aberta, tronco removido, cartuchos.

## 9. Luz, tempo e som por zona

Sol calculado (49,09 N 0,80 W, UTC+2; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 07:30 | 69° | 12° | sol baixo entre sebes (raios); aves |
| 09:30 | 90° | 31° | sombra de talude |
| 11:30 | 117° | 50° | — |
| 12:30 | 136° | 58° | meio-dia |

Som: quinta (aves, roupa ao vento — silêncio obrigatório), sebes (vento; passos abafados; a vaca), orla (rádio SCR-300; o fio), contacto (MG 42 abafada pela sebe), caminho (tronco; pneus; motor), cruzamento (respiração; o Soldbuch — silêncio obrigatório antes), fim (pneus; aves).

## 10. Requisitos de produção do nível

- **Tamanho:** 700 × 550 m em parcelas de bocage.
- **Assets:** sebes sobre taludes (sistema de instâncias com oclusão), caminho encaixado, quinta normanda, construção de pedra, camião GMC (NPC), carroça, o rendido (rosto; Feldbluse).
- **Sistemas (roadmap S3/S9-lite/S7):** `SURRENDERED`/custódia; sebes com oclusão simétrica (visão e som); camião NPC.
- **Risco:** 4. **Fallback:** rendição encenada (Morgan intervém sozinho); sebes como volumes de oclusão fixos.
- **Medir primeiro:** um padrão real de parcelas do setor (IGN 1944) e a posição do 16.º (P-C19).
