# M26 — L-DAY (Hagushi, Okinawa) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M26-HAGUSHI-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** pouca resistência; a leitura do lugar substitui o tiroteio; a ameaça pontual é dramatização declarada; praia/companhia/aldeia e a **revisão cultural okinawana** são P-C26.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | praias de Hagushi, extremo sul do setor Marine (≈ 26,40 N 127,72 E), terraço, campos e uma aldeia; 1/4/1945 |
| Classe global | recife, praia e terraço `EXACT` em tipo (Overture: a costa persiste, urbanizada); a aldeia, a posição abandonada, o caminho de suprimento e o cruzamento `RECONSTRUCTED` (P-C26) |
| O que medir depois | cartas USMC de L-Day (Blue/Yellow; o rio Bishi), fotografia aérea de 1945 (campos, túmulos, aldeias), DEM (o terraço) |
| Origem proposta | a brecha do muro do terraço por onde a esquadra passou: `(0, 0, 0)` |
| Eixos | metros; X+ leste (para o interior), Y+ altura, Z+ sul; o mar a −X |
| Área jogável | X −250 (recife) … +900 (cruzamento) · Z −300…+300 |
| Compressões declaradas | praia → aldeia 500 m e aldeia → cruzamento 300 m (dossiê); a confirmar; o ponto de recolha de civis fica fora do mapa (1 km) |
| Relógio | 08:15 → 17:30 (`readyScale` em três fases) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 25 m; o mar à esquerda)

```
   ≈≈≈≈≈≈≈≈≈ FROTA (escala; s8) ≈≈≈≈≈≈≈≈≈≈≈≈                                          N ⇑  (Yontan ao longe)
   ≈≈ recife ≈≈ LVT-4 ⇒ praia ___ MURO DO TERRAÇO ‖ ⊙ brecha ORIGEM (0,0,0) ‖ [LVT atolado 12:05] ‖ 2.ª brecha
   ≈≈ ondas a cada 4 min ≈≈ ⚕ posto de Gray (fica)     ═══ estrada de terra para E ═══════════════════════════►
                                                        ░ campos de batata-doce ░ cana """ pinheiros ♠ muros ═══
                                                        ∩ ∩ ∩ TÚMULOS em meia-lua (encosta, 150 m) ∩ ∩ ∩ (dois tiros 14:25)
                                                        ─── caminho de carro de boi (fita para os jipes) ─── fosso ═ pranchas
                                   ┌──────────────────────────────────────────────────────┐
                                   │ ALDEIA: 6 casas de colmo · CASA DE TELHA (hinpun, shisa) │ posição japonesa abandonada
                                   │ pátio · porta (família Nakama) · bicicleta             │ (trincheira curta, à orla)
                                   └──────────────────────────────────────────────────────┘
                                                        ═══ estrada marcada (famílias ⇒ ponto de recolha, S) ═══
                                                                            ╬ CRUZAMENTO com vista (perímetro; OP; rádio)
                                                                              ⇓ estrada para sul (relatos; "onde a gente ainda não foi")
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_beach_wall` | perto | recife, praia, muro com brechas, LVTs, descarga | 08:30 → 09:30; ondas a cada 4 min |
| `s2_road_fields` | perto | estrada, campos, túmulos, galinhas, portas fechadas | 09:30 → 11:00 |
| `s3_village` | perto | posição abandonada, casa de telha, pátio | 11:00 → 12:00 |
| `s4_supply_path` | perto | LVT atolado, caminho de boi, fosso | 12:00 → 13:30 |
| `s5_tombs` | perto/médio (150 m) | a encosta de túmulos; a abertura | 14:25 |
| `s6_crossroads` | perto | cruzamento, OP, o posto de Gray (muda para aqui) | 15:30 → 17:30 |
| `s7_mid` | médio | companhias e veículos; a outra esquadra; o ponto de recolha | sim |
| `s8_far` | longe | frota, aeronaves, alarmes ao largo, uma peça a sul só por som | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | LVT sobre o recife (cs intro: a frota; a rampa: nada) | 300 m (cutscene) | 08:15–08:30 | — |
| 2 | praia → brecha (marcar) → terraço (reunião) | 100 m | 08:30–09:30 | `obj_m26_organize`; CP-A |
| 3 | estrada e campos: três leituras; a cabra | 400 m | 09:30–11:00 | `obj_m26_recon`; CP-B |
| 4 | posição abandonada → o pátio da casa de telha (a porta) | 100 m | 11:00–12:00 | `obj_m26_abandoned_position`, `obj_m26_residents`; CP-C |
| 5 | aldeia ⇄ terraço: segunda brecha, fita, pranchas; o jipe | 500 m | 12:00–13:30 | `obj_m26_supply_route` |
| 6 | estrada marcada: famílias; dois tiros; contornar pelo muro até à abertura | 150 m | 13:30–15:30 | `obj_m26_families`, `obj_m26_threat` |
| 7 | cruzamento: perímetro, ligação, OP, cavar | 300 m | 15:30–17:00 | `obj_m26_perimeter`; CP-D |
| 8 | cruzamento ao anoitecer (cs outro: o sul) | 0 | 17:00–17:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Muro** (cena 2): brecha perto (LVTs a passar) vs brecha longe (vazia).
- **Leituras** (cena 3): estrada (vista; rápida) vs caminho entre muros (coberto; lento); a sombra atrás do muro é uma cabra.
- **A porta** (cena 4): baixar a arma e recuar dois passos; distância como comunicação; disparar nunca mata civis mas tem custo.
- **Suprimento** (cena 5): abrir a segunda brecha a dois (40 s) vs esperar o LVT sair (10 min de relógio).
- **Dois tiros** (cena 6): contornar pelo muro (coberto) vs pelo campo (visto); nunca disparar sobre os túmulos (há gente).
- **Perímetro** (cena 7): OP no cruzamento (vê a estrada; exposto a nada hoje) vs no túmulo (coberto; parcial).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| recife/praia | nenhuma; LVTs | aberta ao mar |
| muro do terraço | 1,5 m de calcário | brechas |
| estrada/campos | muros de pedra, cana (oclusão visual, não balística) | portas fechadas |
| túmulos | pedra: cobertura total; **há civis dentro** | a abertura do meio |
| aldeia | muros, hinpun, casas | o pátio cego para a estrada |
| caminho de boi | muros estreitos | não passa jipe sem fita |
| cruzamento | muro baixo, um túmulo | vê a estrada para sul |

