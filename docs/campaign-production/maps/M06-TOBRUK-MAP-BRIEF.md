# M06 — PERÍMETRO (Tobruk, setor da estrada de El Adem) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M06-TOBRUK-PRODUCTION-DOSSIER.md`. **Facto útil:** a penetração alemã de 13/14 de abril de 1941 deu-se na zona dos postos R31–R33 do 2/17.º Batalhão; o dossiê usa exatamente esses postos (`RECONSTRUCTED` no interior; existência documentada).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | perímetro sul de Tobruk, postos italianos R31/R32/R33, estrada de El Adem (≈ 32,02 N 23,95 E); 14/4/1941 |
| Classe global | linha de postos e fosso antitanque `EXACT` em traçado (perímetro italiano documentado); interiores dos postos `RECONSTRUCTED`; o porto `EXACT` em silhueta a 12–14 km |
| O que medir depois | traçado do perímetro e posições R31–R33 (mapas AWM/ cartas de 1941), fosso e arame; DEM: wadis e pendor para sul; P-C06 fixa o fuso e a lua |
| Origem proposta | o posto R32: `(0, 0, 0)` ao nível da trincheira de ligação |
| Eixos | metros; X+ leste (ao longo da linha de postos), Y+ altura, Z+ sul (o inimigo) |
| Área jogável | X −700…+700 · Z −250 (equipa do 2-pdr) … +150 (o arame); além do arame só observação; a brecha a z +600…+900 é setor médio (nunca jogável a pé) |
| Compressões declaradas | nenhuma nas distâncias entre postos (a validar: 600–800 m entre R31–R32–R33); a brecha a 600–900 m conforme o dossiê |
| Relógio | 03:10 → 08:40 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 30 m)

```
     N  ⇑ porto de Tobruk (12–14 km; artilharia, poeira)  — s5
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  [2-pdr portee + guarnição]  z −200  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  depósito de munição  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   [R33]════ corredor: trincheira + wadi ════[R32 ORIGEM]════ trincheira de ligação ════[R31]  z 0
    x −600            (cena 4)              x 0    Vickers ⟶               x +600
   ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋ arame (400 m jogáveis) ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋  z +120
   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ fosso antitanque ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  z +200
   ·  ·  ·  ·  ·  ·  wadis pedregosos  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  A BRECHA (s3): infantaria 04:20; tanques 05:50 ⇒  z +600…+900
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
     S  ⇓ estrada de El Adem (eixo do ataque)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_r32` | perto | posto, seteiras, trincheira, Vickers, depósito | agenda 03:10 → 08:40 |
| `s2_r33_corridor` | perto | corredor (trincheira + wadi), R33, sobreviventes | ativa às 05:00 |
| `s3_breach` | médio (600–900 m) | a brecha, tanques, infantaria encurralada, rendições ao longe | sim (04:20; 05:50–06:40; 07:00+) |
| `s4_perimeter` | médio | clarões e movimentos noutros trechos; o posto a oeste anuncia contacto às 03:10 | sim |
| `s5_port` | longe (12–14 km) | artilharia, porto, poeira | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | R32 (cs intro: lâmpadas para R31 e R33) | 0 | 03:10 | CP-A |
| 2 | ronda: observação → depósito → Vickers → telefone | 150 m de trincheira | 03:15–04:20 | `obj_m06_check_posts` |
| 3 | R32 e o arame: repelir infantaria | 150–300 m de alcance | 04:20–05:00 | `obj_m06_repel_infantry`; CP-B |
| 4 | corredor R32 → R33 | 600 m (trincheira + wadi) | 05:00–05:50 | `obj_m06_reconnect`; CP-C |
| 5 | R33/R32: observar e sinalizar blindados ao 2-pdr | lâmpada/telefone; 600–900 m | 05:50–06:40 | `obj_m06_observe_armor` |
| 6 | corredor: consolidar; evacuar feridos | 600 m | 06:40–07:40 | `obj_m06_consolidate`; CP-D |
| 7 | área médica atrás de R32 (cs outro) | 50 m | 07:40–08:40 | — |

