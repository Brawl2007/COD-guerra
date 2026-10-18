# M22 — OFENSIVA (Clervaux, encosta oeste) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M22-CLERVAUX-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** dois atos (16 e 17/12) com snapshot; o castelo e o Hotel Claravallis só silhueta/som; a saída é para oeste (Marnach fica a leste); posto, edifícios e rota são P-C22.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Clervaux, Luxemburgo (≈ 50,05 N 6,03 E): a cidade no vale do Clerve, o castelo no esporão, encostas; 16–17/12/1944 |
| Classe global | castelo, vale, ruas principais e a estrada de saída para oeste `EXACT` (Overture/DEM); o posto no anexo de hotel, o acesso leste, os três edifícios ligados e o ponto de reunião `RECONSTRUCTED` (P-C22) |
| O que medir depois | DEM (encosta oeste; o esporão do castelo), Overture (ruas, a estrada para Wiltz), fotografia de 1944; horas dos relatos (Marnach, Hosingen) |
| Origem proposta | a porta do anexo do hotel (posto de rádio): `(0, 0, 0)` |
| Eixos | metros; X+ leste (o vale e o acesso leste), Y+ altura, Z+ sul |
| Área jogável | Ato I: anexo/pátio/cave (60 × 60 m) + acesso leste (curva, 250 × 150 m, a 400 m) + rua de saída (300 m); Ato II: três edifícios ligados (120 × 80 m) + rua de saída + estrada da encosta (400 m) + bosque + ponto de reunião; a cidade baixa e o castelo em LOD |
| Compressões declaradas | o anexo → acesso leste (400 m de jogo) e a estrada da encosta → ponto de reunião (600 m) a confirmar; provável compressão leve |
| Relógio | 16/12 05:00→16:00 · 17/12 06:30→21:00 (cartela noturna) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 20 m)

```
     N                       ⌂ CASTELO (esporão; silhueta/som; nunca defendido pelo jogador)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   W ⇐ estrada secundária na encosta (para Wiltz) ⇐ RUA DE SAÍDA (troço coberto ‖ troço exposto) ⇐ [ANEXO ⊙]
   [bosque] [ponto de reunião: posto do batalhão, jipe, lista]                        [pátio] [cave] [garagem: jipe]
                                                                                        [casa da esquina] (grupo do Weller)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ENCOSTA OESTE (17/12): ┌hotel-anexo┐═┌garagem┐═┌casa de pedra┐ — pátios ligados; escada da encosta ⇓ rua principal
                          └ escada de serviço ┘  └ portão: NÃO ┘ └ cave → pátio de trás ┘   (blindados contra fachadas)
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ▒▒▒▒▒▒▒▒▒▒▒▒ CIDADE BAIXA (s5): rua principal, elétrico? não — viaturas, blindados 17/12 ▒▒▒▒▒▒▒▒▒▒▒▒▒
   ═══════════════ estrada do vale do CLERVE ══════ ACESSO LESTE (16/12): curva, duas casas, muro, barricada ═══ E ⇒ Marnach
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ rio Clerve ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     S                                  s6: colunas, baterias, fumo no vale
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_radio_post` | perto | anexo, pátio, cave, casas vizinhas | 05:00 → 06:30; 17/12 06:30 |
| `s2_east_access` | perto (16/12) | a curva, barricada, estrada do vale, castelo acima | 06:30 → 10:30 |
| `s3_exit_street` | perto | troço exposto/coberto, a estrada da encosta | 10:30 → 13:00; 17/12 09:30 |
| `s4_interiors` | perto (17/12) | três edifícios, pátios, escada da encosta | 06:45 → 09:30 |
| `s5_city_mid` | médio | acessos da cidade, posições em rutura, blindados na rua principal, o castelo | relógio |
| `s6_valley_far` | longe | colunas, baterias, fumo no vale | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | anexo (cs intro: rádio de rotina; estática 05:28) | 0 | 16/12 05:00 | — |
| 2 | anexo → pátio → cave → casa da esquina (estafeta) → pátio | 120 m ida e volta | 05:30–06:30 | `obj_m22_cover_rally`; CP-A |
| 3 | pátio → acesso leste (curva): defender; mensageiros; o posto da estrada cala-se | 400 m | 06:30–10:30 | `obj_m22_hold_access`; CP-B |
| 4 | acesso → anexo → rua de saída → jipe de Grady; prioridade feridos/mapas | 700 m | 10:30–13:00 | `obj_m22_evacuate`, `obj_m22_cover_truck`; CP-C |
| 5 | anexo abandonado (cs day2) | 0 | 17/12 06:30 | CP-D (snapshot) |
| 6 | três edifícios → pátio de trás → rua de saída; proteger a saída do Weller | 200 m interiores | 06:45–09:30 | `obj_m22_interiors`, `obj_m22_protect_exit` |
| 7 | rua de saída → estrada da encosta → bosque → ponto de reunião | 600 m | 09:30–11:00 | `obj_m22_reach_rally`; CP-E |
| 8 | ponto de reunião (cs outro: a lista) | 0 | 11:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **05:30** (cena 2): pela rua (rápido; impactos agendados com uivo) vs pelos pátios (lento; coberto) até à casa da esquina.
- **Acesso leste** (cena 3): barricada (vê a estrada; exposta) vs casa da esquerda (janelas; cega ao muro).
- **Rua de saída** (cena 4): o camião do outro grupo passa primeiro no intervalo da MG (6 s/15 s); feridos primeiro (maca pelo troço coberto) vs mapas primeiro (jipe).
- **Interiores** (cena 6): cozinha → corredor (janela exposta) vs escada de serviço (coberta); a garagem dá para a rua: **não**; o buraco de morteiro na casa de pedra é a saída certa; a bazuca pode afastar o StuG (opcional).
- **Saída final** (cena 7): estrada (rápida; MG a 400 m) vs bosque (lento; coberto).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| anexo/cave | pedra; a cave | a janela vê o vale e o castelo |
| pátio | muros de pedra | cego para a rua |
| acesso leste | barricada (camião atravessado), muro, casas de pedra | vê a estrada do vale (300–400 m) |
| rua de saída | troço coberto por casas / troço exposto à estrada do vale | MG a 350 m por rajadas |
| interiores | paredes de pedra, escadas, o buraco de morteiro | os blindados batem fachadas; nunca entram nos pátios |
| escada da encosta | portais | sondas sobem por aqui |
| estrada da encosta / bosque | árvores; muros | MG a 400 m vê o troço exposto |