Linhas de visão: abertura do túmulo → estrada marcada (150 m); cruzamento → estrada para sul (300 m, civis a pé); a frota a 2–6 km. Regra: nenhum inimigo oculto além do retardatário; a cana e os túmulos não são posições até dispararem.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| a praia | nenhum tiro; uma peça a sul só por som |
| dois tiros (14:25) | o único fogo direto do dia; ninguém atingido (fixo); cartela de dramatização |
| túmulos | nunca disparar (Cole corta); civis nunca atingíveis |
| a porta | disparar = bala na madeira; a família foge; custo registado |
| LVT atolado | nunca precisa do jogador |
| limites | o mar além do recife; as colinas a leste (aviso); o ponto de recolha (fora do mapa) |

## 8. Encenação e objetos por zona

- **LVT** (cs intro): a frota a encher o horizonte; o cinto sem olhar; o papel dobrado.
- **Praia**: muro com brechas, panfletos do Governo Militar caídos, o posto de Gray.
- **Campos**: galinhas, roupa, uma bicicleta, a porta que se fecha ao longe.
- **Aldeia** (cs family): trincheira vazia, latas, capacete; a porta; o shisa; a mala? não (M14): o panfleto.
- **Suprimento**: pedras do muro, fita, pranchas, o jipe.
- **Estrada marcada**: trouxas, a carroça, a abertura do túmulo com capacete e cartuchos.
- **Cruzamento** (cs outro): buracos, a rádio, a criança com febre, o telhado furado, a dobra da carta.
- Persistentes: brecha marcada, segunda brecha, fita, pranchas, famílias passadas.

## 9. Luz, tempo e som por zona

Sol calculado (26,40 N 127,72 E, UTC+9; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 08:15 | 98° | 25° | manhã luminosa; sol a leste (atrás de quem olha para o interior) |
| 11:15 | 136° | 61° | sombras curtas |
| 14:15 | 232° | 57° | tarde |
| 17:15 | 265° | 20° | luz dourada; pôr do sol ≈ 18:40 sobre o mar |

Som: recife (motor; água sobre o recife), praia (rampa; **aves**; LVTs a cada 4 min), campos (cana ao vento; galinhas; uma porta a fechar-se), aldeia (a porta a abrir; a voz do avô; 2 s de silêncio), suprimento (pedras; pranchas; jipe), estrada (trouxas; carroça; **dois tiros** com eco nos túmulos), cruzamento (pás; rádio com relatos do sul; a criança), anoitecer (aves da noite; o mar; silêncio obrigatório).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 150 × 600 m, quase sem combate; a densidade é de leitura (muros, cana, túmulos, casas).
- **Assets:** LVT-4 (M24), muro de calcário com brechas, campos de batata-doce e cana, túmulos em meia-lua, casas de colmo e de telha (hinpun, shisa), carroça, jipe (NPC), frota em silhueta; **consultoria cultural obrigatória** antes de modelar.
- **Sistemas (roadmap S4/S7):** civis com estados e trânsito; ondas/LVT/jipe NPC; obstáculo a dois.
- **Risco:** 3. **Fallback:** a porta em cutscene; famílias por agenda em plano médio.
- **Medir primeiro:** a praia e o terraço (cartas USMC; Overture); a aldeia-tipo com consultor (P-C26).