## 5. Rotas alternativas e decisões espaciais

- **Ronda** (cena 2): ordem livre das três verificações; a caixa de munição à Vickers é o que sustenta a supressão do acesso mais tarde.
- **Primeiro ataque** (cena 3): seteira (protegida; campo estreito) vs parapeito da trincheira (campo largo; exposto aos clarões).
- **Corredor** (cena 4): a trincheira (coberta; lenta; obstruída num troço) vs o wadi (mais rápido; visto da brecha a 600 m).
- **Blindados** (cena 5): observar de R33 (vê a brecha de lado) ou de R32 (vê de frente, com glare do nascer do sol a leste às 06:10); sinalizar posição e número ao 2-pdr — nunca "matar tanques".

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| postos R | betão; seteiras; cobertura total | campo de tiro por seteira (±30°) |
| trincheira de ligação | 1,6 m; parapeito | invisível da brecha |
| wadi | pedras, 1 m | visto da brecha em dois troços |
| arame | nenhuma; obstáculo | a infantaria alemã tenta alargar a brecha aqui |
| fosso antitanque | hard edge para veículos; não jogável | — |
| área médica | lona; sombra | — |

Linhas de visão: R32 → arame (120 m) e brecha (600–900 m); R33 → brecha de flanco; 2-pdr → brecha (800–1 100 m); porto a 12–14 km só silhueta. Regra: de noite só clarões; a IA não "vê" o jogador dentro do posto.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| infantaria no arame (04:20) | 150–300 m; clarões; fogo como dados só sobre linha de visão |
| R33 cala-se (05:00) | silêncio obrigatório; o corredor é o único acesso |
| tanques (05:50–06:40) | nunca entram na trincheira; pressionam o acesso a 600–900 m; o 2-pdr e a artilharia tratam deles (dados) |
| artilharia | ≥ 30 m; assobio |
| minas | só além do arame (zona nunca jogável) |
| limites | o perímetro a pé; a brecha e o sul só observação |

## 8. Encenação e objetos por zona

- **R32** (cs intro): a lâmpada de sinais; Fraser; Ellis a preparar socorro; Morrow com a Bren.
- **R33** (cs silence): a lâmpada que não acende; sobreviventes (3); telefone cortado.
- **Brecha**: tanque a arder persistente (depois de 06:40); rendições ao longe sem close.
- **Área médica** (cs outro): a lona, Dunstan, o alemão ferido desarmado sob guarda; sombra e cantil.
- Persistentes: caixa de munição levada; arame alargado; tanque a arder; prisioneiros.

## 9. Luz, tempo e som por zona

Sol calculado (32,08 N 23,95 E, UTC+2 — fuso P-C06; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 03:10 | — | −33° | noite; estrelas; lua em quarto (P-C06) |
| 05:10 | 72° | −10° | madrugada azul a começar |
| 06:10 | 80° | 2° | nascer; glare para quem olha a leste |
| 07:10 | 88° | 15° | — |
| 08:10 | 96° | 27° | sol alto; calor (haze) |

Som: postos (betão abafa), arame (metal), brecha (motores de blindados a 600–900 m; o 2-pdr), perímetro (clarões a oeste), porto (artilharia distante com atraso). Silêncio canónico: "R33 não responde".

## 10. Requisitos de produção do nível

- **Tamanho:** 1 400 × 400 m jogáveis + setor médio até z +900 em LOD.
- **Assets:** três postos R (betão italiano), trincheiras, arame, fosso, wadi pedregoso, Vickers, 2-pdr portee, Panzer III/IV como proxies com estados (motor, arder, recuar), lona médica.
- **Sistemas novos (roadmap S7/S3):** blindados proxies com estados; rendições (`SURRENDERED` ou encenação); lâmpada/telefone com resposta agendada; haze de calor.
- **Risco:** 3. **Fallback:** rendição encenada; blindados estáticos com som.
- **Medir primeiro:** posições reais de R31–R33 e distâncias entre postos; a brecha de 14/4.