Linhas de visão: barricada → estrada do vale (400 m); MG das torres? não — MG alemã no vale → troço exposto (350 m); janelas da casa de pedra → rua de saída; o castelo visível de quase tudo (âncora). Regra: interiores com oclusão de som por piso; a rua principal é dos blindados (nunca jogável a 17/12).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| barragem (05:30–06:10) | começa pela estática; Nebelwerfer com uivo; impactos ≥ 30 m na encosta e cidade baixa |
| sondas (07:30; 08:50; 10:00) | pela estrada e encostas; nunca "de trás" |
| MG do vale (16/12 tarde) | rajadas 6 s / pausas 15 s sobre o troço exposto |
| blindados (17/12 06:45+) | rua principal; disparam contra fachadas; impactos ≥ 30 m com motor antes; a bazuca só os afasta |
| sondas pelas escadas (07:15; 08:00; 08:50) | 3; fogo curto |
| Sayer fica (17/12) | consequência fixa; nunca morto em cena |
| limites | a cidade baixa (nunca a 17/12); o vale a leste além do acesso; a rua principal |

## 8. Encenação e objetos por zona

- **Anexo** (cs intro / day2): mesa de rádio, fogão, café na lata, cartas de Natal, rádio civil; a mesma sala vazia a 17/12 (o mesmo enquadramento), a carta no chão.
- **Acesso leste**: barricada, o caderno de Lewis (lista), mensageiros.
- **Rua de saída**: o camião do outro grupo, a pasta de lona, o jipe de Grady.
- **Interiores**: cozinha com louça, cama feita, o buraco de morteiro, cartuchos nos pátios.
- **Ponto de reunião** (cs outro): mesa de campanha, a lista, o rádio pousado que continua.
- Persistentes: vidros, carta no chão, a curva perdida (snapshot), fachadas lascadas, o jipe partido.

## 9. Luz, tempo e som por zona

Sol calculado (50,05 N 6,03 E, UTC+1; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 16/12 05:00 | — | −32° | noite; fogão; nevoeiro |
| 08:00 | 121° | −5° | amanhecer tardio ≈ 08:25, cinzento sem sombras |
| 11:00 | 158° | 14° | nevoeiro a levantar |
| 15:30 | 220° | 7° | pôr do sol ≈ 16:35 |
| 17/12 06:30 | — | −18° | madrugada com fumo; o mesmo enquadramento frio |
| 09:30 | 139° | 6° | manhã cinzenta |

Som: anexo (rádio civil; fogão; estática às 05:28), 05:30 (Nebelwerfer; vidros; o vale inteiro), acesso (sondas abafadas pela curva; o rádio com vozes e estática), rua de saída (camião; MG por rajadas; jipe), 17/12 sala (nada: silêncio obrigatório; blindados na cidade baixa), interiores (passos em pedra gelada; o canhão contra a fachada), saída (bosque; rádio), ponto (lista; o rádio fala).

## 10. Requisitos de produção do nível

- **Tamanho:** encosta oeste 500 × 400 m jogáveis + acesso leste 250 × 150 m + cidade/castelo em LOD; dois estados (16 e 17/12).
- **Assets:** anexo de hotel (sala com janela), pátio e cave, casas de pedra/ardósia, barricada, camião e jipe (NPC), três edifícios ligados com escada de serviço e buraco de morteiro, o castelo (silhueta exata), Panzer IV/StuG como pressão por agenda, bosque, posto do batalhão.
- **Sistemas (roadmap S2 snapshot [D]/S7/S9):** snapshot por data (curva perdida; sem jipe), blindados como pressão por agenda, rádio por estados, interiores (reutiliza M10/M03).
- **Risco:** 3. **Fallback:** som + fachadas por evento; snapshot por sub-missão.
- **Medir primeiro:** DEM da encosta e do esporão; a estrada para Wiltz; posto e edifícios (P-C22).
